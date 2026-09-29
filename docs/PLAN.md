# stream-event-client: the plan

Status: proposed, 2026-09-29. Written before any code. Nothing is built until the owner says go,
and the open decisions at the end are answered.

## What this is

A small web app for watching the Devcon 8 streams (Mumbai, 3 to 6 November 2026) over Swarm. A
viewer opens it, sees the event's streams, watches one, and chats with the other people watching.
It carries nothing else: no admin, no sign-in beyond a chat name, no postage stamps (what pays for
storing data on Swarm), no uploads and no stream management.

It is put together from two existing Solar Punk codebases:

- **The viewer** from the streaming monorepo, the most tested version of the player, with its
  current dependency versions.
- **The Swarm design and the chat** from msrs-client, which carries the Swarm Brand v3.0 theme and a
  working chat with a display-name login.

The Swarm Foundation is expected to take the codebase over later, so it is written to be read and
changed by people who were not here when it was built.

## Sources

| What                                                             | Taken from                                                                                                   | At                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Stream list, watch page, HLS player, Bee node picker             | [streaming-monorepo](https://github.com/Solar-Punk-Ltd/streaming-monorepo) `apps/hls-stream/packages/client` | `main` at `c1696c26` (2026-09-28)                                                           |
| The stream list format and feed helpers the viewer imports       | the same repository, `apps/hls-stream/packages/shared` and `packages/contracts`                              | the same commit                                                                             |
| Design tokens, the Swarm theme, the chat, the display-name login | [msrs-client](https://github.com/Solar-Punk-Ltd/msrs-client)                                                 | `master` at `a2f50151` (2026-09-24), which holds the Swarm theme (#20) and Brand v3.0 (#22) |

The code arrives as a copy, without the history of either repository. The first commit of phase 1
copies the source files unchanged and names the commits above, and the moves and edits follow in
commits of their own, so every change can be read against where the code came from.

## What a viewer can do

1. **Browse** the event's streams, live first, then upcoming, then finished, each with its
   thumbnail or a frame from the stream and a live or upcoming badge. The list is read from a Swarm
   feed, an address whose owner can keep publishing new versions of it, and it refreshes every five
   seconds without a reload.
2. **Watch** a stream. Quality adapts across the qualities the stream is published in, its ladder,
   for example 360p to 1080p. A quality that stops publishing is dropped within seconds. A broadcast
   that pauses and comes back is rejoined. A scheduled stream says when it starts and begins playing
   on its own when it goes live.
3. **Choose where the video loads from**: the event gateway by default, which is a Bee node the
   event runs for every viewer, or a Bee node on the viewer's own machine, for example Swarm Desktop
   at `http://localhost:1633`. The node is checked before the switch, and a failure is explained in
   plain words: wrong port, not a Bee node, or the node refused this site. The choice is remembered,
   and the way back to the event gateway is one click.
4. **Chat** beside the video, one chat per stream: send a message, react with an emoji, reply in a
   thread, load older messages, and retry a message that failed to send. Reading needs no name.
   Writing asks once for a display name, which creates a key in the browser that signs the
   messages. There is no password, no wallet and no account.
5. **Diagnose playback**: `?qoe=1` on a watch page shows a playback quality overlay, and
   `?level=720p` pins one quality. Both come from the monorepo viewer, because at an event they are
   how a slow gateway is told apart from a broken quality.

## What stays out

| Left out                                                                                       | Where it was    | Why                                                       |
| ---------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------- |
| Admin sign-in, wallet connection (MetaMask, wagmi)                                             | msrs-client     | Not part of the event client                              |
| Creating, editing, pinning and managing streams, the uploader, the stamp dashboard and top-ups | msrs-client     | The same                                                  |
| The other three themes and the theme switcher                                                  | msrs-client     | Swarm theme only                                          |
| The Swarm theme's background video                                                             | msrs-client     | Brand v3.0 had already removed it                         |
| Waku push delivery for the chat, with its libraries and its node                               | msrs-client     | The owner's call, 2026-09-29: the chat is read by polling |
| The in-tab Bee node (weeb-3)                                                                   | monorepo viewer | Decision 1                                                |
| The hooks the monorepo's test harness drives, and its build stamp file                         | monorepo viewer | Decision 2                                                |

## How it is built

### Layout

```
src/
  app/          providers, routes, the page layout and header
  config/       the runtime configuration, read and checked at start
  design/       the design tokens and the Swarm theme, as CSS custom properties
  features/
    catalog/    the stream list: feed reader, schema, polling
    player/     the Swarm HLS player and its loaders
    gateway/    the Bee node picker and its health check
    chat/       the chat panel, the display-name login, the chat feed polling
  shared/       the stream list format and feed helpers copied from the monorepo
```

Both sources sort code by kind (components, pages, providers, utils). Here it is sorted by feature,
so the chat, the player and the picker can each be read, tested and replaced on their own.

### Changes from the sources

1. **One build for every deployment.** The monorepo bakes the stream list's owner and topic into
   the bundle when it is built. Here every setting comes from a `config.json` served beside the
   page and checked against a schema when the app starts, so one image serves every environment and
   a setting such as switching chat off changes without a rebuild. A page that cannot read its
   config says so, instead of showing an empty list. msrs-client already did this with
   `window.__CONFIG__`.
2. **Design tokens as CSS variables, one theme.** msrs-client keeps its tokens in Sass maps and
   switches between four themes at runtime through a `data-theme` attribute, a React provider and
   local storage. Here the tokens are emitted once as CSS custom properties with the Swarm values,
   and every component reads only those variables. The provider, the switcher, the stored choice
   and the per-theme assets do not come along.
3. **The chat loads after the video.** The chat and its libraries are a separate file of the
   bundle, fetched after the player starts, so the first frame never waits for them. The emoji
   picker is fetched the first time it is opened.
4. **A lighter login.** msrs-client makes the chat key by hashing a random id with `viem`, a large
   library brought in for one hash. Here the key is 32 random bytes from the browser's own crypto,
   so `viem`, `wagmi`, the MetaMask SDK, `crypto-js`, `msgpack-lite`, `pako` and `bs58` stay out.
5. **Every stream on the list.** The monorepo viewer keeps the last ten entries and drops the rest
   without a word. The event runs more parallel stages than that, so every entry is shown.
6. **A picker for the two sources the event needs.** The picker offers the event gateway and "my own
   Bee node", with `http://localhost:1633` filled in and the port editable. It accepts a node on the
   viewer's own machine (`localhost` or `127.0.0.1`), and the page's content security policy, the
   list of hosts a page may reach, allows exactly that. A node on another machine would need that
   policy opened to every host, which is a later step if wanted. The monorepo's health check and its
   plain-language failures stay.
7. **Fonts served by the app.** The Swarm theme loads Geist, Vend Sans and JetBrains Mono from
   Google Fonts. Here they are bundled, so the page makes no third-party request and does not
   depend on Google being reachable from the venue.
8. **Fixes found while reading the sources**: `onKeyPress`, which React has deprecated, becomes
   `onKeyDown`. The invalid `role="main-layout"` goes. Dialogs keep focus inside and close on
   Escape. The chat hook's `any` types become real types.
9. **Current versions, pinned.** Every dependency moves to its newest stable release that is at
   least two weeks old, pinned exactly, and the install refuses any version younger than a week, as
   in the monorepo. Each version a change brings in is checked for its publish age, its signature
   and provenance, and known malware before it lands.
10. **Node polyfills only if still needed.** The monorepo viewer bundles browser stand-ins for
    Node.js built-ins such as `Buffer`. Once weeb-3 is gone the build is tried without them, and
    they stay only if bee-js still needs them in a browser.
11. **Size is a number.** Every pull request reports what the first page load downloads, so
    "lightweight" can be checked rather than claimed. It is reported, not a gate.
12. **Phone first.** Many viewers will watch on a phone, so every screen is laid out for a narrow
    screen first. There the chat sits under the video and can be folded away.

### The configuration

```json
{
  "gatewayUrl": "/bee",
  "catalog": { "owner": "<stream list feed owner address>", "topic": "<stream list topic>" },
  "chat": {
    "enabled": true,
    "beeUrl": "<Bee endpoint the chat reads and writes through>",
    "gsocResourceId": "<the shared key every viewer writes chat messages with>",
    "gsocTopic": "<GSOC topic>",
    "feedOwner": "<chat feed owner address>",
    "pollIntervalMs": 500
  }
}
```

The values are placeholders. Real ones live with the deployment, never in this repository. Two
notes on them:

- `gsocResourceId` is a private key by design, and every viewer receives it. The GSOC address is
  shared, so everyone writes to it with the same key, chosen (mined) so that the address lands
  where the aggregator's node listens. It is public configuration, not a secret, and the check for
  keys in the tree has to know that.
- `config.json` is served with `Cache-Control: no-store`, so a changed setting reaches every page
  opened after the change.

### How the chat works, and what it needs outside this repository

From swarm-chat-js and swarm-chat-aggregator-js, as they stand:

1. A viewer's message is signed with their chat key and written twice. Swarm stores everything in
   4 KB pieces called chunks, each paid for with a stamp. The message goes first to the viewer's own
   feed, a data chunk and a feed update. Then it goes as one chunk to a shared GSOC address, a Swarm
   address anyone may write to and one node listens on. So every message costs about three stamped
   chunks, and the chat's Bee endpoint pays for them with its own postage stamp. The client holds no
   stamp.
2. The chat aggregator service listens on that address and appends each message to the stream's
   chat feed, signing with its own key and paying with its own stamp.
3. Viewers read the chat feed by polling it through the same chat endpoint, every half second in
   msrs-client. Here the interval is a setting, so it can be raised under load without a rebuild.
4. Opening a chat first downloads the aggregator's latest history snapshot, the chat so far.
5. The chat library needs a key even to read, so a viewer with no name reads with a fixed
   placeholder key, and the panel asks for a name before anything is sent.

For chat to work live, two things must run outside this repository: the chat's Bee endpoint with
its stamp, and the aggregator with its key and stamp. A new aggregator is set up for this app,
apart from this repository, and its details come later (the owner, 2026-09-29). Until then the chat
is built and tested against stand-ins. One constraint for whoever sets it up: the endpoint viewers
write through has to be a different Bee node from the one the aggregator listens on, because Bee
hands a GSOC chunk to a listener only when the chunk arrives from another node.

The Bee node picker moves the stream list and the video. The chat keeps its own endpoint, because a
viewer's own node holds no stamp for writing.

### Tests

- The viewer's unit tests come along for every module that comes along. The msrs-client chat and
  login tests are ported to React 19.
- New tests cover the config check, the picker's two choices, the display-name login and the design
  tokens, so a component cannot read a variable the theme does not define.
- The chat is tested against a stand-in for the chat library's network calls, so phase 3 needs
  neither a node nor an aggregator.
- A browser smoke test opens the list, watches a stream and sends a chat message. It runs against
  recorded Bee answers, a short recorded stream and a chat feed, which the browser test serves from
  its own request routing, so it needs no live infrastructure and no fake server. Recording and
  wiring those answers is part of phase 4.
- Every pull request runs lint (oxlint), the format check (oxfmt), the typecheck, the unit tests,
  the build, and from phase 4 the browser smoke test.
- Browser suites check that things work, never how fast. Timings are reported and never asserted.

## Phases

Each phase is one branch and one pull request into `main`, reviewed before it merges, with the docs
it changes in the same pull request. The target dates assume the decisions below are answered this
week, and leave the two weeks before the event for rehearsal with the real streams and chat.

| #   | Phase                  | Done when                                                                                                                                                                                                                                                                                                                               | Target     |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 0   | This plan              | The repository exists, this file is on `main`, the decisions are answered                                                                                                                                                                                                                                                               | 2026-09-30 |
| 1   | The viewer, standalone | The viewer, the shared pieces and the picker are in the new layout, weeb-3 is gone, decision 2 is applied, the runtime config works, every stream is listed, the toolchain is the monorepo's, dependencies are current and checked, the kept tests and CI are green                                                                     | 2026-10-02 |
| 2   | Swarm design           | Tokens and the Swarm theme are in, every screen uses them on a phone and on a desktop, fonts, logo and favicon are bundled, and no theme machinery is left                                                                                                                                                                              | 2026-10-06 |
| 3   | Chat                   | The display-name login and the chat panel work on the watch page, reading the chat feed by polling, with the ported and new tests green                                                                                                                                                                                                 | 2026-10-10 |
| 4   | Ship                   | The Docker image, nginx with the page fallback, caching, `config.json` served uncached, a content security policy that allows the gateway, the viewer's own machine and the chat endpoint, the config mounted at start, and the browser smoke test with its recorded answers in CI. A deploy to a staging host only on the owner's word | 2026-10-15 |
| 5   | Review and docs        | A review for broken logic, races, loops that never end, unhandled errors and anything that leaves a viewer unsure what is happening, each finding fixed or recorded. Docs and comments read against the code and fixed. A check that no host, address or key is in the tree                                                             | 2026-10-19 |

## Decisions for the owner

1. **The in-tab Bee node.** The monorepo viewer can fetch video through a Swarm node running inside
   the browser tab (weeb-3). It is off in every shipping build, adds close to 4 MB of WebAssembly
   when switched on, and needs its worker files served from the same site. The request names two
   sources, the gateway and a local node. The monorepo treats the in-tab node as the first subject
   of its viewer measurements, and that stays as it is there: this decision is only about what this
   app ships.
   - A (recommended): leave it out, and keep the one place where the player fetches video bytes as a
     seam, so a different way of fetching can come back there as one module.
   - B: keep it as a build option that is off by default, which keeps its build step and its tests.
2. **The test hooks and the build stamp.** The monorepo viewer carries two things for its test
   harness. The hooks put the player and the gateway on `window`, so the harness can drive them, and
   a shipping build compiles them away. The build stamp is a small file saying which commit a
   deployed bundle was built from.
   - A (recommended): keep a build stamp, because at the event it tells a stale deploy from a current
     one at a glance, and leave the hooks out, because nothing here calls them and this app gets its
     own browser test.
   - B: keep both. Worth it only if the monorepo's live test suites should also run against this app
     before the event, which would still take work to point them here.
3. **The stream list format.** The viewer reads the stream list through a schema and feed helpers
   that live in the monorepo's shared packages.
   - A (recommended for now): copy the pieces it uses into `src/shared/` with the source commit
     named, and test them against sample entries copied from the monorepo's own tests. The cost is
     that the copy can fall behind a format change until someone refreshes it.
   - B: publish the monorepo's `contracts` package to npm and import it here, one copy for both. The
     cost is a release step in the monorepo each time the format changes.
4. **The chat library.** Chat runs on swarm-chat-js 6.2.8, which is built on bee-js 9, zod 3 and
   cafe-utility 27, while the viewer uses bee-js 13, zod 4 and cafe-utility 36. Used as it is, the
   app ships two copies of each, so a bigger download and two Bee clients.
   - A (recommended): build on 6.2.8 now so chat works early, then release swarm-chat-js 7 on
     bee-js 13 and move to it before the event. The move is mostly renames, the same move from
     bee-js 9 to 13 the monorepo made. A release to npm is the owner's to approve.
   - B: upgrade the library first, which delays chat by that work.
   - C: copy the chat core into this repository. No library to release, but the message format then
     lives in two places, here and in the library the aggregator uses, and the copied code keeps the
     library's Apache-2.0 notice.
5. **Public or private.** The repository starts private. Both sources are public and the Swarm
   Foundation will take it over. Recommended: public once phase 1 has merged and the tree is checked
   for hosts, addresses and keys.
6. **Licence.** The monorepo is MIT, and msrs-client has no licence file, its code being Solar
   Punk's own. Recommended: MIT with the monorepo's text, added in phase 1.
7. **Pace.** In the monorepo each phase waits for the owner's go. Option B sets that aside for this
   repository only.
   - A: each phase ends with a short summary and the next starts on the owner's go.
   - B (recommended, given the date): phases 1 to 3 run one after another with a summary after each,
     and the work stops before anything is deployed, which stays the owner's word.

### Answered

- **Chat delivery** (the owner, 2026-09-29): no Waku. Viewers read the chat by polling.
- **The chat service** (the owner, 2026-09-29): a new aggregator is set up for this app, apart from
  this repository. Its details come later.
- **Decision 1, the in-tab node** (the owner, 2026-09-29): left out for now, to be added later, so the
  player keeps the place where another way of fetching plugs in.
- **Decision 2, test hooks and build stamp** (the owner, 2026-09-29): both dropped.
- **Decision 3, the stream list format** (the owner, 2026-09-29): A, copied into `src/shared/` with the
  source commit named and tested against sample entries from the monorepo's tests.
- **Decision 4, the chat library** (the owner, 2026-09-29): discussed later. Until then chat is built
  on swarm-chat-js 6.2.8 as it is.
- **Decision 5, visibility** (the owner, 2026-09-29): public once phase 1 has merged and the tree is
  checked for hosts, addresses and keys.
- **Decision 6, licence** (the owner, 2026-09-29): MIT, added in phase 1.
- **Decision 7, pace** (the owner, 2026-09-29): A, each phase ends with a summary and the next starts on
  the owner's go.

## Risks and limits

- **Chat reads at event scale.** At the half-second interval msrs-client used, polling costs about
  two reads per viewer per second, and they all land on the chat's own endpoint, not on the video
  gateway. With thousands of viewers that is thousands of reads a second on one endpoint. The
  interval is a setting, and the load is measured on a staging setup before the event, not assumed.
- **The chat's first read grows with the chat.** Opening a chat downloads the latest history
  snapshot, so late in a busy day every newly opened chat starts with a large read. How big the
  snapshot may grow is the aggregator's to decide.
- **Chat moderation.** Anyone can post under any name, and the display name proves nothing about who
  someone is. Every message costs the chat endpoint about three stamped chunks, so a flood of
  messages spends its stamp. Nothing in this plan filters messages. If the event needs moderation or
  a rate limit, it belongs in the aggregator and the chat endpoint, which decide what reaches the
  feed.
- **The chat key lives in the browser's local storage**, so a reload keeps the name. It proves only
  that messages came from the same browser.
- **Reaching the gateway.** A page on its own domain that reads a gateway on another domain needs
  that gateway to allow it (CORS). The image can instead proxy the gateway under its own origin, as
  the monorepo's viewer does at `/bee`. Phase 4 picks whichever the event's delivery setup needs.
- **A viewer's own node** must allow this site's origin in its settings. Browsers let an `https`
  page reach a plain `http` node only on the viewer's own machine, which is the case the picker
  accepts. The picker's failure messages say what to change.
- **The config is read once, when the page loads.** A change reaches pages opened after it. Making
  open pages pick up a change, for example to switch chat off everywhere at once, is a later step if
  the event wants it.
- **The event's wider delivery design** (several gateway tiers, falling back between them, a mirror)
  is not part of this client yet. The player's fetch seam leaves room for it.
