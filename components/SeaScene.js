"use client";

import { useEffect, useRef } from "react";

// Cardume decorativo da tela inicial: cada peixe nada devagar sozinho e anda mais
// conforme a página é rolada. Fica atrás do conteúdo e não recebe toques.
const FISH = [
  { top: 14, size: 54, dir: 1, idle: 14, scroll: 0.35, tone: "a", start: 0.1 },
  { top: 27, size: 32, dir: -1, idle: 22, scroll: 0.6, tone: "b", start: 0.7 },
  { top: 41, size: 72, dir: 1, idle: 9, scroll: 0.25, tone: "a", start: 0.45 },
  { top: 53, size: 28, dir: -1, idle: 26, scroll: 0.8, tone: "c", start: 0.2 },
  { top: 64, size: 46, dir: 1, idle: 17, scroll: 0.5, tone: "b", start: 0.85 },
  { top: 76, size: 36, dir: -1, idle: 20, scroll: 0.45, tone: "a", start: 0.55 },
  { top: 86, size: 60, dir: 1, idle: 12, scroll: 0.3, tone: "b", start: 0.3 },
];

const BUBBLES = [8, 19, 33, 47, 58, 71, 84, 93];

function Fish({ tone }) {
  return (
    <svg viewBox="0 0 64 32" className={`fish-body tone-${tone}`} aria-hidden="true">
      <path d="M2 16 L0 5 L13 12 Q25 2 42 4 Q58 7 63 16 Q58 25 42 28 Q25 30 13 20 L0 27 Z" />
      <path className="fin" d="M30 5 Q36 0 42 4 Z" />
      <circle className="eye" cx="51" cy="13" r="2.4" />
    </svg>
  );
}

export default function SeaScene() {
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
      FISH.forEach((f, i) => {
        const el = fish.current[i];
        if (!el) return;
        const span = w + f.size * 2;
        const travel = (f.start * span + (t * f.idle + y * f.scroll)) % span;
        const x = f.dir === 1 ? travel - f.size : w - travel;
        el.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scaleX(${f.dir})`;
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
  }, []);

  return (
    <div ref={sea} className="sea" aria-hidden="true">
      <div className="sea-tint" />
      {FISH.map((f, i) => (
        <div
          key={i}
          ref={(el) => (fish.current[i] = el)}
          className="sea-fish"
          style={{ top: `${f.top}%`, width: f.size, height: f.size / 2 }}
        >
          <div className="sea-fish-wiggle" style={{ animationDelay: `${-i * 0.7}s`, animationDuration: `${2.4 + (i % 3) * 0.6}s` }}>
            <Fish tone={f.tone} />
          </div>
        </div>
      ))}
      {BUBBLES.map((left, i) => (
        <span
          key={left}
          className="sea-bubble"
          style={{ left: `${left}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${9 + (i % 4) * 2.5}s`, width: 6 + (i % 3) * 4, height: 6 + (i % 3) * 4 }}
        />
      ))}
      <svg className="sea-waves" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path className="w1" d="M0 60 Q 180 20 360 60 T 720 60 T 1080 60 T 1440 60 V120 H0 Z" />
        <path className="w2" d="M0 75 Q 180 40 360 75 T 720 75 T 1080 75 T 1440 75 V120 H0 Z" />
        <path className="w3" d="M0 92 Q 180 64 360 92 T 720 92 T 1080 92 T 1440 92 V120 H0 Z" />
      </svg>
    </div>
  );
}
