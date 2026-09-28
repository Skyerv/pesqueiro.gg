import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiProvider, identifyFish } from "@/lib/ai";

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });

  if (!aiProvider()) return NextResponse.json({ error: "indisponivel" }, { status: 503 });

  let file;
  try {
    const form = await request.formData();
    file = form.get("image");
  } catch {
    return NextResponse.json({ error: "imagem" }, { status: 400 });
  }
  if (!file || typeof file === "string" || !TYPES.includes(file.type) || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "imagem" }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  try {
    return NextResponse.json(await identifyFish(file.type, data));
  } catch (err) {
    // "limite": acabou a cota (no plano gratuito do Gemini, por minuto ou por dia)
    // "ocupado": o provedor está sobrecarregado agora
    if (err.message === "limite") return NextResponse.json({ error: "limite" }, { status: 429 });
    if (err.message === "ocupado") return NextResponse.json({ error: "ocupado" }, { status: 503 });
    return NextResponse.json({ error: "falha" }, { status: 502 });
  }
}
