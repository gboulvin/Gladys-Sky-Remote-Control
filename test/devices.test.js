import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_POLL_FREQUENCIES,
  DEVICE_TRANSPORTS,
} from '@gladysassistant/integration-sdk';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import {
  AVAILABILITY_CHANGED_TRIGGER,
  BUTTON_FEATURES,
  FEATURE,
  POWER_CHANGED_TRIGGER,
  buildDevice,
  findBox,
  getBoxState,
  listBoxes,
  onSetValue,
  pollBox,
} from '../src/devices/skyBox.js';
import { COMMANDS } from '../src/skyRemote.js';
import { installFakeDriver, makeConfig } from './helpers.js';

const config = makeConfig();
const devicesOf = (gladys) =>
  listBoxes(gladys, config).map((box) => buildDevice(gladys, config, box));

test('one device per configured box, named after the config', () => {
  const gladys = createFakeGladys();
  const devices = devicesOf(gladys);
  assert.deepEqual(
    devices.map((device) => device.name),
    ['Living room', 'Sky box 192.168.1.21'],
  );
  assert.ok(devices[0].external_id.endsWith(':sky-box:192-168-1-20'));
  assert.equal(devices[0].poll_frequency, DEVICE_POLL_FREQUENCIES.EVERY_30_SECONDS);
});

test('the external id only depends on the address, not on the name', () => {
  const gladys = createFakeGladys();
  const renamed = makeConfig({ boxes: 'Salon=192.168.1.20' });
  assert.equal(listBoxes(gladys, renamed)[0].externalId, listBoxes(gladys, config)[0].externalId);
});

test('Gladys accepts the discovery payload', async () => {
  const gladys = createFakeGladys();
  await gladys.publishDiscoveredDevices(devicesOf(gladys));
  assert.equal(gladys.fake.discoveredDevices.length, 2);
});

test('every feature carries the columns Gladys needs to create it', () => {
  const gladys = createFakeGladys();
  for (const device of devicesOf(gladys)) {
    const ids = new Set();
    for (const feature of device.features) {
      for (const column of ['name', 'min', 'max', 'read_only', 'has_feedback']) {
        assert.notEqual(feature[column], undefined, `${feature.external_id}: ${column}`);
      }
      assert.ok(feature.min <= feature.max, `${feature.external_id}: min <= max`);
      assert.equal(feature.category, DEVICE_FEATURE_CATEGORIES.TELEVISION);
      assert.ok(!ids.has(feature.external_id), 'feature external ids are unique');
      ids.add(feature.external_id);
    }
  }
});

test('every button feature maps to a known remote key', () => {
  for (const button of BUTTON_FEATURES) {
    assert.ok(Object.hasOwn(COMMANDS, button.command), button.key);
  }
});

const featureOf = (box, key) => ({ external_id: box.ids.feature(key) });

test('a button feature presses its key', async () => {
  const sent = installFakeDriver({ '192.168.1.20': { port: 49160 } });
  const gladys = createFakeGladys();
  const box = findBox(gladys, config, listBoxes(gladys, config)[0].externalId);
  await onSetValue(gladys, {
    device: { external_id: box.externalId },
    feature: featureOf(box, 'channel-up'),
    value: 1,
    config,
  });
  assert.deepEqual(sent, [{ host: '192.168.1.20', port: 49160, commands: ['channelup'] }]);
});

test('the channel feature types the digits and publishes the channel', async () => {
  const sent = installFakeDriver({ '192.168.1.20': { port: 5900 } });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  await onSetValue(gladys, {
    device: { external_id: box.externalId },
    feature: featureOf(box, FEATURE.CHANNEL),
    value: 106,
    config,
  });
  assert.deepEqual(sent[0].commands, ['1', '0', '6']);
  assert.equal(gladys.fake.states.at(-1).state, 106);
});

test('power only presses the key when the known state differs', async () => {
  const sent = installFakeDriver({ '192.168.1.20': { port: 49160, status: true, standby: false } });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  await pollBox(gladys, box, config);
  const power = (value) =>
    onSetValue(gladys, {
      device: { external_id: box.externalId },
      feature: featureOf(box, FEATURE.POWER),
      value,
      config,
    });
  await power(1);
  assert.equal(sent.length, 0, 'already on: nothing pressed');
  await power(0);
  assert.deepEqual(sent[0].commands, ['power']);
  assert.equal(getBoxState(box.externalId).standby, true);
  assert.equal(gladys.fake.states.at(-1).state, 0);
});

test('power always presses the key when the state is unknown (Sky+ HD)', async () => {
  const sent = installFakeDriver({ '192.168.1.21': { port: 5900, status: false } });
  const gladys = createFakeGladys();
  const box = listBoxes(gladys, config)[1];
  await onSetValue(gladys, {
    device: { external_id: box.externalId },
    feature: featureOf(box, FEATURE.POWER),
    value: 1,
    config,
  });
  assert.deepEqual(sent[0].commands, ['power']);
});

test('a command to an unreachable box fails and flags it unreachable', async () => {
  installFakeDriver({});
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  await assert.rejects(
    onSetValue(gladys, {
      device: { external_id: box.externalId },
      feature: featureOf(box, 'play'),
      value: 1,
      config,
    }),
    /does not answer/,
  );
  assert.equal(gladys.fake.transports.at(-1).transport, DEVICE_TRANSPORTS.UNREACHABLE);
});

test('a command to a removed box fails', async () => {
  installFakeDriver({});
  const gladys = createFakeGladys();
  await assert.rejects(
    onSetValue(gladys, {
      device: { external_id: 'ext:x:sky-box:gone' },
      feature: { external_id: 'ext:x:sky-box:gone:play' },
      value: 1,
      config,
    }),
    /no longer in the configuration/,
  );
});

test('polls fire power_changed and availability_changed on transitions only', async () => {
  const boxes = { '192.168.1.20': { port: 49160, status: true, standby: true } };
  installFakeDriver(boxes);
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);

  let result = await pollBox(gladys, box, config);
  assert.deepEqual(result.events, [], 'the first poll sets the baseline');
  assert.equal(result.changed, true);
  assert.equal(gladys.fake.transports.at(-1).transport, DEVICE_TRANSPORTS.LOCAL);

  result = await pollBox(gladys, box, config);
  assert.deepEqual(result, { events: [], changed: false }, 'nothing changed');

  boxes['192.168.1.20'].standby = false;
  result = await pollBox(gladys, box, config);
  assert.deepEqual(result.events, [
    { key: POWER_CHANGED_TRIGGER, data: { device: box.externalId, state: 'on' } },
  ]);

  boxes['192.168.1.20'].port = null;
  result = await pollBox(gladys, box, config);
  assert.deepEqual(result.events, [
    { key: AVAILABILITY_CHANGED_TRIGGER, data: { device: box.externalId, status: 'offline' } },
  ]);
  assert.equal(gladys.fake.transports.at(-1).transport, DEVICE_TRANSPORTS.UNREACHABLE);
  assert.equal(gladys.fake.sceneEvents.length, 2);
});

test('without status polling, the poll only checks the remote port', async () => {
  installFakeDriver({ '192.168.1.20': { port: 49160, status: true, standby: false } });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  const quiet = makeConfig({ status_polling: false });
  await pollBox(gladys, box, quiet);
  const state = getBoxState(box.externalId);
  assert.equal(state.reachable, true);
  assert.equal(state.standby, null);
});
