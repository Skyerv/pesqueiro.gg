"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Mar decorativo atrás do conteúdo, com um "ambiente" diferente em cada aba.
// Peixes e tartarugas nadam devagar sozinhos e andam mais conforme a página é rolada;
// o resto (bolhas, algas, caranguejo, águas-vivas…) é animado só com CSS.

// ---------- Nadadores (movidos pelo JS) ----------
const SHAPES = {
  classico: { ratio: 0.5, draw: ClassicFish },
  redondo: { ratio: 0.62, draw: RoundFish }, // pacu, tambaqui
  bagre: { ratio: 0.33, draw: Catfish }, // pintado, pirarara
  tartaruga: { ratio: 0.62, draw: Turtle },
};

function ClassicFish() {
  return (
    <svg viewBox="0 0 64 32">
      <path d="M2 16 L0 5 L13 12 Q25 2 42 4 Q58 7 63 16 Q58 25 42 28 Q25 30 13 20 L0 27 Z" />
      <path className="fin" d="M30 5 Q36 0 42 4 Z" />
      <circle className="eye" cx="51" cy="13" r="2.4" />
    </svg>
  );
}

function RoundFish() {
  return (
    <svg viewBox="0 0 64 40">
      <path d="M2 20 L0 8 L12 15 Q20 2 38 2 Q58 6 62 20 Q58 34 38 38 Q20 38 12 25 L0 32 Z" />
      <path className="fin" d="M26 4 Q34 -3 42 3 Z" />
      <path className="stripe" d="M30 6 Q27 20 30 34 M40 4 Q37 20 40 36" />
      <circle className="eye" cx="51" cy="15" r="2.6" />
    </svg>
  );
}

function Catfish() {
  return (
    <svg viewBox="0 0 80 26">
      <path d="M2 13 L0 3 L12 10 Q30 4 56 5 Q72 6 78 13 Q72 19 56 20 Q30 21 12 16 L0 23 Z" />
      <path className="fin" d="M34 5 Q40 0 46 5 Z" />
      <g className="spots">
        <circle cx="28" cy="10" r="1.6" /><circle cx="38" cy="14" r="1.6" /><circle cx="48" cy="9" r="1.6" /><circle cx="58" cy="13" r="1.4" />
      </g>
      <path className="whiskers" d="M77 15 q5 3 2 9 M75 16 q2 5 -2 9" />
      <circle className="eye" cx="68" cy="11" r="1.8" />
    </svg>
  );
}

function Turtle() {
  return (
    <svg viewBox="0 0 80 50">
      <path className="flipper" d="M22 16 Q10 2 2 6 Q12 14 20 22 Z M22 34 Q10 48 2 44 Q12 36 20 28 Z" />
      <path className="flipper back" d="M52 14 Q60 4 66 8 Q58 14 54 20 Z M52 36 Q60 46 66 42 Q58 36 54 30 Z" />
      <ellipse cx="38" cy="25" rx="22" ry="15" />
      <path className="shell" d="M24 25 H52 M31 13 L38 25 L31 37 M45 13 L38 25 L45 37" />
      <ellipse cx="66" cy="25" rx="9" ry="7" />
      <circle className="eye" cx="70" cy="23" r="1.6" />
    </svg>
  );
}

// f(top %, tamanho px, direção, velocidade parado, velocidade na rolagem, cor, posição inicial 0-1, formato)
const f = (top, size, dir, idle, scroll, tone, start, shape = "classico") => ({ top, size, dir, idle, scroll, tone, start, shape });

// Cardume: vários peixinhos juntos, mesma direção e velocidade
const school = (top, dir, start, n = 7, tone = "a") =>
  Array.from({ length: n }, (_, i) =>
    f(top + ((i * 37) % 9) - 4, 14 + (i % 3) * 5, dir, 16, 0.55, i % 4 === 0 ? "b" : tone, start + i * 0.018)
  );

