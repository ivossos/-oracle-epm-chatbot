# Oracle EPM Chatbot — talking avatar

A Next.js app where users talk out loud to an Oracle EPM assistant, rendered as a
[Runway Character](https://docs.dev.runwayml.com/characters/) (realtime avatar).

## How it works

1. The browser posts to `/api/avatar/connect`.
2. The server creates a Runway realtime Session with `@runwayml/sdk` (using the EPM
   personality in `lib/session-config.ts`), waits until it is `READY`, and returns only
   the one-time `sessionId` + `sessionKey`.
3. `@runwayml/avatars-react` uses those to join the call. Each new call creates a new session.

`RUNWAYML_API_SECRET` stays on the server and is never sent to the browser.

## Setup

1. Sign in at the [Runway Developer Portal](https://dev.runway.com/), pick a project and create an API key.
2. `cp .env.example .env.local` and set `RUNWAYML_API_SECRET`.
3. Optional: create your own Character in the portal and set `RUNWAY_AVATAR_ID`.
   Otherwise the `human-resource` preset is used.
4. `npm install && npm run dev`, then open http://localhost:3000 and click **Start talking**.

Calls use Runway project credits. `RUNWAY_MAX_DURATION` (default 300 s) caps each call.

## Checks

```bash
npm test && npm run typecheck && npm run build
```
