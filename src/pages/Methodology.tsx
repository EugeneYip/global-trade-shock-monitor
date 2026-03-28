import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HsRow {
  code: string;
  desc: { en: string; zh: string };
  examples: { en: string; zh: string };
}

interface SectorAccordion {
  id: string;
  label: { en: string; zh: string };
  color: string;
  rows: HsRow[];
}

// ── Static content ────────────────────────────────────────────────────────────

const HS_SECTORS: SectorAccordion[] = [
  {
    id: 'semiconductors',
    label: { en: 'Semiconductors & Electronics', zh: '半導體與電子元件' },
    color: '#0070C0',
    rows: [
      {
        code: '8541',
        desc:     { en: 'Diodes, transistors & discrete semiconductors', zh: '二極體、電晶體及分立式半導體' },
        examples: { en: 'MOSFETs, power transistors, LEDs, photodiodes', zh: 'MOSFET、功率電晶體、LED、光電二極體' },
      },
      {
        code: '8542',
        desc:     { en: 'Electronic integrated circuits', zh: '電子積體電路' },
        examples: { en: 'CPUs, GPUs, memory chips (DRAM/NAND), SoCs, logic ICs', zh: 'CPU、GPU、記憶體晶片（DRAM/NAND）、SoC、邏輯IC' },
      },
      {
        code: '8471',
        desc:     { en: 'Computers & automatic data-processing machines', zh: '電腦及自動資料處理機器' },
        examples: { en: 'Laptops, desktops, servers, workstations', zh: '筆記型電腦、桌機、伺服器、工作站' },
      },
      {
        code: '8473',
        desc:     { en: 'Parts & accessories of computers (HS 8471)', zh: '電腦（8471）之零件及附件' },
        examples: { en: 'Motherboards, NIC cards, graphics cards, SSDs', zh: '主機板、網路卡、顯示卡、固態硬碟' },
      },
    ],
  },
  {
    id: 'smartphones',
    label: { en: 'Smartphones & Consumer Electronics', zh: '智慧型手機與消費電子' },
    color: '#66327C',
    rows: [
      {
        code: '8517',
        desc:     { en: 'Telephone sets, smartphones & mobile phones', zh: '電話機、智慧型手機及行動電話' },
        examples: { en: 'iPhones, Android smartphones, feature phones, VoIP handsets', zh: 'iPhone、Android智慧型手機、功能手機、VoIP話機' },
      },
    ],
  },
  {
    id: 'ev-battery',
    label: { en: 'EVs & Battery Chain', zh: '電動車與電池鏈' },
    color: '#5DAC81',
    rows: [
      {
        code: '8703',
        desc:     { en: 'Passenger motor vehicles (incl. BEVs & PHEVs)', zh: '乘用汽車（含純電動及插電混合動力車）' },
        examples: { en: 'Battery electric vehicles (BEVs), plug-in hybrids (PHEVs)', zh: '純電動車（BEV）、插電式混合動力車（PHEV）' },
      },
      {
        code: '8507',
        desc:     { en: 'Electric storage batteries', zh: '蓄電池' },
        examples: { en: 'Lithium-ion battery packs, battery cells, battery modules', zh: '鋰離子電池組、電芯、電池模組' },
      },
      {
        code: '8504',
        desc:     { en: 'Electrical transformers & power conversion equipment', zh: '電力變壓器及電力轉換設備' },
        examples: { en: 'EV on-board chargers, DC-DC converters, inverters', zh: '電動車車載充電器、DC-DC轉換器、逆變器' },
      },
    ],
  },
  {
    id: 'textiles',
    label: { en: 'Textiles & Light Manufacturing', zh: '紡織與輕工製造' },
    color: '#F8B500',
    rows: [
      {
        code: '61',
        desc:     { en: 'Knitted or crocheted clothing & accessories', zh: '針織或鉤針編織服裝及附件' },
        examples: { en: 'T-shirts, sweaters, hoodies, underwear, socks', zh: 'T恤、毛衣、帽T、內衣、襪子' },
      },
      {
        code: '62',
        desc:     { en: 'Woven apparel & clothing accessories', zh: '梭織服裝及服飾附件' },
        examples: { en: 'Dress shirts, trousers, suits, jackets, dresses, coats', zh: '襯衫、長褲、西裝、夾克、洋裝、外套' },
      },
      {
        code: '64',
        desc:     { en: 'Footwear, gaiters & parts', zh: '鞋類、綁腿及其零件' },
        examples: { en: 'Athletic shoes, leather shoes, boots, sandals', zh: '運動鞋、皮鞋、靴子、涼鞋' },
      },
      {
        code: '42',
        desc:     { en: 'Leather articles, saddlery, handbags & travel goods', zh: '皮革製品、馬具、手提包及旅行用品' },
        examples: { en: 'Handbags, backpacks, wallets, luggage, belts', zh: '手提包、背包、錢包、行李箱、皮帶' },
      },
    ],
  },
];

