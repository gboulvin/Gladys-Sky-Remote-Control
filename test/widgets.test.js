import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { listBoxes, pollBox } from '../src/devices/skyBox.js';
import { SKY_REMOTE_WIDGET, WIDGETS, WIDGET_ACTIONS, refreshWidgets } from '../src/widgets.js';
import { installFakeDriver, makeConfig } from './helpers.js';

const config = makeConfig();
const widget = WIDGETS[SKY_REMOTE_WIDGET];
const getContent = (gladys, settings) =>
  widget.get(gladys, { settings, language: 'en', units: 'metric', config });

test('the widget content is rendered exactly as sent', async () => {
  installFakeDriver({
    '192.168.1.20': { port: 49160, status: true, standby: false, model: 'Sky Q' },
  });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  // Unknown state first, then after a poll.
  assert.deepEqual(validateWidgetContent(await getContent(gladys, { device: box.externalId })), []);
  await pollBox(gladys, box, config);
  const content = await getContent(gladys, { device: box.externalId });
  assert.deepEqual(validateWidgetContent(content), []);
  const status = content.components.find((c) => c.type === 'status');
  assert.equal(status.items.length, 4, 'connection, power, address, model');
});

test('the widget asks for a box when none is picked or the box is gone', async () => {
  const gladys = createFakeGladys();
  for (const settings of [{}, { device: 'ext:x:gone' }]) {
    const content = await getContent(gladys, settings);
    assert.deepEqual(validateWidgetContent(content), []);
    assert.equal(content.components[0].type, 'text');
  }
});

test('every button of the content is handled and answers a short toast', async () => {
  const sent = installFakeDriver({ '192.168.1.20': { port: 49160 } });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  const buttons = (await getContent(gladys, { device: box.externalId })).components.filter(
    (c) => c.type === 'button',
  );
  assert.equal(buttons.length, 4);
  for (const { action } of buttons) {
    const message = await widget.action(gladys, {
      actionKey: action.key,
      params: action.params,
      values: { command: 'select' },
      settings: {},
      config,
    });
    for (const lang of ['en', 'fr', 'de', 'es']) {
      assert.ok(message[lang] && message[lang].length <= 200, `${action.key}: toast in ${lang}`);
    }
  }
  assert.deepEqual(
    sent.map((s) => s.commands),
    [['power'], ['channelup'], ['channeldown'], ['select']],
  );
});

test('the remote form prefers a channel number over the key', async () => {
  const sent = installFakeDriver({ '192.168.1.20': { port: 49160 } });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  const message = await widget.action(gladys, {
    actionKey: WIDGET_ACTIONS.REMOTE,
    params: { device: box.externalId },
    values: { command: 'play', channel: 143 },
    config,
  });
  assert.deepEqual(sent[0].commands, ['1', '4', '3']);
  assert.match(message.en, /143/);
});

test('an unknown widget action or box fails, so the user sees the error', async () => {
  installFakeDriver({ '192.168.1.20': { port: 49160 } });
  const gladys = createFakeGladys();
  const [box] = listBoxes(gladys, config);
  await assert.rejects(
    widget.action(gladys, { actionKey: 'unknown', params: { device: box.externalId }, config }),
    /Unknown widget action/,
  );
  await assert.rejects(
    widget.action(gladys, { actionKey: WIDGET_ACTIONS.POWER, params: { device: 'nope' }, config }),
    /no longer in the configuration/,
  );
});

test('refreshWidgets nudges every widget', () => {
  const gladys = createFakeGladys();
  refreshWidgets(gladys);
  assert.deepEqual(gladys.fake.widgetRefreshes, Object.keys(WIDGETS));
});
