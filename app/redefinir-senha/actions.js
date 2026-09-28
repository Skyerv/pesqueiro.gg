"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function salvarSenha(formData) {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 6) redirect("/redefinir-senha?erro=A senha precisa ter pelo menos 6 caracteres.");
  if (password !== confirm) redirect("/redefinir-senha?erro=As senhas não são iguais.");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/redefinir-senha?erro=Não deu para salvar a senha. Peça um novo link.");
  redirect("/");
}
