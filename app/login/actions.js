"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

function back(modo, params) {
  const q = new URLSearchParams({ modo, ...params });
  redirect(`/login?${q.toString()}`);
}

export async function entrar(formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = /confirm/i.test(error.message)
      ? "Confirme seu e-mail pelo link que enviamos antes de entrar."
      : "E-mail ou senha incorretos.";
    back("entrar", { erro: msg, email });
  }
  redirect("/");
}

export async function cadastrar(formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const invite = String(formData.get("convite") || "").trim();

  const expected = (process.env.INVITE_CODE || "").trim();
  if (expected && invite.toLowerCase() !== expected.toLowerCase()) {
    back("criar", { erro: "Código de convite incorreto. Peça para quem organiza a turma.", email });
  }
  if (password.length < 6) {
    back("criar", { erro: "A senha precisa ter pelo menos 6 caracteres.", email });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteUrl()}/auth/confirm` },
  });
  if (error) {
    back("criar", { erro: "Não deu para criar a conta. Confira o e-mail e tente de novo.", email });
  }
  // Se a confirmação de e-mail estiver desligada no Supabase, já entra direto
  if (data?.session) redirect("/perfil?novo=1");
  back("entrar", { aviso: "Conta criada. Abra o link que enviamos para o seu e-mail para ativar.", email });
}

export async function esqueci(formData) {
  const email = String(formData.get("email") || "").trim();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/redefinir-senha`,
  });
  back("entrar", { aviso: "Se esse e-mail tiver conta, você vai receber um link para criar uma nova senha.", email });
}
