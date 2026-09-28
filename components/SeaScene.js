"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Mar decorativo atrás do conteúdo, com um "ambiente" diferente em cada aba.
// Cada peixe nada devagar sozinho e anda mais conforme a página é rolada.

// Formatos de peixe: viewBox, proporção (altura/largura) e desenho
const SHAPES = {
  classico: {
    box: "0 0 64 32",
    ratio: 0.5,
    body: "M2 16 L0 5 L13 12 Q25 2 42 4 Q58 7 63 16 Q58 25 42 28 Q25 30 13 20 L0 27 Z",
    fin: "M30 5 Q36 0 42 4 Z",
    eye: [51, 13, 2.4],
  },
  redondo: {
    // pacu, tambaqui
    box: "0 0 64 40",
    ratio: 0.62,
    body: "M2 20 L0 8 L12 15 Q20 2 38 2 Q58 6 62 20 Q58 34 38 38 Q20 38 12 25 L0 32 Z",
    fin: "M26 4 Q34 -3 42 3 Z",
    eye: [51, 15, 2.6],
  },
  bagre: {
    // pintado, pirarara: comprido, achatado e com bigodes
    box: "0 0 80 26",
    ratio: 0.33,
    body: "M2 13 L0 3 L12 10 Q30 4 56 5 Q72 6 78 13 Q72 19 56 20 Q30 21 12 16 L0 23 Z",
    fin: "M34 5 Q40 0 46 5 Z",
    eye: [68, 11, 1.8],
    whiskers: "M77 15 q5 3 2 9 M75 16 q2 5 -2 9",
  },
};

// f(top %, tamanho px, direção, velocidade parado, velocidade na rolagem, cor, posição inicial 0-1, formato)
const f = (top, size, dir, idle, scroll, tone, start, shape = "classico") => ({ top, size, dir, idle, scroll, tone, start, shape });

// Cardume: vários peixinhos juntos, mesma direção e velocidade
const school = (top, dir, start, n = 7) =>
  Array.from({ length: n }, (_, i) =>
    f(top + ((i * 37) % 9) - 4, 16 + (i % 3) * 5, dir, 16, 0.55, i % 4 === 0 ? "b" : "a", start + i * 0.018)
  );

const VARIANTS = {
  ranking: {
    fish: [
      f(14, 54, 1, 14, 0.35, "a", 0.1),
      f(27, 32, -1, 22, 0.6, "b", 0.7),
      f(41, 72, 1, 9, 0.25, "a", 0.45, "redondo"),
      f(53, 28, -1, 26, 0.8, "c", 0.2),
      f(64, 46, 1, 17, 0.5, "b", 0.85),
      f(76, 36, -1, 20, 0.45, "a", 0.55),
      f(86, 60, 1, 12, 0.3, "b", 0.3),
    ],
    bubbles: 8,
    weeds: 0,
  },
  mural: {
    fish: [...school(22, 1, 0.1), ...school(58, -1, 0.5, 8), f(80, 58, 1, 10, 0.3, "b", 0.7), f(38, 40, -1, 14, 0.4, "c", 0.3)],
    bubbles: 12,
    weeds: 2,
  },
  especies: {
    fish: [
      f(16, 86, 1, 10, 0.3, "a", 0.2, "bagre"),
      f(30, 56, -1, 13, 0.45, "b", 0.6, "redondo"),
      f(44, 34, 1, 22, 0.7, "c", 0.4),
      f(57, 96, -1, 8, 0.25, "b", 0.1, "bagre"),
      f(70, 46, 1, 15, 0.5, "a", 0.8, "redondo"),
      f(84, 30, -1, 24, 0.75, "c", 0.5),
    ],
    bubbles: 6,
    weeds: 6,
  },
  sugestoes: {
    fish: [f(24, 44, 1, 7, 0.2, "a", 0.3), f(52, 60, -1, 5, 0.15, "b", 0.6, "redondo"), f(78, 36, 1, 9, 0.25, "a", 0.1)],
    bubbles: 5,
    weeds: 8,
  },
  pescador: {
    fish: [
      f(18, 110, 1, 6, 0.2, "a", 0.3, "bagre"),
      f(38, 80, -1, 7, 0.22, "b", 0.7, "redondo"),
      f(60, 64, 1, 9, 0.3, "a", 0.1),
      f(80, 120, -1, 5, 0.18, "b", 0.5, "bagre"),
    ],
    bubbles: 7,
    weeds: 3,
    deep: true,
  },
  calmo: {
    fish: [f(20, 40, 1, 9, 0.25, "a", 0.2), f(48, 30, -1, 12, 0.35, "b", 0.6), f(74, 52, 1, 7, 0.2, "a", 0.8, "redondo")],
    bubbles: 5,
    weeds: 3,
  },
};

