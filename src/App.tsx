import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { Spinner } from './components/ui/Spinner'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Subscriptions } from './pages/Subscriptions'
import { Budget } from './pages/Budget'
import { Goals } from './pages/Goals'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'

function AppContent(): JSX.Element {
  const { loading, needsOnboarding } = useSettings()

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
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-[240px] flex min-h-screen flex-col">
        <TopBar />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-[1200px]">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
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
