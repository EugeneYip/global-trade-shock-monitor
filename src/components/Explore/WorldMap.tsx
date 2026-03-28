import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useNavigate } from 'react-router-dom';
import type { Economy } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

// ISO 3166-1 numeric → ISO3 for economies tracked in this app
const NUMERIC_TO_ISO3: Record<string, string> = {
  '156': 'CHN',
  '704': 'VNM',
  '356': 'IND',
  '158': 'TWN',  // may be absent from world-atlas due to political reasons
  '764': 'THA',
  '458': 'MYS',
  '484': 'MEX',
  '392': 'JPN',
  '410': 'KOR',
  '360': 'IDN',
  '840': 'USA',
};

const ECONOMY_NAME_EN: Record<string, string> = {
  CHN: 'China',     VNM: 'Vietnam', IND: 'India',     TWN: 'Taiwan',
  THA: 'Thailand',  MYS: 'Malaysia', MEX: 'Mexico',   JPN: 'Japan',
  KOR: 'S. Korea',  IDN: 'Indonesia', USA: 'United States',
};
const ECONOMY_NAME_ZH: Record<string, string> = {
  CHN: '中國', VNM: '越南', IND: '印度', TWN: '台灣',
  THA: '泰國', MYS: '馬來西亞', MEX: '墨西哥', JPN: '日本',
  KOR: '韓國', IDN: '印尼', USA: '美國',
};

interface TooltipState {
  x: number;
  y: number;
  lines: string[];
}

