import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || null
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || null
const AUDD_API_TOKEN = process.env.AUDD_API_TOKEN || null

// ─── AudD: fingerprint audio file to identify track ───────────────────────────
async function getAuddData(audioUrl) {
  if (!AUDD_API_TOKEN || !audioUrl) return null
  try {
    const body = new URLSearchParams({
      url: audioUrl,
      return: 'spotify,apple_music,deezer',
      api_token: AUDD_API_TOKEN,
    })
    const res = await fetch('https://api.audd.io/', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 'success' || !data.result) return null
    return data.result
  } catch {
    return null
  }
}

// ─── AudD: identify from base64 audio blob ────────────────────────────────────
async function getAuddDataFromBase64(base64Audio) {
  if (!AUDD_API_TOKEN || !base64Audio) return null
  try {
    const body = new URLSearchParams({
      audio: base64Audio,
      return: 'spotify,apple_music,deezer',
      api_token: AUDD_API_TOKEN,
    })
    const res = await fetch('https://api.audd.io/', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 'success' || !data.result) return null
    return data.result
  } catch {
    return null
  }
}

// ─── Build AudD enrichment string ─────────────────────────────────────────────
function buildAuddEnrichment(auddResult) {
  if (!auddResult) return ''

  const title = auddResult.title ?? 'unknown'
  const artist = auddResult.artist ?? 'unknown'
  const album = auddResult.album ?? 'unknown'
  const releaseDate = auddResult.release_date ?? 'unknown'
  const label = auddResult.label ?? 'unknown'
  const timecode = auddResult.timecode ?? 'unknown'

  const spotifyLink = auddResult.spotify?.external_urls?.spotify ?? ''
  const appleMusicLink = auddResult.apple_music?.url ?? ''

  return `
--- AUDD AUDIO FINGERPRINT (track identified from audio content) ---
Identified Title: ${title}
Identified Artist: ${artist}
Album: ${album}
Release Date: ${releaseDate}
Label: ${label}
Match Timecode: ${timecode}
Spotify Link: ${spotifyLink || 'not found'}
Apple Music Link: ${appleMusicLink || 'not found'}
---`
}

// ─── Spotify: get access token ────────────────────────────────────────────────
async function getSpotifyToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return null
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token || null
  } catch {
    return null
  }
}

