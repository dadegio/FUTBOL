"use client";

import Link from "next/link";

export default function CookiePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 text-[var(--foreground)]">
      <Link href="/" className="text-sm font-semibold text-[var(--accent)]">← Torna ai tornei</Link>
      <h1 className="mt-8 text-4xl font-black tracking-[-0.06em]">Cookie policy</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--muted)]">
        <p>
          Questa pagina è una base da completare con l'elenco effettivo dei cookie e degli strumenti di tracciamento usati.
          I cookie tecnici servono per login, sicurezza e preferenze. Analytics e marketing vengono attivati solo se configurati
          e se l'utente presta consenso.
        </p>
        <p>
          Puoi riaprire in qualsiasi momento il pannello preferenze e modificare la scelta salvata nel browser.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("futbol-open-cookie-preferences"))}
        className="mt-8 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-black"
      >
        Gestisci preferenze cookie
      </button>
    </main>
  );
}
