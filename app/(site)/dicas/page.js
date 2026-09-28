import Link from "next/link";
import Avatar from "@/components/Avatar";
import TipFilter from "@/components/TipFilter";
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
    .select("id, user_id, kind, title, body, url, photo_path, spot_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (tipo) query = query.eq("kind", tipo);
  const [{ data: tips }, { data: profiles }, { data: spots }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, nickname, avatar_path"),
    supabase.from("spots").select("id, name"),
  ]);
  const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const spotName = Object.fromEntries((spots ?? []).map((s) => [s.id, s.name]));

  return (
    <>
      <div className="tips-top">
        <TipFilter value={tipo} />
        <Link href={tipo ? `/dicas/nova?tipo=${tipo}` : "/dicas/nova"} className="btn small">+ Nova dica</Link>
      </div>
      <p className="sub tips-sub">Equipamentos, iscas, receitas e macetes da turma.</p>

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
                  {spotName[t.spot_id] && (
                    <Link href={`/locais/${t.spot_id}`} className="tip-spot">📍 {spotName[t.spot_id]}</Link>
                  )}
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
