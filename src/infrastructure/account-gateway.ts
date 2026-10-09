import type { AccountGateway, NewAccount, NewFacility, ProfileAssignment } from "@/application/ports";
import { createAdminClient } from "./supabase/admin";

export class SupabaseAccountGateway implements AccountGateway {
  async createConfirmedUser(input: NewAccount): Promise<string> {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Kullanıcı oluşturulamadı.");
    return data.user.id;
  }

  async deleteUser(id: string): Promise<void> {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
  }

  async assignProfile(input: ProfileAssignment): Promise<void> {
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({
        full_name: input.fullName,
        email: input.email,
        role: input.role,
        specialty: input.specialty,
        facility_id: input.facilityId,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  }

  async insertFacility(input: NewFacility): Promise<void> {
    const admin = createAdminClient();
    const { error } = await admin.from("facilities").insert({
      id: input.id,
      name: input.name,
      kind: input.kind,
      parent_id: input.parentId,
    });
    if (error) throw new Error(error.message);
  }

  async deleteFacility(id: string): Promise<void> {
    const admin = createAdminClient();
    const { error } = await admin.from("facilities").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}
