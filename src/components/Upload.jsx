import { useState, useRef } from 'react'
import { parseCSV } from '../utils/csvParser.js'

export default function Upload({ onParsed }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) {
      setError('Please upload a .csv file exported from Salesforce.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await parseCSV(file)
      if (!result.rows.length) throw new Error('CSV appears to be empty.')
      onParsed(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Nav */}
      <nav className="bg-teal h-14 flex items-center px-6 shadow">
        <span className="font-serif text-gold text-lg">Water4.org</span>
        <span className="text-white/40 text-xs ml-3 pl-3 border-l border-white/20 uppercase tracking-widest">
          Major Donor Portfolio
        </span>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal to-teal-light py-12 px-6 text-center">
        <p className="text-gold text-xs font-bold uppercase tracking-widest mb-2">Water4.org · Major Gift Intelligence</p>
        <h1 className="font-serif text-white text-4xl mb-3">Donor Portfolio Dashboard</h1>
        <p className="text-white/60 text-base max-w-lg mx-auto">
          Upload a Salesforce NPSP report to analyze your major gift portfolio. All data stays in your browser.
        </p>
      </div>

      {/* Upload zone */}
      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
              ${dragging ? 'border-teal bg-teal-dim' : 'border-gray-300 bg-white hover:border-teal hover:bg-teal-dim'}`}
          >
            <input ref={inputRef} type="file" accept=".csv" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
            <div className="text-4xl mb-3">{loading ? '⏳' : '📂'}</div>
            {loading
              ? <p className="text-teal font-semibold">Parsing CSV…</p>
              : <>
                  <p className="font-semibold text-teal text-lg mb-1">Drop your Salesforce export here</p>
                  <p className="text-gray-400 text-sm">or click to browse · .csv files only</p>
                </>
            }
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-teal text-sm mb-3">How to export from Salesforce</h3>
            <ol className="text-gray-600 text-sm space-y-2 list-decimal list-inside">
              <li>Go to <strong>Reports</strong> in Salesforce</li>
              <li>Run your <strong>Major Donors</strong> or <strong>Contacts with Giving</strong> report</li>
              <li>Click <strong>Export</strong> → <strong>Export Details</strong> → <strong>CSV</strong></li>
              <li>Upload the downloaded file here</li>
            </ol>
            <p className="text-gray-400 text-xs mt-3">
              Recommended fields: Contact Name, Account Name, Total Gifts, Last Gift Amount, Last Gift Date, Total This Year, Total Last Year, Last Activity, Owner
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
