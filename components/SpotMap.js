"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const BRASIL = { lat: -15.8, lng: -47.9 };

// Mapa do local da captura (OpenStreetMap, sem chave). Com onChange, a pessoa marca o ponto
// buscando o lugar, tocando no mapa ou arrastando o alfinete; sem onChange, só mostra.
// onPick(nome) avisa o nome do lugar escolhido na busca.
export default function SpotMap({ value, onChange, onPick, height = 260 }) {
  const box = useRef(null);
  const map = useRef(null);
  const pin = useRef(null);
  const L = useRef(null);
  const change = useRef(onChange);
  change.current = onChange;
  const editable = Boolean(onChange);

  useEffect(() => {
    let alive = true;
    (async () => {
      const leaflet = (await import("leaflet")).default;
      if (!alive || !box.current || map.current) return;
      L.current = leaflet;

      const start = value ?? BRASIL;
      const m = leaflet.map(box.current, {
        center: [start.lat, start.lng],
        zoom: value ? 14 : 4,
        scrollWheelZoom: editable,
        attributionControl: true,
      });
      const ruas = leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      const satelite = leaflet.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Imagens &copy; Esri" }
      );
      ruas.addTo(m);
      leaflet.control.layers({ Mapa: ruas, "Satélite": satelite }, null, { position: "topright" }).addTo(m);

      if (editable) {
        m.on("click", (e) => change.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
      }
      map.current = m;
      placePin(value);
    })();
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
      pin.current = null;
    };
    // O mapa é criado uma vez; mudanças de ponto são tratadas no efeito abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placePin(point) {
    const leaflet = L.current;
    const m = map.current;
    if (!leaflet || !m) return;
    if (!point) {
      pin.current?.remove();
      pin.current = null;
      return;
    }
    if (!pin.current) {
      const icon = leaflet.divIcon({ className: "spot-pin", html: "<span></span>", iconSize: [30, 38], iconAnchor: [15, 36] });
      pin.current = leaflet.marker([point.lat, point.lng], { icon, draggable: editable, keyboard: false }).addTo(m);
      if (editable) {
        pin.current.on("dragend", () => {
          const p = pin.current.getLatLng();
          change.current?.({ lat: p.lat, lng: p.lng });
        });
      }
    } else {
      pin.current.setLatLng([point.lat, point.lng]);
    }
  }

  useEffect(() => {
    placePin(value);
    const m = map.current;
    // Ponto fora da tela ou mapa ainda muito longe (ex.: Brasil inteiro): aproxima para o ajuste fino
    if (value && m && (m.getZoom() < 10 || !m.getBounds().contains([value.lat, value.lng]))) {
      m.setView([value.lat, value.lng], Math.max(m.getZoom(), 14));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  const mapBox = <div ref={box} className="spot-map" style={{ height }} role="application" aria-label="Mapa do local da captura" />;
  if (!editable) return mapBox;
  return (
    <>
      <PlaceSearch
        near={() => {
          const m = map.current;
          if (!m || m.getZoom() < 7) return null;
          const c = m.getCenter();
          return { lat: c.lat, lng: c.lng };
        }}
        onSelect={(r) => {
          change.current?.({ lat: r.lat, lng: r.lng });
          map.current?.setView([r.lat, r.lng], 16);
          if (r.label && r.label !== "Coordenadas") onPick?.(r.label);
        }}
      />
      {mapBox}
    </>
  );
}

// Busca de lugar pelo nome, por link do Google Maps ou por coordenadas (via /api/local)
function PlaceSearch({ near, onSelect }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState(null); // {loading} | {results} | {error}

  async function search() {
    const text = q.trim();
    if (text.length < 2) return;
    setState({ loading: true });
    const params = new URLSearchParams({ q: text });
    const c = near();
    if (c) {
      params.set("lat", c.lat.toFixed(4));
      params.set("lng", c.lng.toFixed(4));
    }
    try {
      const res = await fetch(`/api/local?${params}`);
      if (!res.ok) throw new Error();
      const { results } = await res.json();
      if (results.length === 1) {
        onSelect(results[0]);
        setState(null);
      } else {
        setState({ results });
      }
    } catch {
      setState({ error: "Não deu para buscar agora. Tente de novo ou marque tocando no mapa." });
    }
  }

  return (
    <div className="place-search">
      <div className="place-search-row">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            // Enter busca o lugar em vez de enviar o formulário do registro
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="Buscar lugar, colar link do Google Maps ou coordenadas"
          aria-label="Buscar lugar no mapa"
          enterKeyHint="search"
        />
        <button type="button" className="btn small" onClick={search} disabled={state?.loading || q.trim().length < 2}>
          {state?.loading ? "Buscando…" : "Buscar"}
        </button>
      </div>
      {state?.error && <span className="hint warn">{state.error}</span>}
      {state?.results && state.results.length === 0 && (
        <span className="hint warn">
          Não achei esse lugar. Tente o nome da cidade ou da represa, ou abra no Google Maps, toque em
          Compartilhar, copie o link e cole aqui.
        </span>
      )}
      {state?.results?.length > 1 && (
        <ul className="place-results">
          {state.results.map((r, i) => (
            <li key={`${r.lat},${r.lng},${i}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setState(null);
                }}
              >
                <b>{r.label}</b>
                {r.sub && <span>{r.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