interface Props {
  economies: Economy[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedTopology: any = null;

export default function WorldMap({ economies }: Props) {
  const { language } = useLanguage();
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate     = useNavigate();

  const [tooltip, setTooltip]         = useState<TooltipState | null>(null);
  const [containerWidth, setContainerWidth] = useState(560);
  const [topoLoaded, setTopoLoaded]   = useState(!!cachedTopology);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setContainerWidth(entries[0]?.contentRect.width ?? 560);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const width  = containerWidth;
    const height = Math.round(width * 0.52);

    // Share-change map: iso3 → pp value
    const shareMap: Record<string, number> = {};
    for (const e of economies) {
      if (e.iso3 !== 'USA' && e.iso3 !== 'EUN') {
        shareMap[e.iso3] = e.shareChangeVsChina;
      }
    }

    // Diverging color scale: negative → deep-red, zero → warm highlight, positive → wakatake
    const colorScale = d3.scaleLinear<string>()
      .domain([-20, 0, 10])
      .range(['#C00000', '#E8D3C7', '#5DAC81'])
      .clamp(true);

    const projection = d3.geoNaturalEarth1()
      .scale(width / 6.3)
      .translate([width / 2, height / 2]);

    const pathGen = d3.geoPath().projection(projection);

    const svg = d3.select(svgRef.current)
      .attr('width',  width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const render = (world: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countries = topojson.feature(world, world.objects.countries) as any;

      svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#E8E4D9'); // ocean background

      svg.append('g')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .selectAll<SVGPathElement, any>('path')
        .data(countries.features)
        .join('path')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr('d', (d: any) => pathGen(d) ?? '')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr('fill', (d: any) => {
            const iso3 = NUMERIC_TO_ISO3[String(d.id)];
            if (iso3 && iso3 !== 'USA' && shareMap[iso3] !== undefined) {
              return colorScale(shareMap[iso3]!);
            }
            return '#D4D0C7'; // unmapped country
          })
          .attr('stroke', '#FCFAF2')
          .attr('stroke-width', 0.4)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr('cursor', (d: any) => {
            const iso3 = NUMERIC_TO_ISO3[String(d.id)];
            return iso3 && iso3 !== 'USA' && shareMap[iso3] !== undefined ? 'pointer' : 'default';
          })
          .on('click', (_event: MouseEvent, d: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const iso3 = NUMERIC_TO_ISO3[String((d as any).id)];
            if (iso3 && iso3 !== 'USA' && shareMap[iso3] !== undefined) {
              navigate(`/economies/${iso3}`);
            }
          })
          .on('mouseover', (event: MouseEvent, d: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const iso3 = NUMERIC_TO_ISO3[String((d as any).id)];
            if (iso3 && iso3 !== 'USA' && shareMap[iso3] !== undefined) {
              const econ = economies.find(e => e.iso3 === iso3);
              if (!econ) return;
              const sign = econ.shareChangeVsChina >= 0 ? '+' : '';
              const name = language === 'zh'
                ? (ECONOMY_NAME_ZH[iso3] ?? iso3)
                : (ECONOMY_NAME_EN[iso3] ?? iso3);
              const container = containerRef.current;
              const rect = container?.getBoundingClientRect();
              setTooltip({
                x: event.clientX - (rect?.left ?? 0) + 8,
                y: event.clientY - (rect?.top  ?? 0) - 32,
                lines: [
                  name,
                  `${sign}${econ.shareChangeVsChina.toFixed(2)}pp vs China (2018–2024)`,
                ],
              });
            }
          })
          .on('mouseout', () => setTooltip(null));

      // Color legend (bottom-left)
      const legendW = 120;
      const legendH = 10;
      const lx = 10;
      const ly = height - 30;

      const defs = svg.append('defs');
      const grad = defs.append('linearGradient').attr('id', 'map-legend-grad');
      grad.append('stop').attr('offset', '0%').attr('stop-color', '#C00000');
      grad.append('stop').attr('offset', '50%').attr('stop-color', '#E8D3C7');
      grad.append('stop').attr('offset', '100%').attr('stop-color', '#5DAC81');

      svg.append('rect')
        .attr('x', lx).attr('y', ly)
        .attr('width', legendW).attr('height', legendH)
        .attr('fill', 'url(#map-legend-grad)')
        .attr('rx', 2);

      const tickStyle = {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '9px',
        fill: '#343434',
      };
      svg.append('text').attr('x', lx).attr('y', ly + legendH + 10)
        .attr('text-anchor', 'start').style('font-family', tickStyle.fontFamily)
        .style('font-size', tickStyle.fontSize).style('fill', tickStyle.fill).text('–20pp');
      svg.append('text').attr('x', lx + legendW / 2).attr('y', ly + legendH + 10)
        .attr('text-anchor', 'middle').style('font-family', tickStyle.fontFamily)
        .style('font-size', tickStyle.fontSize).style('fill', tickStyle.fill).text('0');
      svg.append('text').attr('x', lx + legendW).attr('y', ly + legendH + 10)
        .attr('text-anchor', 'end').style('font-family', tickStyle.fontFamily)
        .style('font-size', tickStyle.fontSize).style('fill', tickStyle.fill).text('+10pp');
    };

    if (cachedTopology) {
      render(cachedTopology);
      setTopoLoaded(true);
    } else {
      d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        .then(world => {
          if (!world) return;
          cachedTopology = world;
          setTopoLoaded(true);
          render(world);
        })
        .catch(() => {
          // Silently fail — map just won't render
          setTopoLoaded(true);
        });
    }
  }, [economies, containerWidth, navigate, language]);

  return (
    <div ref={containerRef} className="map-container" style={{ position: 'relative' }}>
      {/* Skeleton shown while TopoJSON is loading from CDN */}
      {!topoLoaded && (
        <div
          className="skeleton"
          style={{
            width: '100%',
            aspectRatio: '1.923',
            minHeight: '120px',
          }}
        />
      )}
      <svg
        ref={svgRef}
        style={{ width: '100%', display: topoLoaded ? 'block' : 'none' }}
      />

      {tooltip && (
        <div
          style={{
            position:        'absolute',
            left:            tooltip.x,
            top:             tooltip.y,
            backgroundColor: '#2D3748',
            color:           '#FCFAF2',
            fontFamily:      '"JetBrains Mono", monospace',
            fontSize:        '11px',
            lineHeight:      '1.5',
            padding:         '5px 9px',
            borderRadius:    '4px',
            pointerEvents:   'none',
            whiteSpace:      'nowrap',
            zIndex:          10,
          }}
        >
          {tooltip.lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <p
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize:   '10px',
          color:      '#707C74',
          marginTop:  '6px',
        }}
      >
        Color: change in share of U.S. imports vs China (pp, 2018–2024) · Source: UN Comtrade ·
        Click economy to explore
      </p>
    </div>
  );
}
