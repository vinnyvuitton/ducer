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
  { id: 1, key: 'SONG IDENTITY', label: 'Song Identity' },
  { id: 2, key: 'FILE HEALTH', label: 'File Health & Technical Snapshot' },
  { id: 3, key: 'WHAT THE FILE', label: 'What the File Is Actually Telling Us' },
  { id: 4, key: 'STRUCTURAL', label: 'Structural Working Map' },
  { id: 5, key: 'HOOK DURABILITY', label: 'Hook Durability' },
  { id: 6, key: 'PRODUCTION', label: 'Production & Arrangement Intelligence' },
  { id: 7, key: 'LYRICS', label: 'Lyrics Intelligence' },
  { id: 8, key: 'LANE', label: 'Lane Classification' },
  { id: 9, key: 'MARKET', label: 'Market & Release Positioning' },
  { id: 10, key: 'TRAJECTORY', label: 'Trajectory Scenarios' },
  { id: 11, key: 'RISK', label: 'Risk Factors' },
  { id: 12, key: 'VERDICT', label: 'The Verdict' },
]

function parseReport(text: string) {
  const sections: any = {}
  SECTIONS.forEach((s, i) => {
    const nextSection = SECTIONS[i + 1]
    const startMarker = `## ${s.id}.`
    const endMarker = nextSection ? `## ${nextSection.id}.` : null
    const startIdx = text.indexOf(startMarker)
    if (startIdx === -1) return
    const endIdx = endMarker ? text.indexOf(endMarker) : text.length
    const content = text.slice(startIdx, endIdx === -1 ? text.length : endIdx).trim()
    sections[s.id] = content
  })
  return sections
}

function SectionBlock({ section, content, isActive, visible }: any) {
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

  const cleanContent = content ? content.replace(/^##\s+\d+\.\s+[^\n]+\n/, '').trim() : ''

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
        display: 'flex',
        alignItems: 'center',
        padding: '14px 20px',
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
            {[['File', scores.file], ['Sound', scores.sound], ['Craft', scores.craft], ['Market', scores.market]].map(([label, score]: any) => (
              <div key={label} style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>{label}</div>
                <div style={{ fontFamily: 'sans-serif', fontWeight: 900, fontSize: '36px', color: '#c8ff00', lineHeight: 1 }}>
                  {score}<span style={{ fontSize: '16px', color: '#333' }}>/10</span>
                </div>
              </div>
            ))}
          </div>
          {scores.overall > 0 && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(200,255,0,0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.2em', color: '#555', textTransform: 'uppercase' }}>Overall Score</span>
              <div style={{ flex: 1, height: '2px', background: '#1a1a1a' }}>
                <div style={{ height: '100%', background: '#c8ff00', width: `${scores.overall * 10}%`, transition: 'width 1.5s cubic-bezier(0.16,1,0.3,1)' }} />
              </div>
              <span style={{ fontFamily: 'sans-serif', fontWeight: 900, fontSize: '28px', color: '#c8ff00' }}>{scores.overall}.0</span>
            </div>
          )}
          <div style={{ padding: '20px', color: '#aaa', fontSize: '13px', lineHeight: 1.8 }}>
            {cleanContent.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => (
              <p key={i} style={{ marginBottom: '10px' }}>{line.replace(/\*\*/g, '')}</p>
            ))}
          </div>
        </div>
      ) : content ? (
        <div style={{ padding: '20px', color: '#aaa', fontSize: '13px', lineHeight: 1.8 }}>
          {cleanContent.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => {
            const isWarning = line.includes('⚠') || line.includes('warning') || line.toLowerCase().includes('flag')
            return (
              <p key={i} style={{
                marginBottom: '10px',
                color: isWarning ? '#ff8c00' : '#aaa',
                fontFamily: isWarning ? 'monospace' : 'inherit',
                fontSize: isWarning ? '11px' : '13px',
              }}>
                {line.replace(/\*\*/g, '')}
              </p>
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
  const [file, setFile] = useState<any>(null)
  const [dragging, setDragging] = useState(false)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [rawReport, setRawReport] = useState('')
  const [filename, setFilename] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<any>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [visibleSections, setVisibleSections] = useState<number[]>([])
  const reportRef = useRef('')

  const handleFile = (f: any) => {
    if (f && f.type.startsWith('audio/')) {
      setFile(f)
      setFilename(f.name)
    }
  }

  const getActiveSection = (text: string) => {
    let active = 1
    SECTIONS.forEach(s => {
      if (text.includes(`## ${s.id}.`)) active = s.id
    })
    return active
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setRawReport('')
    setDone(false)
    setVisibleSections([1])
    reportRef.current = ''

    try {
      const { parseBlob } = await import('music-metadata-browser')
      const metadata = await parseBlob(file)

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
      `.trim()

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioInfo, question: question || 'Give me a full analysis' })
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        const chunk = decoder.decode(value, { stream: true })
        reportRef.current += chunk
        setRawReport(prev => prev + chunk)

        const active = getActiveSection(reportRef.current)
        setVisibleSections(prev => {
          const newSections = [...prev]
          for (let i = 1; i <= active; i++) {
            if (!newSections.includes(i)) newSections.push(i)
          }
          return newSections
        })
      }

      setVisibleSections(SECTIONS.map(s => s.id))
      setDone(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  const sendReport = async () => {
    if (!name || !email) return
    setSubmitting(true)
    await fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, filename, report: rawReport })
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  const reset = () => {
    setFile(null)
    setFilename('')
    setQuestion('')
    setRawReport('')
    setDone(false)
    setError(null)
    setName('')
    setEmail('')
    setSubmitted(false)
    setVisibleSections([])
    setLoading(false)
    reportRef.current = ''
  }

  const parsedSections = parseReport(rawReport)
  const activeSection = loading ? getActiveSection(rawReport) : 0

  if (!rawReport && !loading) {
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
          <input id="fileInput" type="file" accept=".mp3,.wav,.aiff,.aif,.flac,.m4a,.ogg,.wma,.aac" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
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
                border: 'none', cursor: 'pointer', fontSize: '13px',
                letterSpacing: '0.05em',
              }}
            >
              Analyze
            </button>
          </>
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
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>

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
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#333' }}>
            {loading ? (
              <span style={{ color: '#c8ff00' }}>● ANALYZING</span>
            ) : (
              <span style={{ color: '#555' }}>● COMPLETE</span>
            )}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px' }}>
        {SECTIONS.map(section => (
          <SectionBlock
            key={section.id}
            section={section}
            content={parsedSections[section.id]}
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
                <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '12px 16px', color: '#e8e8e8', fontSize: '13px', outline: 'none', marginBottom: '10px', fontFamily: 'sans-serif' }} />
                <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '12px 16px', color: '#e8e8e8', fontSize: '13px', outline: 'none', marginBottom: '14px', fontFamily: 'sans-serif' }} />
                <button onClick={sendReport} disabled={submitting || !name || !email}
                  style={{ width: '100%', background: '#e8e8e8', color: '#080808', fontWeight: 700, padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '13px', opacity: (!name || !email) ? 0.4 : 1 }}>
                  {submitting ? 'Sending...' : 'Send me this report'}
                </button>
              </>
            )}
          </div>
        )}

        {done && (
          <button onClick={reset}
            style={{ marginTop: '16px', border: '1px solid #1a1a1a', background: 'none', color: '#555', padding: '12px 32px', borderRadius: '100px', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', margin: '16px auto 0' }}>
            Analyze Another Track
          </button>
        )}
      </div>
    </main>
  )
}