import { getUpgradeCandidates } from '../utils/portfolioHealth.js'
import { formatCurrency, formatCurrencyFull } from '../utils/tiers.js'

export default function UpgradeRadar({ donors, onSelectDonor }) {
  const candidates = getUpgradeCandidates(donors, 60)

  if (!candidates.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Upgrade Radar</h3>
        <p className="text-gray-400 text-sm text-center py-4">
          No donors are currently within 60% of the next tier.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upgrade Radar</h3>
          <p className="text-xs text-gray-400 mt-0.5">{candidates.length} donor{candidates.length !== 1 ? 's' : ''} within reach of next tier</p>
        </div>
        <span className="text-xs text-gray-300">Sorted by proximity to upgrade</span>
      </div>

      <div className="divide-y divide-gray-50">
        {candidates.slice(0, 10).map(donor => {
          const curr = donor.tier
          const next = donor.nextTier

          return (
            <div
              key={donor._id}
              onClick={() => onSelectDonor?.(donor)}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer group transition-colors"
            >
              {/* Name + current tier */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800 group-hover:text-teal truncate">
                    {donor.accountName || donor.primaryContact}
                  </span>
                  {curr && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{ backgroundColor: curr.color, color: curr.textColor }}>
                      {curr.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {formatCurrencyFull(donor.totalGiving)} given ·{' '}
                    {formatCurrencyFull(donor.gapToNext)} to {next.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${donor.pctToNext}%`,
                        backgroundColor: next.color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-8">{donor.pctToNext}%</span>
                </div>
              </div>

              {/* Next tier + gap */}
              <div className="shrink-0 text-right">
                <div className="flex items-center gap-1.5 justify-end mb-1">
                  <span className="text-xs text-gray-400">→</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: next.color + '22', color: next.color }}>
                    {next.label}
                  </span>
                </div>
                {donor.gapsInGifts && (
                  <p className="text-xs text-gray-400">
                    ~{donor.gapsInGifts} gift{donor.gapsInGifts !== 1 ? 's' : ''} away
                  </p>
                )}
                {donor.giftOfficer && (
                  <p className="text-xs text-gray-300 mt-0.5">{donor.giftOfficer}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {candidates.length > 10 && (
        <div className="px-5 py-3 border-t border-gray-100 text-center">
          <span className="text-xs text-gray-400">+{candidates.length - 10} more upgrade candidates in All Donors view</span>
        </div>
      )}
    </div>
  )
}
