"use server";

import { redirect } from "next/navigation";
import { homeForRole } from "@/application/roles";
import type { ActionResult } from "@/application/views";
import type { UserRole } from "@/domain/users/User";
import { services } from "@/infrastructure/services";
import { createClient } from "@/infrastructure/supabase/server";
import { toActionError } from "@/application/guards";
import { isDemoAccountEmail } from "@/lib/demo-accounts";

/** Seed parolası yalnızca sunucuda tutulur; arayüze gönderilmez. */
const DEMO_PASSWORD = "Klinik123!";

export async function signIn(input: { email: string; password: string }): Promise<ActionResult> {
  return completeSignIn(input.email.trim(), input.password);
}

export async function signInAsDemo(email: string): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase();
  if (!isDemoAccountEmail(normalized)) {
    return { error: "Seçilen hesap demo listesinde değil." };
  }
  return completeSignIn(normalized, DEMO_PASSWORD);
}

async function completeSignIn(email: string, password: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return {
      error: isDemoAccountEmail(email)
        ? "Demo hesap bulunamadı. Önce npm run seed çalıştırın."
        : "E-posta veya parola hatalı.",
    };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const role = profile?.role as UserRole | undefined;
  if (!role) return { error: "Profil bulunamadı." };
  redirect(homeForRole(role));
}

export async function signUpPatient(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<ActionResult> {
  try {
    const { accounts } = await services();
    await accounts.registerPatient(input);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });
    if (error) return { message: "Hesap oluşturuldu. Giriş yapabilirsiniz." };
  } catch (error) {
    return { error: toActionError(error) };
  }
  redirect("/hasta");
}

export async function signUpManager(input: {
  fullName: string;
  email: string;
  password: string;
  facilityName: string;
  kind: "hospital" | "clinic";
}): Promise<ActionResult> {
  try {
    const { accounts } = await services();
    await accounts.registerManager(input);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });
    if (error) return { message: "Kurum oluşturuldu. Giriş yapabilirsiniz." };
  } catch (error) {
    return { error: toActionError(error) };
  }
  redirect("/yonetici");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
