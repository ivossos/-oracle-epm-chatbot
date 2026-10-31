import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

// Also set this as the "Initiate login URI" in the WorkOS dashboard.
export const GET = async () => {
  redirect(await getSignInUrl());
};
