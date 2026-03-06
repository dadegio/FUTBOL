export default function HeroBanner() {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/8 bg-[#1a1a1d]">
      <div className="relative h-[290px] w-full">
        <img
          src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1600&q=80"
          alt="Football hero"
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/10 to-black/30" />

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="mb-3 inline-flex rounded-full border border-[var(--accent)]/30 bg-black/35 px-3 py-1 text-sm font-medium text-[var(--accent)]">
            Matchday Experience
          </div>

          <h1 className="max-w-2xl text-4xl font-black leading-tight text-white md:text-5xl">
            Gestisci il tuo campionato con uno stile da vera football app.
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 md:text-base">
            Calendario, classifica, squadre, giocatori e statistiche in una dashboard più moderna, immersiva e ordinata.
          </p>
        </div>
      </div>
    </section>
  );
}