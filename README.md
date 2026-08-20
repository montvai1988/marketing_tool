# Marketing Prospect Hub

Egy belső, magyar nyelvű marketing-felderítő és outreach alkalmazás. A rendszer kategóriánként felderíti a megadott forrásoldalakon szereplő vállalkozásokat, nyilvános oldalakról kiolvassa a vállalkozás nevét, forrás URL-jét és e-mail címét, majd személyre szabott e-mail vázlatokat és felülvizsgált kampányokat kezel.

> **Hordozhatóság:** ez a kódprojekt nem igényel platform-specifikus futtatókörnyezetet. Szabványos React/Vite frontendből, Express/tRPC Node backendből, Drizzle ORM-ből és PostgreSQL adatbázisból áll. Vercelre szerveroldali függvényként telepíthető.

| Rész | Technológia | Független külső szolgáltatás |
| --- | --- | --- |
| Felület | React, Vite, TypeScript, Tailwind | Nincs |
| API | Express, tRPC, Vercel Function | Nincs |
| Bejelentkezés | Belső felhasználónév/jelszó, aláírt HTTP-only süti | Nincs |
| Adatbázis | Drizzle ORM, PostgreSQL | Neon, Supabase, Railway, vagy saját PostgreSQL |
| Keresés | Google Custom Search JSON API | Google Cloud + Programmable Search Engine |
| E-mail | Resend REST API | Resend |
| AI vázlat | OpenAI-kompatibilis Chat Completions API | OpenAI, OpenRouter, Groq vagy más kompatibilis szolgáltató |

## Helyi futtatás

Node.js 20+ és pnpm szükséges. Helyi PostgreSQL indításhoz és a Vercel/Neon beállításhoz lásd a [`docs/postgresql-setup.md`](docs/postgresql-setup.md) fájlt. A teljes, kezdőtől a funkcionális tesztig vezető helyi folyamatot a [`docs/helyi-teszteles.md`](docs/helyi-teszteles.md) tartalmazza. Másold a `docs/environment-variables.md` táblázata alapján a változókat egy helyi `.env` fájlba, majd futtasd a következő parancsokat:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

A fejlesztői szerver a `PORT` változóban megadott porton, ennek hiányában a 3000-es porton indul. Az alkalmazás nem helyez alapértelmezett titkot a kódba: a belépéshez `APP_PASSWORD`, a munkamenethez `SESSION_SECRET`, az adatbázishoz pedig `DATABASE_URL` kell.

## Vercel telepítés

A projekt `vercel.json` fájlja a Vite által előállított statikus felületet `dist` mappába építi, az `api/index.ts` pedig Express alapú Vercel Functionként szolgálja ki az API-t. A Vercel támogatja a Vite alkalmazásokat és Express alkalmazásokat is; az Express alkalmazás egyetlen Vercel Functionként fut. [1] [2]

Kapcsold össze ezt a GitHub-tárolót egy új Vercel projekttel. A Vercel a `pnpm build:vercel` parancsot futtatja, a `vercel.json` pedig `/api/*` alatt az API funkcióra, minden más útvonalat pedig a Vite SPA `index.html` belépőpontjára irányít. A SPA útvonalakhoz szükséges rewrite minta a Vercel hivatalos Vite útmutatójával egyezik. [1]

Ezután add meg a Vercel **Settings → Environment Variables** felületén a `docs/environment-variables.md` fájlban felsorolt változókat. A titkokat csak szerveroldali változóként vedd fel; ne használj `VITE_` előtagot adatbázis-, API- vagy levélküldési kulcsoknál. A Vite csak `VITE_` előtagú értékeket tesz elérhetővé a kliens buildben. [1]

> A Vercel Functions kérésenként futó, skálázódó környezetet ad, ezért a felderítés és a kampányküldés kéréshez kötött, kis méretű műveletként működik. Nagy mennyiségű, hosszú ideig tartó vagy ütemezett tömeges feladatot külön üzenetsorral vagy ütemezővel kell kezelni. [3]

## Keresési források

A Google 2026. január 20-tól új Programmable Search Engine motoroknál nem engedi a teljes webes keresést. Az alkalmazás ezért a **Forrásoldalak** oldalon manuálisan felvett platformokra és domainekre korlátozza a lekérdezéseket, és mindegyik kereséshez `site:` feltételeket épít. A Google új motoron legfeljebb 50 kijelölt domaint engedélyez. [4]

Minden felvett domaint másolj át a Google keresőmotor **Sites to search** listájába. A felület ehhez `*.domain/*` formátumú, másolható listát biztosít.

## E-mail és megfelelőség

A kiküldés a Resend API-val történik, SMTP nélkül. A feladó címnek a Resendben hitelesített domainhez kell tartoznia. Minden üzenethez automatikus leiratkozó hivatkozás és `List-Unsubscribe` fejléc tartozik; leiratkozás után a címzett minden későbbi kampányból kizáródik.

Csak olyan üzleti címzetteknek küldj levelet, akiknél jogszerűen támaszkodhatsz a megkereséshez fűződő jogos érdekedre vagy más megfelelő jogalapra. A kommunikációban egyértelműen azonosítsd a feladót, add meg a kapcsolattartási információkat, és tartsd tiszteletben a leiratkozást.

## Ellenőrzés

```bash
pnpm check
pnpm test
pnpm build
```

A `pnpm build` hordozható Node szerver buildet is készít, a `pnpm build:vercel` pedig kizárólag a Vercel által kiszolgált Vite frontend buildet állítja elő. A PostgreSQL migrációk alkalmazásához használd a `pnpm db:migrate` parancsot.

## Hivatkozások

[1]: https://vercel.com/docs/frameworks/frontend/vite "Vite on Vercel"
[2]: https://vercel.com/docs/frameworks/backend/express "Express on Vercel"
[3]: https://vercel.com/docs/functions "Vercel Functions"
[4]: https://support.google.com/programmable-search/answer/12397162 "Google Programmable Search Engine: Update sites in your search engine"
