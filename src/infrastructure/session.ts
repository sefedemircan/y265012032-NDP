import { redirect } from "next/navigation";
import type { User } from "@/domain/users/User";
import { SupabaseClinicStore } from "./clinic-store";
import { publicEnv } from "./supabase/env";
import { createClient } from "./supabase/server";

export async function requireUser(): Promise<User> {
  if (!publicEnv()) redirect("/");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const snapshot = await new SupabaseClinicStore(supabase).load();
  const profile = snapshot.getUsers().find((item) => item.getId() === user.id);
  if (!profile) redirect("/giris");
  return profile;
}
