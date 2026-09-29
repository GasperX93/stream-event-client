import {
  CLIENT_LOG_UNKNOWN,
  fragmentAbandonedAnsweredPattern,
  fragmentRequestedPattern,
  fragmentSettledPattern,
} from '@/shared/clientLog';
import type { FragmentLoaderContext, HlsConfig, LoaderCallbacks, LoaderConfiguration, LoaderContext } from 'hls.js';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';

import { CustomFragmentLoader, manifestFetcher, requestJitter } from '../src/features/player/CustomManifestLoader';
import { FEED_STATE_LIVE, FEED_STATE_RECONNECTING } from '../src/features/player/feedState';

const TOPIC = 'a-topic-being-watched';
const FRAGMENT_URL = 'http://127.0.0.1:1633/bytes/0123456789abcdef';

/** hls.js's own loader, which `CustomFragmentLoader` extends and hands the transfer down to. */
const transport = Object.getPrototypeOf(CustomFragmentLoader.prototype) as {
  load: (context: LoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<LoaderContext>) => void;
  abort: () => void;
  destroy: () => void;
};

/**
 * Drive a fragment through the loader and hand back the callbacks it gave the transport, so a test
 * can answer as the network would. The transport itself is stubbed out: what is under test is the
 * wiring between a fragment arriving and the feed's health, not hls.js's XHR handling.
 */
function loadFragment(url = FRAGMENT_URL) {
  let handed: LoaderCallbacks<LoaderContext> | null = null;
  vi.spyOn(transport, 'load').mockImplementation((_context, _config, callbacks) => {
    handed = callbacks;
  });

  const loader = new CustomFragmentLoader({} as HlsConfig);
  const fromHls = {
    onSuccess: vi.fn(),
    onError: vi.fn(),
    onTimeout: vi.fn(),
  } as unknown as LoaderCallbacks<LoaderContext>;

  loader.load({ url } as FragmentLoaderContext, {} as LoaderConfiguration, fromHls);

  assert.ok(handed, 'the loader never reached the transport');
  return { fromHls, transport: handed as LoaderCallbacks<LoaderContext> };
}

/**
 * Take the stagger out of the way for the blocks that are about what the loader hands the transport
 * rather than about when it hands it over. Every one of them reads synchronously, and a real stagger
 * would make them all sleep. The stagger has its own block, which does not call this.
 */
function runStaggerInline(): void {
  vi.spyOn(requestJitter, 'stagger').mockImplementation((task) => {
    task();
    return { cancel: () => {} };
  });
}

const arrived = () => ({ url: FRAGMENT_URL, data: new ArrayBuffer(8), code: 200 });

/**
 * Every abandoned-answer line written so far, as level, segment number, answer, byte count and elapsed.
 *
 * Module level rather than inside one block because both byte sources are asked about it, and what the
 * gateway path has to show is that it writes NONE.
 */
const abandonedAnswersIn = (announced: readonly string[]): string[][] =>
  announced
    .map((line) => fragmentAbandonedAnsweredPattern().exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => match.slice(1, 6));

describe('CustomFragmentLoader reporting the gateway it just reached', () => {
  beforeEach(() => {
    manifestFetcher.feedHealth.clear();
    runStaggerInline();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    manifestFetcher.feedHealth.clear();
  });

  /**
   * The whole of fix 0.8b. On 2026-08-06 a viewer's gateway was stopped for 20.5 seconds and the
   * feed was not asked for again until 30, because the manifest backoff doubles from the failure
   * that set it. Segments travel through the same gateway on hls.js's own retry cadence and started
   * arriving the moment it returned, so the client already knew and had nowhere to put it. Wiring
   * this costs no extra request: it reports something the player was fetching anyway.
   */
  it('ends a feed backoff when a segment arrives, without asking for anything extra', () => {
    manifestFetcher.feedHealth.recordGatewayFailure(TOPIC);
    assert.equal(manifestFetcher.feedHealth.state(TOPIC), FEED_STATE_RECONNECTING);

    const { transport: toTransport } = loadFragment();
    toTransport.onSuccess(arrived(), {} as never, {} as LoaderContext, undefined);

    assert.equal(manifestFetcher.feedHealth.backoffRemainingMs(TOPIC), 0);
    assert.equal(manifestFetcher.feedHealth.state(TOPIC), FEED_STATE_LIVE);
  });

  it('passes the segment on to hls.js untouched', () => {
    const { fromHls, transport: toTransport } = loadFragment();
    const response = arrived();
    const stats = { loaded: 8 } as never;
    const context = { url: FRAGMENT_URL } as LoaderContext;

    toTransport.onSuccess(response, stats, context, undefined);

    assert.deepEqual((fromHls.onSuccess as unknown as { mock: { calls: unknown[][] } }).mock.calls, [
      [response, stats, context, undefined],
    ]);
  });

  // A segment that failed is the outage still being on, and it must not shorten the wait.
  it('leaves the backoff alone when the segment does not arrive', () => {
    manifestFetcher.feedHealth.recordGatewayFailure(TOPIC);

    const { fromHls, transport: toTransport } = loadFragment();
    toTransport.onError?.({ code: 0, text: 'gateway unreachable' }, {} as LoaderContext, undefined, {} as never);

    assert.ok(
      manifestFetcher.feedHealth.backoffRemainingMs(TOPIC) > 0,
      'a segment that never arrived released the feed anyway',
    );
    assert.equal(manifestFetcher.feedHealth.state(TOPIC), FEED_STATE_RECONNECTING);
    assert.equal((fromHls.onError as unknown as { mock: { calls: unknown[][] } }).mock.calls.length, 1);
  });
});

