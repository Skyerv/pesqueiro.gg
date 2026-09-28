import Link from "next/link";
import Avatar from "./Avatar";
import Nav from "./Nav";

export default function Header({ profile }) {
  return (
    <>
      <header className="top">
        <div>
          <h1><Link href="/">Pesqueiro.GG</Link></h1>
          <p className="sub">Cada peixe conta pro seu plano de carreira.</p>
          <div className="me-row">
            {profile && (
              <Link href={`/pescador/${profile.id}`} className="me-chip">
                <Avatar profile={profile} size="sm" />
                Meu perfil
              </Link>
            )}
            <form action="/auth/sair" method="post">
              <button className="linkish" type="submit">Sair</button>
            </form>
          </div>
        </div>
        {profile && <Link href="/registrar" className="btn">Registrar peixe</Link>}
      </header>
      {profile && <Nav />}
    </>
  );
}
