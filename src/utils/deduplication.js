import { getTier } from './tiers.js'
import { getAlerts, daysSince } from './stewardship.js'

function parseMoney(val) {
  if (!val) return 0
  return parseFloat(String(val).replace(/[$,\s]/g, '')) || 0
}

function parseDate(val) {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d) ? null : d.toISOString().split('T')[0]
}

function mostRecent(a, b) {
  if (!a) return b
  if (!b) return a
  return new Date(a) >= new Date(b) ? a : b
}

export function processRows(rows, columnMap) {
  // Map CSV rows to normalized objects
  const normalized = rows.map(row => {
    const get = key => columnMap[key] ? (row[columnMap[key]] || '').trim() : ''
    return {
      primaryContact:  get('primaryContact'),
      accountName:     get('accountName') || get('primaryContact'),
      email:           get('email'),
      phone:           get('phone'),
      city:            get('city'),
      state:           get('state'),
      totalGiving:     parseMoney(get('totalGiving')),
      currentFYGiving: parseMoney(get('currentFYGiving')),
      lastFYGiving:    parseMoney(get('lastFYGiving')),
      largestGift:     parseMoney(get('largestGift')),
      lastGiftAmount:  parseMoney(get('lastGiftAmount')),
      lastGiftDate:    parseDate(get('lastGiftDate')),
      giftCount:       parseInt(get('giftCount')) || 0,
      lastActivityDate:parseDate(get('lastActivityDate')),
      giftOfficer:     get('giftOfficer'),
      prospectStage:   get('prospectStage'),
    }
  }).filter(r => r.primaryContact)

  // Deduplicate at account level (group by accountName)
  const accounts = {}
  for (const row of normalized) {
    const key = row.accountName.toLowerCase().trim()
    if (!accounts[key]) {
      accounts[key] = { ...row, contacts: [row.primaryContact] }
    } else {
      const a = accounts[key]
      // Merge: accumulate giving (use max since report may have per-contact totals)
      a.totalGiving     = Math.max(a.totalGiving, row.totalGiving)
      a.currentFYGiving = Math.max(a.currentFYGiving, row.currentFYGiving)
      a.lastFYGiving    = Math.max(a.lastFYGiving, row.lastFYGiving)
      a.largestGift     = Math.max(a.largestGift, row.largestGift)
      a.lastGiftAmount  = Math.max(a.lastGiftAmount, row.lastGiftAmount)
      a.lastGiftDate    = mostRecent(a.lastGiftDate, row.lastGiftDate)
      a.lastActivityDate= mostRecent(a.lastActivityDate, row.lastActivityDate)
      a.giftCount       = Math.max(a.giftCount, row.giftCount)
      if (row.primaryContact && !a.contacts.includes(row.primaryContact)) {
        a.contacts.push(row.primaryContact)
      }
      if (!a.email && row.email) a.email = row.email
      if (!a.phone && row.phone) a.phone = row.phone
      if (!a.giftOfficer && row.giftOfficer) a.giftOfficer = row.giftOfficer
      if (!a.prospectStage && row.prospectStage) a.prospectStage = row.prospectStage
    }
  }

  // Enrich with computed fields
  return Object.values(accounts).map((donor, i) => {
    const tier = getTier(donor.totalGiving)
    const alerts = getAlerts(donor)
    const daysSinceGift = daysSince(donor.lastGiftDate)
    const daysSinceActivity = daysSince(donor.lastActivityDate)
    return {
      ...donor,
      _id: `d_${i}`,
      displayName: donor.contacts.length > 1
        ? `${donor.contacts[0]} & ${donor.contacts[1].split(' ')[0]}`
        : donor.primaryContact,
      tier,
      alerts,
      daysSinceLastGift: daysSinceGift,
      daysSinceLastActivity: daysSinceActivity,
      hasAlerts: alerts.length > 0,
      alertSeverity: alerts.some(a => a.severity === 'high') ? 'high'
                   : alerts.some(a => a.severity === 'medium') ? 'medium'
                   : alerts.length > 0 ? 'low' : null,
    }
  }).sort((a, b) => b.totalGiving - a.totalGiving)
}
