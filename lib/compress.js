// Reduz a foto no navegador antes do envio (economiza espaço e dados móveis)
export async function compressImage(file, maxSide = 1600) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (blob) return { blob, type: "image/jpeg", ext: "jpg" };
  } catch {
    // cai para o arquivo original
  }
  const type = file.type || "image/jpeg";
  const ext = { "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[type] || "jpg";
  return { blob: file, type, ext };
}
