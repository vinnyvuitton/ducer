import Anthropic from '@anthropic-ai/sdk'
import * as mm from 'music-metadata'
import ffmpeg from 'fluent-ffmpeg'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function analyzeWithFFmpeg(inputPath) {
  return new Promise((resolve, reject) => {
    let loudnessData = {}
    ffmpeg(inputPath)
      .audioFilters('ebur128=peak=true')
      .format('null')
      .output('/dev/null')
      .on('stderr', (line) => {
        if (line.includes('I:')) loudnessData.integrated = line.match(/I:\s+([\-\d.]+)/)?.[1]
        if (line.includes('LRA:')) loudnessData.range = line.match(/LRA:\s+([\d.]+)/)?.[1]
        if (line.includes('True peak:')) loudnessData.truePeak = line.match(/True peak:\s+([\-\d.]+)/)?.[1]
      })
      .on('end', () => resolve(loudnessData))
      .on('error', (err) => resolve({}))
      .run()
  })
}

export async function POST(request) {
  let tmpPath = null
  try {
    const formData = await request.formData()
    const file = formData.get('audio')
    const question = formData.get('question') || 'Give me a full analysis'

    if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    tmpPath = join(tmpdir(), `ducer_${Date.now()}.mp3`)
    await writeFile(tmpPath, buffer)

    const [metadata, loudness] = await Promise.all([
      mm.parseBuffer(buffer, file.type),
      analyzeWithFFmpeg(tmpPath)
    ])

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
Integrated Loudness: ${loudness.integrated ? loudness.integrated + ' LUFS' : 'unknown'}
Loudness Range: ${loudness.range ? loudness.range + ' LU' : 'unknown'}
True Peak: ${loudness.truePeak ? loudness.truePeak + ' dBTP' : 'unknown'}
    `.trim()

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are Ducer, an expert music analysis AI. Based on the technical metadata and loudness measurements below, provide a detailed analysis report.

AUDIO DATA:
${audioInfo}

ARTIST'S GOAL: ${question}

Provide a full Ducer report covering:

1. THE FILE - Technical quality, mix, loudness (reference: streaming standard is -14 LUFS, mastered loudness is -8 to -6 LUFS), clarity
2. THE SOUND - Genre, subgenre, instrumentation, production style, sonic comparisons based on all available data
3. THE CRAFT - Music theory insights, structure, arrangement based on BPM, key, duration
4. THE MARKET - Commercial positioning, comparable artists, chart viability, platform fit
5. THE VERDICT - Score each category 1-10, overall score, full honest written breakdown

Be specific, honest, and speak directly to the artist.`
      }]
    })

    return Response.json({ report: message.content[0].text })
  } catch (error) {
    console.error('Analysis error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  } finally {
    if (tmpPath) await unlink(tmpPath).catch(() => {})
  }
}