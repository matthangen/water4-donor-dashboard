import { useState, useMemo } from 'react'
import {
  generateMovesPlan, tasksToCSV, officerTasksToCSV, summarizePlan,
  DEFAULT_CADENCE_CONFIG, ACTIVITY_TYPES, TIER_DEFS, nextMonday,
} from '../utils/movesPlanner.js'

// ── Style helpers ──────────────────────────────────────────────────────────

const PRIORITY_PILL = {
  HIGH:   'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW:    'bg-blue-100 text-blue-700 border-blue-200',
}

const EFFORT_COLOR = {
  'High effort':   'text-red-600',
  'Medium effort': 'text-amber-600',
  'Low effort':    'text-gray-400',
}

const TYPE_PILL = {
  meeting:          'bg-teal/10 text-teal border-teal/20',
  field_visit:      'bg-orange-50 text-orange-700 border-orange-100',
  call:             'bg-emerald-50 text-emerald-700 border-emerald-100',
  handwritten_note: 'bg-gold/10 text-amber-800 border-gold/20',
  impact_report:    'bg-purple-50 text-purple-700 border-purple-100',
  email:            'bg-gray-100 text-gray-500 border-gray-200',
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function totalTouches(config) {
  return Object.values(config).reduce((s, v) => s + (v || 0), 0)
}

// ── Main component ─────────────────────────────────────────────────────────

export default function MovesManager({ donors }) {
  // Step 1: configure; Step 2: view results
  const [step, setStep] = useState('configure')

  // Config state
  const [cadenceConfig, setCadenceConfig] = useState(() =>
    JSON.parse(JSON.stringify(DEFAULT_CADENCE_CONFIG))
  )
  const [planWeeks, setPlanWeeks]       = useState(52)
  const [maxPerDay, setMaxPerDay]       = useState(10)
  const [defaultOwner, setDefaultOwner] = useState('Gift Officer')
  const [startDate, setStartDate]       = useState('')

  // Results state
  const [tasks, setTasks]   = useState([])
  const [view, setView]     = useState('by-day')
  const [filterOfficer, setFilterOfficer]   = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterType, setFilterType]         = useState('all')
  const [pageOffset, setPageOffset]         = useState(0)

  function setCount(tier, type, value) {
    const n = Math.max(0, Math.min(12, parseInt(value) || 0))
    setCadenceConfig(prev => ({
      ...prev,
      [tier]: { ...prev[tier], [type]: n },
    }))
  }

  function resetDefaults() {
    setCadenceConfig(JSON.parse(JSON.stringify(DEFAULT_CADENCE_CONFIG)))
  }

  function generate() {
    const opts = { planWeeks, maxPerDay, defaultOwner, cadenceConfig }
    if (startDate) opts.planStart = new Date(startDate + 'T00:00:00')
    setTasks(generateMovesPlan(donors, opts))
    setPageOffset(0)
    setStep('results')
  }

  const summary  = useMemo(() => tasks.length ? summarizePlan(tasks) : null, [tasks])
  const officers = useMemo(() => [...new Set(tasks.map(t => t.giftOfficer))].sort(), [tasks])

  const filteredTasks = useMemo(() => {
    let list = tasks
    if (filterOfficer !== 'all')  list = list.filter(t => t.giftOfficer === filterOfficer)
    if (filterPriority !== 'all') list = list.filter(t => t.priority === filterPriority)
    if (filterType !== 'all')     list = list.filter(t => t.activityCode === filterType)
    return list
  }, [tasks, filterOfficer, filterPriority, filterType])

  const tasksByDate = useMemo(() => {
    const g = {}
    for (const t of filteredTasks) { if (!g[t.date]) g[t.date] = []; g[t.date].push(t) }
    return g
  }, [filteredTasks])

  const allDates    = Object.keys(tasksByDate).sort()
  const PER_PAGE    = 5
  const totalPages  = Math.ceil(allDates.length / PER_PAGE)
  const visibleDates = allDates.slice(pageOffset * PER_PAGE, (pageOffset + 1) * PER_PAGE)

  const tasksByOfficer = useMemo(() => {
    const g = {}
    for (const t of filteredTasks) { if (!g[t.giftOfficer]) g[t.giftOfficer] = []; g[t.giftOfficer].push(t) }
    return g
  }, [filteredTasks])

  // ── Step 1: Configure ────────────────────────────────────────────────────
  if (step === 'configure') {
    const estimatedTotal = donors.reduce((sum, d) => {
      const cfg = cadenceConfig[d.tier?.code]
      return sum + (cfg ? totalTouches(cfg) : 0)
    }, 0)

    return (
      <div className="max-w-5xl mx-auto py-6">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal to-teal-light px-6 py-5 flex items-start justify-between">
            <div>
              <h2 className="font-serif text-white text-xl">Moves Management Planner</h2>
              <p className="text-white/60 text-sm mt-1">
                Set exactly how many of each activity type each tier receives — then generate the year-long task calendar
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs uppercase tracking-wider">Est. annual tasks</p>
              <p className="text-white text-3xl font-bold">{estimatedTotal.toLocaleString()}</p>
            </div>
          </div>

          {/* Cadence editor */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Annual touches per tier — specify counts by activity type
              </p>
              <button
                onClick={resetDefaults}
                className="text-xs text-teal hover:underline"
              >
                Reset to defaults
              </button>
            </div>

            {/* Effort legend */}
            <div className="flex gap-4 mb-4 text-xs">
              {ACTIVITY_TYPES.map(a => (
                <span key={a.code} className={`flex items-center gap-1 ${EFFORT_COLOR[a.effort]}`}>
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                  <span className="text-gray-300">·</span>
                  <span className="font-medium">{a.effort}</span>
                </span>
              ))}
            </div>

            {/* Grid table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-40">Tier</th>
                    {ACTIVITY_TYPES.map(a => (
                      <th key={a.code} className="px-3 py-3 text-center min-w-[90px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-base">{a.icon}</span>
                          <span className="text-xs font-semibold text-gray-600 leading-tight">{a.label.split(' / ')[0]}</span>
                          <span className={`text-xs font-medium ${EFFORT_COLOR[a.effort]}`}>{a.effort}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Total / yr</th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_DEFS.map((tier, i) => {
                    const cfg   = cadenceConfig[tier.code] || {}
                    const total = totalTouches(cfg)
                    return (
                      <tr key={tier.code} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800 text-sm">{tier.label}</p>
                          <p className="text-xs text-gray-400">{tier.range}</p>
                        </td>
                        {ACTIVITY_TYPES.map(a => (
                          <td key={a.code} className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={12}
                              value={cfg[a.code] ?? 0}
                              onChange={e => setCount(tier.code, a.code, e.target.value)}
                              className={`w-14 text-center text-sm font-semibold border rounded-lg px-2 py-1.5
                                focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal
                                ${(cfg[a.code] || 0) > 0
                                  ? 'border-teal/30 bg-teal-dim text-teal'
                                  : 'border-gray-200 bg-white text-gray-300'
                                }`}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <span className={`text-lg font-bold ${total > 0 ? 'text-teal' : 'text-gray-300'}`}>
                            {total}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {/* Column totals */}
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Total (all tiers)
                    </td>
                    {ACTIVITY_TYPES.map(a => {
                      const colTotal = TIER_DEFS.reduce((s, t) => s + (cadenceConfig[t.code]?.[a.code] || 0), 0)
                      return (
                        <td key={a.code} className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${colTotal > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                            {colTotal}
                          </span>
                          <span className="text-xs text-gray-400 ml-0.5">/tier</span>
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-gray-700">
                        {TIER_DEFS.reduce((s, t) => s + totalTouches(cadenceConfig[t.code] || {}), 0)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Accountability callout */}
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
              <span className="text-amber-500 text-lg mt-0.5">⚠</span>
              <div className="text-sm text-amber-800">
                <strong>Moves management principle:</strong> Activity types are sorted by effort level. In-person meetings and calls should represent the majority of high-tier touches. Email is lowest-effort and lowest-priority — the plan enforces this by assigning it LOW priority in the task list so it never gets done before the harder, higher-impact activities.
              </div>
            </div>

            {/* Plan settings */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Plan settings</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Plan start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                  <p className="text-xs text-gray-400 mt-1">Blank = next Monday</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Duration</label>
                  <select value={planWeeks} onChange={e => setPlanWeeks(Number(e.target.value))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
                    <option value={13}>13 weeks (Q1)</option>
                    <option value={26}>26 weeks (6 months)</option>
                    <option value={52}>52 weeks (full year)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Max tasks / officer / day</label>
                  <input type="number" min={3} max={25} value={maxPerDay}
                    onChange={e => setMaxPerDay(Number(e.target.value))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Default gift officer</label>
                  <input type="text" value={defaultOwner} onChange={e => setDefaultOwner(e.target.value)}
                    placeholder="For donors without an owner"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
                </div>
              </div>

              <button onClick={generate}
                className="mt-5 w-full bg-teal text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-light transition-colors">
                Generate {estimatedTotal.toLocaleString()} Stewardship Tasks →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Results ──────────────────────────────────────────────────────
  return (
    <div>
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2">
          {[
            { id: 'by-day',     label: 'Daily View' },
            { id: 'by-officer', label: 'By Officer' },
            { id: 'summary',    label: 'Summary' },
          ].map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`text-sm px-4 py-1.5 rounded-lg font-medium border transition-colors
                ${view === v.id ? 'bg-teal text-white border-teal' : 'bg-white text-gray-600 border-gray-200 hover:border-teal hover:text-teal'}`}>
              {v.label}
            </button>
          ))}
        </div>

        <select value={filterOfficer} onChange={e => { setFilterOfficer(e.target.value); setPageOffset(0) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none">
          <option value="all">All Gift Officers</option>
          {officers.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPageOffset(0) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none">
          <option value="all">All Activity Types</option>
          {ACTIVITY_TYPES.map(a => <option key={a.code} value={a.code}>{a.icon} {a.label}</option>)}
        </select>

        <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPageOffset(0) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none">
          <option value="all">All Priorities</option>
          <option value="HIGH">HIGH — Meetings &amp; Calls</option>
          <option value="MEDIUM">MEDIUM — Notes &amp; Reports</option>
          <option value="LOW">LOW — Emails</option>
        </select>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => downloadCSV(
              filterOfficer !== 'all' ? officerTasksToCSV(tasks, filterOfficer) : tasksToCSV(tasks),
              filterOfficer !== 'all'
                ? `water4-moves-${filterOfficer.replace(/\s+/g,'-').toLowerCase()}.csv`
                : 'water4-moves-plan.csv'
            )}
            className="text-sm bg-gold text-white px-4 py-1.5 rounded-lg font-medium hover:bg-gold-light transition-colors">
            ↓ Export CSV
          </button>
          <button onClick={() => setStep('configure')}
            className="text-sm text-gray-400 hover:text-teal border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
            Edit Plan
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Tasks',   value: filteredTasks.length.toLocaleString() },
          { label: 'High Priority', value: filteredTasks.filter(t => t.priority === 'HIGH').length.toLocaleString(),   sub: 'meetings & calls' },
          { label: 'Medium',        value: filteredTasks.filter(t => t.priority === 'MEDIUM').length.toLocaleString(), sub: 'notes & reports' },
          { label: 'Low (Email)',   value: filteredTasks.filter(t => t.priority === 'LOW').length.toLocaleString(),    sub: 'lowest effort' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
            <p className="text-xl font-bold text-teal">{s.value}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
            {s.sub && <p className="text-xs text-gray-400">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Daily View ── */}
      {view === 'by-day' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
            <button onClick={() => setPageOffset(p => Math.max(0, p - 1))} disabled={pageOffset === 0}
              className="text-sm px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors">
              ← Prev
            </button>
            <span className="text-sm text-gray-500 font-medium">
              Days {pageOffset * PER_PAGE + 1}–{Math.min((pageOffset + 1) * PER_PAGE, allDates.length)} of {allDates.length}
            </span>
            <button onClick={() => setPageOffset(p => Math.min(totalPages - 1, p + 1))} disabled={pageOffset >= totalPages - 1}
              className="text-sm px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors">
              Next →
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {visibleDates.map(date => {
              const dayTasks = tasksByDate[date]
              const d = new Date(date + 'T12:00:00')
              const highCount = dayTasks.filter(t => t.priority === 'HIGH').length
              return (
                <div key={date}>
                  <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50/80 border-b border-gray-100">
                    <div className="text-center w-10 shrink-0">
                      <p className="text-xl font-bold text-teal leading-none">{d.getDate()}</p>
                      <p className="text-xs text-gray-400 uppercase">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}</p>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    <div className="ml-auto flex items-center gap-2">
                      {highCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          {highCount} high priority
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{dayTasks.length} tasks</span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {dayTasks.map((task, i) => <TaskRow key={i} task={task} />)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── By Officer View ── */}
      {view === 'by-officer' && (
        <div className="space-y-5">
          {Object.entries(tasksByOfficer).map(([officer, officerTasks]) => {
            const dailyAvg  = (officerTasks.length / (planWeeks * 5)).toFixed(1)
            const highCount = officerTasks.filter(t => t.priority === 'HIGH').length
            const typeCounts = officerTasks.reduce((acc, t) => { acc[t.activityCode] = (acc[t.activityCode]||0)+1; return acc }, {})

            return (
              <div key={officer} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-teal px-5 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{officer}</h3>
                    <p className="text-white/60 text-xs">
                      {officerTasks.length} tasks · {dailyAvg} avg/day · {highCount} high priority
                    </p>
                  </div>
                  <button
                    onClick={() => downloadCSV(officerTasksToCSV(tasks, officer), `water4-moves-${officer.replace(/\s+/g,'-').toLowerCase()}.csv`)}
                    className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors">
                    ↓ Export CSV
                  </button>
                </div>
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-2">
                  {ACTIVITY_TYPES.filter(a => typeCounts[a.code]).map(a => (
                    <span key={a.code} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${TYPE_PILL[a.code]}`}>
                      {a.icon} {typeCounts[a.code]}× {a.label}
                    </span>
                  ))}
                </div>
                <div className="divide-y divide-gray-50">
                  {officerTasks.slice(0, 10).map((task, i) => <TaskRow key={i} task={task} showDate />)}
                  {officerTasks.length > 10 && (
                    <div className="px-5 py-3 text-center text-sm text-gray-400">
                      +{officerTasks.length - 10} more tasks — download CSV for full list
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Summary View ── */}
      {view === 'summary' && summary && (
        <div className="space-y-5">
          {/* Activity type breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Activity Mix</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ACTIVITY_TYPES.filter(a => summary.byType[a.code]).map(a => (
                <div key={a.code} className={`p-4 rounded-xl border ${TYPE_PILL[a.code]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl">{a.icon}</span>
                    <span className={`text-xs font-medium ${EFFORT_COLOR[a.effort]}`}>{a.effort}</span>
                  </div>
                  <p className="text-2xl font-bold">{summary.byType[a.code]}</p>
                  <p className="text-xs font-semibold mt-0.5">{a.label}</p>
                  <p className="text-xs opacity-60 mt-0.5">
                    {Math.round(summary.byType[a.code] / summary.total * 100)}% of all tasks
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Officer workload */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Officer Workload</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Gift Officer</th>
                  {ACTIVITY_TYPES.map(a => (
                    <th key={a.code} className="text-center px-3 py-3">{a.icon}</th>
                  ))}
                  <th className="text-right px-5 py-3">Total</th>
                  <th className="text-right px-5 py-3">Avg/day</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.byOfficer).sort((a,b) => b[1].total - a[1].total).map(([officer, data], i) => (
                  <tr key={officer} className={`border-b border-gray-50 ${i%2===1?'bg-gray-50/40':''}`}>
                    <td className="px-5 py-3 font-medium text-gray-800">{officer}</td>
                    {ACTIVITY_TYPES.map(a => (
                      <td key={a.code} className="px-3 py-3 text-center text-sm">
                        {data.byType[a.code]
                          ? <span className={`font-semibold ${a.priority === 1 ? 'text-teal' : a.priority === 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {data.byType[a.code]}
                            </span>
                          : <span className="text-gray-200">—</span>
                        }
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right font-bold text-teal">{data.total}</td>
                    <td className="px-5 py-3 text-right text-gray-400 text-xs">{(data.total/(planWeeks*5)).toFixed(1)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => downloadCSV(officerTasksToCSV(tasks, officer), `water4-moves-${officer.replace(/\s+/g,'-').toLowerCase()}.csv`)}
                        className="text-xs text-teal hover:underline">
                        Export ↓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Task row ──────────────────────────────────────────────────────────────

function TaskRow({ task, showDate = false }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/80 transition-colors group">
      <div className="text-base w-6 text-center shrink-0">{task.activityIcon}</div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {showDate && (
            <span className="text-xs text-gray-400 font-medium w-16 shrink-0">
              {new Date(task.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
            </span>
          )}
          <span className="text-sm font-semibold text-gray-800 truncate">{task.donorName}</span>
          <TierBadge tier={task.tier} tierCode={task.tierCode} />
          <span className={`text-xs ${EFFORT_COLOR[task.effort]} hidden sm:block`}>{task.effort}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!showDate && (
          <span className="text-xs text-gray-400 hidden md:block">{task.giftOfficer}</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_PILL[task.priority]}`}>
          {task.priority}
        </span>
      </div>
    </div>
  )
}

function TierBadge({ tier, tierCode }) {
  const colors = {
    transformational: { bg: '#1B4D5C', text: '#fff' },
    leadership:       { bg: '#2A6B7E', text: '#fff' },
    major:            { bg: '#3A8FA5', text: '#fff' },
    mid_level:        { bg: '#C4963E', text: '#fff' },
    donor:            { bg: '#D4AD5A', text: '#1E293B' },
    friend:           { bg: '#94A3B8', text: '#fff' },
  }[tierCode] || { bg: '#E2E8F0', text: '#475569' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
      style={{ backgroundColor: colors.bg, color: colors.text }}>
      {tier}
    </span>
  )
}
