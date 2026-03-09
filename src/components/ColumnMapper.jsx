import { useState } from 'react'
import { FIELD_DEFS, guessColumns } from '../utils/csvParser.js'

export default function ColumnMapper({ columns, rows, onMapped, onBack }) {
  const [mapping, setMapping] = useState(() => guessColumns(columns))

  const requiredMapped = FIELD_DEFS
    .filter(f => f.required)
    .every(f => mapping[f.key])

  function handleSubmit(e) {
    e.preventDefault()
    onMapped(mapping)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <nav className="bg-teal h-14 flex items-center px-6 shadow">
        <span className="font-serif text-gold text-lg">Water4.org</span>
        <span className="text-white/40 text-xs ml-3 pl-3 border-l border-white/20 uppercase tracking-widest">
          Major Donor Portfolio
        </span>
      </nav>

      <div className="bg-gradient-to-br from-teal to-teal-light py-8 px-6 text-center">
        <p className="text-gold text-xs font-bold uppercase tracking-widest mb-2">Step 2 of 2</p>
        <h1 className="font-serif text-white text-3xl mb-2">Map Your Columns</h1>
        <p className="text-white/60 text-sm">
          {rows.length} rows detected · We've pre-filled our best guesses — confirm and continue
        </p>
      </div>

      <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="grid grid-cols-2 text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 bg-gray-50 border-b border-gray-200">
              <span>Dashboard Field</span>
              <span>Your CSV Column</span>
            </div>

            {FIELD_DEFS.map((field, i) => (
              <div
                key={field.key}
                className={`grid grid-cols-2 items-center px-5 py-3 gap-4
                  ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                  ${!mapping[field.key] && field.required ? 'border-l-2 border-red-400' : ''}`}
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">{field.label}</span>
                  {field.required && (
                    <span className="ml-1 text-red-500 text-xs">*</span>
                  )}
                </div>
                <select
                  value={mapping[field.key] || ''}
                  onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value || undefined }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                >
                  <option value="">— not mapped —</option>
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-teal transition-colors"
            >
              ← Back to upload
            </button>
            <button
              type="submit"
              disabled={!requiredMapped}
              className="bg-teal text-white px-6 py-2.5 rounded-lg font-semibold text-sm
                hover:bg-teal-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Build Dashboard →
            </button>
          </div>

          {!requiredMapped && (
            <p className="text-red-500 text-xs text-right mt-2">
              Please map required fields (marked *) to continue.
            </p>
          )}
        </form>
      </main>
    </div>
  )
}
