import { authkitProxy } from "@workos-inc/authkit-nextjs";

// Keeps the WorkOS session fresh on every page so `withAuth()` works.
export default authkitProxy();

// Run on all routes except Next.js static assets.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
