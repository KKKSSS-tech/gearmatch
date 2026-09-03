# Gear Match AdSense follow-up — 2026-09-03

## Latest outcome: re-review ACCEPTED, approval PENDING

- September 3 around 22:03 JST: after verifying the live changes, submitted the new review request in AdSense. The dashboard changed from 要確認 to 準備中 and 審査待ち. This is application acceptance, NOT advertising approval.
- PR #13 was merged and deployed successfully to production: 7442ae80d3f595fd467682b20b1dbdfbea3061b1. Live JS/CSS matched the tested build. Homepage, field guide, privacy, ads.txt, robots and sitemap returned 200; a made-up path returned 404.
- The in-app browser is authenticated to AdSense and can continue this work. The earlier Chrome-only blocker no longer applies.
- Google Privacy & messaging already has a PUBLISHED European regulations message for gearmatchworld.org, updated June 8, covering English and 31 other languages. No replacement CMP was needed. Runtime appearance in the applicable regions remains an approval-follow-up check.
- Auto ads showed no site row and there were no existing manual units. Created a responsive display unit named `Gear Match - Results responsive`; Google confirmed creation and supplied slot `9120553910` with client `ca-pub-9932958665424466`.
- This follow-up configures that real slot as the default for the single result-end placement after explicit consent. Unfilled units are hidden; no dummy retailer prices or ad placeholders are introduced. Static article pages remain readable and ad-free unless Auto ads is separately configured.
- Daily 10:00 JST heartbeat `gear-match-adsense` is active. Next work is to check the pending review, verify real serving after approval (never click ads), or diagnose a new rejection before making further changes/resubmitting. Do not blindly submit again while pending.

The historical notes below explain the work; this latest outcome supersedes their incomplete-state statements.

## Later progress on September 3 (supersedes the initial browser blocker below)

The in-app browser recovered; authenticated Chrome did not. Draft review: https://github.com/KKKSSS-tech/gearmatch/pull/13. The initial branch preview passed Vercel deployment.

Desktop (1280px) and mobile (390px) renders were inspected for the homepage, finder results, original guide, privacy page and JP/EN article templates. The finder completed all four steps on desktop and mobile. Retailer links expanded correctly. No horizontal overflow was found on the six article routes at 390px.

Visual QA exposed an additional content problem: deterministic store multipliers were presented as retailer-specific prices and a lowest-price label. These fabricated comparisons were removed; the headline now uses the stored reference price with only the documented used-condition factor, and shops are search links without claimed live prices. All eight locale headings and JP/EN explanatory copy/FAQ structured data were aligned. The final regression suite has 106 passing tests.

Consent was verified through the real UI: no loader before a choice, one after opt-in, one on an article with the same choice, and none after reset/decline. No real ads were clicked. The custom opt-in still does not replace a Google-certified regional CMP.

Focused visual critique, cycle 2: pass for the content/layout changes (not AdSense readiness). Scores: purpose 5, hierarchy 4, recognition 4, coherence 5, typography 4, contrast 4, accessibility 4, production feasibility 4; new motion N/A. Weighted score 85.9/100. Strong points: existing identity preserved, guide's worksheet hierarchy, responsive readable layouts. The misleading price issue found in cycle 1 was fixed and the results and FAQ re-rendered. No remaining visual release blocker was observed in changed surfaces.

Content changes may now be released independently of ad-serving setup. AdSense re-review and certified CMP/Auto ads verification still require access to the authenticated Google dashboard. Keep this distinction explicit; content deployment alone does not mean advertising is approved or ready.

## Verified current outcome

