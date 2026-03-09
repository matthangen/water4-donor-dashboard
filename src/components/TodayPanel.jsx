import { useState } from 'react'
import { getTodayPriorities } from '../utils/portfolioHealth.js'
import { getTemplate } from '../utils/templates.js'
import { formatCurrency } from '../utils/tiers.js'
import { SEVERITY_COLORS } from '../utils/stewardship.js'

const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

const SUGGESTED_ACTIVITY = {
  lapsed:       { code: 'call',            label: 'Re-engagement call',      icon: '📞' },
  at_risk:      { code: 'call',            label: 'FY giving conversation',  icon: '📞' },
  lapsing:      { code: 'handwritten_note',label: 'Handwritten outreach',    icon: '✍️' },
  needs_contact:{ code: 'email',           label: 'Personal check-in email', icon: '📧' },
  yoy_decline:  { code: 'call',            label: 'Decline recovery call',   icon: '📞' },
}

export default function TodayPanel({ donors, planTasks = [] }) {
  const [expanded, setExpanded] = useState(null)   // donorId of expanded template
  const [officer, setOfficer]   = useState('all')

  const priorities = getTodayPriorities(donors)
  const officers   = [...new Set(donors.map(d => d.giftOfficer).filter(Boolean))].sort()

  const todayStr  = new Date().toISOString().split('T')[0]
  const todayPlan = planTasks.filter(t => t.date === todayStr)

  const filtered = officer === 'all'
    ? priorities
    : priorities.filter(d => (d.giftOfficer || '') === officer)

  const filteredPlan = officer === 'all'
    ? todayPlan
    : todayPlan.filter(t => t.giftOfficer === officer)

  const totalUrgent = filtered.filter(d => d.urgency >= 8).length

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-serif text-teal text-xl">{TODAY}</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {filtered.length} donor{filtered.length !== 1 ? 's' : ''} need attention
            {totalUrgent > 0 && <span className="text-red-600 font-semibold"> · {totalUrgent} urgent</span>}
          </p>
        </div>
        {officers.length > 1 && (
          <select value={officer} onChange={e => setOfficer(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal/30">
            <option value="all">All Gift Officers</option>
            {officers.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
      </div>

      {/* Scheduled plan tasks for today (if any) */}
      {filteredPlan.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
              Scheduled Today ({filteredPlan.length})
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {filteredPlan.map((task, i) => (
              <PlanTaskRow key={i} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Alert-driven priorities */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
          Needs Your Attention
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="font-semibold text-gray-700">Portfolio looks healthy</p>
          <p className="text-gray-400 text-sm mt-1">No stewardship alerts to act on today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(donor => {
            const id       = donor._id
            const isOpen   = expanded === id
            const activity = SUGGESTED_ACTIVITY[donor.topAlert?.code] || { code: 'call', label: 'Outreach', icon: '📞' }
            const template = isOpen ? getTemplate(activity.code, {
              donorName:       donor.accountName || donor.primaryContact,
              tier:            donor.tier?.label,
              totalGiving:     donor.totalGiving,
              lastGiftAmount:  donor.lastGiftAmount,
              lastGiftDate:    donor.lastGiftDate,
              giftOfficer:     donor.giftOfficer,
            }) : null

            return (
              <div key={id}
                className={`bg-white rounded-xl border transition-all ${isOpen ? 'border-teal/40 shadow-sm' : 'border-gray-200'}`}>
                {/* Donor row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : id)}
                >
                  {/* Urgency indicator */}
                  <div className={`w-1 self-stretch rounded-full ${donor.urgency >= 10 ? 'bg-red-400' : donor.urgency >= 7 ? 'bg-amber-400' : 'bg-blue-300'}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {donor.accountName || donor.primaryContact}
                      </span>
                      {donor.tier && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: donor.tier.color, color: donor.tier.textColor }}>
                          {donor.tier.label}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatCurrency(donor.totalGiving)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {donor.alerts.map(alert => {
                        const c = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low
                        return (
                          <span key={alert.code}
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${c.bg} ${c.text} ${c.border}`}>
                            {alert.label}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Suggested action */}
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-gray-400 hidden sm:block">{activity.icon} {activity.label}</span>
                    <span className={`text-gray-300 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                  </div>
                </div>

                {/* Expanded template */}
                {isOpen && template && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                    <TemplateDisplay template={template} activity={activity} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Plan task row (scheduled tasks for today) ────────────────────────────

function PlanTaskRow({ task }) {
  const [open, setOpen] = useState(false)
  const template = open ? getTemplate(task.activityCode, {
    donorName:      task.donorName,
    tier:           task.tier,
    totalGiving:    task.totalGiving,
    lastGiftDate:   task.lastGiftDate,
    giftOfficer:    task.giftOfficer,
  }) : null

  const PRIORITY_DOT = { HIGH: 'bg-red-400', MEDIUM: 'bg-amber-400', LOW: 'bg-blue-300' }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setOpen(o => !o)}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || 'bg-gray-300'}`} />
        <span className="text-base">{task.activityIcon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800">{task.donorName}</span>
          <span className="text-xs text-gray-400 ml-2">{task.activityType}</span>
          <p className="text-xs text-gray-500 truncate mt-0.5">{task.description}</p>
        </div>
        <span className="text-xs text-gray-400">{task.giftOfficer}</span>
        <span className={`text-gray-300 transition-transform text-sm ${open ? 'rotate-90' : ''}`}>›</span>
      </div>
      {open && template && (
        <div className="border-t border-gray-100 px-4 py-3 bg-teal-dim/30">
          <TemplateDisplay template={template} activity={{ label: task.activityType, icon: task.activityIcon }} />
        </div>
      )}
    </div>
  )
}

// ── Template display ──────────────────────────────────────────────────────

function TemplateDisplay({ template, activity }) {
  const [copied, setCopied] = useState(false)

  function copy(text) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (template.type === 'call') {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-teal">{activity.icon} {template.title}</p>
          <span className="text-xs text-gray-400">{template.duration}</span>
        </div>
        {template.prep?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Prep checklist</p>
            <ul className="space-y-1">
              {template.prep.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="text-gray-300 mt-0.5">□</span> {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-2">
          {template.sections.map((s, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-teal">{s.label}</span>
                <span className="text-xs text-gray-400">{s.time}</span>
              </div>
              {s.script && <p className="text-sm text-gray-700 italic">"{s.script.replace(/^"|"$/g,'')}"</p>}
              {s.points && (
                <ul className="space-y-1 mt-1">
                  {s.points.map((p, j) => <li key={j} className="text-xs text-gray-600 flex gap-2"><span className="text-gray-300">›</span>{p}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (template.type === 'email') {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-teal">{activity.icon} {template.title}</p>
          <button onClick={() => copy(template.body)}
            className="text-xs text-teal border border-teal/30 px-2 py-1 rounded hover:bg-teal-dim transition-colors">
            {copied ? '✓ Copied' : 'Copy draft'}
          </button>
        </div>
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Subject line options</p>
          <div className="space-y-1">
            {template.subjects?.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{i+1}.</span>
                <span className="text-sm text-gray-700">{s}</span>
                <button onClick={() => copy(s)} className="text-xs text-teal hover:underline ml-auto">Copy</button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Draft body</p>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{template.body}</pre>
        </div>
        {template.guidance && (
          <ul className="space-y-1">
            {template.guidance.map((g, i) => (
              <li key={i} className="text-xs text-gray-500 flex gap-2"><span className="text-amber-400">⚠</span>{g}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  if (template.type === 'handwritten_note') {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-teal">{activity.icon} {template.title}</p>
          <button onClick={() => copy(template.fullText)}
            className="text-xs text-teal border border-teal/30 px-2 py-1 rounded hover:bg-teal-dim transition-colors">
            {copied ? '✓ Copied' : 'Copy text'}
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4 mb-3 font-serif">
          <p className="text-sm text-gray-700 mb-2">{template.template.opener}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{template.template.body}</p>
          <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">{template.template.closing}</p>
        </div>
        <ul className="space-y-1">
          {template.guidance?.map((g, i) => (
            <li key={i} className="text-xs text-gray-500 flex gap-2"><span className="text-teal">→</span>{g}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (template.type === 'meeting') {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-teal">{activity.icon} {template.title}</p>
          <span className="text-xs text-gray-400">{template.duration} · {template.format}</span>
        </div>
        {template.prep?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Prep checklist</p>
            <ul className="space-y-1">
              {template.prep.map((p, i) => (
                <li key={i} className="text-xs text-gray-600 flex gap-2"><span className="text-gray-300">□</span>{p}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-2 mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agenda</p>
          {template.agenda?.map((item, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-teal font-semibold w-10">{item.time}</span>
                <span className="text-sm font-semibold text-gray-700">{item.item}</span>
              </div>
              <p className="text-xs text-gray-500 ml-12">{item.notes}</p>
            </div>
          ))}
        </div>
        {template.followUp && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Post-meeting actions</p>
            <ul className="space-y-1">
              {template.followUp.map((f, i) => (
                <li key={i} className="text-xs text-gray-600 flex gap-2"><span className="text-gray-300">□</span>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (template.type === 'impact_report') {
    return (
      <div>
        <p className="text-sm font-semibold text-teal mb-3">{activity.icon} {template.title}</p>
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Subject line options</p>
          {template.subjectLines?.map((s, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400">{i+1}.</span>
              <span className="text-sm text-gray-700">{s}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 mb-3">
          {template.sections?.map((s, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-100 p-3">
              <p className="text-xs font-semibold text-teal mb-1">{s.heading}</p>
              <p className="text-xs text-gray-500">{s.notes}</p>
            </div>
          ))}
        </div>
        <ul className="space-y-1">
          {template.guidance?.map((g, i) => (
            <li key={i} className="text-xs text-gray-500 flex gap-2"><span className="text-teal">→</span>{g}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (template.type === 'field_visit') {
    return (
      <div>
        <p className="text-sm font-semibold text-teal mb-3">{activity.icon} {template.title}</p>
        <div className="bg-white rounded-lg border border-gray-100 p-3 mb-3">
          <p className="text-xs font-semibold text-gray-400 mb-1">Verbal ask script</p>
          <p className="text-sm text-gray-700 italic">{template.script}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 mb-3">
          <p className="text-xs font-semibold text-gray-400 mb-1">Follow-up email subject</p>
          <p className="text-sm text-gray-700">{template.invitation?.subject}</p>
        </div>
        <ul className="space-y-1">
          {template.notes?.map((n, i) => (
            <li key={i} className="text-xs text-gray-500 flex gap-2"><span className="text-teal">→</span>{n}</li>
          ))}
        </ul>
      </div>
    )
  }

  return null
}
