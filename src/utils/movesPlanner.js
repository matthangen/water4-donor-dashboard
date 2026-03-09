/**
 * movesPlanner.js — Stewardship moves management task generator
 *
 * For each donor, assigns a touch cadence based on giving tier.
 * Distributes tasks across business days, caps daily load per gift officer,
 * and returns a sorted flat task list ready for CSV export or display.
 */

// ── Touch cadences by tier ─────────────────────────────────────────────────
// week: offset from plan start (week 1 = first full week)
// priority: 1=High, 2=Medium, 3=Low

const CADENCES = {
  transformational: [
    { week: 1,  type: 'call',            priority: 1, label: 'Kickoff relationship call — express gratitude, share vision' },
    { week: 5,  type: 'handwritten_note',priority: 2, label: 'Handwritten note — personal impact story' },
    { week: 9,  type: 'impact_report',   priority: 1, label: 'Q1 impact report — wells drilled, communities served' },
    { week: 13, type: 'meeting',         priority: 1, label: 'Quarterly in-person/virtual meeting — program deep dive' },
    { week: 18, type: 'email',           priority: 2, label: 'Personal email — field update from program team' },
    { week: 22, type: 'field_visit',     priority: 1, label: 'Invite: Water4 field visit or exclusive donor event' },
    { week: 26, type: 'call',            priority: 1, label: 'Mid-year relationship call — listen, update, engage' },
    { week: 30, type: 'handwritten_note',priority: 2, label: 'Personal appreciation note — milestone recognition' },
    { week: 35, type: 'impact_report',   priority: 1, label: 'Fall impact report — YTD communities, people, wells' },
    { week: 39, type: 'meeting',         priority: 1, label: 'Year-end cultivation meeting — vision for next year' },
    { week: 44, type: 'call',            priority: 1, label: 'Year-end giving conversation — renewal & upgrade ask' },
    { week: 50, type: 'handwritten_note',priority: 1, label: 'Year-end thank-you card — celebrate the year together' },
  ],
  leadership: [
    { week: 1,  type: 'call',            priority: 1, label: 'Stewardship call — thank you, share program impact' },
    { week: 8,  type: 'impact_report',   priority: 1, label: 'Q1 impact report — wells, communities, people served' },
    { week: 14, type: 'meeting',         priority: 1, label: 'Semi-annual meeting — deepen relationship' },
    { week: 20, type: 'email',           priority: 2, label: 'Personal program update email' },
    { week: 27, type: 'handwritten_note',priority: 2, label: 'Mid-year appreciation note' },
    { week: 33, type: 'call',            priority: 1, label: 'Fall relationship call' },
    { week: 40, type: 'impact_report',   priority: 1, label: 'Year-end impact report — full year summary' },
    { week: 47, type: 'call',            priority: 1, label: 'Year-end giving conversation — renewal ask' },
  ],
  major: [
    { week: 2,  type: 'email',           priority: 1, label: 'Welcome/thank-you email — personal, specific to their gift' },
    { week: 11, type: 'impact_report',   priority: 1, label: 'Spring impact update — project progress' },
    { week: 22, type: 'call',            priority: 1, label: 'Mid-year check-in call' },
    { week: 30, type: 'email',           priority: 2, label: 'Summer field update — story or photo from the field' },
    { week: 38, type: 'impact_report',   priority: 1, label: 'Fall impact update' },
    { week: 47, type: 'call',            priority: 1, label: 'Year-end giving conversation' },
  ],
  mid_level: [
    { week: 3,  type: 'email',           priority: 2, label: 'Thank-you + welcome to Water4 family email' },
    { week: 16, type: 'impact_report',   priority: 2, label: 'Spring impact update' },
    { week: 29, type: 'email',           priority: 2, label: 'Summer program highlight email' },
    { week: 46, type: 'email',           priority: 2, label: 'Year-end impact + giving invitation' },
  ],
  donor: [
    { week: 3,  type: 'email',           priority: 3, label: 'Thank-you email — acknowledge their gift' },
    { week: 24, type: 'impact_report',   priority: 3, label: 'Mid-year impact update' },
    { week: 46, type: 'email',           priority: 3, label: 'Year-end impact report + appeal' },
  ],
  friend: [
    { week: 4,  type: 'email',           priority: 3, label: 'Thank-you acknowledgment email' },
    { week: 48, type: 'email',           priority: 3, label: 'Year-end impact + upgrade invitation' },
  ],
}

