import "server-only";
import { createServerClient } from "@supabase/ssr";
import { AuthError, AuthUnknownError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; the auth proxy refreshes sessions.
        }
      },
    },
  });

  // A stale/invalid refresh-token cookie (e.g. left over from a local database
  // reset) makes getUser() throw instead of resolving to a signed-out result.
  // Treat that the same as "not signed in" rather than crashing the render.
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
