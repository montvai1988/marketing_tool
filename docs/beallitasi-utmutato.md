# Beállítási útmutató — Marketing Prospect Hub

Ez a dokumentum azt írja le, milyen külső beállítások kellenek ahhoz, hogy a felderítés és a levélküldés éles adatokkal működjön. Két külső szolgáltatás érintett: a Google keresés és a Resend levélküldés.

## 1. Google keresés

A keresés a Google Custom Search JSON API-t használja. Két adat kell hozzá: egy API kulcs és egy keresőmotor azonosító.

### 1.1 A jelenlegi hiba és a megoldása

A megadott kulccsal a Google a következő választ adja:

> `403 API_KEY_SERVICE_BLOCKED` — Requests to this API customsearch method `google.customsearch.v1.CustomSearchService.List` are blocked.

Ez nem a keresőmotor beállításából ered, hanem a kulcs jogosultságából. Két dolgot érdemes ellenőrizni a Google Cloud Console-ban, abban a projektben, ahol a kulcs készült:

Elsőként az API engedélyezését: az **APIs & Services → Library** menüben keresd meg a *Custom Search API*-t, és nyomd meg az **Enable** gombot. Ha korábban csak a kulcsot hoztad létre, de az API-t nem engedélyezted, pontosan ezt a hibát kapod.

Másodikként a kulcs korlátozását: az **APIs & Services → Credentials** menüben nyisd meg a kulcsot, és az **API restrictions** résznél vagy a *Don't restrict key* opciót válaszd, vagy a korlátozott listába vedd fel a *Custom Search API*-t. Ha a kulcs más API-ra van szűkítve, a Google letiltja a keresési kérést.

A mentés után néhány perc átfutási idő lehet. A beállítás helyességét a `pnpm vitest run server/credentials.test.ts` paranccsal lehet ellenőrizni: a Google teszt akkor zöld, ha a kulcs már átmegy.

### 1.2 Keresőmotor létrehozása

A [Programmable Search Engine vezérlőpultján](https://programmablesearchengine.google.com/controlpanel/all) hozz létre egy keresőmotort. Fontos tudni, hogy a Google **2026. január 20-tól** új motoroknál megszüntette a teljes webes keresést: helyette a **Sites to search** listát kell használni, amely legfeljebb **50 domaint** engedélyez. A régebbi, már „Search the entire web” beállítású motorok 2027. január 1-ig működnek tovább.

Ezért az alkalmazásban a **Forrásoldalak** lap adja meg, hol keressen a rendszer. A menete a következő: a Forrásoldalak lapon beilleszted a platformokat, majd a *Domain minták másolása* gombbal kimásolod a listát, és ugyanezt beilleszted a keresőmotor **Sites to search** mezőjébe. Így a Google oldalán és az alkalmazásban ugyanaz a forráskör érvényes.

A keresőmotor **Overview** lapján található azonosító (cx érték) kerül a `GOOGLE_SEARCH_ENGINE_ID` beállításba.

### 1.3 Kvóta

A Custom Search JSON API ingyenes szintje napi 100 lekérdezés, felette fizetős, 1000 lekérdezésenkénti elszámolással, napi 10 ezres felső korláttal. Egy keresés a találatszámtól függően több lekérdezést is felhasznál, mert a Google egy hívásban legfeljebb 10 találatot ad vissza.

## 2. Resend levélküldés

A levélküldés a Resend API-n keresztül történik, SMTP beállítás nélkül. A kulcs érvényes, és a `contact.eventcraft.hu` domain **verified** állapotban van, tehát a küldés technikailag rendben van.

Egyetlen nyitott pont a feladó cím: a `OUTREACH_FROM_EMAIL` értéke jelenleg `later`, ami nem érvényes e-mail cím. Adj meg egy címet a hitelesített domainen, például `ajanlat@contact.eventcraft.hu`. Ha másik domainről küldenél, azt előbb hitelesíteni kell a Resend felületén, különben a levelek elutasításra kerülnek.

### 2.1 Miért nem a beépített értesítés küldi a leveleket

A platform beépített értesítési szolgáltatása kizárólag a projekt tulajdonosát, vagyis téged tud elérni; arra nincs képessége, hogy egy megtalált vállalkozás postafiókjába küldjön levelet. Ezért a címzettek felé a Resend végzi a kiküldést, a beépített értesítés pedig arra szolgál, hogy a kampány befejezéséről és a hibás küldésekről téged tájékoztasson.

## 3. Leiratkozó link

A levelek láblécében szereplő leiratkozó link az `APP_BASE_URL` értékére épül. Publikálás után ezt állítsd a végleges Vercel vagy egyedi domainre (például `https://prospect.example.com`), különben a címzettek nem tudnak leiratkozni, ami jogi kockázatot jelent.

## 4. Jogi keret

Az alkalmazás nyilvános oldalakról gyűjt e-mail címeket. Ezek a GDPR szerint személyes adatnak minősülnek, ezért a rendszer minden kontaktnál eltárolja a forrás URL-t, minden levélbe leiratkozó linket tesz, és a leiratkozott címeket automatikusan kizárja minden további kiküldésből. A levél tartalmában szerepeljen a cégneved és elérhetőséged, valamint az, hogy honnan találtad meg a címzettet.
