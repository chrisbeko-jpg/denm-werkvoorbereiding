import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const sizes = [192, 512];
const source = path.join("public", "denm-logo.jpg");
const outDir = path.join("public", "icons");

await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  await sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
}

console.log("PWA icons generated.");