// ── Shared style primitives ────────────────────────────────────────────────────

const mono = '"JetBrains Mono", monospace';
const serif = '"Source Serif 4", "Noto Serif TC", serif';
const BORDER = '1px solid rgba(112,124,116,0.22)';

const thStyle: React.CSSProperties = {
  fontFamily: mono,
  fontSize: '10px',
  color: '#FCFAF2',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '7px 12px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  fontFamily: mono,
  fontSize: '11px',
  color: '#343434',
  padding: '7px 12px',
  borderBottom: BORDER,
  verticalAlign: 'top',
  lineHeight: 1.55,
};

const tdLabel: React.CSSProperties = {
  ...tdStyle,
  color: '#707C74',
  whiteSpace: 'nowrap',
  fontWeight: 500,
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function H2({ n, en, zh, lang }: { n: string; en: string; zh: string; lang: 'en' | 'zh' }) {
  return (
    <h2
      style={{
        fontFamily: serif,
        fontSize: '18px',
        fontWeight: 700,
        color: '#622954',
        margin: '40px 0 14px',
        borderBottom: BORDER,
        paddingBottom: '8px',
        display: 'flex',
        gap: '10px',
        alignItems: 'baseline',
      }}
    >
      <span style={{ fontFamily: mono, fontSize: '12px', color: '#707C74', fontWeight: 400 }}>{n}</span>
      {lang === 'zh' ? zh : en}
    </h2>
  );
}

function Formula({ children }: { children: string }) {
  return (
    <pre
      style={{
        fontFamily: mono,
        fontSize: '12px',
        color: '#2E5C6E',
        backgroundColor: '#F3F3F3',
        border: BORDER,
        borderLeft: '3px solid #2E5C6E',
        borderRadius: '4px',
        padding: '10px 16px',
        margin: '8px 0',
        overflowX: 'auto',
        lineHeight: 1.7,
        whiteSpace: 'pre',
      }}
    >
      {children}
    </pre>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '4px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '520px' }}>
        <thead>
          <tr style={{ backgroundColor: '#2E5C6E' }}>
            {headers.map((h, i) => (
              <th key={i} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ backgroundColor: ri % 2 === 1 ? '#F3F3F3' : '#FCFAF2' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={ci === 0 ? tdLabel : tdStyle}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Limitation({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        borderBottom: BORDER,
        padding: '12px 0',
      }}
    >
      <div style={{ fontFamily: mono, fontSize: '11px', color: '#707C74', fontWeight: 500, marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontFamily: serif, fontSize: '13px', color: '#343434', lineHeight: 1.65 }}>
        {body}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Methodology() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'zh';

  const [openSectors, setOpenSectors] = useState<Set<string>>(new Set(['semiconductors']));

  const toggleSector = (id: string) => {
    setOpenSectors(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const GITHUB_REPO = 'https://github.com/eugeneyip/global-trade-shock-monitor';

  return (
    <main
      style={{
        maxWidth: '860px',
        margin: '0 auto',
        padding: '32px 24px 72px',
        backgroundColor: '#FCFAF2',
      }}
    >
      {/* Breadcrumb */}
      <nav
        style={{
          fontFamily: mono,
          fontSize: '11px',
          color: '#707C74',
          marginBottom: '20px',
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
        }}
      >
        <Link to="/" style={{ color: '#2E5C6E', textDecoration: 'none' }}>
          {lang === 'zh' ? '簡報' : 'Briefing'}
        </Link>
        <span>›</span>
        <span style={{ color: '#343434' }}>
          {lang === 'zh' ? '方法論' : 'Methodology'}
        </span>
      </nav>

      {/* Page title */}
      <h1
        style={{
          fontFamily: serif,
          fontSize: '30px',
          fontWeight: 700,
          color: '#622954',
          margin: '0 0 4px',
          lineHeight: 1.15,
        }}
      >
        {lang === 'zh' ? '資料方法與來源說明' : 'Data Methodology & Sources'}
      </h1>
      <p style={{ fontFamily: mono, fontSize: '10px', color: '#707C74', margin: '0 0 6px' }}>
        Global Trade Shock Monitor · v1.0 · {lang === 'zh' ? '最後更新：2026年3月' : 'Last updated: March 2026'}
      </p>
      <div
        style={{
          width: '40px',
          height: '2px',
          backgroundColor: '#622954',
          marginBottom: '32px',
        }}
      />

      {/* ── §1 Purpose Statement ─────────────────────────────────────────────── */}
      <H2 n="§1" en="Purpose Statement" zh="產品定位說明" lang={lang} />

      <p style={{ fontFamily: serif, fontSize: '14px', lineHeight: 1.75, color: '#343434', margin: '0 0 14px' }}>
        {lang === 'zh'
          ? '本工具是一項獨立分析產品，追蹤自2018年以來因美國關稅政策調整而引發的全球貿易流向重分配。所有數據均源自公開發布的官方貿易統計，並按照本頁所述方法進行彙整與計算，旨在提供可查核、可重現的視覺化分析。'
          : 'The Global Trade Shock Monitor is an independent analytical tool tracking the redistribution of global trade flows in response to U.S. tariff policy changes since 2018. All underlying data derives from publicly released official trade statistics, aggregated and computed by the methods described on this page, with the goal of providing verifiable and reproducible visualizations.'}
      </p>
      <p style={{ fontFamily: serif, fontSize: '14px', lineHeight: 1.75, color: '#343434', margin: '0 0 14px' }}>
        {lang === 'zh'
          ? '本工具並非預測模型。它不對未來貿易流量作出任何預測，亦不代表任何政府、機構或企業的官方立場。本工具的功能是視覺化已報告歷史數據中的規律，任何從中得出的推論均屬讀者自行判斷的責任。'
          : 'This tool is not a forecast. It does not predict future trade flows, nor does it represent the official position of any government, institution, or company. Its function is to visualize patterns in reported historical data. Any inferences drawn from those patterns are the responsibility of the reader.'}
      </p>
      <div
        style={{
          border: BORDER,
          borderLeft: '3px solid #F8B500',
          borderRadius: '4px',
          padding: '10px 14px',
          backgroundColor: '#F3F3F3',
          fontFamily: mono,
          fontSize: '11px',
          color: '#343434',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: '#343434' }}>
          {lang === 'zh' ? '範圍界定：' : 'Scope caveat: '}
        </strong>
        {lang === 'zh'
          ? '本工具追蹤四個特定行業（半導體、智慧型手機、電動車/電池、紡織）的美國進口數據，涵蓋十個貿易夥伴經濟體。份額數字僅反映這些類別，並非所有貿易。'
          : 'This tool tracks U.S. import data for four specific sectors (semiconductors, smartphones, EV/battery, textiles) across ten partner economies. Share figures reflect these categories only, not all trade.'}
      </div>

      {/* ── §2 Data Sources ──────────────────────────────────────────────────── */}
      <H2 n="§2" en="Data Sources" zh="資料來源" lang={lang} />

      <DataTable
        headers={
          lang === 'zh'
            ? ['來源', '端點 / URL', '覆蓋範圍', '顆粒度', '更新頻率', '存取', '授權']
            : ['Source', 'Endpoint / URL', 'Coverage', 'Granularity', 'Update Freq.', 'Access', 'License']
        }
        rows={[
          [
            'UN Comtrade',
            <span key="ct">
              <a href="https://comtradeplus.un.org" target="_blank" rel="noopener noreferrer" style={{ color: '#2E5C6E' }}>
                comtradeplus.un.org
              </a>
            </span>,
            lang === 'zh' ? '200+個國家' : '200+ countries',
            lang === 'zh' ? 'HS 2/4/6位碼' : 'HS 2/4/6-digit',
            lang === 'zh' ? '月度 / 年度' : 'Monthly / Annual',
            lang === 'zh' ? '免費API金鑰' : 'Free API key',
            'UN Terms of Service',
          ],
          [
            'World Bank WDI',
            <span key="wb">
              <a href="https://data.worldbank.org" target="_blank" rel="noopener noreferrer" style={{ color: '#2E5C6E' }}>
                data.worldbank.org
              </a>
            </span>,
            lang === 'zh' ? '200+個國家' : '200+ countries',
            lang === 'zh' ? '國家層級' : 'Country-level',
            lang === 'zh' ? '年度' : 'Annual',
            lang === 'zh' ? '開放存取' : 'Open access',
            'CC-BY 4.0',
          ],
          [
            'WTO-IMF Tariff Tracker',
            <span key="wto">
              <a href="https://tarifftracker.io" target="_blank" rel="noopener noreferrer" style={{ color: '#2E5C6E' }}>
                tarifftracker.io
              </a>
            </span>,
            lang === 'zh' ? '主要經濟體' : 'Major economies',
            lang === 'zh' ? '關稅事件' : 'Tariff events',
            lang === 'zh' ? '即時公告' : 'As announced',
            lang === 'zh' ? '開放存取' : 'Open access',
            lang === 'zh' ? '開放' : 'Open',
          ],
          [
            'Our World in Data',
            <span key="owid">
              <a href="https://github.com/owid/owid-datasets" target="_blank" rel="noopener noreferrer" style={{ color: '#2E5C6E' }}>
                github.com/owid
              </a>
            </span>,
            lang === 'zh' ? '彙整數據' : 'Aggregated',
            lang === 'zh' ? '依資料集而異' : 'Varies by dataset',
            lang === 'zh' ? '定期更新' : 'Regular',
            lang === 'zh' ? '開放存取' : 'Open access',
            'CC-BY 4.0',
          ],
        ]}
      />
      <p style={{ fontFamily: mono, fontSize: '10px', color: '#707C74', margin: '8px 0 0' }}>
        {lang === 'zh'
          ? '本版本主要使用UN Comtrade數據。World Bank WDI與Our World in Data保留供後續版本的GDP正規化及人均計算使用。'
          : 'This version primarily uses UN Comtrade data. World Bank WDI and Our World in Data are retained for GDP normalization and per-capita calculations in future versions.'}
      </p>

      {/* ── §3 Methodology — Share Calculation ──────────────────────────────── */}
      <H2 n="§3" en="Methodology — Share Calculation" zh="方法論：份額計算" lang={lang} />

      <p style={{ fontFamily: serif, fontSize: '13px', lineHeight: 1.7, color: '#343434', margin: '0 0 16px' }}>
        {lang === 'zh'
          ? '所有份額指標均以聯合國商品貿易統計資料庫（UN Comtrade）中美國報告的進口值（CIF，美元）為基礎計算。下列公式定義本工具中使用的所有衍生指標。'
          : 'All share metrics are computed from U.S.-reported import values (CIF, USD) in UN Comtrade. The following formulas define every derived metric used in this tool.'}
      </p>

      <div style={{ fontFamily: mono, fontSize: '11px', color: '#707C74', margin: '0 0 4px' }}>
        {lang === 'zh' ? '進口份額（%）' : 'Import Share (%)'}
      </div>
      <Formula>
        {`Share(X, S, Y)  =  ImportValue(USA ← X, sector S, year Y)
                    ──────────────────────────────────────────  × 100
                    Σ ImportValue(USA ← all partners, sector S, year Y)`}
      </Formula>

      <div style={{ fontFamily: mono, fontSize: '11px', color: '#707C74', margin: '14px 0 4px' }}>
        {lang === 'zh' ? '份額變化（百分點）' : 'Share Change (percentage points)'}
      </div>
      <Formula>
        {`ShareChange(X, S)  =  Share(X, S, 2024)  −  Share(X, S, 2018)`}
      </Formula>

      <div style={{ fontFamily: mono, fontSize: '11px', color: '#707C74', margin: '14px 0 4px' }}>
        {lang === 'zh' ? '年度同比變化（%）' : 'Year-over-Year Change (%)'}
      </div>
      <Formula>
        {`YoY(X, S, Y)  =  ImportValue(X, S, Y) − ImportValue(X, S, Y−1)
                  ─────────────────────────────────────────────  × 100
                             ImportValue(X, S, Y−1)`}
      </Formula>

      <div style={{ fontFamily: mono, fontSize: '11px', color: '#707C74', margin: '14px 0 4px' }}>
        {lang === 'zh' ? '變數定義' : 'Variable definitions'}
      </div>
      <DataTable
        headers={lang === 'zh' ? ['符號', '定義'] : ['Symbol', 'Definition']}
        rows={[
          ['X',    lang === 'zh' ? '貿易夥伴經濟體（ISO3代碼，例如 VNM、IND）' : 'Partner economy (ISO3 code, e.g. VNM, IND)'],
          ['S',    lang === 'zh' ? '行業（例如 semiconductors、textiles）' : 'Sector (e.g. semiconductors, textiles)'],
          ['Y',    lang === 'zh' ? '年份（2018–2024）' : 'Year (2018–2024)'],
          ['CIF',  lang === 'zh' ? '成本加保險費加運費；為美國Comtrade數據的標準計價方式' : 'Cost, Insurance, Freight; standard for U.S. Comtrade import values'],
          ['2018', lang === 'zh' ? '基準年（Section 301關稅全面實施前的最後完整年份）' : 'Baseline year (last full year before Section 301 tariffs took full effect)'],
        ]}
      />

      {/* ── §4 HS Code Reference ─────────────────────────────────────────────── */}
      <H2 n="§4" en="HS Code Reference" zh="HS稅號參考" lang={lang} />

      <p style={{ fontFamily: serif, fontSize: '13px', lineHeight: 1.7, color: '#343434', margin: '0 0 14px' }}>
        {lang === 'zh'
          ? '本工具使用《協調制度》（HS）稅號識別每個追蹤行業的覆蓋商品。HS稅號為2位碼（章節）或4位碼（標目），細化程度因行業而異。'
          : 'This tool uses Harmonized System (HS) codes to identify goods covered under each tracked sector. HS codes are at the 2-digit (chapter) or 4-digit (heading) level, depending on the sector.'}
      </p>

      <div>
        {HS_SECTORS.map(sector => {
          const isOpen = openSectors.has(sector.id);
          return (
            <div
              key={sector.id}
              style={{
                border: BORDER,
                borderLeft: `3px solid ${sector.color}`,
                borderRadius: '4px',
                marginBottom: '8px',
                overflow: 'hidden',
              }}
            >
              {/* Accordion header */}
              <button
                onClick={() => toggleSector(sector.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: isOpen ? '#F3F3F3' : '#FCFAF2',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontFamily: serif,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#2E5C6E',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: sector.color,
                      marginRight: '8px',
                      verticalAlign: 'middle',
                    }}
                  />
                  {lang === 'zh' ? sector.label.zh : sector.label.en}
                </span>
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: '11px',
                    color: '#707C74',
                    flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    display: 'inline-block',
                    transition: 'transform 0.15s',
                  }}
                >
                  ▾
                </span>
              </button>

              {/* Accordion body */}
              {isOpen && (
                <div style={{ padding: '0 0 4px' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#2E5C6E' }}>
                        <th style={{ ...thStyle, width: '80px' }}>
                          {lang === 'zh' ? 'HS稅號' : 'HS Code'}
                        </th>
                        <th style={thStyle}>
                          {lang === 'zh' ? '商品描述' : 'Product Description'}
                        </th>
                        <th style={thStyle}>
                          {lang === 'zh' ? '範例商品' : 'Example Products'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sector.rows.map((row, ri) => (
                        <tr key={row.code} style={{ backgroundColor: ri % 2 === 1 ? '#F3F3F3' : '#FCFAF2' }}>
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight: 700,
                              color: sector.color,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.code}
                          </td>
                          <td style={tdStyle}>
                            {lang === 'zh' ? row.desc.zh : row.desc.en}
                          </td>
                          <td style={{ ...tdStyle, color: '#707C74' }}>
                            {lang === 'zh' ? row.examples.zh : row.examples.en}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── §5 Known Limitations ─────────────────────────────────────────────── */}
      <H2 n="§5" en="Known Limitations" zh="已知限制" lang={lang} />

      <div style={{ borderTop: BORDER }}>
        {lang === 'zh' ? (
          <>
            <Limitation title="報告時滯" body="年度數據通常滯後6至12個月；月度數據滯後2至3個月。2024年全年數據預計於2025年中旬方可全面取得。" />
            <Limitation title="報告不對稱" body="美國報告的自中國進口值，可能與中國報告的對美出口值存在差異，原因包括計價方式（CIF與FOB）、轉口貿易以及統計口徑不同。本工具統一採用美國方（進口方）數據。" />
            <Limitation title="迂回貿易與轉口" body="份額轉移可能部分反映的是貨物假道第三國轉口，而非真正的產能遷移。現有數據無法區分兩者，此乃各類貿易份額分析的共同局限。" />
            <Limitation title="歐盟整體處理" body="在部分情境下，歐盟被視為單一主體，掩蓋了成員國層面的差異。本工具目前不追蹤個別歐盟成員國。" />
            <Limitation title="行業覆蓋範圍" body="四個追蹤行業並不涵蓋所有貿易商品。除非明確標注「所有行業」，否則份額數字均僅限於本工具所追蹤的行業範圍。" />
            <Limitation title="夥伴範圍限制" body="本工具追蹤十個主要夥伴經濟體（中國、越南、印度、台灣、泰國、馬來西亞、墨西哥、日本、韓國、印尼），不代表美國全球進口的完整圖景。" />
          </>
        ) : (
          <>
            <Limitation title="Reporting lag" body="Annual data is typically 6–12 months behind; monthly data is 2–3 months behind. Full-year 2024 figures are expected to be fully available by mid-2025." />
            <Limitation title="Reporting asymmetries" body="What the U.S. reports importing from China may differ from what China reports exporting to the U.S., due to valuation methods (CIF vs. FOB), transshipment, and statistical definitions. This tool uses U.S.-side (importer) data throughout." />
            <Limitation title="Rerouting vs. transshipment" body="Share shifts may partially reflect goods transshipped through third countries rather than genuine production relocation. Available data cannot distinguish between the two—a limitation shared by all trade-share analyses." />
            <Limitation title="EU aggregation" body="The European Union is treated as a single entity in some contexts, which obscures member-state variation. Individual EU member states are not tracked in this version." />
            <Limitation title="HS code scope" body="The four tracked sectors do not cover all traded goods. Share figures refer only to the tracked sectors unless explicitly labeled 'all sectors.'" />
            <Limitation title="Partner coverage" body="This tool tracks ten major partner economies (China, Vietnam, India, Taiwan, Thailand, Malaysia, Mexico, Japan, South Korea, Indonesia) and does not represent the full picture of U.S. global imports." />
          </>
        )}
      </div>

      {/* ── §6 Insight Generation ────────────────────────────────────────────── */}
      <H2 n="§6" en="Insight Generation" zh="洞察生成機制" lang={lang} />

      <p style={{ fontFamily: serif, fontSize: '13px', lineHeight: 1.7, color: '#343434', margin: '0 0 12px' }}>
        {lang === 'zh'
          ? '「近期動態」簡報板塊中的洞察條目由兩種方式生成：'
          : 'Insights in the "What Changed" briefing section are produced by two methods:'}
      </p>

      <DataTable
        headers={lang === 'zh' ? ['類型', '生成方式', '觸發門檻', '人工審核'] : ['Type', 'Generation', 'Trigger Threshold', 'Human Review']}
        rows={[
          [
            lang === 'zh' ? '自動生成' : 'Auto-generated',
            lang === 'zh' ? '由 update-data.ts 中的 insightEngine.ts 在每次數據刷新時計算' : 'Computed by insightEngine.ts during each data refresh via update-data.ts',
            lang === 'zh' ? '份額變化 >1pp；同比變化 >20%；排名變動' : '>1pp share change; >20% YoY; rank shift',
            lang === 'zh' ? '否' : 'No',
          ],
          [
            lang === 'zh' ? '人工策劃' : 'Manually curated',
            lang === 'zh' ? '由作者手動新增至 briefing.json，附有引用來源' : 'Manually added to briefing.json by the author with cited sources',
            lang === 'zh' ? '不適用' : 'N/A',
            lang === 'zh' ? '是' : 'Yes',
          ],
        ]}
      />

      <p style={{ fontFamily: serif, fontSize: '13px', lineHeight: 1.7, color: '#343434', margin: '10px 0 0' }}>
        {lang === 'zh'
          ? '每條洞察均在其元數據中標注 isAutoGenerated 標誌，以便讀者區分機器生成內容與經人工研究支持的解讀。人工策劃洞察的引用來源包括麥肯錫全球研究院、世界貿易組織及美國貿易代表署發布的報告。'
          : 'Each insight carries an isAutoGenerated flag in its metadata so readers can distinguish machine-computed observations from interpretations backed by human research. Manually curated insights cite sources including McKinsey Global Institute, WTO Secretariat, and USTR publications.'}
      </p>

      {/* ── §7 Update Schedule ───────────────────────────────────────────────── */}
      <H2 n="§7" en="Update Schedule" zh="更新時程" lang={lang} />

      <DataTable
        headers={
          lang === 'zh'
            ? ['更新項目', '方式', '時間', '需人工介入？']
            : ['What updates', 'How', 'When', 'Manual intervention?']
        }
        rows={[
          [
            lang === 'zh' ? '貿易數據' : 'Trade data',
            lang === 'zh' ? 'GitHub Action → UN Comtrade API' : 'GitHub Action pulls from UN Comtrade API',
            lang === 'zh' ? '每月1日' : 'Monthly (1st of month)',
            lang === 'zh' ? '僅在API端點變更時' : 'Only if API endpoint changes',
          ],
          [
            lang === 'zh' ? '關稅事件' : 'Tariff events',
            lang === 'zh' ? '手動編輯 tariff-events.json' : 'Manual addition to tariff-events.json',
            lang === 'zh' ? '事件公布時' : 'As announced',
            lang === 'zh' ? '是' : 'Yes',
          ],
          [
            lang === 'zh' ? '簡報洞察' : 'Briefing insights',
            lang === 'zh' ? 'insightEngine.ts 自動生成 + 人工策劃' : 'Auto-generated by insightEngine.ts + manual curation',
            lang === 'zh' ? '每月' : 'Monthly',
            lang === 'zh' ? '部分需要' : 'Partial',
          ],
          [
            lang === 'zh' ? '靜態JSON檔案' : 'Static JSON files',
            lang === 'zh' ? '由 GitHub Action 推送至 main 分支' : 'Committed to main branch by GitHub Action',
            lang === 'zh' ? '每月自動觸發' : 'Monthly automated trigger',
            lang === 'zh' ? '否' : 'No',
          ],
        ]}
      />

      {/* ── §8 Data Download ─────────────────────────────────────────────────── */}
      <H2 n="§8" en="Data Download" zh="數據下載" lang={lang} />

      <p style={{ fontFamily: serif, fontSize: '13px', lineHeight: 1.7, color: '#343434', margin: '0 0 12px' }}>
        {lang === 'zh'
          ? '所有驅動本工具的原始JSON檔案均公開存放於本專案的GitHub儲存庫。這些檔案為靜態、版本化的快照，可直接用於分析或作為其他視覺化工具的數據來源。'
          : 'All raw JSON files that power this tool are publicly available in the project GitHub repository. These files are static, versioned snapshots that can be used directly for analysis or as a data source for other visualization tools.'}
      </p>

      <DataTable
        headers={lang === 'zh' ? ['檔案', '內容', '格式'] : ['File', 'Contents', 'Format']}
        rows={[
          ['trade-flows.json', lang === 'zh' ? '838筆貿易流量記錄，按年份、夥伴及行業分類' : '838 trade-flow records by year, partner, and sector', 'JSON Array'],
          ['economies.json', lang === 'zh' ? '12個經濟體的元數據、角色及份額變化值' : 'Metadata, role, and share-change values for 12 economies', 'JSON Array'],
          ['sectors.json', lang === 'zh' ? '4個行業定義及HS稅號清單' : '4 sector definitions with HS code lists', 'JSON Array'],
          ['tariff-events.json', lang === 'zh' ? '8個關稅政策事件，含受影響經濟體及行業' : '8 tariff policy events with affected economies and sectors', 'JSON Array'],
          ['briefing.json', lang === 'zh' ? '編輯精選洞察條目' : 'Editorially curated insight entries', 'JSON Array'],
        ]}
      />

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
        <a
          href={`${GITHUB_REPO}/tree/main/src/data`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: mono,
            fontSize: '11px',
            color: '#FCFAF2',
            backgroundColor: '#2E5C6E',
            padding: '6px 14px',
            borderRadius: '4px',
            textDecoration: 'none',
          }}
        >
          {lang === 'zh' ? '在 GitHub 上查看數據 →' : 'View data on GitHub →'}
        </a>
        <a
          href={`${GITHUB_REPO}/archive/refs/heads/main.zip`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: mono,
            fontSize: '11px',
            color: '#2E5C6E',
            border: '1px solid #2E5C6E',
            padding: '6px 14px',
            borderRadius: '4px',
            textDecoration: 'none',
          }}
        >
          {lang === 'zh' ? '下載完整儲存庫 (.zip)' : 'Download full repository (.zip)'}
        </a>
      </div>

      {/* ── §9 Attribution and License ──────────────────────────────────────── */}
      <H2 n="§9" en="Attribution & License" zh="版權歸屬與授權" lang={lang} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[
          {
            label: lang === 'zh' ? '建置者' : 'Built by',
            value: 'Eugene Yip',
          },
          {
            label: lang === 'zh' ? '數據提供' : 'Data provided by',
            value: lang === 'zh'
              ? 'UN Comtrade、World Bank、WTO及Our World in Data，依各自授權條款提供。'
              : 'UN Comtrade, World Bank, WTO, and Our World in Data under their respective licenses.',
          },
          {
            label: lang === 'zh' ? '本工具授權' : 'This tool',
            value: (
              <span>
                {lang === 'zh' ? '依MIT授權條款發布。' : 'Released under the '}
                <a
                  href={`${GITHUB_REPO}/blob/main/LICENSE`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2E5C6E' }}
                >
                  MIT License
                </a>
                {lang === 'zh' ? '' : '.'}
              </span>
            ),
          },
          {
            label: lang === 'zh' ? 'GitHub 儲存庫' : 'GitHub repository',
            value: (
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2E5C6E' }}
              >
                {GITHUB_REPO.replace('https://', '')}
              </a>
            ),
          },
        ].map(({ label, value }, i) => (
          <div
            key={i}
            style={{
              borderBottom: BORDER,
              padding: '9px 0',
            }}
          >
            <div style={{ fontFamily: mono, fontSize: '10px', color: '#707C74', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontFamily: serif, fontSize: '13px', color: '#343434', lineHeight: 1.6 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── §10 Disclaimer ──────────────────────────────────────────────────── */}
      <H2 n="§10" en="Disclaimer" zh="免責聲明" lang={lang} />

      <div
        style={{
          border: BORDER,
          borderLeft: '3px solid #707C74',
          borderRadius: '4px',
          padding: '12px 16px',
          backgroundColor: '#F3F3F3',
        }}
      >
        <p style={{ fontFamily: serif, fontSize: '13px', lineHeight: 1.7, color: '#343434', margin: 0 }}>
          {lang === 'zh'
            ? '本工具僅供資訊與教育目的使用，不構成任何貿易、投資、法律或政策建議。作者對任何人因使用本工具的輸出結果而作出的決定概不承擔任何責任。數據品質受限於UN Comtrade及相關原始資料庫的報告準確性。數據差異、錯誤或遺漏應向原始數據提供者報告。'
            : 'This tool is for informational and educational purposes only. It does not constitute trade, investment, legal, or policy advice. The author assumes no liability for decisions made based on this tool\'s output. Data quality is subject to the reporting accuracy of UN Comtrade and the underlying primary databases. Discrepancies, errors, or omissions should be reported to the original data providers.'}
        </p>
      </div>

      {/* Footer nav */}
      <div
        style={{
          marginTop: '48px',
          paddingTop: '16px',
          borderTop: BORDER,
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          fontFamily: mono,
          fontSize: '11px',
        }}
      >
        <Link to="/" style={{ color: '#2E5C6E', textDecoration: 'none' }}>
          ← {lang === 'zh' ? '返回簡報' : 'Back to Briefing'}
        </Link>
        <Link to="/timeline" style={{ color: '#2E5C6E', textDecoration: 'none' }}>
          {lang === 'zh' ? '關稅時間軸' : 'Tariff Timeline'}
        </Link>
        <Link to="/compare" style={{ color: '#2E5C6E', textDecoration: 'none' }}>
          {lang === 'zh' ? '比較工具' : 'Compare Tool'}
        </Link>
      </div>
    </main>
  );
}
