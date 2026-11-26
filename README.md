# Sky Remote Control for Gladys Assistant

External integration for [Gladys Assistant](https://gladysassistant.com) that
controls **Sky Q** and **Sky+ HD** set-top boxes over the local network — the
Gladys counterpart of Home Assistant's
[Sky Remote Control](https://www.home-assistant.io/integrations/sky_remote/)
integration.

- **Local only**: the protocol of the Sky remote apps, no Sky account, no
  cloud (manifest `transports: ["local"]`).
- **Countries**: United Kingdom, Ireland, Italy, Germany, Austria (manifest
  `countries`), where Sky sells these boxes.
- **Languages**: English, French, German and Spanish (UI texts and
  documentation).
- **Requires Gladys 5.3.0 or later.**

User documentation: [English](docs/en.md) · [Français](docs/fr.md) ·
[Deutsch](docs/de.md) · [Español](docs/es.md).

## Features

| Surface          | What                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Devices          | One `television` device per box: power, channel number, channel up/down, guide, home, info, select, back, arrows, playback |
| Power state      | Read every 30 s from the Sky Q local API (port 9006): power only pressed when needed                                       |
| Transport badge  | `local` when the box answers, `unreachable` otherwise                                                                      |
| Scene triggers   | `power_changed` (on / standby), `availability_changed` (online / offline)                                                  |
| Scene actions    | `send_command` (any key, repeat 1-10), `change_channel`, `set_power` (on / standby / toggle)                               |
| Dashboard widget | `sky_remote`: connection, power, address, model + Power, Channel +/−, and a Remote form (any key or a channel number)      |
| Config action    | `test_connection`: checks every box without pressing a key                                                                 |

## How it talks to the box

- Remote control: TCP port **49160** (Sky Q) or **5900** (Sky+ HD, Sky Q on old
  firmware), detected automatically. After a short handshake, each key is an
  8-byte "key down" frame followed by its "key up" frame. See
  [`src/skyRemote.js`](src/skyRemote.js).
- Power state (Sky Q only): `GET http://<box>:9006/as/system/information`,
  field `activeStandby`. See [`src/skyStatus.js`](src/skyStatus.js).

## Development

```bash
npm install
npm test
npm run lint
npm run format:check
```

Run against a Gladys instance:

```bash
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<token>" \
GLADYS_INTEGRATION_SELECTOR="sky-remote-control" \
LOG_LEVEL=debug \
npm start
```

Project rules for contributors and coding assistants: [`CLAUDE.md`](CLAUDE.md).
Security reports: [`SECURITY.md`](SECURITY.md).

## Release

Describe the changes under `## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md),
then **Actions → Release → Run workflow** (patch / minor / major): the
workflow bumps the version everywhere, tags, builds the multi-arch image to
`ghcr.io/gboulvin/gladys-sky-remote-control` and publishes the GitHub Release.
The repository carries the `gladys-assistant-integration` topic so the store
indexer picks it up.

Started from the official
[integration template](https://github.com/GladysAssistant/integration-template-js).

## License

Apache-2.0
