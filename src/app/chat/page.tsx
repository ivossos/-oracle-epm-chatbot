import { Suspense } from "react";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { SignOutButton } from "../sign-out-button";
import { Chat } from "./chat";

export default function ChatPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </header>
      <Chat />
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
