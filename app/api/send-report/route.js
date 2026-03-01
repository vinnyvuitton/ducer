import Anthropic from '@anthropic-ai/sdk'
import * as mm from 'music-metadata'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('audio')
    const question = formData.get('question') || 'Give me a full analysis'

    if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const metadata = await mm.parseBuffer(buffer, file.type)

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

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are Ducer, an expert music analysis AI. Based on the technical metadata below, provide a detailed analysis report.

AUDIO DATA:
${audioInfo}

ARTIST'S GOAL: ${question}

Provide a full Ducer report covering:

1. THE FILE - Technical quality, format, bitrate, sample rate assessment
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
  }
}