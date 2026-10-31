# Oracle EPM Chatbot

Chat with your Oracle EPM Cloud data (Planning, FCCS and related apps). Claude answers questions by calling the EPM REST API: it looks up members and substitution variables, reads data slices, and checks recent jobs. It only reads data; it can't change data or run jobs.

Sign-in is handled by [WorkOS AuthKit](https://workos.com/docs/authkit/nextjs).

If `EPM_URL` is empty, the chat uses built-in sample data (a "Vision" app), so you can try it before connecting EPM.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in:
   - WorkOS values from the [WorkOS dashboard](https://dashboard.workos.com) (API Keys page). Generate the cookie password (required, 32+ characters) with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
   - `ANTHROPIC_API_KEY` from the [Claude Console](https://platform.claude.com).
   - Your EPM URL, default application and a user with read access. Classic pods use `identitydomain.username`; OCI pods use just the username. Or set `EPM_ACCESS_TOKEN` for OAuth.

3. In the WorkOS dashboard, under your application's **Redirects** tab, set:
   - Redirect URI: `http://localhost:3000/callback`
   - Initiate login URI: `http://localhost:3000/sign-in`
   - Sign-out redirect: `http://localhost:3000`

4. Run the dev server and open http://localhost:3000:

   ```bash
   npm run dev
   ```

## Routes

| Route       | What it does                                         |
| ----------- | ---------------------------------------------------- |
| `/`         | Home page; shows sign in / sign up or the signed-in user |
| `/chat`     | Chat page; requires sign-in                          |
| `/sign-in`, `/sign-up` | Send the user to the WorkOS hosted login  |
| `/callback` | WorkOS returns here after login                      |
| `/api/chat` | Chat backend; streams Claude's answer (signed-in only) |

## Code map

- `src/app/api/chat/route.ts`: chat backend. Runs the Claude tool loop and streams the answer.
- `src/lib/epm/tools.ts`: the EPM tools Claude can call.
- `src/lib/epm/client.ts`: Oracle EPM REST API client.
- `src/lib/epm/demo.ts`: sample data used when EPM isn't configured.
- `src/app/chat/chat.tsx`: chat screen.
- `src/proxy.ts`, `src/app/callback/route.ts`: WorkOS sign-in.
