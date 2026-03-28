import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { TariffEvent } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import allEvents from '../data/tariff-events.json';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_ECONOMIES = ['CHN', 'VNM', 'IND', 'TWN', 'THA', 'MYS', 'MEX', 'JPN', 'KOR', 'IDN', 'USA', 'EUN'];

const ECONOMY_FLAGS: Record<string, string> = {
  CHN: '🇨🇳', VNM: '🇻🇳', IND: '🇮🇳', TWN: '🇹🇼', THA: '🇹🇭',
  MYS: '🇲🇾', MEX: '🇲🇽', JPN: '🇯🇵', KOR: '🇰🇷', IDN: '🇮🇩',
  USA: '🇺🇸', EUN: '🇪🇺',
};

const ECONOMY_LABELS: Record<string, { en: string; zh: string }> = {
  CHN: { en: 'China',     zh: '中國' },
  VNM: { en: 'Vietnam',   zh: '越南' },
  IND: { en: 'India',     zh: '印度' },
  TWN: { en: 'Taiwan',    zh: '台灣' },
  THA: { en: 'Thailand',  zh: '泰國' },
  MYS: { en: 'Malaysia',  zh: '馬來西亞' },
  MEX: { en: 'Mexico',    zh: '墨西哥' },
  JPN: { en: 'Japan',     zh: '日本' },
  KOR: { en: 'S. Korea',  zh: '韓國' },
  IDN: { en: 'Indonesia', zh: '印尼' },
  USA: { en: 'U.S.',      zh: '美國' },
  EUN: { en: 'EU',        zh: '歐盟' },
};

const SECTOR_META: Record<string, { en: string; zh: string; color: string }> = {
  semiconductors: { en: 'Semiconductors', zh: '半導體',  color: '#0070C0' },
  smartphones:    { en: 'Smartphones',    zh: '手機',    color: '#66327C' },
  'ev-battery':   { en: 'EV / Battery',  zh: '電動車',  color: '#5DAC81' },
  textiles:       { en: 'Textiles',       zh: '紡織',    color: '#F8B500' },
};

// Severity: events with tariffRate >= 100 or affecting all sectors → major (deep-red)
// Events with tariffRate undefined or < 30 and peace deals → moderate (yamabuki)
function nodeSeverity(evt: TariffEvent): 'major' | 'moderate' | 'low' {
  const rate = evt.tariffRate ?? 0;
  if (rate >= 100) return 'major';
  if (rate >= 25 || evt.affectedSectors.length >= 3) return 'moderate';
  return 'low';
}

const SEVERITY_COLOR: Record<string, string> = {
  major:    '#C00000',
  moderate: '#F8B500',
  low:      '#5DAC81',
};

// Derive economy list present across all events for filter chips
const FILTER_ECONOMIES = ALL_ECONOMIES.filter(iso3 =>
  (allEvents as TariffEvent[]).some(e => e.affectedEconomies.includes(iso3)),
);

const FILTER_SECTORS = Object.keys(SECTOR_META).filter(sid =>
  (allEvents as TariffEvent[]).some(e => e.affectedSectors.includes(sid)),
);

function formatDate(dateStr: string, lang: 'en' | 'zh'): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (lang === 'zh') {
    return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
  }
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    timeZone: 'UTC',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}

