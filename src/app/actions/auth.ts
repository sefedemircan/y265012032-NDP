"use server";

import { redirect } from "next/navigation";
import { homeForRole } from "@/application/roles";
import type { ActionResult } from "@/application/views";
import type { UserRole } from "@/domain/users/User";
import { services } from "@/infrastructure/services";
import { createClient } from "@/infrastructure/supabase/server";
import { assertPasswordIsPrivate, toActionError } from "@/application/guards";

export async function signIn(input: { email: string; password: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });
  if (error || !data.user) return { error: "E-posta veya parola hatalı." };

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
    if (!input.fullName.trim()) return { error: "Ad soyad boş olamaz." };
    if (input.password.length < 6) return { error: "Parola en az 6 karakter olmalıdır." };
    assertPasswordIsPrivate(input.password, [input.fullName]);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: { data: { full_name: input.fullName.trim() } },
    });
    if (error) return { error: toActionError(error) };
    if (!data.session) {
      return {
        message: "Hesap oluşturuldu. E-posta doğrulaması açıksa gelen kutunuzu kontrol edin, değilse giriş yapın.",
      };
    }
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
