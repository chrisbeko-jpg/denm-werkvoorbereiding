"use client";

import { useRef } from "react";
import { MAX_PHOTOS } from "@/lib/constants";
import type { UploadedPhoto } from "@/types/werkbon";

interface PhotoUploadProps {
  photos: UploadedPhoto[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
  error: string | null;
}

export function PhotoUpload({ photos, onAdd, onRemove, error }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = MAX_PHOTOS - photos.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">
          Foto&apos;s van opname
          <span className="font-normal text-zinc-500">
            {" "}
            (max. {MAX_PHOTOS}, {photos.length}/{MAX_PHOTOS})
          </span>
        </span>
        <p className="text-xs text-zinc-500">
          Upload foto&apos;s vanaf je telefoon of computer. Max. 8 MB per foto.
        </p>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-md border border-zinc-300 bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.dataUrl}
                alt={photo.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(photo.id)}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/80 text-sm text-white transition-colors hover:bg-zinc-900"
                aria-label={`Verwijder ${photo.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={remaining > 1}
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                onAdd(e.target.files);
                e.target.value = "";
              }
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-md border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-100 active:bg-zinc-200"
          >
            + Foto toevoegen ({remaining} over)
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
