export function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export function getCurrentFYStart() {
  const now = new Date()
  return new Date(now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1, 6, 1)
}

export function getAlerts(donor) {
  const alerts = []
  const daysSinceGift     = daysSince(donor.lastGiftDate)
  const daysSinceActivity = daysSince(donor.lastActivityDate)
  const totalGiving = parseFloat(donor.totalGiving) || 0
  const currentFY   = parseFloat(donor.currentFYGiving) || 0
  const lastFY      = parseFloat(donor.lastFYGiving) || 0

  if (daysSinceGift !== null && daysSinceGift > 548) {
    alerts.push({ code: 'lapsed', label: 'Lapsed', severity: 'high',
      detail: `Last gift ${Math.round(daysSinceGift / 30)}mo ago` })
  } else if (daysSinceGift !== null && daysSinceGift > 365) {
    alerts.push({ code: 'lapsing', label: 'Lapsing', severity: 'medium',
      detail: `Last gift ${Math.round(daysSinceGift / 30)}mo ago` })
  }

  if (totalGiving > 0 && daysSinceActivity !== null && daysSinceActivity > 90) {
    alerts.push({ code: 'needs_contact', label: 'Needs Contact', severity: 'medium',
      detail: `No activity in ${daysSinceActivity}d` })
  }

  const fyStart = getCurrentFYStart()
  const monthsIntoFY = (Date.now() - fyStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
  if (lastFY > 0 && currentFY === 0 && monthsIntoFY > 3) {
    alerts.push({ code: 'at_risk', label: 'At Risk This FY', severity: 'high',
      detail: `Gave ${fmtK(lastFY)} last FY, $0 this FY` })
  }

  if (lastFY > 0 && currentFY > 0 && currentFY < lastFY * 0.75) {
    const pct = Math.round((1 - currentFY / lastFY) * 100)
    alerts.push({ code: 'yoy_decline', label: `${pct}% YoY Decline`, severity: 'low',
      detail: `${fmtK(lastFY)} → ${fmtK(currentFY)}` })
  }

  return alerts
}

function fmtK(n) { return n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}` }

export const SEVERITY_COLORS = {
  high:   { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200'   },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low:    { bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200'  },
}
