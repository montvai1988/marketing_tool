# Marketing Prospect Hub – helyi tesztelés lépésről lépésre

Ez az útmutató egy **tiszta, helyi PostgreSQL adatbázissal** futtatja a Marketing Prospect Hub alkalmazást. A lépések nem módosítják a Vercel környezetet és nem küldenek e-mailt külső címzetteknek.

> A projekt PostgreSQL 16 Docker Compose példányt, Drizzle migrációt és a helyi Vite/Express szervert használ. A későbbi Vercel telepítéshez ugyanezeket a környezeti változókat kell beállítani.

## 1. Előfeltételek ellenőrzése

Nyiss egy terminált, majd ellenőrizd, hogy rendelkezésre áll a Git, a Node.js 20 vagy újabb, a pnpm és a Docker Desktop.

```bash
git --version
node --version
pnpm --version
docker --version
docker compose version
```

Ha a `docker compose version` parancs hibát jelez, telepítsd vagy indítsd el a Docker Desktopot. A Docker Compose a több konténert tartalmazó alkalmazások definiálására és indítására szolgál. [1]

## 2. Projekt letöltése

```bash
git clone https://github.com/montvai1988/marketing_tool.git
cd marketing_tool
pnpm install
```

Ha korábban már letöltötted a projektet, előbb frissítsd:

```bash
git pull origin main
pnpm install
```

## 3. Helyi PostgreSQL indítása

Az alábbi parancs a projektben lévő `docker-compose.postgres.yml` fájlt használja. Ez PostgreSQL 16 adatbázist indít a gépeden, a `5432` porton.

```bash
docker compose -f docker-compose.postgres.yml up -d
```

Ellenőrizd, hogy a konténer fut-e:

```bash
docker compose -f docker-compose.postgres.yml ps
```

Az elvárt állapot a `postgres` szolgáltatásnál **running** vagy **Up**. Ha nem indul el, a napló segít:

```bash
docker compose -f docker-compose.postgres.yml logs postgres
```

Ellenőrizd a tényleges adatbázis-kapcsolatot is:

```bash
docker compose -f docker-compose.postgres.yml exec postgres \
  psql -U prospect -d prospect_hub -c "SELECT version();"
```

Ha PostgreSQL verziót kapsz eredményként, a helyi adatbázis rendben működik.

## 4. Helyi környezeti változók létrehozása

A projekt gyökerében hozz létre egy `.env` nevű fájlt, és illeszd be az alábbi **helyi teszt** értékeket. A jelszavakat a saját gépeden tartsd; a `.env` fájl a `.gitignore` miatt nem kerül GitHubra.

```env
# PostgreSQL Docker Compose kapcsolat
DATABASE_URL=postgresql://prospect:change-this-local-password@localhost:5432/prospect_hub

# Helyi belépés
APP_USERNAME=admin
APP_PASSWORD=valassz-egy-hosszu-helyi-jelszot
SESSION_SECRET=legalabb-32-karakteres-egyedi-helyi-titok
APP_OWNER_NAME=Adam
APP_OWNER_EMAIL=te@pelda.hu
APP_BASE_URL=http://localhost:3000

# Ezek helyi felületi teszthez üresen maradhatnak.
# Google kereséshez, AI-vázlathoz és valódi e-mailhez később szükségesek.
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=
RESEND_API_KEY=
OUTREACH_FROM_EMAIL=
OUTREACH_FROM_NAME=Adam
OUTREACH_REPLY_TO=
OUTREACH_ALERT_EMAIL=
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

Egy megfelelő `SESSION_SECRET` érték előállításához futtasd ezt a parancsot, majd másold az eredményt a `.env` fájlba:

```bash
openssl rand -base64 48
```

## 5. PostgreSQL séma létrehozása

Az alkalmazás kezdeti PostgreSQL sémája a `drizzle/0000_stormy_speedball.sql` migrációban van. Alkalmazd a helyi adatbázisra:

```bash
pnpm db:migrate
```

Sikeres futás után vizsgáld meg a létrejött táblákat:

```bash
docker compose -f docker-compose.postgres.yml exec postgres \
  psql -U prospect -d prospect_hub -c '\dt'
