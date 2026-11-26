# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-11-26

### Added

- Control of Sky Q and Sky+ HD set-top boxes over the local network, with the
  same protocol as Home Assistant's Sky Remote Control integration: no
  account, no cloud.
- One Gladys television device per box, with power, channel number and the
  navigation and playback keys of the remote (channel up/down, TV guide, home,
  info, select, back, arrows, play, pause, stop, rewind, fast forward,
  record).
- Automatic detection of the remote control port (Sky Q 49160, Sky+ HD 5900).
- Power state of Sky Q boxes, read from their local API every 30 seconds:
  the power feature only presses the key when needed.
- Reachability badge on each box (local / unreachable) and connection status
  in the Configuration screen.
- Scene triggers: "Sky box power changed" and "Sky box online / offline".
- Scene actions: press any remote key (with a repeat count), change channel,
  turn a box on, to standby or toggle it.
- "Sky remote" dashboard widget: state of a box, power and channel buttons,
  and a form to press any key or type a channel number.
- "Test the connection" button in the Configuration screen.
- English, French, German and Spanish texts and documentation; catalog
  restricted to the United Kingdom, Ireland, Italy, Germany and Austria.
- `SECURITY.md`, `CLAUDE.md`, CI (format, lint, tests on Node 22 and 24,
  Docker build) and the Release workflow of the official template.

[Unreleased]: https://github.com/gboulvin/Gladys-Sky-Remote-Control/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/gboulvin/Gladys-Sky-Remote-Control/releases/tag/v1.0.0
