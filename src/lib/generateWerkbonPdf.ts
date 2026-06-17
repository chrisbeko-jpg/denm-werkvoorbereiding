import { jsPDF } from "jspdf";
import type { UploadedPhoto, WerkbonData } from "@/types/werkbon";

const MARGIN = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_BOTTOM = PAGE_HEIGHT - MARGIN;
const LINE_HEIGHT = 4.5;
const SECTION_GAP = 5;
const SECTION_TITLE_H = 9;
const BOX_PADDING = 5;
const WERKZAAMHEDEN_MAX_H = PAGE_HEIGHT * 0.5;
const MONTEUR_SECTION_H = 94;
const PHOTO_SECTION_H = 36;
const LOGO_PATH = "/denm-logo.jpg";

interface LayoutState {
  doc: jsPDF;
  y: number;
}

function newPage(state: LayoutState): void {
  state.doc.addPage();
  state.y = MARGIN;
}

function remainingSpace(state: LayoutState): number {
  return PAGE_BOTTOM - state.y;
}

function ensureSpace(state: LayoutState, needed: number): void {
  if (remainingSpace(state) < needed) {
    newPage(state);
  }
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch(LOGO_PATH);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN, y, CONTENT_WIDTH, SECTION_TITLE_H, "F");
  doc.setDrawColor(70, 70, 70);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, CONTENT_WIDTH, SECTION_TITLE_H);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(25, 25, 25);
  doc.text(title, MARGIN + 3, y + 6);
  return y + SECTION_TITLE_H + 2;
}

function measureTextBlock(doc: jsPDF, text: string, maxWidth: number, fontSize = 9): string[] {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const content = text.trim() || "";
  if (!content) return [];
  return doc.splitTextToSize(content, maxWidth - BOX_PADDING * 2);
}

function drawTextBox(
  doc: jsPDF,
  lines: string[],
  y: number,
  boxHeight: number,
  placeholder?: string
): number {
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN, y, CONTENT_WIDTH, boxHeight);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);

  if (lines.length === 0 && placeholder) {
    doc.setTextColor(140, 140, 140);
    doc.setFont("helvetica", "italic");
    doc.text(placeholder, MARGIN + BOX_PADDING, y + BOX_PADDING + 3);
  } else {
    doc.text(lines, MARGIN + BOX_PADDING, y + BOX_PADDING + 3);
  }

  return y + boxHeight;
}

