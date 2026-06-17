import { jsPDF } from "jspdf";
import type { UploadedPhoto, WerkbonData } from "@/types/werkbon";

const MARGIN = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_BOTTOM = PAGE_HEIGHT - MARGIN;
const LINE_HEIGHT = 4.2;
const SECTION_GAP = 3;
const SECTION_TITLE_H = 7;
const BOX_PADDING = 4;
const WERKZAAMHEDEN_MAX_H = PAGE_HEIGHT * 0.75;
const AANDACHT_MAX_H = 32;
const VAKMAN_SECTION_H = 50;
const PHOTO_SECTION_H = 28;
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
  doc.setLineWidth(0.2);
  doc.rect(MARGIN, y, CONTENT_WIDTH, SECTION_TITLE_H);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(25, 25, 25);
  doc.text(title, MARGIN + 3, y + 5);
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
  doc.setDrawColor(180, 180, 180);
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
      doc.addImage(logoDataUrl, "JPEG", MARGIN, y, 32, 12);
      y += 14;
    } catch {
      y += 2;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Werkbon / Werkvoorbereiding", MARGIN, y + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const dateStr = new Date().toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  doc.text(dateStr, MARGIN + CONTENT_WIDTH - doc.getTextWidth(dateStr), y + 3);

  y += 7;
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);

  state.y = y + SECTION_GAP;
}

