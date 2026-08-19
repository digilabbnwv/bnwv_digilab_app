import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPagina from './pages/LoginPagina'
import RegistratiePagina from './pages/RegistratiePagina'
import Dashboard from './pages/Dashboard'
import ItemPagina from './pages/ItemPagina'
import MateriaalOverzicht from './pages/MateriaalOverzicht'
import MateriaalArchief from './pages/MateriaalArchief'
import NieuwMateriaal from './pages/NieuwMateriaal'
import MateriaalBewerken from './pages/MateriaalBewerken'
import MateriaalKaartPrint from './pages/MateriaalKaartPrint'
import LabelsBeheer from './pages/LabelsBeheer'
import MeldingenOverzicht from './pages/MeldingenOverzicht'
import MeldingDetail from './pages/MeldingDetail'
import OnderhoudMelden from './pages/OnderhoudMelden'
import ReserverenPagina from './pages/ReserverenPagina'
import ProfielPagina from './pages/ProfielPagina'
import HelpPagina from './pages/HelpPagina'
import LesplannenOverzicht from './pages/LesplannenOverzicht'
import LesplanDetail from './pages/LesplanDetail'
import LesbriefBeheer from './pages/LesbriefBeheer'
import Leerlijn from './pages/Leerlijn'
import WorkshopCatalogus from './pages/WorkshopCatalogus'
import WorkshopTemplateDetail from './pages/WorkshopTemplateDetail'
import Kalender from './pages/Kalender'
import WorkshopInplannen from './pages/WorkshopInplannen'
import GeplandeWorkshopDetail from './pages/GeplandeWorkshopDetail'
import PlanningGenereren from './pages/PlanningGenereren'
import Rapportage from './pages/Rapportage'
import RapportageMateriaal from './pages/RapportageMateriaal'
import RapportageReserveringen from './pages/RapportageReserveringen'
import RapportageOnderhoud from './pages/RapportageOnderhoud'
import RapportageWorkshops from './pages/RapportageWorkshops'
import RapportageLesbrieven from './pages/RapportageLesbrieven'
import RapportageGebruikers from './pages/RapportageGebruikers'
import BottomNav from './components/BottomNav'
import SideNav from './components/SideNav'
import AppHeader from './components/AppHeader'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

