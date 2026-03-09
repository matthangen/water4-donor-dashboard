import { useState, useMemo } from 'react'
import { formatCurrency, TIERS } from '../utils/tiers.js'

const SORT_OPTIONS = [
  { value: 'totalGiving_desc',    label: 'Giving: High → Low' },
  { value: 'totalGiving_asc',     label: 'Giving: Low → High' },
  { value: 'lastGiftDate_desc',   label: 'Last Gift: Most Recent' },
  { value: 'lastGiftDate_asc',    label: 'Last Gift: Oldest' },
  { value: 'currentFYGiving_desc',label: 'This FY: High → Low' },
  { value: 'name_asc',            label: 'Name A → Z' },
]

export default function DonorTable({ donors, onSelectDonor }) {
  const [search, setSearch]     = useState('')
  const [tier, setTier]         = useState('')
  const [alertOnly, setAlert]   = useState(false)
  const [sort, setSort]         = useState('totalGiving_desc')
  const [page, setPage]         = useState(1)
  const PER_PAGE = 25

  const filtered = useMemo(() => {
    let list = donors

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        (d.accountName || '').toLowerCase().includes(q) ||
        (d.primaryContact || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q)
      )
    }
    if (tier) list = list.filter(d => d.tier?.code === tier)
    if (alertOnly) list = list.filter(d => d.alerts?.length > 0)

    const [field, dir] = sort.split('_')
    list = [...list].sort((a, b) => {
      let av, bv
      if (field === 'name') {
        av = (a.accountName || a.primaryContact || '').toLowerCase()
        bv = (b.accountName || b.primaryContact || '').toLowerCase()
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      } else if (field === 'lastGiftDate') {
        av = a.lastGiftDate ? new Date(a.lastGiftDate).getTime() : 0
        bv = b.lastGiftDate ? new Date(b.lastGiftDate).getTime() : 0
      } else {
        av = parseFloat(a[field]) || 0
        bv = parseFloat(b[field]) || 0
      }
      return dir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [donors, search, tier, alertOnly, sort])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const page_     = Math.min(page, totalPages || 1)
  const paged     = filtered.slice((page_ - 1) * PER_PAGE, page_ * PER_PAGE)

  function resetPage() { setPage(1) }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Filters bar */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search donors…"
          value={search}
          onChange={e => { setSearch(e.target.value); resetPage() }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
        />
        <select
          value={tier}
          onChange={e => { setTier(e.target.value); resetPage() }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
        >
          <option value="">All Tiers</option>
          {TIERS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
        </select>
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); resetPage() }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={alertOnly}
            onChange={e => { setAlert(e.target.checked); resetPage() }}
            className="rounded accent-teal"
          />
          Alerts only
        </label>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} donors</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-semibold">Name / Account</th>
              <th className="text-left px-4 py-3 font-semibold">Tier</th>
              <th className="text-right px-4 py-3 font-semibold">All-Time</th>
              <th className="text-right px-4 py-3 font-semibold">This FY</th>
              <th className="text-left px-4 py-3 font-semibold">Last Gift</th>
              <th className="text-left px-4 py-3 font-semibold">Alerts</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-10 text-sm">
                  No donors match the current filters.
                </td>
              </tr>
            )}
            {paged.map((donor, i) => (
              <tr
                key={donor._id}
                onClick={() => onSelectDonor(donor)}
                className={`border-b border-gray-50 cursor-pointer hover:bg-teal-dim transition-colors
                  ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{donor.accountName || donor.primaryContact || '—'}</div>
                  {donor.accountName && donor.primaryContact && donor.primaryContact !== donor.accountName && (
                    <div className="text-xs text-gray-400">{donor.primaryContact}</div>
                  )}
                  {(donor.city || donor.state) && (
                    <div className="text-xs text-gray-400">{[donor.city, donor.state].filter(Boolean).join(', ')}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {donor.tier && (
                    <span
                      className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: donor.tier.color, color: donor.tier.textColor }}
                    >
                      {donor.tier.label}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">
                  {formatCurrency(donor.totalGiving)}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {donor.currentFYGiving ? formatCurrency(donor.currentFYGiving) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {donor.lastGiftDate
                    ? new Date(donor.lastGiftDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {donor.alerts?.length > 0 && (
                    <span className="text-xs font-medium text-red-600">
                      {donor.alerts.length} alert{donor.alerts.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page_ <= 1}
            className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Prev
          </button>
          <span>Page {page_} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page_ >= totalPages}
            className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
