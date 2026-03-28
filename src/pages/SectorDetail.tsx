import { useParams, Link } from 'react-router-dom';
import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey as createSankey, sankeyLinkHorizontal } from 'd3-sankey';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RCTooltip,
  ReferenceLine,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import type { TradeFlow, Sector, TariffEvent } from '../types';

import rawFlows   from '../data/trade-flows.json';
import rawSectors from '../data/sectors.json';
import rawEvents  from '../data/tariff-events.json';

const allFlows   = rawFlows   as TradeFlow[];
const allSectors = rawSectors as Sector[];
const allEvents  = rawEvents  as TariffEvent[];

// ── Constants ─────────────────────────────────────────────────────────────────

const ECONOMY_COLORS: Record<string, string> = {
  CHN: '#17184B', VNM: '#5DAC81', IND: '#ED6D3D', TWN: '#0070C0',
  THA: '#8F77B5', MYS: '#6A8F8D', MEX: '#F8B500', JPN: '#522F60',
  KOR: '#4C6CB3', IDN: '#724938',
};

const FLAGS: Record<string, string> = {
  CHN: '🇨🇳', VNM: '🇻🇳', IND: '🇮🇳', TWN: '🇹🇼', THA: '🇹🇭',
  MYS: '🇲🇾', MEX: '🇲🇽', JPN: '🇯🇵', KOR: '🇰🇷', IDN: '🇮🇩',
};

