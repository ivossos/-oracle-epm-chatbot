# Oracle EPM Chatbot

Next.js app with sign-in handled by [WorkOS AuthKit](https://workos.com/docs/authkit/nextjs).

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values from the [WorkOS dashboard](https://dashboard.workos.com) (API Keys page). Generate the cookie password with `openssl rand -base64 24`.

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

Auth code: `src/proxy.ts` (session refresh) and `src/app/callback/route.ts`.
