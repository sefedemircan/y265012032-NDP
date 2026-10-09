import { AccountService } from "@/application/account-service";
import { ClinicService } from "@/application/clinic-service";
import { SupabaseAccountGateway } from "./account-gateway";
import { SupabaseClinicStore } from "./clinic-store";
import { createClient } from "./supabase/server";

export async function services() {
  const supabase = await createClient();
  const store = new SupabaseClinicStore(supabase);
  return {
    clinic: new ClinicService(store),
    accounts: new AccountService(store, new SupabaseAccountGateway()),
  };
}
