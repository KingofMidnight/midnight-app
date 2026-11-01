# Midnight — Trello roadmap review

Source: Trello board **Midnight Path** (https://trello.com/b/ijc0jzpp/midnight-path), reviewed 2026-11-01
against branch `agent-fixes` (commit `193b823`). Status is based on reading the code and on the live
tests run during the cleanup work; anything marked "not browser-tested" still needs a click-through.

Legend:
- ✅ **Done** — exists and works (tested where noted)
- 🟡 **Partial** — some of it exists; the note says what's missing
- 🔨 **Can do now** — no outside decisions or services needed
- ❓ **Needs a decision** — product, legal or business choice first
- 🔌 **Needs an outside service / account** — payment provider, ID verification, etc.
- 🕓 **Much later** — large, depends on other work, or only worth it at scale

---

## Moderation & Safe-Harbor Compliance (board list: in progress)

| Item | Status | Notes |
|---|---|---|
| User flagging & report system | ✅ | Report button on stories, chapters, episodes, users **and comments**; `POST /api/reports` validates, rate-limits, blocks duplicates/self-reports. Live-tested. |
| Reactive admin dashboard | ✅ | Reports page shows reason, content excerpt, links that open the reported content, reporter/reported user. |
| One-click Resolve / Dismiss / Take Down | ✅ | Plus Restore, Delete comment, Warn and Timeout (reported user and reporter). Takedowns can't be undone by creators. Live-tested. |
| DMCA takedown workflow | 🟡 ❓ | DMCA report type exists (requires claimant name, email, original URL). Missing: public no-account DMCA form, the legally required statements/signature, showing the DMCA agent's contact details, repeat-infringer counting. **On hold until closer to launch** (your decision). |
| Safe-harbor publishing rule (publish live, review on report) | ✅ | Enforced in the database (migration 004). Live-tested. |

## User Systems & Tracking (in progress)

| Item | Status | Notes |
|---|---|---|
| Auth & account management (sign-up, login, sessions, 2FA) | ✅ | Supabase Auth + hCaptcha bot protection + Supabase TOTP 2FA. **Run `migration_007_mfa.sql`** to finish 2FA enforcement in the database. |
| Public creator & reader profiles | 🟡 🔨 | Display name, avatar, bio, linked works exist. Missing: **social handles** (needs profile columns + form + display). |
| Universal user lists | 🟡 🔨 | Reading, Plan to Read, Completed exist. Missing: **Dropped** and **On Hold** (add to the `list_type` enum + UI). |
| Quick-add Read Later | 🟡 🔨 | Favorites/lists exist on the story page. Missing: one-tap bookmark on home, browse grid and search cards. |
| Per-story progress (last chapter/page/episode, across devices) | 🟡 🔨 | `user_progress` stores last chapter/episode. Missing: exact page / scroll position. |
| 5-star ratings & reviews | ✅ | Ratings, written reviews, threaded comments per story and per chapter/episode. Note: `WrittenReviews` component exists but isn't shown on any page yet (🔨). |
| User preferences sync (font, theme, reading direction) | 🔨 | Not built; reader settings are per-visit only. Needs a preferences column/table + load/save. |

## Novel Reader (in progress)

| Item | Status | Notes |
|---|---|---|
| Distraction-free reading UI | 🟡 🔨 | Clean reader page exists; adjustable margins/width missing. |
| Typography controls | 🟡 🔨 | Font size and line height exist. Missing: font family, paragraph spacing. |
| Theme modes (light/dark/sepia) | 🔨 | Not in the reader yet. |
| Text formatting support | ✅ | Headings, bold, italics, blockquotes, lists (sanitized). Check horizontal rules are allowed by the sanitizer. |
| Navigation & chapter bar | 🟡 🔨 | Next/previous exist. Missing: auto-hiding header, quick-jump chapter drawer. |
| Keyboard shortcuts | 🔨 | Not built (arrows for chapters, Esc to close menus). |
| Exact reading-position sync | 🔨 | Not built (depends on the progress item above). |

## Manga / Comic Reader (in progress)

| Item | Status | Notes |
|---|---|---|
| Vertical webtoon / long-strip mode | 🟡 | "Continuous" mode exists; check images stitch with no gaps (not browser-tested). |
| Single / double-page, LTR / RTL | ✅ | Single, double and right-to-left modes exist (not browser-tested). |
| Large image optimization & lazy loading | 🔨 | Uploads are now limited to 10 MB images; no lazy loading/resizing yet. Server-side resizing would need an image service (🔌) or a backend upload path. |
| Mobile touch navigation (tap edges, swipe, double-tap zoom) | 🔨 | Not built. |
| Overlay navigation bar (chapter select, Page X of Y) | 🟡 🔨 | Page counter exists; chapter-select dropdown/overlay to confirm. |
| Pre-load next 2–3 pages | 🔨 | Not built. |

## Anime / Cartoon Embeds (in progress)

| Item | Status | Notes |
|---|---|---|
| Secure external player embed | 🟡 🔨 | Sandboxed iframe exists. Missing: **an allow-list of approved video hosts** (currently any embed URL is accepted). |
| Metadata & external linking hub (Crunchyroll, HIDIVE, YouTube links) | 🔨 | Not built. |
| Episode grid (seasons, OVA/Special tags) | 🟡 🔨 | Episode list exists. Missing: seasons and OVA/Special tags (schema + UI). |
| Player shortcuts (space, arrows, F) | ❓ | Inside a third-party iframe the host's player controls these; only possible for hosts with a player API. Likely skip or limit. |
| Zero-hosting safeguard | 🟡 🔨 | No video uploads exist (storage buckets only accept images). Missing: the host allow-list above. |

## CHYOA / CYOA (in progress)

| Item | Status | Notes |
|---|---|---|
| Branching data schema | ✅ | `chapter_choices` + `stories.is_cyoa`; choices must stay in the same story. Live-tested. |
| Visual story map | 🟡 | Story map exists. Missing: "discovered paths" / locked branches per reader (needs reader path history). |
| Choice prompt component | ✅ | Choices shown at the end of chapters; hidden if the target chapter isn't published. |
| Route state & variables (flags, inventory, karma) | 🕓 | Big feature (CHYOA calls this "Game Mode"): variables per story, conditions on choices, saved per reader. |
| Community branching (others add branches) | 🕓 ❓ | Needs CHYOA-style story modes (Public / Moderated / Private) and roles (Owner, Editor, Author, Reviewer). Decide whether you want collaborative stories first. |
| Reader path history & rewind | 🔨 | Not built; needed for "discovered paths" on the map. |
| Author branch builder | ✅ | List-based choice editor in the chapter editor. |

## Creation Tools (in progress)

| Item | Status | Notes |
|---|---|---|
| Series shell management | ✅ | Title, synopsis, cover, tags, drafts. |
| Multi-format adaptation linking | ✅ | Story relationships (adapts/sequel/prequel/spinoff/alternative). |
| Rich text editor (markdown, autosave, word count) | 🟡 🔨 | Quill editor exists (the card says TipTap/Slate — Quill does the same job; TipTap was installed but unused and has been removed). Missing: **draft autosave** and **word count**. |
| Manga chapter uploader (drag-and-drop batch, reorder) | 🟡 | Batch upload + reordering exist; drag-and-drop to confirm in a browser. |
| Draft / staging / published states | 🟡 | Draft and published exist. Missing: staging several draft chapters for a synchronized launch. |
| Chapter management & reordering | 🟡 🔨 | Drag-and-drop ordering and delete exist. Missing: restore after delete (soft delete). |
| Categorization & tagging (original vs fanfiction, genres, warnings) | 🟡 🔨 | Original/fanfiction and genres/tags exist. Missing: content warnings (ties into Age Verification). |

## Age Verification (in progress)

| Item | Status | Notes |
|---|---|---|
| Global content rating taxonomy | 🟡 🔨 | Database has ratings (safe / suggestive / mature / explicit). The `ContentRatingSelect` component exists **but no page uses it**, and the rating isn't mandatory. Map to the card's General/Teen/Mature/Explicit. |
| First-party age gate (date of birth + disclaimer before 18+ content) | 🔨 ❓ | Not built. Needs the wording of the legal disclaimer. |
| NSFW preference toggle (hidden by default) | 🔨 | Not built; needs a profile setting + filtering in browse/search/home. |
| Third-party ID verification hook (Persona, Stripe Identity, Yoti) | 🔌 🕓 | Needs a provider account and a decision on which regions require it. |
| NSFW blur on covers/thumbnails | 🔨 | Not built; straightforward once ratings are mandatory. |
| Terms of Service & minor-protection waiver | ❓ | Needs legal text (a lawyer should review); then an "I agree" step at sign-up / age gate. |
| Author NSFW declaration at publishing | 🔨 | Not built; a required checkbox/rating in the story and chapter forms. |

## Monetization (board list: Approved Ideas)

| Item | Status | Notes |
|---|---|---|
| Ad placement slots | 🟡 🔌 | `GoogleAd` component + reader ad slots exist. Missing: header/sidebar slots elsewhere, a working AdSense account/slot IDs, and a cookie-consent banner where required (EU/UK). |
| Tiered membership (Bronze → Platinum) | 🔌 🕓 | Needs a payment provider (e.g. Stripe), subscription webhooks, and a tier/role model. |
| Category access locks per tier | 🕓 | Depends on memberships. |
| Creator revenue split & donations (90/10) | 🔌 ❓ 🕓 | Needs a payout provider (e.g. Stripe Connect), tax/KYC handling and legal review. |
| Ad-free exemption for members | 🕓 | Small once memberships exist. |
| Early access & premium chapter locks | 🕓 | Depends on memberships; must also be enforced in the database, not just hidden in the UI. |
| Creator analytics & payout dashboard | 🕓 | Depends on payouts. View counts and ratings already exist as a starting point. |

Note: a site with adult content can be refused by some payment and ad providers. Check provider
policies before building monetization.

---

## Suggested order

1. **Finish what's open:** run `migration_007_mfa.sql`; click through the new screens in a browser.
2. **Age Verification basics (🔨, important for an adult-content site):** mandatory rating on stories
   (use `ContentRatingSelect`), author NSFW declaration, NSFW preference toggle (off by default),
   cover blur, first-party age gate. Then get the ToS/disclaimer text reviewed (❓).
3. **Reader quality (🔨):** novel reader themes, typography, keyboard shortcuts, chapter drawer;
   manga reader lazy loading, pre-loading, touch navigation; exact reading position + preferences sync.
4. **Small user/creator gaps (🔨):** Dropped/On Hold lists, quick-add bookmark on cards, social handles,
   editor autosave + word count, show `WrittenReviews` on story pages, chapter soft-delete/restore.
5. **Anime embeds (🔨):** approved-host allow-list, external link hub, seasons/OVA tags.
6. **CYOA extras:** reader path history & rewind → discovered-paths map (🔨); variables/game mode
   and community branching later (🕓).
7. **Before launch:** DMCA workflow (on hold by your choice), ad consent, provider checks.
8. **Much later (🔌🕓):** memberships, premium locks, creator payouts, third-party ID verification.

## Other open items (not on the Trello board)

- Remaining lint errors (30, mostly `any` in older admin/creator pages).
- 2 backend dependency warnings that need `zod` 3 → 4.
- React Query: set up but unused — adopt on Browse/Story/readers for caching, or remove.
- Redis for rate limits only if more than one backend server is ever run.