const ECON_EN: Record<string, string> = {
  CHN: 'China',    VNM: 'Vietnam',  IND: 'India',    TWN: 'Taiwan',
  THA: 'Thailand', MYS: 'Malaysia', MEX: 'Mexico',   JPN: 'Japan',
  KOR: 'S. Korea', IDN: 'Indonesia',
};
const ECON_ZH: Record<string, string> = {
  CHN: '中國', VNM: '越南', IND: '印度', TWN: '台灣',
  THA: '泰國', MYS: '馬來西亞', MEX: '墨西哥', JPN: '日本',
  KOR: '韓國', IDN: '印尼',
};

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmtUSD(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtPct(v: number | null): string {
  if (v === null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function fmtPp(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}pp`;
}

// ── Data types ─────────────────────────────────────────────────────────────────

interface RankRow {
  iso3: string;
  value: number;         // USD, latest year
  share: number;         // %, latest year
  yoyChange: number | null; // %, vs previous calendar year
  shareChange: number;   // pp, vs baseline year
}

type SortField = 'value' | 'share' | 'yoyChange' | 'shareChange';
type SortDir   = 'asc' | 'desc';
type YearAgg   = Record<number, Record<string, number>>;

interface NodeExtra { name: string; color: string; }

// ── Data functions ─────────────────────────────────────────────────────────────

function buildAgg(sectorId: string): YearAgg {
  const agg: YearAgg = {};
  for (const f of allFlows) {
    if (f.sectorId !== sectorId || f.partner === 'USA') continue;
    if (!agg[f.year]) agg[f.year] = {};
    const yr = agg[f.year]!;
    yr[f.partner] = (yr[f.partner] ?? 0) + f.importValue;
  }
  return agg;
}

function buildRankRows(agg: YearAgg, baselineYear: number, latestYear: number): RankRow[] {
  const lAgg = agg[latestYear]       ?? {};
  const pAgg = agg[latestYear - 1]   ?? {};
  const bAgg = agg[baselineYear]     ?? {};

  const totalL = Object.values(lAgg).reduce((s, v) => s + v, 0);
  const totalB = Object.values(bAgg).reduce((s, v) => s + v, 0);

  return Object.entries(lAgg)
    .filter(([, v]) => v > 0)
    .map(([iso3, value]) => {
      const share     = totalL > 0 ? (value / totalL) * 100 : 0;
      const prevVal   = pAgg[iso3] ?? 0;
      const yoyChange = prevVal > 0 ? ((value - prevVal) / prevVal) * 100 : null;
      const baseVal   = bAgg[iso3] ?? 0;
      const baseShare = totalB > 0 ? (baseVal / totalB) * 100 : 0;
      return { iso3, value, share, yoyChange, shareChange: share - baseShare };
    })
    .sort((a, b) => b.value - a.value);
}

function buildTrend(
  agg: YearAgg,
  years: number[],
  isos: string[],
): Array<Record<string, string | number>> {
  return years.map(yr => {
    const yrAgg = agg[yr] ?? {};
    const total = Object.values(yrAgg).reduce((s, v) => s + v, 0);
    const row: Record<string, string | number> = { year: String(yr) };
    for (const iso3 of isos) {
      row[iso3] = total > 0
        ? parseFloat(((yrAgg[iso3] ?? 0) / total * 100).toFixed(2))
        : 0;
    }
    return row;
  });
}

// ── SankeyPanel ────────────────────────────────────────────────────────────────

interface SankeyPanelProps {
  agg: YearAgg;
  years: number[];
}

interface LinkTooltipSt {
  x: number; y: number;
  iso3: string; value: number; share: number;
}

function SankeyPanel({ agg, years }: SankeyPanelProps) {
  const { language }    = useLanguage();
  const svgRef          = useRef<SVGSVGElement>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'baseline' | 'latest'>('latest');
  const [cw, setCw]     = useState(600);
  const [isMobile, setIsMobile] = useState(false);
  const [tooltip, setTooltip]   = useState<LinkTooltipSt | null>(null);

  const baselineYear = years[0]  ?? 2018;
  const latestYear   = years[years.length - 1] ?? 2024;
  const selectedYear = mode === 'latest' ? latestYear : baselineYear;

  const yearAgg = useMemo(() => agg[selectedYear] ?? {}, [agg, selectedYear]);
  const total   = useMemo(
    () => Object.values(yearAgg).reduce((s, v) => s + v, 0),
    [yearAgg],
  );

  const barData = useMemo(() =>
    Object.entries(yearAgg)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([iso3, value]) => ({
        iso3,
        name:  language === 'zh' ? (ECON_ZH[iso3] ?? iso3) : (ECON_EN[iso3] ?? iso3),
        value: parseFloat((value / 1e9).toFixed(2)),
      })),
  [yearAgg, language]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 600;
      setCw(w);
      setIsMobile(w < 480);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || isMobile || Object.keys(yearAgg).length === 0) return;

    const HEIGHT = 380;
    const mg     = { top: 10, right: 120, bottom: 10, left: 164 };
    const innerW = cw - mg.left - mg.right;
    const innerH = HEIGHT - mg.top - mg.bottom;
    if (innerW <= 40) return;

    const svg = d3.select(svgRef.current)
      .attr('width', cw)
      .attr('height', HEIGHT);

    svg.selectAll('g.sankey-root')
      .transition().duration(200).attr('opacity', 0).remove();

    const econEntries = Object.entries(yearAgg)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const nodeList: NodeExtra[] = [
      ...econEntries.map(([iso3]) => ({
        name:  iso3,
        color: ECONOMY_COLORS[iso3] ?? '#707C74',
      })),
      { name: '__US__', color: '#622954' },
    ];
    const usIdx = nodeList.length - 1;

    const links = econEntries.map(([, value], i) => ({
      source: i,
      target: usIdx,
      value,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layout = createSankey<NodeExtra, any>()
      .nodeWidth(12)
      .nodePadding(7)
      .extent([[0, 0], [innerW, innerH]]);

    const graph = layout({
      nodes: nodeList.map(n => ({ ...n })),
      links: links.map(l => ({ ...l })),
    });

    const root = svg.append('g')
      .attr('class', 'sankey-root')
      .attr('transform', `translate(${mg.left},${mg.top})`)
      .attr('opacity', 0);

    // Links
    root.append('g')
      .selectAll('path')
      .data(graph.links)
      .join('path')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('d', sankeyLinkHorizontal() as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('stroke', (d: any) => String((d.source as NodeExtra).color))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('stroke-width', (d: any) => Math.max(1, Number(d.width ?? 1)))
        .attr('fill', 'none')
        .attr('opacity', 0.28)
        .on('mouseover', function(event: MouseEvent, d: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          d3.select(this as any).attr('opacity', 0.62);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fd   = d as any;
          const iso3 = String((fd.source as NodeExtra).name);
          const val  = Number(fd.value);
          const rect = containerRef.current?.getBoundingClientRect();
          setTooltip({
            x: event.clientX - (rect?.left ?? 0) + 12,
            y: event.clientY - (rect?.top  ?? 0) - 52,
            iso3, value: val,
            share: total > 0 ? (val / total) * 100 : 0,
          });
        })
        .on('mouseout', function() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          d3.select(this as any).attr('opacity', 0.28);
          setTooltip(null);
        });

    // Nodes
    root.append('g')
      .selectAll('rect')
      .data(graph.nodes)
      .join('rect')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('x',      (d: any) => Number(d.x0 ?? 0))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('y',      (d: any) => Number(d.y0 ?? 0))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('height', (d: any) => Math.max(2, Number(d.y1 ?? 0) - Number(d.y0 ?? 0)))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('width',  (d: any) => Number(d.x1 ?? 0) - Number(d.x0 ?? 0))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('fill',   (d: any) => String(d.color))
        .attr('rx', 2);

    // Economy labels (left)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph.nodes.forEach((d: any) => {
      const iso3 = String(d.name);
      if (iso3 === '__US__') return;
      const x0   = Number(d.x0 ?? 0);
      const midY = (Number(d.y0 ?? 0) + Number(d.y1 ?? 0)) / 2;
      const val  = Number(d.value ?? 0);
      const pct  = total > 0 ? (val / total) * 100 : 0;
      const flag = FLAGS[iso3] ?? '';
      const name = language === 'zh' ? (ECON_ZH[iso3] ?? iso3) : (ECON_EN[iso3] ?? iso3);

      root.append('text')
        .attr('x', x0 - 8).attr('y', midY - 5)
        .attr('text-anchor', 'end')
        .attr('font-family', '"Source Serif 4", serif')
        .attr('font-size', '11px').attr('fill', '#343434')
        .text(`${flag} ${name}`);

      root.append('text')
        .attr('x', x0 - 8).attr('y', midY + 8)
        .attr('text-anchor', 'end')
        .attr('font-family', '"JetBrains Mono", monospace')
        .attr('font-size', '9px').attr('fill', '#707C74')
        .text(`${pct.toFixed(1)}%  ${fmtUSD(val)}`);
    });

    // U.S. Imports label (right)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usNode = graph.nodes.find((d: any) => String(d.name) === '__US__');
    if (usNode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fd   = usNode as any;
      const x1   = Number(fd.x1 ?? 0);
      const midY = (Number(fd.y0 ?? 0) + Number(fd.y1 ?? 0)) / 2;

      root.append('text')
        .attr('x', x1 + 8).attr('y', midY - 5)
        .attr('text-anchor', 'start')
        .attr('font-family', '"Source Serif 4", serif')
        .attr('font-size', '12px').attr('fill', '#622954').attr('font-weight', '600')
        .text(language === 'zh' ? '美國進口' : 'U.S. Imports');

      root.append('text')
        .attr('x', x1 + 8).attr('y', midY + 10)
        .attr('text-anchor', 'start')
        .attr('font-family', '"JetBrains Mono", monospace')
        .attr('font-size', '10px').attr('fill', '#707C74')
        .text(fmtUSD(total));
    }

    root.transition().duration(600).attr('opacity', 1);

    return () => { svg.selectAll('g.sankey-root').remove(); };
  }, [yearAgg, total, cw, isMobile, language]);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily:      '"JetBrains Mono", monospace',
    fontSize:        '11px',
    padding:         '3px 12px',
    border:          '1px solid #2E5C6E',
    borderRadius:    '4px',
    cursor:          'pointer',
    color:           active ? '#FCFAF2' : '#2E5C6E',
    backgroundColor: active ? '#2E5C6E' : 'transparent',
  });

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <button style={btnStyle(mode === 'baseline')} onClick={() => setMode('baseline')}>
          {baselineYear} {language === 'zh' ? '基準年' : 'Baseline'}
        </button>
        <button style={btnStyle(mode === 'latest')} onClick={() => setMode('latest')}>
          {latestYear} {language === 'zh' ? '最新年' : 'Latest'}
        </button>
      </div>

      {!isMobile && (
        <svg ref={svgRef} style={{ width: '100%', display: 'block', overflow: 'visible' }} />
      )}

      {isMobile && (
        <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 32 + 40)}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 0, right: 70, bottom: 0, left: 62 }}
          >
            <XAxis
              type="number"
              tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fill: '#707C74' }}
              tickFormatter={v => `$${v}B`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={60}
              tick={{ fontFamily: '"Source Serif 4", serif', fontSize: 11, fill: '#343434' }}
            />
            <RCTooltip
              formatter={(v: unknown) => [
                `$${Number(v).toFixed(1)}B`,
                language === 'zh' ? '進口額' : 'Imports',
              ]}
              contentStyle={{
                fontFamily:      '"JetBrains Mono", monospace',
                fontSize:        '11px',
                backgroundColor: '#2D3748',
                border:          'none',
                color:           '#FCFAF2',
                borderRadius:    '4px',
              }}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {barData.map(e => (
                <Cell key={e.iso3} fill={ECONOMY_COLORS[e.iso3] ?? '#707C74'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x, top: tooltip.y,
          backgroundColor: '#2D3748', color: '#FCFAF2',
          fontFamily: '"JetBrains Mono", monospace', fontSize: '11px',
          lineHeight: 1.6, padding: '6px 10px', borderRadius: '4px',
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
        }}>
          <div>
            {FLAGS[tooltip.iso3] ?? ''}{' '}
            {language === 'zh' ? (ECON_ZH[tooltip.iso3] ?? tooltip.iso3) : (ECON_EN[tooltip.iso3] ?? tooltip.iso3)}
          </div>
          <div>{fmtUSD(tooltip.value)} · {tooltip.share.toFixed(1)}%</div>
        </div>
      )}

      <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#707C74', marginTop: '8px' }}>
        Source: UN Comtrade · U.S. sector imports by source economy · {selectedYear} · USD
      </p>
    </div>
  );
}

// ── Rankings Table ─────────────────────────────────────────────────────────────

interface RankingsTableProps {
  rows: RankRow[];
  baselineYear: number;
  latestYear: number;
}

function RankingsTable({ rows, baselineYear, latestYear }: RankingsTableProps) {
  const { language }    = useLanguage();
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortField] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      const bv = b[sortField] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      const diff = bv - av;
      return sortDir === 'desc' ? diff : -diff;
    });
  }, [rows, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function arrow(f: SortField) {
    if (f !== sortField) return ' ↕';
    return sortDir === 'desc' ? ' ↓' : ' ↑';
  }

  const col = (en: string, zh: string) => language === 'zh' ? zh : en;

  // Stable rank = position in value-descending order (rows come pre-sorted by value)
  const rankMap = useMemo(
    () => Object.fromEntries(rows.map((r, i) => [r.iso3, i + 1])),
    [rows],
  );

  const TH_BG = '#622954';
  const thBase: React.CSSProperties = {
    backgroundColor: TH_BG,
    color:           '#FCFAF2',
    fontFamily:      '"JetBrains Mono", monospace',
    fontSize:        '10px',
    letterSpacing:   '0.05em',
    padding:         '9px 10px',
    whiteSpace:      'nowrap',
    userSelect:      'none',
    textAlign:       'right' as const,
  };

  const tdBase: React.CSSProperties = {
    padding:      '8px 10px',
    fontFamily:   '"JetBrains Mono", monospace',
    fontSize:     '12px',
    textAlign:    'right' as const,
    borderBottom: '1px solid rgba(112,124,116,0.15)',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '560px' }}>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: 'center', width: '44px' }}>
              {col('Rank', '排名')}
            </th>
            <th style={{ ...thBase, textAlign: 'left', minWidth: '140px' }}>
              {col('Economy', '經濟體')}
            </th>
            <th style={{ ...thBase, cursor: 'pointer' }} onClick={() => toggleSort('value')}>
              {col('Import Value', '進口總額')}{arrow('value')}
            </th>
            <th style={{ ...thBase, cursor: 'pointer' }} onClick={() => toggleSort('share')}>
              {col('Share %', '市佔率')}{arrow('share')}
            </th>
            <th style={{ ...thBase, cursor: 'pointer' }} onClick={() => toggleSort('yoyChange')}>
              {col('YoY Chg', '年增率')}{arrow('yoyChange')}
            </th>
            <th style={{ ...thBase, cursor: 'pointer' }} onClick={() => toggleSort('shareChange')}>
              {col(`vs ${baselineYear}`, `較${baselineYear}年`)}{arrow('shareChange')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, ri) => {
            const bg      = ri % 2 === 0 ? '#FCFAF2' : '#F3F3F3';
            const flag    = FLAGS[row.iso3] ?? '';
            const name    = language === 'zh' ? (ECON_ZH[row.iso3] ?? row.iso3) : (ECON_EN[row.iso3] ?? row.iso3);
            const rank    = rankMap[row.iso3] ?? ri + 1;
            const yoyClr  = row.yoyChange === null ? '#707C74' : row.yoyChange >= 0 ? '#5DAC81' : '#C00000';
            const scClr   = row.shareChange > 0 ? '#5DAC81' : row.shareChange < 0 ? '#C00000' : '#707C74';

            return (
              <tr key={row.iso3} style={{ backgroundColor: bg }}>
                <td style={{ ...tdBase, textAlign: 'center', color: '#707C74' }}>{rank}</td>
                <td style={{ ...tdBase, textAlign: 'left', fontFamily: '"Source Serif 4", serif', fontWeight: 500, color: '#343434' }}>
                  {flag} {name}
                </td>
                <td style={{ ...tdBase, color: '#343434' }}>{fmtUSD(row.value)}</td>
                <td style={{ ...tdBase, color: '#343434' }}>{row.share.toFixed(1)}%</td>
                <td style={{ ...tdBase, color: yoyClr, fontWeight: 600 }}>{fmtPct(row.yoyChange)}</td>
                <td style={{ ...tdBase, color: scClr, fontWeight: 600 }}>{fmtPp(row.shareChange)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#707C74', marginTop: '8px' }}>
        Source: UN Comtrade · {latestYear} · YoY vs {latestYear - 1} · Share change vs {baselineYear}
      </p>
    </div>
  );
}

// ── Trend Chart ────────────────────────────────────────────────────────────────

interface TrendChartProps {
  trendData:  Array<Record<string, string | number>>;
  top5:       string[];
  eventYears: Record<string, string>;  // year string → event title
}

function TrendChart({ trendData, top5, eventYears }: TrendChartProps) {
  const { language } = useLanguage();
  const econName = (iso3: string) =>
    language === 'zh' ? (ECON_ZH[iso3] ?? iso3) : (ECON_EN[iso3] ?? iso3);

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={trendData} margin={{ top: 14, right: 20, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,124,116,0.2)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fill: '#707C74' }}
            axisLine={{ stroke: 'rgba(112,124,116,0.4)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fill: '#707C74' }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <RCTooltip
            formatter={(v: unknown, name: unknown) => [
              `${Number(v).toFixed(1)}%`,
              econName(String(name)),
            ]}
            contentStyle={{
              fontFamily:      '"JetBrains Mono", monospace',
              fontSize:        '11px',
              backgroundColor: '#2D3748',
              border:          'none',
              color:           '#FCFAF2',
              borderRadius:    '4px',
            }}
            labelStyle={{ color: 'rgba(252,250,242,0.55)', marginBottom: '2px' }}
          />

          {Object.entries(eventYears).map(([yr, title]) => (
            <ReferenceLine
              key={yr}
              x={yr}
              stroke="#F8B500"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{
                value:      title.length > 28 ? title.substring(0, 26) + '…' : title,
                position:   'insideTopLeft',
                fontSize:   8,
                fill:       '#707C74',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            />
          ))}

          {top5.map(iso3 => (
            <Area
              key={iso3}
              type="monotone"
              dataKey={iso3}
              stroke={ECONOMY_COLORS[iso3]    ?? '#2E5C6E'}
              fill={ECONOMY_COLORS[iso3]      ?? '#2E5C6E'}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}

          <Legend
            wrapperStyle={{ paddingTop: '14px' }}
            formatter={(value: string) => (
              <span style={{ fontFamily: '"Source Serif 4", serif', fontSize: '12px', color: '#343434' }}>
                {FLAGS[value] ?? ''} {econName(value)}
              </span>
            )}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#707C74', marginTop: '4px' }}>
        Source: UN Comtrade · Share of U.S. sector imports · Top 5 by latest-year import value ·
        {language === 'zh' ? ' 虛線：關稅政策事件' : ' Dashed lines: tariff policy events'}
      </p>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────

function SectionHead({ label }: { label: string }) {
  return (
    <h2 style={{
      fontFamily:   '"Source Serif 4", serif',
      fontSize:     'clamp(17px, 2.5vw, 22px)',
      fontWeight:    600,
      color:         '#622954',
      margin:        '0 0 20px',
      paddingTop:    '48px',
      borderTop:     '1px solid rgba(112,124,116,0.2)',
    }}>
      {label}
    </h2>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SectorDetail() {
  const { sectorId } = useParams<{ sectorId: string }>();
  const { language } = useLanguage();

  const sector = allSectors.find(s => s.id === sectorId);

  const agg = useMemo(
    () => (sectorId ? buildAgg(sectorId) : ({} as YearAgg)),
    [sectorId],
  );

  const years = useMemo(
    () => Object.keys(agg).map(Number).sort(),
    [agg],
  );

  const baselineYear = years[0]  ?? 2018;
  const latestYear   = years[years.length - 1] ?? 2024;

  const rankRows = useMemo(
    () => buildRankRows(agg, baselineYear, latestYear),
    [agg, baselineYear, latestYear],
  );

  const top5Isos = useMemo(() => rankRows.slice(0, 5).map(r => r.iso3), [rankRows]);

  const trendData = useMemo(
    () => buildTrend(agg, years, top5Isos),
    [agg, years, top5Isos],
  );

  // Tariff events for this sector, mapped to year strings within data range
  const eventYears = useMemo(() => {
    const yrSet = new Set(years.map(String));
    const map: Record<string, string> = {};
    if (!sectorId) return map;
    for (const evt of allEvents) {
      if (!evt.affectedSectors.includes(sectorId)) continue;
      const yr = evt.date.substring(0, 4);
      if (yrSet.has(yr)) map[yr] = evt.title;
    }
    return map;
  }, [years, sectorId]);

  // ── Not found ──────────────────────────────────────────────────────────────

  if (!sector) {
    return (
      <div style={{ paddingTop: '40px', textAlign: 'center' }}>
        <p style={{ fontFamily: '"Source Serif 4", serif', fontSize: '18px', color: '#622954', marginBottom: '16px' }}>
          {language === 'zh' ? '找不到該產業' : 'Sector not found'}
        </p>
        <Link to="/" style={{
          fontFamily:     '"JetBrains Mono", monospace',
          fontSize:       '12px',
          color:          '#0070C0',
          textDecoration: 'none',
          borderBottom:   '1px solid rgba(0,112,192,0.4)',
        }}>
          {language === 'zh' ? '← 返回首頁' : '← Back to Briefing'}
        </Link>
      </div>
    );
  }

  const label      = language === 'zh' ? sector.labelZh      : sector.label;
  const keyInsight = language === 'zh' ? sector.keyInsightZh  : sector.keyInsight;
  const description = language === 'zh' ? sector.descriptionZh : sector.description;

  return (
    <div style={{ backgroundColor: '#FCFAF2', paddingTop: '32px', paddingBottom: '72px' }}>

      {/* ── Section 1: Header ─────────────────────────────────────────────── */}

      <nav style={{
        fontFamily:   '"JetBrains Mono", monospace',
        fontSize:     '11px',
        color:        '#707C74',
        marginBottom: '20px',
        display:      'flex',
        gap:          '6px',
        alignItems:   'center',
        flexWrap:     'wrap',
      }}>
        <Link to="/" style={{ color: '#707C74', textDecoration: 'none' }}>
          {language === 'zh' ? '首頁報告' : 'Briefing'}
        </Link>
        <span aria-hidden>›</span>
        <Link to="/" style={{ color: '#707C74', textDecoration: 'none' }}>
          {language === 'zh' ? '產業' : 'Sectors'}
        </Link>
        <span aria-hidden>›</span>
        <span style={{ color: '#343434' }}>{label}</span>
      </nav>

      <h1 style={{
        fontFamily:   '"Source Serif 4", serif',
        fontSize:     'clamp(22px, 4vw, 36px)',
        fontWeight:    600,
        color:         '#622954',
        margin:        '0 0 14px',
        lineHeight:    1.2,
      }}>
        {label}
      </h1>

      <p style={{
        fontFamily: '"Source Serif 4", serif',
        fontSize:   '16px',
        color:      '#2E5C6E',
        lineHeight:  1.7,
        maxWidth:   '760px',
        margin:     '0 0 12px',
      }}>
        {keyInsight}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {sector.hsCodes.map(hs => (
          <span key={hs} style={{
            fontFamily:   '"JetBrains Mono", monospace',
            fontSize:     '10px',
            color:        '#707C74',
            border:       '1px solid rgba(112,124,116,0.4)',
            borderRadius: '3px',
            padding:      '1px 6px',
          }}>
            HS {hs}
          </span>
        ))}
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#707C74' }}>
          · {description}
        </span>
      </div>

      {/* ── Section 2: Sankey ─────────────────────────────────────────────── */}

      <SectionHead label={language === 'zh' ? '貿易來源流向圖' : 'Trade Rerouting Flow'} />

      {years.length > 0 ? (
        <SankeyPanel agg={agg} years={years} />
      ) : (
        <p style={{ fontFamily: '"Source Serif 4", serif', color: '#707C74' }}>
          {language === 'zh' ? '暫無資料' : 'No data available for this sector.'}
        </p>
      )}

      {/* ── Section 3: Rankings ───────────────────────────────────────────── */}

      <SectionHead
        label={language === 'zh'
          ? `國別進口排名（${latestYear}年）`
          : `Country Rankings (${latestYear})`}
      />

      {rankRows.length > 0 ? (
        <RankingsTable rows={rankRows} baselineYear={baselineYear} latestYear={latestYear} />
      ) : (
        <p style={{ fontFamily: '"Source Serif 4", serif', color: '#707C74' }}>
          {language === 'zh' ? '暫無資料' : 'No data available.'}
        </p>
      )}

      {/* ── Section 4: Trend Lines ────────────────────────────────────────── */}

      <SectionHead
        label={language === 'zh' ? '市佔率趨勢（前五大來源）' : 'Import Share Trend — Top 5 Sources'}
      />

      {trendData.length > 1 && top5Isos.length > 0 ? (
        <TrendChart trendData={trendData} top5={top5Isos} eventYears={eventYears} />
      ) : (
        <p style={{ fontFamily: '"Source Serif 4", serif', color: '#707C74' }}>
          {language === 'zh' ? '資料不足以繪製趨勢圖' : 'Insufficient data for trend chart.'}
        </p>
      )}

    </div>
  );
}
