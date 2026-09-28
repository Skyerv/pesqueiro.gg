import Link from "next/link";
import { formatDate, photoUrl } from "@/lib/stats";
import DeleteCatch from "./DeleteCatch";

export default function CatchCard({ item, author, showAuthor, canDelete }) {
  const url = photoUrl(item.photo_path);
  const name = author?.nickname || "Pescador";
  const href = `/registro/${item.id}`;
  return (
    <article className="catch">
      <Link href={href} className="catch-open" tabIndex={-1} aria-hidden="true">
        {url ? (
          <img src={url} alt="" loading="lazy" />
        ) : (
          <div className="nophoto">{item.species}</div>
        )}
      </Link>
      <div className="body">
        <Link href={href} className="sp">
          {item.qty > 1 ? `${item.qty}× ` : ""}
          {item.species}
          {item.size_cm ? ` · ${item.size_cm} cm` : ""}
        </Link>
        <div className="meta">
          {showAuthor && (
            <>
              <Link href={`/pescador/${item.user_id}`}>{name}</Link>,{" "}
            </>
          )}
          {formatDate(item.caught_on)}
        </div>
        {item.note && <p className="note">{item.note}</p>}
        {canDelete && (
          <div className="owner-actions">
            <Link href={`${href}/editar`} className="del">Editar</Link>
            <DeleteCatch id={item.id} photoPath={item.photo_path} />
          </div>
        )}
      </div>
    </article>
  );
}