function MockBanner() {
  if (!MOCK) return null
  return (
    <div className="no-print fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-xs font-bold text-center py-1 tracking-wide">
      🧪 TESTMODUS — data in localStorage, geen Supabase
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { medewerker, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-app">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!medewerker) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function BeheerderRoute({ children }) {
  const { medewerker, loading, isBeheerder } = useAuth()
  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-app">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!medewerker) return <Navigate to="/login" replace />
  if (!isBeheerder) return <Navigate to="/" replace />
  return children
}

function PageLayout({ children }) {
  return (
    <div className="lg:flex">
      <SideNav />
      <div className="flex flex-col min-h-dvh flex-1 min-w-0">
        <div className={MOCK ? 'pt-6' : ''}>
          <AppHeader />
        </div>
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { medewerker } = useAuth()
  const location = useLocation()
  const van = location.state?.from
  const bestemmingNaLogin = van ? `${van.pathname}${van.search || ''}` : '/'

  return (
    <div className="bg-decoration relative min-h-dvh">
      <MockBanner />
      <Routes>
        {/* Publieke routes */}
        <Route path="/login" element={medewerker ? <Navigate to={bestemmingNaLogin} replace /> : <LoginPagina />} />
        <Route path="/registratie" element={medewerker ? <Navigate to={bestemmingNaLogin} replace /> : <RegistratiePagina />} />

        {/* Beveiligde routes */}
        <Route path="/" element={<ProtectedRoute><PageLayout><Dashboard /></PageLayout></ProtectedRoute>} />
        <Route path="/item/:qrCode" element={<ProtectedRoute><PageLayout><ItemPagina /></PageLayout></ProtectedRoute>} />

        {/* Materiaal */}
        <Route path="/materiaal" element={<ProtectedRoute><PageLayout><MateriaalOverzicht /></PageLayout></ProtectedRoute>} />
        <Route path="/materiaal/nieuw" element={<BeheerderRoute><PageLayout><NieuwMateriaal /></PageLayout></BeheerderRoute>} />
        <Route path="/materiaal/:id/bewerken" element={<BeheerderRoute><PageLayout><MateriaalBewerken /></PageLayout></BeheerderRoute>} />
        <Route path="/materiaal/:id/kaart" element={<ProtectedRoute><MateriaalKaartPrint /></ProtectedRoute>} />
        <Route path="/materiaal/labels" element={<BeheerderRoute><PageLayout><LabelsBeheer /></PageLayout></BeheerderRoute>} />
        <Route path="/materiaal/archief" element={<BeheerderRoute><PageLayout><MateriaalArchief /></PageLayout></BeheerderRoute>} />

        {/* Meldingen — overzicht eerst, dan nieuw formulier */}
        <Route path="/melding" element={<ProtectedRoute><PageLayout><MeldingenOverzicht /></PageLayout></ProtectedRoute>} />
        <Route path="/melding/nieuw" element={<ProtectedRoute><PageLayout><OnderhoudMelden /></PageLayout></ProtectedRoute>} />
        <Route path="/melding/nieuw/:materiaalId" element={<ProtectedRoute><PageLayout><OnderhoudMelden /></PageLayout></ProtectedRoute>} />
        <Route path="/melding/:id" element={<ProtectedRoute><PageLayout><MeldingDetail /></PageLayout></ProtectedRoute>} />

        {/* Workshops — planning kalender + beheer */}
        <Route path="/workshops" element={<ProtectedRoute><PageLayout><Kalender /></PageLayout></ProtectedRoute>} />
        <Route path="/workshops/inplannen" element={<BeheerderRoute><PageLayout><WorkshopInplannen /></PageLayout></BeheerderRoute>} />
        <Route path="/workshops/genereren" element={<BeheerderRoute><PageLayout><PlanningGenereren /></PageLayout></BeheerderRoute>} />
        <Route path="/workshops/onderhoud" element={<BeheerderRoute><PageLayout><WorkshopCatalogus /></PageLayout></BeheerderRoute>} />
        <Route path="/workshops/onderhoud/nieuw" element={<BeheerderRoute><PageLayout><WorkshopTemplateDetail /></PageLayout></BeheerderRoute>} />
        <Route path="/workshops/onderhoud/:id" element={<BeheerderRoute><PageLayout><WorkshopTemplateDetail /></PageLayout></BeheerderRoute>} />
        <Route path="/workshops/:id" element={<ProtectedRoute><PageLayout><GeplandeWorkshopDetail /></PageLayout></ProtectedRoute>} />

        {/* Legacy redirect */}
        <Route path="/kalender/*" element={<Navigate to="/workshops" replace />} />

        {/* Lesplannen */}
        <Route path="/lesplannen" element={<ProtectedRoute><PageLayout><LesplannenOverzicht /></PageLayout></ProtectedRoute>} />
        <Route path="/lesplannen/nieuw" element={<BeheerderRoute><PageLayout><LesplanDetail /></PageLayout></BeheerderRoute>} />
        <Route path="/lesplannen/beheer" element={<BeheerderRoute><PageLayout><LesbriefBeheer /></PageLayout></BeheerderRoute>} />
        <Route path="/lesplannen/:id" element={<ProtectedRoute><PageLayout><LesplanDetail /></PageLayout></ProtectedRoute>} />

        {/* Leerlijn */}
        <Route path="/leerlijn" element={<ProtectedRoute><PageLayout><Leerlijn /></PageLayout></ProtectedRoute>} />

        {/* Rapportage (beheerder) */}
        <Route path="/rapportage" element={<BeheerderRoute><PageLayout><Rapportage /></PageLayout></BeheerderRoute>} />
        <Route path="/rapportage/materiaal" element={<BeheerderRoute><PageLayout><RapportageMateriaal /></PageLayout></BeheerderRoute>} />
        <Route path="/rapportage/reserveringen" element={<BeheerderRoute><PageLayout><RapportageReserveringen /></PageLayout></BeheerderRoute>} />
        <Route path="/rapportage/onderhoud" element={<BeheerderRoute><PageLayout><RapportageOnderhoud /></PageLayout></BeheerderRoute>} />
        <Route path="/rapportage/workshops" element={<BeheerderRoute><PageLayout><RapportageWorkshops /></PageLayout></BeheerderRoute>} />
        <Route path="/rapportage/lesbrieven" element={<BeheerderRoute><PageLayout><RapportageLesbrieven /></PageLayout></BeheerderRoute>} />
        <Route path="/rapportage/gebruikers" element={<BeheerderRoute><PageLayout><RapportageGebruikers /></PageLayout></BeheerderRoute>} />

        {/* Reserveren */}
        <Route path="/reserveren" element={<ProtectedRoute><PageLayout><ReserverenPagina /></PageLayout></ProtectedRoute>} />

        {/* Profiel */}
        <Route path="/profiel" element={<ProtectedRoute><PageLayout><ProfielPagina /></PageLayout></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><PageLayout><HelpPagina /></PageLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