/**
 * The other branch through `load`, for a url hls.js could not resolve to a gateway.
 *
 * `blob:http:/bytes/abc123` is not a hand-written example. It is what hls.js 1.6.15's own resolver
 * returns for the media line `/bytes/abc123` against the blob base a preview playlist is served
 * from, measured on 2026-08-07: the page origin and the blob id are both consumed, leaving a url
 * that names no host at all.
 *
 * This used to be rebuilt against `window.location.origin` and handed to the transport. That is the
 * client, whose nginx proxies `/bee/` and not `/bytes/`, so the fragment 404'd at a host that never
 * held it and no message connected the failure to the fallback.
 */
describe('CustomFragmentLoader meeting a url that names no gateway', () => {
  const UNRESOLVABLE = 'blob:http:/bytes/abc123';

  /** Drive one url through the loader, and report both what the transport saw and what hls.js was told. */
  function offer(url: string) {
    const reachedTransport = vi.spyOn(transport, 'load').mockImplementation(() => {});
    const loader = new CustomFragmentLoader({} as HlsConfig);
    const fromHls = {
      onSuccess: vi.fn(),
      onError: vi.fn(),
      onTimeout: vi.fn(),
    } as unknown as LoaderCallbacks<LoaderContext>;

    loader.load({ url } as FragmentLoaderContext, {} as LoaderConfiguration, fromHls);

    const errors = (fromHls.onError as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    return {
      transportCalls: reachedTransport.mock.calls.length,
      errors: errors.map((call) => call[0] as { code: number; text: string }),
    };
  }

  beforeEach(() => {
    manifestFetcher.feedHealth.clear();
    runStaggerInline();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    manifestFetcher.feedHealth.clear();
  });

  it('refuses it instead of fetching an origin that never held the segment', () => {
    const { transportCalls, errors } = offer(UNRESOLVABLE);

    assert.equal(transportCalls, 0, 'an unresolvable url was still sent to the network');
    assert.equal(errors.length, 1);
    assert.match(errors[0].text, /not absolute/);
  });

  // The url is the whole of what a reader has to go on, so it has to survive into the message.
  it('names the url it refused', () => {
    assert.match(offer(UNRESOLVABLE).errors[0].text, /blob:http:\/bytes\/abc123/);
  });

  // A refusal must not read as the gateway answering, which is the one thing this loader reports.
  it('leaves the feed backoff alone, since nothing was fetched from anywhere', () => {
    manifestFetcher.feedHealth.recordGatewayFailure(TOPIC);

    offer(UNRESOLVABLE);

    assert.ok(manifestFetcher.feedHealth.backoffRemainingMs(TOPIC) > 0);
    assert.equal(manifestFetcher.feedHealth.state(TOPIC), FEED_STATE_RECONNECTING);
  });

  // The control. Without it the block above passes on a loader that refuses everything.
  it('lets an absolute gateway url through to the transport', () => {
    const { transport: toTransport } = loadFragment();
    toTransport.onSuccess(arrived(), {} as never, {} as LoaderContext, undefined);

    assert.equal(manifestFetcher.feedHealth.state(TOPIC), FEED_STATE_LIVE);
  });
});

/**
 * ⛔ The block that does NOT call {@link runStaggerInline}, because the stagger is what it is about.
 *
 * hls.js abandons fragments as a matter of course: on a level switch, on a seek, and on every
 * teardown. Before the stagger existed the transport had already been handed the fragment by the
 * time any of that happened, and hls.js's own loader owned the cancellation. Holding the request
 * back opens a window where it has not, and a stagger that fired anyway would start a transfer for a
 * fragment nobody is waiting for, on a loader hls.js has finished with. The gateway pays for that
 * request and nothing consumes it, which is the shape of every leak this project has found.
 */
describe('CustomFragmentLoader holding a fragment back', () => {
  let staggered: (() => void)[] = [];
  let cancelled = 0;

  beforeEach(() => {
    manifestFetcher.feedHealth.clear();
    staggered = [];
    cancelled = 0;
    vi.spyOn(requestJitter, 'stagger').mockImplementation((task) => {
      staggered.push(task);
      return {
        cancel: () => {
          cancelled++;
        },
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    manifestFetcher.feedHealth.clear();
  });

  /** Stubs the transport and the two teardown paths, none of which survive outside a browser. */
  function stubbedLoader() {
    const reachedTransport = vi.spyOn(transport, 'load').mockImplementation(() => {});
    vi.spyOn(transport, 'abort').mockImplementation(() => {});
    vi.spyOn(transport, 'destroy').mockImplementation(() => {});

    const loader = new CustomFragmentLoader({} as HlsConfig);
    loader.load(
      { url: FRAGMENT_URL } as FragmentLoaderContext,
      {} as LoaderConfiguration,
      {
        onSuccess: vi.fn(),
        onError: vi.fn(),
        onTimeout: vi.fn(),
      } as unknown as LoaderCallbacks<LoaderContext>,
    );

    return { loader, reachedTransport };
  }

  it('does not reach the transport until the stagger is up', () => {
    const { reachedTransport } = stubbedLoader();

    assert.equal(reachedTransport.mock.calls.length, 0, 'the fragment went straight out, unstaggered');
    assert.equal(staggered.length, 1, 'the fragment was never staggered');

    staggered[0]();
    assert.equal(reachedTransport.mock.calls.length, 1);
  });

  it('cancels a fragment that hls.js aborted before the stagger was up', () => {
    const { loader, reachedTransport } = stubbedLoader();

    loader.abort();

    assert.equal(cancelled, 1, 'aborting left the stagger armed');
    assert.equal(reachedTransport.mock.calls.length, 0, 'an aborted fragment still reached the network');
  });

  it('cancels a fragment that hls.js destroyed before the stagger was up', () => {
    const { loader, reachedTransport } = stubbedLoader();

    loader.destroy();

    assert.equal(cancelled, 1, 'destroying left the stagger armed');
    assert.equal(reachedTransport.mock.calls.length, 0, 'a destroyed fragment still reached the network');
  });

  /**
   * The counterpart, and the reason cancelling is not just "always cancel". A loader that cancelled a
   * stagger it no longer owned would be reaching for a timer some later fragment had armed.
   */
  it('has nothing left to cancel once the fragment is away', () => {
    const { loader } = stubbedLoader();
    staggered[0]();

    loader.abort();

    assert.equal(cancelled, 0, 'a fragment already handed over was cancelled anyway');
  });

  // Without this the block above passes on a loader that refuses every url before staggering at all.
  it('never staggers a url it is going to refuse, since nothing would be fetched', () => {
    vi.spyOn(transport, 'load').mockImplementation(() => {});

    const loader = new CustomFragmentLoader({} as HlsConfig);
    loader.load(
      { url: '/bytes/0123456789abcdef' } as FragmentLoaderContext,
      {} as LoaderConfiguration,
      {
        onSuccess: vi.fn(),
        onError: vi.fn(),
        onTimeout: vi.fn(),
      } as unknown as LoaderCallbacks<LoaderContext>,
    );

    assert.equal(staggered.length, 0, 'a url that names no gateway was queued for a stagger anyway');
  });
});

/**
 * The one place a viewer's own choice of LEVEL is observable, which nothing else in this project can
 * see.
 *
 * ⛔ An instrument. It records and refuses nothing, and no branch of the loader reads it. What it
 * exists for is a reading V2 could not take: a player riding a rung its link cannot carry and a player
 * asking for a cheaper rung that something upstream answers with the expensive one look identical in
 * the overlay, in the decoded resolution and in `nextAutoLevel`. They differ here.
 */
describe('CustomFragmentLoader announcing which level hls.js asked for', () => {
  const RUNG = 'swarm://0x4f0e1c2b3a49586772635441302f1e0d0c0b0a09/9c4e1f60b8a2d357e0f1a2b3c4d5e6f7';

  /** As much of an hls.js `Fragment` as this line reads: its level, its number and its playlist. */
  const fragmentOf = (level: number, sn: number | string, baseurl = RUNG) =>
    ({ level, sn, baseurl }) as FragmentLoaderContext['frag'];

  let announced: string[];

  /** Drive one fragment through the loader and hand back every fragment request line it wrote. */
  function requestsWrittenFor(context: Partial<FragmentLoaderContext>): (readonly string[])[] {
    vi.spyOn(transport, 'load').mockImplementation(() => {});

    const loader = new CustomFragmentLoader({} as HlsConfig);
    loader.load(
      { url: FRAGMENT_URL, ...context } as FragmentLoaderContext,
      {} as LoaderConfiguration,
      {
        onSuccess: vi.fn(),
        onError: vi.fn(),
        onTimeout: vi.fn(),
      } as unknown as LoaderCallbacks<LoaderContext>,
    );

    return announced
      .map((line) => fragmentRequestedPattern().exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => match.slice(1, 4));
  }

  beforeEach(() => {
    manifestFetcher.feedHealth.clear();
    runStaggerInline();
    announced = [];
    vi.spyOn(console, 'debug').mockImplementation((line: unknown) => {
      announced.push(String(line));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    manifestFetcher.feedHealth.clear();
  });

  it('writes one line per fragment, carrying the level, the number and the rung playlist', () => {
    assert.deepEqual(requestsWrittenFor({ frag: fragmentOf(3, 412) }), [['3', '412', RUNG]]);
  });

  /**
   * ⛔ Above the url check too. hls.js asked for this fragment, and a refusal that went unrecorded
   * would leave the phase count short at exactly the moment worth reading.
   */
  it('writes it for a url the loader is about to refuse', () => {
    assert.deepEqual(requestsWrittenFor({ url: 'blob:http:/bytes/abc123', frag: fragmentOf(2, 9) }), [
      ['2', '9', RUNG],
    ]);
  });

  it('carries an initialisation segment, whose number hls.js writes as a word', () => {
    assert.deepEqual(requestsWrittenFor({ frag: fragmentOf(1, 'initSegment') }), [['1', 'initSegment', RUNG]]);
  });

  /**
   * A logging line must never cost a fragment. `frag` is required by hls.js's own types and is absent
   * from every other case in this file, which is a shape a future hls.js could arrive in as well.
   */
  it('says so rather than throwing when the fragment carries nothing to read', () => {
    assert.deepEqual(requestsWrittenFor({}), [[CLIENT_LOG_UNKNOWN, CLIENT_LOG_UNKNOWN, CLIENT_LOG_UNKNOWN]]);
  });

  /**
   * ⛔ The rung is guarded on its own. `baseurl` is a getter over a field hls.js sets, so it is the one
   * part of the line that can throw, and losing the level index with it would silence the reading.
   */
  it('keeps the level when the rung playlist cannot be read', () => {
    const frag = {
      level: 3,
      sn: 5,
      get baseurl(): string {
        throw new Error('no base');
      },
    } as FragmentLoaderContext['frag'];

    assert.deepEqual(requestsWrittenFor({ frag }), [['3', '5', CLIENT_LOG_UNKNOWN]]);
  });

  // The line is an observation, so it must not be able to stop a fragment however badly it goes.
  it('still fetches the fragment when the console itself throws', () => {
    vi.spyOn(console, 'debug').mockImplementation(() => {
      throw new Error('the console is gone');
    });
    const reachedTransport = vi.spyOn(transport, 'load').mockImplementation(() => {});

    const loader = new CustomFragmentLoader({} as HlsConfig);
    loader.load(
      { url: FRAGMENT_URL } as FragmentLoaderContext,
      {} as LoaderConfiguration,
      {
        onSuccess: vi.fn(),
        onError: vi.fn(),
        onTimeout: vi.fn(),
      } as unknown as LoaderCallbacks<LoaderContext>,
    );

    assert.equal(reachedTransport.mock.calls.length, 1, 'a logging failure cost the viewer their fragment');
  });
});

/**
 * The other half of that instrument: what became of each attempt, and how long it took.
 *
 * ⛔ Also an instrument, and nothing below the loader reads it. What it exists for is a reading the
 * request line cannot give. Six requests at one level is six fragments if they arrived and ONE fragment
 * asked for six times if they did not, and those are opposite findings: the first is a player stepping
 * down and being served, the second is a player stepping down and getting nothing. A squeeze arm on
 * 2026-09-01 produced exactly that shape with no way to tell which.
 *
 * ⭐ Both byte sources are driven here, because an ending recorded on one and not the other would make
 * the arms unreadable against each other, which is the whole basis of this project's viewer matrix.
 */
describe('CustomFragmentLoader announcing how each attempt ended', () => {
  const RUNG = 'swarm://0x4f0e1c2b3a49586772635441302f1e0d0c0b0a09/9c4e1f60b8a2d357e0f1a2b3c4d5e6f7';

  const fragmentOf = (level: number, sn: number | string) =>
    ({ level, sn, baseurl: RUNG }) as FragmentLoaderContext['frag'];

  let announced: string[];

  /** Every settle line written so far, as level, segment number, outcome and elapsed. */
  const settles = (): string[][] =>
    announced
      .map((line) => fragmentSettledPattern().exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => match.slice(1, 5));

  /**
   * Drive one fragment through the loader, and hand back the loader plus both sets of callbacks: the
   * ones hls.js gave it, and the ones it gave the transport. The second is how a test answers as the
   * network would, including with the endings hls.js's own loader would produce.
   *
   * `destroysOnError` replays what hls.js does inside its own `onError`: `FragmentLoader.resetLoader`
   * (1.6.15) destroys the loader there and then, re-entrantly, while `load` is still on the stack. Only
   * the cases about that re-entrancy ask for it, so the rest stay about one thing each.
   */
  function drive(context: Partial<FragmentLoaderContext> = {}, { destroysOnError = false } = {}) {
    let handed: LoaderCallbacks<LoaderContext> | null = null;
    vi.spyOn(transport, 'load').mockImplementation((_context, _config, callbacks) => {
      handed = callbacks;
    });
    vi.spyOn(transport, 'abort').mockImplementation(() => {});
    vi.spyOn(transport, 'destroy').mockImplementation(() => {});

    const loader = new CustomFragmentLoader({} as HlsConfig);
    const fromHls = {
      onSuccess: vi.fn(),
      onError: vi.fn(() => {
        if (destroysOnError) {
          loader.destroy();
        }
      }),
      onTimeout: vi.fn(),
    } as unknown as LoaderCallbacks<LoaderContext>;

    loader.load(
      { url: FRAGMENT_URL, frag: fragmentOf(3, 412), ...context } as FragmentLoaderContext,
      {} as LoaderConfiguration,
      fromHls,
    );

    const calls = (fn: unknown) => (fn as { mock: { calls: unknown[][] } }).mock.calls;
    return {
      loader,
      fromHls,
      transport: handed as LoaderCallbacks<LoaderContext> | null,
      successes: () => calls(fromHls.onSuccess),
      errors: () => calls(fromHls.onError),
    };
  }

  beforeEach(() => {
    manifestFetcher.feedHealth.clear();
    runStaggerInline();
    announced = [];
    vi.spyOn(console, 'debug').mockImplementation((line: unknown) => {
      announced.push(String(line));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    manifestFetcher.feedHealth.clear();
  });

  it('says a gateway segment loaded, naming the level and the segment number', () => {
    const { transport: toTransport } = drive();

    toTransport?.onSuccess(arrived(), {} as never, {} as LoaderContext, undefined);

    assert.deepEqual(
      settles().map((settle) => settle.slice(0, 3)),
      [['3', '412', 'loaded']],
    );
  });

  it('says a gateway segment errored', () => {
    const { transport: toTransport } = drive();

    toTransport?.onError({ code: 0, text: 'gateway unreachable' }, {} as LoaderContext, undefined, {} as never);

    assert.deepEqual(settles()[0].slice(0, 3), ['3', '412', 'errored']);
  });

  /** ⛔ Its own word, not folded into `errored`. A gateway that answers slowly and one that refuses are
   * different faults, and this is the only path with a clock to tell them apart. */
  it('says a gateway segment timed out, rather than calling it an error', () => {
    const { transport: toTransport } = drive();

    toTransport?.onTimeout({} as never, {} as LoaderContext, undefined);

    assert.deepEqual(settles()[0].slice(0, 3), ['3', '412', 'timeout']);
  });

  /**
   * hls.js abandons fragments as a matter of course, on a level switch, a seek and every teardown. An
   * abandoned attempt that went unrecorded would leave the level's request count with no ending, which
   * reads as a fragment still in flight at the end of the run.
   */
  it('says a gateway segment was aborted', () => {
    const { transport: toTransport } = drive();

    toTransport?.onAbort?.({} as never, {} as LoaderContext, undefined);

    assert.deepEqual(settles()[0].slice(0, 3), ['3', '412', 'aborted']);
  });

  /**
   * ⛔ The abandoned-answer line belongs to the in-tab path alone, and this is the one place that can
   * say so. hls.js's own loader owns the gateway transfer and cancels it, so there is no late answer to
   * describe, and writing one anyway would put work the gateway never did into an arm's totals.
   */
  it('writes no abandoned answer for a gateway segment, which has no late answer to describe', () => {
    const { transport: toTransport } = drive();

    toTransport?.onAbort?.({} as never, {} as LoaderContext, undefined);

    assert.deepEqual(abandonedAnswersIn(announced), []);
  });

  /** hls.js declares `onAbort` optional and this loader supplies one regardless, so a caller that had
   * none must not be handed anything. */
  it('reports an abort without inventing a callback hls.js never gave it', () => {
    const { transport: toTransport, fromHls } = drive();

    assert.doesNotThrow(() => toTransport?.onAbort?.({} as never, {} as LoaderContext, undefined));
    assert.equal(fromHls.onAbort, undefined, 'the loader handed hls.js a callback it never asked for');
  });

  /**
   * ⛔⛔ One attempt, one ending. hls.js destroys a loader it has already finished with, and a second
   * line naming the same level and segment number would be counted twice by anything pairing the two
   * halves of this instrument.
   */
  it('writes one settle per attempt, however many times hls.js tears the loader down', () => {
    const { loader, transport: toTransport } = drive();

    toTransport?.onSuccess(arrived(), {} as never, {} as LoaderContext, undefined);
    loader.abort();
    loader.destroy();
    toTransport?.onError({ code: 0, text: 'late' }, {} as LoaderContext, undefined, {} as never);

    assert.equal(settles().length, 1, 'one attempt produced more than one ending');
  });

  /** ⛔ The request line is written above the url check, so the refusal has to be settled too or that
   * request would be the one with no ending. */
  it('settles a url it refuses, since it announced the request for it', () => {
    drive({ url: 'blob:http:/bytes/abc123', frag: fragmentOf(2, 9) });

    assert.deepEqual(settles()[0].slice(0, 3), ['2', '9', 'errored']);
  });

  /**
   * ⛔⛔ The ORDER at that refusal, which is load-bearing and was not pinned by anything until this.
   * hls.js destroys the loader from inside the `onError` it is handed, re-entrantly, before `load` has
   * returned. The settle is written first, so the refusal reads as the error it is and the teardown that
   * follows finds nothing left to record. Move it after the callback and this same attempt lands in the
   * artifact as `aborted`, with no error anywhere and no test to say so.
   */
  it('reports the refusal as an error even though hls.js tears the loader down inside the callback', () => {
    const { fromHls } = drive({ url: 'blob:http:/bytes/abc123', frag: fragmentOf(2, 9) }, { destroysOnError: true });

    assert.equal((fromHls.onError as unknown as { mock: { calls: unknown[][] } }).mock.calls.length, 1);
    assert.equal(settles().length, 1, 'the re-entrant teardown wrote an ending of its own');
    assert.deepEqual(settles()[0].slice(0, 3), ['2', '9', 'errored']);
  });

  /**
   * ⭐ `performance.now`, not `Date.now`. An elapsed is a difference within one clock, so it gains
   * nothing from wall time and loses the one property that matters: a monotonic clock cannot be stepped
   * by NTP mid-broadcast into a duration that never happened. Fixed to two readings here, since a real
   * clock would leave this asserting only that a number is plausible, and clamped at the last one so an
   * extra call from anything else in the path cannot read as an unrelated failure.
   */
  it('reports the elapsed as the monotonic time the attempt actually took', () => {
    const readings = [1_000, 1_350];
    let next = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => readings[Math.min(next++, readings.length - 1)]);

    const { transport: toTransport } = drive();
    toTransport?.onSuccess(arrived(), {} as never, {} as LoaderContext, undefined);

    assert.equal(settles()[0][3], '350');
  });

  /**
   * Whole milliseconds, which the wall-clock reading gave for free and a sub-millisecond one does not.
   * Unrounded, this line would carry `350.79999999999995` and every reader of it would be parsing that.
   */
  it('rounds the elapsed rather than writing the clock’s fractions into the line', () => {
    const readings = [1_000, 1_350.8];
    let next = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => readings[Math.min(next++, readings.length - 1)]);

    const { transport: toTransport } = drive();
    toTransport?.onSuccess(arrived(), {} as never, {} as LoaderContext, undefined);

    assert.equal(settles()[0][3], '351');
  });

  // A settle is an observation, so it must not be able to stop a fragment however badly it goes.
  it('still serves the fragment when the console throws on the settle', () => {
    const { transport: toTransport, successes } = drive();
    vi.spyOn(console, 'debug').mockImplementation(() => {
      throw new Error('the console is gone');
    });

    assert.doesNotThrow(() => toTransport?.onSuccess(arrived(), {} as never, {} as LoaderContext, undefined));
    assert.equal(successes().length, 1, 'a logging failure cost the viewer their fragment');
  });
});

/**
 * The one attempt no callback owns: a fragment hls.js abandons while the stagger still holds it.
 *
 * No transport was ever reached, so nothing downstream will ever end it. Left unrecorded it would be the
 * only request line in a run with no ending, which reads as a fragment still in flight when the arm
 * closed.
 */
describe('CustomFragmentLoader settling a fragment abandoned before it was sent', () => {
  let staggered: (() => void)[] = [];
  let announced: string[];

  const settles = (): string[][] =>
    announced
      .map((line) => fragmentSettledPattern().exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => match.slice(1, 5));

  function heldBack() {
    vi.spyOn(transport, 'load').mockImplementation(() => {});
    vi.spyOn(transport, 'abort').mockImplementation(() => {});
    vi.spyOn(transport, 'destroy').mockImplementation(() => {});

    const loader = new CustomFragmentLoader({} as HlsConfig);
    loader.load(
      {
        url: FRAGMENT_URL,
        frag: { level: 1, sn: 88, baseurl: 'swarm://0xowner/topic' } as FragmentLoaderContext['frag'],
      } as FragmentLoaderContext,
      {} as LoaderConfiguration,
      { onSuccess: vi.fn(), onError: vi.fn(), onTimeout: vi.fn() } as unknown as LoaderCallbacks<LoaderContext>,
    );
    return loader;
  }

  beforeEach(() => {
    manifestFetcher.feedHealth.clear();
    staggered = [];
    announced = [];
    vi.spyOn(requestJitter, 'stagger').mockImplementation((task) => {
      staggered.push(task);
      return { cancel: () => {} };
    });
    vi.spyOn(console, 'debug').mockImplementation((line: unknown) => {
      announced.push(String(line));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    manifestFetcher.feedHealth.clear();
  });

  it('says it was aborted when hls.js abandons it inside the stagger', () => {
    const loader = heldBack();

    loader.abort();

    assert.deepEqual(settles()[0].slice(0, 3), ['1', '88', 'aborted']);
  });

  it('says the same when hls.js destroys it inside the stagger', () => {
    const loader = heldBack();

    loader.destroy();

    assert.deepEqual(settles()[0].slice(0, 3), ['1', '88', 'aborted']);
  });

  /**
   * ⛔⛔ The counterpart, INVERTED on 2026-09-02, and the inversion is the fix. This used to leave a
   * fragment already handed to the gateway for the transport to end, on the belief that hls.js's own
   * loader always produces an ending. It does not: `XhrLoader.destroy` (1.6.15) nulls its callbacks and
   * only then aborts itself, so a teardown with no `abort()` in front of it reached the wrapped `onAbort`
   * never and that attempt settled nowhere at all. The loader stamps its own ending now, and the wrapped
   * callback is the duplicate `recordSettle` drops.
   */
  it('settles a fragment already handed over, rather than trusting the transport to call back', () => {
    const loader = heldBack();
    staggered[0]();

    loader.abort();

    assert.equal(settles().length, 1, 'an abandoned attempt was left for a callback that may never come');
    assert.deepEqual(settles()[0].slice(0, 3), ['1', '88', 'aborted']);
  });
});

/**
 * Every attempt gets exactly one ending, against the two teardowns that used to lose one.
 *
 * ⛔⛔⛔ hls.js's own loader is NOT a reliable owner of an ending, which is what this loader used to
 * rest on. Read out of `XhrLoader` in hls.js 1.6.15: `abort()` aborts and then calls `onAbort` through
 * the callbacks it is holding, but `destroy()` nulls those callbacks FIRST and only then aborts itself,
 * so a teardown with no `abort()` in front of it calls nothing back at all. Both teardowns are real
 * paths: `FragmentLoader.resetLoader` ends every attempt with a bare `destroy()`, and only
 * `FragmentLoader.abort()` goes through `abort()`. A gateway attempt torn down the first way announced a
 * request and then never announced an ending, which reads in an artifact as a fragment still in flight
 * when the arm closed.
 *
 * The base's behaviour is REPLAYED below rather than described, so an hls.js upgrade that changed either
 * teardown would have to change these too.
 */
describe('CustomFragmentLoader keeping one ending per attempt', () => {
  const RUNG = 'swarm://0x4f0e1c2b3a49586772635441302f1e0d0c0b0a09/9c4e1f60b8a2d357e0f1a2b3c4d5e6f7';

  const fragmentOf = (level: number, sn: number) => ({ level, sn, baseurl: RUNG }) as FragmentLoaderContext['frag'];

  let announced: string[];

  const settles = (): string[][] =>
    announced
      .map((line) => fragmentSettledPattern().exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => match.slice(1, 5));

  const requests = (): string[][] =>
    announced
      .map((line) => fragmentRequestedPattern().exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => match.slice(1, 3));

  /** hls.js's own loader as 1.6.15 really behaves, in the three methods this one goes through. */
  function baseLoader() {
    const base = { callbacks: null as LoaderCallbacks<LoaderContext> | null, abortsCalledBack: 0 };

    vi.spyOn(transport, 'load').mockImplementation((_context, _config, callbacks) => {
      base.callbacks = callbacks;
    });
    // `XhrLoader.abort`: abort the transfer, then call back through whatever callbacks are still held.
    vi.spyOn(transport, 'abort').mockImplementation(() => {
      if (base.callbacks?.onAbort) {
        base.abortsCalledBack += 1;
        base.callbacks.onAbort({} as never, {} as LoaderContext, undefined);
      }
    });
    // `XhrLoader.destroy`: drop the callbacks, THEN abort internally. Nothing is ever called back.
    vi.spyOn(transport, 'destroy').mockImplementation(() => {
      base.callbacks = null;
    });

    return base;
  }

  function loadOne(frag: FragmentLoaderContext['frag'], loader = new CustomFragmentLoader({} as HlsConfig)) {
    loader.load(
      { url: FRAGMENT_URL, frag } as FragmentLoaderContext,
      {} as LoaderConfiguration,
      { onSuccess: vi.fn(), onError: vi.fn(), onTimeout: vi.fn() } as unknown as LoaderCallbacks<LoaderContext>,
    );
    return loader;
  }

  beforeEach(() => {
    manifestFetcher.feedHealth.clear();
    runStaggerInline();
    announced = [];
    vi.spyOn(console, 'debug').mockImplementation((line: unknown) => {
      announced.push(String(line));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    manifestFetcher.feedHealth.clear();
  });

  /** The defect itself: hls.js's ordinary teardown, on a fragment the gateway is still fetching. */
  it('settles a gateway attempt destroyed without an abort in front of it', () => {
    const base = baseLoader();
    const loader = loadOne(fragmentOf(3, 412));
    assert.ok(base.callbacks, 'the fragment never reached the transport, so there is nothing to tear down');

    loader.destroy();

    assert.equal(base.abortsCalledBack, 0, 'the base called back on destroy, which is not what 1.6.15 does');
    assert.equal(settles().length, 1, 'an in-flight attempt was destroyed and announced no ending');
    assert.deepEqual(settles()[0].slice(0, 3), ['3', '412', 'aborted']);
  });

  /**
   * The other direction, and the reason the wrapper stays. When the base DOES call back, its `onAbort`
   * arrives after this loader has already settled the attempt, and `recordSettle` drops it.
   */
  it('writes one ending, not two, when the transport does call back', () => {
    const base = baseLoader();
    const loader = loadOne(fragmentOf(3, 412));

    loader.abort();

    assert.equal(base.abortsCalledBack, 1, 'the base never called back, so nothing tested the duplicate');
    assert.equal(settles().length, 1, 'the loader and the transport each announced an ending');
    assert.deepEqual(settles()[0].slice(0, 3), ['3', '412', 'aborted']);
  });

  /**
   * ⛔ Unreachable in hls.js 1.6.15, and self-enforced anyway. Its loader throws `Loader can only be used
   * once` on a second `load` and its fragment loader builds one per fragment, so nothing here is a bug
   * report about hls.js. It is the invariant refusing to rest on somebody else's behaviour: without the
   * settle at the top of `load`, the first attempt would announce no ending at all and the second would
   * inherit its start, reporting a duration that includes however long the first one ran.
   */
  it('settles the attempt it is dropping when a second load lands on the same loader', () => {
    const base = baseLoader();
    const loader = loadOne(fragmentOf(3, 412));

    loadOne(fragmentOf(0, 7), loader);
    base.callbacks?.onSuccess(arrived(), {} as never, {} as LoaderContext, undefined);

    assert.deepEqual(requests(), [
      ['3', '412'],
      ['0', '7'],
    ]);
    assert.deepEqual(
      settles().map((settle) => settle.slice(0, 3)),
      [
        ['3', '412', 'aborted'],
        ['0', '7', 'loaded'],
      ],
    );
  });
});
