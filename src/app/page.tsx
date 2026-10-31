import { Suspense } from "react";
import Link from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { SignOutButton } from "./sign-out-button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-8 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight">Oracle EPM Chatbot</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Ask questions about your Oracle EPM data.
      </p>

      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <AuthActions />
      </Suspense>
    </main>
  );
}

// Reads the session cookie, so it renders inside <Suspense>.
async function AuthActions() {
  const { user } = await withAuth();

  return user ? (
    <div className="flex flex-col items-center gap-4">
      <p>Signed in as {user.firstName ?? user.email}</p>
      <div className="flex gap-3">
        <Link
          href="/chat"
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
        >
          Open chat
        </Link>
        <SignOutButton />
      </div>
    </div>
  ) : (
    <div className="flex gap-3">
      {/* Plain <a> links so sign-in starts on navigation, not prefetch. */}
      <a href="/sign-in" className="rounded-full bg-foreground px-4 py-2 text-sm text-background">
        Sign in
      </a>
      <a
        href="/sign-up"
        className="rounded-full border border-black/10 px-4 py-2 text-sm dark:border-white/20"
      >
        Sign up
      </a>
    </div>
  );
}
