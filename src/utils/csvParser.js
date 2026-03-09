import Papa from 'papaparse'

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete: r => resolve({ rows: r.data, columns: r.meta.fields || [] }),
      error: reject,
    })
  })
}

// Smart column name guessing — maps expected field keys to likely CSV column names
const COLUMN_HINTS = {
  primaryContact:  ['contact: full name', 'full name', 'contact name', 'name', 'donor name'],
  accountName:     ['account name', 'household name', 'household', 'account'],
  email:           ['email', 'contact: email', 'email address'],
  phone:           ['phone', 'mobile', 'contact: phone'],
  city:            ['mailing city', 'city', 'contact: mailing city'],
  state:           ['mailing state', 'state', 'contact: mailing state', 'mailing state/province'],
  totalGiving:     ['total gifts', 'total gift amount', 'lifetime giving', 'npo02__totaloppamount__c', 'total giving'],
  currentFYGiving: ['total gifts this year', 'total this year', 'current fy', 'npo02__totaloppamountthisyear__c', 'gifts this year'],
  lastFYGiving:    ['total gifts last year', 'total last year', 'last fy', 'npo02__totaloppamountlastyear__c', 'gifts last year'],
  largestGift:     ['largest gift', 'largest gift amount', 'npo02__largestamount__c'],
  lastGiftAmount:  ['last gift amount', 'last gift', 'npo02__lastoppamount__c'],
  lastGiftDate:    ['last gift date', 'last close date', 'npo02__lastclosedate__c', 'last donation date'],
  giftCount:       ['number of gifts', 'gift count', 'npo02__numberofclosedopps__c', 'total number of gifts'],
  lastActivityDate:['last activity', 'last activity date', 'last modified date'],
  giftOfficer:     ['gift officer', 'owner', 'account owner', 'contact owner', 'relationship manager'],
  prospectStage:   ['prospect stage', 'stage', 'donor stage', 'cultivation stage'],
}

export function guessColumns(csvColumns) {
  const lower = csvColumns.map(c => c.toLowerCase().trim())
  const map = {}
  for (const [field, hints] of Object.entries(COLUMN_HINTS)) {
    for (const hint of hints) {
      const idx = lower.indexOf(hint)
      if (idx !== -1) { map[field] = csvColumns[idx]; break }
    }
  }
  return map
}

export const FIELD_DEFS = [
  { key: 'primaryContact',  label: 'Contact Name',          required: true  },
  { key: 'accountName',     label: 'Household / Account',   required: false },
  { key: 'email',           label: 'Email',                 required: false },
  { key: 'phone',           label: 'Phone',                 required: false },
  { key: 'city',            label: 'City',                  required: false },
  { key: 'state',           label: 'State',                 required: false },
  { key: 'totalGiving',     label: 'Total Giving (All Time)',required: true  },
  { key: 'currentFYGiving', label: 'Giving This FY',        required: false },
  { key: 'lastFYGiving',    label: 'Giving Last FY',        required: false },
  { key: 'largestGift',     label: 'Largest Gift',          required: false },
  { key: 'lastGiftAmount',  label: 'Last Gift Amount',      required: false },
  { key: 'lastGiftDate',    label: 'Last Gift Date',        required: false },
  { key: 'giftCount',       label: 'Number of Gifts',       required: false },
  { key: 'lastActivityDate',label: 'Last Activity Date',    required: false },
  { key: 'giftOfficer',     label: 'Gift Officer / Owner',  required: false },
  { key: 'prospectStage',   label: 'Prospect Stage',        required: false },
]
