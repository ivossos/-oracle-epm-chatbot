import Runway from '@runwayml/sdk';
import { pollUntilReady } from '@runwayml/avatars-react/api';
import { buildSessionParams } from '@/lib/session-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Creates a Runway realtime Session on the server and waits until it is READY.
 * Returns only the one-time { sessionId, sessionKey } the browser SDK needs;
 * the API secret never leaves the server.
 */
export async function POST() {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) {
    return Response.json({ error: 'RUNWAYML_API_SECRET is not configured on the server.' }, { status: 500 });
  }

  let params;
  try {
    params = buildSessionParams(process.env);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }

  const runway = new Runway({ apiKey });
  let sessionId: string | undefined;
  try {
    ({ id: sessionId } = await runway.realtimeSessions.create(params));
    const { sessionKey } = await pollUntilReady({ sessionId, apiKey, timeoutMs: 60_000 });
    return Response.json({ sessionId, sessionKey });
  } catch (err) {
    // Don't leave a half-started session running (it can use credits).
    if (sessionId) await runway.realtimeSessions.delete(sessionId).catch(() => {});
    console.error('Failed to start avatar session', err);
    return Response.json({ error: 'Could not start the avatar session. Please try again.' }, { status: 502 });
  }
}
