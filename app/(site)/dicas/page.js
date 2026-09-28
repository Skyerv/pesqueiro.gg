import Link from "next/link";
import Avatar from "@/components/Avatar";
import { getViewer } from "@/lib/data";
import { photoUrl } from "@/lib/stats";
import { KINDS, domainOf, kindOf } from "@/lib/tips";

export const metadata = { title: "Dicas | Pesqueiro.GG" };

const dateBR = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

export default async function DicasPage({ searchParams }) {
  const { supabase, user } = await getViewer();
  const sp = await searchParams;
  const tipo = KINDS.some((k) => k.key === sp?.tipo) ? sp.tipo : null;

  let query = supabase
    .from("tips")
    .select("id, user_id, kind, title, body, url, photo_path, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (tipo) query = query.eq("kind", tipo);
  const [{ data: tips }, { data: profiles }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, nickname, avatar_path"),
  ]);
  const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return (
    <>
      <div className="tips-top">
        <p className="sub">Equipamentos, iscas, receitas e macetes da turma.</p>
        <Link href={tipo ? `/dicas/nova?tipo=${tipo}` : "/dicas/nova"} className="btn small">+ Nova dica</Link>
      </div>

      <nav className="chips" aria-label="Categorias">
        <Link href="/dicas" className="chip" aria-current={!tipo ? "true" : undefined}>Tudo</Link>
        {KINDS.map((k) => (
          <Link key={k.key} href={`/dicas?tipo=${k.key}`} className="chip" aria-current={tipo === k.key ? "true" : undefined}>
            {k.emoji} {k.label}
          </Link>
        ))}
      </nav>

      {!tips?.length ? (
        <div className="empty">
          <strong>{tipo ? `Nenhuma dica de ${kindOf(tipo).label.toLowerCase()} ainda` : "Nenhuma dica ainda"}</strong>
          Compartilhe aquele molinete, a isca que não falha ou a receita do peixe de domingo.
        </div>
      ) : (
        <ul className="tips">
          {tips.map((t) => {
            const k = kindOf(t.kind);
            const author = byId[t.user_id];
            const img = photoUrl(t.photo_path);
            return (
              <li key={t.id} className={`tip kind-${t.kind}`}>
                <Link href={`/dicas/${t.id}`} className="tip-main">
                  {img && <img src={img} alt="" loading="lazy" className="tip-thumb" />}
                  <span className="tip-kind">{k.emoji} {k.label}</span>
                  <span className="tip-title">{t.title}</span>
                  {t.body && <span className="tip-body">{t.body}</span>}
                </Link>
                <div className="tip-foot">
                  <Link href={`/pescador/${t.user_id}`} className="tip-author">
                    <Avatar profile={author ?? { nickname: "?" }} size="sm" />
                    {author?.nickname ?? "Pescador"}
                    {t.user_id === user.id && <small> (você)</small>}
                  </Link>
                  <span className="tip-date">{dateBR(t.created_at)}</span>
                  {t.url && (
                    <a href={t.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="tip-link">
                      🔗 {domainOf(t.url)}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
