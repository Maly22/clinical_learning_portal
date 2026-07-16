import { createBrowserClient } from "@supabase/ssr";
import { AuthError, AuthUnknownError } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

export function createClient(options?: { persist?: boolean }) {
  const env = getPublicEnv();
  const client = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    // "Remember me" unchecked: write the auth cookie without Max-Age so it is
    // dropped by the browser as soon as the session ends, instead of the
    // library's 400-day default.
    cookieOptions: options?.persist === false ? { maxAge: undefined } : undefined,
  });

  // A stale/invalid refresh-token cookie (e.g. left over from a local database
  // reset) makes getUser() throw instead of resolving to a signed-out result.
  // Treat that the same as "not signed in" rather than crashing the caller.
  const getUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = (async (...args: Parameters<typeof getUser>) => {
    try {
      return await getUser(...args);
    } catch (error) {
      return { data: { user: null }, error: error instanceof AuthError ? error : new AuthUnknownError("Unable to load user", error) };
    }
  }) as typeof getUser;

  return client;
}