function FilterChip({ label, active, color, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        padding: '3px 10px',
        borderRadius: '12px',
        border: `1px solid ${color ?? '#707C74'}`,
        cursor: 'pointer',
        backgroundColor: active ? (color ?? '#707C74') : 'transparent',
        color: active ? '#FCFAF2' : (color ?? '#707C74'),
        transition: 'background-color 0.15s, color 0.15s',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {label}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Timeline() {
  const { language } = useLanguage();

  const [econFilters, setEconFilters] = useState<Set<string>>(new Set());
  const [sectorFilters, setSectorFilters] = useState<Set<string>>(new Set());

  const toggleEcon = (iso3: string) => {
    setEconFilters(prev => {
      const next = new Set(prev);
      next.has(iso3) ? next.delete(iso3) : next.add(iso3);
      return next;
    });
  };

  const toggleSector = (sid: string) => {
    setSectorFilters(prev => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  };

  const clearFilters = () => {
    setEconFilters(new Set());
    setSectorFilters(new Set());
  };

  const events = useMemo(() => {
    let evts = allEvents as TariffEvent[];
    if (econFilters.size > 0) {
      evts = evts.filter(e => e.affectedEconomies.some(iso3 => econFilters.has(iso3)));
    }
    if (sectorFilters.size > 0) {
      evts = evts.filter(e => e.affectedSectors.some(sid => sectorFilters.has(sid)));
    }
    return evts;
  }, [econFilters, sectorFilters]);

  const hasFilters = econFilters.size > 0 || sectorFilters.size > 0;

  const BORDER = '1px solid rgba(112,124,116,0.2)';

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
        <span style={{ color: '#343434' }}>
          {language === 'zh' ? '關稅事件時間軸' : 'Tariff Timeline'}
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
        {language === 'zh' ? '關稅政策時間軸' : 'Tariff Policy Timeline'}
      </h1>
      <p
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '11px',
          color: '#707C74',
          margin: '0 0 28px',
        }}
      >
        {language === 'zh'
          ? `共 ${(allEvents as TariffEvent[]).length} 項關鍵政策事件 · 2018–2025`
          : `${(allEvents as TariffEvent[]).length} key policy events · 2018–2025`}
      </p>

      {/* ── Filter Controls ──────────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: '#FCFAF2',
          border: BORDER,
          borderRadius: '6px',
          padding: '16px 18px',
          marginBottom: '36px',
        }}
      >
        {/* Economy filters */}
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10px',
              color: '#707C74',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '8px',
            }}
          >
            {language === 'zh' ? '篩選經濟體' : 'Filter by Economy'}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTER_ECONOMIES.map(iso3 => {
              const meta = ECONOMY_LABELS[iso3];
              const flag = ECONOMY_FLAGS[iso3] ?? '';
              const label = `${flag} ${meta ? (language === 'zh' ? meta.zh : meta.en) : iso3}`;
              return (
                <FilterChip
                  key={iso3}
                  label={label}
                  active={econFilters.has(iso3)}
                  onClick={() => toggleEcon(iso3)}
                />
              );
            })}
          </div>
        </div>

        {/* Sector filters */}
        <div style={{ marginBottom: hasFilters ? '12px' : 0 }}>
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10px',
              color: '#707C74',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '8px',
            }}
          >
            {language === 'zh' ? '篩選行業' : 'Filter by Sector'}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTER_SECTORS.map(sid => {
              const meta = SECTOR_META[sid];
              if (!meta) return null;
              return (
                <FilterChip
                  key={sid}
                  label={language === 'zh' ? meta.zh : meta.en}
                  active={sectorFilters.has(sid)}
                  color={meta.color}
                  onClick={() => toggleSector(sid)}
                />
              );
            })}
          </div>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10px',
              color: '#707C74',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0 0',
              textDecoration: 'underline',
            }}
          >
            {language === 'zh' ? '清除所有篩選' : 'Clear all filters'}
          </button>
        )}
      </div>

      {/* ── Event count / no results ─────────────────────────────────────────── */}
      {hasFilters && (
        <p
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '11px',
            color: '#707C74',
            marginBottom: '20px',
          }}
        >
          {language === 'zh'
            ? `顯示 ${events.length} / ${(allEvents as TariffEvent[]).length} 項事件`
            : `Showing ${events.length} of ${(allEvents as TariffEvent[]).length} events`}
        </p>
      )}

      {events.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#707C74',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px',
            border: '1px dashed rgba(112,124,116,0.35)',
            borderRadius: '8px',
          }}
        >
          {language === 'zh' ? '沒有符合篩選條件的事件' : 'No events match the current filters'}
        </div>
      )}

      {/* ── Vertical Timeline ────────────────────────────────────────────────── */}
      {events.length > 0 && (
        <div
          style={{
            position: 'relative',
            // Center spine at 50% on desktop, 24px from left on mobile
          }}
        >
          {/* Vertical spine */}
          <div
            className="timeline-spine"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: '#707C74',
              opacity: 0.3,
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {events.map((evt, idx) => {
              const severity = nodeSeverity(evt);
              const nodeColor = SEVERITY_COLOR[severity]!;
              const isLeft = idx % 2 === 0; // alternates on desktop

              return (
                <div
                  key={`${evt.date}-${idx}`}
                  className="timeline-row"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    position: 'relative',
                    paddingBottom: '32px',
                  }}
                >
                  {/* ── Desktop alternating layout via inline flex tricks ── */}
                  {/* We use a CSS class for desktop alternation and override
                      on mobile via a media query injected in index.css.
                      Here we set up the logical structure. */}

                  {/* Left column: date (desktop even) or spacer (desktop odd) */}
                  <div
                    className={`tl-left ${isLeft ? 'tl-content-side' : 'tl-spacer-side'}`}
                    style={{
                      width: '50%',
                      paddingRight: '28px',
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {isLeft && (
                      <div
                        style={{
                          display: 'inline-block',
                          textAlign: 'right',
                          paddingTop: '4px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '11px',
                            color: '#707C74',
                            marginBottom: '2px',
                          }}
                        >
                          {formatDate(evt.date, language)}
                        </div>
                        {evt.tariffRate !== undefined && (
                          <div
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: nodeColor,
                            }}
                          >
                            {evt.tariffRate}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Node (centered on spine) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 'calc(50% - 6px)',
                      top: '4px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: nodeColor,
                      border: '2px solid #FCFAF2',
                      boxShadow: `0 0 0 2px ${nodeColor}`,
                      flexShrink: 0,
                      zIndex: 1,
                    }}
                  />

                  {/* Right column: card (desktop even) or date+card (desktop odd) */}
                  <div
                    className={`tl-right ${!isLeft ? 'tl-content-side' : 'tl-spacer-side'}`}
                    style={{
                      width: '50%',
                      paddingLeft: '28px',
                      flexShrink: 0,
                    }}
                  >
                    {!isLeft && (
                      <div style={{ marginBottom: '6px' }}>
                        <div
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '11px',
                            color: '#707C74',
                          }}
                        >
                          {formatDate(evt.date, language)}
                        </div>
                        {evt.tariffRate !== undefined && (
                          <div
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: nodeColor,
                            }}
                          >
                            {evt.tariffRate}%
                          </div>
                        )}
                      </div>
                    )}

                    {/* Event card */}
                    <EventCard evt={evt} nodeColor={nodeColor} language={language} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '10px',
          color: '#707C74',
        }}
      >
        {(['major', 'moderate', 'low'] as const).map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: SEVERITY_COLOR[s],
                flexShrink: 0,
              }}
            />
            {s === 'major'    && (language === 'zh' ? '重大（≥100%）' : 'Major (≥100%)')}
            {s === 'moderate' && (language === 'zh' ? '中度（≥25%）'  : 'Moderate (≥25%)')}
            {s === 'low'      && (language === 'zh' ? '緩和 / 協議'   : 'De-escalation / Agreement')}
          </div>
        ))}
      </div>

      {/* Responsive style overrides */}
      <style>{`
        /* Desktop: spine at center */
        @media (min-width: 600px) {
          .timeline-spine {
            left: 50%;
          }
        }
        /* Mobile: spine at left, all cards on right */
        @media (max-width: 599px) {
          .timeline-spine {
            left: 16px;
          }
          .timeline-row {
            flex-direction: column !important;
          }
          .tl-left {
            display: none !important;
          }
          .tl-right {
            width: 100% !important;
            padding-left: 40px !important;
          }
          .timeline-row > div[style*="left: calc(50%"] {
            left: 10px !important;
          }
        }
      `}</style>
    </main>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────