function drawCustomerBlock(state: LayoutState, data: WerkbonData): void {
  const { doc } = state;
  let y = drawSectionTitle(doc, "Klantgegevens", state.y);

  const rowH = 5;
  const labelW = 20;
  const midX = MARGIN + CONTENT_WIDTH / 2;

  const drawField = (label: string, value: string, x: number, fieldY: number, maxW: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(label, x, fieldY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(value.trim() || "—", maxW - labelW);
    doc.text(lines, x + labelW, fieldY);
    return Math.max(rowH, lines.length * LINE_HEIGHT);
  };

  let h = drawField("Naam:", data.klantNaam, MARGIN + 2, y + 3, CONTENT_WIDTH - 4);
  y += h;

  h = drawField("Adres:", data.klantAdres, MARGIN + 2, y + 3, CONTENT_WIDTH - 4);
  y += h;

  drawField("Tel:", data.klantTelefoon, MARGIN + 2, y + 3, CONTENT_WIDTH / 2 - 4);
  drawField("E-mail:", data.klantEmail, midX, y + 3, CONTENT_WIDTH / 2 - 4);
  y += rowH + 1;

  state.y = y + 1;
}

function drawOverflowTextSection(
  state: LayoutState,
  title: string,
  text: string,
  placeholder: string,
  maxFirstPageHeight?: number,
  compact = false
): void {
  const { doc } = state;
  const allLines = measureTextBlock(doc, text, CONTENT_WIDTH);
  const minEmptyHeight = compact ? 10 : 14;

  if (allLines.length === 0) {
    ensureSpace(state, SECTION_TITLE_H + minEmptyHeight);
    state.y = drawSectionTitle(doc, title, state.y);
    state.y = drawTextBox(state.doc, [], state.y, minEmptyHeight, placeholder) + SECTION_GAP;
    return;
  }

  let lineIndex = 0;
  let isFirst = true;

  while (lineIndex < allLines.length) {
    const sectionTitle = isFirst ? title : `${title} (vervolg)`;
    const titleH = SECTION_TITLE_H + 2;
    let available = remainingSpace(state) - titleH;

    if (isFirst && maxFirstPageHeight) {
      available = Math.min(available, maxFirstPageHeight);
    } else if (compact && isFirst) {
      available = Math.min(available, AANDACHT_MAX_H);
    }

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

  ensureSpace(state, SECTION_TITLE_H + PHOTO_SECTION_H);
  state.y = drawSectionTitle(doc, "Foto's van opname", state.y);

  if (photos.length === 0) return;

  const gap = 2;
  const thumbW = (CONTENT_WIDTH - gap * (photos.length - 1)) / photos.length;
  const thumbH = 20;
  let x = MARGIN;

  for (const photo of photos) {
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.2);
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

function drawGridTable(
  doc: jsPDF,
  x: number,
  y: number,
  colWidths: number[],
  rowHeights: number[],
  headers: string[],
  cellRenderer?: (col: number, row: number, cellX: number, cellY: number, cellW: number, cellH: number) => void
): number {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const totalH = rowHeights.reduce((a, b) => a + b, 0);

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.2);
  doc.rect(x, y, totalW, totalH);

  let colX = x;
  for (let c = 0; c < colWidths.length - 1; c++) {
    colX += colWidths[c];
    doc.line(colX, y, colX, y + totalH);
  }

  let rowY = y;
  for (let r = 0; r < rowHeights.length - 1; r++) {
    rowY += rowHeights[r];
    doc.line(x, rowY, x + totalW, rowY);
  }

  if (headers.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);
    colX = x;
    for (let c = 0; c < headers.length; c++) {
      doc.text(headers[c], colX + 2, y + 3.5);
      colX += colWidths[c];
    }
  }

  if (cellRenderer) {
    rowY = y + rowHeights[0];
    for (let r = 1; r < rowHeights.length; r++) {
      colX = x;
      for (let c = 0; c < colWidths.length; c++) {
        cellRenderer(c, r - 1, colX, rowY, colWidths[c], rowHeights[r]);
        colX += colWidths[c];
      }
      rowY += rowHeights[r];
    }
  }

  return y + totalH;
}

function drawVakmanSection(state: LayoutState): void {
  ensureSpace(state, VAKMAN_SECTION_H);
  const { doc } = state;
  let y = drawSectionTitle(doc, "In te vullen door vakman", state.y);

  const quarterW = CONTENT_WIDTH / 4;
  y = drawGridTable(
    doc,
    MARGIN,
    y,
    [quarterW, quarterW, quarterW, quarterW],
    [5, 5, 5, 5],
    ["Datum", "Uren", "Datum", "Uren"]
  );

  y += 3;

  y = drawGridTable(
    doc,
    MARGIN,
    y,
    [CONTENT_WIDTH - 30, 30],
    [5, 5, 5, 5, 5],
    ["Omschrijving", "Bedrag"],
    (col, row, cellX, cellY) => {
      if (row === 3 && col === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(30, 30, 30);
        doc.text("Totaal", cellX + 2, cellY + 3.5);
      }
    }
  );

  y += 3;

  const sigGap = 3;
  const sigW = (CONTENT_WIDTH - sigGap) / 2;
  const sigH = 17;

  const drawSigBox = (boxX: number, title: string) => {
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    doc.rect(boxX, y, sigW, sigH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);
    doc.text(title, boxX + 2, y + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Naam", boxX + 2, y + 8.5);
    doc.line(boxX + 13, y + 9, boxX + sigW - 2, y + 9);

    doc.text("Handtekening", boxX + 2, y + 13.5);
    doc.line(boxX + 24, y + 14, boxX + sigW - 2, y + 14);
  };

  drawSigBox(MARGIN, "Klant");
  drawSigBox(MARGIN + sigW + sigGap, "Uitvoerder");

  state.y = y + sigH + 2;
}

function shouldMovePhotosToNewPage(state: LayoutState, hasPhotos: boolean): boolean {
  if (!hasPhotos) return false;
  const space = remainingSpace(state);
  return space < PHOTO_SECTION_H + SECTION_TITLE_H + 16;
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
    remainingSpace(state) - SECTION_TITLE_H - 12
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
    "Geen aandachtspunten",
    undefined,
    true
  );

  if (shouldMovePhotosToNewPage(state, photos.length > 0)) {
    newPage(state);
  }

  if (photos.length > 0) {
    drawPhotosSection(state, photos);
  }

  if (remainingSpace(state) < VAKMAN_SECTION_H) {
    newPage(state);
  }

  drawVakmanSection(state);
  doc.save(buildFilename(data.klantNaam));
}
