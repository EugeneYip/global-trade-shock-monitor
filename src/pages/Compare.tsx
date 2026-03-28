import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { Economy, TradeFlow, Sector } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import allEconomies from '../data/economies.json';
import allFlows from '../data/trade-flows.json';
import allSectors from '../data/sectors.json';

// ── Constants ─────────────────────────────────────────────────────────────────

const TRACKED = ['CHN', 'VNM', 'IND', 'TWN', 'THA', 'MYS', 'MEX', 'JPN', 'KOR', 'IDN'];
const TRACKED_SET = new Set(TRACKED);

const ECONOMY_FLAGS: Record<string, string> = {
  CHN: '🇨🇳', VNM: '🇻🇳', IND: '🇮🇳', TWN: '🇹🇼', THA: '🇹🇭',
  MYS: '🇲🇾', MEX: '🇲🇽', JPN: '🇯🇵', KOR: '🇰🇷', IDN: '🇮🇩',
};

const ECONOMY_COLORS: Record<string, string> = {
  CHN: '#17184B', VNM: '#5DAC81', IND: '#ED6D3D', TWN: '#0070C0', THA: '#8F77B5',
  MYS: '#6A8F8D', MEX: '#F8B500', JPN: '#522F60', KOR: '#4C6CB3', IDN: '#724938',
};

const ROLE_META: Record<string, { en: string; zh: string; color: string }> = {
  target:      { en: 'Target',       zh: '主要目標',   color: '#C00000' },
  beneficiary: { en: 'Beneficiary',  zh: '受益方',     color: '#5DAC81' },
  squeezed:    { en: 'Squeezed',     zh: '中間受壓',   color: '#F8B500' },
  neutral:     { en: 'Neutral',      zh: '中立方',     color: '#707C74' },
  imposer:     { en: 'Imposer',      zh: '關稅發動方', color: '#622954' },
};

const SECTOR_SHORT: Record<string, { en: string; zh: string }> = {
  semiconductors: { en: 'Semicon.',  zh: '半導體' },
  smartphones:    { en: 'Phones',    zh: '手機' },
  'ev-battery':   { en: 'EV/Batt.', zh: '電動車' },
  textiles:       { en: 'Textiles',  zh: '紡織' },
};

const SLOT_LABELS_EN = ['Economy A', 'Economy B', 'Economy C'] as const;
const SLOT_LABELS_ZH = ['第一個', '第二個', '第三個'] as const;

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtB(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
}

function validateSlot(v: string | null): string {
  return v && TRACKED_SET.has(v) ? v : '';
}

