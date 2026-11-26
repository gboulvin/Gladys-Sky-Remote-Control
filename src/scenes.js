// -----------------------------------------------------------------------------
// Scene actions (SDK v0.14+, Gladys 5.1+).
//
// Each action is declared in the manifest `scene_actions` field and handled
// here under the same key; index.js registers them with
// `gladys.onSceneAction(key, ...)`. The fields arrive resolved (scene
// variables substituted, defaults applied); a `"source": "devices"` field is
// the external id of the chosen box.
//
// A box that does not answer is an OUTPUT (`sent: false`), not a failure: a
// scene action is never a condition, the scene author gates the following
// actions on it. A field the box cannot use (unknown key, invalid channel)
// throws: the scene logs it and goes on.
//
// Scene TRIGGERS (`power_changed`, `availability_changed`) are fired by the
// polls, see src/devices/skyBox.js.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { POWER_STATES, changeChannel, findBox, sendToBox, setPower } from './devices/skyBox.js';
import { channelToCommands, normalizeCommands } from './skyRemote.js';

const logger = createLogger({ name: 'scenes' });

export const MAX_REPEAT = 10;
const POWER_TARGETS = [POWER_STATES.ON, POWER_STATES.STANDBY, 'toggle'];

function boxOf(gladys, config, externalId) {
  const box = findBox(gladys, config, externalId);
  if (!box) {
    throw new Error(`Unknown Sky box ${externalId}: is it still in the configuration?`);
  }
  return box;
}

// Run a send, turning "the box did not answer" into `false`.
async function attempt(label, send) {
  try {
    await send();
    return true;
  } catch (err) {
    logger.warn(`${label} failed: ${err.message}`);
    return false;
  }
}

export const SCENE_ACTIONS = {
  async send_command(gladys, { fields, config }) {
    const box = boxOf(gladys, config, fields.device);
    const [command] = normalizeCommands([fields.command]);
    const repeat = Math.min(Math.max(Math.round(Number(fields.repeat ?? 1)) || 1, 1), MAX_REPEAT);
    logger.info(`Scene action send_command <- ${box.name}: ${command} x${repeat}`);
    const sent = await attempt(`send_command on ${box.name}`, () =>
      sendToBox(gladys, box, config, Array(repeat).fill(command)),
    );
    return { sent };
  },

  async change_channel(gladys, { fields, config }) {
    const box = boxOf(gladys, config, fields.device);
    // Validate before talking to the box: an invalid number fails the action.
    channelToCommands(fields.channel);
    logger.info(`Scene action change_channel <- ${box.name}: ${fields.channel}`);
    const sent = await attempt(`change_channel on ${box.name}`, () =>
      changeChannel(gladys, box, config, fields.channel),
    );
    return { sent };
  },

  async set_power(gladys, { fields, config }) {
    const box = boxOf(gladys, config, fields.device);
    const target = fields.state ?? POWER_STATES.ON;
    if (!POWER_TARGETS.includes(target)) {
      throw new Error(`Unknown power state "${target}"`);
    }
    logger.info(`Scene action set_power <- ${box.name}: ${target}`);
    let pressed = false;
    const sent = await attempt(`set_power on ${box.name}`, async () => {
      pressed = await setPower(gladys, box, config, target);
    });
    return { sent, pressed };
  },
};