const ACTIVITY_ICONS = {
  call:            '📞',
  email:           '📧',
  handwritten_note:'✍️',
  meeting:         '🤝',
  impact_report:   '📊',
  field_visit:     '🌍',
}

const ACTIVITY_LABELS = {
  call:            'Phone / Video Call',
  email:           'Personal Email',
  handwritten_note:'Handwritten Note',
  meeting:         'In-Person Meeting',
  impact_report:   'Impact Report / Update',
  field_visit:     'Field Visit / Event Invite',
}

const PRIORITY_LABELS = { 1: 'HIGH', 2: 'MEDIUM', 3: 'LOW' }

// ── Business day helpers ───────────────────────────────────────────────────

function isBusinessDay(date) {
  const d = date.getDay()
  return d !== 0 && d !== 6
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Return the nearest business day on or after `date` */
function nearestBusinessDay(date) {
  const d = new Date(date)
  while (!isBusinessDay(d)) d.setDate(d.getDate() + 1)
  return d
}

/** Return the Nth business day from a start date (0-indexed) */
function nthBusinessDay(start, n) {
  let d = new Date(start)
  let count = 0
  while (count < n) {
    d.setDate(d.getDate() + 1)
    if (isBusinessDay(d)) count++
  }
  return d
}

/** Get all business days in a date range */
function businessDaysInRange(start, weeks) {
  const days = []
  let d = new Date(start)
  const end = addDays(start, weeks * 7)
  while (d <= end) {
    if (isBusinessDay(d)) days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function dayOfWeek(date) {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()]
}

// ── Core planner ───────────────────────────────────────────────────────────

/**
 * Generate the full moves plan.
 *
 * @param {Array}  donors      - Processed donor objects (from deduplication.js)
 * @param {Object} options
 *   @param {Date}   planStart    - First day of plan (default: next Monday)
 *   @param {number} planWeeks    - Length of plan in weeks (default: 52)
 *   @param {number} maxPerDay    - Max tasks per gift officer per day (default: 12)
 *   @param {string} defaultOwner - Gift officer name when none assigned (default: 'Unassigned')
 * @returns {Array} Flat sorted task list
 */
export function generateMovesPlan(donors, options = {}) {
  const {
    planStart    = nextMonday(),
    planWeeks    = 52,
    maxPerDay    = 12,
    defaultOwner = 'Gift Officer',
  } = options

  // Build per-gift-officer daily load trackers
  // dailyLoad[officer][dateStr] = count
  const dailyLoad = {}

  function getLoad(officer, dateStr) {
    return (dailyLoad[officer]?.[dateStr] || 0)
  }
  function addLoad(officer, dateStr) {
    if (!dailyLoad[officer]) dailyLoad[officer] = {}
    dailyLoad[officer][dateStr] = (dailyLoad[officer][dateStr] || 0) + 1
  }

  /** Find a business day on or near targetDate where officer has capacity */
  function assignDate(officer, targetDate) {
    let d = nearestBusinessDay(targetDate)
    const planEnd = addDays(planStart, planWeeks * 7)
    let tries = 0
    while (getLoad(officer, formatDate(d)) >= maxPerDay && d <= planEnd && tries < 30) {
      d = addDays(d, 1)
      if (!isBusinessDay(d)) continue
      tries++
    }
    return d
  }

  const tasks = []

  // Sort donors: highest tier first, then highest giving within tier
  const sorted = [...donors].sort((a, b) => {
    const tierOrder = { transformational: 0, leadership: 1, major: 2, mid_level: 3, donor: 4, friend: 5, prospect: 6 }
    const ta = tierOrder[a.tier?.code] ?? 7
    const tb = tierOrder[b.tier?.code] ?? 7
    if (ta !== tb) return ta - tb
    return (parseFloat(b.totalGiving) || 0) - (parseFloat(a.totalGiving) || 0)
  })

  for (const donor of sorted) {
    const tierCode  = donor.tier?.code || 'friend'
    const cadence   = CADENCES[tierCode]
    if (!cadence) continue

    const officer = (donor.giftOfficer || defaultOwner).trim()
    const donorName = donor.accountName || donor.primaryContact || 'Unknown Donor'

    for (const touch of cadence) {
      const targetDate = addDays(planStart, (touch.week - 1) * 7 + 1) // Monday of that week
      const assignedDate = assignDate(officer, targetDate)

      // Don't schedule past plan end
      if (assignedDate > addDays(planStart, planWeeks * 7)) continue

      const dateStr = formatDate(assignedDate)
      addLoad(officer, dateStr)

      tasks.push({
        date:           dateStr,
        dayOfWeek:      dayOfWeek(assignedDate),
        giftOfficer:    officer,
        priority:       PRIORITY_LABELS[touch.priority],
        priorityNum:    touch.priority,
        donorName,
        tier:           donor.tier?.label || 'Unknown',
        tierCode,
        totalGiving:    donor.totalGiving || 0,
        lastGiftDate:   donor.lastGiftDate || '',
        activityType:   ACTIVITY_LABELS[touch.type] || touch.type,
        activityCode:   touch.type,
        activityIcon:   ACTIVITY_ICONS[touch.type] || '•',
        description:    touch.label,
        email:          donor.email || '',
        phone:          donor.phone || '',
        city:           donor.city || '',
        state:          donor.state || '',
        prospectStage:  donor.prospectStage || '',
        completed:      '',
        notes:          '',
      })
    }
  }

  // Sort by date, then priority, then officer name
  tasks.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.priorityNum !== b.priorityNum) return a.priorityNum - b.priorityNum
    return a.giftOfficer.localeCompare(b.giftOfficer)
  })

  return tasks
}

