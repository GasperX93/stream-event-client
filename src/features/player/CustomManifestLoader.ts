import {
  CLIENT_LOG_UNKNOWN,
  FRAGMENT_ABORTED,
  FRAGMENT_ERRORED,
  FRAGMENT_LOADED,
  FRAGMENT_TIMED_OUT,
  type FragmentOutcome,
  fragmentRequested,
  fragmentSettled,
} from '@/shared/clientLog';
import type {
  Fragment,
  FragmentLoaderContext,
  HlsConfig,
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderContext,
  PlaylistLoaderContext,
} from 'hls.js';
import Hls from 'hls.js';

import { RequestJitter, StaggeredTask } from '@/shared/requestJitter';

import { ManifestFetcher } from './ManifestManagement';

export const manifestFetcher = new ManifestFetcher();

/**
 * The stagger every fragment request goes through, shared by every player on the page.
 *
 * A module singleton beside {@link manifestFetcher} and for the same reason: hls.js constructs
 * loaders itself, passing only its own config, so there is no constructor to inject through. Tests
 * reach it by spying on the instance.
 */
export const requestJitter = new RequestJitter();

const PlaylistLoader = Hls.DefaultConfig.loader as unknown as {
  new (config: HlsConfig): Loader<PlaylistLoaderContext>;
};

export class CustomManifestLoader extends PlaylistLoader {
  load(context: PlaylistLoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<PlaylistLoaderContext>) {
    if (!['manifest', 'level'].includes(context.type)) {
      super.load(context, config, callbacks);
      return;
    }

    // `manifest` is the top-level request — the one whose answer decides whether this stream is a
    // ladder at all, so it goes through the path that reads the source feed and looks. `level` is
    // one rung, which is a feed like any other.
    const manifest =
      context.type === 'manifest' ? manifestFetcher.fetchSource(context.url) : manifestFetcher.fetch(context.url);

    manifest
      .then((data) => {
        callbacks.onSuccess({ url: context.url, data, code: 200 }, this.stats, context, null);
      })
      .catch((error) => {
        callbacks.onError?.({ code: 0, text: error.message }, context, null, this.stats);
      });
  }
}

const FragmentLoader = Hls.DefaultConfig.loader as unknown as {
  new (config: HlsConfig): Loader<FragmentLoaderContext>;
};

export class CustomFragmentLoader extends FragmentLoader {
  /**
   * The stagger waiting to hand this fragment to the transport, if one is.
   *
   * ⛔ Held so {@link abort} and {@link destroy} can cancel it. hls.js abandons in-flight fragments
   * routinely, on a level switch, a seek and every teardown, and a stagger that fired anyway would
   * start a transfer for a fragment nobody is waiting for any more, against the loader hls.js has
   * already finished with. That is a request the gateway pays for and nothing consumes.
   */
  private pendingStagger: StaggeredTask | null = null;

  /**
   * What this loader's one fragment is and when it was asked for, until the attempt ends.
   *
   * ⭐ Read once at the top of {@link load} rather than at each ending, because the endings do not all
   * carry the fragment: an abort arrives as stats and a context, and the stagger cancels with nothing at
   * all. Nulled by {@link recordSettle}, which is also what keeps one attempt to one settle line: hls.js
   * routinely destroys a loader that has already succeeded, and a second line for the same fragment would
   * be double-counted by anything pairing the two halves.
   */
  private attempt: FragmentAttempt | null = null;

  load(context: FragmentLoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<LoaderContext>) {
    // ⛔ One attempt to one settle line, enforced here rather than rested on hls.js. A second `load` on
    // one instance is unreachable in 1.6.15, whose own loader throws `Loader can only be used once` and
    // whose fragment loader builds one loader per fragment, but if it ever became reachable the first
    // attempt would lose its ending and hand its elapsed to the second. That is a missing line and a
    // wrong number rather than a crash, which is the kind of defect this instrument cannot afford.
    // `recordSettle` is a no-op when no attempt is outstanding, so this costs an ordinary load nothing.
    this.recordSettle(FRAGMENT_ABORTED);

    const url = context.url;
    this.attempt = attemptBegun(context);

    recordFragmentRequest(this.attempt, context);

    // Every playlist this client hands hls.js names its segments absolutely, so anything else here is
    // a bug upstream rather than a URL to repair, and it is not repairable anyway. A preview playlist
    // is a blob, and hls.js resolving `/bytes/<ref>` against `blob:http://viewer/<uuid>` returns
    // `blob:http:/bytes/<ref>`: the origin and the blob id are gone, so there is no gateway left to
    // resolve against.
    //
    // This used to rebuild the path against `window.location.origin`, which is the client. Its nginx
    // proxies `/bee/` and not `/bytes/`, so the fragment 404'd at a host that never had it and
    // nothing said the fallback was the reason. Failing here costs the same fragment and says why.
    //
    // Not optional-chained, unlike the manifest loader above. hls.js declares `onError` required, and
    // this is the one path that returns without reaching the transport: chaining it would turn a
    // missing callback into a fragment that never succeeds and never fails, which is the silent hang
    // this change exists to remove. A thrown TypeError is the louder answer and the correct one.
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // ⛔ Settled BEFORE the callback, and the order is load-bearing. hls.js's fragment loader destroys
      // this loader from inside its own `onError` (`FragmentLoader.resetLoader`, 1.6.15), re-entrantly,
      // while this `load` is still on the stack, so a settle written afterwards would find the attempt
      // already recorded as aborted and this refusal would never be reported as the error it is.
      this.recordSettle(FRAGMENT_ERRORED);
      callbacks.onError(
        { code: 0, text: `fragment url is not absolute, so it names no gateway: ${url}` },
        context,
        null,
        this.stats,
      );
      return;
    }

