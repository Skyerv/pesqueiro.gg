// Gera os ícones do app a partir de assets/icon.svg: node assets/make-icons.mjs
import sharp from "sharp";

const svg = "assets/icon.svg";
const out = "public/icons";
const round = (size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#fff"/></svg>`);

for (const size of [192, 512]) {
  // "any": cantos arredondados; "maskable": quadrado cheio (o Android recorta no formato dele)
  await sharp(svg).resize(size, size).composite([{ input: round(size), blend: "dest-in" }]).png().toFile(`${out}/icon-${size}.png`);
  await sharp(svg).resize(size, size).png().toFile(`${out}/maskable-${size}.png`);
}
await sharp(svg).resize(180, 180).png().toFile(`${out}/apple-touch-icon.png`);
console.log("ícones gerados em", out);
