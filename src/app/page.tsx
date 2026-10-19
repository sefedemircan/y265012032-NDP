import { redirect } from "next/navigation";
import { homeForRole } from "@/application/roles";
import type { UserRole } from "@/domain/users/User";
import { publicEnv } from "@/infrastructure/supabase/env";
import { createClient } from "@/infrastructure/supabase/server";

export default async function HomePage() {
  const env = publicEnv();

  if (env) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (data?.role) redirect(homeForRole(data.role as UserRole));
    }
  }

  redirect("/giris");
}