    // Held back by a bounded random delay, because at the live edge every viewer of one broadcast is
    // chasing the same newest segment and asks for it as soon as their playlist reload lands. The
    // gateway is limited by how many ask in the same instant rather than by how many ask at all, so
    // this is the request most worth taking off the shared tick. A zero bound calls the transport
    // synchronously, exactly as it did before this existed.
    this.pendingStagger = requestJitter.stagger(() => {
      this.pendingStagger = null;

      this.fetchSegmentBytes(context, config, callbacks);
    });
  }

  /**
   * The one place segment bytes are fetched, today from the gateway through hls.js's own loader.
   * Another source of segment bytes, such as a Swarm node in the tab, plugs in here.
   */
  private fetchSegmentBytes(
    context: FragmentLoaderContext,
    config: LoaderConfiguration,
    callbacks: LoaderCallbacks<LoaderContext>,
  ): void {
    // ⭐ All four endings are wrapped, so the gateway path settles wherever it stops, and the two byte
    // sources account for their attempts the same way. hls.js's own fragment loader supplies all four,
    // `onAbort` included, and each wrapper forwards what it was handed untouched. Three of them are
    // the attempt's real ending. The fourth is now a duplicate, and says so where it is defined.
    super.load(context, config, {
      ...callbacks,
      // A segment that arrived is proof the gateway is answering, and the manifest side is the only
      // half that ever holds off on the belief that it is not. Its backoff doubles from the failure
      // that set it, so an outage of twenty seconds went unnoticed for thirty: the gateway was back
      // for ten of them and the one thing still talking to it was this. Reported here because the
      // player fetches segments anyway on hls.js's own retry cadence, so the signal is free.
      onSuccess: (response, stats, ctx, networkDetails) => {
        this.recordSettle(FRAGMENT_LOADED);
        manifestFetcher.feedHealth.recordGatewayReachable();
        callbacks.onSuccess(response, stats, ctx, networkDetails);
      },
      onError: (error, ctx, networkDetails, stats) => {
        this.recordSettle(FRAGMENT_ERRORED);
        callbacks.onError(error, ctx, networkDetails, stats);
      },
      onTimeout: (stats, ctx, networkDetails) => {
        this.recordSettle(FRAGMENT_TIMED_OUT);
        callbacks.onTimeout(stats, ctx, networkDetails);
      },
      // ⚠️ Optional-chained where the three above are not, because hls.js declares only this one
      // optional. Supplying it regardless costs nothing: the transport calls it, this settles, and a
      // caller that had none is handed nothing.
      //
      // ⭐ The settle here is the DUPLICATE, not the primary, and {@link abandon} is what actually
      // ends an abandoned gateway attempt. It has to be that way round: `XhrLoader.abort` calls this
      // back but `XhrLoader.destroy` nulls its callbacks before aborting itself, so a loader torn down
      // without an abort in front of it reaches this never. `recordSettle` drops whichever of the two
      // arrives second, and this one stays so that the forwarding to hls.js keeps happening.
      onAbort: (stats, ctx, networkDetails) => {
        this.recordSettle(FRAGMENT_ABORTED);
        callbacks.onAbort?.(stats, ctx, networkDetails);
      },
    });
  }

  abort(): void {
    this.abandon();
    super.abort();
  }

  destroy(): void {
    this.abandon();
    super.destroy();
  }

  private abandon(): void {
    // ⛔ This is where an abandoned attempt ends, whether or not it ever reached the transport.
    // hls.js's own loader is not a reliable owner of the ending: `XhrLoader.destroy` nulls its
    // callbacks and then aborts itself, so an attempt torn down without an `abort()` in front of it
    // produced no `onAbort`, no settle and a request line with nothing after it. Settling here depends
    // on no base-class internal, and the wrapped `onAbort` becomes the duplicate that `recordSettle`
    // drops.
    this.recordSettle(FRAGMENT_ABORTED);
    this.pendingStagger?.cancel();
    this.pendingStagger = null;
  }

  /**
   * Announce how this fragment's one attempt ended.
   *
   * ⛔ **An instrument, and only an instrument**, exactly as {@link recordFragmentRequest} is. Nothing
   * below reads it, no fragment waits on it and no branch depends on it. `clientLog.ts` owns the wording,
   * which the e2e harness parses.
   *
   * ⭐ At most one line per attempt, because the attempt is cleared here. hls.js destroys a loader it has
   * already finished with, and a second line naming the same level and segment number would be counted
   * twice by anything pairing the two halves of this instrument.
   *
   * ⭐ That guard is also what lets several endings be wired to one attempt without any of them having to
   * know which will arrive: the first one wins and the rest are silent. The wrapped `onAbort` after
   * {@link abandon} is that second caller.
   */
  private recordSettle(outcome: FragmentOutcome): void {
    const attempt = this.attempt;
    if (attempt === null) {
      return;
    }
    this.attempt = null;

    try {
      console.debug(fragmentSettled(attempt.level, attempt.sn, outcome, elapsedMsSince(attempt)));
    } catch {
      // Silent by design. A viewer whose console throws still has to get their video.
    }
  }
}

