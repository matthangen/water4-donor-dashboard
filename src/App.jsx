import { useState } from 'react'
import Upload from './components/Upload.jsx'
import ColumnMapper from './components/ColumnMapper.jsx'
import Dashboard from './components/Dashboard.jsx'
import { processRows } from './utils/deduplication.js'

// Steps: 'upload' → 'map' → 'dashboard'

export default function App() {
  const [step, setStep]     = useState('upload')
  const [parsed, setParsed] = useState(null)   // { rows, columns }
  const [donors, setDonors] = useState([])

  function handleParsed(result) {
    setParsed(result)
    setStep('map')
  }

  function handleMapped(mapping) {
    const processed = processRows(parsed.rows, mapping)
    setDonors(processed)
    setStep('dashboard')
  }

  function handleReset() {
    setParsed(null)
    setDonors([])
    setStep('upload')
  }

  if (step === 'upload') {
    return <Upload onParsed={handleParsed} />
  }

  if (step === 'map') {
    return (
      <ColumnMapper
        columns={parsed.columns}
        rows={parsed.rows}
        onMapped={handleMapped}
        onBack={handleReset}
      />
    )
  }

  return <Dashboard donors={donors} onReset={handleReset} />
}