// ---------- Ambientes de cada aba ----------
// swimmers: peixes e tartarugas; bubbles: bolhas soltas; trails: colunas de bolhinhas (posição %)
// plants: vegetação do fundo [tipo, posição %, altura px]; floor: enfeites na areia [tipo, posição %]
// crabs, jellies [left %, top %, tamanho], seahorses [left %], rays: raios de luz
const VARIANTS = {
  ranking: {
    swimmers: [
      f(12, 54, 1, 14, 0.35, "a", 0.1),
      f(24, 32, -1, 22, 0.6, "b", 0.7),
      f(36, 90, 1, 6, 0.18, "b", 0.6, "tartaruga"),
      f(46, 72, 1, 9, 0.25, "a", 0.45, "redondo"),
      f(56, 28, -1, 26, 0.8, "c", 0.2),
      f(66, 46, 1, 17, 0.5, "b", 0.85),
      ...school(76, -1, 0.3, 5),
    ],
    bubbles: 14,
    trails: [18, 72],
    plants: [["alga", 3, 110], ["capim", 9, 50], ["coral", 16, 60], ["kelp", 24, 170], ["capim", 33, 44], ["pedra", 41, 0], ["alga", 58, 90], ["coral", 66, 54], ["capim", 74, 48], ["kelp", 83, 150], ["alga", 92, 120]],
    floor: [["estrela", 12], ["concha", 47], ["estrela", 78], ["concha", 88]],
    crabs: 1,
    jellies: [[82, 18, 44], [8, 40, 32]],
    seahorses: [],
    rays: 4,
  },
  mural: {
    swimmers: [
      ...school(18, 1, 0.1),
      ...school(52, -1, 0.5, 8),
      ...school(34, 1, 0.75, 6, "c"),
      f(72, 58, 1, 10, 0.3, "b", 0.7),
      f(84, 40, -1, 14, 0.4, "c", 0.3, "redondo"),
    ],
    bubbles: 20,
    trails: [10, 38, 64, 90],
    plants: [["capim", 2, 46], ["alga", 8, 100], ["kelp", 20, 160], ["capim", 30, 52], ["coral", 44, 58], ["alga", 55, 110], ["pedra", 63, 0], ["capim", 70, 40], ["kelp", 86, 180], ["alga", 95, 90]],
    floor: [["concha", 25], ["estrela", 50], ["concha", 80]],
    crabs: 1,
    jellies: [[90, 30, 30]],
    seahorses: [48],
    rays: 3,
  },
  especies: {
    swimmers: [
      f(12, 86, 1, 10, 0.3, "a", 0.2, "bagre"),
      f(24, 56, -1, 13, 0.45, "b", 0.6, "redondo"),
      f(34, 100, 1, 5, 0.15, "b", 0.4, "tartaruga"),
      f(44, 34, 1, 22, 0.7, "c", 0.4),
      f(55, 96, -1, 8, 0.25, "b", 0.1, "bagre"),
      f(66, 46, 1, 15, 0.5, "a", 0.8, "redondo"),
      f(76, 30, -1, 24, 0.75, "c", 0.5),
      ...school(84, 1, 0.9, 5),
    ],
    bubbles: 12,
    trails: [30, 80],
    plants: [["alga", 2, 120], ["coral", 9, 64], ["kelp", 15, 190], ["capim", 22, 48], ["pedra", 29, 0], ["coral", 36, 50], ["alga", 45, 100], ["capim", 53, 44], ["kelp", 61, 160], ["coral", 70, 70], ["alga", 78, 110], ["capim", 86, 52], ["kelp", 94, 170]],
    floor: [["estrela", 6], ["concha", 33], ["estrela", 57], ["concha", 74], ["estrela", 90]],
    crabs: 2,
    jellies: [[76, 20, 40], [18, 58, 28]],
    seahorses: [26, 66],
    rays: 4,
  },
  sugestoes: {
    swimmers: [
      f(20, 44, 1, 7, 0.2, "a", 0.3),
      f(38, 80, -1, 4, 0.12, "b", 0.2, "tartaruga"),
      f(54, 60, -1, 5, 0.15, "b", 0.6, "redondo"),
      f(74, 36, 1, 9, 0.25, "a", 0.1),
    ],
    bubbles: 12,
    trails: [22, 58, 86],
    plants: [["kelp", 2, 200], ["alga", 7, 130], ["capim", 13, 56], ["kelp", 19, 180], ["alga", 26, 110], ["capim", 33, 50], ["coral", 40, 56], ["alga", 48, 120], ["kelp", 55, 210], ["capim", 62, 46], ["alga", 69, 100], ["kelp", 76, 170], ["coral", 83, 62], ["alga", 90, 130], ["capim", 96, 50]],
    floor: [["concha", 16], ["estrela", 44], ["concha", 72]],
    crabs: 1,
    jellies: [[70, 26, 36]],
    seahorses: [30, 80],
    rays: 5,
  },
  pescador: {
    swimmers: [
      f(16, 110, 1, 6, 0.2, "a", 0.3, "bagre"),
      f(32, 120, -1, 4, 0.12, "b", 0.8, "tartaruga"),
      f(46, 80, -1, 7, 0.22, "b", 0.7, "redondo"),
      f(62, 64, 1, 9, 0.3, "a", 0.1),
      f(80, 120, -1, 5, 0.18, "b", 0.5, "bagre"),
    ],
    bubbles: 10,
    trails: [40],
    plants: [["kelp", 4, 220], ["pedra", 12, 0], ["alga", 20, 90], ["coral", 32, 48], ["kelp", 70, 200], ["pedra", 80, 0], ["alga", 90, 100]],
    floor: [["concha", 26], ["estrela", 60]],
    crabs: 1,
    jellies: [[14, 22, 46], [84, 44, 38], [60, 12, 28]],
    seahorses: [],
    rays: 2,
    deep: true,
  },
  dicas: {
    swimmers: [
      ...school(20, -1, 0.2, 6, "c"),
      f(34, 58, 1, 11, 0.35, "b", 0.5, "redondo"),
      f(50, 90, -1, 6, 0.2, "a", 0.8, "tartaruga"),
      f(66, 80, 1, 9, 0.3, "b", 0.1, "bagre"),
      f(80, 34, -1, 20, 0.6, "a", 0.4),
    ],
    bubbles: 14,
    trails: [24, 70],
    plants: [["coral", 4, 60], ["capim", 11, 50], ["alga", 19, 110], ["pedra", 27, 0], ["kelp", 35, 170], ["coral", 58, 54], ["capim", 66, 46], ["alga", 75, 100], ["kelp", 86, 160], ["coral", 94, 58]],
    floor: [["concha", 15], ["estrela", 40], ["concha", 62], ["estrela", 82]],
    crabs: 2,
    jellies: [[86, 24, 34]],
    seahorses: [48],
    rays: 3,
  },
  calmo: {
    swimmers: [f(18, 40, 1, 9, 0.25, "a", 0.2), f(40, 30, -1, 12, 0.35, "b", 0.6), f(62, 70, 1, 5, 0.15, "b", 0.4, "tartaruga"), f(78, 52, 1, 7, 0.2, "a", 0.8, "redondo")],
    bubbles: 12,
    trails: [15, 85],
    plants: [["alga", 3, 110], ["capim", 10, 48], ["kelp", 18, 160], ["coral", 28, 52], ["capim", 72, 50], ["kelp", 80, 170], ["alga", 88, 100], ["capim", 95, 44]],
    floor: [["estrela", 22], ["concha", 76]],
    crabs: 1,
    jellies: [[88, 30, 30]],
    seahorses: [8],
    rays: 3,
  },
};

