import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 text-[var(--foreground)]">
      <Link href="/" className="text-sm font-semibold text-[var(--accent)]">← Torna ai tornei</Link>
      <h1 className="mt-8 text-4xl font-black tracking-[-0.06em]">Privacy policy</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--muted)]">
        <p>
          Questa pagina è un modello operativo da personalizzare prima della pubblicazione commerciale dell'app.
          Inserisci titolare del trattamento, finalità, basi giuridiche, tempi di conservazione, destinatari e contatti.
        </p>
        <p>
          L'app può trattare dati collegati a utenti, squadre, giocatori, foto, risultati, statistiche, prenotazioni,
          arbitri e operazioni amministrative necessarie alla gestione del torneo.
        </p>
        <p>
          Se abiliti analytics, pubblicità o strumenti di terze parti, completa questa policy indicando i fornitori usati
          e collega anche la cookie policy.
        </p>
      </div>
    </main>
  );
}
