'use client'
import { useState, useRef } from 'react'

const taglines = [
  "The honest read on your music.",
  "Your track. No filter.",
  "The read your track deserves.",
  "Find out what you've got.",
  "Hear the truth.",
  "Know what you're working with.",
  "Get the breakdown.",
  "Hear what the data says.",
  "Let's see what you've got.",
  "Drop it. I'm ready.",
  "Bring it. Let's find out.",
  "I've been waiting for this one.",
  "Let's get into it.",
  "Ready when you are.",
  "Show me what you made.",
  "Let's hear it.",
  "Go ahead. Drop the track.",
  "Alright. Let's see what we're working with.",
  "I want to hear this.",
  "Don't hold back. Drop it.",
]

const randomTagline = taglines[Math.floor(Math.random() * taglines.length)]

const SECTIONS = [
  { id: 1, label: 'Song Identity' },
  { id: 2, label: 'File Health & Technical Snapshot' },
  { id: 3, label: 'What the File Is Actually Telling Us' },
  { id: 4, label: 'Structural Working Map' },
  { id: 5, label: 'Hook Durability' },
  { id: 6, label: 'Production & Arrangement Intelligence' },
  { id: 7, label: 'Lyrics Intelligence' },
  { id: 8, label: 'Lane Classification' },
  { id: 9, label: 'Market & Release Positioning' },
  { id: 10, label: 'Trajectory Scenarios' },
  { id: 11, label: 'Risk Factors' },
  { id: 12, label: 'The Verdict' },
]

const BATCHES: Record<number, number[]> = {
  1: [1, 2, 3, 4],
  2: [5, 6, 7, 8],
  3: [9, 10, 11],
  4: [12],
}

