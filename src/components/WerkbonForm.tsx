"use client";

import { useCallback, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { FormField } from "@/components/FormField";
import { PhotoUpload } from "@/components/PhotoUpload";
import { MAX_PHOTOS } from "@/lib/constants";
import { generateWerkbonPdf } from "@/lib/generateWerkbonPdf";
import { readFileAsDataUrl, validateImageFile } from "@/lib/imageUtils";
import type { UploadedPhoto, WerkbonData } from "@/types/werkbon";

const emptyForm: WerkbonData = {
  klantNaam: "",
  klantAdres: "",
  klantTelefoon: "",
  klantEmail: "",
  werkzaamheden: "",
  aandachtspunten: "",
};

export function WerkbonForm() {
  const [form, setForm] = useState<WerkbonData>(emptyForm);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateField = useCallback(
    <K extends keyof WerkbonData>(key: K, value: WerkbonData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleAddPhotos = useCallback(
    async (files: FileList) => {
      setPhotoError(null);
      const remaining = MAX_PHOTOS - photos.length;
      const selected = Array.from(files).slice(0, remaining);

      if (files.length > remaining) {
        setPhotoError(
          `Je kunt maximaal ${MAX_PHOTOS} foto's toevoegen. De extra foto's zijn overgeslagen.`
        );
      }

      const errors: string[] = [];
      const newPhotos: UploadedPhoto[] = [];

      for (const file of selected) {
        const validationError = validateImageFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }

        try {
          const dataUrl = await readFileAsDataUrl(file);
          newPhotos.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            dataUrl,
            name: file.name,
          });
        } catch {
          errors.push(`Kon "${file.name}" niet laden.`);
        }
      }

      if (errors.length > 0) {
        setPhotoError(errors.join(" "));
      }

      if (newPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
      }
    },
    [photos.length]
  );

  const handleRemovePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setPhotoError(null);
  }, []);

  const handleGeneratePdf = useCallback(async () => {
    setPdfError(null);

    if (!form.klantNaam.trim()) {
      setPdfError("Vul minimaal de klantnaam in voordat je de PDF downloadt.");
      return;
    }

    setIsGenerating(true);
    try {
      await generateWerkbonPdf(form, photos);
    } catch {
      setPdfError("Er ging iets mis bij het maken van de PDF. Probeer het opnieuw.");
    } finally {
      setIsGenerating(false);
    }
  }, [form, photos]);

  return (
    <div className="min-h-full bg-zinc-100">
      <AppHeader />

      <div className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleGeneratePdf();
          }}
        >
          <section className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="border-b border-zinc-200 pb-2 text-lg font-bold text-zinc-900">
              Klantgegevens
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <FormField
                  id="klantNaam"
                  label="Naam klant"
                  value={form.klantNaam}
                  onChange={(v) => updateField("klantNaam", v)}
                  placeholder="Bijv. Jan de Vries"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <FormField
                  id="klantAdres"
                  label="Adres klant"
                  value={form.klantAdres}
                  onChange={(v) => updateField("klantAdres", v)}
                  placeholder="Straat, huisnummer, postcode en plaats"
                />
              </div>
              <FormField
                id="klantTelefoon"
                label="Telefoonnummer klant"
                type="tel"
                value={form.klantTelefoon}
                onChange={(v) => updateField("klantTelefoon", v)}
                placeholder="06-12345678"
              />
              <FormField
                id="klantEmail"
                label="E-mailadres klant"
                type="email"
                value={form.klantEmail}
                onChange={(v) => updateField("klantEmail", v)}
                placeholder="klant@voorbeeld.nl"
              />
            </div>
          </section>

          <section className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="border-b border-zinc-200 pb-2 text-lg font-bold text-zinc-900">
              Werkzaamheden
            </h2>
            <FormField
              id="werkzaamheden"
              label="Welke werkzaamheden gaan wij verrichten"
              type="textarea"
              value={form.werkzaamheden}
              onChange={(v) => updateField("werkzaamheden", v)}
              placeholder="Beschrijf hier duidelijk wat de monteurs moeten voorbereiden en uitvoeren..."
              rows={8}
              large
            />
            <FormField
              id="aandachtspunten"
              label="Aandachtspunten / Let op!"
              type="textarea"
              value={form.aandachtspunten}
              onChange={(v) => updateField("aandachtspunten", v)}
              placeholder="Bijv. stroom uitschakelen, hond in tuin, slechte bereikbaarheid..."
              rows={6}
            />
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <PhotoUpload
              photos={photos}
              onAdd={handleAddPhotos}
              onRemove={handleRemovePhoto}
              error={photoError}
            />
          </section>

          {pdfError && (
            <p
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {pdfError}
            </p>
          )}

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full rounded-lg bg-zinc-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 active:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "PDF wordt gegenereerd..." : "Werkbon als PDF downloaden"}
          </button>
        </form>
      </div>
    </div>
  );
}
