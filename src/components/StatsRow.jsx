import { formatCurrency } from '../utils/tiers.js'

export default function StatsRow({ donors }) {
  const totalGiving     = donors.reduce((s, d) => s + (parseFloat(d.totalGiving) || 0), 0)
  const fyGiving        = donors.reduce((s, d) => s + (parseFloat(d.currentFYGiving) || 0), 0)
  const withAlerts      = donors.filter(d => d.alerts?.length > 0).length
  const highAlerts      = donors.filter(d => d.alerts?.some(a => a.severity === 'high')).length

  const stats = [
    { label: 'Total Donors',       value: donors.length.toLocaleString(),     sub: 'in portfolio' },
    { label: 'All-Time Giving',    value: formatCurrency(totalGiving),         sub: 'lifetime total' },
    { label: 'This FY',            value: formatCurrency(fyGiving),            sub: 'current fiscal year' },
    { label: 'Needs Attention',    value: withAlerts.toLocaleString(),         sub: `${highAlerts} high priority`, alert: highAlerts > 0 },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
          <p className={`text-2xl font-bold ${s.alert ? 'text-red-600' : 'text-teal'}`}>{s.value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
  )
}
