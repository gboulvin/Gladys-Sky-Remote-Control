# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

A Gladys Assistant **external integration** that controls **Sky set-top boxes**
(Sky Q, Sky+ HD) over the local network — the equivalent of Home Assistant's
[Sky Remote Control](https://www.home-assistant.io/integrations/sky_remote/).
A Node.js service (Node 22+, ESM, no build step) running in its own sandboxed
Docker container, talking to Gladys through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency. It started from the official
[JavaScript template](https://github.com/GladysAssistant/integration-template-js).

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/devices.test.js          # one file
node --test --test-name-pattern "power"   # tests whose name matches
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store .   # store admission checks
```

The CI (`.github/workflows/ci.yml`) runs `format:check`, `lint` and `test` on
Node 22 and 24, and builds the Docker image: run the three commands before
pushing.

## Architecture

```
index.js                          SDK wiring only: handlers registered before connect()
src/skyRemote.js                  remote control protocol (TCP 49160 / 5900): handshake, key frames, port detection
src/skyStatus.js                  Sky Q local REST API (port 9006): power state, model
src/devices/skyBox.js             the box devices: discovery payload, commands, polls, scene triggers, transports
src/scenes.js                     scene actions (manifest `scene_actions`)
src/widgets.js                    dashboard widget (manifest `widgets`)
src/actions.js                    Configuration screen actions (manifest `actions`)
src/config.js                     DEFAULT_CONFIG (mirrors the manifest defaults) + parsing of the box list
src/i18n.js                       every user-facing message, in en / fr / de / es
src/commandLabels.js              labels of the remote keys (widget form = manifest send_command options)
gladys-assistant-integration.json manifest
docs/{en,fr,de,es}.md             user documentation, re-hosted by Gladys (en and fr mandatory)
test/                             node --test, against the SDK's fake Gladys; test/helpers.js fakes the network
.github/scripts/release.mjs       release helpers (manifest bump, changelog), tested in test/
```

## The Sky protocol, in short

- **Remote control** (`src/skyRemote.js`): TCP to port 49160 (Sky Q) or 5900
  (Sky+ HD, old Sky Q firmware). The box sends a 12-byte banner, the client
  echoes it, then acknowledges each short frame with its first byte; a frame
  of 24 bytes or more opens the session. A key is an 8-byte frame
  `[4, 1, 0, 0, 0, 0, 224 + floor(code / 16), code % 16]` (key down) followed
  by the same frame with byte 1 set to 0 (key up). Send-only: no feedback.
- **Status** (`src/skyStatus.js`): Sky Q only,
  `GET http://<box>:9006/as/system/information` → `activeStandby`.
- No pairing, no credential: anyone on the LAN can drive a box. Only ever
  connect to the addresses the user configured.

## Rules

- **External ids are forever.** A box is identified by its configured address
  (`gladys.externalIds('sky-box', host)`), the only stable id the protocol
  gives — hence the documented advice of a DHCP reservation. Never change the
  device type, the platform id derivation or a feature key (`power`,
  `channel`, `channel-up`...): Gladys keys devices, history, scenes and
  dashboards on them. The same goes for every key users store: manifest
  `config_schema`, `actions`, widget and scene keys, the remote key names of
  `COMMANDS` (stored by scenes and widget forms) — only ever add.
- **Every feature carries `name`, `min`, `max`, `read_only` and
  `has_feedback`**: Gladys stores them NOT NULL. `test/devices.test.js`
  checks them.
- **Tests never touch the network.** `test/helpers.js` replaces the `driver`
  of `src/devices/skyBox.js`; the protocol test talks to a fake box on the
  loopback interface; the status test injects `fetch`.
- **Scene triggers fire on poll transitions only** (`pollBox`): the first poll
  sets the baseline, a command never fires one by itself. Never fire a scene
  event from a scene action handler.
- **The container rootfs is read-only.** Write only under `/data`. Never log
  tokens, passwords or API keys.
- **Versions belong to the Release workflow** (Actions → Release). Never edit
  `version` in `package.json` or in the manifest, nor the `docker_image` tag,
  by hand. `test/manifest.test.js` checks they agree.
- **Changelog.** Every user-visible change adds a line under `## [Unreleased]`
  in `CHANGELOG.md` (`### Added`, `Changed`, `Fixed`, `Removed`, `Security`).
  Never write a version heading: the Release workflow moves the section.
- **Manifest.** Texts are multi-language objects in **en, fr, de and es**
  (`label`, `description`, `placeholder`), never a plain string;
  `test/i18n.test.js` walks the manifest to check it. The catalog
  `description` holds 10 to 100 characters per language. `countries`
  (GB, IE, IT, DE, AT — where Sky sells Sky Q / Sky+ HD boxes) requires
  `gladys_version >= 5.3.0`; `widgets`, `scene_triggers`, `scene_actions`
  require 5.1.0. `transports` is `["local"]`: the integration never uses a
  cloud. `test/manifest.test.js` ties the manifest to the code.
- **User-facing text** goes through `src/i18n.js` (or `src/commandLabels.js`
  for key names), in the four languages; the docs `docs/{en,fr,de,es}.md` are
  kept in sync.
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English.
