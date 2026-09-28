import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recebe os links de confirmação de conta e de redefinição de senha
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();
  let error = null;

  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    error = new Error("link inválido");
  }

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("erro", "Esse link expirou ou já foi usado. Peça um novo.");
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(new URL(safeNext, origin));
}
