import { salvarSenha } from "./actions";

export const metadata = { title: "Nova senha | Quadro de promoções" };

export default async function RedefinirSenha({ searchParams }) {
  const sp = await searchParams;
  const erro = typeof sp?.erro === "string" ? sp.erro : null;
  return (
    <main className="auth">
      <div className="auth-card">
        <h1>Nova senha</h1>
        <p className="sub">Escolha uma senha nova para a sua conta.</p>
        {erro && <p className="notice error" role="alert">{erro}</p>}
        <form action={salvarSenha}>
          <div className="field">
            <label htmlFor="password">Nova senha</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required />
          </div>
          <div className="field">
            <label htmlFor="confirm">Repita a senha</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={6} required />
          </div>
          <button className="btn full" type="submit">Salvar senha</button>
        </form>
      </div>
    </main>
  );
}
