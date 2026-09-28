import Link from "next/link";
import { formatDate, photoUrl } from "@/lib/stats";
import DeleteCatch from "./DeleteCatch";

export default function CatchCard({ item, author, showAuthor, canDelete }) {
  const url = photoUrl(item.photo_path);
  const name = author?.nickname || "Pescador";
  return (
    <article className="catch">
      {url ? (
        <img src={url} alt={`${item.species} de ${name}`} loading="lazy" />
      ) : (
        <div className="nophoto">{item.species}</div>
      )}
      <div className="body">
        <div className="sp">
          {item.qty > 1 ? `${item.qty}× ` : ""}
          {item.species}
          {item.size_cm ? ` · ${item.size_cm} cm` : ""}
        </div>
        <div className="meta">
          {showAuthor && (
            <>
              <Link href={`/pescador/${item.user_id}`}>{name}</Link>,{" "}
            </>
          )}
          {formatDate(item.caught_on)}
        </div>
        {item.note && <p className="note">{item.note}</p>}
        {canDelete && <DeleteCatch id={item.id} photoPath={item.photo_path} />}
      </div>
    </article>
  );
}
