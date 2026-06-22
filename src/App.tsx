import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Subscriptions } from './pages/Subscriptions'
import { Budget } from './pages/Budget'
import { Goals } from './pages/Goals'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'

function App(): JSX.Element {
  return (
    <SettingsProvider>
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
    </SettingsProvider>
  )
}

export default App
