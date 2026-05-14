# Moniton — מוניטון

A smart taxi fare calculator for Israel, built as a full-screen Hebrew RTL mobile app with dark theme and large yellow buttons for easy use in a car.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Mobile: Expo (React Native), expo-router, RTL/Hebrew
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Routing: OpenStreetMap / Nominatim (geocoding + address search), OSRM (route calculation)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app (Moniton)
- `artifacts/mobile/constants/tariff.ts` — Israel 2024 taxi tariff rates & fare calculation logic
- `artifacts/mobile/constants/i18n.ts` — Hebrew string translations
- `artifacts/mobile/hooks/useLocation.ts` — GPS location hook (expo-location)
- `artifacts/mobile/hooks/useAddressSearch.ts` — Nominatim address autocomplete
- `artifacts/mobile/hooks/useRouteCalc.ts` — OSRM routing (distance + duration)
- `artifacts/mobile/app/(tabs)/index.tsx` — Main calculator screen
- `artifacts/mobile/app/(tabs)/info.tsx` — Tariff info screen
- `artifacts/api-server/` — Express API server

## Architecture decisions

- All mapping/routing uses free APIs (Nominatim + OSRM) — no Google Maps API key required
- Tariff auto-detection is purely client-side based on day/time
- Fare calculation is deterministic and offline-capable (no API call needed for the math itself)
- Hebrew RTL enforced via `I18nManager.allowRTL(true)` in root layout
- Dark theme hardcoded (no light mode) — optimized for in-car use

## Product

Moniton is a taxi fare estimator for Israeli passengers. It:
1. Auto-detects GPS location as origin
2. Lets users search for a destination with Hebrew address autocomplete
3. Selects Regular or Large (6+) vehicle
4. Picks a booking time (Now or scheduled future)
5. Auto-detects the correct tariff (1/2/3) based on time and day of week
6. Calculates estimated fare using Israel 2024 Ministry of Transport rates
7. Shows fare breakdown (base, distance, time, booking fee) with distance/duration stats

## Israel 2024 Taxi Tariffs

| | Tariff 1 | Tariff 2 | Tariff 3 |
|---|---|---|---|
| When | Sun–Thu 05:30–21:00 | Fri eve, Sat, Holidays, Night | Inter-city |
| Base fare | ₪12.00 | ₪12.00 | ₪22.90 |
| Per km | ₪4.28 | ₪5.14 | ₪5.14 |
| Per minute | ₪1.44 | ₪1.73 | ₪1.73 |

Large vehicle surcharge: +25%. Future booking fee: ₪5.90.

## User preferences

- Hebrew (RTL) interface
- Dark theme, full-screen, large yellow buttons and large fonts for in-car use
- Free mapping APIs only (no paid keys)
- After every deploy, always end the response with the production URL in a large, clear, clickable format so it can be tapped immediately on a phone: https://college-meal-planner.replit.app

## Gotchas

- Nominatim requires a `User-Agent` header — already set to `Moniton-App/1.0`
- OSRM public API is rate-limited; for production use a self-hosted instance
- `I18nManager.allowRTL(true)` must be called before any render — done in `_layout.tsx`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
