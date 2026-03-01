cat > app/page.tsx << 'EOF'
'use client'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

export default function Home() {
  const [file, setFile] = useState<any>(null)
  const [dragging, setDragging] = useState(false)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [filename, setFilename] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<any>(null)
  const [loadingStep, setLoadingStep] = useState('')

  const handleFile = (f: any) => {
    if (f && f.type.startsWith('audio/')) {
      setFile(f)
      setFilename(f.name)
    }
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setLoadingStep('Reading your track...')

    try {
      const { parseBlob } = await import('music-metadata-browser')
      setLoadingStep('Extracting audio data...')
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

      setLoadingStep('Analyzing...')

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioInfo, question: question || 'Give me a full analysis' })
      })

      if (!res.ok) {
        throw new Error('Analysis failed')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
        }
      }

      if (!fullText) {
        throw new Error('Empty response')
      }

      setReport(fullText)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') analyze()
  }

  const sendReport = async () => {
    if (!name || !email) return
    setSubmitting(true)
    await fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, filename, report })
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {!report && !loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <p className="text-xs tracking-[0.3em] text-gray-500 uppercase mb-4">Music Analysis</p>
          <h1 className="text-7xl font-black tracking-tighter mb-3">DUCER</h1>
          <p className="text-gray-400 mb-16">{randomTagline}</p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => (document.getElementById('fileInput') as HTMLElement)?.click()}
            className={`w-full max-w-md border border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 ${dragging ? 'border-white bg-white/5' : 'border-gray-700 hover:border-gray-500'}`}
          >
            {file ? (
              <div>
                <p className="text-2xl mb-2">🎵</p>
                <p className="text-white font-medium text-sm">{filename}</p>
              </div>
            ) : (
              <>
                <p className="text-3xl mb-4">+</p>
                <p className="text-gray-400 text-sm">Drop your track here</p>
                <p className="text-gray-600 text-xs mt-1">or click to browse</p>
              </>
            )}
            <input id="fileInput" type="file" accept=".mp3,.wav,.aiff,.aif,.flac,.m4a,.ogg,.wma,.aac" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>

          {file && (
            <>
              <input
                type="text"
                placeholder="What are you trying to get from this? (optional)"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                className="mt-5 w-full max-w-md bg-transparent border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gray-500"
              />
              <button
                onClick={analyze}
                className="mt-4 bg-white text-black font-bold px-12 py-4 rounded-full text-sm tracking-wide hover:bg-gray-100 transition-all"
              >
                Analyze
              </button>
            </>
          )}

          {error && (
            <div className="mt-6 w-full max-w-md bg-red-950 border border-red-800 rounded-xl px-5 py-4">
              <p className="text-red-300 text-sm">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 text-xs mt-2 underline">Dismiss</button>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-4xl font-black tracking-tighter mb-8">DUCER</h1>
          <div className="w-1 h-1 bg-white rounded-full animate-ping mb-6"></div>
          <p className="text-gray-400 text-sm tracking-widest uppercase animate-pulse">{loadingStep || 'Analyzing'}</p>
          <p className="text-gray-600 text-xs mt-3">{filename}</p>
          <p className="text-gray-700 text-xs mt-8 max-w-xs text-center">This usually takes 20–40 seconds. Hang tight.</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="mb-12">
            <p className="text-xs tracking-[0.3em] text-gray-500 uppercase mb-2">Analysis Complete</p>
            <h1 className="text-5xl font-black tracking-tighter">DUCER</h1>
            <p className="text-gray-500 text-sm mt-2">{filename}</p>
          </div>

          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:font-black prose-headings:tracking-tight prose-headings:text-white
            prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-base prose-h3:text-gray-300
            prose-p:text-gray-300 prose-p:leading-relaxed
            prose-strong:text-white
            prose-hr:border-gray-800
            prose-table:text-sm
            prose-th:text-gray-400 prose-th:font-medium
            prose-td:text-gray-300
            prose-li:text-gray-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
          </div>

          <div className="mt-16 border border-gray-800 rounded-2xl p-8">
            {submitted ? (
              <p className="text-gray-400 text-sm text-center">Got it. Check your inbox.</p>
            ) : (
              <>
                <p className="text-white font-bold mb-1">Want a copy of this report?</p>
                <p className="text-gray-500 text-sm mb-6">Leave your name and email and we'll send it over.</p>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gray-500 mb-3"
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gray-500 mb-4"
                />
                <button
                  onClick={sendReport}
                  disabled={submitting || !name || !email}
                  className="w-full bg-white text-black font-bold py-3 rounded-full text-sm tracking-wide hover:bg-gray-100 transition-all disabled:opacity-40"
                >
                  {submitting ? 'Sending...' : 'Send me this report'}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => { setReport(null); setFile(null); setFilename(''); setQuestion(''); setName(''); setEmail(''); setSubmitted(false); setError(null) }}
            className="mt-8 border border-gray-700 text-gray-500 px-8 py-3 rounded-full text-xs tracking-widest uppercase hover:border-gray-500 hover:text-gray-300 transition-all"
          >
            Analyze Another Track
          </button>
        </div>
      )}
    </main>
  )
}
EOF