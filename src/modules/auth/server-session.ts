import "server-only";

import { headers } from "next/headers";
import { parseToken, type SessionUser } from "@/lib/session";

/**
 * Server-side session reader.
 *
 * Keep token parsing isolated here so pages, API routes and permission guards do
 * not have to know where the auth header comes from or how the token is signed.
 */
export async function getServerSession(): Promise<SessionUser | null> {
  const headersList = await headers();
  const auth = headersList.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return parseToken(auth.slice(7));
}

export type { SessionUser };
