// -----------------------------------------------------------------------------
// Device type: SKY BOX (Sky Q, Sky+ HD set-top boxes).
//
// One Gladys device per box listed in the `boxes` config field. Each box is a
// `television` device whose features are the keys of its remote:
//   - power (binary): reads the real state on Sky Q (local REST API), and
//     only presses the power key when the box is not already in the state
//     asked for — on a Sky+ HD, whose state is unknown, it always presses it;
//   - channel (number): types the digits of the channel;
//   - one button feature per navigation / playback key (any value presses).
//
// The box is polled every 30 seconds: reachability (shown as the transport
// badge, and the `availability_changed` scene trigger) and, on Sky Q, the
// power state (the `power` feature and the `power_changed` scene trigger).
// -----------------------------------------------------------------------------

import {
  createLogger,
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_POLL_FREQUENCIES,
  DEVICE_TRANSPORTS,
} from '@gladysassistant/integration-sdk';
import {
  channelToCommands,
  detectPort,
  normalizeCommands,
  probe,
  sendCommands,
} from '../skyRemote.js';
import { readStatus } from '../skyStatus.js';

const logger = createLogger({ name: 'sky-box' });

export const DEVICE_TYPE = 'sky-box';

// Scene trigger keys, as declared in the manifest `scene_triggers` field.
export const POWER_CHANGED_TRIGGER = 'power_changed';
export const AVAILABILITY_CHANGED_TRIGGER = 'availability_changed';

export const POWER_STATES = { ON: 'on', STANDBY: 'standby' };
export const AVAILABILITY = { ONLINE: 'online', OFFLINE: 'offline' };

const TV = DEVICE_FEATURE_TYPES.TELEVISION;

// Feature keys are part of the external ids: never rename one, only add.
export const FEATURE = { POWER: 'power', CHANNEL: 'channel' };

// Button features: one remote key each. `name` is the default name of the
// feature in Gladys (the user can rename it).
export const BUTTON_FEATURES = [
  { key: 'channel-up', type: TV.CHANNEL_UP, command: 'channelup', name: 'Channel up' },
  { key: 'channel-down', type: TV.CHANNEL_DOWN, command: 'channeldown', name: 'Channel down' },
  { key: 'guide', type: TV.GUIDE, command: 'tvguide', name: 'TV guide' },
  { key: 'menu', type: TV.MENU, command: 'home', name: 'Home' },
  { key: 'info', type: TV.INFO, command: 'i', name: 'Info' },
  { key: 'enter', type: TV.ENTER, command: 'select', name: 'Select' },
  { key: 'return', type: TV.RETURN, command: 'backup', name: 'Back' },
  { key: 'up', type: TV.UP, command: 'up', name: 'Up' },
  { key: 'down', type: TV.DOWN, command: 'down', name: 'Down' },
  { key: 'left', type: TV.LEFT, command: 'left', name: 'Left' },
  { key: 'right', type: TV.RIGHT, command: 'right', name: 'Right' },
  { key: 'play', type: TV.PLAY, command: 'play', name: 'Play' },
  { key: 'pause', type: TV.PAUSE, command: 'pause', name: 'Pause' },
  { key: 'stop', type: TV.STOP, command: 'stop', name: 'Stop' },
  { key: 'rewind', type: TV.REWIND, command: 'rewind', name: 'Rewind' },
  { key: 'forward', type: TV.FORWARD, command: 'fastforward', name: 'Fast forward' },
  { key: 'record', type: TV.RECORD, command: 'record', name: 'Record' },
];

export const MAX_CHANNEL = 9999;

// The I/O of the integration, replaceable by the tests (no network there).
export const driver = { sendCommands, detectPort, probe, readStatus };

// What the integration knows about each box, keyed by device external id:
//   port      — remote control port that answered, null until detected;
//   reachable — last known reachability, null before the first check;
//   standby   — last known power state (true = standby), null when unknown;
//   polledStandby / polledReachable — the values of the last POLL, which
//     drive the scene triggers (a command does not fire them by itself: the
//     next poll observes the change, whoever made it);
//   model     — model name reported by a Sky Q, null otherwise.
const boxStates = new Map();

function stateOf(externalId) {
  if (!boxStates.has(externalId)) {
    boxStates.set(externalId, {
      port: null,
      reachable: null,
      standby: null,
      polledStandby: null,
      polledReachable: null,
      model: null,
    });
  }
  return boxStates.get(externalId);
}

/** Forget everything known about the boxes (configuration change, tests). */
export function resetBoxStates() {
  boxStates.clear();
}

