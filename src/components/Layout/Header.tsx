import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

const EDITION = 'Mar 2026';

interface NavItem {
  label: string;
  labelZh: string;
  href: string;
  sectionId?: string; // scroll target on landing page
  activeOn: string[]; // pathnames that light up this item
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Briefing',     labelZh: '報告',   href: '/',            activeOn: ['/'] },
  { label: 'Sectors',      labelZh: '產業',   href: '/',            sectionId: 'explore',   activeOn: ['/sectors'] },
  { label: 'Economies',    labelZh: '經濟體', href: '/',            sectionId: 'economies', activeOn: ['/economies'] },
  { label: 'Timeline',     labelZh: '時間軸', href: '/timeline',    activeOn: ['/timeline'] },
  { label: 'Methodology',  labelZh: '方法論', href: '/methodology', activeOn: ['/methodology'] },
];

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="5"  width="18" height="2" rx="1" fill="currentColor" />
      <rect x="2" y="10" width="18" height="2" rx="1" fill="currentColor" />
      <rect x="2" y="15" width="18" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (item: NavItem): boolean => {
    if (item.href === '/' && item.activeOn.includes('/')) {
      return location.pathname === '/';
    }
    return item.activeOn.some(p => location.pathname.startsWith(p));
  };

  function handleNavClick(item: NavItem) {
    setMenuOpen(false);
    if (item.sectionId) {
      if (location.pathname !== '/') {
        navigate('/');
        // wait for navigation, then scroll
        setTimeout(() => {
          document.getElementById(item.sectionId!)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById(item.sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{ backgroundColor: '#2D3748' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[68px]">

          {/* ── Left: wordmark + edition badge ──────────────────────── */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex flex-col leading-tight shrink-0" onClick={() => setMenuOpen(false)}>
              <span
                style={{
                  fontFamily: '"Source Serif 4", serif',
                  fontWeight: 600,
                  fontSize: '20pt',
                  color: '#FCFAF2',
                  lineHeight: 1.15,
                }}
              >
                Global Trade Shock Monitor
              </span>
              <span
                style={{
                  fontFamily: '"Noto Serif TC", serif',
                  fontWeight: 400,
                  fontSize: '13pt',
                  color: 'rgba(252, 250, 242, 0.70)',
                  lineHeight: 1.2,
                }}
              >
                全球貿易衝擊監測站
              </span>
            </Link>

            <span
              className="hidden sm:inline-block shrink-0"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '11pt',
                color: '#FCFAF2',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '9999px',
                padding: '2px 10px',
                whiteSpace: 'nowrap',
              }}
            >
              {EDITION}
            </span>
          </div>

          {/* ── Right: nav + language toggle (desktop) ───────────────── */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const active = isActive(item);
              const label = language === 'zh' ? item.labelZh : item.label;

              if (item.sectionId) {
                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavClick(item)}
                    className="px-3 py-1 text-sm transition-colors"
                    style={{
                      fontFamily: '"Source Serif 4", serif',
                      color: active ? '#0070C0' : 'rgba(252,250,242,0.85)',
                      borderBottom: active ? '2px solid #0070C0' : '2px solid transparent',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className="px-3 py-1 text-sm transition-colors"
                  style={{
                    fontFamily: '"Source Serif 4", serif',
                    color: active ? '#0070C0' : 'rgba(252,250,242,0.85)',
                    borderBottom: active ? '2px solid #0070C0' : '2px solid transparent',
                    textDecoration: 'none',
                  }}
                >
                  {label}
                </Link>
              );
            })}

            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="ml-3 px-3 py-1 text-sm transition-colors"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '12px',
                color: '#FCFAF2',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '4px',
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
              aria-label="Toggle language"
            >
              <span style={{ opacity: language === 'en' ? 1 : 0.5 }}>EN</span>
              <span style={{ opacity: 0.4, margin: '0 4px' }}>|</span>
              <span style={{ opacity: language === 'zh' ? 1 : 0.5 }}>中</span>
            </button>
          </nav>

          {/* ── Mobile: hamburger ────────────────────────────────────── */}
          <button
            className="lg:hidden"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{ color: '#FCFAF2', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown menu ──────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="lg:hidden border-t"
          style={{
            backgroundColor: '#1a2535',
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col">
            {NAV_ITEMS.map(item => {
              const active = isActive(item);
              const label = language === 'zh' ? item.labelZh : item.label;

              if (item.sectionId) {
                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavClick(item)}
                    className="text-left py-3 border-b"
                    style={{
                      fontFamily: '"Source Serif 4", serif',
                      fontSize: '15px',
                      color: active ? '#0070C0' : 'rgba(252,250,242,0.85)',
                      borderColor: 'rgba(255,255,255,0.08)',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-3 border-b"
                  style={{
                    fontFamily: '"Source Serif 4", serif',
                    fontSize: '15px',
                    color: active ? '#0070C0' : 'rgba(252,250,242,0.85)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  {label}
                </Link>
              );
            })}

            {/* Language toggle in mobile menu */}
            <div className="py-3 flex items-center gap-3">
              <span style={{ fontFamily: '"Source Serif 4", serif', fontSize: '14px', color: 'rgba(252,250,242,0.5)' }}>
                Language
              </span>
              <button
                onClick={() => setLanguage('en')}
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '12px',
                  color: language === 'en' ? '#FCFAF2' : 'rgba(252,250,242,0.4)',
                  background: language === 'en' ? 'rgba(255,255,255,0.15)' : 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  cursor: 'pointer',
                }}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('zh')}
                style={{
                  fontFamily: '"Noto Serif TC", serif',
                  fontSize: '13px',
                  color: language === 'zh' ? '#FCFAF2' : 'rgba(252,250,242,0.4)',
                  background: language === 'zh' ? 'rgba(255,255,255,0.15)' : 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  cursor: 'pointer',
                }}
              >
                中
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
