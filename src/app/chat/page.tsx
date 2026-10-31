import { Suspense } from "react";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { SignOutButton } from "../sign-out-button";

export default function ChatPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </header>
      <section className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-black/15 p-8 text-zinc-500 dark:border-white/20">
        The chatbot goes here.
      </section>
    </main>
  );
}

async function UserMenu() {
  // Redirects to the WorkOS sign-in page if nobody is signed in.
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <div className="flex items-center gap-3 text-sm">
      <span>{user.email}</span>
      <SignOutButton />
    </div>
  );
}