/** A copy of what is known about a box (widget, tests). */
export function getBoxState(externalId) {
  return { ...stateOf(externalId) };
}

// The host is the only stable identifier the protocol gives: the box answers
// no serial number on the remote control port. Hence the advice, in the
// documentation, to give the box a fixed address (DHCP reservation).
function platformIdOf(host) {
  return host.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * The boxes of the configuration, with their external ids.
 * @returns {{ name: string, host: string, externalId: string, ids: object }[]}
 */
export function listBoxes(gladys, config) {
  return config.boxList.map(({ name, host }) => {
    const ids = gladys.externalIds(DEVICE_TYPE, platformIdOf(host));
    return { name: name ?? `Sky box ${host}`, host, externalId: ids.device, ids };
  });
}

/** The configured box owning a device external id, or undefined. */
export function findBox(gladys, config, externalId) {
  return listBoxes(gladys, config).find((box) => box.externalId === externalId);
}

/** The discovery payload of a box. */
export function buildDevice(gladys, config, box) {
  const { ids } = box;
  return {
    name: box.name,
    external_id: box.externalId,
    // Reachability and power state: polled every 30 seconds.
    should_poll: true,
    poll_frequency: DEVICE_POLL_FREQUENCIES.EVERY_30_SECONDS,
    params: [{ name: 'host', value: box.host }],
    features: [
      {
        name: 'Power',
        external_id: ids.feature(FEATURE.POWER),
        category: DEVICE_FEATURE_CATEGORIES.TELEVISION,
        type: TV.BINARY,
        min: 0,
        max: 1,
        read_only: false,
        // The remote protocol never confirms: the state comes from the polls.
        has_feedback: false,
        keep_history: true,
      },
      {
        name: 'Channel',
        external_id: ids.feature(FEATURE.CHANNEL),
        category: DEVICE_FEATURE_CATEGORIES.TELEVISION,
        type: TV.CHANNEL,
        min: 0,
        max: MAX_CHANNEL,
        read_only: false,
        has_feedback: false,
        keep_history: false,
      },
      ...BUTTON_FEATURES.map((button) => ({
        name: button.name,
        external_id: ids.feature(button.key),
        category: DEVICE_FEATURE_CATEGORIES.TELEVISION,
        type: button.type,
        min: 0,
        max: 1,
        read_only: false,
        has_feedback: false,
        keep_history: false,
      })),
    ],
  };
}

/**
 * The remote control port of a box: the cached one, or the first that
 * answers among the candidates of the configured model.
 */
async function resolvePort(box, config) {
  const state = stateOf(box.externalId);
  if (state.port === null) {
    state.port = await driver.detectPort(box.host, config.model);
  }
  return state.port;
}

/**
 * Send remote keys to a box. Throws when the box cannot be reached, after
 * forgetting the port so the next attempt detects it again.
 */
export async function sendToBox(gladys, box, config, commands) {
  const list = normalizeCommands(commands);
  const state = stateOf(box.externalId);
  const port = await resolvePort(box, config);
  if (port === null) {
    await markReachable(gladys, box, false);
    throw new Error(`${box.name} (${box.host}) does not answer on the remote control ports`);
  }
  try {
    await driver.sendCommands(box.host, port, list);
  } catch (err) {
    state.port = null;
    await markReachable(gladys, box, false);
    throw err;
  }
  logger.info(`${box.name}: sent ${list.join(', ')}`);
  await markReachable(gladys, box, true);
}

/**
 * Turn a box on, put it in standby, or toggle it.
 * @param {'on'|'standby'|'toggle'} target
 * @returns {Promise<boolean>} whether the power key was pressed.
 */
export async function setPower(gladys, box, config, target) {
  const state = stateOf(box.externalId);
  const wantStandby = target === POWER_STATES.STANDBY;
  // The state is only known on a Sky Q with status polling: elsewhere, the
  // power key is the only way, and it toggles.
  if (target !== 'toggle' && state.standby !== null && state.standby === wantStandby) {
    logger.info(`${box.name}: already ${target}, nothing to do`);
    return false;
  }
  await sendToBox(gladys, box, config, ['power']);
  if (target === 'toggle') {
    state.standby = state.standby === null ? null : !state.standby;
  } else {
    state.standby = wantStandby;
  }
  if (state.standby !== null) {
    await gladys.publishState(box.ids.feature(FEATURE.POWER), state.standby ? 0 : 1);
  }
  return true;
}

/** Type a channel number on a box. */
export async function changeChannel(gladys, box, config, channel) {
  const digits = channelToCommands(channel);
  await sendToBox(gladys, box, config, digits);
  await gladys.publishState(box.ids.feature(FEATURE.CHANNEL), Number(digits.join('')));
}

/** Handler of a command on one of the features of a box. */
export async function onSetValue(gladys, { device, feature, value, config }) {
  const box = findBox(gladys, config, device.external_id);
  if (!box) {
    throw new Error(`${device.external_id} is no longer in the configuration`);
  }
  const featureKey = feature.external_id.slice(box.externalId.length + 1);
  if (featureKey === FEATURE.POWER) {
    await setPower(
      gladys,
      box,
      config,
      Number(value) === 1 ? POWER_STATES.ON : POWER_STATES.STANDBY,
    );
    return;
  }
  if (featureKey === FEATURE.CHANNEL) {
    await changeChannel(gladys, box, config, Math.round(Number(value)));
    return;
  }
  const button = BUTTON_FEATURES.find((candidate) => candidate.key === featureKey);
  if (!button) {
    throw new Error(`Unknown feature ${feature.external_id}`);
  }
  await sendToBox(gladys, box, config, [button.command]);
}

/**
 * Record a reachability change: transport badge, widget nudge. The scene
 * trigger is left to the polls (see pollBox).
 */
async function markReachable(gladys, box, reachable) {
  const state = stateOf(box.externalId);
  if (state.reachable === reachable) return;
  state.reachable = reachable;
  await gladys.publishTransports([transportEntry(box)]);
}

/** The transport badge entry of a box: local, or unreachable. */
export function transportEntry(box) {
  const { reachable } = stateOf(box.externalId);
  return {
    external_id: box.externalId,
    transport: reachable === false ? DEVICE_TRANSPORTS.UNREACHABLE : DEVICE_TRANSPORTS.LOCAL,
  };
}

/**
 * Read the state of a box, publish what changed and fire the scene triggers.
 * Resolves `{ events, changed }`: the scene events fired, and whether what
 * the widget shows (reachability, power, model) changed.
 */
export async function pollBox(gladys, box, config) {
  const state = stateOf(box.externalId);
  const before = JSON.stringify([state.reachable, state.standby, state.model]);
  const events = [];

  // Sky Q: the REST API answers both questions at once (reachable + power).
  const status =
    config.status_polling && config.model !== 'sky_plus' ? await driver.readStatus(box.host) : null;
  let reachable;
  if (status) {
    reachable = true;
    state.standby = status.standby;
    state.model = status.model ?? state.model;
  } else {
    // Otherwise, a handshake on the remote control port (no key sent): the
    // known port first, a full detection when it stops answering.
    reachable = state.port !== null && (await driver.probe(box.host, state.port));
    if (!reachable) {
      state.port = null;
      reachable = (await resolvePort(box, config)) !== null;
    }
    if (!config.status_polling) state.standby = null;
  }
  await markReachable(gladys, box, reachable);

  // Scene triggers fire on a TRANSITION between two polls: the first poll
  // after a start only sets the baseline.
  if (state.polledReachable !== null && state.polledReachable !== reachable) {
    events.push({
      key: AVAILABILITY_CHANGED_TRIGGER,
      data: {
        device: box.externalId,
        status: reachable ? AVAILABILITY.ONLINE : AVAILABILITY.OFFLINE,
      },
    });
  }
  state.polledReachable = reachable;

  if (status && status.standby !== null) {
    await gladys.publishChangedStates([
      { device_feature_external_id: box.ids.feature(FEATURE.POWER), state: status.standby ? 0 : 1 },
    ]);
    if (state.polledStandby !== null && state.polledStandby !== status.standby) {
      events.push({
        key: POWER_CHANGED_TRIGGER,
        data: {
          device: box.externalId,
          state: status.standby ? POWER_STATES.STANDBY : POWER_STATES.ON,
        },
      });
    }
    state.polledStandby = status.standby;
  }

  for (const event of events) {
    logger.info(`${box.name}: ${event.key} -> ${JSON.stringify(event.data)}`);
    await gladys.publishSceneEvent(event.key, event.data);
  }
  const changed = JSON.stringify([state.reachable, state.standby, state.model]) !== before;
  return { events, changed };
}

/** Check one box from scratch (Configuration screen action). */
export async function testBox(gladys, box, config) {
  const state = stateOf(box.externalId);
  state.port = null;
  const port = await resolvePort(box, config);
  await markReachable(gladys, box, port !== null);
  return port;
}
