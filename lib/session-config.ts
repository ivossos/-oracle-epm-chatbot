import type { RealtimeSessionCreateParams } from '@runwayml/sdk/resources/realtime-sessions';

const PRESET_IDS = [
  'game-character',
  'music-superstar',
  'game-character-man',
  'cat-character',
  'influencer',
  'tennis-coach',
  'human-resource',
  'fashion-designer',
  'cooking-teacher',
] as const;

type PresetId = (typeof PRESET_IDS)[number];

export const EPM_PERSONALITY = `You are an Oracle EPM (Enterprise Performance Management) assistant.
You help finance teams with Oracle EPM Cloud: Planning (EPBCS/PBCS), Financial Consolidation and Close (FCCS),
Account Reconciliation (ARCS), Narrative Reporting, Profitability and Cost Management, and EPM Automate / REST APIs.
Explain concepts clearly, ask a short clarifying question when the request is ambiguous,
and keep spoken answers brief — a few sentences at a time. If you are not sure, say so instead of guessing.`;

export const EPM_START_SCRIPT =
  "Hi! I'm your Oracle EPM assistant. Ask me about Planning, Consolidation, Close, or EPM Automate.";

type Env = Record<string, string | undefined>;

/** Picks the Character from server config. The browser never chooses it. */
export function resolveAvatar(env: Env): RealtimeSessionCreateParams['avatar'] {
  const avatarId = env.RUNWAY_AVATAR_ID?.trim();
  if (avatarId) return { type: 'custom', avatarId };

  const presetId = (env.RUNWAY_AVATAR_PRESET?.trim() || 'human-resource') as PresetId;
  if (!PRESET_IDS.includes(presetId)) {
    throw new Error(`Unknown RUNWAY_AVATAR_PRESET "${presetId}". Use one of: ${PRESET_IDS.join(', ')}`);
  }
  return { type: 'runway-preset', presetId };
}

export function buildSessionParams(env: Env): RealtimeSessionCreateParams {
  const maxDuration = Number(env.RUNWAY_MAX_DURATION ?? 300);
  return {
    model: 'gwm1_avatars',
    avatar: resolveAvatar(env),
    personality: EPM_PERSONALITY,
    startScript: EPM_START_SCRIPT,
    maxDuration: Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : 300,
  };
}
