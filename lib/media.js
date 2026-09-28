// Regras das fotos e vídeos extras de um registro
export const MAX_EXTRA = 8;
export const MAX_VIDEO_MB = 50; // limite de arquivo do plano gratuito do Supabase
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp"];

const EXT = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/3gpp": "3gp" };

export function mediaKind(file) {
  const type = file.type || "";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  // Alguns celulares não informam o tipo: decide pela extensão
  const ext = file.name?.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "3gp"].includes(ext)) return "video";
  return null;
}

export function videoExt(file) {
  if (EXT[file.type]) return EXT[file.type];
  const ext = file.name?.split(".").pop()?.toLowerCase();
  return ext === "mov" ? "mov" : ext === "webm" ? "webm" : ext === "3gp" ? "3gp" : "mp4";
}

export function mapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function videoType(file) {
  if (file.type) return file.type;
  return Object.keys(EXT).find((t) => EXT[t] === videoExt(file)) ?? "video/mp4";
}