/** One fragment's one attempt, as both halves of the instrument have to name it. */
interface FragmentAttempt {
  level: number | string;
  sn: number | string;
  /**
   * `performance.now`, which is monotonic, so an NTP step mid-broadcast cannot write a duration that
   * never happened. It is also the clock the loading stats a few lines away are already stamped from.
   *
   * ⛔ This carries no clock identity and needs none. An elapsed is a difference within one clock
   * whatever the clock is, and the older wall-clock reading here claimed to let a reader add it to a
   * harness timestamp, which was never true of a duration and is not what any reader does: the harness
   * stamps each line as it hears it. The reader keeps its tolerance of a duration it cannot parse all
   * the same, because losing an outcome to an unreadable number is the one thing it must never do.
   */
  askedAtMs: number;
}

/** What this attempt has cost so far, as every line about it reports it. */
function elapsedMsSince(attempt: FragmentAttempt): number {
  return Math.round(performance.now() - attempt.askedAtMs);
}

/**
 * Read the fragment's address once, at the moment hls.js asked for it.
 *
 * ⭐ Once rather than per line, because the endings do not all carry the fragment. An abort arrives as
 * stats and a context, and a cancelled stagger arrives as nothing, so a settle that went looking for
 * `context.frag` would name the level for some endings and not others.
 *
 * ⛔ Never null, however unreadable the fragment is. A missing attempt would mean no settle line at
 * all, and a request with no ending is the exact ambiguity this pair exists to remove.
 */
function attemptBegun(context: FragmentLoaderContext): FragmentAttempt {
  const askedAtMs = performance.now();
  // `context.frag` is required by hls.js's own types and is absent in every unit test that drives this
  // loader directly, which is a shape a future hls.js could arrive in as well.
  try {
    const frag: Fragment | undefined = context.frag;
    return { level: frag?.level ?? CLIENT_LOG_UNKNOWN, sn: frag?.sn ?? CLIENT_LOG_UNKNOWN, askedAtMs };
  } catch {
    return { level: CLIENT_LOG_UNKNOWN, sn: CLIENT_LOG_UNKNOWN, askedAtMs };
  }
}

/**
 * Announce which level hls.js has just asked for a fragment of.
 *
 * ⛔ **An instrument, and only an instrument.** Nothing below reads it, no fragment waits on it and no
 * branch in this loader depends on it. `clientLog.ts` owns the wording, which the e2e harness parses.
 *
 * ⭐ **At the top of `load`, above every branch.** hls.js builds a loader per fragment and calls
 * `load` once per attempt, so one line here is one line per attempt. It sits above the url check and
 * above the byte-source split on purpose: the question is which level was ASKED for, and a line
 * placed after either branch would answer it only for the fragments that got past that branch. The
 * two backends record identically, which is the whole basis for reading one arm against the other.
 *
 * ⚠️ This is the only place the level index is observable at all. The shipped overlay reports what
 * was decoded, what ABR would pick next and what the player believes it can afford, and none of the
 * three says which rung the fragments in flight belong to.
 */
function recordFragmentRequest(attempt: FragmentAttempt, context: FragmentLoaderContext): void {
  // A logging line must never cost a fragment.
  try {
    console.debug(fragmentRequested(attempt.level, attempt.sn, rungOf(context)));
  } catch {
    // Silent by design. A viewer whose console throws still has to get their video.
  }
}

/**
 * The rung this fragment belongs to, which is its own playlist's address.
 *
 * ⛔ **Not the fragment url, which names no rung.** Every segment this client plays is
 * `<gateway>/bytes/<reference>` and a Swarm reference says nothing about which rendition produced it.
 * `baseurl` is the level playlist the fragment was parsed out of, `swarm://<owner>/<topic>`, and the
 * topic is the rung's identity everywhere else in this project.
 *
 * Guarded on its own rather than left to the caller's catch. It is a getter over a field hls.js sets,
 * so it is the one part of the line that can throw, and losing the level index because the rung was
 * unreadable would silence the reading this exists for.
 */
function rungOf(context: FragmentLoaderContext): string {
  try {
    return context.frag?.baseurl || CLIENT_LOG_UNKNOWN;
  } catch {
    return CLIENT_LOG_UNKNOWN;
  }
}
