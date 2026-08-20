# PostgreSQL beállítás helyben és Vercelen

Az alkalmazás PostgreSQL-t használ a `pg` kliensen és a Drizzle PostgreSQL dialektusán keresztül. A jelenlegi `drizzle/0000_stormy_speedball.sql` egy **tiszta PostgreSQL adatbázis** kezdeti sémája; a korábbi MySQL migrációk szándékosan nem részei az új konfigurációnak.

## Helyi fejlesztési adatbázis

A legegyszerűbb izolált megoldás a mellékelt Docker Compose konfiguráció. A projektgyökérből indítsd el PostgreSQL 16-tal a helyi 5432-es porton:

```bash
docker compose -f docker-compose.postgres.yml up -d
```

Ugyanez közvetlen Docker parancsként:

```bash
docker run --name prospect-hub-postgres \
  -e POSTGRES_USER=prospect \
  -e POSTGRES_PASSWORD=change-this-local-password \
  -e POSTGRES_DB=prospect_hub \
  -p 5432:5432 \
  -d postgres:16
```

A projektgyökér `.env` fájljában állítsd be a helyi kapcsolati címet:

```env
DATABASE_URL=postgresql://prospect:change-this-local-password@localhost:5432/prospect_hub
```

Ezután telepítsd a verziózott Drizzle migrációt, majd indítsd el a fejlesztői szervert:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Új séma módosításakor a helyes fejlesztői sorrend:

```bash
pnpm db:generate
pnpm db:migrate
```

> A `pnpm db:push` gyors, közvetlen séma-szinkronizáló eszköz. Éles adatbázisnál a visszakövethető `db:generate` + `db:migrate` folyamatot használd.

## PostgreSQL Vercelen

A Vercel saját PostgreSQL szolgáltatása már nem érhető el új projektekhez; a Vercel Marketplace külső PostgreSQL-szolgáltatókat kapcsol a projekthez. [1] A Neon Vercel-integráció automatikusan tud környezeti változókat beállítani, és támogatja a preview környezetek adatbázis-ágait. [2]

| Ajánlott út | Mikor válaszd | Beállítás |
| --- | --- | --- |
| **Neon Vercel-integráció** | Új projekt és egyszerű Vercel kapcsolat | Vercel Marketplace → Neon Postgres → projekt összekapcsolása |
| **Meglévő Neon / Supabase** | Már van PostgreSQL szolgáltatásod | A szolgáltató `DATABASE_URL` értékének felvétele a Vercelben |
| **Saját PostgreSQL** | Saját infrastruktúrát kezelsz | Nyilvánosan elérhető, TLS-védett PostgreSQL URL megadása |

Vercelben a projekt **Settings → Environment Variables** oldalán add meg a PostgreSQL szolgáltató kapcsolatát `DATABASE_URL` néven, majd ugyanitt add meg az összes további, szerveroldali változót a `environment-variables.md` fájl alapján. A Production környezetnél alkalmazd a migrációt biztonságos CI lépésben vagy egy egyszeri, az éles `DATABASE_URL`-t használó fejlesztői környezetből:

```bash
pnpm db:migrate
```

Az `APP_BASE_URL` értéke élesben a Vercel vagy saját domain teljes HTTPS címe legyen, például `https://prospect.example.com`.

## Fontos adatátviteli megjegyzés

Ez a kódmódosítás új PostgreSQL sémát hoz létre. A meglévő MySQL adatbázist **nem módosítja és nem törli**. Ha a régi MySQL-ben értékes kontaktok, kampányok vagy leiratkozások vannak, azok betöltéséhez külön, ellenőrzött MySQL → PostgreSQL adatátviteli scriptet kell készíteni, mielőtt az éles rendszert átállítod.

## Hivatkozások

[1]: https://vercel.com/docs/postgres "Postgres on Vercel"
[2]: https://neon.com/docs/guides/vercel-overview "Integrating Neon with Vercel"
