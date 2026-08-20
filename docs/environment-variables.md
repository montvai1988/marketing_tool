# Környezeti változók

Az alkalmazás egy szabványos Node.js/Vite projekt. Az alábbi értékeket a helyi `.env` fájlban, illetve éles környezetben a Vercel **Settings → Environment Variables** felületén kell megadni. A titkos értékeket soha ne tedd a Git tárolóba.

| Változó | Kötelező | Rendeltetés |
| --- | --- | --- |
| `DATABASE_URL` | Igen | Vercelből elérhető, menedzselt MySQL-kompatibilis adatbázis kapcsolati címe. |
| `APP_USERNAME` | Igen | Az egyetlen belső admin felhasználónév. |
| `APP_PASSWORD` | Igen | Hosszú, egyedi belépési jelszó. |
| `SESSION_SECRET` | Igen | Legalább 32 karakteres véletlen érték a bejelentkezési süti aláírásához. |
| `APP_OWNER_NAME` | Ajánlott | A belső admin és az alapértelmezett feladó megjelenő neve. |
| `APP_OWNER_EMAIL` | Ajánlott | A belső admin e-mail címe. |
| `APP_BASE_URL` | Igen | A publikált alkalmazás abszolút címe a leiratkozó linkekhez. |
| `GOOGLE_SEARCH_API_KEY` | Igen | A Google Custom Search API kulcsa. |
| `GOOGLE_SEARCH_ENGINE_ID` | Igen | A Google Programmable Search Engine `cx` azonosítója. |
| `RESEND_API_KEY` | Igen | A Resend API kulcsa a küldéshez. |
| `OUTREACH_FROM_EMAIL` | Igen | A Resendben hitelesített domainhez tartozó feladó cím. |
| `OUTREACH_FROM_NAME` | Ajánlott | A feladó megjelenő neve. |
| `OUTREACH_REPLY_TO` | Ajánlott | A válaszcím, ha eltér a feladótól. |
| `OUTREACH_ALERT_EMAIL` | Nem | Opcionális belső cím kampány-összefoglaló értesítésekhez. |
| `LLM_API_KEY` | Igen | OpenAI-kompatibilis LLM-szolgáltató kulcsa. Az `OPENAI_API_KEY` is elfogadott. |
| `LLM_BASE_URL` | Nem | Az LLM API alapcíme; alapértelmezés: `https://api.openai.com/v1`. |
| `LLM_MODEL` | Nem | Az LLM modell neve; alapértelmezés: `gpt-4o-mini`. |

> A Vite biztonsági modellje miatt csak `VITE_` előtagú változók kerülnek a böngészőbe. Ebben a projektben **egyik titok sem** használ `VITE_` előtagot, ezért az adatbázis-, e-mail-, Google- és LLM-kulcsok csak a szerveren érhetők el.

