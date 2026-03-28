import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey as createSankey, sankeyLinkHorizontal } from 'd3-sankey';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TradeFlow, Sector } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

// ── Color palettes ────────────────────────────────────────────────────────────

const ECONOMY_COLORS: Record<string, string> = {
  CHN: '#17184B',
  VNM: '#5DAC81',
  IND: '#ED6D3D',
  TWN: '#0070C0',
  THA: '#8F77B5',
  MYS: '#6A8F8D',
  MEX: '#F8B500',
  JPN: '#522F60',
  KOR: '#4C6CB3',
  IDN: '#724938',
};

const SECTOR_COLORS: Record<string, string> = {
  semiconductors: '#0070C0',
  smartphones:    '#66327C',
  'ev-battery':   '#5DAC81',
  textiles:       '#F8B500',
};

const ECONOMY_ORDER = ['CHN', 'VNM', 'IND', 'TWN', 'THA', 'MYS', 'MEX', 'JPN', 'KOR', 'IDN'];

const ECONOMY_LABELS: Record<string, { en: string; zh: string }> = {
  CHN: { en: 'China',     zh: '中國' },
  VNM: { en: 'Vietnam',   zh: '越南' },
  IND: { en: 'India',     zh: '印度' },
  TWN: { en: 'Taiwan',    zh: '台灣' },
  THA: { en: 'Thailand',  zh: '泰國' },
  MYS: { en: 'Malaysia',  zh: '馬來西亞' },
  MEX: { en: 'Mexico',    zh: '墨西哥' },
  JPN: { en: 'Japan',     zh: '日本' },
  KOR: { en: 'S.Korea',   zh: '韓國' },
  IDN: { en: 'Indonesia', zh: '印尼' },
};

