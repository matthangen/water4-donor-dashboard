import { SEVERITY_COLORS } from '../utils/stewardship.js'
import { formatCurrency } from '../utils/tiers.js'

export default function AlertsPanel({ donors, onSelectDonor }) {
  const alertDonors = donors
    .filter(d => d.alerts?.length > 0)
    .sort((a, b) => {
      const sev = { high: 0, medium: 1, low: 2 }
      const aMax = Math.min(...a.alerts.map(al => sev[al.severity] ?? 3))
      const bMax = Math.min(...b.alerts.map(al => sev[al.severity] ?? 3))
      return aMax - bMax || (parseFloat(b.totalGiving) || 0) - (parseFloat(a.totalGiving) || 0)
    })
    .slice(0, 20)

  if (!alertDonors.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Stewardship Alerts</h3>
        <p className="text-gray-400 text-sm text-center py-4">No stewardship alerts — portfolio looks healthy!</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
        Stewardship Alerts
        <span className="ml-2 text-red-500 font-bold">{alertDonors.length}</span>
        {alertDonors.length === 20 && <span className="text-gray-400 font-normal"> (top 20)</span>}
      </h3>
      <div className="space-y-2">
        {alertDonors.map(donor => (
          <div
            key={donor._id}
            onClick={() => onSelectDonor(donor)}
            className="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:border-teal/40 hover:bg-teal-dim cursor-pointer transition-all group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800 group-hover:text-teal truncate">
                  {donor.accountName || donor.primaryContact || 'Unknown'}
                </span>
                <span className="text-xs text-gray-400">{formatCurrency(donor.totalGiving)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {donor.alerts.map(alert => {
                  const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low
                  return (
                    <span key={alert.code}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium
                        ${colors.bg} ${colors.text} ${colors.border}`}>
                      {alert.severity === 'high' && '⚠ '}
                      {alert.label}
                    </span>
                  )
                })}
              </div>
            </div>
            <span className="text-gray-300 group-hover:text-teal ml-3 mt-1">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
