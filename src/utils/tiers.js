export const TIERS = [
  { code: 'transformational', label: 'Transformational', min: 100000, color: '#1B4D5C', textColor: '#fff' },
  { code: 'leadership',       label: 'Leadership',       min: 25000,  color: '#2A6B7E', textColor: '#fff' },
  { code: 'major',            label: 'Major Donor',      min: 10000,  color: '#3A8FA5', textColor: '#fff' },
  { code: 'mid_level',        label: 'Mid-Level',        min: 5000,   color: '#C4963E', textColor: '#fff' },
  { code: 'donor',            label: 'Donor',            min: 1000,   color: '#D4AD5A', textColor: '#1E293B' },
  { code: 'friend',           label: 'Friend',           min: 1,      color: '#94A3B8', textColor: '#fff' },
  { code: 'prospect',         label: 'Prospect',         min: 0,      color: '#E2E8F0', textColor: '#475569' },
]

export function getTier(totalGiving) {
  const amount = parseFloat(totalGiving) || 0
  for (const tier of TIERS) {
    if (amount >= tier.min) return tier
  }
  return TIERS[TIERS.length - 1]
}

export function formatCurrency(amount) {
  const n = parseFloat(amount) || 0
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

export function formatCurrencyFull(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(amount) || 0)
}
