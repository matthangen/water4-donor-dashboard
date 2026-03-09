import { calculateHealthScore, scoresByOfficer } from '../utils/portfolioHealth.js'
import { formatCurrency } from '../utils/tiers.js'

export default function PortfolioHealth({ donors }) {
  const overall  = calculateHealthScore(donors)
  const officers = scoresByOfficer(donors)
  const hasMultipleOfficers = officers.length > 1

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Portfolio Health</h3>
      </div>

      <div className="p-5">
        {/* Big score */}
        <div className="flex items-start gap-5 mb-5">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#E2E8F0" strokeWidth="8" />
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke={overall.grade.ring}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - overall.score / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-800 leading-none">{overall.score}</span>
              <span className="text-xs text-gray-400">/100</span>
            </div>
          </div>

          <div className="flex-1">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border mb-2
              ${overall.grade.bg} ${overall.grade.text} ${overall.grade.border}`}>
              {overall.score >= 85 ? '✓' : overall.score >= 70 ? '⚠' : '⚠'} {overall.grade.label}
            </div>
            <p className="text-xs text-gray-400">
              Based on lapse rates, FY retention, contact recency, and giving trends across {donors.length} donors.
            </p>
          </div>
        </div>

        {/* Deductions */}
        {overall.deductions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">What's hurting the score</p>
            <div className="space-y-1.5">
              {overall.deductions.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-1.5 ${
                    d.severity === 'high' ? 'text-red-600' : d.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'
                  }`}>
                    <span>{d.severity === 'high' ? '⚠' : '→'}</span>
                    {d.label}
                  </span>
                  <span className={`text-xs font-semibold tabular-nums ${
                    d.severity === 'high' ? 'text-red-500' : d.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'
                  }`}>
                    -{d.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Positives */}
        {overall.positives.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Strengths</p>
            <div className="space-y-1">
              {overall.positives.map((p, i) => (
                <div key={i} className="text-sm text-emerald-600 flex items-center gap-1.5">
                  <span>✓</span> {p.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-officer scores */}
        {hasMultipleOfficers && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By Gift Officer</p>
            <div className="space-y-2">
              {officers.map(o => (
                <div key={o.officer} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 flex-1 truncate">{o.officer}</span>
                  <span className="text-xs text-gray-400">{o.donorCount} donors</span>
                  <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${o.score}%`, backgroundColor: o.grade.ring }} />
                  </div>
                  <span className={`text-xs font-bold w-8 text-right ${o.grade.text}`}>{o.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