interface EventCardProps {
  evt: TariffEvent;
  nodeColor: string;
  language: 'en' | 'zh';
}

function EventCard({ evt, nodeColor, language }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);

  const title       = language === 'zh' ? evt.titleZh       : evt.title;
  const description = language === 'zh' ? evt.descriptionZh : evt.description;

  // Economies to show (exclude USA from badge strip when it's just the "other side")
  const econBadges = evt.affectedEconomies.filter(iso3 => ECONOMY_LABELS[iso3]);

  return (
    <div
      style={{
        backgroundColor: '#FCFAF2',
        border: '1px solid rgba(112,124,116,0.25)',
        borderLeft: `3px solid ${nodeColor}`,
        borderRadius: '5px',
        padding: '12px 14px',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: '"Source Serif 4", serif',
          fontSize: '14px',
          fontWeight: 700,
          color: '#2E5C6E',
          lineHeight: 1.3,
          marginBottom: '8px',
        }}
      >
        {title}
      </div>

      {/* Description (collapsible) */}
      <div
        style={{
          fontFamily: '"Source Serif 4", serif',
          fontSize: '12px',
          lineHeight: 1.65,
          color: '#343434',
          marginBottom: '10px',
          overflow: 'hidden',
          maxHeight: expanded ? '600px' : '3.6em', // ~2 lines
          transition: 'max-height 0.2s ease',
        }}
      >
        {description}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '10px',
          color: '#2E5C6E',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0 8px',
          textDecoration: 'underline',
        }}
      >
        {expanded
          ? (language === 'zh' ? '收起 ↑' : 'Collapse ↑')
          : (language === 'zh' ? '展開全文 ↓' : 'Read more ↓')}
      </button>

      {/* Affected economy badges */}
      {econBadges.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '7px' }}>
          {econBadges.map(iso3 => {
            const meta = ECONOMY_LABELS[iso3];
            const flag = ECONOMY_FLAGS[iso3] ?? '';
            const name = meta ? (language === 'zh' ? meta.zh : meta.en) : iso3;
            return (
              <span
                key={iso3}
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '10px',
                  backgroundColor: 'rgba(46,92,110,0.08)',
                  color: '#2E5C6E',
                  border: '1px solid rgba(46,92,110,0.2)',
                  borderRadius: '3px',
                  padding: '1px 6px',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {flag} {name}
              </span>
            );
          })}
        </div>
      )}

      {/* Affected sector tags */}
      {evt.affectedSectors.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {evt.affectedSectors.map(sid => {
            const meta = SECTOR_META[sid];
            if (!meta) return null;
            return (
              <span
                key={sid}
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '10px',
                  backgroundColor: `${meta.color}18`,
                  color: meta.color,
                  border: `1px solid ${meta.color}40`,
                  borderRadius: '3px',
                  padding: '1px 6px',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {language === 'zh' ? meta.zh : meta.en}
              </span>
            );
          })}
        </div>
      )}

      {/* Source link */}
      <a
        href={evt.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '10px',
          color: '#707C74',
          textDecoration: 'none',
          borderBottom: '1px dotted #707C74',
          display: 'inline-block',
        }}
      >
        {language === 'zh' ? '資料來源 →' : 'Source →'}
        <span
          style={{
            marginLeft: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
            maxWidth: '200px',
            display: 'inline-block',
            verticalAlign: 'bottom',
            fontSize: '9px',
            color: '#9AA49E',
          }}
        >
          {evt.source}
        </span>
      </a>
    </div>
  );
}
