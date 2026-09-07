# Architettura modulare

Il progetto resta un monolite Next.js, ma da questa versione viene orientato a un pattern **modular monolith**: un solo deploy, un solo database, ma confini chiari tra domini.

## Regola principale

`src/app` deve contenere routing, pagine e API route sottili. La logica riutilizzabile va spostata progressivamente in `src/modules`.

```text
src/
  app/              # routing Next.js e composizione pagine/API
  modules/          # domini applicativi
  shared/           # futuri helper cross-domain
  generated/        # Prisma client generato
lib/                # compatibilità temporanea con il codice esistente
```

## Moduli introdotti

```text
src/modules/auth/          # sessione server
src/modules/permissions/   # permessi e guardie server
src/modules/bookings/      # regole finestra prenotazioni
src/modules/fields/        # regole campi e slot
src/modules/referees/      # disponibilità, conflitti, ribilanciamento
src/modules/core/          # helper API/errori comuni
```

## Compatibilità

I file in `lib/` non vengono rimossi: diventano wrapper che riesportano i nuovi moduli. Questo permette di refactorare una parte alla volta senza rompere tutte le importazioni esistenti.

## Direzione per le prossime versioni

1. rendere le API route sempre più sottili;
2. spostare i casi d'uso in `modules/*/application`;
3. spostare le regole pure in `modules/*/domain`;
4. centralizzare tutti i controlli ruolo/permesso in `modules/permissions`;
5. aggiungere audit log e test sulle regole pure.

## V20 - Application Services

Da V20 le API route devono diventare principalmente adapter HTTP: leggono parametri/body, chiamano un caso d'uso e traducono il risultato in JSON.

```text
src/modules/<dominio>/
  domain/          # validazioni e regole pure
  application/     # casi d'uso con Prisma, permessi già verificati dalle route o dal service
```

Primi casi d'uso estratti:

```text
src/modules/matches/application/
  match-scheduling.ts      # prenotazione slot, liberazione slot, cambio data
  match-officials.ts       # stato arbitri e override manuale
  save-match-result.ts     # salvataggio risultato, distinta, statistiche e sync playoff

src/modules/sponsors/
  domain/sponsor-input.ts
  application/sponsor-service.ts

src/modules/media/
  domain/media-input.ts
  application/media-service.ts
```

Le route interessate restano compatibili con gli endpoint esistenti, ma non contengono più la logica principale del dominio. Le prossime feature dovrebbero seguire questo schema invece di aggiungere ulteriore business logic dentro `src/app/api`.

## V21 - Presentation layer split

La cartella `src/app` deve restare il più possibile uno strato di routing Next.js. Le pagine e i componenti più legati al dominio vengono spostati in `src/modules/*/presentation`, mentre i file in `src/app` diventano wrapper sottili.

Esempi:

```txt
src/app/leagues/[leagueId]/media/page.tsx
  -> importa src/modules/media/presentation/MediaCenterPage.tsx

src/app/leagues/[leagueId]/creator/page.tsx
  -> importa src/modules/media/presentation/CreatorStudioPage.tsx

src/app/leagues/[leagueId]/sponsors/page.tsx
  -> importa src/modules/sponsors/presentation/SponsorsPage.tsx
```

Regola pratica per le prossime feature:

- `src/app/**/page.tsx`: routing, params, composizione minima.
- `src/app/api/**/route.ts`: request/response, parsing minimale, chiamata a un application service.
- `src/modules/*/domain`: regole pure.
- `src/modules/*/application`: casi d'uso e orchestrazione.
- `src/modules/*/presentation`: componenti React e pagine di dominio.

Questo mantiene il monolite semplice da deployare, ma impedisce che ogni nuova feature finisca direttamente nelle route Next.js.

## Roadmap architetturale successiva

La prossima estrazione dovrebbe riguardare le pagine ancora grandi:

- `calendar/page.tsx` -> `src/modules/matches/presentation`;
- `teams/[teamId]/page.tsx` -> `src/modules/teams/presentation`;
- `matches/[matchId]/result-form.tsx` -> `src/modules/matches/presentation`;
- statistiche interne -> componenti più piccoli dentro `src/modules/stats/presentation`.

Solo dopo questo passaggio conviene iniziare il lavoro prestazionale più serio: cache lato server, loading states più granulari, lazy loading dei manager admin e ottimizzazione delle query Prisma.

## V22 - Match, team e player page split

Da V22 anche le pagine operative più grandi vengono estratte dal routing Next.js e spostate nel presentation layer dei rispettivi domini.

```txt
src/modules/matches/presentation/
  CalendarPage.tsx
  MatchPage.tsx
  MatchResultForm.tsx

src/modules/teams/presentation/
  TeamsPage.tsx
  TeamDetailPage.tsx

src/modules/players/presentation/
  PlayersPage.tsx
  PlayerDetailPage.tsx
```

I file in `src/app/leagues/[leagueId]/...` restano come wrapper minimi. Questo riduce il rischio che il routing Next.js diventi il punto in cui finiscono insieme UI, stato React, business logic e chiamate API.

Regola pratica da V22 in poi:

- una pagina di dominio complessa nasce in `src/modules/<dominio>/presentation`;
- `src/app` espone solo la route pubblica;
- i vecchi file wrapper possono restare finché non viene completato il refactor dell'intera area;
- le future ottimizzazioni performance vanno applicate nei moduli, non direttamente nelle route.

## V23 — Performance Layer

La V23 introduce una regola pratica: le ottimizzazioni devono migliorare la velocità percepita senza mischiare nuovamente routing, logica di dominio e componenti UI.

### Principi

- Le pagine in `src/app` possono avere `loading.tsx` dedicati, ma la UI riutilizzabile del caricamento resta in `src/modules/core/presentation`.
- Le fetch client molto ripetute e poco sensibili, come le impostazioni pubbliche del torneo, passano da `cachedJson()` in `src/modules/core/client-cache.ts`.
- I dati operativi che cambiano spesso, come risultati, media, sponsor e impostazioni admin, restano caricati con `no-store` o tramite `authFetch`.
- I blocchi admin più pesanti sono caricati in modo lazy con `next/dynamic`, così la pagina admin mostra prima il contenuto principale e poi i moduli secondari.
- Le immagini caricate direttamente con `<img>` devono avere almeno `loading="lazy"` e `decoding="async"`, salvo contenuti above-the-fold esplicitamente eager.

### Cache client

`cachedJson()` deduplica le richieste GET concorrenti e conserva il risultato per pochi secondi. È pensata per dati di cornice come nome, branding e configurazione leggera del torneo. Non va usata per scritture, risultati live, salvataggi o dati che devono essere sempre freschi.

### Prossimi interventi performance

- Spostare progressivamente le pagine più lette a server components con dati iniziali già pronti.
- Ridurre le query Prisma delle dashboard con select più piccoli.
- Aggiungere paginazione reale a media, giocatori e calendario quando i dati aumentano.
- Valutare storage dedicato per media pesanti, con thumbnail generate a monte.

## V24 - League, Playoffs and Content presentation split

The remaining high-traffic page implementations have been moved out of `src/app` and into feature modules:

- `src/modules/leagues/presentation/LeagueHubPage.tsx`
- `src/modules/leagues/presentation/LeagueHomePage.tsx`
- `src/modules/playoffs/presentation/PlayoffsPage.tsx`
- `src/modules/playoffs/presentation/BracketView.tsx`
- `src/modules/playoffs/presentation/SeriesCard.tsx`
- `src/modules/playoffs/presentation/PlayoffSetup.tsx`
- `src/modules/stats/presentation/LeagueTablePage.tsx`
- `src/modules/videos/presentation/VideosPage.tsx`

`src/app` should now remain a thin Next.js routing layer. New feature UI should be placed in the owning module first, then exposed through a route wrapper.