// ─── Spotify: search for track and get audio features ─────────────────────────
async function getSpotifyData(title, artist) {
  if (!title || title === 'unknown') return null

  const token = await getSpotifyToken()
  if (!token) return null

  try {
    const query = artist && artist !== 'unknown'
      ? `track:${title} artist:${artist}`
      : `track:${title}`

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()

    const track = searchData?.tracks?.items?.[0]
    if (!track) return null

    const featuresRes = await fetch(
      `https://api.spotify.com/v1/audio-features/${track.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const features = featuresRes.ok ? await featuresRes.json() : null

    const artistId = track.artists?.[0]?.id
    let artistData = null
    if (artistId) {
      const artistRes = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      artistData = artistRes.ok ? await artistRes.json() : null
    }

    return { track, features, artistData }
  } catch {
    return null
  }
}

// ─── Build Spotify enrichment string ──────────────────────────────────────────
function buildSpotifyEnrichment(spotifyData) {
  if (!spotifyData) return ''

  const { track, features, artistData } = spotifyData

  const popularity = track.popularity ?? 'unknown'
  const releaseDate = track.album?.release_date ?? 'unknown'
  const albumName = track.album?.name ?? 'unknown'
  const albumType = track.album?.album_type ?? 'unknown'
  const artistName = track.artists?.map(a => a.name).join(', ') ?? 'unknown'
  const genres = artistData?.genres?.slice(0, 5).join(', ') || 'unknown'
  const artistFollowers = artistData?.followers?.total ?? 'unknown'
  const artistPopularity = artistData?.popularity ?? 'unknown'
  const spotifyUrl = track.external_urls?.spotify ?? ''

  let featuresBlock = ''
  if (features) {
    featuresBlock = `
Spotify Audio Features:
  Energy:           ${features.energy?.toFixed(3) ?? 'unknown'} (0=calm, 1=intense)
  Valence:          ${features.valence?.toFixed(3) ?? 'unknown'} (0=dark/sad, 1=happy/euphoric)
  Danceability:     ${features.danceability?.toFixed(3) ?? 'unknown'} (0=least, 1=most)
  Acousticness:     ${features.acousticness?.toFixed(3) ?? 'unknown'} (0=electronic, 1=acoustic)
  Instrumentalness: ${features.instrumentalness?.toFixed(3) ?? 'unknown'} (>0.5 likely no vocals)
  Liveness:         ${features.liveness?.toFixed(3) ?? 'unknown'} (>0.8 likely live recording)
  Speechiness:      ${features.speechiness?.toFixed(3) ?? 'unknown'} (>0.66 likely spoken word)
  Loudness:         ${features.loudness?.toFixed(2) ?? 'unknown'} dB (integrated loudness)
  Tempo (Spotify):  ${features.tempo?.toFixed(1) ?? 'unknown'} BPM
  Key (Spotify):    ${features.key ?? 'unknown'} (0=C, 1=C#, 2=D... 11=B)
  Mode:             ${features.mode === 1 ? 'Major' : features.mode === 0 ? 'Minor' : 'unknown'}
  Time Signature:   ${features.time_signature ?? 'unknown'}/4`
  }

  return `
--- SPOTIFY DATA (verified against live database) ---
Track Found: ${track.name} by ${artistName}
Album: ${albumName} (${albumType}, released ${releaseDate})
Spotify Popularity Score: ${popularity}/100 (real-time listener demand)
Spotify URL: ${spotifyUrl}

Artist Profile:
  Genres: ${genres}
  Followers: ${typeof artistFollowers === 'number' ? artistFollowers.toLocaleString() : artistFollowers}
  Artist Popularity: ${artistPopularity}/100
${featuresBlock}
---`
}

// ─── Build enriched audioInfo ──────────────────────────────────────────────────
function buildEnrichedAudioInfo(baseAudioInfo, auddResult, spotifyData) {
  let enriched = baseAudioInfo
  const auddBlock = buildAuddEnrichment(auddResult)
  if (auddBlock) enriched += auddBlock
  const spotifyBlock = buildSpotifyEnrichment(spotifyData)
  if (spotifyBlock) enriched += spotifyBlock
  return enriched
}

// ─── Batch prompts ─────────────────────────────────────────────────────────────
const BATCH_PROMPTS = {
  1: `You are Ducer — a music intelligence engine operating as a hybrid of A&R evaluator, producer consultant, market strategist, and risk assessor.

CORE DOCTRINE:
- You evaluate leverage, durability, positioning, and trajectory. You do not describe songs.
- Every observation must answer at least one of: What leverage does this create? How durable is this? How is it positioned? Where is it going?
- No generic praise. No fan review language. No polite encouragement. This is a label strategy memo.
- Never hallucinate missing data. If BPM, key, or genre are unknown, say so explicitly and reason from what IS available.
- Separate file truth from song truth. A low-bitrate upload can still teach arrangement lessons while limiting mastering conclusions.
- Judge by lane function. A death metal track is not penalized for not behaving like synth-pop. Evaluate whether the song succeeds in its own lane first.
- If AudD fingerprint data is present, use the identified title, artist, label, and release date to ground the Song Identity section with confirmed facts.
- If Spotify data is present, use it to ground claims about genre, popularity, and artist positioning. Reference the Spotify popularity score and artist follower count when discussing market standing.

AUDIO DATA:
{audioInfo}

ARTIST GOAL: {question}

Produce sections 1–4. Every section is mandatory. Use exactly these headers:

## 1. SONG IDENTITY
State what this song is based on all available data. Artist, title, format, duration. If AudD fingerprint data is present, confirm the identification and note the label and release date. If Spotify data is present, reference the album context and Spotify popularity score. Note source quality flags (low bitrate, lossy conversion, mono, missing tags). If data is missing, say what is missing and what that limits.

## 2. FILE HEALTH & TECHNICAL SNAPSHOT
Assess the technical state directly. Cover: format and bitrate quality judgment (release-ready, demo quality, or compromised?), sample rate, channel configuration, duration. Reference the RMS loudness and crest factor. If Spotify loudness data is present, compare it to the file's measured loudness. Spotify/YouTube normalize to -14 LUFS integrated, Apple Music to -16 LUFS — use this context when assessing loudness. Be direct. If the file has problems, name them.

## 3. WHAT THE FILE IS ACTUALLY TELLING US
Translate technical data into production intelligence. Use signal analysis numbers — RMS, crest factor, frequency band energy percentages — to make specific observations about the mix. If Spotify audio features are present, cross-reference energy, valence, acousticness, and instrumentalness to validate or challenge what the file data suggests. What does the frequency balance suggest about the mix approach? What would a mastering engineer flag immediately?

## 4. STRUCTURAL WORKING MAP
Map the song's architecture based on duration and all available metadata. Estimate section timing with timestamps. Identify: How quickly does the song establish its identity? Where is the first payoff moment? Is the structure front-loaded or patient? Does the song earn its runtime? What structural risks exist? Is this pressure architecture, pop-chorus architecture, or event-based architecture?`,

  2: `You are Ducer — a music intelligence engine. Label strategy memo only. No generic praise. Every claim specific and explained.

CORE DOCTRINE:
- Never hallucinate missing data. Work from what is available.
- Judge by lane function, not one universal pop standard.
- Differentiate polish from breakthrough identity — a well-made record is not always a memorable one.
- Hook durability is not just catchiness. Evaluate the mechanism behind each dimension.
- Use the BPM and key data to inform rhythm and harmony analysis where relevant.
- If Spotify audio features are present, use danceability and energy to inform hook and production assessments. Use valence to inform emotional register analysis.

AUDIO DATA:
{audioInfo}

Produce sections 5–8. Use exactly these headers:

## 5. HOOK DURABILITY
Evaluate the hook across all five dimensions. For each: give a rating (Low / Medium / Medium-High / High / Very High / Elite) AND explain the specific mechanism that earns that rating.
1. Melodic memorability — is the melodic contour distinctive enough to survive without production?
2. Rhythmic repeatability — does the rhythmic pattern lock in and reward repetition? Reference the BPM.
3. Lyrical stickiness — are the words themselves memorable, or does the meaning carry it?
4. Dynamic lift — does the song physically change in energy at the hook moment?
5. Crowd participation viability — can a room of people participate without knowing the song?
Then give an overall hook durability assessment in 2–3 sentences.

## 6. PRODUCTION & ARRANGEMENT INTELLIGENCE
Assess the production with specificity. Use the actual signal data — frequency band percentages, spectral centroid, onset strength — to ground your observations. If Spotify features are present, cross-reference acousticness, energy, and instrumentalness. Cover: instrument layers present or implied, percussion style and role, bass movement and low-end behavior, stereo width, texture density, use of space. Answer: what is the center of gravity in this mix? What would a producer flag immediately?

## 7. LYRICS INTELLIGENCE
Analyze lyric function directly. Answer all 8 questions:
1. What is this lyric trying to do (immerse, confess, slogan, narrative, persona)?
2. How clearly does it accomplish that?
3. What single line or phrase is carrying the most weight?
4. Does the title or chorus convert on its own?
5. Is the writing specific, universal, or generic?
6. Would it work without the performer's delivery?
7. What is the cliche risk?
8. What would a top-tier writer tighten first?
If lyrics are unavailable from metadata, state that clearly and assess based on genre, title, and structure.

## 8. LANE CLASSIFICATION
Define with precision:
- Primary lane (specific — not just "pop," say what kind)
- Secondary lane (crossover potential or adjacent market)
- Playlist ecosystem (what playlists is this realistically competing for?)
- Audience archetype (who is the core listener and what do they need from this song?)
If Spotify genre data is present, validate or challenge the lane classification against it.
Also answer: Is this song trying to own a lane or compete in a crowded one? Does the execution match that ambition?`,

  3: `You are Ducer — a music intelligence engine. Label strategy memo only. No generic praise. Every claim specific and explained.

CORE DOCTRINE:
- Differentiate niche dominance from broad scalability. Both are valid goals. Be clear which this is.
- Use scenario logic for all trajectory claims. No binary hit/miss language.
- Separate artistic strength from commercial scalability — they are not the same thing.
- Ask: what kind of leverage is this song trying to create? Does the execution support that leverage?
- Communal ownership is a form of commercial leverage.
- If Spotify popularity score and artist follower count are present, use them as hard evidence when modeling trajectory. A track with 65+ popularity is already demonstrating pull. A track at 30 or below is in early-discovery territory.

AUDIO DATA:
{audioInfo}

Produce sections 9–11. Use exactly these headers:

## 9. MARKET & RELEASE POSITIONING
Assess: hook accessibility for the target lane, radio viability (be specific about format), playlist compatibility (name the types), sync potential (what use cases — TV drama, ad, trailer, game?), viral potential (what platform and why), cultural/era alignment (is this early, aligned, or late to its trend wave?). If Spotify data is present, reference the popularity score, genre tags, and artist follower count as market evidence. Name 2–3 comparable artists whose leverage mechanism is similar. Explain the comparison. Separate artistic strength from commercial scalability.

## 10. TRAJECTORY SCENARIOS
Model three distinct scenarios. For each: scenario name, probability band (e.g. 35–50%), what must happen for it to occur, what could prevent it.

Scenario A — Organic / fan-driven growth
Scenario B — Editorial / playlist placement
Scenario C — Viral breakout or sync placement

If Spotify popularity data is present, anchor the probability bands to the current score. End with: What is the audience ceiling? Is this niche-dominant or broad-scale, and what evidence supports that?

## 11. RISK FACTORS
List specific risks as a direct bulleted list. No softening. Cover: structural risks, hook weakness if present, saturation and genre fatigue, distinguishability ceiling, production risks, market timing risks. Every song has risks. Name them.`,

  4: `You are Ducer — a music intelligence engine. Label strategy memo only. No generic praise. Every claim specific and explained.

CORE DOCTRINE:
- Polish and breakthrough identity are not the same thing. Name which this is.
- Scores must reflect honest assessment, not encouragement. A 6 means something. A 9 means something different.
- The verdict must answer: what kind of leverage is this song trying to create, and does it succeed?
- The single most important action must be genuinely actionable — not "improve your mix" but specifically what and why.
- If Spotify data is present, the verdict must acknowledge the current market position as hard evidence, not speculation.

AUDIO DATA:
{audioInfo}

Produce section 12. Use exactly this header:

## 12. THE VERDICT

**Scores (out of 10 — be honest and critical):**
- File Quality: X/10
- Sound & Production: X/10
- Craft & Composition: X/10
- Market Positioning: X/10
- **Overall Ducer Score: X/10**

**Written Verdict:** 4–6 sentences. State where this record stands, what lane it is competing in, what its real ceiling is, whether it has breakthrough identity or polish without inevitability, and what the single most important gap is. Be direct. No softening.

**Ducer Improvement Priority:** One specific, immediately actionable recommendation. Name what to change, why it matters, and what outcome to expect. Something the artist can act on this week.`
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { audioInfo, question, batch, audioBase64 } = body

    const promptTemplate = BATCH_PROMPTS[batch]
    if (!promptTemplate) {
      return Response.json({ error: 'Invalid batch' }, { status: 400 })
    }

    // Extract title and artist from audioInfo (from ID3 tags or prior AudD result)
    const titleMatch = audioInfo.match(/Title:\s*(.+)/i)
    const artistMatch = audioInfo.match(/Artist:\s*(.+)/i)
    let title = titleMatch?.[1]?.trim()
    let artist = artistMatch?.[1]?.trim()

    // Only run AudD on batch 1 (no need to fingerprint 4 times)
    let auddResult = null
    if (batch === 1 && audioBase64) {
      auddResult = await getAuddDataFromBase64(audioBase64)
      // If AudD identified the track, prefer its title/artist for Spotify lookup
      if (auddResult?.title) title = auddResult.title
      if (auddResult?.artist) artist = auddResult.artist
    }

    // Spotify lookup using best available title/artist
    const spotifyData = await getSpotifyData(title, artist)

    const enrichedAudio = buildEnrichedAudioInfo(audioInfo, auddResult, spotifyData)

    const prompt = promptTemplate
      .replace('{audioInfo}', enrichedAudio)
      .replace('{question}', question || 'Give me a full analysis')

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}