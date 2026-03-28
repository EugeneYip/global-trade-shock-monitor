import { useMemo, memo } from 'react';
import type { TradeFlow, Sector } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

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

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
const CELL_W = 82;
const CELL_H = 28;

interface SparklineCellProps {
  values: number[];
}

const SparklineCell = memo(function SparklineCell({ values }: SparklineCellProps) {
  const nonZero = values.filter(v => v > 0);
  if (nonZero.length < 2) {
    return <svg width={CELL_W} height={CELL_H} style={{ display: 'block' }} />;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const isUp = (values[values.length - 1] ?? 0) >= (values[0] ?? 0);
  const color = isUp ? '#5DAC81' : '#C00000';

  const pad = 3;
  const pts: [number, number][] = values.map((v, i) => [
    (i / (values.length - 1)) * CELL_W,
    CELL_H - pad - ((v - min) / range) * (CELL_H - 2 * pad),
  ]);

  const lineD = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const areaD =
    `M${pts[0]![0].toFixed(1)},${CELL_H} ` +
    pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ') +
    ` L${pts[pts.length - 1]![0].toFixed(1)},${CELL_H} Z`;

  return (
    <svg width={CELL_W} height={CELL_H} style={{ display: 'block' }}>
      <path d={areaD} fill={color} fillOpacity={0.18} />
      <path
        d={lineD}
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
});

interface Props {
  flows: TradeFlow[];
  sectors: Sector[];
}

function fmtVal(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return '—';
}

export default function SparklineMatrix({ flows, sectors }: Props) {
  const { language } = useLanguage();

  // Build lookup: partner → sectorId → year → total importValue
  const dataMap = useMemo(() => {
    const m: Record<string, Record<string, Record<number, number>>> = {};
    for (const f of flows) {
      if (!ECONOMY_ORDER.includes(f.partner)) continue;
      const { partner, sectorId, year, importValue } = f;
      (m[partner] ??= {});
      (m[partner][sectorId] ??= {});
      m[partner][sectorId][year] = (m[partner][sectorId][year] ?? 0) + importValue;
      (m[partner]['__total__'] ??= {});
      m[partner]['__total__'][year] = (m[partner]['__total__'][year] ?? 0) + importValue;
    }
    return m;
  }, [flows]);

  const sectorIds = [...sectors.map(s => s.id), '__total__'];

  const colLabels: Array<{ en: string; zh: string }> = [
    { en: 'Semicon.',  zh: '半導體' },
    { en: 'Phones',    zh: '手機' },
    { en: 'EV/Batt.',  zh: '電動車' },
    { en: 'Textiles',  zh: '紡織' },
    { en: 'Total',     zh: '合計' },
  ];

  function getValues(partner: string, sectorId: string): number[] {
    return YEARS.map(y => dataMap[partner]?.[sectorId]?.[y] ?? 0);
  }

  const BORDER = '1px solid rgba(112,124,116,0.2)';

  return (
    <div style={{ overflowX: 'auto', position: 'relative', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 2,
                backgroundColor: '#FCFAF2',
                padding: '0 16px 8px 0',
                textAlign: 'left',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '10px',
                color: '#707C74',
                minWidth: '82px',
                borderBottom: BORDER,
              }}
            >
              {language === 'zh' ? '經濟體' : 'Economy'}
            </th>
            {colLabels.map((col, i) => (
              <th
                key={i}
                style={{
                  padding: '0 8px 8px',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '10px',
                  color: '#707C74',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                  borderBottom: BORDER,
                  minWidth: `${CELL_W + 16}px`,
                }}
              >
                {language === 'zh' ? col.zh : col.en}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ECONOMY_ORDER.map((iso3, ri) => {
            const rowBg = ri % 2 === 1 ? '#F3F3F3' : '#FCFAF2';
            return (
              <tr key={iso3} style={{ backgroundColor: rowBg }}>
                <td
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    backgroundColor: rowBg,
                    padding: '6px 16px 6px 0',
                    fontFamily: '"Source Serif 4", serif',
                    fontSize: '12px',
                    color: '#2E5C6E',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                    borderBottom: BORDER,
                  }}
                >
                  {language === 'zh'
                    ? ECONOMY_LABELS[iso3]?.zh
                    : ECONOMY_LABELS[iso3]?.en}
                </td>
                {sectorIds.map(sid => {
                  const vals = getValues(iso3, sid);
                  const last = vals[vals.length - 1] ?? 0;
                  return (
                    <td
                      key={sid}
                      style={{
                        padding: '6px 8px',
                        verticalAlign: 'top',
                        borderBottom: BORDER,
                      }}
                    >
                      <SparklineCell values={vals} />
                      <div
                        style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '9px',
                          color: '#707C74',
                          marginTop: '2px',
                        }}
                      >
                        {fmtVal(last)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '10px',
          color: '#707C74',
          marginTop: '8px',
        }}
      >
        Source: UN Comtrade · U.S. imports from each economy by sector · 2018–2024 · Sparklines
        per-cell normalized
      </p>
    </div>
  );
}
