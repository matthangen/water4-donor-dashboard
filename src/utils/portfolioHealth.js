/**
 * portfolioHealth.js — Portfolio health scoring and upgrade radar.
 */

import { TIERS } from './tiers.js'

// ── Health Score ──────────────────────────────────────────────────────────

/**
 * Calculate a 0–100 health score for a set of donors.
 * Returns { score, grade, deductions, positives }
 */
export function calculateHealthScore(donors) {
  if (!donors.length) return { score: 100, grade: GRADES[0], deductions: [], positives: [] }

  const highTier = donors.filter(d => ['transformational', 'leadership', 'major'].includes(d.tier?.code))
  const midTier  = donors.filter(d => ['mid_level', 'donor'].includes(d.tier?.code))

  let score = 100
  const deductions = []
  const positives  = []

  // Lapsed donors (>18 months) — weighted by tier
  const lapsedHigh = highTier.filter(d => d.alerts?.some(a => a.code === 'lapsed'))
  const lapsedMid  = midTier.filter(d => d.alerts?.some(a => a.code === 'lapsed'))
  if (lapsedHigh.length) {
    const pts = Math.min(25, lapsedHigh.length * 8)
    score -= pts
    deductions.push({ label: `${lapsedHigh.length} lapsed major/leadership donor${lapsedHigh.length > 1 ? 's' : ''}`, points: pts, severity: 'high' })
  }
  if (lapsedMid.length) {
    const pts = Math.min(10, lapsedMid.length * 3)
    score -= pts
    deductions.push({ label: `${lapsedMid.length} lapsed mid-level donor${lapsedMid.length > 1 ? 's' : ''}`, points: pts, severity: 'medium' })
  }

  // At-risk this FY (gave last FY, $0 this FY)
  const atRiskHigh = highTier.filter(d => d.alerts?.some(a => a.code === 'at_risk'))
  const atRiskMid  = midTier.filter(d => d.alerts?.some(a => a.code === 'at_risk'))
  if (atRiskHigh.length) {
    const pts = Math.min(20, atRiskHigh.length * 7)
    score -= pts
    deductions.push({ label: `${atRiskHigh.length} major donor${atRiskHigh.length > 1 ? 's' : ''} at risk this FY`, points: pts, severity: 'high' })
  }
  if (atRiskMid.length) {
    const pts = Math.min(8, atRiskMid.length * 2)
    score -= pts
    deductions.push({ label: `${atRiskMid.length} mid-level donor${atRiskMid.length > 1 ? 's' : ''} at risk this FY`, points: pts, severity: 'medium' })
  }

  // Lapsing (12–18 months since gift)
  const lapsing = highTier.filter(d => d.alerts?.some(a => a.code === 'lapsing'))
  if (lapsing.length) {
    const pts = Math.min(10, lapsing.length * 4)
    score -= pts
    deductions.push({ label: `${lapsing.length} major donor${lapsing.length > 1 ? 's' : ''} at risk of lapsing`, points: pts, severity: 'medium' })
  }

  // Needs contact (no activity > 90 days)
  const needsContact = highTier.filter(d => d.alerts?.some(a => a.code === 'needs_contact'))
  if (needsContact.length) {
    const pts = Math.min(10, needsContact.length * 2)
    score -= pts
    deductions.push({ label: `${needsContact.length} donor${needsContact.length > 1 ? 's' : ''} without recent contact`, points: pts, severity: 'low' })
  }

  // YoY decline in high-tier donors
  const declining = highTier.filter(d => d.alerts?.some(a => a.code === 'yoy_decline'))
  if (declining.length) {
    const pts = Math.min(8, declining.length * 3)
    score -= pts
    deductions.push({ label: `${declining.length} donor${declining.length > 1 ? 's' : ''} with YoY giving decline`, points: pts, severity: 'low' })
  }

  // Positives
  const healthyHighTier = highTier.filter(d => !d.alerts?.length)
  if (healthyHighTier.length > 0) {
    positives.push({ label: `${healthyHighTier.length} major donor${healthyHighTier.length > 1 ? 's' : ''} healthy — no alerts` })
  }
  const upgradeCandidates = getUpgradeCandidates(donors)
  if (upgradeCandidates.length > 0) {
    positives.push({ label: `${upgradeCandidates.length} donor${upgradeCandidates.length > 1 ? 's' : ''} within reach of next tier` })
  }

  score = Math.max(0, Math.round(score))
  return { score, grade: getGrade(score), deductions, positives }
}

