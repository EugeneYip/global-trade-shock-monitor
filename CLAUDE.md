# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Global Trade Shock Monitor

An intelligence product tracking how U.S. tariff policy is redistributing global trade flows across economies and sectors. Built with real UN Comtrade and World Bank data.

## Tech Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (with custom Nippon Colors theme)
- D3.js (map, Sankey, sparklines)
- Recharts (bar/line/area charts)
- React Router v6 (client-side routing with hash router for GitHub Pages)
- GitHub Pages (static deployment)
- GitHub Actions (automated monthly data refresh)

## Design System (STRICT — do not deviate)

- Background: #FCFAF2 (parchment) — EVERY surface, no exceptions
- Primary text: #2E5C6E (slate teal)
- Headers: #622954 (deep plum)
- Positive/gains: #5DAC81 (wakatake green)
- Negative/losses: #C00000 (deep red)
- Verdict/analysis: #0070C0 (ruri blue)
- Entity highlight: #005CAF (bright ruri)
- Analytical accent: #66327C (sumire violet)
- Dark surfaces: #2D3748 (charcoal)
- Table alt rows: #F3F3F3
- Borders: #707C74 (rikyu-nezu)
- Warning/attention: #F8B500 (yamabuki)
- NEVER use pure white (#FFFFFF) backgrounds
- NEVER use default blue/red/green
- NEVER use neon or highly saturated colors
- English fonts: Source Serif 4 (body/headings), JetBrains Mono (data/code)
- Chinese fonts: Noto Serif TC
- Load via Google Fonts link in index.html

Tailwind custom color tokens (defined in src/index.css @theme):
- bg-parchment / text-parchment → #FCFAF2
- bg-slate-teal / text-slate-teal → #2E5C6E
- bg-deep-plum / text-deep-plum → #622954
- bg-wakatake / text-wakatake → #5DAC81
- bg-deep-red / text-deep-red → #C00000
- bg-ruri-blue / text-ruri-blue → #0070C0
- bg-bright-ruri / text-bright-ruri → #005CAF
- bg-sumire-violet / text-sumire-violet → #66327C
- bg-dark-charcoal / text-dark-charcoal → #2D3748
- bg-ink-black / text-ink-black → #343434
- bg-alt-row → #F3F3F3
- bg-border-muted / text-border-muted → #707C74
- bg-yamabuki / text-yamabuki → #F8B500
- font-serif → "Source Serif 4", "Noto Serif TC", serif
- font-mono → "JetBrains Mono", monospace

## File Structure

```
src/
  components/
    Briefing/     # Insight cards, stat strip, edition header
    Explore/      # Sankey, Map, SparklineGrid, SectorSwitcher
    Charts/       # Recharts wrappers (area, bar, line)
    Economy/      # Economy profile components
    Layout/       # Header, Footer, Nav, PageWrapper
    Shared/       # Tooltip, Badge, MetricBadge, CategoryTag
  pages/
    Landing.tsx         # Single long-scroll: Briefing → Explore → Footer
    SectorDetail.tsx
    EconomyProfile.tsx
    Compare.tsx
    Timeline.tsx
    Methodology.tsx
  data/                 # Static JSON (committed, auto-updated)
    trade-flows.json
    economies.json
    sectors.json
    tariff-events.json
    briefing.json
  hooks/
    useTradeData.ts
    useSector.ts
    useBriefing.ts
  utils/
    formatters.ts       # Number formatting, currency, percentage
    colorScales.ts      # D3 scales mapped to Nippon Colors
    insightEngine.ts    # Auto-generates insights from data patterns
    constants.ts
  contexts/
    LanguageContext.tsx
  types/
    index.ts
  scripts/
    update-data.ts      # Data pipeline + insight generation
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # TypeScript check + Vite build
npm run update-data  # Fetch live data from UN Comtrade API
```

Set `COMTRADE_API_KEY` env var before running `update-data`. Key is stored in `.env` (gitignored).

## Conventions

- All UI supports English/Chinese toggle (store in LanguageContext)
- Data files live in src/data/ as JSON, imported at build time
- Every data point must cite its source
- Charts must include source attribution below them
- No localStorage or sessionStorage
- Hash router (#/) for GitHub Pages compatibility
- Responsive: mobile-first, lg breakpoint for desktop layouts

## Rules

- Do not fabricate any trade data. Every number must come from the JSON files.
- Do not use any external icon libraries. Inline SVG only.
- Do not add decorative elements. Content density over decoration.
- Source citations are mandatory on every visualization.
- When adding new features, do not modify existing working features.
