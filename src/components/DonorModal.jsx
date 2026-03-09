import { useEffect } from 'react'
import { formatCurrency, formatCurrencyFull } from '../utils/tiers.js'
import { SEVERITY_COLORS } from '../utils/stewardship.js'

export default function DonorModal({ donor, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!donor) return null

  const name = donor.accountName || donor.primaryContact || 'Unknown Donor'

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-16"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal to-teal-light px-6 py-5 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="font-serif text-white text-xl">{name}</h2>
            {donor.primaryContact && donor.primaryContact !== name && (
              <p className="text-white/60 text-sm">{donor.primaryContact}</p>
            )}
            {(donor.city || donor.state) && (
              <p className="text-white/50 text-sm">{[donor.city, donor.state].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {donor.tier && (
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: donor.tier.color, color: donor.tier.textColor }}
              >
                {donor.tier.label}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Giving summary grid */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Giving Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <GivingCard label="All-Time Giving" value={formatCurrencyFull(donor.totalGiving)} highlight />
              <GivingCard label="This FY" value={formatCurrencyFull(donor.currentFYGiving)} />
              <GivingCard label="Last FY" value={formatCurrencyFull(donor.lastFYGiving)} />
              <GivingCard label="Largest Gift" value={formatCurrencyFull(donor.largestGift)} />
              <GivingCard label="Last Gift" value={formatCurrencyFull(donor.lastGiftAmount)} />
              <GivingCard label="# of Gifts" value={donor.giftCount || '—'} />
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Timeline</h3>
            <div className="space-y-2">
              {donor.lastGiftDate && (
                <Row label="Last Gift Date" value={formatDate(donor.lastGiftDate)} />
              )}
              {donor.lastActivityDate && (
                <Row label="Last Activity" value={formatDate(donor.lastActivityDate)} />
              )}
              {donor.giftOfficer && (
                <Row label="Gift Officer" value={donor.giftOfficer} />
              )}
              {donor.prospectStage && (
                <Row label="Stage" value={donor.prospectStage} />
              )}
            </div>
          </div>

          {/* Contact */}
          {(donor.email || donor.phone) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</h3>
              <div className="space-y-2">
                {donor.email && <Row label="Email" value={
                  <a href={`mailto:${donor.email}`} className="text-teal hover:underline">{donor.email}</a>
                } />}
                {donor.phone && <Row label="Phone" value={donor.phone} />}
              </div>
            </div>
          )}

          {/* Alerts */}
          {donor.alerts?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Stewardship Alerts</h3>
              <div className="space-y-2">
                {donor.alerts.map(alert => {
                  const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low
                  return (
                    <div key={alert.code}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
                      <div>
                        <p className={`text-sm font-semibold ${colors.text}`}>{alert.label}</p>
                        <p className={`text-xs ${colors.text} opacity-75`}>{alert.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GivingCard({ label, value, highlight }) {
  return (
    <div className={`rounded-lg p-3 border ${highlight ? 'bg-teal text-white border-teal' : 'bg-gray-50 border-gray-100'}`}>
      <p className={`text-xs uppercase tracking-wider mb-0.5 ${highlight ? 'text-white/60' : 'text-gray-400'}`}>{label}</p>
      <p className={`font-bold text-base ${highlight ? 'text-white' : 'text-gray-800'}`}>{value || '—'}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-32 shrink-0">{label}</span>
      <span className="text-sm text-gray-700">{value || '—'}</span>
    </div>
  )
}

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