const GRADES = [
  { min: 85, label: 'Healthy',          color: 'green',  bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', ring: '#10B981' },
  { min: 70, label: 'Needs Attention',  color: 'amber',  bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   ring: '#F59E0B' },
  { min: 50, label: 'At Risk',          color: 'orange', bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200',  ring: '#F97316' },
  { min: 0,  label: 'Critical',         color: 'red',    bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',     ring: '#EF4444' },
]

function getGrade(score) {
  return GRADES.find(g => score >= g.min) || GRADES[GRADES.length - 1]
}

// ── Per-officer health scores ──────────────────────────────────────────────

export function scoresByOfficer(donors) {
  const byOfficer = {}
  for (const d of donors) {
    const key = d.giftOfficer || 'Unassigned'
    if (!byOfficer[key]) byOfficer[key] = []
    byOfficer[key].push(d)
  }
  return Object.entries(byOfficer).map(([officer, ds]) => ({
    officer,
    donorCount: ds.length,
    ...calculateHealthScore(ds),
  })).sort((a, b) => a.score - b.score)
}

// ── Upgrade Radar ──────────────────────────────────────────────────────────

/**
 * Find donors within 60–99% of the threshold for their next giving tier.
 * Returns sorted by % progress descending (closest to upgrade first).
 */
export function getUpgradeCandidates(donors, minPct = 60) {
  const results = []

  for (const donor of donors) {
    const currentCode = donor.tier?.code
    if (!currentCode || currentCode === 'transformational') continue

    const currentIdx  = TIERS.findIndex(t => t.code === currentCode)
    if (currentIdx <= 0) continue

    const nextTier    = TIERS[currentIdx - 1]
    const giving      = parseFloat(donor.totalGiving) || 0
    const pct         = Math.round((giving / nextTier.min) * 100)

    if (pct >= minPct && pct < 100) {
      const gap        = nextTier.min - giving
      const annualGift = parseFloat(donor.lastGiftAmount) || parseFloat(donor.currentFYGiving) || 0
      const gapsInGifts = annualGift > 0 ? Math.ceil(gap / annualGift) : null

      results.push({
        ...donor,
        nextTier,
        pctToNext: pct,
        gapToNext: gap,
        gapsInGifts,
      })
    }
  }

  return results.sort((a, b) => b.pctToNext - a.pctToNext)
}

// ── Today's Priority List ──────────────────────────────────────────────────

/**
 * Return donors that need attention today, ranked by urgency.
 * No moves plan needed — driven purely by alerts + tier.
 */
export function getTodayPriorities(donors) {
  const TIER_WEIGHT = { transformational: 6, leadership: 5, major: 4, mid_level: 3, donor: 2, friend: 1 }
  const ALERT_WEIGHT = { lapsed: 5, at_risk: 4, lapsing: 3, needs_contact: 2, yoy_decline: 1 }

  return donors
    .filter(d => d.alerts?.length > 0)
    .map(d => {
      const tierWeight  = TIER_WEIGHT[d.tier?.code] || 0
      const alertWeight = Math.max(...d.alerts.map(a => ALERT_WEIGHT[a.code] || 0))
      const urgency     = tierWeight * 2 + alertWeight
      const topAlert    = d.alerts.find(a => ALERT_WEIGHT[a.code] === alertWeight)
      return { ...d, urgency, topAlert }
    })
    .sort((a, b) => b.urgency - a.urgency)
}
