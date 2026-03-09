/**
 * movesPlanner.js — Stewardship moves management task generator
 *
 * Config-driven: specify exactly how many of each activity type per tier.
 * Evenly distributes touches across business days, caps daily load per
 * gift officer, returns a sorted flat task list.
 */

// ── Activity type metadata ─────────────────────────────────────────────────

export const ACTIVITY_TYPES = [
  { code: 'meeting',          label: 'In-Person Meeting', icon: '🤝', effort: 'High effort',   priority: 1 },
  { code: 'field_visit',      label: 'Field Visit / Event Invite', icon: '🌍', effort: 'High effort',   priority: 1 },
  { code: 'call',             label: 'Phone / Video Call', icon: '📞', effort: 'Medium effort', priority: 1 },
  { code: 'handwritten_note', label: 'Handwritten Note',  icon: '✍️', effort: 'Medium effort', priority: 2 },
  { code: 'impact_report',    label: 'Impact Report',     icon: '📊', effort: 'Medium effort', priority: 2 },
  { code: 'email',            label: 'Personal Email',    icon: '📧', effort: 'Low effort',    priority: 3 },
]

export const ACTIVITY_BY_CODE = Object.fromEntries(ACTIVITY_TYPES.map(a => [a.code, a]))

// ── Tier metadata ──────────────────────────────────────────────────────────

export const TIER_DEFS = [
  { code: 'transformational', label: 'Transformational', range: '$100K+' },
  { code: 'leadership',       label: 'Leadership',       range: '$25K–$99K' },
  { code: 'major',            label: 'Major Donor',      range: '$10K–$24K' },
  { code: 'mid_level',        label: 'Mid-Level',        range: '$5K–$9K' },
  { code: 'donor',            label: 'Donor',            range: '$1K–$4K' },
  { code: 'friend',           label: 'Friend',           range: '$1–$999' },
]

// ── Default cadence config ─────────────────────────────────────────────────
// Each value = number of touches of that type per year for that tier.
// These are the defaults; the UI lets the user edit before generating.

export const DEFAULT_CADENCE_CONFIG = {
  transformational: { meeting: 2, field_visit: 1, call: 3, handwritten_note: 3, impact_report: 2, email: 1 }, // 12
  leadership:       { meeting: 2, field_visit: 0, call: 3, handwritten_note: 1, impact_report: 2, email: 0 }, //  8
  major:            { meeting: 1, field_visit: 0, call: 2, handwritten_note: 0, impact_report: 2, email: 1 }, //  6
  mid_level:        { meeting: 1, field_visit: 0, call: 1, handwritten_note: 0, impact_report: 1, email: 1 }, //  4
  donor:            { meeting: 0, field_visit: 0, call: 0, handwritten_note: 0, impact_report: 1, email: 2 }, //  3
  friend:           { meeting: 0, field_visit: 0, call: 0, handwritten_note: 0, impact_report: 0, email: 2 }, //  2
}

// ── Touch descriptions ─────────────────────────────────────────────────────
// Indexed by [tier][activityCode][nth occurrence (0-based)]
// Falls back to generic if nth exceeds array length.

