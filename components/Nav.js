"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Ranking" },
  { href: "/mural", label: "Mural" },
  { href: "/locais", label: "Locais" },
  { href: "/dicas", label: "Dicas" },
  { href: "/especies", label: "Espécies" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="tabs sticky" aria-label="Seções">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path === l.href || (l.href !== "/" && path.startsWith(`${l.href}/`)) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
