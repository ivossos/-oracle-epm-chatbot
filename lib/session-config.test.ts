import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionParams, resolveAvatar } from './session-config.ts';

test('uses a custom Character when RUNWAY_AVATAR_ID is set', () => {
  assert.deepEqual(resolveAvatar({ RUNWAY_AVATAR_ID: 'abc', RUNWAY_AVATAR_PRESET: 'tennis-coach' }), {
    type: 'custom',
    avatarId: 'abc',
  });
});

test('falls back to the human-resource preset', () => {
  assert.deepEqual(resolveAvatar({}), { type: 'runway-preset', presetId: 'human-resource' });
});

test('rejects unknown presets instead of guessing', () => {
  assert.throws(() => resolveAvatar({ RUNWAY_AVATAR_PRESET: 'cfo' }), /Unknown RUNWAY_AVATAR_PRESET/);
});

test('builds an EPM session with a safe max duration', () => {
  const p = buildSessionParams({ RUNWAY_MAX_DURATION: 'nope' });
  assert.equal(p.model, 'gwm1_avatars');
  assert.equal(p.maxDuration, 300);
  assert.match(p.personality ?? '', /Oracle EPM/);
});
