import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { audioInfo, question } = await request.json()

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