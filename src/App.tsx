import React, { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { Spinner } from './components/ui/Spinner'
import { AnimatedBackground } from './components/ui/AnimatedBackground'
import { SplashScreen } from './components/SplashScreen'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Subscriptions } from './pages/Subscriptions'
import { Budget } from './pages/Budget'
import { Goals } from './pages/Goals'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { AIAdvisor } from './pages/AIAdvisor'
import { Onboarding } from './pages/Onboarding'

function AppContent(): JSX.Element {
  const { loading, needsOnboarding } = useSettings()
  const [splashDone, setSplashDone] = useState(false)
  const location = useLocation()

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (needsOnboarding) {
    return <Onboarding />
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <Sidebar />
      <div className="ml-[240px] flex min-h-screen flex-col">
        <TopBar />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-[1200px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <Routes location={location}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/ai" element={<AIAdvisor />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}

function App(): JSX.Element {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}

export default App
