import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from "./constants";

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/") && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" is geen geldig afbeeldingsbestand.`;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}" is te groot (${sizeMb} MB). Maximaal ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB per foto.`;
  }

  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Kon "${file.name}" niet lezen.`));
    reader.readAsDataURL(file);
  });
}