async function extractAudioFeatures(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration
  const totalSamples = audioBuffer.length

  // Get channel data
  const leftChannel = audioBuffer.getChannelData(0)
  const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : null

  // RMS loudness
  let sumSquaresL = 0
  let sumSquaresR = 0
  for (let i = 0; i < totalSamples; i++) {
    sumSquaresL += leftChannel[i] * leftChannel[i]
    if (rightChannel) sumSquaresR += rightChannel[i] * rightChannel[i]
  }
  const rmsL = Math.sqrt(sumSquaresL / totalSamples)
  const rmsR = rightChannel ? Math.sqrt(sumSquaresR / totalSamples) : rmsL
  const rmsAvg = (rmsL + rmsR) / 2
  const rmsDb = 20 * Math.log10(rmsAvg || 0.000001)

  // Peak amplitude
  let peakL = 0
  let peakR = 0
  for (let i = 0; i < totalSamples; i++) {
    const absL = Math.abs(leftChannel[i])
    if (absL > peakL) peakL = absL
    if (rightChannel) {
      const absR = Math.abs(rightChannel[i])
      if (absR > peakR) peakR = absR
    }
  }
  const peakAvg = rightChannel ? (peakL + peakR) / 2 : peakL
  const peakDb = 20 * Math.log10(peakAvg || 0.000001)

  // Crest factor (dynamic range indicator)
  const crestFactor = peakDb - rmsDb

  // Clipping estimate (samples at or above 0.99)
  let clippedSamples = 0
  for (let i = 0; i < totalSamples; i++) {
    if (Math.abs(leftChannel[i]) >= 0.99) clippedSamples++
    if (rightChannel && Math.abs(rightChannel[i]) >= 0.99) clippedSamples++
  }
  const clippingPercent = ((clippedSamples / (totalSamples * (rightChannel ? 2 : 1))) * 100).toFixed(3)

  // DC offset
  let sumL = 0
  for (let i = 0; i < totalSamples; i++) sumL += leftChannel[i]
  const dcOffset = Math.abs(sumL / totalSamples)

  // Stereo correlation
  let correlation = 0
  if (rightChannel) {
    let dotProduct = 0
    let magL = 0
    let magR = 0
    // Sample every 4th sample for performance
    for (let i = 0; i < totalSamples; i += 4) {
      dotProduct += leftChannel[i] * rightChannel[i]
      magL += leftChannel[i] * leftChannel[i]
      magR += rightChannel[i] * rightChannel[i]
    }
    correlation = dotProduct / (Math.sqrt(magL) * Math.sqrt(magR) || 1)
  } else {
    correlation = 1
  }

  // Frequency band energy via FFT (using OfflineAudioContext + AnalyserNode)
  const fftSize = 8192
  const offlineCtx = new OfflineAudioContext(1, fftSize, sampleRate)
  const source = offlineCtx.createBufferSource()

  // Create mono mix for FFT
  const monoBuffer = offlineCtx.createBuffer(1, fftSize, sampleRate)
  const monoData = monoBuffer.getChannelData(0)
  const midPoint = Math.floor(totalSamples / 2)
  const start = Math.max(0, midPoint - fftSize / 2)
  for (let i = 0; i < fftSize && (start + i) < totalSamples; i++) {
    monoData[i] = leftChannel[start + i]
    if (rightChannel) monoData[i] = (monoData[i] + rightChannel[start + i]) / 2
  }

  source.buffer = monoBuffer
  source.connect(offlineCtx.destination)
  source.start()
  await offlineCtx.startRendering()

  // Manual frequency band energy from FFT approximation
  // Use Web Audio AnalyserNode on a regular context for a snapshot
  const snapCtx = new OfflineAudioContext(1, fftSize * 2, sampleRate)
  const analyserBuffer = snapCtx.createBuffer(1, fftSize * 2, sampleRate)
  const analyserData = analyserBuffer.getChannelData(0)
  const snapStart = Math.floor(totalSamples * 0.4)
  for (let i = 0; i < fftSize * 2 && (snapStart + i) < totalSamples; i++) {
    analyserData[i] = leftChannel[snapStart + i]
    if (rightChannel) analyserData[i] = (analyserData[i] + rightChannel[snapStart + i]) / 2
  }

  // Compute band energies manually using frequency domain approximation
  // Simple approach: measure RMS in time-domain with bandpass filters
  const bands = {
    sub: { low: 0, high: 80, energy: 0 },
    lowMid: { low: 80, high: 300, energy: 0 },
    mid: { low: 300, high: 2000, energy: 0 },
    high: { low: 2000, high: 8000, energy: 0 },
    air: { low: 8000, high: sampleRate / 2, energy: 0 },
  }

  // Use multiple offline contexts with biquad filters for each band
  const bandResults: Record<string, number> = {}
  for (const [bandName, band] of Object.entries(bands)) {
    if (band.high > sampleRate / 2) {
      bandResults[bandName] = 0
      continue
    }
    try {
      const bandCtx = new OfflineAudioContext(1, Math.min(totalSamples, sampleRate * 5), sampleRate)
      const bandSource = bandCtx.createBufferSource()
      const sampleCount = Math.min(totalSamples, sampleRate * 5)
      const bandBuffer = bandCtx.createBuffer(1, sampleCount, sampleRate)
      const bandData = bandBuffer.getChannelData(0)
      const bandStart = Math.floor(totalSamples * 0.2)
      for (let i = 0; i < sampleCount; i++) {
        bandData[i] = leftChannel[bandStart + i] || 0
        if (rightChannel) bandData[i] = (bandData[i] + (rightChannel[bandStart + i] || 0)) / 2
      }
      bandSource.buffer = bandBuffer

      const filter = bandCtx.createBiquadFilter()
      if (band.low === 0) {
        filter.type = 'lowpass'
        filter.frequency.value = band.high
      } else if (band.high >= sampleRate / 2) {
        filter.type = 'highpass'
        filter.frequency.value = band.low
      } else {
        filter.type = 'bandpass'
        filter.frequency.value = (band.low + band.high) / 2
        filter.Q.value = (band.low + band.high) / (2 * (band.high - band.low))
      }

      bandSource.connect(filter)
      filter.connect(bandCtx.destination)
      bandSource.start()
      const rendered = await bandCtx.startRendering()
      const renderedData = rendered.getChannelData(0)
      let sumSq = 0
      for (let i = 0; i < renderedData.length; i++) sumSq += renderedData[i] * renderedData[i]
      bandResults[bandName] = Math.sqrt(sumSq / renderedData.length)
    } catch {
      bandResults[bandName] = 0
    }
  }

  const totalBandEnergy = Object.values(bandResults).reduce((a, b) => a + b, 0) || 1
  const bandPercents: Record<string, string> = {}
  for (const [k, v] of Object.entries(bandResults)) {
    bandPercents[k] = ((v / totalBandEnergy) * 100).toFixed(1)
  }

  await audioContext.close()

  // Stereo width descriptor
  let stereoDesc = 'mono'
  if (rightChannel) {
    if (correlation > 0.95) stereoDesc = 'very narrow / near-mono'
    else if (correlation > 0.7) stereoDesc = 'narrow'
    else if (correlation > 0.4) stereoDesc = 'moderate width'
    else if (correlation > 0.1) stereoDesc = 'wide'
    else stereoDesc = 'very wide / possible phase issues'
  }

  return `
--- AUDIO SIGNAL ANALYSIS ---
RMS Loudness: ${rmsDb.toFixed(1)} dBFS
Peak Amplitude: ${peakDb.toFixed(1)} dBFS
Crest Factor (Dynamic Range): ${crestFactor.toFixed(1)} dB
Estimated Clipping: ${clippingPercent}% of samples at/near 0dBFS
DC Offset: ${dcOffset.toFixed(5)} ${dcOffset > 0.01 ? '(FLAGGED — above threshold)' : '(clean)'}
Stereo Correlation: ${correlation.toFixed(3)} — ${stereoDesc}
Channels: ${numChannels === 1 ? 'Mono' : 'Stereo'}

Frequency Band Energy (relative):
  Sub bass (0–80 Hz):      ${bandPercents.sub}%
  Low-mid (80–300 Hz):     ${bandPercents.lowMid}%
  Mids (300 Hz–2 kHz):     ${bandPercents.mid}%
  High (2–8 kHz):          ${bandPercents.high}%
  Air (8 kHz+):            ${bandPercents.air}%
---`
}

