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