const TOUCH_DESCRIPTIONS = {
  transformational: {
    meeting: [
      'Spring cultivation meeting — program immersion, relationship building, share field stories',
      'Year-end meeting — vision for next year, transformational ask, celebrate partnership',
    ],
    field_visit: [
      'Invite: Water4 exclusive donor field experience or leadership event',
    ],
    call: [
      'Kickoff call — express deep gratitude, cast vision, ask about their "why"',
      'Mid-year relationship call — listen, share field stories, strengthen bond',
      'Year-end giving conversation — renewal & transformational upgrade ask',
    ],
    handwritten_note: [
      'Personal note — name the specific community or well their gift funded',
      'Mid-year appreciation — recognize a milestone or anniversary',
      'Year-end thank-you card — celebrate the year, preview what\'s next',
    ],
    impact_report: [
      'H1 impact report — wells drilled, communities reached, lives changed YTD',
      'H2 impact report — full year totals, financial stewardship, next year preview',
    ],
    email: [
      'Field update email — photo or story direct from the field, personal context',
    ],
  },
  leadership: {
    meeting: [
      'Spring in-person meeting — program depth, listen to their interests, deepen relationship',
      'Fall in-person meeting — year-end vision, cultivation for renewal and upgrade',
    ],
    field_visit: [],
    call: [
      'Stewardship call — personal thank you, share specific impact of their gift',
      'Mid-year check-in — field stories, program update, listen to their perspective',
      'Year-end giving conversation — renewal and upgrade ask',
    ],
    handwritten_note: [
      'Personal appreciation note — name the specific impact of their leadership-level gift',
    ],
    impact_report: [
      'Spring impact report — H1 communities served, wells completed, people reached',
      'Fall impact report — YTD full-year summary, financial accountability',
    ],
    email: [],
  },
  major: {
    meeting: [
      'Annual face-to-face meeting — relationship deepening, program vision, thank-you in person',
    ],
    field_visit: [],
    call: [
      'Mid-year check-in call — share impact, listen, strengthen connection',
      'Year-end giving conversation — personal renewal ask and next-level invitation',
    ],
    handwritten_note: [],
    impact_report: [
      'Spring impact update — specific projects your gift supports, progress to date',
      'Fall impact report — annual summary, YTD impact numbers',
    ],
    email: [
      'Personal thank-you email — specific, heartfelt acknowledgment of their gift',
    ],
  },
  mid_level: {
    meeting: [
      'Annual face-to-face meeting — thank you in person, cast vision, cultivate toward major',
    ],
    field_visit: [],
    call: [
      'Year-end check-in and giving conversation — renewal and major donor pathway',
    ],
    handwritten_note: [],
    impact_report: [
      'Annual impact update — how your gift changed lives, specific project connection',
    ],
    email: [
      'Personal thank-you and welcome email — acknowledge their gift, share Water4\'s mission',
    ],
  },
  donor: {
    meeting: [],
    field_visit: [],
    call: [],
    handwritten_note: [],
    impact_report: [
      'Annual impact report — your gift at work, lives changed, communities served',
    ],
    email: [
      'Personal thank-you email — acknowledge their gift with specific impact',
      'Year-end impact summary + giving invitation — upgrade to next level',
    ],
  },
  friend: {
    meeting: [],
    field_visit: [],
    call: [],
    handwritten_note: [],
    impact_report: [],
    email: [
      'Thank-you email — welcome to the Water4 community, share mission',
      'Year-end impact summary + invitation to give at a higher level',
    ],
  },
}

const GENERIC_LABELS = {
  meeting:          (n) => `Face-to-face meeting #${n + 1} — in-person relationship building`,
  field_visit:      (n) => `Field visit / event invitation`,
  call:             (n) => `Relationship call #${n + 1}`,
  handwritten_note: (n) => `Handwritten personal note`,
  impact_report:    (n) => `Impact report #${n + 1}`,
  email:            (n) => `Personal email #${n + 1}`,
}

function getLabel(tier, type, nth) {
  const labels = TOUCH_DESCRIPTIONS[tier]?.[type]
  if (labels && labels[nth]) return labels[nth]
  return (GENERIC_LABELS[type] || (() => type))(nth)
}

// ── Scheduling helpers ─────────────────────────────────────────────────────

