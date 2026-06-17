"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error: string | null };

/**
 * Operator login. On success `signIn` throws a redirect to /inbox (which we let
 * propagate); on bad credentials it throws an AuthError we translate to a
 * generic message — we never reveal whether the email exists.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/inbox",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Correo o contraseña incorrectos." };
    }
    // Re-throw control-flow errors (e.g. the NEXT_REDIRECT on success).
    throw error;
  }
}
