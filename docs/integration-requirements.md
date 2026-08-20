# Integration Requirements

## Google Custom Search

The official Custom Search JSON API documentation states that the application needs both a Programmable Search Engine ID (`cx`) and a Google API key. The product will keep both values server-side and will import only search-result source links before inspecting a user-approved list of public websites. The Google documentation also notes that the current Custom Search JSON API is closed to new customers and that existing customers have until January 1, 2027 to transition; the integration must therefore be treated as a configuration-dependent capability rather than an assumed default.

Sources: <https://developers.google.com/custom-search/v1/introduction> and <https://developers.google.com/custom-search/v1/overview>.

### Whole-web search restriction (verified 2026-08-20)

Google's Programmable Search Engine help article states that as of **January 20, 2026** the product is transitioning to more focused solutions. New search engines must be configured with the **"Sites to search"** feature, which supports up to **50 designated domains**, and the whole-web option is no longer available for them. Engines that already had "Search the entire web" enabled keep working until **January 1, 2027**, and once that toggle is switched off it cannot be re-enabled. URL patterns may not exceed 5000 entries and may not span more than 50 distinct domains.

Consequence for this project: discovery cannot rely on whole-web search. The application therefore maintains an owner-managed list of source platforms, applies `site:` scoping to every query, and enforces the 50-domain ceiling before saving new sources.

Source: <https://support.google.com/programmable-search/answer/12397162>.

## Outbound Email

The application template's built-in notification helper is documented for project-owner alerts, not for sending email to arbitrary recipients. It can be used to alert the owner when a campaign is ready or encounters a problem, but it cannot truthfully be represented as a cold-email sender. Recipient delivery requires an application-specific email provider or a user-approved manual export/sending workflow. No recipient email will be sent without a compliant delivery mechanism, an approval step, and opt-out filtering.

Source: `/home/ubuntu/skills/webdev-owner-notifications/SKILL.md`.