function isBusinessDay(date) {
  const d = date.getDay()
  return d !== 0 && d !== 6
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function nearestBusinessDay(date) {
  const d = new Date(date)
  while (!isBusinessDay(d)) d.setDate(d.getDate() + 1)
  return d
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function dayOfWeek(date) {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()]
}

/** Evenly space `count` touches across `planWeeks`, returning week numbers (1-based) */
function evenlySpaced(count, planWeeks) {
  if (count === 0) return []
  if (count === 1) return [Math.max(1, Math.round(planWeeks / 2))]
  const interval = planWeeks / (count + 1)
  return Array.from({ length: count }, (_, i) => Math.max(1, Math.round(interval * (i + 1))))
}

/**
 * Convert a cadence config object (e.g. { meeting: 2, call: 3, ... })
 * into a sorted array of touch objects with week, type, priority, label.
 */
export function buildCadenceFromConfig(tierCode, tierConfig, planWeeks) {
  const touches = []

  for (const actType of ACTIVITY_TYPES) {
    const count = tierConfig[actType.code] || 0
    if (!count) continue
    const weeks = evenlySpaced(count, planWeeks)
    weeks.forEach((week, nth) => {
      touches.push({
        week,
        type:     actType.code,
        priority: actType.priority,
        label:    getLabel(tierCode, actType.code, nth),
      })
    })
  }

  return touches.sort((a, b) => a.week - b.week)
}

// ── Core planner ───────────────────────────────────────────────────────────

/**
 * Generate the full moves plan.
 *
 * @param {Array}  donors         - Processed donor objects
 * @param {Object} options
 *   @param {Date}   planStart      - First day of plan (default: next Monday)
 *   @param {number} planWeeks      - Length of plan in weeks (default: 52)
 *   @param {number} maxPerDay      - Max tasks per gift officer per day (default: 10)
 *   @param {string} defaultOwner   - Gift officer name when none assigned
 *   @param {Object} cadenceConfig  - Override cadence counts (default: DEFAULT_CADENCE_CONFIG)
 * @returns {Array} Flat sorted task list
 */
export function generateMovesPlan(donors, options = {}) {
  const {
    planStart     = nextMonday(),
    planWeeks     = 52,
    maxPerDay     = 10,
    defaultOwner  = 'Gift Officer',
    cadenceConfig = DEFAULT_CADENCE_CONFIG,
  } = options

  // Pre-build cadences for each tier
  const builtCadences = {}
  for (const tier of TIER_DEFS) {
    const config = cadenceConfig[tier.code] || {}
    builtCadences[tier.code] = buildCadenceFromConfig(tier.code, config, planWeeks)
  }

  // Per-officer daily load tracker
  const dailyLoad = {}
  function getLoad(officer, dateStr) { return dailyLoad[officer]?.[dateStr] || 0 }
  function addLoad(officer, dateStr) {
    if (!dailyLoad[officer]) dailyLoad[officer] = {}
    dailyLoad[officer][dateStr] = (dailyLoad[officer][dateStr] || 0) + 1
  }

  function assignDate(officer, targetDate) {
    let d = nearestBusinessDay(targetDate)
    const planEnd = addDays(planStart, planWeeks * 7)
    let tries = 0
    while (getLoad(officer, formatDate(d)) >= maxPerDay && d <= planEnd && tries < 30) {
      d.setDate(d.getDate() + 1)
      if (!isBusinessDay(d)) continue
      tries++
    }
    return d
  }

  const tasks = []

  // Sort: highest tier first, then highest giving within tier
  const TIER_ORDER = { transformational: 0, leadership: 1, major: 2, mid_level: 3, donor: 4, friend: 5, prospect: 6 }
  const sorted = [...donors].sort((a, b) => {
    const ta = TIER_ORDER[a.tier?.code] ?? 7
    const tb = TIER_ORDER[b.tier?.code] ?? 7
    if (ta !== tb) return ta - tb
    return (parseFloat(b.totalGiving) || 0) - (parseFloat(a.totalGiving) || 0)
  })

  const PRIORITY_LABELS = { 1: 'HIGH', 2: 'MEDIUM', 3: 'LOW' }

  for (const donor of sorted) {
    const tierCode  = donor.tier?.code || 'friend'
    const cadence   = builtCadences[tierCode]
    if (!cadence?.length) continue

    const officer   = (donor.giftOfficer || defaultOwner).trim()
    const donorName = donor.accountName || donor.primaryContact || 'Unknown Donor'

    for (const touch of cadence) {
      const targetDate   = addDays(planStart, (touch.week - 1) * 7 + 1)
      const assignedDate = assignDate(officer, targetDate)
      if (assignedDate > addDays(planStart, planWeeks * 7)) continue

      const dateStr = formatDate(assignedDate)
      addLoad(officer, dateStr)

      const actMeta = ACTIVITY_BY_CODE[touch.type] || {}

      tasks.push({
        date:          dateStr,
        dayOfWeek:     dayOfWeek(assignedDate),
        giftOfficer:   officer,
        priority:      PRIORITY_LABELS[touch.priority] || 'LOW',
        priorityNum:   touch.priority,
        donorName,
        tier:          donor.tier?.label || 'Unknown',
        tierCode,
        totalGiving:   donor.totalGiving || 0,
        lastGiftDate:  donor.lastGiftDate || '',
        activityType:  actMeta.label || touch.type,
        activityCode:  touch.type,
        activityIcon:  actMeta.icon || '•',
        effort:        actMeta.effort || '',
        description:   touch.label,
        email:         donor.email || '',
        phone:         donor.phone || '',
        city:          donor.city || '',
        state:         donor.state || '',
        prospectStage: donor.prospectStage || '',
        completed:     '',
        notes:         '',
      })
    }
  }

  tasks.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.priorityNum !== b.priorityNum) return a.priorityNum - b.priorityNum
    return a.giftOfficer.localeCompare(b.giftOfficer)
  })

  return tasks
}

