// Every user-facing text exists in the four languages of the Gladys UI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { LANGUAGES, MESSAGES, msg } from '../src/i18n.js';
import { COMMAND_LABELS } from '../src/commandLabels.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);

const TEXT_KEYS = new Set(['label', 'description', 'placeholder']);

// Every multi-language object of the manifest, with its path.
function* texts(node, path = '') {
  if (Array.isArray(node)) {
    for (const [index, item] of node.entries()) yield* texts(item, `${path}[${index}]`);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (TEXT_KEYS.has(key) && value && typeof value === 'object' && !Array.isArray(value)) {
        yield [`${path}.${key}`, value];
      } else {
        yield* texts(value, `${path}.${key}`);
      }
    }
  }
}

test('every manifest text is translated in en, fr, de and es', () => {
  let count = 0;
  for (const [path, value] of texts(manifest)) {
    count += 1;
    for (const lang of LANGUAGES) {
      assert.ok(typeof value[lang] === 'string' && value[lang] !== '', `${path}.${lang}`);
    }
  }
  assert.ok(count > 50, 'the walk found the manifest texts');
});

test('every message and key label is translated in en, fr, de and es', () => {
  for (const [key, value] of [...Object.entries(MESSAGES), ...Object.entries(COMMAND_LABELS)]) {
    for (const lang of LANGUAGES) {
      assert.ok(typeof value[lang] === 'string' && value[lang] !== '', `${key}.${lang}`);
    }
  }
});

test('msg fills the placeholders in every language', () => {
  const message = msg('box_reachable', { name: 'Salon', port: 49160 });
  for (const lang of LANGUAGES) {
    assert.match(message[lang], /Salon/);
    assert.match(message[lang], /49160/);
    assert.doesNotMatch(message[lang], /\{/);
  }
  assert.throws(() => msg('nope'), /Unknown message/);
});

test('the user documentation exists in every language', async () => {
  for (const lang of LANGUAGES) {
    await access(new URL(`../docs/${lang}.md`, import.meta.url));
  }
});
