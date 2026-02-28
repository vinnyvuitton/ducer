'use client'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Home() {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [filename, setFilename] = useState('')

  const handleFile = (f) => {
    if (f && f.type.startsWith('audio/')) {
      setFile(f)
      setFilename(f.name)
    }
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append('audio', file)
    formData.append('question', question)
    const res = await fetch('/api/analyze', { method: 'POST', body: formData })
    const data = await res.json()
    setReport(data.report)
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') analyze()
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {!report && !loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <p className="text-xs tracking-[0.3em] text-gray-500 uppercase mb-4">Music Analysis</p>
          <h1 className="text-7xl font-black tracking-tighter mb-3">DUCER</h1>
          <p className="text-gray-400 mb-16">Upload your song. Find out everything.</p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => document.getElementById('fileInput').click()}
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
            <input id="fileInput" type="file" accept="audio/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
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
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-4xl font-black tracking-tighter mb-8">DUCER</h1>
          <div className="w-1 h-1 bg-white rounded-full animate-ping mb-6"></div>
          <p className="text-gray-400 text-sm tracking-widest uppercase animate-pulse">Analyzing</p>
          <p className="text-gray-600 text-xs mt-3">{filename}</p>
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

          <button
            onClick={() => { setReport(null); setFile(null); setFilename(''); setQuestion('') }}
            className="mt-16 border border-gray-700 text-gray-500 px-8 py-3 rounded-full text-xs tracking-widest uppercase hover:border-gray-500 hover:text-gray-300 transition-all"
          >
            Analyze Another Track
          </button>
        </div>
      )}
    </main>
  )
}