// Auto-generates a comparison summary from actual data values
function generateAnalysis(
  selected: string[],
  econMap: Record<string, Economy>,
  flows: TradeFlow[],
  sectors: Sector[],
  lang: 'en' | 'zh',
): string {
  if (selected.length === 0) return '';

  const stats = selected.map(iso3 => {
    const econ = econMap[iso3]!;
    const sectorVals: Record<string, number> = {};
    for (const s of sectors) {
      sectorVals[s.id] = flows
        .filter(f => f.partner === iso3 && f.year === 2024 && f.sectorId === s.id)
        .reduce((sum, f) => sum + f.importValue, 0);
    }
    const total2024 = Object.values(sectorVals).reduce((a, b) => a + b, 0);
    let topId = '';
    let topVal = 0;
    for (const [id, val] of Object.entries(sectorVals)) {
      if (val > topVal) { topId = id; topVal = val; }
    }
    const topSec = sectors.find(s => s.id === topId);
    const topLabel = topSec ? (lang === 'zh' ? topSec.labelZh : topSec.label) : topId;
    return {
      iso3, econ,
      name: lang === 'zh' ? econ.nameZh : econ.name,
      topId, topLabel, total2024, sectorVals,
    };
  });

  const out: string[] = [];

  // Per-economy sentence
  for (const st of stats) {
    const sign = st.econ.shareChangeVsChina >= 0 ? '+' : '';
    const pp   = `${sign}${st.econ.shareChangeVsChina.toFixed(2)}pp`;
    const val  = `$${(st.total2024 / 1e9).toFixed(1)}B`;
    out.push(
      lang === 'zh'
        ? `${st.name}自2018年起美國進口份額變化${pp}，2024年最大出口類別為${st.topLabel}（${val}）。`
        : `${st.name} saw a ${pp} shift in U.S. import share since 2018, with ${st.topLabel} as its top sector in 2024 (${val}).`,
    );
  }

  if (stats.length >= 2) {
    // Leader / trailer by share-change
    const byShare = [...stats].sort((a, b) => b.econ.shareChangeVsChina - a.econ.shareChangeVsChina);
    const leader  = byShare[0]!;
    const trailer = byShare[byShare.length - 1]!;
    if (leader.iso3 !== trailer.iso3) {
      const lSign = leader.econ.shareChangeVsChina >= 0 ? '+' : '';
      out.push(
        lang === 'zh'
          ? `綜合比較，${leader.name}份額增長最為突出（${lSign}${leader.econ.shareChangeVsChina.toFixed(2)}pp），${trailer.name}相對落後。`
          : `Among the selected, ${leader.name} leads with the strongest share gain (${lSign}${leader.econ.shareChangeVsChina.toFixed(2)}pp), while ${trailer.name} lags.`,
      );
    }

    // Sector with the largest cross-economy spread (most differentiated)
    let maxSpread = 0;
    let spreadId  = '';
    for (const s of sectors) {
      const vals   = stats.map(st => st.sectorVals[s.id] ?? 0);
      const spread = Math.max(...vals) - Math.min(...vals);
      if (spread > maxSpread) { maxSpread = spread; spreadId = s.id; }
    }
    if (spreadId && maxSpread > 0) {
      const sec      = sectors.find(s => s.id === spreadId)!;
      const secName  = lang === 'zh' ? sec.labelZh : sec.label;
      const secLeader = [...stats].sort(
        (a, b) => (b.sectorVals[spreadId] ?? 0) - (a.sectorVals[spreadId] ?? 0),
      )[0]!;
      const slVal = `$${((secLeader.sectorVals[spreadId] ?? 0) / 1e9).toFixed(1)}B`;
      out.push(
        lang === 'zh'
          ? `在${secName}領域，${secLeader.name}以${slVal}居所選組合之首（2024年）。`
          : `In ${secName}, ${secLeader.name} leads the group at ${slVal} (2024).`,
      );
    }
  }

  return out.join(' ');
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();

  const [slots, setSlots] = useState<[string, string, string]>([
    validateSlot(searchParams.get('a')),
    validateSlot(searchParams.get('b')),
    validateSlot(searchParams.get('c')),
  ]);

  // Keep URL in sync with selection state
  useEffect(() => {
    const p: Record<string, string> = {};
    if (slots[0]) p['a'] = slots[0];
    if (slots[1]) p['b'] = slots[1];
    if (slots[2]) p['c'] = slots[2];
    setSearchParams(p, { replace: true });
  }, [slots, setSearchParams]);

  const econMap = useMemo(() => {
    const m: Record<string, Economy> = {};
    for (const e of allEconomies as Economy[]) m[e.iso3] = e;
    return m;
  }, []);

  const selected = useMemo(() => slots.filter(s => s !== ''), [slots]);

  const totalByYear = useMemo(() => {
    const m: Record<number, number> = {};
    for (const f of allFlows as TradeFlow[]) {
      m[f.year] = (m[f.year] ?? 0) + f.importValue;
    }
    return m;
  }, []);

  // Grouped bar data: one row per sector, one column per selected economy (2024)
  const sectorBarData = useMemo(() => {
    return (allSectors as Sector[]).map(s => {
      const row: Record<string, number | string> = {
        sector: SECTOR_SHORT[s.id]?.[language === 'zh' ? 'zh' : 'en'] ?? s.id,
      };
      for (const iso3 of selected) {
        row[iso3] = Math.round(
          (allFlows as TradeFlow[])
            .filter(f => f.partner === iso3 && f.year === 2024 && f.sectorId === s.id)
            .reduce((sum, f) => sum + f.importValue, 0)
            / 1e9 * 10,
        ) / 10;
      }
      return row;
    });
  }, [selected, language]);

  // Line chart data: share of tracked US imports per year, per selected economy
  const shareTimelineData = useMemo(() => {
    return YEARS.map(year => {
      const row: Record<string, number | string> = { year: String(year) };
      for (const iso3 of selected) {
        const val = (allFlows as TradeFlow[])
          .filter(f => f.partner === iso3 && f.year === year)
          .reduce((sum, f) => sum + f.importValue, 0);
        row[iso3] = Math.round((val / (totalByYear[year] ?? 1)) * 1000) / 10;
      }
      return row;
    });
  }, [selected, totalByYear]);

  // Top sector label per economy (2024)
  const topSectors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const iso3 of selected) {
      const byId: Record<string, number> = {};
      for (const f of (allFlows as TradeFlow[]).filter(f => f.partner === iso3 && f.year === 2024)) {
        byId[f.sectorId] = (byId[f.sectorId] ?? 0) + f.importValue;
      }
      let best = { id: '', val: 0 };
      for (const [id, val] of Object.entries(byId)) {
        if (val > best.val) best = { id, val };
      }
      const sec = (allSectors as Sector[]).find(s => s.id === best.id);
      out[iso3] = sec ? (language === 'zh' ? sec.labelZh : sec.label) : '—';
    }
    return out;
  }, [selected, language]);

  // Total 2024 import value per economy
  const totals2024 = useMemo(() => {
    const out: Record<string, number> = {};
    for (const iso3 of selected) {
      out[iso3] = (allFlows as TradeFlow[])
        .filter(f => f.partner === iso3 && f.year === 2024)
        .reduce((sum, f) => sum + f.importValue, 0);
    }
    return out;
  }, [selected]);

  // Auto-generated analysis text
  const analysis = useMemo(
    () => generateAnalysis(selected, econMap, allFlows as TradeFlow[], allSectors as Sector[], language),
    [selected, econMap, language],
  );

  // Update one slot; compact remaining slots up when clearing
  const updateSlot = (idx: 0 | 1 | 2, val: string) => {
    const next = [...slots] as [string, string, string];
    next[idx] = val;
    if (!val) {
      const filled = next.filter(s => s !== '');
      setSlots([filled[0] ?? '', filled[1] ?? '', filled[2] ?? '']);
    } else {
      setSlots(next);
    }
  };

  // ── Shared styles ────────────────────────────────────────────────────────
  const BORDER = '1px solid rgba(112,124,116,0.2)';

  const tdBase: React.CSSProperties = {
    padding: '10px 16px',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '12px',
    borderBottom: BORDER,
    verticalAlign: 'middle',
  };

  const thBase: React.CSSProperties = {
    padding: '10px 16px',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: BORDER,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  const tooltipStyle: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '11px',
    backgroundColor: '#2D3748',
    border: 'none',
    color: '#FCFAF2',
    borderRadius: '4px',
  };

  const sourceStyle: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '10px',
    color: '#707C74',
    marginTop: '8px',
  };

  return (
    <main
      style={{
        maxWidth: '960px',
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
        <span style={{ color: '#343434' }}>
          {language === 'zh' ? '比較' : 'Compare'}
        </span>
      </nav>

      {/* Page header */}
      <h1
        style={{
          fontFamily: '"Source Serif 4", serif',
          fontSize: '28px',
          fontWeight: 700,
          color: '#622954',
          margin: '0 0 6px',
        }}
      >
        {language === 'zh' ? '經濟體比較' : 'Economy Comparison'}
      </h1>
      <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', color: '#707C74', margin: '0 0 28px' }}>
        {language === 'zh'
          ? '選擇最多三個經濟體，比較其在美國進口市場的份額走勢與行業分佈。'
          : 'Select up to three economies to compare U.S. import share trajectory and sector composition.'}
      </p>

      {/* ── Section 1: Economy Selectors ─────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <SectionHead label={language === 'zh' ? '選擇經濟體' : 'Select Economies'} />
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {([0, 1, 2] as const).map(i => {
            const isDisabled = (i === 1 && !slots[0]) || (i === 2 && !slots[1]);
            const current    = slots[i];
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '10px',
                    color: '#707C74',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {language === 'zh' ? SLOT_LABELS_ZH[i] : SLOT_LABELS_EN[i]}
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <select
                    value={current}
                    disabled={isDisabled}
                    onChange={e => updateSlot(i, e.target.value)}
                    style={{
                      fontFamily: '"Source Serif 4", serif',
                      fontSize: '13px',
                      color: current ? '#343434' : '#707C74',
                      backgroundColor: '#FCFAF2',
                      border: `1px solid ${current ? ECONOMY_COLORS[current] ?? 'rgba(112,124,116,0.4)' : 'rgba(112,124,116,0.35)'}`,
                      borderRadius: '5px',
                      padding: '7px 10px',
                      cursor: isDisabled ? 'default' : 'pointer',
                      opacity: isDisabled ? 0.4 : 1,
                      minWidth: '190px',
                    }}
                  >
                    <option value="">{language === 'zh' ? '— 選擇 —' : '— Select —'}</option>
                    {TRACKED.map(iso3 => {
                      const econ = econMap[iso3];
                      if (!econ) return null;
                      const flag   = ECONOMY_FLAGS[iso3] ?? '';
                      const name   = language === 'zh' ? econ.nameZh : econ.name;
                      const taken  = slots.some((s, j) => j !== i && s === iso3);
                      return (
                        <option key={iso3} value={iso3} disabled={taken}>
                          {flag} {name}
                        </option>
                      );
                    })}
                  </select>

                  {current && (
                    <button
                      onClick={() => updateSlot(i, '')}
                      title={language === 'zh' ? '清除' : 'Clear'}
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '14px',
                        color: '#707C74',
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(112,124,116,0.3)',
                        borderRadius: '4px',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {selected.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '56px 24px',
            color: '#707C74',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px',
            border: '1px dashed rgba(112,124,116,0.35)',
            borderRadius: '8px',
          }}
        >
          {language === 'zh'
            ? '↑ 請選擇至少一個經濟體以開始比較'
            : '↑ Select at least one economy above to begin comparison'}
        </div>
      )}

      {selected.length > 0 && (
        <>
          {/* ── Section 2: Stat Comparison Table ──────────────────────────────── */}
          <div style={{ marginBottom: '36px' }}>
            <SectionHead label={language === 'zh' ? '指標比較' : 'Stat Comparison'} />
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '380px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#622954' }}>
                    <th style={{ ...thBase, color: '#FCFAF2', width: '160px' }}>
                      {language === 'zh' ? '指標' : 'Metric'}
                    </th>
                    {selected.map(iso3 => {
                      const econ = econMap[iso3]!;
                      return (
                        <th key={iso3} style={{ ...thBase, color: '#FCFAF2' }}>
                          <span style={{ marginRight: '5px' }}>{ECONOMY_FLAGS[iso3]}</span>
                          {language === 'zh' ? econ.nameZh : econ.name}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Total Trade */}
                  <tr>
                    <td style={{ ...tdBase, color: '#707C74' }}>
                      {language === 'zh' ? '對美進口總額' : 'Total Trade'}
                    </td>
                    {selected.map(iso3 => (
                      <td key={iso3} style={{ ...tdBase, color: '#343434' }}>
                        {fmtB(totals2024[iso3] ?? 0)}
                        <span style={{ color: '#707C74', fontSize: '10px', marginLeft: '4px' }}>
                          {language === 'zh' ? '（2024）' : '(2024)'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Row 2: Share Change */}
                  <tr style={{ backgroundColor: '#F3F3F3' }}>
                    <td style={{ ...tdBase, color: '#707C74' }}>
                      {language === 'zh' ? '份額變化 vs 2018' : 'Share Change vs 2018'}
                    </td>
                    {selected.map(iso3 => {
                      const val  = econMap[iso3]?.shareChangeVsChina ?? 0;
                      const sign = val >= 0 ? '+' : '';
                      return (
                        <td
                          key={iso3}
                          style={{ ...tdBase, color: val >= 0 ? '#5DAC81' : '#C00000', fontWeight: 700 }}
                        >
                          {sign}{val.toFixed(2)}pp
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 3: Top Sector */}
                  <tr>
                    <td style={{ ...tdBase, color: '#707C74' }}>
                      {language === 'zh' ? '最大出口類別' : 'Top Sector 2024'}
                    </td>
                    {selected.map(iso3 => (
                      <td key={iso3} style={{ ...tdBase, color: '#343434' }}>
                        {topSectors[iso3] ?? '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Row 4: Role */}
                  <tr style={{ backgroundColor: '#F3F3F3' }}>
                    <td style={{ ...tdBase, color: '#707C74' }}>
                      {language === 'zh' ? '角色定位' : 'Role'}
                    </td>
                    {selected.map(iso3 => {
                      const econ = econMap[iso3]!;
                      const rm   = ROLE_META[econ.role] ?? ROLE_META['neutral']!;
                      return (
                        <td key={iso3} style={{ ...tdBase }}>
                          <span
                            style={{
                              backgroundColor: rm.color,
                              color: '#FCFAF2',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '10px',
                              padding: '2px 7px',
                              borderRadius: '3px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {language === 'zh' ? rm.zh : rm.en}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Section 3: Sector-by-Sector Grouped Bar ───────────────────────── */}
          <div style={{ marginBottom: '36px' }}>
            <SectionHead
              label={language === 'zh' ? '分行業進口比較（2024年）' : 'Sector-by-Sector Comparison (2024)'}
            />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sectorBarData} margin={{ top: 4, right: 12, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,124,116,0.15)" vertical={false} />
                <XAxis
                  dataKey="sector"
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
                    const iso3  = String(name ?? '');
                    const econ  = econMap[iso3];
                    const flag  = ECONOMY_FLAGS[iso3] ?? '';
                    const label = econ ? `${flag} ${language === 'zh' ? econ.nameZh : econ.name}` : iso3;
                    return [`$${Number(v).toFixed(1)}B`, label];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  formatter={(value: string) => {
                    const econ = econMap[value];
                    const flag = ECONOMY_FLAGS[value] ?? '';
                    const name = econ ? (language === 'zh' ? econ.nameZh : econ.name) : value;
                    return (
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#343434' }}>
                        {flag} {name}
                      </span>
                    );
                  }}
                />
                {selected.map(iso3 => (
                  <Bar
                    key={iso3}
                    dataKey={iso3}
                    fill={ECONOMY_COLORS[iso3] ?? '#707C74'}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <p style={sourceStyle}>
              Source: UN Comtrade · U.S. imports by sector · 2024 · USD billions
            </p>
          </div>

          {/* ── Section 4: Trade Trajectory LineChart ─────────────────────────── */}
          <div style={{ marginBottom: '36px' }}>
            <SectionHead
              label={language === 'zh' ? '進口份額走勢（2018–2024）' : 'Trade Share Trajectory (2018–2024)'}
            />
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={shareTimelineData} margin={{ top: 4, right: 12, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,124,116,0.15)" />
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
                    const iso3  = String(name ?? '');
                    const econ  = econMap[iso3];
                    const flag  = ECONOMY_FLAGS[iso3] ?? '';
                    const label = econ ? `${flag} ${language === 'zh' ? econ.nameZh : econ.name}` : iso3;
                    return [`${Number(v).toFixed(1)}%`, label];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  formatter={(value: string) => {
                    const econ = econMap[value];
                    const flag = ECONOMY_FLAGS[value] ?? '';
                    const name = econ ? (language === 'zh' ? econ.nameZh : econ.name) : value;
                    return (
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#343434' }}>
                        {flag} {name}
                      </span>
                    );
                  }}
                />
                {selected.map(iso3 => (
                  <Line
                    key={iso3}
                    type="monotone"
                    dataKey={iso3}
                    stroke={ECONOMY_COLORS[iso3] ?? '#707C74'}
                    strokeWidth={2.5}
                    dot={{ fill: ECONOMY_COLORS[iso3] ?? '#707C74', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <p style={sourceStyle}>
              Source: UN Comtrade · Share of tracked U.S. imports (10 economies) · 2018–2024
            </p>
          </div>

          {/* ── Section 5: Analysis Note ──────────────────────────────────────── */}
          {analysis && (
            <div style={{ marginBottom: '36px' }}>
              <SectionHead label={language === 'zh' ? '自動分析摘要' : 'Analysis Note'} />
              <div
                style={{
                  backgroundColor: '#F3F3F3',
                  border: '1px solid rgba(112,124,116,0.2)',
                  borderLeft: '3px solid #0070C0',
                  borderRadius: '4px',
                  padding: '14px 18px',
                  fontFamily: '"Source Serif 4", serif',
                  fontSize: '13px',
                  lineHeight: 1.75,
                  color: '#343434',
                }}
              >
                {analysis}
              </div>
              <p style={sourceStyle}>
                {language === 'zh'
                  ? '本摘要由資料自動生成，數值反映UN Comtrade 2024年進口數據。'
                  : 'Auto-generated from UN Comtrade data. Values reflect 2024 import figures and 2018–2024 share differentials.'}
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
