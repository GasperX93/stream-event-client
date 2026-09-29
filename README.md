# stream-event-client

A lightweight web app for watching the Devcon 8 streams over [Swarm](https://www.ethswarm.org):
browse the event's streams, watch one, choose where the video loads from (the event gateway or your
own Bee node), and chat with the other people watching.

**Status: phase 2 of the plan, the Swarm design.** The stream list, the watch page, the player and
the Bee node picker work, in the Swarm Brand v3.0 look. The chat comes in phase 3. The plan,
its phases and its decisions are in [docs/PLAN.md](docs/PLAN.md).

It is built from the viewer of
[streaming-monorepo](https://github.com/Solar-Punk-Ltd/streaming-monorepo) and the Swarm design and
chat of [msrs-client](https://github.com/Solar-Punk-Ltd/msrs-client).

## Run it

You need Node.js 24 or later. pnpm comes through Corepack, at the version `package.json` names.

```bash
corepack enable
pnpm install
pnpm dev
```

The dev server opens at `http://localhost:5173`. Before it shows any streams, fill in
`public/config.json` (see below).

The dev server and `pnpm preview` forward `/bee` to a Bee node on this machine,
`http://127.0.0.1:1633`, so a config whose `gatewayUrl` is `/bee` works without the node allowing the
page's origin. Set `DEV_BEE_PROXY_TARGET` to forward it somewhere else.

## Configure it

Every setting is read from `config.json`, served beside the page, when the app starts. One build
serves every deployment, and a setting changes without a rebuild. A page that cannot read its config,
or finds a value it refuses, says which field is wrong instead of showing an empty list.

The repository's `public/config.json` is an example with placeholders. The page refuses to start on
a value still in `<angle brackets>`, so the example can never pass for a real deployment. Real values
live with the deployment, never in this repository.

| Field           | What it is                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `gatewayUrl`    | The event gateway: a path on this site such as `/bee`, which the site proxies to Bee, or an http or https address of a Bee node |
| `catalog.owner` | The Ethereum address that owns the stream list feed                                                                             |
| `catalog.topic` | The stream list feed's topic, as text                                                                                           |
| `chat`          | Optional. The chat's settings, checked for shape only until the chat is built in phase 3                                        |

Serve `config.json` with `Cache-Control: no-store`, so a changed setting reaches every page opened
after the change.

## Build it

```bash
pnpm build     # typecheck and bundle into dist/
pnpm preview   # serve dist/ locally
```

`dist/` is a static site. Serve it with a fallback to `index.html` and with its `config.json` beside
it.

The other scripts: `pnpm test` (vitest), `pnpm lint` (oxlint), `pnpm typecheck`, `pnpm format` and
`pnpm format:check` (oxfmt). Continuous integration runs the format check, lint, typecheck, tests and
build on every pull request, and reports what the first page load downloads.

## What the viewer does

- **The stream list.** Read from a Swarm feed and read again every 5 seconds. Every entry is shown in
  three groups: live streams, then upcoming ones with the soonest start first, then finished ones
  newest first. A read from a newer feed slot replaces the list
  whatever changed in it, so an entry edited, unpublished or gone live in place shows on an open page
  without a reload.
- **Previews.** The entry's uploaded thumbnail when it has one, otherwise a frame decoded from the
  stream's first segment, with live and upcoming badges and the duration.
- **Scheduled streams.** An entry whose state is `scheduled` has been announced and not yet
  broadcast. Its watch page says the stream has not started, keeps reading the stream list, and starts
  the player as soon as the entry turns live. If it is unpublished while the page waits, the page says
  it is no longer available.
- **A broadcast that comes back.** After a feed finishes, the player keeps asking for the slot after
  the finished playlist, about every 30 seconds and spread per viewer. When the broadcast returns and
  the viewer has reached the end of what they were playing, the player rejoins it live.
- **The quality ladder.** A stream published in several qualities is one feed per quality plus a
  master playlist on a feed of its own. The player walks every quality's feed itself, so a switch
  costs nothing, and hls.js chooses the quality. A quality that stops being produced while the others
  carry on is dropped within seconds, at most one per stream.
- **Where the video loads from.** The Bee node picker offers the event gateway and a Bee node on the
  viewer's own computer, `http://localhost:1633` filled in and the port editable. Only `localhost`,
  `127.0.0.1` and `[::1]` are accepted. The node is checked before the switch, a failure is explained
  in plain words, and the choice is remembered in the browser.
- **Diagnosing playback.** `?qoe=1` on a watch page shows a draggable playback quality overlay,
  toggled with `Q`. `?level=720p` pins one quality, which tells a bad quality apart from a bad switch.

## How the player reads Swarm

hls.js expects playlists at fixed URLs. On Swarm every playlist update is new content under a feed,
so the player brings its own loaders:

- **CustomManifestLoader** reads the latest playlist from its feed instead of a fixed URL.
- **CustomFragmentLoader** fetches each segment from the gateway, staggered by a bounded random delay
  so a crowd at the live edge does not ask in the same instant. `fetchSegmentBytes` is the one place
  segment bytes are fetched, where another source can plug in.
- **ManifestStateManager** merges each live playlist into a growing EVENT playlist, so segments stay
  playable longer than the publisher's sliding window.
- **LadderFeedPoller** walks every quality's feed on its own clock, because hls.js refreshes only the
  quality it is playing.

Feed URIs use a `swarm://<owner>/<topic>` scheme, because hls.js resolves every playlist URI against
the playlist's own URL and a URI with a scheme is the one case it leaves untouched.

## The design

One look, Swarm Brand v3.0: near-black surfaces, the Swarm orange `#f47a20` as a sparing accent,
Vend Sans for headings, Geist for text and JetBrains Mono for small labels. There is no theme
switcher and no second theme.

- **The tokens** live in `src/design/_tokens.scss`, one Sass map per group (colour, font, spacing,
  radius and so on). `src/design/theme.scss` emits every entry once on `:root` as a CSS custom
  property named `--<group>-<name>`, for example `--color-primary` or `--spacing-base`, and sets the
  page's base styles.
- **Components read only the variables**, `var(--color-primary)`, never a Sass token or a literal
  colour. The breakpoints are the one exception, because a media query cannot read a custom
  property: they are the mixins in `src/design/_media.scss`, and every layout is written for a phone
  first and widened by them.
- **To add a token**, add it to its map in `_tokens.scss` and read it where it is needed. The tokens
  test (`test/designTokens.test.ts`) fails when a stylesheet reads a variable the design does not
  define, when the design defines one nothing reads, and when a text colour falls below 4.5:1
  against its background, so a new colour pairing goes into its list too.
- **The fonts** are bundled from `@fontsource`, only the weights used: Geist 400 and 600, Vend Sans
  600 and JetBrains Mono 500, imported in `src/design/fonts.ts`. The page makes no font request to a
  third party. Another weight needs its file imported there, or the browser fakes it.

## Layout

```
src/
  app/          the entry, routes, the app provider, the page layout and header
  config/       the runtime configuration, read and checked at start
  design/       the design tokens, the Swarm theme, the fonts and the logo
  features/
    catalog/    the stream list: feed reader, schema, polling, previews
    player/     the Swarm HLS player, its loaders and overlays, the watch page
    gateway/    the Bee node picker and its health check
  shared/       the stream list format and feed helpers copied from streaming-monorepo, the fetch
                helpers every feature uses, and the components more than one feature uses
test/           the unit tests, test/shared for the copied modules
```

The files in `src/shared` that came from streaming-monorepo name the path and commit they were
copied from. Refresh them from there when the stream list format changes.

## Licence

MIT, see [LICENSE](LICENSE).
