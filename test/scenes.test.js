import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { listBoxes, pollBox } from '../src/devices/skyBox.js';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { installFakeDriver, makeConfig } from './helpers.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const config = makeConfig();
const declarationOf = (list, key) => manifest[list].find((entry) => entry.key === key);
const keysOf = (list) => (list ?? []).map((entry) => entry.key);

function assertDeclaredOutputs(key, outputs) {
  const declared = keysOf(declarationOf('scene_actions', key).outputs);
  for (const output of Object.keys(outputs)) {
    assert.ok(declared.includes(output), `${key}: output "${output}" is not declared`);
  }
}

test('send_command presses the key the number of times asked', async () => {
  const sent = installFakeDriver({ '192.168.1.20': { port: 49160 } });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  const outputs = await SCENE_ACTIONS.send_command(gladys, {
    fields: { device: box.externalId, command: 'Down', repeat: 3 },
    config,
  });
  assert.deepEqual(outputs, { sent: true });
  assert.deepEqual(sent[0].commands, ['down', 'down', 'down']);
  assertDeclaredOutputs('send_command', outputs);
});

test('send_command reports an unreachable box through its output', async () => {
  installFakeDriver({});
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  const outputs = await SCENE_ACTIONS.send_command(gladys, {
    fields: { device: box.externalId, command: 'play' },
    config,
  });
  assert.deepEqual(outputs, { sent: false });
});

test('send_command fails on an unknown key or a removed box', async () => {
  installFakeDriver({ '192.168.1.20': { port: 49160 } });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  await assert.rejects(
    SCENE_ACTIONS.send_command(gladys, {
      fields: { device: box.externalId, command: 'nope' },
      config,
    }),
    /Unknown Sky remote command/,
  );
  await assert.rejects(
    SCENE_ACTIONS.send_command(gladys, {
      fields: { device: 'ext:x:gone', command: 'play' },
      config,
    }),
    /Unknown Sky box/,
  );
});

test('change_channel types the channel, and refuses an invalid one', async () => {
  const sent = installFakeDriver({ '192.168.1.20': { port: 49160 } });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  const outputs = await SCENE_ACTIONS.change_channel(gladys, {
    fields: { device: box.externalId, channel: '401' },
    config,
  });
  assert.deepEqual(outputs, { sent: true });
  assert.deepEqual(sent[0].commands, ['4', '0', '1']);
  assertDeclaredOutputs('change_channel', outputs);
  await assert.rejects(
    SCENE_ACTIONS.change_channel(gladys, {
      fields: { device: box.externalId, channel: 'BBC' },
      config,
    }),
    /Invalid channel/,
  );
});

test('set_power skips the key when the box is already in the asked state', async () => {
  const sent = installFakeDriver({ '192.168.1.20': { port: 49160, status: true, standby: true } });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  await pollBox(gladys, box, config);
  let outputs = await SCENE_ACTIONS.set_power(gladys, {
    fields: { device: box.externalId, state: 'standby' },
    config,
  });
  assert.deepEqual(outputs, { sent: true, pressed: false });
  outputs = await SCENE_ACTIONS.set_power(gladys, {
    fields: { device: box.externalId, state: 'on' },
    config,
  });
  assert.deepEqual(outputs, { sent: true, pressed: true });
  assert.deepEqual(sent[0].commands, ['power']);
  assertDeclaredOutputs('set_power', outputs);
  await assert.rejects(
    SCENE_ACTIONS.set_power(gladys, { fields: { device: box.externalId, state: 'off' }, config }),
    /Unknown power state/,
  );
});

test('scene events only carry the keys their trigger declares', async () => {
  const boxes = { '192.168.1.20': { port: 49160, status: true, standby: true } };
  installFakeDriver(boxes);
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  await pollBox(gladys, box, config);
  boxes['192.168.1.20'].standby = false;
  await pollBox(gladys, box, config);
  boxes['192.168.1.20'].port = null;
  await pollBox(gladys, box, config);
  assert.equal(gladys.fake.sceneEvents.length, 2);
  for (const { key, data } of gladys.fake.sceneEvents) {
    const trigger = declarationOf('scene_triggers', key);
    assert.ok(trigger, `trigger ${key} is declared`);
    const declared = [...keysOf(trigger.fields), ...keysOf(trigger.variables)];
    for (const [dataKey, value] of Object.entries(data)) {
      assert.ok(declared.includes(dataKey), `${key}: data.${dataKey} is not declared`);
      const field = trigger.fields.find((f) => f.key === dataKey);
      if (field?.options) {
        assert.ok(
          field.options.some((option) => option.value === value),
          `${key}: data.${dataKey} "${value}" must be one of the filter options`,
        );
      }
    }
  }
});
