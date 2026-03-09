import { useState, useMemo } from 'react'
import { generateMovesPlan, tasksToCSV, officerTasksToCSV, summarizePlan } from '../utils/movesPlanner.js'
import { formatCurrency } from '../utils/tiers.js'

const PRIORITY_COLORS = {
  HIGH:   'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW:    'bg-blue-100 text-blue-700 border-blue-200',
}

const TYPE_COLORS = {
  call:            'bg-teal/10 text-teal border-teal/20',
  email:           'bg-indigo-50 text-indigo-700 border-indigo-100',
  handwritten_note:'bg-gold/10 text-amber-800 border-gold/20',
  meeting:         'bg-emerald-50 text-emerald-700 border-emerald-100',
  impact_report:   'bg-purple-50 text-purple-700 border-purple-100',
  field_visit:     'bg-orange-50 text-orange-700 border-orange-100',
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function MovesManager({ donors }) {
  const [planWeeks, setPlanWeeks]       = useState(52)
  const [maxPerDay, setMaxPerDay]       = useState(10)
  const [defaultOwner, setDefaultOwner] = useState('Gift Officer')
  const [startDate, setStartDate]       = useState('')  // '' = auto next Monday
  const [generated, setGenerated]       = useState(false)
  const [tasks, setTasks]               = useState([])
  const [view, setView]                 = useState('by-day')   // 'by-day' | 'by-officer' | 'summary'
  const [filterOfficer, setFilterOfficer] = useState('all')
  const [filterType, setFilterType]       = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [weekOffset, setWeekOffset]       = useState(0)  // for by-day week navigation

  const donorsWithOfficer = donors.filter(d => d.tier?.code !== 'prospect' && d.tier?.code !== 'friend' || (parseFloat(d.totalGiving) || 0) > 0)

  function generate() {
    const opts = {
      planWeeks,
      maxPerDay,
      defaultOwner,
    }
    if (startDate) {
      opts.planStart = new Date(startDate + 'T00:00:00')
    }
    const result = generateMovesPlan(donors, opts)
    setTasks(result)
    setGenerated(true)
    setWeekOffset(0)
    setView('by-day')
  }

  const summary = useMemo(() => generated ? summarizePlan(tasks) : null, [tasks, generated])

  const officers = useMemo(() =>
    [...new Set(tasks.map(t => t.giftOfficer))].sort(),
    [tasks]
  )

  const filteredTasks = useMemo(() => {
    let list = tasks
    if (filterOfficer !== 'all') list = list.filter(t => t.giftOfficer === filterOfficer)
    if (filterType !== 'all')    list = list.filter(t => t.activityCode === filterType)
    if (filterPriority !== 'all')list = list.filter(t => t.priority === filterPriority)
    return list
  }, [tasks, filterOfficer, filterType, filterPriority])

  // Group by-day view into weeks
  const tasksByDate = useMemo(() => {
    const grouped = {}
    for (const t of filteredTasks) {
      if (!grouped[t.date]) grouped[t.date] = []
      grouped[t.date].push(t)
    }
    return grouped
  }, [filteredTasks])

  const allDates = Object.keys(tasksByDate).sort()

  // Week navigation
  const DATES_PER_PAGE = 5  // show 5 business days at a time
  const totalPages = Math.ceil(allDates.length / DATES_PER_PAGE)
  const visibleDates = allDates.slice(weekOffset * DATES_PER_PAGE, (weekOffset + 1) * DATES_PER_PAGE)

  // By-officer view
  const tasksByOfficer = useMemo(() => {
    const grouped = {}
    for (const t of filteredTasks) {
      if (!grouped[t.giftOfficer]) grouped[t.giftOfficer] = []
      grouped[t.giftOfficer].push(t)
    }
    return grouped
  }, [filteredTasks])

  // ── Pre-generation screen ──────────────────────────────────────────────────
  if (!generated) {
    const donorCount = donors.filter(d => {
      const code = d.tier?.code
      return code && !['prospect'].includes(code)
    }).length

    // Estimate total touches
    const touchCounts = { transformational: 12, leadership: 8, major: 6, mid_level: 4, donor: 3, friend: 2 }
    const estimatedTouches = donors.reduce((sum, d) => sum + (touchCounts[d.tier?.code] || 0), 0)

    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-teal to-teal-light px-6 py-5">
            <h2 className="font-serif text-white text-xl">Moves Management Planner</h2>
            <p className="text-white/60 text-sm mt-1">
              Generate a year of stewardship tasks — one daily task list per gift officer
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Portfolio summary */}
            <div className="bg-teal-dim rounded-xl p-4 border border-teal/10">
              <p className="text-teal font-semibold text-sm mb-2">Portfolio ready to plan</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-teal">{donorCount}</p>
                  <p className="text-xs text-gray-500">Donors</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal">{estimatedTouches.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Est. Annual Touches</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal">
                    {[...new Set(donors.map(d => d.giftOfficer).filter(Boolean))].length || 1}
                  </p>
                  <p className="text-xs text-gray-500">Gift Officers</p>
                </div>
              </div>
            </div>

            {/* Cadence reference */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Touch cadence by tier</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Transformational ($100K+)', touches: 12, desc: 'Monthly — calls, meetings, notes, reports, field visits' },
                  { label: 'Leadership ($25K+)',         touches: 8,  desc: 'Bi-monthly — calls, meetings, reports, notes' },
                  { label: 'Major Donor ($10K+)',         touches: 6,  desc: 'Bi-monthly — emails, calls, reports' },
                  { label: 'Mid-Level ($5K+)',            touches: 4,  desc: 'Quarterly — emails, reports' },
                  { label: 'Donor ($1K+)',                touches: 3,  desc: 'Triannual — email, report, year-end' },
                  { label: 'Friend ($1+)',                touches: 2,  desc: 'Semi-annual — thank-you, year-end' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3 text-sm">
                    <span className="w-4 h-4 rounded-full bg-teal text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {row.touches}
                    </span>
                    <span className="font-medium text-gray-700 w-44 shrink-0">{row.label}</span>
                    <span className="text-gray-400 text-xs">{row.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan settings</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Plan start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave blank to start next Monday</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Plan duration</label>
                  <select
                    value={planWeeks}
                    onChange={e => setPlanWeeks(Number(e.target.value))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  >
                    <option value={13}>13 weeks (Q1)</option>
                    <option value={26}>26 weeks (6 months)</option>
                    <option value={52}>52 weeks (full year)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Max tasks / officer / day</label>
                  <input
                    type="number"
                    min={3}
                    max={25}
                    value={maxPerDay}
                    onChange={e => setMaxPerDay(Number(e.target.value))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Default gift officer name</label>
                  <input
                    type="text"
                    value={defaultOwner}
                    onChange={e => setDefaultOwner(e.target.value)}
                    placeholder="For donors without an owner"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </div>
              </div>

              <button
                onClick={generate}
                className="w-full bg-teal text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-light transition-colors"
              >
                Generate Moves Plan →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Post-generation view ───────────────────────────────────────────────────
  return (
    <div>
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2">
          {[
            { id: 'by-day',     label: 'Daily View' },
            { id: 'by-officer', label: 'By Officer' },
            { id: 'summary',    label: 'Summary' },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`text-sm px-4 py-1.5 rounded-lg font-medium border transition-colors
                ${view === v.id ? 'bg-teal text-white border-teal' : 'bg-white text-gray-600 border-gray-200 hover:border-teal hover:text-teal'}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <select
          value={filterOfficer}
          onChange={e => { setFilterOfficer(e.target.value); setWeekOffset(0) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal/30"
        >
          <option value="all">All Gift Officers</option>
          {officers.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <select
          value={filterPriority}
          onChange={e => { setFilterPriority(e.target.value); setWeekOffset(0) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal/30"
        >
          <option value="all">All Priorities</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>

        <div className="ml-auto flex gap-2">
          {filterOfficer !== 'all' ? (
            <button
              onClick={() => downloadCSV(officerTasksToCSV(tasks, filterOfficer), `water4-moves-${filterOfficer.replace(/\s+/g,'-').toLowerCase()}.csv`)}
              className="text-sm bg-gold text-white px-4 py-1.5 rounded-lg font-medium hover:bg-gold-light transition-colors"
            >
              ↓ Export {filterOfficer}
            </button>
          ) : (
            <button
              onClick={() => downloadCSV(tasksToCSV(tasks), 'water4-moves-plan.csv')}
              className="text-sm bg-gold text-white px-4 py-1.5 rounded-lg font-medium hover:bg-gold-light transition-colors"
            >
              ↓ Export All CSV
            </button>
          )}
          <button
            onClick={() => setGenerated(false)}
            className="text-sm text-gray-400 hover:text-teal border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Reconfigure
          </button>
        </div>
      </div>

      {/* Plan stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Tasks',       value: filteredTasks.length.toLocaleString() },
          { label: 'Gift Officers',     value: officers.length },
          { label: 'High Priority',     value: filteredTasks.filter(t => t.priority === 'HIGH').length.toLocaleString() },
          { label: 'Plan Duration',     value: `${planWeeks}wk` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
            <p className="text-xl font-bold text-teal">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Daily View ── */}
      {view === 'by-day' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            <button
              onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
              className="text-sm px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
            >← Prev
            </button>
            <span className="text-sm text-gray-500 font-medium">
              Days {weekOffset * DATES_PER_PAGE + 1}–{Math.min((weekOffset + 1) * DATES_PER_PAGE, allDates.length)} of {allDates.length}
            </span>
            <button
              onClick={() => setWeekOffset(w => Math.min(totalPages - 1, w + 1))}
              disabled={weekOffset >= totalPages - 1}
              className="text-sm px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
            >Next →
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {visibleDates.map(date => {
              const dayTasks = tasksByDate[date]
              const d = new Date(date + 'T12:00:00')
              const isMonday = d.getDay() === 1
              return (
                <div key={date} className={`${isMonday ? 'bg-teal-dim/30' : ''}`}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 px-5 py-2 border-b border-gray-100">
                    <div className="text-center w-10">
                      <p className="text-lg font-bold text-teal leading-none">{d.getDate()}</p>
                      <p className="text-xs text-gray-400 uppercase">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">
                        {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-gray-400">{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</span>
                      {dayTasks.some(t => t.priority === 'HIGH') && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          {dayTasks.filter(t => t.priority === 'HIGH').length} high priority
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tasks for this day */}
                  <div className="divide-y divide-gray-50">
                    {dayTasks.map((task, i) => (
                      <TaskRow key={i} task={task} />
                    ))}
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
            const dailyAvg = (officerTasks.length / (planWeeks * 5)).toFixed(1)
            const highCount = officerTasks.filter(t => t.priority === 'HIGH').length

            return (
              <div key={officer} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-teal px-5 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{officer}</h3>
                    <p className="text-white/60 text-xs">
                      {officerTasks.length} total tasks · {dailyAvg} avg/day · {highCount} high priority
                    </p>
                  </div>
                  <button
                    onClick={() => downloadCSV(officerTasksToCSV(tasks, officer), `water4-moves-${officer.replace(/\s+/g,'-').toLowerCase()}.csv`)}
                    className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ↓ Export CSV
                  </button>
                </div>

                {/* Activity type breakdown */}
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3">
                  {Object.entries(
                    officerTasks.reduce((acc, t) => {
                      acc[t.activityCode] = (acc[t.activityCode] || 0) + 1
                      return acc
                    }, {})
                  ).map(([type, count]) => (
                    <span key={type} className={`text-xs px-2 py-1 rounded-full border font-medium ${TYPE_COLORS[type] || ''}`}>
                      {count}× {type.replace(/_/g,' ')}
                    </span>
                  ))}
                </div>

                {/* First 10 upcoming tasks */}
                <div className="divide-y divide-gray-50">
                  {officerTasks.slice(0, 10).map((task, i) => (
                    <TaskRow key={i} task={task} showDate />
                  ))}
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
          {/* Activity type totals */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Activity Type Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(summary.byType).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
                <div key={type} className={`p-3 rounded-xl border ${TYPE_COLORS[type] || 'bg-gray-50 border-gray-100'}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-medium capitalize mt-0.5">{type.replace(/_/g,' ')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Per-officer summaries */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Officer Workload Summary</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Gift Officer</th>
                  <th className="text-right px-5 py-3">Total Tasks</th>
                  <th className="text-right px-5 py-3">High Priority</th>
                  <th className="text-right px-5 py-3">Avg / Day</th>
                  <th className="text-right px-5 py-3">Peak Day</th>
                  <th className="text-right px-5 py-3">Peak Load</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.byOfficer)
                  .sort((a,b) => b[1].total - a[1].total)
                  .map(([officer, data], i) => (
                  <tr key={officer} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-800">{officer}</td>
                    <td className="px-5 py-3 text-right font-bold text-teal">{data.total}</td>
                    <td className="px-5 py-3 text-right text-red-600 font-medium">{data.highPriority}</td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {(data.total / (planWeeks * 5)).toFixed(1)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400 text-xs">{data.peakDay || '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{data.peakCount}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => downloadCSV(officerTasksToCSV(tasks, officer), `water4-moves-${officer.replace(/\s+/g,'-').toLowerCase()}.csv`)}
                        className="text-xs text-teal hover:underline"
                      >
                        Export ↓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tier breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Tasks by Donor Tier</h3>
            <div className="space-y-2">
              {Object.entries(summary.byTier).sort((a,b) => b[1]-a[1]).map(([tier, count]) => (
                <div key={tier} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-36 capitalize">{tier.replace(/_/g,' ')}</span>
                  <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                    <div
                      className="h-full bg-teal rounded"
                      style={{ width: `${(count / summary.total) * 100}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-white">
                      {count} tasks
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {Math.round((count / summary.total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Task Row Component ─────────────────────────────────────────────────────
function TaskRow({ task, showDate = false }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors">
      {/* Activity icon + type */}
      <div className="w-7 text-center text-base">{task.activityIcon}</div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showDate && (
            <span className="text-xs text-gray-400 font-medium w-20 shrink-0">
              {new Date(task.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <span className="text-sm font-semibold text-gray-800 truncate">{task.donorName}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
            style={{
              backgroundColor: tierColor(task.tierCode)?.bg,
              color: tierColor(task.tierCode)?.text,
            }}
          >
            {task.tier}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {!showDate && task.giftOfficer && (
          <span className="text-xs text-gray-400 hidden sm:block">{task.giftOfficer}</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
      </div>
    </div>
  )
}

function tierColor(code) {
  const map = {
    transformational: { bg: '#1B4D5C', text: '#fff' },
    leadership:       { bg: '#2A6B7E', text: '#fff' },
    major:            { bg: '#3A8FA5', text: '#fff' },
    mid_level:        { bg: '#C4963E', text: '#fff' },
    donor:            { bg: '#D4AD5A', text: '#1E293B' },
    friend:           { bg: '#94A3B8', text: '#fff' },
  }
  return map[code] || { bg: '#E2E8F0', text: '#475569' }
}
