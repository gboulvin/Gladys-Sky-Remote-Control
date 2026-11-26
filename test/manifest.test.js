// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The store indexer validates the manifest, but nothing there can know which
// handlers the code registers: these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACTIONS } from '../src/actions.js';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { WIDGETS } from '../src/widgets.js';
import { DEFAULT_CONFIG, MODELS } from '../src/config.js';
import { COMMAND_ORDER, commandOptions } from '../src/commandLabels.js';
import { COMMANDS } from '../src/skyRemote.js';
import {
  AVAILABILITY,
  AVAILABILITY_CHANGED_TRIGGER,
  POWER_CHANGED_TRIGGER,
  POWER_STATES,
} from '../src/devices/skyBox.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const allFields = [
  ...(manifest.config_schema ?? []),
  ...[
    ...(manifest.actions ?? []),
    ...(manifest.scene_triggers ?? []),
    ...(manifest.scene_actions ?? []),
  ].flatMap((item) => item.fields ?? []),
  ...(manifest.widgets ?? []).flatMap((widget) => widget.settings ?? []),
];

const keysOf = (list) => (list ?? []).map((entry) => entry.key);
const declarationOf = (list, key) => manifest[list].find((entry) => entry.key === key);

function minGladysVersion() {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  return match.slice(1).map(Number);
}

function isAtLeast(version, required) {
  for (let i = 0; i < required.length; i += 1) {
    if (version[i] !== required[i]) return version[i] > required[i];
  }
  return true;
}

test('every manifest action has a handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.actions).sort(), Object.keys(ACTIONS).sort());
});

test('every scene_actions key has a handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.scene_actions).sort(), Object.keys(SCENE_ACTIONS).sort());
});

test('every widgets key has a handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.widgets).sort(), Object.keys(WIDGETS).sort());
});

test('the scene triggers the polls fire are the declared ones', () => {
  assert.deepEqual(
    keysOf(manifest.scene_triggers).sort(),
    [AVAILABILITY_CHANGED_TRIGGER, POWER_CHANGED_TRIGGER].sort(),
  );
  const values = (key, field) =>
    declarationOf('scene_triggers', key)
      .fields.find((f) => f.key === field)
      .options.map((o) => o.value)
      .sort();
  assert.deepEqual(values(POWER_CHANGED_TRIGGER, 'state'), Object.values(POWER_STATES).sort());
  assert.deepEqual(
    values(AVAILABILITY_CHANGED_TRIGGER, 'status'),
    Object.values(AVAILABILITY).sort(),
  );
});

test('the key options of send_command are the keys the code knows', () => {
  const field = declarationOf('scene_actions', 'send_command').fields.find(
    (f) => f.key === 'command',
  );
  assert.deepEqual(field.options, commandOptions(), 'same options as the widget form');
  assert.deepEqual([...COMMAND_ORDER].sort(), Object.keys(COMMANDS).sort(), 'every key listed');
});

test('the model options are the models the code knows', () => {
  const field = manifest.config_schema.find((f) => f.key === 'model');
  assert.deepEqual(
    field.options.map((o) => o.value),
    MODELS,
  );
});

test('config_schema defaults stay consistent with DEFAULT_CONFIG', () => {
  for (const field of manifest.config_schema) {
    if (field.type === 'section') {
      assert.ok(!(field.key in DEFAULT_CONFIG), `section "${field.key}" stores no value`);
      continue;
    }
    assert.equal(DEFAULT_CONFIG[field.key], field.default, `DEFAULT_CONFIG.${field.key}`);
  }
});

test('capability fields require the matching Gladys version', () => {
  // scene_triggers, scene_actions, widgets: 5.1.0; categories: 4.86.0;
  // countries: 5.3.0 — older cores reject unknown manifest fields.
  assert.ok(manifest.countries.length > 0 && manifest.categories.length > 0);
  assert.ok(isAtLeast(minGladysVersion(), [5, 3, 0]), manifest.gladys_version);
});

test('countries are ISO 3166-1 alpha-2 codes', () => {
  for (const country of manifest.countries) {
    assert.match(country, /^[A-Z]{2}$/);
  }
});

test('the integration declares the local transport only', () => {
  assert.deepEqual(manifest.transports, ['local']);
});

test('dynamic selects declare a source and no static options', () => {
  for (const field of allFields.filter((f) => f.source !== undefined)) {
    assert.equal(field.source, 'devices');
    assert.equal(field.options, undefined, field.key);
  }
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  assert.equal(manifest.version, pkg.version, 'manifest version must match package.json');
  assert.ok(
    manifest.docker_image.endsWith(`:${manifest.version}`),
    `docker_image must be tagged :${manifest.version}, got "${manifest.docker_image}"`,
  );
});

test('the catalog description holds 10 to 100 characters per language', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang}: ${text.length}`);
  }
});

test('widget labels hold 3 to 30 characters and descriptions at most 100', () => {
  for (const widget of manifest.widgets) {
    for (const [lang, text] of Object.entries(widget.label)) {
      assert.ok(text.length >= 3 && text.length <= 30, `${widget.key}.label.${lang}`);
    }
    for (const [lang, text] of Object.entries(widget.description)) {
      assert.ok(text.length <= 100, `${widget.key}.description.${lang}: ${text.length}`);
    }
  }
});

test('field placeholders are multi-language objects', () => {
  for (const field of allFields.filter((f) => f.placeholder !== undefined)) {
    assert.equal(typeof field.placeholder, 'object', field.key);
    assert.ok(field.placeholder.en, field.key);
  }
});
