import { Routes, Route, Outlet, useLocation } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import PageWrapper from './components/Layout/PageWrapper'
import Landing from './pages/Landing'
import SectorDetail from './pages/SectorDetail'
import EconomyProfile from './pages/EconomyProfile'
import Compare from './pages/Compare'
import Timeline from './pages/Timeline'
import Methodology from './pages/Methodology'

function Shell() {
  const location = useLocation()
  return (
    <>
      <Header />
      <PageWrapper>
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </PageWrapper>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/sectors/:sectorId" element={<SectorDetail />} />
          <Route path="/economies/:iso3" element={<EconomyProfile />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/methodology" element={<Methodology />} />
        </Route>
      </Routes>
    </LanguageProvider>
  )
}
