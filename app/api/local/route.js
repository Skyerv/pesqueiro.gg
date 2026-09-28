import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Busca de lugares para o mapa do registro. Aceita:
// - coordenadas ("-23.08, -47.17");
// - link do Google Maps (inclusive os curtos maps.app.goo.gl), de onde tira o ponto;
// - nome do lugar: Google Places se houver GOOGLE_MAPS_API_KEY, senão Photon (OpenStreetMap, gratuito).
const UA = "Pesqueiro.GG/1.0 (+https://pesqueiro-gg.vercel.app)";
const GOOGLE_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.[a-z.]+)$/i;

const valid = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
const point = (lat, lng, label, sub = "") => ({ lat, lng, label, sub });

function fromCoords(q) {
  // Só com ponto decimal ("-23.08, -47.17"), para não confundir com buscas que têm números
  const m = q.match(/^\s*(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  return valid(lat, lng) ? [point(lat, lng, "Coordenadas", `${lat.toFixed(5)}, ${lng.toFixed(5)}`)] : null;
}

function coordsInUrl(url) {
  const text = decodeURIComponent(url);
  // !3d!4d é o ponto exato do lugar; @lat,lng é o centro da tela
  const patterns = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && valid(+m[1], +m[2])) return { lat: +m[1], lng: +m[2] };
  }
  return null;
}

function placeName(url) {
  const m = decodeURIComponent(url).match(/\/place\/([^/@]+)/);
  return m ? m[1].replace(/\+/g, " ").slice(0, 60) : null;
}

// Segue os redirecionamentos do link curto, só por domínios do Google
async function fromGoogleLink(q) {
  let url;
  try {
    url = new URL(q.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || !GOOGLE_HOSTS.test(url.hostname)) return null;

  for (let hop = 0; hop < 5; hop++) {
    const found = coordsInUrl(url.href);
    if (found) return [point(found.lat, found.lng, placeName(url.href) || "Local do link do Google Maps", "Link do Google Maps")];
    const res = await fetch(url.href, { redirect: "manual", headers: { "user-agent": UA } });
    const next = res.headers.get("location");
    if (!next) return []; // link sem ponto no endereço (ex.: busca genérica)
    url = new URL(next, url);
    if (!GOOGLE_HOSTS.test(url.hostname)) return [];
  }
  return [];
}

async function fromGooglePlaces(q, near) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": process.env.GOOGLE_MAPS_API_KEY,
      "x-goog-fieldmask": "places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: q,
      languageCode: "pt-BR",
      regionCode: "BR",
      pageSize: 6,
      ...(near ? { locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 50000 } } } : {}),
    }),
  });
  if (!res.ok) {
    console.error("Erro no Google Places:", res.status, await res.text().catch(() => ""));
    throw new Error("google");
  }
  const body = await res.json();
  return (body.places ?? [])
    .filter((p) => p.location)
    .map((p) => point(p.location.latitude, p.location.longitude, p.displayName?.text || q, p.formattedAddress || ""));
}

async function fromPhoton(q, near) {
  const params = new URLSearchParams({ q, limit: "6" });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lon", String(near.lng));
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error("photon");
  const body = await res.json();
  return (body.features ?? []).map((f) => {
    const p = f.properties || {};
    const [lng, lat] = f.geometry?.coordinates ?? [];
    const label = p.name || p.street || p.city || q;
    const sub = [p.street && p.name ? p.street : null, p.district, p.city, p.state].filter((x, i, a) => x && x !== label && a.indexOf(x) === i).join(", ");
    return point(lat, lng, label, sub);
  }).filter((r) => valid(r.lat, r.lng));
}

export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 500);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const lat = parseFloat(searchParams.get("lat"));
  const lng = parseFloat(searchParams.get("lng"));
  const near = valid(lat, lng) ? { lat, lng } : null;

  try {
    const coords = fromCoords(q);
    if (coords) return NextResponse.json({ results: coords, source: "coordenadas" });

    const link = await fromGoogleLink(q);
    if (link) return NextResponse.json({ results: link, source: "link" });

    if (process.env.GOOGLE_MAPS_API_KEY) {
      try {
        return NextResponse.json({ results: await fromGooglePlaces(q, near), source: "google" });
      } catch {
        // cai para o Photon
      }
    }
    return NextResponse.json({ results: await fromPhoton(q, near), source: "osm" });
  } catch {
    return NextResponse.json({ error: "falha" }, { status: 502 });
  }
}
