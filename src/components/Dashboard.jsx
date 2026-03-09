import { useState } from 'react'
import StatsRow from './StatsRow.jsx'
import TierChart from './TierChart.jsx'
import AlertsPanel from './AlertsPanel.jsx'
import DonorTable from './DonorTable.jsx'
import DonorModal from './DonorModal.jsx'

export default function Dashboard({ donors, onReset }) {
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [activeTab, setActiveTab]         = useState('overview') // 'overview' | 'all'

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
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'all',      label: `All Donors (${donors.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-sm font-medium py-3 border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-teal text-teal'
                  : 'border-transparent text-gray-400 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">
        {activeTab === 'overview' && (
          <>
            <StatsRow donors={donors} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <TierChart donors={donors} />
              <AlertsPanel donors={donors} onSelectDonor={setSelectedDonor} />
            </div>
          </>
        )}

        {activeTab === 'all' && (
          <DonorTable donors={donors} onSelectDonor={setSelectedDonor} />
        )}
      </main>

      {selectedDonor && (
        <DonorModal donor={selectedDonor} onClose={() => setSelectedDonor(null)} />
      )}
    </div>
  )
}
