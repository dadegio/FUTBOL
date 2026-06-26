# FUTBOL / FUTPOLI gestionale torneo

Applicazione Next.js per la gestione del torneo amatoriale FUTPOLI: leghe, squadre, giocatori, calendario, risultati, classifiche, statistiche e area admin.

## Regole FUTPOLI recepite nel codice

- Formula campionato: girone unico con andata e ritorno.
- Con 16 squadre vengono generate 30 giornate e 240 partite.
- Rosa massima: 14 giocatori per squadra.
- Distinta gara obbligatoria: ogni squadra deve avere almeno 8 giocatori autorizzati.
- Un giocatore è utilizzabile in distinta solo se risulta autorizzato e con documentazione minima completa.
- Quota giocatore: 0,50 € per ogni presenza in distinta.
- Arbitro: 20,00 € a partita, quindi 10,00 € per squadra.
- Certificato medico non obbligatorio: resta gestita la dichiarazione sanitaria nel modulo unico.
- Wildcard: campo tracciato a livello giocatore, ma regola sportiva finale ancora da decidere.

## Area admin torneo

Per gli admin è disponibile la pagina:

```txt
/leagues/[leagueId]/admin
```

La pagina riepiloga:

- giocatori totali/autorizzati/bloccati;
- documentazione mancante;
- wildcard usate;
- presenze in distinta;
- quote giocatori maturate;
- costo arbitri sulle partite concluse;
- stato amministrativo per squadra.

## Stato amministrativo giocatore

Ogni giocatore ha uno stato:

- `PENDING` = da completare;
- `IN_REVIEW` = in verifica;
- `AUTHORIZED` = autorizzato;
- `BLOCKED` = bloccato;
- `SUSPENDED` = squalificato;
- `RETIRED` = ritirato.

Per poter essere selezionato in distinta, un giocatore deve avere:

- stato `AUTHORIZED`;
- modulo firmato;
- consenso privacy;
- consenso foto interna/riconoscimento;
- dichiarazione salute/responsabilità personale.

La liberatoria media/foto pubblica resta tracciata ma non blocca la presenza in distinta, perché serve per contenuti pubblici e promozionali.

## Distinta gara e statistiche

La pagina partita permette di:

- selezionare i giocatori presenti in distinta;
- controllare il minimo tassativo di 8 giocatori per squadra;
- impedire la selezione di giocatori non autorizzati;
- inserire risultato, gol e assist;
- salvare presenze e statistiche in modo separato.

Le presenze non sono più dedotte dalle statistiche: un giocatore può avere presenza anche con 0 gol e 0 assist.

## Database Prisma

Modelli principali:

- `League`
- `Team`
- `Player`
- `Match`
- `MatchSheetPlayer`
- `MatchPlayerStat`
- `PlayoffSeries`
- `User`

La migration `20260626211500_futpoli_admin_rules` aggiunge:

- enum `PlayerStatus`;
- campi documentali/admin sul giocatore;
- campo `refereeCostCents` sulla partita;
- tabella `MatchSheetPlayer` per la distinta gara.

## Sviluppo

```bash
npm ci
DIRECT_URL="postgresql://..." npm run build
npm run dev
```

Il progetto usa Prisma 7 con client generato in `src/generated/prisma`.

## Note operative

Il ramo consigliato per queste modifiche è:

```txt
feature/futpoli-admin-rules
```

Blocchi di commit applicati:

```txt
feat: generate home and away league schedule
fix: enforce 14-player roster limit
feat: add FUTPOLI admin data model
feat: add player eligibility and match sheet APIs
feat: manage match sheets and player admin UI
feat: surface player admin status on team roster
feat: add tournament admin financial dashboard
fix: type match sheet stat lookups
```