/** Export task list to CSV string */
export function tasksToCSV(tasks) {
  const headers = [
    'Date', 'Day', 'Gift Officer', 'Priority',
    'Donor / Household', 'Tier', 'Lifetime Giving',
    'Activity Type', 'Activity Description',
    'Email', 'Phone', 'City', 'State',
    'Last Gift Date', 'Prospect Stage',
    'Completed (Y/N)', 'Notes',
  ]

  const rows = tasks.map(t => [
    t.date,
    t.dayOfWeek,
    t.giftOfficer,
    t.priority,
    t.donorName,
    t.tier,
    `$${Number(t.totalGiving).toLocaleString()}`,
    t.activityType,
    t.description,
    t.email,
    t.phone,
    t.city,
    t.state,
    t.lastGiftDate,
    t.prospectStage,
    t.completed,
    t.notes,
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`))

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

/** Export tasks for a single gift officer to CSV */
export function officerTasksToCSV(tasks, officer) {
  return tasksToCSV(tasks.filter(t => t.giftOfficer === officer))
}

/** Summarize plan: tasks per officer, per week, activity type breakdown */
export function summarizePlan(tasks) {
  const byOfficer = {}
  const byType    = {}
  const byTier    = {}

  for (const t of tasks) {
    // by officer
    if (!byOfficer[t.giftOfficer]) {
      byOfficer[t.giftOfficer] = { total: 0, byType: {}, highPriority: 0, peakDay: null, peakCount: 0 }
    }
    byOfficer[t.giftOfficer].total++
    byOfficer[t.giftOfficer].byType[t.activityCode] = (byOfficer[t.giftOfficer].byType[t.activityCode] || 0) + 1
    if (t.priorityNum === 1) byOfficer[t.giftOfficer].highPriority++

    // by type
    byType[t.activityCode] = (byType[t.activityCode] || 0) + 1

    // by tier
    byTier[t.tierCode] = (byTier[t.tierCode] || 0) + 1
  }

  // Find peak day per officer
  const dayCountByOfficer = {}
  for (const t of tasks) {
    const key = `${t.giftOfficer}|${t.date}`
    dayCountByOfficer[key] = (dayCountByOfficer[key] || 0) + 1
  }
  for (const [key, count] of Object.entries(dayCountByOfficer)) {
    const [officer, date] = key.split('|')
    if (byOfficer[officer] && count > byOfficer[officer].peakCount) {
      byOfficer[officer].peakCount = count
      byOfficer[officer].peakDay = date
    }
  }

  return { byOfficer, byType, byTier, total: tasks.length }
}

function nextMonday() {
  const d = new Date()
  const day = d.getDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + daysUntilMonday)
  d.setHours(0, 0, 0, 0)
  return d
}
