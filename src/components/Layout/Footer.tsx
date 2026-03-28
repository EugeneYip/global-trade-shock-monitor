import { Link } from 'react-router-dom';
import tradeFlows from '../../data/trade-flows.json';

// Derive last-updated year from the data
const lastYear = tradeFlows.length > 0
  ? Math.max(...(tradeFlows as { year: number }[]).map(f => f.year))
  : 2024;
const LAST_UPDATED = `${lastYear} data via UN Comtrade`;

function ExternalLinkIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '3px', marginBottom: '1px' }}
    >
      <path d="M1.5 1.5h7v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const MUTED = 'rgba(252,250,242,0.45)';
const DIM   = 'rgba(252,250,242,0.65)';
const LINK_STYLE = {
  color: DIM,
  textDecoration: 'none' as const,
  borderBottom: '1px solid rgba(252,250,242,0.2)',
  paddingBottom: '1px',
};

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#2D3748' }}>
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '12px',
          lineHeight: '1.8',
          color: MUTED,
        }}
      >
        {/* Row 1: Data sources */}
        <div className="mb-1">
          <span>Data: </span>
          <a
            href="https://comtradeapi.un.org"
            target="_blank"
            rel="noopener noreferrer"
            style={LINK_STYLE}
          >
            UN Comtrade<ExternalLinkIcon />
          </a>
          <span> · </span>
          <a
            href="https://data.worldbank.org"
            target="_blank"
            rel="noopener noreferrer"
            style={LINK_STYLE}
          >
            World Bank<ExternalLinkIcon />
          </a>
          <span> · </span>
          <a
            href="https://www.macmap.org"
            target="_blank"
            rel="noopener noreferrer"
            style={LINK_STYLE}
          >
            WTO-IMF Tariff Tracker<ExternalLinkIcon />
          </a>
        </div>

        {/* Row 2: Last updated + utility links */}
        <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Last updated: {LAST_UPDATED}</span>
          <Link
            to="/methodology"
            style={{ ...LINK_STYLE, color: DIM }}
          >
            Methodology →
          </Link>
          <a
            href="src/data/trade-flows.json"
            download="trade-flows.json"
            style={{ ...LINK_STYLE, color: DIM }}
          >
            Download Data (JSON) →
          </a>
        </div>

        {/* Row 3: Attribution */}
        <div style={{ color: MUTED }}>
          Built by{' '}
          <a
            href="https://github.com/eugeneyip"
            target="_blank"
            rel="noopener noreferrer"
            style={LINK_STYLE}
          >
            Eugene Yip<ExternalLinkIcon />
          </a>
          {' · '}
          <a
            href="https://github.com/eugeneyip/global-trade-shock-monitor"
            target="_blank"
            rel="noopener noreferrer"
            style={LINK_STYLE}
          >
            GitHub<ExternalLinkIcon />
          </a>
        </div>
      </div>
    </footer>
  );
}
