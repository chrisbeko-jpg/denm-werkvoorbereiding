import Image from "next/image";

export function AppHeader() {
  return (
    <header className="mb-8 border-b border-zinc-300 bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Image
          src="/denm-logo.jpg"
          alt="DENM Stucadoorsbedrijf"
          width={160}
          height={64}
          className="h-14 w-auto object-contain sm:h-16"
          priority
        />
        <div className="text-left sm:text-right">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            Werkvoorbereiding
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Werkbon samenstellen voor monteurs
          </p>
        </div>
      </div>
    </header>
  );
}
