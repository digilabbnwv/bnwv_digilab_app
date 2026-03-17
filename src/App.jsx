import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPagina from './pages/LoginPagina'
import RegistratiePagina from './pages/RegistratiePagina'
import Dashboard from './pages/Dashboard'
import ItemPagina from './pages/ItemPagina'
import MateriaalOverzicht from './pages/MateriaalOverzicht'
import NieuwMateriaal from './pages/NieuwMateriaal'
import MateriaalBewerken from './pages/MateriaalBewerken'
import MeldingenOverzicht from './pages/MeldingenOverzicht'
import OnderhoudMelden from './pages/OnderhoudMelden'
import ReserverenPagina from './pages/ReserverenPagina'
import ProfielPagina from './pages/ProfielPagina'
import WorkshopCatalogus from './pages/WorkshopCatalogus'
import WorkshopTemplateDetail from './pages/WorkshopTemplateDetail'
import Kalender from './pages/Kalender'
import WorkshopInplannen from './pages/WorkshopInplannen'
import GeplandeWorkshopDetail from './pages/GeplandeWorkshopDetail'
import PlanningGenereren from './pages/PlanningGenereren'
import BottomNav from './components/BottomNav'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

function MockBanner() {
  if (!MOCK) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-xs font-bold text-center py-1 tracking-wide">
      🧪 TESTMODUS — data in localStorage, geen Supabase
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { medewerker, loading } = useAuth()
  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-app">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!medewerker) return <Navigate to="/login" replace />
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
    <div className="flex flex-col min-h-dvh">
      <main className={`flex-1 overflow-y-auto pb-20 ${MOCK ? 'pt-6' : ''}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { medewerker } = useAuth()

  return (
    <div className="bg-decoration relative min-h-dvh">
      <MockBanner />
      <Routes>
        {/* Publieke routes */}
        <Route path="/login" element={medewerker ? <Navigate to="/" replace /> : <LoginPagina />} />
        <Route path="/registratie" element={medewerker ? <Navigate to="/" replace /> : <RegistratiePagina />} />

        {/* Beveiligde routes */}
        <Route path="/" element={<ProtectedRoute><PageLayout><Dashboard /></PageLayout></ProtectedRoute>} />
        <Route path="/item/:qrCode" element={<ProtectedRoute><PageLayout><ItemPagina /></PageLayout></ProtectedRoute>} />

        {/* Materiaal */}
        <Route path="/materiaal" element={<ProtectedRoute><PageLayout><MateriaalOverzicht /></PageLayout></ProtectedRoute>} />
        <Route path="/materiaal/nieuw" element={<BeheerderRoute><PageLayout><NieuwMateriaal /></PageLayout></BeheerderRoute>} />
        <Route path="/materiaal/:id/bewerken" element={<BeheerderRoute><PageLayout><MateriaalBewerken /></PageLayout></BeheerderRoute>} />

        {/* Meldingen — overzicht eerst, dan nieuw formulier */}
        <Route path="/melding" element={<ProtectedRoute><PageLayout><MeldingenOverzicht /></PageLayout></ProtectedRoute>} />
        <Route path="/melding/nieuw" element={<ProtectedRoute><PageLayout><OnderhoudMelden /></PageLayout></ProtectedRoute>} />
        <Route path="/melding/nieuw/:materiaalId" element={<ProtectedRoute><PageLayout><OnderhoudMelden /></PageLayout></ProtectedRoute>} />

        {/* Workshops */}
        <Route path="/workshops" element={<ProtectedRoute><PageLayout><WorkshopCatalogus /></PageLayout></ProtectedRoute>} />
        <Route path="/workshops/nieuw" element={<BeheerderRoute><PageLayout><WorkshopTemplateDetail /></PageLayout></BeheerderRoute>} />
        <Route path="/workshops/:id" element={<ProtectedRoute><PageLayout><WorkshopTemplateDetail /></PageLayout></ProtectedRoute>} />

        {/* Kalender */}
        <Route path="/kalender" element={<ProtectedRoute><PageLayout><Kalender /></PageLayout></ProtectedRoute>} />
        <Route path="/kalender/inplannen" element={<BeheerderRoute><PageLayout><WorkshopInplannen /></PageLayout></BeheerderRoute>} />
        <Route path="/kalender/genereren" element={<BeheerderRoute><PageLayout><PlanningGenereren /></PageLayout></BeheerderRoute>} />
        <Route path="/kalender/:id" element={<ProtectedRoute><PageLayout><GeplandeWorkshopDetail /></PageLayout></ProtectedRoute>} />

        {/* Reserveren */}
        <Route path="/reserveren" element={<ProtectedRoute><PageLayout><ReserverenPagina /></PageLayout></ProtectedRoute>} />

        {/* Profiel */}
        <Route path="/profiel" element={<ProtectedRoute><PageLayout><ProfielPagina /></PageLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
