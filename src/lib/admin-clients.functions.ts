import { supabase } from "@/integrations/supabase/client";

type CreateClientInput = {
  email: string;
  password: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
};

async function assertAdmin() {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw new Error("Not authenticated");
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  const isAdmin = roles?.some((r) => r.role === "admin");
  if (!isAdmin) throw new Error("Forbidden");
  return userData.user;
}

export async function createClientAccount(data: CreateClientInput) {
  await assertAdmin();
  // Full admin user creation needs the Supabase service role (server-only).
  // For this SPA build, clients should sign up from /auth.
  throw new Error(
    "Creating clients from the admin panel requires a backend API. Ask the client to sign up at /auth.",
  );
}

export async function suspendClient(input: { user_id: string; suspend: boolean }) {
  await assertAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ suspended: input.suspend })
    .eq("id", input.user_id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteClient(_input: { user_id: string }) {
  await assertAdmin();
  throw new Error("Deleting clients requires a backend API with the Supabase service role.");
}