function variantFor(path) {
  if (path === "/") return "ranking";
  if (path.startsWith("/mural")) return "mural";
  if (path.startsWith("/especies")) return "especies";
  if (path.startsWith("/sugestoes")) return "sugestoes";
  if (path.startsWith("/pescador")) return "pescador";
  return "calmo";
}

function Fish({ tone, shape }) {
  const s = SHAPES[shape];
  return (
    <svg viewBox={s.box} className={`fish-body tone-${tone}`} aria-hidden="true">
      <path d={s.body} />
      <path className="fin" d={s.fin} />
      {s.whiskers && <path className="whiskers" d={s.whiskers} />}
      <circle className="eye" cx={s.eye[0]} cy={s.eye[1]} r={s.eye[2]} />
    </svg>
  );
}

const BUBBLE_SPOTS = [8, 19, 33, 47, 58, 71, 84, 93, 26, 64, 12, 78];
const WEED_SPOTS = [4, 13, 27, 38, 52, 66, 79, 91];

function Sea({ name }) {
  const v = VARIANTS[name];
  const sea = useRef(null);
  const fish = useRef([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let running = true;
    const t0 = performance.now();

    function place(now) {
      const w = window.innerWidth;
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      sea.current?.style.setProperty("--depth", Math.min(1, y / max).toFixed(3));
      const t = reduce ? 0 : (now - t0) / 1000;
      v.fish.forEach((p, i) => {
        const el = fish.current[i];
        if (!el) return;
        const span = w + p.size * 2;
        const travel = (p.start * span + (t * p.idle + y * p.scroll)) % span;
        const x = p.dir === 1 ? travel - p.size : w - travel;
        el.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scaleX(${p.dir})`;
      });
    }

    function loop(now) {
      if (!running) return;
      place(now);
      frame = requestAnimationFrame(loop);
    }

    if (reduce) {
      // Sem animação contínua: só reposiciona quando a página rola
      const onScroll = () => place(performance.now());
      place(performance.now());
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }

    const onVisibility = () => {
      running = !document.hidden;
      if (running) frame = requestAnimationFrame(loop);
      else cancelAnimationFrame(frame);
    };
    frame = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [v]);

  return (
    <div ref={sea} className={`sea sea--${name}${v.deep ? " deep" : ""}`} aria-hidden="true">
      <div className="sea-tint" />
      {v.fish.map((p, i) => (
        <div
          key={i}
          ref={(el) => (fish.current[i] = el)}
          className="sea-fish"
          style={{ top: `${p.top}%`, width: p.size, height: p.size * SHAPES[p.shape].ratio }}
        >
          <div className="sea-fish-wiggle" style={{ animationDelay: `${-i * 0.7}s`, animationDuration: `${2.4 + (i % 3) * 0.6}s` }}>
            <Fish tone={p.tone} shape={p.shape} />
          </div>
        </div>
      ))}
      {BUBBLE_SPOTS.slice(0, v.bubbles).map((left, i) => (
        <span
          key={left}
          className="sea-bubble"
          style={{ left: `${left}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${9 + (i % 4) * 2.5}s`, width: 6 + (i % 3) * 4, height: 6 + (i % 3) * 4 }}
        />
      ))}
      {WEED_SPOTS.slice(0, v.weeds).map((left, i) => (
        <svg
          key={left}
          className="sea-weed"
          viewBox="0 0 30 120"
          preserveAspectRatio="none"
          style={{ left: `${left}%`, height: 70 + ((i * 29) % 70), animationDelay: `${-i * 0.9}s` }}
        >
          <path d="M15 120 C 5 95, 25 80, 13 58 S 22 25, 15 0" />
          <path className="leaf" d="M14 80 q-11 -6 -12 -18 q9 5 12 14 Z M16 50 q11 -5 12 -17 q-9 5 -12 13 Z" />
        </svg>
      ))}
      <svg className="sea-waves" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path className="w1" d="M0 60 Q 180 20 360 60 T 720 60 T 1080 60 T 1440 60 V120 H0 Z" />
        <path className="w2" d="M0 75 Q 180 40 360 75 T 720 75 T 1080 75 T 1440 75 V120 H0 Z" />
        <path className="w3" d="M0 92 Q 180 64 360 92 T 720 92 T 1080 92 T 1440 92 V120 H0 Z" />
      </svg>
    </div>
  );
}

export default function SeaScene() {
  const name = variantFor(usePathname() || "/");
  // key: troca de aba monta o ambiente novo do zero (com a transição de entrada)
  return <Sea key={name} name={name} />;
}
