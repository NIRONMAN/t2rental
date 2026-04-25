# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- <https://developers.cloudflare.com/workers/>
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Commands

| Command | Purpose |
|---------|---------|
| `npx wrangler dev` | Local development |
| `npx wrangler deploy` | Deploy to Cloudflare |
| `npx wrangler types` | Generate TypeScript types |

Run `wrangler types` after changing bindings in wrangler.jsonc.

## Node.js Compatibility

<https://developers.cloudflare.com/workers/runtime-apis/nodejs/>

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: <https://developers.cloudflare.com/workers/observability/errors/>

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`

## Best Practices (conditional)

If the application uses Durable Objects or Workflows, refer to the relevant best practices:

- Durable Objects: <https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/>
- Workflows: <https://developers.cloudflare.com/workflows/build/rules-of-workflows/>

### About the project

## What is this?

This is an open-source platform that helps people find places to rent in tier-2 cities in India.

It is built by the community, for the community. Anyone can add a listing, leave a review, or share information about a neighborhood. All the data is public and free to download.

Think of it like a Wikipedia for rental housing — not a business, not a broker, just people helping each other find a decent place to live.

---

## Why does this exist?

In large cities like Mumbai or Bangalore, there are many rental apps and websites. They are noisy and commercial, but they work to some extent.

In tier-2 cities — places like Nagpur, Indore, Vadodara, Coimbatore, Mysuru — the situation is different. Listings are scattered across random WhatsApp groups, torn paper notices on walls, or word of mouth through friends. There is no single place to look. There is no way to know if a landlord is trustworthy. There is no information about what a neighborhood is actually like.

This project tries to fix that.

---

## What problems does it solve?

**1. Cannot find available listings**
There is no central place to see what is available to rent in most tier-2 cities. This platform gives renters one place to look, with real listings submitted by real people in the community.

**2. No information about the neighborhood**
Is the area safe? Does the water supply cut out in summer? Is it noisy at night? Is public transport nearby? Right now there is no way to know this before you move in. This platform lets people who already live somewhere share that knowledge with people who are considering it.

**3. Cannot trust what is listed**
Listing photos can be old or fake. Rent prices can be misleading. This platform uses community verification — other renters confirm whether a listing is accurate — so you can tell what is real and what is not.

**4. No way to know about the landlord**
A landlord who does not return security deposits, who cuts power arbitrarily, or who harasses tenants — there is currently no way to know this before signing an agreement. This platform lets past tenants leave honest reviews, including anonymously if they are afraid of consequences.

---

## Who is this for?

Primarily for **people looking to rent** — students, young professionals, families who have just moved to a new city, people relocating for work.

This platform is explicitly **not** for real estate agents or brokers to advertise commercial listings.

---

## How does it work?

**Listings**
Anyone can submit a rental property. They fill in the address, rent, size, furnishing status, available date, and photos. The address is automatically converted to GPS coordinates so it shows up on a map. The listing goes live immediately and the community can then verify or flag it.

**Locality insights**
Separate from individual listings, people can share general information about a locality — water supply reliability, noise levels, safety, proximity to markets and transport. This builds up over time into a useful neighborhood guide.

**Landlord reviews**
After renting a place, tenants can leave a review of the landlord. Reviews can be posted anonymously. Landlords are identified by a combination of name and phone number that is hashed — meaning the system can link reviews to the same landlord without storing their personal contact details publicly.

**Community verification**
When two or more people independently confirm that a listing is accurate, it gets a verified badge. This is done entirely by the community — no paid staff.

---

## What this platform will never do

- Charge money to list a property or to contact a landlord
- Show advertisements
- Sell user data
- Require your phone number or email to browse listings
- Automatically delete a review just because a landlord complains about it
- Use Google Maps or any other paid mapping service

---

## Tech in plain English

The platform is built to be as cheap as possible to run so that the community does not need funding to keep it alive.

- Maps use OpenStreetMap, which is free and community-maintained
- The database stores GPS coordinates so you can do radius searches ("show me everything within 2 km of the railway station")
- Images are stored on Cloudflare's free storage tier
- The code is on GitHub and licensed under MIT — anyone can copy it, modify it, and run their own version for their own city

---

## How to get involved

**As a renter or local resident**
Submit listings you know about. Leave reviews. Verify listings in your area. Share the platform in local housing WhatsApp groups.

**As a developer**
Pick any open issue on GitHub. Read `AGENTS.md` to understand how the codebase is organized. The stack is Next.js + Hono.js + D1 — all standard, well-documented tools.

**As a city maintainer**
Each city has one or more maintainers who handle the moderation queue — reviewing flagged listings and reviews. Open an issue on GitHub with your city name if you want to take this role.

## License

Code: **MIT**