const YEARS = [2018, 2020, 2022, 2024] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface NodeExtra { name: string; color: string; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SNode = NodeExtra & Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SLink = Record<string, any>;

interface Props {
  flows: TradeFlow[];
  sectors: Sector[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SankeyDiagram({ flows, sectors }: Props) {
  const { language } = useLanguage();
  const svgRef      = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [containerWidth, setContainerWidth] = useState(640);
  const [isMobile, setIsMobile]             = useState(false);

  // Watch container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 640;
      setContainerWidth(w);
      setIsMobile(w < 480);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Aggregate flows for selected year
  const { sankeyNodes, sankeyLinks } = useMemo(() => {
    const yearFlows = flows.filter(f => f.year === selectedYear);

    // Aggregate importValue by sectorId → partner
    const linkAgg: Record<string, number> = {};
    for (const f of yearFlows) {
      if (!ECONOMY_ORDER.includes(f.partner)) continue;
      const key = `${f.sectorId}|${f.partner}`;
      linkAgg[key] = (linkAgg[key] ?? 0) + f.importValue;
    }

    const sectorNodes: NodeExtra[] = sectors.map(s => ({
      name:  language === 'zh' ? s.labelZh : s.label,
      color: SECTOR_COLORS[s.id] ?? '#2E5C6E',
    }));
    const econNodes: NodeExtra[] = ECONOMY_ORDER.map(iso3 => ({
      name:  language === 'zh'
        ? (ECONOMY_LABELS[iso3]?.zh ?? iso3)
        : (ECONOMY_LABELS[iso3]?.en ?? iso3),
      color: ECONOMY_COLORS[iso3] ?? '#707C74',
    }));

    const sectorIdx = Object.fromEntries(sectors.map((s, i) => [s.id, i]));
    const econIdx   = Object.fromEntries(ECONOMY_ORDER.map((e, i) => [e, sectors.length + i]));

    const links = Object.entries(linkAgg)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => {
        const [sectorId, partner] = key.split('|') as [string, string];
        return { source: sectorIdx[sectorId]!, target: econIdx[partner]!, value };
      });

    return { sankeyNodes: [...sectorNodes, ...econNodes], sankeyLinks: links };
  }, [flows, sectors, selectedYear, language]);

  // Build mobile bar data
  const mobileBarData = useMemo(() => {
    return ECONOMY_ORDER.map(iso3 => {
      const total = flows
        .filter(f => f.partner === iso3 && f.year === selectedYear)
        .reduce((s, f) => s + f.importValue, 0);
      return {
        iso3,
        name: language === 'zh' ? (ECONOMY_LABELS[iso3]?.zh ?? iso3) : (ECONOMY_LABELS[iso3]?.en ?? iso3),
        value: Math.round(total / 1e9 * 10) / 10,
      };
    }).sort((a, b) => b.value - a.value);
  }, [flows, selectedYear, language]);

  // D3 Sankey render
  useEffect(() => {
    if (!svgRef.current || isMobile || sankeyNodes.length === 0) return;

    const HEIGHT  = 420;
    const margin  = { top: 8, right: 130, bottom: 8, left: 130 };
    const innerW  = containerWidth - margin.left - margin.right;
    const innerH  = HEIGHT - margin.top - margin.bottom;

    if (innerW <= 0) return;

    const svg = d3.select(svgRef.current)
      .attr('width',  containerWidth)
      .attr('height', HEIGHT);

    // Fade out everything, then redraw
    svg.selectAll('g.sankey-root')
      .transition()
      .duration(250)
      .attr('opacity', 0)
      .remove();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layout = createSankey<NodeExtra, any>()
      .nodeWidth(12)
      .nodePadding(9)
      .extent([[0, 0], [innerW, innerH]]);

    const graph = layout({
      nodes: sankeyNodes.map(n => ({ ...n })),
      links: sankeyLinks.map(l => ({ ...l })),
    });

    const root = svg.append('g')
      .attr('class', 'sankey-root')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('opacity', 0);

    // Links
    root.append('g')
      .attr('class', 'links')
      .selectAll<SVGPathElement, SLink>('path')
      .data(graph.links as SLink[])
      .join('path')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('d', sankeyLinkHorizontal() as any)
        .attr('stroke', d => {
          const src = d.source as SNode;
          return src.color;
        })
        .attr('stroke-width', d => Math.max(1, d.width ?? 1))
        .attr('fill', 'none')
        .attr('opacity', 0.25)
        .on('mouseover', function() { d3.select(this).attr('opacity', 0.55); })
        .on('mouseout',  function() { d3.select(this).attr('opacity', 0.25); });

    // Nodes
    root.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGRectElement, SNode>('rect')
      .data(graph.nodes as SNode[])
      .join('rect')
        .attr('x',      d => d.x0 ?? 0)
        .attr('y',      d => d.y0 ?? 0)
        .attr('height', d => Math.max(2, (d.y1 ?? 0) - (d.y0 ?? 0)))
        .attr('width',  d => (d.x1 ?? 0) - (d.x0 ?? 0))
        .attr('fill',   d => d.color)
        .attr('rx', 2);

    // Left labels (sector nodes: x0 < innerW/2)
    root.append('g')
      .selectAll<SVGTextElement, SNode>('text')
      .data((graph.nodes as SNode[]).filter(d => (d.x0 ?? 0) < innerW / 2))
      .join('text')
        .attr('x', d => (d.x0 ?? 0) - 8)
        .attr('y', d => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', '"Source Serif 4", serif')
        .attr('font-size', language === 'zh' ? '11px' : '11px')
        .attr('fill', '#343434')
        .text(d => d.name);

    // Right labels (economy nodes: x0 >= innerW/2)
    root.append('g')
      .selectAll<SVGTextElement, SNode>('text')
      .data((graph.nodes as SNode[]).filter(d => (d.x0 ?? 0) >= innerW / 2))
      .join('text')
        .attr('x', d => (d.x1 ?? 0) + 8)
        .attr('y', d => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', '"Source Serif 4", serif')
        .attr('font-size', '11px')
        .attr('fill', '#343434')
        .text(d => d.name);

    // Fade in
    root.transition().duration(500).attr('opacity', 1);

    return () => {
      svg.selectAll('g.sankey-root').remove();
    };
  }, [sankeyNodes, sankeyLinks, containerWidth, isMobile, language]);

  const btnBase: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize:   '11px',
    padding:    '2px 10px',
    border:     '1px solid #2E5C6E',
    borderRadius: '4px',
    cursor:     'pointer',
  };

  return (
    <div ref={containerRef}>
      {/* Year toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {YEARS.map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            style={{
              ...btnBase,
              color:           selectedYear === y ? '#FCFAF2' : '#2E5C6E',
              backgroundColor: selectedYear === y ? '#2E5C6E' : 'transparent',
            }}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Sankey SVG (desktop) */}
      {!isMobile && (
        <svg
          ref={svgRef}
          style={{ width: '100%', display: 'block', overflow: 'visible' }}
        />
      )}

      {/* Mobile: horizontal bar chart */}
      {isMobile && (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={mobileBarData}
            layout="vertical"
            margin={{ top: 0, right: 60, bottom: 0, left: 60 }}
          >
            <XAxis
              type="number"
              tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fill: '#707C74' }}
              tickFormatter={v => `$${v}B`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={58}
              tick={{ fontFamily: '"Source Serif 4", serif', fontSize: 11, fill: '#343434' }}
            />
            <Tooltip
              formatter={(v: unknown) => [`$${Number(v).toFixed(1)}B`, language === 'zh' ? '進口總額' : 'Total Imports']}
              contentStyle={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '11px',
                backgroundColor: '#2D3748',
                border: 'none',
                color: '#FCFAF2',
              }}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {mobileBarData.map(entry => (
                <Cell key={entry.iso3} fill={ECONOMY_COLORS[entry.iso3] ?? '#707C74'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <p
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize:   '10px',
          color:      '#707C74',
          marginTop:  '8px',
        }}
      >
        Source: UN Comtrade · U.S. imports by sector &amp; trading partner · {selectedYear} · USD
      </p>
    </div>
  );
}
