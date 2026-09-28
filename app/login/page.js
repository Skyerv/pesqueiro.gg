import Link from "next/link";
import { entrar, cadastrar, esqueci } from "./actions";
import PasswordField from "@/components/PasswordField";

export const metadata = { title: "Entrar | Pesqueiro.GG" };

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const modo = ["entrar", "criar", "esqueci"].includes(sp?.modo) ? sp.modo : "entrar";
  const email = typeof sp?.email === "string" ? sp.email : "";
  const erro = typeof sp?.erro === "string" ? sp.erro : null;
  const aviso = typeof sp?.aviso === "string" ? sp.aviso : null;
  const pedeConvite = Boolean((process.env.INVITE_CODE || "").trim());

  return (
    <main className="auth">
      <div className="auth-card">
        <h1>Pesqueiro.GG</h1>
        <p className="sub">Cada peixe conta pro seu plano de carreira.</p>

        {modo !== "esqueci" && (
          <nav className="tabs" aria-label="Acesso">
            <Link href="/login?modo=entrar" aria-current={modo === "entrar" ? "page" : undefined}>Entrar</Link>
            <Link href="/login?modo=criar" aria-current={modo === "criar" ? "page" : undefined}>Criar conta</Link>
          </nav>
        )}

        {erro && <p className="notice error" role="alert">{erro}</p>}
        {aviso && <p className="notice" role="status">{aviso}</p>}

        {modo === "entrar" && (
          <form action={entrar}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
            </div>
            <PasswordField id="password" label="Senha" autoComplete="current-password" />
            <button className="btn full" type="submit">Entrar</button>
            <p className="auth-foot"><Link href="/login?modo=esqueci">Esqueci minha senha</Link></p>
          </form>
        )}

        {modo === "criar" && (
          <form action={cadastrar}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
            </div>
            <PasswordField id="password" label="Senha" autoComplete="new-password" minLength={6} hint="Pelo menos 6 caracteres." />
            {pedeConvite && (
              <div className="field">
                <label htmlFor="convite">Código de convite</label>
                <input id="convite" name="convite" type="text" autoComplete="off" required />
                <span className="hint">Quem organiza a turma te passa esse código.</span>
              </div>
            )}
            <button className="btn full" type="submit">Criar conta</button>
          </form>
        )}

        {modo === "esqueci" && (
          <form action={esqueci}>
            <p className="sub" style={{ marginTop: 0 }}>Digite seu e-mail e enviamos um link para criar uma nova senha.</p>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
            </div>
            <button className="btn full" type="submit">Enviar link</button>
            <p className="auth-foot"><Link href="/login?modo=entrar">Voltar para o login</Link></p>
          </form>
        )}
      </div>
    </main>
  );
}