function variantFor(path) {
  if (path === "/") return "ranking";
  if (path.startsWith("/mural")) return "mural";
  if (path.startsWith("/especies")) return "especies";
  if (path.startsWith("/dicas")) return "dicas";
  if (path.startsWith("/sugestoes")) return "sugestoes";
  if (path.startsWith("/pescador")) return "pescador";
  return "calmo";
}

// ---------- Fundo: plantas, enfeites e bichos animados com CSS ----------
function Plant({ kind, left, height, i }) {
  const style = { left: `${left}%`, animationDelay: `${-i * 0.9}s` };
  if (kind === "pedra") {
    return (
      <svg className="sea-rock" viewBox="0 0 90 40" style={{ left: `${left}%` }}>
        <path d="M4 40 Q2 22 20 16 Q30 4 48 10 Q70 6 80 22 Q90 30 86 40 Z" />
        <path className="moss" d="M20 16 Q30 10 40 12" />
      </svg>
    );
  }
  if (kind === "coral") {
    return (
      <svg className="sea-coral" viewBox="0 0 60 70" style={{ ...style, height }}>
        <path d="M30 70 V40 M30 50 Q18 44 16 28 M16 34 Q8 30 8 18 M30 44 Q44 38 44 22 M44 30 Q54 26 52 12 M30 40 Q28 26 32 10" />
      </svg>
    );
  }
  if (kind === "capim") {
    return (
      <svg className="sea-grass" viewBox="0 0 40 60" preserveAspectRatio="none" style={{ ...style, height }}>
        <path d="M20 60 Q16 30 6 8 M20 60 Q20 28 18 0 M20 60 Q24 34 34 10 M20 60 Q12 40 2 30 M20 60 Q28 42 38 32" />
      </svg>
    );
  }
  if (kind === "kelp") {
    return (
      <svg className="sea-kelp" viewBox="0 0 30 200" preserveAspectRatio="none" style={{ ...style, height }}>
        <path d="M15 200 C 4 170, 26 150, 14 120 S 26 70, 14 40 S 20 10, 15 0" />
        <path className="leaf" d="M14 150 q-12 -4 -13 -16 q10 4 13 12 Z M16 110 q12 -4 13 -16 q-10 4 -13 12 Z M14 70 q-12 -4 -13 -16 q10 4 13 12 Z M16 36 q10 -3 11 -13 q-8 3 -11 10 Z" />
      </svg>
    );
  }
  return (
    <svg className="sea-weed" viewBox="0 0 30 120" preserveAspectRatio="none" style={{ ...style, height }}>
      <path d="M15 120 C 5 95, 25 80, 13 58 S 22 25, 15 0" />
      <path className="leaf" d="M14 80 q-11 -6 -12 -18 q9 5 12 14 Z M16 50 q11 -5 12 -17 q-9 5 -12 13 Z" />
    </svg>
  );
}

