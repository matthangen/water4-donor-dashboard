import { useState } from 'react'
import StatsRow       from './StatsRow.jsx'
import TierChart      from './TierChart.jsx'
import AlertsPanel    from './AlertsPanel.jsx'
import DonorTable     from './DonorTable.jsx'
import DonorModal     from './DonorModal.jsx'
import MovesManager   from './MovesManager.jsx'
import TodayPanel     from './TodayPanel.jsx'
import UpgradeRadar   from './UpgradeRadar.jsx'
import PortfolioHealth from './PortfolioHealth.jsx'

export default function Dashboard({ donors, onReset }) {
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [activeTab, setActiveTab]         = useState('today')
  const [planTasks, setPlanTasks]         = useState([])   // lifted from MovesManager

  const todayAlertCount = donors.filter(d => d.alerts?.length > 0).length

  const TABS = [
    { id: 'today',    label: 'Today',                badge: todayAlertCount || null },
    { id: 'overview', label: 'Overview' },
    { id: 'all',      label: `All Donors (${donors.length})` },
    { id: 'moves',    label: 'Moves Plan',           badge: planTasks.length || null },
  ]

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Nav */}
      <nav className="bg-teal h-14 flex items-center px-6 shadow sticky top-0 z-30">
        <span className="font-serif text-gold text-lg">Water4.org</span>
        <span className="text-white/40 text-xs ml-3 pl-3 border-l border-white/20 uppercase tracking-widest">
          Major Donor Portfolio
        </span>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-white/50 text-xs">{donors.length} donors loaded</span>
          <button
            onClick={onReset}
            className="text-white/60 hover:text-white text-xs border border-white/20 hover:border-white/40 px-3 py-1 rounded-lg transition-colors"
          >
            Load New CSV
          </button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 sticky top-14 z-20">
        <div className="flex gap-1 max-w-7xl mx-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative text-sm font-medium py-3 px-4 border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-teal text-teal'
                  : 'border-transparent text-gray-400 hover:text-gray-700'}`}
            >
              {tab.label}
              {tab.badge ? (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold
                  ${activeTab === tab.id ? 'bg-teal text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">

        {/* TODAY ─────────────────────────────────────────────────────────── */}
        {activeTab === 'today' && (
          <TodayPanel donors={donors} planTasks={planTasks} />
        )}

        {/* OVERVIEW ──────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            <StatsRow donors={donors} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 space-y-5">
                <TierChart donors={donors} />
                <AlertsPanel donors={donors} onSelectDonor={setSelectedDonor} />
              </div>
              <div className="space-y-5">
                <PortfolioHealth donors={donors} />
                <UpgradeRadar donors={donors} onSelectDonor={setSelectedDonor} />
              </div>
            </div>
          </>
        )}

        {/* ALL DONORS ────────────────────────────────────────────────────── */}
        {activeTab === 'all' && (
          <DonorTable donors={donors} onSelectDonor={setSelectedDonor} />
        )}

        {/* MOVES PLAN ────────────────────────────────────────────────────── */}
        {activeTab === 'moves' && (
          <MovesManager donors={donors} onTasksGenerated={setPlanTasks} />
        )}

      </main>

      {selectedDonor && (
        <DonorModal donor={selectedDonor} onClose={() => setSelectedDonor(null)} />
      )}
    </div>
  )
}
