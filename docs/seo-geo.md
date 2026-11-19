# Antlertee: SEO and GEO notes

GEO = "generative engine optimisation": being found and quoted by ChatGPT, Claude, Perplexity, Gemini and Google AI Overviews, on top of normal Google SEO. Audit run 2026-11-14 with the `geo` skill (installed globally from github.com/zubair-trabzada/geo-seo-claude, commit 989cae0, MIT; the self-updater and the agency sales tools were deliberately left out).

Live site checked: https://antlertee-site.vercel.app. Measured with Lighthouse 12 (mobile emulation, throttled).

## What was wrong, and what is fixed in the code (deployed 2026-11-14)

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Canonical links, Open Graph URLs, sitemap and robots all said `https://www.example.com` (the site URL setting was never set on Vercel). Google would treat another domain as the real one. | Critical | Fixed: the default is now the live address. When a custom domain is chosen, set `NEXT_PUBLIC_SITE_URL` on Vercel and redeploy. |
| 2 | Organization schema pointed its logo at `/icon.svg`, which does not exist. | Medium | Fixed: now `/brand/logo-full-ink.png`. |
| 3 | No `llms.txt` (a plain-text site map that AI assistants read). | High for GEO | Added `/llms.txt`, generated from the same products and posts as the pages. |
| 4 | robots.txt did not mention AI crawlers (they were allowed by the wildcard, but not stated). | Low | Explicit allow for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, Bingbot. `/admin/`, `/api/` and `/studio/` stay blocked. |
| 5 | The tech pack builder only existed as a pinned hero on `/process/`, so nothing could rank for "tech pack builder / template". | High opportunity | Added a landing page `/tech-pack-builder/` (own H1, answer-first copy, eight steps, six FAQs, `WebApplication`, `HowTo`, `FAQPage` and breadcrumb schema), in the sitemap and in `llms.txt`. The tool itself stays on `/process/#build-tech-pack`. |
| 6 | Only two blog posts targeted search questions people actually ask. | Medium | Two new posts written (see "Blog plan"). |
| 7 | New products and posts added in the content studio would 404 until a redeploy. | Medium | Fixed: product and blog pages now build on first visit and refresh within a minute. |

Already good: titles and meta descriptions on every page, one H1 per page, canonical tags, `Product`, `BlogPosting`, `Blog`, `FAQPage` and `Organization` schema, an XML sitemap, accessible headings, zero layout shift. Lighthouse SEO is 100 on every page tested.

## Not done, needs a decision or an account

- **Custom domain.** Biggest long-term lever: rankings and brand mentions attach to the domain. Until then every link, citation and backlink points at the vercel.app address.
- **Google Search Console and Bing Webmaster Tools.** Needs your Google and Microsoft sign-in. Submit `/sitemap.xml` in both. Bing matters for GEO because ChatGPT search leans on Bing's index.
- **Google Business Profile** for the Karachi unit (also fixes the missing `LocalBusiness`/address signal). Needs the confirmed address and a verification step.
- **Brand mentions.** AI assistants cite brands that other sites mention (Reddit, YouTube, LinkedIn, trade directories, Instagram collaborations). Not assessed yet; this is off-site work, not code.
- **Facts to confirm with the client** before they are pushed harder: brands served, years in business, export markets, turnaround. The site marks these `TODO confirm with client`; AI assistants will repeat whatever the page says.
- **Reviews and named clients.** There are none on the site. Named case studies (with permission) are the strongest trust signal for both Google and AI answers.
- **Composite GEO score.** The skill's 0 to 100 score needs live citability and brand-mention scans, which were not run. The qualitative picture above is from reading the site and the live headers only.

## Blog plan (GEO-first: answer the question in the first two sentences)

Written, in `src/content/blog.ts` (also loaded into the content studio):
1. Free tech pack template for clothing: the 8 sections and how to fill them. Links the builder.
2. What is MOQ in clothing manufacturing, and how to start with a small order.

Next, in order (each 600 to 900 words, plain English, no invented numbers, link to the builder or a product):
3. How to start a clothing brand in Pakistan: from idea to first drop.
4. How to choose a clothing manufacturer: ten questions to ask before paying for samples.
5. Tech pack vs design brief vs mood board: what a factory actually needs.
6. How much does a hoodie cost to make? (what moves the price; only once pricing facts are confirmed).
7. Screen print vs puff print vs DTF vs embroidery: which to pick.
8. Private label vs print on demand vs white label: the difference.
9. How to read a fabric spec: GSM, composition, jersey vs french terry vs fleece.
10. What a good sample looks like: a checklist for approving a sample.

Each post should: open with a one-sentence definition, use question headings (H2) the way people search, keep one fact per sentence, end with a pointer to the tech pack builder.

## Marketing the tech pack builder

- Landing page `/tech-pack-builder/` is the one URL to promote. Target phrases: "tech pack builder", "free tech pack template", "tech pack for clothing", "how to make a tech pack".
- Link it from every relevant blog post (the two new posts mention it by name; once the blog supports links in the text, link them).
- Instagram: a short reel or carousel "build a tech pack in 3 minutes" with the page in the bio link. Their audience is already clothing founders.
- Add the page to the navigation or footer once the owner is happy with it (kept out of the menu for now).
- Measure: once Search Console is connected, watch impressions for the target phrases and the clicks from `/tech-pack-builder/` to `/process/#build-tech-pack`.

## Speed and Core Web Vitals

Lighthouse 12, mobile emulation (slow 4G, 4x CPU slowdown), live site, one page at a time. Lab numbers, not real-visitor data (no field data exists yet for this domain).

| Page | Before (score / LCP / blocking time) | After (score / LCP / blocking time) |
|------|------|------|
| Home | 57 / 3.7 s / 2.2 s | 65 / 2.0 s / 2.2 s |
| Products | 73 / 5.4 s / 260 ms | 85 / 3.9 s / 110 ms |
| Process | 67 / 2.4 s / 1.65 s | 73 / 2.1 s / 1.04 s |
| Blog | n/a | 97 / 1.7 s / 120 ms |
| Tech pack builder (new) | n/a | 97 / 1.7 s / 70 ms |

Layout shift (CLS) is 0 on every page. Accessibility 97 to 100, best practices 100, SEO 100. Desktop home: 74, LCP 0.9 s.

What changed: loader logo 94 KB to 44 KB (WebP); wardrobe wood textures 237 KB to 85 KB (WebP); off-screen shelves on the products page skip layout and paint until near the screen; the 3D hoodie now loads about 0.6 s after the page has finished loading instead of during hydration.

What is still slow, and why: the Home and Process pages still block the main thread for 1 to 2 seconds on a slow phone, because of the 3D hoodie (a 270 KB three.js script plus a 1.4 MB model). Phones keep the 3D hero by choice. If it ever needs to be faster, the options are a lighter model, loading the 3D only when the visitor scrolls to it, or using the 2D drawing on low-memory phones (the code already does this for phones with 2 GB of memory or less, and `?hero=svg` shows it).

Note on testing: a Lighthouse run on a laptop against `next start` reads about 1.8 s slower on LCP than the same page on Vercel, so compare like with like.