function FloorThing({ kind, left }) {
  if (kind === "estrela") {
    return (
      <svg className="sea-star" viewBox="0 0 40 40" style={{ left: `${left}%` }}>
        <path d="M20 2 L25 15 L38 15 L27.5 23 L31.5 37 L20 28.5 L8.5 37 L12.5 23 L2 15 L15 15 Z" />
      </svg>
    );
  }
  return (
    <svg className="sea-shell" viewBox="0 0 40 30" style={{ left: `${left}%` }}>
      <path d="M20 28 L4 12 Q20 -6 36 12 Z" />
      <path className="ridge" d="M20 28 L12 6 M20 28 L20 2 M20 28 L28 6" />
    </svg>
  );
}

function Crab({ i }) {
  return (
    <div className="sea-crab" style={{ animationDelay: `${-i * 17}s`, animationDuration: `${38 + i * 9}s` }}>
      <svg viewBox="0 0 60 36" className="crab-body">
        <g className="legs">
          <path d="M16 22 L4 30 M18 25 L8 34 M44 22 L56 30 M42 25 L52 34" />
        </g>
        <path className="claw" d="M12 14 Q2 10 4 2 Q10 6 12 2 Q16 8 14 14 Z M48 14 Q58 10 56 2 Q50 6 48 2 Q44 8 46 14 Z" />
        <ellipse cx="30" cy="20" rx="17" ry="10" />
        <path className="eyestalk" d="M25 11 V5 M35 11 V5" />
        <circle className="eye" cx="25" cy="4" r="2" />
        <circle className="eye" cx="35" cy="4" r="2" />
      </svg>
    </div>
  );
}

function Jelly({ left, top, size, i }) {
  return (
    <div className="sea-jelly" style={{ left: `${left}%`, top: `${top}%`, width: size, animationDelay: `${-i * 4}s` }}>
      <svg viewBox="0 0 40 60" className="jelly-body" style={{ animationDelay: `${-i * 0.5}s` }}>
        <path className="bell" d="M2 22 Q2 2 20 2 Q38 2 38 22 Q30 19 20 22 Q10 19 2 22 Z" />
        <path className="tentacles" d="M8 22 q-3 10 1 18 t-1 18 M16 22 q3 10 -1 18 t1 16 M24 22 q-3 10 1 18 t-1 18 M32 22 q3 10 -1 18 t1 14" />
      </svg>
    </div>
  );
}

function Seahorse({ left, i }) {
  return (
    <svg className="sea-horse" viewBox="0 0 30 60" style={{ left: `${left}%`, animationDelay: `${-i * 1.3}s` }}>
      <path d="M16 4 Q24 2 26 8 L20 10 Q24 16 20 24 Q14 32 18 40 Q22 50 14 56 Q8 58 10 52 Q14 50 12 44 Q6 34 12 24 Q14 16 12 10 Q12 5 16 4 Z" />
      <path className="fin" d="M18 28 Q24 30 22 36 Q18 34 18 28 Z" />
      <circle className="eye" cx="18" cy="8" r="1.4" />
    </svg>
  );
}