function drawHeader(state: LayoutState, logoDataUrl: string | null): void {
  const { doc } = state;
  let y = MARGIN;

  if (logoDataUrl) {
    try {
      const logoH = 16;
      const logoW = 40;
      doc.addImage(logoDataUrl, "JPEG", MARGIN, y, logoW, logoH);
      y += logoH + 4;
    } catch {
      y += 2;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Werkbon / Werkvoorbereiding", MARGIN, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const dateStr = new Date().toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  doc.text(dateStr, MARGIN + CONTENT_WIDTH - doc.getTextWidth(dateStr), y + 4);

  y += 10;
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);

  state.y = y + SECTION_GAP;
}

function drawCustomerBlock(state: LayoutState, data: WerkbonData): void {
  const { doc } = state;
  let y = drawSectionTitle(doc, "Klantgegevens", state.y);

  const fields = [
    ["Naam:", data.klantNaam],
    ["Adres:", data.klantAdres],
    ["Telefoon:", data.klantTelefoon],
    ["E-mail:", data.klantEmail],
  ] as const;

  for (const [label, value] of fields) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    doc.text(label, MARGIN + 2, y + 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(value.trim() || "—", CONTENT_WIDTH - 32);
    doc.text(lines, MARGIN + 28, y + 3);
    y += Math.max(lines.length * LINE_HEIGHT, LINE_HEIGHT) + 2;
  }

  state.y = y + SECTION_GAP;
}

function drawOverflowTextSection(
  state: LayoutState,
  title: string,
  text: string,
  placeholder: string,
  maxFirstPageHeight?: number
): void {
  const { doc } = state;
  const allLines = measureTextBlock(doc, text, CONTENT_WIDTH);

  if (allLines.length === 0) {
    ensureSpace(state, SECTION_TITLE_H + 20);
    state.y = drawSectionTitle(doc, title, state.y);
    state.y = drawTextBox(state.doc, [], state.y, 16, placeholder) + SECTION_GAP;
    return;
  }

  let lineIndex = 0;
  let isFirst = true;

  while (lineIndex < allLines.length) {
    const sectionTitle = isFirst ? title : `${title} (vervolg)`;
    const titleH = SECTION_TITLE_H + 2;
    const available = isFirst && maxFirstPageHeight
      ? Math.min(remainingSpace(state) - titleH, maxFirstPageHeight)
      : remainingSpace(state) - titleH;

    const maxLines = Math.max(1, Math.floor((available - BOX_PADDING * 2) / LINE_HEIGHT));
    const chunk = allLines.slice(lineIndex, lineIndex + maxLines);
    const boxHeight = chunk.length * LINE_HEIGHT + BOX_PADDING * 2;

    ensureSpace(state, titleH + boxHeight);
    state.y = drawSectionTitle(doc, sectionTitle, state.y);
    state.y = drawTextBox(doc, chunk, state.y, boxHeight) + SECTION_GAP;

    lineIndex += chunk.length;
    isFirst = false;
  }
}

function drawPhotosSection(state: LayoutState, photos: UploadedPhoto[]): void {
  const { doc } = state;
  const sectionH = photos.length > 0 ? PHOTO_SECTION_H : 18;

  ensureSpace(state, SECTION_TITLE_H + sectionH);
  state.y = drawSectionTitle(doc, "Foto's van opname", state.y);

  if (photos.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text("Geen foto's toegevoegd", MARGIN + 3, state.y + 5);
    state.y += 14;
    return;
  }

  const gap = 2;
  const thumbW = (CONTENT_WIDTH - gap * (photos.length - 1)) / photos.length;
  const thumbH = 26;
  let x = MARGIN;

  for (const photo of photos) {
    doc.setDrawColor(160, 160, 160);
    doc.rect(x, state.y, thumbW, thumbH);
    try {
      const format = photo.dataUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(photo.dataUrl, format, x + 0.5, state.y + 0.5, thumbW - 1, thumbH - 1);
    } catch {
      doc.setFontSize(7);
      doc.text("Foto", x + thumbW / 2 - 3, state.y + thumbH / 2);
    }
    x += thumbW + gap;
  }

  state.y += thumbH + SECTION_GAP;
}

function drawFillLine(doc: jsPDF, label: string, y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text(label, MARGIN + 2, y);

  const lineStart = MARGIN + 2 + doc.getTextWidth(label) + 2;
  doc.setDrawColor(110, 110, 110);
  doc.line(lineStart, y + 0.8, MARGIN + CONTENT_WIDTH - 2, y + 0.8);
  return y + 7;
}

function drawMonteurSection(state: LayoutState): void {
  ensureSpace(state, MONTEUR_SECTION_H);
  const { doc } = state;
  let y = drawSectionTitle(doc, "In te vullen door monteur", state.y);

  y = drawFillLine(doc, "Uren besteed:", y);
  y += 1;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Extra materialen gekocht:", MARGIN + 2, y);
  y += 5;

  for (let i = 1; i <= 4; i++) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`${i}.`, MARGIN + 2, y);
    const descStart = MARGIN + 8;
    const euroLabel = "€";
    const euroX = MARGIN + CONTENT_WIDTH - 22;
    doc.line(descStart, y + 0.8, euroX - 4, y + 0.8);
    doc.text(euroLabel, euroX, y);
    doc.line(euroX + doc.getTextWidth(euroLabel) + 1, y + 0.8, MARGIN + CONTENT_WIDTH - 2, y + 0.8);
    y += 6.5;
  }

  y += 1;
  y = drawFillLine(doc, "Totaal: €", y);
  y += 4;

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Handtekeningen", MARGIN + 2, y);
  y += 6;

  for (const label of [
    "Naam klant:",
    "Handtekening klant:",
    "Naam uitvoerder:",
    "Handtekening uitvoerder:",
  ]) {
    y = drawFillLine(doc, label, y);
  }

  state.y = y;
}

function planPhotoPlacement(state: LayoutState, hasPhotos: boolean): "current" | "new-page" {
  if (!hasPhotos) return "current";

  const spaceAfterContent = remainingSpace(state);
  const needsWithMonteur = PHOTO_SECTION_H + SECTION_TITLE_H + MONTEUR_SECTION_H;

  if (spaceAfterContent >= needsWithMonteur) return "current";
  if (spaceAfterContent >= PHOTO_SECTION_H + SECTION_TITLE_H + 10) return "current";

  return "new-page";
}

function buildFilename(klantNaam: string): string {
  const date = new Date().toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const name = klantNaam.trim() || "Onbekend";
  return `Werkbon-${name}-${date}.pdf`;
}

export async function generateWerkbonPdf(
  data: WerkbonData,
  photos: UploadedPhoto[]
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logoDataUrl = await loadLogoDataUrl();
  const state: LayoutState = { doc, y: MARGIN };

  drawHeader(state, logoDataUrl);
  drawCustomerBlock(state, data);

  const werkMaxOnFirstPage = Math.min(
    WERKZAAMHEDEN_MAX_H,
    remainingSpace(state) - SECTION_TITLE_H - 30
  );
  drawOverflowTextSection(
    state,
    "Werkzaamheden / voorbereiding",
    data.werkzaamheden,
    "Geen werkzaamheden ingevuld",
    werkMaxOnFirstPage
  );

  drawOverflowTextSection(
    state,
    "Aandachtspunten / Let op!",
    data.aandachtspunten,
    "Geen aandachtspunten"
  );

  const photoPlacement = planPhotoPlacement(state, photos.length > 0);
  if (photoPlacement === "new-page") {
    newPage(state);
  }

  if (photos.length > 0) {
    drawPhotosSection(state, photos);
  }

  if (remainingSpace(state) < MONTEUR_SECTION_H) {
    newPage(state);
  }

  drawMonteurSection(state);
  doc.save(buildFilename(data.klantNaam));
}