function parseReport(text: string, sectionIds: number[]) {
  const sections: Record<number, string> = {}
  sectionIds.forEach((id, i) => {
    const nextId = sectionIds[i + 1]
    const startRegex = new RegExp(`##\\s*${id}[.\\s]`)
    const startMatch = text.search(startRegex)
    if (startMatch === -1) return
    let endMatch = text.length
    if (nextId) {
      const endRegex = new RegExp(`##\\s*${nextId}[.\\s]`)
      const found = text.search(endRegex)
      if (found !== -1) endMatch = found
    }
    sections[id] = text.slice(startMatch, endMatch).trim()
  })
  return sections
}

function getActiveSectionInBatch(text: string, sectionIds: number[]) {
  let active = sectionIds[0]
  sectionIds.forEach(id => {
    const regex = new RegExp(`##\\s*${id}[.\\s]`)
    if (regex.test(text)) active = id
  })
  return active
}

function cleanLine(line: string) {
  return line.replace(/\*\*/g, '').replace(/^###\s*\d*\.?\s*/, '').trim()
}

function SectionBlock({ section, content, isActive, visible }: {
  section: { id: number; label: string }
  content?: string
  isActive: boolean
  visible: boolean
}) {
  const isVerdict = section.id === 12

  const scores = { file: 0, sound: 0, craft: 0, market: 0, overall: 0 }
  if (isVerdict && content) {
    const fileMatch = content.match(/File[:\s]+(\d+)/i)
    const soundMatch = content.match(/Sound[:\s]+(\d+)/i)
    const craftMatch = content.match(/Craft[:\s]+(\d+)/i)
    const marketMatch = content.match(/Market[:\s]+(\d+)/i)
    const overallMatch = content.match(/Overall[^:]*:[^\d]*(\d+)/i)
    if (fileMatch) scores.file = parseInt(fileMatch[1])
    if (soundMatch) scores.sound = parseInt(soundMatch[1])
    if (craftMatch) scores.craft = parseInt(craftMatch[1])
    if (marketMatch) scores.market = parseInt(marketMatch[1])
    if (overallMatch) scores.overall = parseInt(overallMatch[1])
  }

  const cleanContent = content
    ? content.replace(/^##\s*\d+[.\s][^\n]*\n/, '').trim()
    : ''

  return (
    <div style={{
      border: isVerdict ? '1px solid #c8ff00' : '1px solid #1a1a1a',
      background: isVerdict ? 'rgba(200,255,0,0.04)' : '#0f0f0f',
      marginBottom: '2px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 20px',
        borderBottom: isVerdict ? '1px solid rgba(200,255,0,0.15)' : '1px solid #1a1a1a',
        background: isVerdict ? 'rgba(200,255,0,0.04)' : '#0c0c0c',
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#333', letterSpacing: '0.15em', marginRight: '16px' }}>
          {String(section.id).padStart(2, '0')}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.2em', color: isVerdict ? '#c8ff00' : '#555', textTransform: 'uppercase', flex: 1 }}>
          {section.label}
        </span>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: isActive ? '#c8ff00' : (content ? '#c8ff00' : '#2a2a2a'),
          boxShadow: (isActive || content) ? '0 0 6px #c8ff00' : 'none',
          animation: isActive ? 'pulse 1s ease-in-out infinite' : 'none',
        }} />
      </div>

      {isVerdict && content ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', padding: '20px', borderBottom: '1px solid rgba(200,255,0,0.1)' }}>
            {(['File', 'Sound', 'Craft', 'Market'] as const).map(label => (
              <div key={label} style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>{label}</div>
                <div style={{ fontWeight: 900, fontSize: '36px', color: '#c8ff00', lineHeight: 1 }}>
                  {scores[label.toLowerCase() as keyof typeof scores]}<span style={{ fontSize: '16px', color: '#333' }}>/10</span>
                </div>
              </div>
            ))}
          </div>
          {scores.overall > 0 && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(200,255,0,0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.2em', color: '#555', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Overall Score</span>
              <div style={{ flex: 1, height: '2px', background: '#1a1a1a' }}>
                <div style={{ height: '100%', background: '#c8ff00', width: `${scores.overall * 10}%`, transition: 'width 1.5s cubic-bezier(0.16,1,0.3,1)' }} />
              </div>
              <span style={{ fontWeight: 900, fontSize: '28px', color: '#c8ff00' }}>{scores.overall}.0</span>
            </div>
          )}
          <div style={{ padding: '20px', color: '#aaa', fontSize: '13px', lineHeight: 1.8 }}>
            {cleanContent.split('\n').filter(l => l.trim()).map((line, i) => {
              const cl = cleanLine(line)
              if (!cl) return null
              return <p key={i} style={{ marginBottom: '10px' }}>{cl}</p>
            })}
          </div>
        </div>
      ) : content ? (
        <div style={{ padding: '20px', color: '#aaa', fontSize: '13px', lineHeight: 1.8 }}>
          {cleanContent.split('\n').filter(l => l.trim()).map((line, i) => {
            const cl = cleanLine(line)
            if (!cl) return null
            const isWarning = cl.includes('⚠') || cl.toLowerCase().includes('flag') || cl.toLowerCase().includes('warning')
            return (
              <p key={i} style={{
                marginBottom: '10px',
                color: isWarning ? '#ff8c00' : '#aaa',
                fontFamily: isWarning ? 'monospace' : 'inherit',
                fontSize: isWarning ? '11px' : '13px',
              }}>{cl}</p>
            )
          })}
        </div>
      ) : (
        <div style={{ padding: '20px', color: '#2a2a2a', fontSize: '13px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          {isActive ? 'Analyzing...' : 'Pending'}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('')
  const [filename, setFilename] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [visibleSections, setVisibleSections] = useState<number[]>([])
  const [sectionContents, setSectionContents] = useState<Record<number, string>>({})
  const [activeSection, setActiveSection] = useState<number>(0)
  const rawReportRef = useRef('')

  const handleFile = (f: File | null | undefined) => {
    if (f && f.type.startsWith('audio/')) {
      setFile(f)
      setFilename(f.name)
    }
  }

  const runBatch = async (batch: number, audioInfo: string, q: string) => {
    const batchSections = BATCHES[batch]

    setVisibleSections(prev => {
      const updated = [...prev]
      batchSections.forEach(id => { if (!updated.includes(id)) updated.push(id) })
      return updated
    })

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioInfo, question: q, batch })
    })

    if (!res.ok) throw new Error(`Server error: ${res.status}`)
    if (!res.body) throw new Error('No response body')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let batchText = ''

    while (true) {
      const { done: streamDone, value } = await reader.read()
      if (streamDone) break
      const chunk = decoder.decode(value, { stream: true })
      batchText += chunk
      rawReportRef.current += chunk

      const active = getActiveSectionInBatch(batchText, batchSections)
      setActiveSection(active)

      const parsed = parseReport(batchText, batchSections)
      setSectionContents(prev => ({ ...prev, ...parsed }))
    }

    const finalParsed = parseReport(batchText, batchSections)
    setSectionContents(prev => ({ ...prev, ...finalParsed }))
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setDone(false)
    setVisibleSections([])
    setSectionContents({})
    setActiveSection(0)
    rawReportRef.current = ''

    try {
      const { parseBlob } = await import('music-metadata-browser')

      setLoadingStage('Reading metadata...')
      const metadata = await parseBlob(file)

      setLoadingStage('Analyzing audio signal...')
      const audioFeatures = await extractAudioFeatures(file)

      const audioInfo = `
Filename: ${file.name}
Format: ${metadata.format.container || 'unknown'}
Duration: ${metadata.format.duration ? Math.round(metadata.format.duration) + ' seconds' : 'unknown'}
Bitrate: ${metadata.format.bitrate ? Math.round(metadata.format.bitrate / 1000) + ' kbps' : 'unknown'}
Sample Rate: ${metadata.format.sampleRate || 'unknown'} Hz
Channels: ${metadata.format.numberOfChannels || 'unknown'}
Title: ${metadata.common.title || 'unknown'}
Artist: ${metadata.common.artist || 'unknown'}
Genre: ${metadata.common.genre?.[0] || 'unknown'}
BPM: ${metadata.common.bpm || 'unknown'}
Key: ${metadata.common.key || 'unknown'}
${audioFeatures}
      `.trim()

      setLoadingStage('')
      const q = question || 'Give me a full analysis'

      await runBatch(1, audioInfo, q)
      await runBatch(2, audioInfo, q)
      await runBatch(3, audioInfo, q)
      await runBatch(4, audioInfo, q)

      setVisibleSections(SECTIONS.map(s => s.id))
      setActiveSection(0)
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    }

    setLoading(false)
    setLoadingStage('')
  }

  const sendReport = async () => {
    if (!name || !email) return
    setSubmitting(true)
    await fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, filename, report: rawReportRef.current })
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  const reset = () => {
    setFile(null)
    setFilename('')
    setQuestion('')
    setDone(false)
    setError(null)
    setName('')
    setEmail('')
    setSubmitted(false)
    setVisibleSections([])
    setSectionContents({})
    setActiveSection(0)
    setLoading(false)
    setLoadingStage('')
    rawReportRef.current = ''
  }

  if (!loading && Object.keys(sectionContents).length === 0 && !done) {
    return (
      <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e8e8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'sans-serif' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.3em', color: '#555', textTransform: 'uppercase', marginBottom: '16px' }}>Music Analysis</p>
        <h1 style={{ fontSize: 'clamp(60px, 15vw, 100px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1, marginBottom: '12px' }}>DUCER</h1>
        <p style={{ color: '#555', marginBottom: '48px', fontSize: '15px' }}>{randomTagline}</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => (document.getElementById('fileInput') as HTMLElement)?.click()}
          style={{
            width: '100%', maxWidth: '440px',
            border: `1px dashed ${dragging ? '#e8e8e8' : '#2a2a2a'}`,
            borderRadius: '16px', padding: '64px 32px',
            textAlign: 'center', cursor: 'pointer',
            background: dragging ? 'rgba(255,255,255,0.03)' : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          {file ? (
            <div>
              <p style={{ fontSize: '24px', marginBottom: '8px' }}>🎵</p>
              <p style={{ color: '#e8e8e8', fontSize: '13px' }}>{filename}</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '28px', marginBottom: '12px', color: '#333' }}>+</p>
              <p style={{ color: '#555', fontSize: '13px' }}>Drop your track here</p>
              <p style={{ color: '#333', fontSize: '11px', marginTop: '4px' }}>or click to browse</p>
            </>
          )}
          <input
            id="fileInput"
            type="file"
            accept=".mp3,.wav,.aiff,.aif,.flac,.m4a,.ogg,.wma,.aac"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {file && (
          <>
            <input
              type="text"
              placeholder="What are you trying to get from this? (optional)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && analyze()}
              style={{
                marginTop: '16px', width: '100%', maxWidth: '440px',
                background: 'transparent', border: '1px solid #1a1a1a',
                borderRadius: '12px', padding: '12px 16px',
                color: '#e8e8e8', fontSize: '13px', outline: 'none',
                fontFamily: 'sans-serif',
              }}
            />
            <button
              onClick={analyze}
              style={{
                marginTop: '12px', background: '#e8e8e8', color: '#080808',
                fontWeight: 700, padding: '14px 48px', borderRadius: '100px',
                border: 'none', cursor: 'pointer', fontSize: '13px', letterSpacing: '0.05em',
              }}
            >
              Analyze
            </button>
          </>
        )}

        {loading && loadingStage && (
          <p style={{ marginTop: '24px', fontFamily: 'monospace', fontSize: '11px', color: '#c8ff00', letterSpacing: '0.15em' }}>
            {loadingStage}
          </p>
        )}

        {error && (
          <div style={{ marginTop: '20px', width: '100%', maxWidth: '440px', background: '#1a0000', border: '1px solid #440000', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: '#ff6666', fontSize: '13px' }}>{error}</p>
            <button onClick={() => setError(null)} style={{ color: '#ff4444', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', textDecoration: 'underline' }}>Dismiss</button>
          </div>
        )}
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e8e8', fontFamily: 'sans-serif' }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>

      <div style={{
        borderBottom: '1px solid #1a1a1a', padding: '24px 40px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        position: 'sticky', top: 0, background: '#080808', zIndex: 100,
      }}>
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.25em', color: '#555', textTransform: 'uppercase', marginBottom: '4px' }}>Intelligence Report</p>
          <h1 style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>DUCER</h1>
          <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#555', marginTop: '4px' }}>{filename}</p>
        </div>
        <div>
          {loading ? (
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#c8ff00', letterSpacing: '0.15em' }}>
              {loadingStage ? `● ${loadingStage.toUpperCase().replace('...', '')}` : '● ANALYZING'}
            </span>
          ) : done ? (
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#c8ff00', letterSpacing: '0.15em' }}>● COMPLETE</span>
          ) : (
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#333', letterSpacing: '0.15em' }}>● READY</span>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px' }}>
        {SECTIONS.map(section => (
          <SectionBlock
            key={section.id}
            section={section}
            content={sectionContents[section.id]}
            isActive={loading && activeSection === section.id}
            visible={visibleSections.includes(section.id)}
          />
        ))}

        {done && (
          <div style={{ marginTop: '32px', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', background: '#0f0f0f' }}>
            {submitted ? (
              <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', fontFamily: 'monospace' }}>Got it. Check your inbox.</p>
            ) : (
              <>
                <p style={{ fontWeight: 700, marginBottom: '4px', fontSize: '15px' }}>Want a copy of this report?</p>
                <p style={{ color: '#555', fontSize: '13px', marginBottom: '20px' }}>Leave your name and email and we'll send it over.</p>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '12px 16px', color: '#e8e8e8', fontSize: '13px', outline: 'none', marginBottom: '10px', fontFamily: 'sans-serif' }}
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '12px 16px', color: '#e8e8e8', fontSize: '13px', outline: 'none', marginBottom: '14px', fontFamily: 'sans-serif' }}
                />
                <button
                  onClick={sendReport}
                  disabled={submitting || !name || !email}
                  style={{ width: '100%', background: '#e8e8e8', color: '#080808', fontWeight: 700, padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '13px', opacity: (!name || !email) ? 0.4 : 1 }}
                >
                  {submitting ? 'Sending...' : 'Send me this report'}
                </button>
              </>
            )}
          </div>
        )}

        {done && (
          <button
            onClick={reset}
            style={{
              marginTop: '16px', border: '1px solid #1a1a1a', background: 'none', color: '#555',
              padding: '12px 32px', borderRadius: '100px', cursor: 'pointer', fontSize: '11px',
              fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase',
              display: 'block', margin: '16px auto 0',
            }}
          >
            Analyze Another Track
          </button>
        )}
      </div>
    </main>
  )
}