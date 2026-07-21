# Farewise

Five flight tools nobody's built cleanly for the India travel corridor:

1. **True Cost Calculator** — real total (fare + bags + seat + meal) across Indian carriers.
2. **Price Calendar** — cheapest months/days/booking windows for Dubai→Mumbai, London→Delhi, Singapore→Chennai, Toronto→Hyderabad.
3. **Compensation Calculator** — EU261 / UK261 / DGCA eligibility checker + auto-generated claim letter.
4. **Stopover Planner** — free/cheap stopover programs (Qatar, Turkish, Emirates, Etihad, Singapore Airlines).
5. **Group Convergence Tool** — best flight combination for friends flying in from multiple cities to one destination.

Runs in **demo mode** out of the box with realistic sample data. Flip on **live mode** by adding a free Travelpayouts token — no code changes needed, no credit card required.

## Quick start

```bash
npm install
npm start
```

Open http://localhost:3000 — you'll see a "Demo mode" pill in the header. Every tool works immediately with sample data.

## Turning on live flight data (Travelpayouts)

Amadeus shut down its free self-service developer portal on July 17, 2026, so this build uses **Travelpayouts** instead — a travel affiliate network (the company behind Aviasales/Jetradar) that gives free API access as part of joining their affiliate program. No credit card, no sales call.

1. Go to https://www.travelpayouts.com and sign up (it's an affiliate program, so you're joining to *earn* commissions, not pay anything).
2. In your dashboard, go to **Tools → API** (or https://www.travelpayouts.com/developers/api) and copy your access token.
3. Open `.env` in this folder and fill in:

   ```
   TRAVELPAYOUTS_TOKEN=your_token_here
   ```

4. Restart the server (`npm start`). The header pill switches to "Live data" and the True Cost Calculator, Price Calendar, and Group Convergence tools start pulling real cached fares. (Compensation Calculator and Stopover Planner are rule/content-based and never needed an API key.)

## What's real vs. estimated

- **Travelpayouts pricing data** is real, but cached — built from actual Aviasales/Jetradar user searches (typically within the last 48h for exact-date queries), not a live GDS search. It also only returns a handful of "best" fares per query (not one offer per airline), so:
  - **True Cost Calculator**: whichever airline(s) Travelpayouts actually returned a real fare for are marked live; the rest of the comparison table is estimated by scaling around that real anchor price.
  - **Price Calendar**: Travelpayouts' month-grouped endpoint returns real cached prices for however many months it has data for; any remaining months in the 12-month view are filled in using the seasonality data, scaled to match the real months' average.
  - **Group Convergence**: Travelpayouts gives a real price + departure time but not arrival time, so arrival is *estimated* from great-circle distance at a typical cruise speed (see `server/routes/groupConvergence.js`) — flagged as an estimate in the API response, not treated as a live schedule.
- **Baggage/seat/meal fees** (`server/data/airlineFees.json`) and **stopover program terms** (`server/data/stopoverPrograms.json`) are curated estimates as of mid-2026 — airlines change these often, so the site should periodically be re-checked against airline sites.
- **Price Calendar seasonality** (`server/data/corridorSeasonality.json`) is general diaspora-travel-pattern guidance, used both as a fallback and to shape the demo/fill-in data.
- **Compensation rules** (`server/data/compensationRules.json`) are informational, not legal advice. Eligibility has real-world exceptions (extraordinary circumstances, rerouting offered, etc.) — the claim letter is a starting draft, not a guaranteed-to-succeed filing. This tool never depended on Amadeus or Travelpayouts; it's pure rule logic plus your manual flight-detail input, same as how AirHelp/Flightright-style sites actually work.

## Monetization notes (for the Compensation Calculator)

The standard industry model (AirHelp, Flightright, etc.) is a 25% success fee on paid-out claims. This build only checks eligibility and drafts the letter — it does not process payments or file claims on the user's behalf. Wiring up an actual claims pipeline (submission tracking, payment collection) is a separate build. Travelpayouts itself is also a natural fit for monetizing the pricing tools via its own affiliate booking links, since you're already inside that network.

## Project structure

```
farewise/
  server/
    index.js              # Express app entry point
    lib/
      travelpayouts.js     # Data API wrapper (cheapest fares, monthly fares)
      amadeus.js            # unused legacy wrapper, kept for reference only
      geo.js                # airport lat/lon + haversine distance
      demo.js               # deterministic sample-data generator
    routes/
      trueCost.js
      priceCalendar.js
      compensation.js
      stopover.js
      groupConvergence.js
    data/                   # curated JSON datasets (fees, rules, stopovers, seasonality, airports)
  public/
    index.html              # single-page app, tab per tool
    css/styles.css
    js/app.js                # fetch calls + rendering
  package.json
  .env / .env.example
```

## Deploying

This is a plain Node/Express app — deploys as-is to Render, Railway, Fly.io, a VPS, etc. Set `TRAVELPAYOUTS_TOKEN` and `PORT` in your hosting provider's dashboard instead of `.env`.
