import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { Economy, TradeFlow, TariffEvent, Sector } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import allEconomies from '../data/economies.json';
import allFlows from '../data/trade-flows.json';
import allEvents from '../data/tariff-events.json';
import allSectors from '../data/sectors.json';

// ── Constants ─────────────────────────────────────────────────────────────────

const ECONOMY_FLAGS: Record<string, string> = {
  CHN: '🇨🇳', VNM: '🇻🇳', IND: '🇮🇳', TWN: '🇹🇼', THA: '🇹🇭',
  MYS: '🇲🇾', MEX: '🇲🇽', JPN: '🇯🇵', KOR: '🇰🇷', IDN: '🇮🇩', USA: '🇺🇸',
};

const ROLE_LABELS: Record<string, { en: string; zh: string; color: string }> = {
  target:      { en: 'Primary Target',   zh: '主要目標',   color: '#C00000' },
  beneficiary: { en: 'Beneficiary',      zh: '受益方',     color: '#5DAC81' },
  squeezed:    { en: 'Squeezed Middle',  zh: '中間受壓',   color: '#F8B500' },
  neutral:     { en: 'Neutral',          zh: '中立方',     color: '#707C74' },
  imposer:     { en: 'Tariff Imposer',   zh: '關稅發動方', color: '#622954' },
};

const SECTOR_COLORS: Record<string, string> = {
  semiconductors: '#0070C0',
  smartphones:    '#66327C',
  'ev-battery':  '#5DAC81',
  textiles:       '#F8B500',
};

const SECTOR_LABELS: Record<string, { en: string; zh: string }> = {
  semiconductors: { en: 'Semiconductors', zh: '半導體' },
  smartphones:    { en: 'Smartphones',    zh: '手機' },
  'ev-battery':  { en: 'EV/Battery',     zh: '電動車' },
  textiles:       { en: 'Textiles',       zh: '紡織' },
};

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
const LATEST_YEAR   = 2024;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtB(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}

