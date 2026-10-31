import { handleAuth } from "@workos-inc/authkit-nextjs";

// Must match NEXT_PUBLIC_WORKOS_REDIRECT_URI and the redirect URI in the WorkOS dashboard.
export const GET = handleAuth({ returnPathname: "/chat" });
