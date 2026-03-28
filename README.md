# Global Trade Shock Monitor | 全球貿易衝擊監測站

An independent analytical tool tracking how U.S. tariff policy since 2018 has redistributed global trade flows across economies and sectors. Built on real data from UN Comtrade and the World Bank — no fabricated numbers, no forecasts.

**Live site:** https://eugeneyip.github.io/global-trade-shock-monitor/

---

## Screenshot

*Add a screenshot of the landing page here.*

---

## What it tracks

- **4 sectors:** Semiconductors & Electronics, Smartphones, EVs & Battery Chain, Textiles & Light Manufacturing
- **10 partner economies:** China, Vietnam, India, Taiwan, Thailand, Malaysia, Mexico, Japan, South Korea, Indonesia
- **7 years of data:** 2018–2024 (annual UN Comtrade)
- **8 key policy events:** Section 232 (2018) through the U.S.-China Geneva arrangement (2025)

---

## Data sources

| Source | What it provides | License |
|---|---|---|
| [UN Comtrade](https://comtradeplus.un.org) | U.S. import values by partner, HS code, year | UN Terms of Service |
| [World Bank WDI](https://data.worldbank.org) | Country metadata, GDP context | CC-BY 4.0 |
| [WTO-IMF Tariff Tracker](https://tarifftracker.io) | Tariff event dates and rates | Open |
| [Our World in Data](https://github.com/owid/owid-datasets) | Aggregated trade indicators | CC-BY 4.0 |

---

## Run locally

```bash
git clone https://github.com/eugeneyip/global-trade-shock-monitor.git
cd global-trade-shock-monitor
npm install
npm run dev
```

Opens at `http://localhost:5173/global-trade-shock-monitor/`.

---

## Set up the UN Comtrade API key

The data update pipeline calls the [UN Comtrade API](https://comtradeplus.un.org), which requires a free API key.

1. Register at [comtradeplus.un.org](https://comtradeplus.un.org)
2. Create `.env` in the project root:

```
COMTRADE_API_KEY=your_key_here
```

3. Run the pipeline:

```bash
npm run update-data
```

Updated JSON files are written to `src/data/`.

---

## Deploy

### Manual

```bash
npm run deploy
```

Runs `npm run build` then pushes `dist/` to the `gh-pages` branch via the `gh-pages` package.

### Automated (GitHub Actions)

Every push to `main` triggers `.github/workflows/deploy.yml`:

1. Checkout → Node 20 → `npm ci` → `npm run build`
2. Deploy `dist/` to GitHub Pages via `actions/deploy-pages`

**One-time GitHub setup:**
- **Settings → Pages → Source:** set to `GitHub Actions`

### Monthly data refresh

`.github/workflows/update-data.yml` runs on the 1st of each month at 06:00 UTC.

- Add a repository secret `COMTRADE_API_KEY` (**Settings → Secrets and variables → Actions**)
- If `src/data/` changes after the update run, the workflow commits and pushes to `main`, which auto-triggers the deploy workflow

---

## Project structure

```
src/
  components/       # Reusable UI (charts, layout, Sankey, map, sparklines)
  pages/            # Route-level pages
  data/             # Static JSON files (committed, auto-updated monthly)
  hooks/            # Data access hooks
  utils/            # Formatters, color scales, insight engine
  contexts/         # EN/ZH language toggle
  types/            # TypeScript interfaces
scripts/
  update-data.ts    # Fetches from UN Comtrade API, updates src/data/
.github/workflows/
  deploy.yml        # Deploy to GitHub Pages on push to main
  update-data.yml   # Monthly automated data refresh
```

---

## License

MIT © Eugene Yip

---

## Attribution

Data provided by [UN Comtrade](https://comtradeplus.un.org), [World Bank](https://data.worldbank.org), [WTO](https://tarifftracker.io), and [Our World in Data](https://ourworldindata.org) under their respective licenses. This tool is an independent analytical product and is not affiliated with or endorsed by any of these organizations.