function StatCard({ label, value, sub, valueColor }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#FCFAF2',
        border: '1px solid rgba(112,124,116,0.25)',
        borderRadius: '6px',
        padding: '16px 20px',
        flex: '1 1 180px',
      }}
    >
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '10px',
          color: '#707C74',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: '"Source Serif 4", serif',
          fontSize: '26px',
          fontWeight: 700,
          color: valueColor ?? '#2E5C6E',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            color: '#707C74',
            marginTop: '5px',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <h2
      style={{
        fontFamily: '"Source Serif 4", serif',
        fontSize: '17px',
        fontWeight: 700,
        color: '#622954',
        margin: '0 0 14px',
        borderBottom: '1px solid rgba(112,124,116,0.2)',
        paddingBottom: '8px',
      }}
    >
      {label}
    </h2>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EconomyProfile() {
  const { iso3 } = useParams<{ iso3: string }>();
  const { language } = useLanguage();

  const economy = useMemo(
    () => (allEconomies as Economy[]).find(e => e.iso3 === iso3) ?? null,
    [iso3],
  );

  // All flows for this economy
  const econFlows = useMemo(
    () => (allFlows as TradeFlow[]).filter(f => f.partner === iso3),
    [iso3],
  );

  // All flows for China (for share comparison)
  const chnFlows = useMemo(
    () => (allFlows as TradeFlow[]).filter(f => f.partner === 'CHN'),
    [],
  );

  // Total US imports across all tracked partners per year (to compute share)
  const totalByYear = useMemo(() => {
    const m: Record<number, number> = {};
    for (const f of allFlows as TradeFlow[]) {
      m[f.year] = (m[f.year] ?? 0) + f.importValue;
    }
    return m;
  }, []);

  // Stacked bar data: one row per year, one key per sector
  const stackedBarData = useMemo(() => {
    return YEARS.map(year => {
      const row: Record<string, number | string> = { year: String(year) };
      for (const s of allSectors as Sector[]) {
        const total = econFlows
          .filter(f => f.year === year && f.sectorId === s.id)
          .reduce((sum, f) => sum + f.importValue, 0);
        row[s.id] = Math.round(total / 1e9 * 10) / 10;
      }
      return row;
    });
  }, [econFlows]);

  // Share timeline data: this economy vs China vs total (per-year share of tracked imports)
  const shareTimelineData = useMemo(() => {
    return YEARS.map(year => {
      const econTotal = econFlows
        .filter(f => f.year === year)
        .reduce((sum, f) => sum + f.importValue, 0);
      const chnTotal = chnFlows
        .filter(f => f.year === year)
        .reduce((sum, f) => sum + f.importValue, 0);
      const grandTotal = totalByYear[year] ?? 1;
      return {
        year: String(year),
        econShare: Math.round((econTotal / grandTotal) * 1000) / 10,
        chinaShare: Math.round((chnTotal / grandTotal) * 1000) / 10,
      };
    });
  }, [econFlows, chnFlows, totalByYear]);

  // Tariff events relevant to this economy
  const relevantEvents = useMemo(() => {
    return (allEvents as TariffEvent[]).filter(
      e => e.affectedEconomies.includes(iso3 ?? '') || e.affectedEconomies.includes('CHN'),
    );
  }, [iso3]);

  // Event years that fall within our data range
  const eventYears = useMemo(() => {
    const yearSet = new Set(YEARS.map(String));
    const out: Array<{ year: string; label: string }> = [];
    const seen = new Set<string>();
    for (const evt of relevantEvents) {
      const y = evt.date.substring(0, 4);
      if (yearSet.has(y) && !seen.has(y)) {
        seen.add(y);
        out.push({ year: y, label: language === 'zh' ? evt.titleZh : evt.title });
      }
    }
    return out;
  }, [relevantEvents, language]);

  // Key stats
  const latestTotal = useMemo(() => {
    return econFlows
      .filter(f => f.year === LATEST_YEAR)
      .reduce((sum, f) => sum + f.importValue, 0);
  }, [econFlows]);

  // Top sector in latest year
  const topSector = useMemo(() => {
    const bySecId: Record<string, number> = {};
    for (const f of econFlows.filter(f => f.year === LATEST_YEAR)) {
      bySecId[f.sectorId] = (bySecId[f.sectorId] ?? 0) + f.importValue;
    }
    let best = { id: '', val: 0 };
    for (const [id, val] of Object.entries(bySecId)) {
      if (val > best.val) best = { id, val };
    }
    const sec = (allSectors as Sector[]).find(s => s.id === best.id);
    return sec ?? null;
  }, [econFlows]);

  if (!economy) {
    return (
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ fontFamily: '"JetBrains Mono", monospace', color: '#707C74' }}>
          Economy not found: {iso3}
        </p>
        <Link to="/" style={{ color: '#2E5C6E', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
          ← Back to home
        </Link>
      </main>
    );
  }

  const flag      = ECONOMY_FLAGS[economy.iso3] ?? '';
  const roleMeta  = ROLE_LABELS[economy.role] ?? ROLE_LABELS['neutral']!;
  const name      = language === 'zh' ? economy.nameZh : economy.name;
  const narrative = language === 'zh' ? economy.narrativeZh : economy.narrative;
  const sign      = economy.shareChangeVsChina >= 0 ? '+' : '';
  const isGainer  = economy.shareChangeVsChina > 0;

  const isChn = economy.iso3 === 'CHN';

  return (
    <main
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 24px 64px',
        backgroundColor: '#FCFAF2',
      }}
    >
      {/* Breadcrumb */}
      <nav
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '11px',
          color: '#707C74',
          marginBottom: '20px',
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
        }}
      >
        <Link to="/" style={{ color: '#2E5C6E', textDecoration: 'none' }}>
          {language === 'zh' ? '簡報' : 'Briefing'}
        </Link>
        <span>›</span>
        <Link to="/#economies" style={{ color: '#2E5C6E', textDecoration: 'none' }}>
          {language === 'zh' ? '經濟體' : 'Economies'}
        </Link>
        <span>›</span>
        <span style={{ color: '#343434' }}>{name}</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '40px', lineHeight: 1 }}>{flag}</span>
          <div>
            <h1
              style={{
                fontFamily: '"Source Serif 4", serif',
                fontSize: '32px',
                fontWeight: 700,
                color: '#622954',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '11px',
                  color: '#FCFAF2',
                  backgroundColor: roleMeta.color,
                  padding: '2px 9px',
                  borderRadius: '3px',
                  letterSpacing: '0.02em',
                }}
              >
                {language === 'zh' ? roleMeta.zh : roleMeta.en}
              </span>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '11px',
                  color: '#707C74',
                }}
              >
                {economy.region}
              </span>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <p
          style={{
            fontFamily: '"Source Serif 4", serif',
            fontSize: '14px',
            lineHeight: 1.65,
            color: '#343434',
            marginTop: '16px',
            marginBottom: 0,
            borderLeft: `3px solid ${roleMeta.color}`,
            paddingLeft: '14px',
          }}
        >
          {narrative}
        </p>
      </div>

      {/* ── Key Metrics ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '36px' }}>
        <SectionHead label={language === 'zh' ? '關鍵指標' : 'Key Metrics'} />
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <StatCard
            label={language === 'zh' ? '2024年對美進口總額' : 'Total Trade with U.S.'}
            value={fmtB(latestTotal)}
            sub={language === 'zh' ? '2024年' : 'Latest year (2024)'}
          />
          <StatCard
            label={language === 'zh' ? '份額變化（vs 2018）' : 'Share Change vs. 2018'}
            value={`${sign}${economy.shareChangeVsChina.toFixed(2)}pp`}
            sub={language === 'zh' ? '美國進口份額，2018–2024' : 'Share of U.S. imports, 2018–2024'}
            valueColor={isGainer ? '#5DAC81' : '#C00000'}
          />
          {topSector && (
            <StatCard
              label={language === 'zh' ? '2024年最大出口類別' : 'Top Sector 2024'}
              value={language === 'zh'
                ? (SECTOR_LABELS[topSector.id]?.zh ?? topSector.labelZh)
                : (SECTOR_LABELS[topSector.id]?.en ?? topSector.label)}
              sub={fmtB(
                econFlows
                  .filter(f => f.year === LATEST_YEAR && f.sectorId === topSector.id)
                  .reduce((s, f) => s + f.importValue, 0),
              )}
            />
          )}
        </div>
      </div>

      {/* ── Sector Breakdown ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '36px' }}>
        <SectionHead
          label={language === 'zh' ? '分行業進口明細（2018–2024）' : 'Sector Breakdown — US Imports 2018–2024'}
        />
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stackedBarData} margin={{ top: 4, right: 12, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,124,116,0.15)" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fill: '#707C74' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fill: '#707C74' }}
              tickFormatter={v => `$${v}B`}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              formatter={(v: unknown, name: unknown) => {
                const nameStr = String(name ?? '');
                const sec = (allSectors as Sector[]).find(s => s.id === nameStr);
                const label = sec
                  ? (language === 'zh' ? SECTOR_LABELS[sec.id]?.zh ?? sec.labelZh : SECTOR_LABELS[sec.id]?.en ?? sec.label)
                  : nameStr;
                return [`$${Number(v).toFixed(1)}B`, label];
              }}
              contentStyle={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '11px',
                backgroundColor: '#2D3748',
                border: 'none',
                color: '#FCFAF2',
                borderRadius: '4px',
              }}
            />
            <Legend
              formatter={(value: string) => {
                const meta = SECTOR_LABELS[value];
                return (
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#343434' }}>
                    {meta ? (language === 'zh' ? meta.zh : meta.en) : value}
                  </span>
                );
              }}
            />
            {(allSectors as Sector[]).map(s => (
              <Bar
                key={s.id}
                dataKey={s.id}
                stackId="a"
                fill={SECTOR_COLORS[s.id] ?? '#707C74'}
                radius={s.id === 'textiles' ? [2, 2, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            color: '#707C74',
            marginTop: '8px',
          }}
        >
          Source: UN Comtrade · U.S. imports from {economy.name} by sector · 2018–2024 · USD billions
        </p>
      </div>

      {/* ── Trade Share Timeline ──────────────────────────────────────────────── */}
      {!isChn && (
        <div style={{ marginBottom: '36px' }}>
          <SectionHead
            label={language === 'zh' ? '進口份額走勢：對比中國' : 'Import Share Timeline vs. China'}
          />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={shareTimelineData} margin={{ top: 4, right: 12, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="econGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={roleMeta.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={roleMeta.color} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="chnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C00000" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#C00000" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,124,116,0.15)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fill: '#707C74' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fill: '#707C74' }}
                tickFormatter={v => `${v}%`}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                formatter={(v: unknown, name: unknown) => {
                  const label = name === 'econShare' ? economy.name : 'China';
                  return [`${Number(v).toFixed(1)}%`, label];
                }}
                contentStyle={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '11px',
                  backgroundColor: '#2D3748',
                  border: 'none',
                  color: '#FCFAF2',
                  borderRadius: '4px',
                }}
              />
              {eventYears.map(e => (
                <ReferenceLine
                  key={e.year}
                  x={e.year}
                  stroke="#F8B500"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{
                    value: '⚡',
                    position: 'top',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10,
                    fill: '#F8B500',
                  }}
                />
              ))}
              <Area
                type="monotone"
                dataKey="chinaShare"
                name="chinaShare"
                stroke="#C00000"
                strokeWidth={1.5}
                fill="url(#chnGrad)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="econShare"
                name="econShare"
                stroke={roleMeta.color}
                strokeWidth={2}
                fill="url(#econGrad)"
                dot={{ fill: roleMeta.color, r: 3, strokeWidth: 0 }}
              />
              <Legend
                formatter={(value: string) => {
                  const label = value === 'econShare'
                    ? (language === 'zh' ? economy.nameZh : economy.name)
                    : (language === 'zh' ? '中國' : 'China');
                  return (
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#343434' }}>
                      {label}
                    </span>
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10px',
              color: '#707C74',
              marginTop: '8px',
            }}
          >
            Source: UN Comtrade · Share of tracked U.S. imports (10 economies) ·⚡ = tariff event year
          </p>
        </div>
      )}

      {/* ── Related Sectors ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '36px' }}>
        <SectionHead label={language === 'zh' ? '深入分析行業' : 'Explore by Sector'} />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(allSectors as Sector[]).map(s => {
            const val = econFlows
              .filter(f => f.year === LATEST_YEAR && f.sectorId === s.id)
              .reduce((sum, f) => sum + f.importValue, 0);
            return (
              <Link
                key={s.id}
                to={`/sectors/${s.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    border: `1px solid ${SECTOR_COLORS[s.id] ?? '#707C74'}`,
                    borderRadius: '6px',
                    padding: '10px 14px',
                    backgroundColor: '#FCFAF2',
                    cursor: 'pointer',
                    minWidth: '130px',
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: SECTOR_COLORS[s.id] ?? '#707C74',
                      marginBottom: '6px',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: '"Source Serif 4", serif',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#2E5C6E',
                      marginBottom: '3px',
                    }}
                  >
                    {language === 'zh'
                      ? (SECTOR_LABELS[s.id]?.zh ?? s.labelZh)
                      : (SECTOR_LABELS[s.id]?.en ?? s.label)}
                  </div>
                  <div
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '10px',
                      color: '#707C74',
                    }}
                  >
                    {fmtB(val)} in 2024
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Comparison CTA ───────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid rgba(112,124,116,0.2)',
          paddingTop: '24px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '11px',
            color: '#707C74',
          }}
        >
          {language === 'zh' ? '進一步分析：' : 'Further analysis:'}
        </span>
        <Link
          to={`/compare?a=${economy.iso3}`}
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '11px',
            color: '#FCFAF2',
            backgroundColor: '#2E5C6E',
            padding: '5px 12px',
            borderRadius: '4px',
            textDecoration: 'none',
          }}
        >
          {language === 'zh' ? '與其他經濟體比較 →' : 'Compare with another economy →'}
        </Link>
        <Link
          to="/timeline"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '11px',
            color: '#2E5C6E',
            border: '1px solid #2E5C6E',
            padding: '5px 12px',
            borderRadius: '4px',
            textDecoration: 'none',
          }}
        >
          {language === 'zh' ? '關稅事件時間軸 →' : 'Tariff event timeline →'}
        </Link>
      </div>
    </main>
  );
}