// ── Export helpers ─────────────────────────────────────────────────────────

export function tasksToCSV(tasks) {
  const headers = [
    'Date', 'Day', 'Gift Officer', 'Priority', 'Effort Level',
    'Donor / Household', 'Tier', 'Lifetime Giving',
    'Activity Type', 'Activity Description',
    'Email', 'Phone', 'City', 'State',
    'Last Gift Date', 'Prospect Stage',
    'Completed (Y/N)', 'Notes',
  ]
  const rows = tasks.map(t => [
    t.date, t.dayOfWeek, t.giftOfficer, t.priority, t.effort,
    t.donorName, t.tier, `$${Number(t.totalGiving).toLocaleString()}`,
    t.activityType, t.description,
    t.email, t.phone, t.city, t.state,
    t.lastGiftDate, t.prospectStage,
    t.completed, t.notes,
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`))

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

export function officerTasksToCSV(tasks, officer) {
  return tasksToCSV(tasks.filter(t => t.giftOfficer === officer))
}

export function summarizePlan(tasks) {
  const byOfficer = {}
  const byType    = {}
  const byTier    = {}

  for (const t of tasks) {
    if (!byOfficer[t.giftOfficer]) {
      byOfficer[t.giftOfficer] = { total: 0, byType: {}, highPriority: 0, peakDay: null, peakCount: 0 }
    }
    byOfficer[t.giftOfficer].total++
    byOfficer[t.giftOfficer].byType[t.activityCode] = (byOfficer[t.giftOfficer].byType[t.activityCode] || 0) + 1
    if (t.priorityNum === 1) byOfficer[t.giftOfficer].highPriority++
    byType[t.activityCode] = (byType[t.activityCode] || 0) + 1
    byTier[t.tierCode]     = (byTier[t.tierCode] || 0) + 1
  }

  const dayCountByOfficer = {}
  for (const t of tasks) {
    const key = `${t.giftOfficer}|${t.date}`
    dayCountByOfficer[key] = (dayCountByOfficer[key] || 0) + 1
  }
  for (const [key, count] of Object.entries(dayCountByOfficer)) {
    const [officer, date] = key.split('|')
    if (byOfficer[officer] && count > byOfficer[officer].peakCount) {
      byOfficer[officer].peakCount = count
      byOfficer[officer].peakDay   = date
    }
  }

  return { byOfficer, byType, byTier, total: tasks.length }
}

export function nextMonday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