```

Az eredményben legalább ezeknek a tábláknak kell szerepelniük: `users`, `prospects`, `templates`, `campaigns`, `messages`, `optOuts` és `sourceSites`.

> Ha a `pnpm db:migrate` kapcsolati hibát ad, először ellenőrizd, hogy a Docker konténer fut-e, és a `.env` fájlban a `DATABASE_URL` pontosan a fenti PostgreSQL URL-e.

## 6. Alkalmazás indítása

Indítsd el a helyi fejlesztői szervert:

```bash
pnpm dev
```

Nyisd meg a böngészőben a **http://localhost:3000** címet. Jelentkezz be az `APP_USERNAME` és `APP_PASSWORD` értékével.

Gyors technikai ellenőrzésként egy másik terminálban futtasd:

```bash
curl http://localhost:3000/api/health
```

Az elvárt válasz:

```json
{"ok":true}
```

## 7. Funkcionális helyi tesztlista

Az alábbi folyamat nem követel Google-, LLM- vagy Resend-kulcsot. Ezek nélkül a kapcsolódó funkciók beállítási figyelmeztetést mutatnak, ami helyes viselkedés.

| Lépés | Teendő | Elvárt eredmény |
| --- | --- | --- |
| 1 | Jelentkezz be | Az áttekintő oldal betöltődik. |
| 2 | Nyisd meg a **Forrásoldalak** oldalt | Új platform vagy domain felvehető, mentés után megjelenik a listában. |
| 3 | Nyisd meg a **Kontaktok** oldalt | Üres állapot vagy meglévő adatok megjelennek adatbázishiba nélkül. |
| 4 | Nyisd meg a **Kampányok** oldalt | A Resend és leiratkozó URL hiányára vonatkozó figyelmeztetés megjelenik, ha nem adtál meg kulcsokat. |
| 5 | Nyisd meg a **Leiratkozások** oldalt | Az oldal hibamentesen betöltődik. |
| 6 | Nyisd meg a `http://localhost:3000/leiratkozas` címet | A nyilvános leiratkozó felület betöltődik belépés nélkül. |

## 8. Automatikus ellenőrzések

Egy új terminálban futtasd ezeket, miközben a Docker adatbázis és az alkalmazás is futhat:

```bash
pnpm check
pnpm test
pnpm drizzle-kit check
pnpm build:vercel
pnpm build
```

Az elvárt eredmény: hibamentes típusellenőrzés, zöld Vitest futás, érvényes Drizzle migráció és sikeres Vercel/standalone build. A projektben jelenleg 35 Vitest teszt szerepel.

## 9. Opcionális integrációs teszt

Csak akkor add meg az alábbi kulcsokat a `.env` fájlban, ha készen állsz az adott szolgáltatás használatára.

| Funkció | Szükséges változók | Biztonságos teszt |
| --- | --- | --- |
| Google keresés | `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID` | Vegyél fel egy saját vagy jóváhagyott forrásdomaint, és indíts kis, 1–3 találatos keresést. |
| AI-vázlat | `LLM_API_KEY` | Egy belső tesztkontakt számára készíts vázlatot; küldés nélkül ellenőrizd a szöveget. |
| E-mail | `RESEND_API_KEY`, `OUTREACH_FROM_EMAIL`, `APP_BASE_URL` | Kizárólag saját teszt e-mail címednek küldj egy egycímzettes kampányt. |

> Ne küldj külső címzetteknek tesztkampányt, amíg a feladó domain, a leiratkozás és az adatkezelési folyamat nincs véglegesítve.

## 10. Leállítás és tiszta újrakezdés

Az adatbázis megtartásával állítsd le a konténert:

```bash
docker compose -f docker-compose.postgres.yml down
```

Teljesen tiszta helyi tesztadatbázis létrehozásához töröld a Docker volume-ot, majd ismételd meg a 3–5. lépést:

```bash
docker compose -f docker-compose.postgres.yml down -v
docker compose -f docker-compose.postgres.yml up -d
pnpm db:migrate
```

> A `down -v` törli **minden helyi PostgreSQL tesztadatodat** ebben a Docker volume-ban. Éles vagy fontos adatbázison soha ne használd.

## Gyors hibakeresés

| Hiba | Valószínű ok | Javítás |
| --- | --- | --- |
| `docker: command not found` | Docker Desktop nincs telepítve vagy nem fut | Telepítsd és indítsd el a Docker Desktopot, majd kezdd újra a 3. lépéssel. |
| `port is already allocated` | A 5432 portot más PostgreSQL használja | Állítsd le a másik példányt, vagy módosítsd a Compose fájl portját és a `DATABASE_URL` értékét ugyanarra a portra. |
| `ECONNREFUSED` vagy `connection refused` | A PostgreSQL konténer nem fut | Ellenőrizd a `docker compose ... ps` és `logs postgres` kimenetét. |
| `password authentication failed` | A `DATABASE_URL` jelszava eltér a Compose beállítástól | Egyeztesd a `POSTGRES_PASSWORD` és a `DATABASE_URL` értékét, majd tiszta adatbázishoz használd a `down -v` parancsot. |
| `APP_PASSWORD környezeti változó nincs beállítva` | Hiányos `.env` fájl | Add meg az `APP_PASSWORD` és `SESSION_SECRET` változókat, majd indítsd újra a `pnpm dev` folyamatot. |
| `A küldés még nincs beállítva` | Resend kulcs vagy hitelesített feladó hiányzik | Helyi UI-tesztnél ez normális; valódi küldéshez állítsd be a Resend változókat. |

## Hivatkozások

[1]: https://docs.docker.com/compose/ "Docker Compose documentation"
