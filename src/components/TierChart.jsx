import { TIERS, formatCurrency } from '../utils/tiers.js'

export default function TierChart({ donors }) {
  const tierCounts = TIERS.map(tier => {
    const inTier = donors.filter(d => d.tier?.code === tier.code)
    const giving = inTier.reduce((s, d) => s + (parseFloat(d.totalGiving) || 0), 0)
    return { ...tier, count: inTier.length, giving }
  }).filter(t => t.count > 0)

  const maxCount = Math.max(...tierCounts.map(t => t.count), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Portfolio by Tier</h3>
      <div className="space-y-3">
        {tierCounts.map(tier => (
          <div key={tier.code} className="flex items-center gap-3">
            <div className="w-28 text-right">
              <span className="text-xs font-medium text-gray-600">{tier.label}</span>
            </div>
            <div className="flex-1 relative h-7 bg-gray-100 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${Math.max((tier.count / maxCount) * 100, 2)}%`,
                  backgroundColor: tier.color,
                }}
              />
              <span className="absolute inset-0 flex items-center px-2.5 text-xs font-semibold"
                style={{ color: tier.count / maxCount > 0.3 ? tier.textColor : '#374151' }}>
                {tier.count} donor{tier.count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="w-20 text-right text-xs text-gray-500 font-medium">
              {formatCurrency(tier.giving)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
