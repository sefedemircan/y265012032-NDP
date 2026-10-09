import { createClient } from "@supabase/supabase-js";
import { requireServiceEnv } from "./env";

export function createAdminClient() {
  const { url, serviceKey } = requireServiceEnv();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