- Production: https://www.gearmatchworld.org/
- Repository: https://github.com/KKKSSS-tech/gearmatch (main)
- AdSense publisher: pub-9932958665424466
- Site detail: https://adsense.google.com/adsense/u/0/pub-9932958665424466/sites/detail/url=gearmatchworld.org
- On September 3, the authenticated AdSense page showed 要確認, 有用性の低いコンテンツ and サイトは広告を表示できない状態です. Last status update: July 25, 2026, 14:38 JST.
- Gmail corroboration: July 25 JST rejection email, subject AdSense の利用を開始するには、問題を解決してください. The July 15 re-review did not result in approval.
- Ownership is verified. Live /ads.txt returned the matching Google publisher record, although the AdSense dashboard displayed ads.txt 不明.
- No new re-review has been submitted during this work. No approval or ad-serving readiness is claimed.

## Prepared changes

- Original practical budget/condition planning guide and crawlable substantive homepage explanation.
- Honest data-maintenance, pricing, used-grade and release-filter limitations in Japanese and English; removed unsupported daily-update promises.
- Static bilingual privacy/contact page and links from articles and the application.
- Explicit opt-in instead of legacy default-on ad loading; no unconditional article AdSense scripts.
- Manual ad units require a real unit ID; no blank ad units or wizard-step ad placements.
- Real not-found page instead of rewriting every unknown URL to the finder.
- Updated sitemap and patched vulnerable transitive dependencies.

## Design direction and verification

Preserve the established white/gray/blue Gear Match visual system, readable single-column articles, restrained blue emphasis, responsive tables, and accessible focus states. These are incremental changes, not a redesign. Japanese writing uses direct explanations and marks numerical examples as hypothetical.

- September 3: lint passed, 105 tests across 5 files passed, production build passed, git diff whitespace check passed.
- npm audit after dependency fixes: 0 vulnerabilities; final production-dependency audit also returned 0.
- New publisher tests cover static ownership metadata, no unconditional ad script, consent gating, loader deduplication, no empty manual units, crawlable content and 404 routing.
- Browser connection disappeared before new-page desktop/mobile inspection. The official browser inventory returned no browsers or apps. Therefore visual QA has NOT passed and production release remains blocked.
- Japanese prose lint on raw HTML mostly reported repeated closing-tag punctuation; markup findings were not treated as prose defects. This does not substitute for visual or editorial review.

## Required next actions

1. Restore the official Chrome/browser connection. Preserve existing user tabs; do not copy cookies or bypass authentication. Direct Vercel login requires two-factor authentication; the existing GitHub-to-Vercel integration may be used for normal deployment without handling credentials.
2. Start/reuse the local preview (127.0.0.1:4176 when still running). Inspect desktop and mobile homepage, field-guide, privacy and existing JP/EN articles. Complete the finder flow and test consent decline/reset/accept without clicking real ads. Fix visible or functional defects and record screenshots/critique before release.
3. Verify Google-certified CMP configuration for EEA/UK/Switzerland in AdSense Privacy & messaging. The new custom opt-in is NOT a certified CMP and does not establish regional compliance. Verify Auto ads or actual manual unit configuration; a publisher ID alone is neither an ad unit nor approval.
4. After QA, publish the prepared changes via the existing repository and Vercel integration. Verify the live canonical domain, original content, static privacy page, ads.txt, a genuinely missing URL returning 404, and deployed commit. Do not treat a protected preview as production verification.
5. Only after live fixes are verified, acknowledge that issues were fixed and request review in AdSense. Read back the resulting status and distinguish pending from approved. Do not repeatedly resubmit an unchanged rejection.
6. Check the dashboard and related Gmail daily. Notify on meaningful change, completion, failure or user action required; stay quiet on unchanged pending state. If approved, verify serving configuration/CMP without clicking ads, and then stop recurring follow-up when advertising readiness is confirmed.

Official guidance: https://support.google.com/adsense/answer/10015918 and https://support.google.com/adsense/answer/13554116?hl=en

## Rollback

Changes are isolated in a fresh clone and review branch; the pre-existing local Gear Match folder was left untouched. Prior production commit was 94844076cc7440f4860ca59da077f8f54c5d54c6. Before release, dropping the review branch leaves production unchanged. After release, revert the change commit through the usual repository deployment process rather than resetting unrelated work.
