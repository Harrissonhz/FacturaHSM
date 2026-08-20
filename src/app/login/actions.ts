"use server";

// ---------------------------------------------------------------------
// Server Actions de autenticacion: iniciar y cerrar sesion.
// (Version con diagnostico temporal para depurar el login)
// ---------------------------------------------------------------------
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

/**
 * Inicia sesion con email + password.
 * En exito redirige al dashboard; en error devuelve el mensaje real.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contrasena." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // TEMPORAL (diagnostico): muestra el mensaje y codigo real de Supabase.
    // Aparece tanto en pantalla como en la terminal de `npm run dev`.
    console.error("LOGIN ERROR:", error.status, error.message);
    return { error: `[${error.status ?? "?"}] ${error.message}` };
  }

  // TEMPORAL (diagnostico): confirma que la sesion se creo.
  console.log("LOGIN OK:", data.user?.email, "id:", data.user?.id);

  redirect("/");
}

/** Cierra la sesion y vuelve a /login. */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