const BUBBLE_SPOTS = [8, 19, 33, 47, 58, 71, 84, 93, 26, 64, 12, 78, 40, 52, 5, 88, 30, 68, 97, 44];

function Sea({ name }) {
  const v = VARIANTS[name];
  const sea = useRef(null);
  const swimmers = useRef([]);

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
      v.swimmers.forEach((p, i) => {
        const el = swimmers.current[i];
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

      {Array.from({ length: v.rays }, (_, i) => (
        <span
          key={i}
          className="sea-ray"
          style={{ left: `${8 + i * (84 / Math.max(1, v.rays - 1))}%`, animationDelay: `${-i * 2.3}s`, width: 40 + (i % 3) * 30 }}
        />
      ))}

      {v.jellies.map(([left, top, size], i) => (
        <Jelly key={`j${i}`} left={left} top={top} size={size} i={i} />
      ))}

      {v.swimmers.map((p, i) => {
        const Draw = SHAPES[p.shape].draw;
        return (
          <div
            key={i}
            ref={(el) => (swimmers.current[i] = el)}
            className={`sea-fish ${p.shape}`}
            style={{ top: `${p.top}%`, width: p.size, height: p.size * SHAPES[p.shape].ratio }}
          >
            <div
              className="sea-fish-wiggle"
              style={{ animationDelay: `${-i * 0.7}s`, animationDuration: `${p.shape === "tartaruga" ? 4.5 : 2.4 + (i % 3) * 0.6}s` }}
            >
              <div className={`fish-body tone-${p.tone}`}>
                <Draw />
              </div>
            </div>
          </div>
        );
      })}

      {BUBBLE_SPOTS.slice(0, v.bubbles).map((left, i) => (
        <span
          key={`b${left}`}
          className="sea-bubble"
          style={{ left: `${left}%`, animationDelay: `${-i * 1.3}s`, animationDuration: `${8 + (i % 5) * 2.2}s`, width: 5 + (i % 4) * 4, height: 5 + (i % 4) * 4 }}
        />
      ))}
      {v.trails.map((left) =>
        [0, 1, 2, 3].map((k) => (
          <span
            key={`t${left}-${k}`}
            className="sea-bubble trail"
            style={{ left: `calc(${left}% + ${(k % 2) * 6}px)`, animationDelay: `${-k * 0.55 - left / 10}s`, width: 4 + k, height: 4 + k }}
          />
        ))
      )}

      <svg className="sea-waves" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path className="w1" d="M0 60 Q 180 20 360 60 T 720 60 T 1080 60 T 1440 60 V120 H0 Z" />
        <path className="w2" d="M0 75 Q 180 40 360 75 T 720 75 T 1080 75 T 1440 75 V120 H0 Z" />
        <path className="w3" d="M0 92 Q 180 64 360 92 T 720 92 T 1080 92 T 1440 92 V120 H0 Z" />
      </svg>

      <div className="sea-floor">
        <svg className="sea-sand" viewBox="0 0 1440 40" preserveAspectRatio="none">
          <path d="M0 18 Q 120 6 240 16 T 480 14 T 720 18 T 960 12 T 1200 17 T 1440 14 V40 H0 Z" />
          <g className="pebbles">
            <ellipse cx="90" cy="26" rx="6" ry="3" /><ellipse cx="330" cy="30" rx="4" ry="2" /><ellipse cx="610" cy="27" rx="7" ry="3" />
            <ellipse cx="870" cy="31" rx="5" ry="2" /><ellipse cx="1120" cy="26" rx="6" ry="3" /><ellipse cx="1350" cy="30" rx="4" ry="2" />
          </g>
        </svg>
        {v.plants.map(([kind, left, height], i) => (
          <Plant key={`p${i}`} kind={kind} left={left} height={height} i={i} />
        ))}
        {v.floor.map(([kind, left], i) => (
          <FloorThing key={`f${i}`} kind={kind} left={left} />
        ))}
        {v.seahorses.map((left, i) => (
          <Seahorse key={`h${i}`} left={left} i={i} />
        ))}
        {Array.from({ length: v.crabs }, (_, i) => (
          <Crab key={`c${i}`} i={i} />
        ))}
      </div>
    </div>
  );
}

export default function SeaScene() {
  const name = variantFor(usePathname() || "/");
  // key: troca de aba monta o ambiente novo do zero (com a transição de entrada)
  return <Sea key={name} name={name} />;
}
