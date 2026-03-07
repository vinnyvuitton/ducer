import { Resend } from 'resend'

export async function POST(request) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { name, email, filename, report } = await request.json()

    if (!name || !email || !report) {
      return Response.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    const subject = filename
      ? `Your Ducer report for ${filename}`
      : 'Your Ducer report'

    // Parse the raw report text into structured sections for clean HTML rendering
    const cleanReport = sanitizeReport(report)
    const sections = parseSections(cleanReport)
    const year = new Date().getFullYear()

    const html = buildEmailHtml({ name, filename, sections, year })

    const { data, error } = await resend.emails.send({
      from: 'Ducer <reports@ducer.app>',
      to: [email],
      bcc: ['vinny.olsauskas@gmail.com'],
      replyTo: 'reports@ducer.app',
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return Response.json({ error: error.message || 'Email failed to send.' }, { status: 500 })
    }

    return Response.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('Send report error:', error)
    return Response.json(
      { error: error.message || 'Something went wrong sending the email.' },
      { status: 500 }
    )
  }
}

// Remove em dashes, standalone --- lines, markdown bold, excessive whitespace
function sanitizeReport(text = '') {
  return text
    .replace(/\u2014/g, '-')     // em dash to hyphen
    .replace(/--/g, '-')         // double hyphen cleanup
    .replace(/\n-{3,}\n/g, '\n') // remove standalone --- dividers
    .replace(/\*\*/g, '')        // remove markdown bold
    .replace(/\n{3,}/g, '\n\n') // max two consecutive newlines
}

// Split report into numbered sections: { id, label, content }
function parseSections(text = '') {
  const sectionRegex = /##\s*(\d+)[.\s]+([^\n]+)\n([\s\S]*?)(?=##\s*\d+[.\s]|$)/g
  const sections = []
  let match
  while ((match = sectionRegex.exec(text)) !== null) {
    const id = parseInt(match[1])
    const label = match[2].trim()
    const content = match[3].trim()
    if (content) sections.push({ id, label, content })
  }
  return sections
}

function buildEmailHtml({ name, filename, sections, year }) {
  const sectionHtml = sections.map(({ id, label, content }) => {
    const isVerdict = id === 12

    // Parse scores out of verdict section
    let verdictScores = null
    if (isVerdict) {
      const fileMatch = content.match(/File[:\s]+(\d+)/i)
      const soundMatch = content.match(/Sound[:\s]+(\d+)/i)
      const craftMatch = content.match(/Craft[:\s]+(\d+)/i)
      const marketMatch = content.match(/Market[:\s]+(\d+)/i)
      const overallMatch = content.match(/Overall[^:]*:[^\d]*(\d+(?:\.\d+)?)/i)
      if (fileMatch && soundMatch && craftMatch && marketMatch) {
        verdictScores = {
          file: fileMatch[1],
          sound: soundMatch[1],
          craft: craftMatch[1],
          market: marketMatch[1],
          overall: overallMatch ? overallMatch[1] : null,
        }
      }
    }

    const paragraphs = content
      .split('\n')
      .filter(l => {
        const t = l.trim()
        return t && !/^-{2,}$/.test(t)
      })
      .map(l => {
        const t = l.trim()
        // Bold sub-labels (lines ending in colon or starting with a keyword pattern)
        if (/^[A-Z][^a-z]{0,30}:/.test(t)) {
          const [head, ...rest] = t.split(':')
          return `<p style="margin:0 0 10px;color:#cccccc;font-size:13px;line-height:1.7;"><strong style="color:#ffffff;">${escapeHtml(head)}:</strong>${escapeHtml(rest.join(':'))}</p>`
        }
        return `<p style="margin:0 0 10px;color:#cccccc;font-size:13px;line-height:1.7;">${escapeHtml(t)}</p>`
      })
      .join('')

    const scoresHtml = verdictScores ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        <tr>
          ${['File', 'Sound', 'Craft', 'Market'].map(cat => `
          <td width="25%" style="padding:0 4px 0 0;text-align:center;">
            <div style="background:#111111;padding:16px 8px;border:1px solid #1f1f1f;">
              <div style="font-family:monospace;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#555555;margin-bottom:8px;">${cat}</div>
              <div style="font-size:32px;font-weight:900;color:#c8ff00;line-height:1;">${verdictScores[cat.toLowerCase()]}<span style="font-size:14px;color:#333;">/10</span></div>
            </div>
          </td>`).join('')}
        </tr>
      </table>
      ${verdictScores.overall ? `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px 16px;background:#111111;border:1px solid #1f1f1f;">
        <span style="font-family:monospace;font-size:10px;letter-spacing:0.15em;color:#555;text-transform:uppercase;white-space:nowrap;">Overall Score</span>
        <div style="flex:1;height:2px;background:#1a1a1a;">
          <div style="height:2px;background:#c8ff00;width:${parseFloat(verdictScores.overall) * 10}%;"></div>
        </div>
        <span style="font-size:24px;font-weight:900;color:#c8ff00;">${verdictScores.overall}</span>
      </div>` : ''}
    ` : ''

    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:2px;border:1px solid ${isVerdict ? '#c8ff00' : '#1f1f1f'};background-color:${isVerdict ? '#0d1100' : '#0f0f0f'};" bgcolor="${isVerdict ? '#0d1100' : '#0f0f0f'}">
      <tr>
        <td bgcolor="${isVerdict ? '#0a0d00' : '#0c0c0c'}" style="background-color:${isVerdict ? '#0a0d00' : '#0c0c0c'};padding:12px 18px;border-bottom:1px solid ${isVerdict ? 'rgba(200,255,0,0.2)' : '#1a1a1a'};">
          <span style="font-family:monospace;font-size:9px;color:#333333;letter-spacing:0.15em;margin-right:14px;">${String(id).padStart(2, '0')}</span>
          <span style="font-family:monospace;font-size:10px;letter-spacing:0.2em;color:${isVerdict ? '#c8ff00' : '#555555'};text-transform:uppercase;">${escapeHtml(label)}</span>
        </td>
      </tr>
      <tr>
        <td bgcolor="${isVerdict ? '#0d1100' : '#0f0f0f'}" style="background-color:${isVerdict ? '#0d1100' : '#0f0f0f'};padding:18px;">
          ${scoresHtml}
          ${paragraphs}
        </td>
      </tr>
    </table>`
  }).join('')

  return `
<!DOCTYPE html>
<html lang="en" style="background-color:#080808;">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ducer Report</title>
  <style>
    body { background-color: #080808 !important; margin: 0 !important; padding: 0 !important; }
    .outer { background-color: #080808 !important; }
    .inner { background-color: #080808 !important; }
    .sec-header-verdict { background-color: #0a0d00 !important; }
    .sec-header { background-color: #0c0c0c !important; }
    .sec-body-verdict { background-color: #0d1100 !important; }
    .sec-body { background-color: #0f0f0f !important; }
    div, td, p, span, h1, table { color-scheme: dark only; }
  </style>
</head>
<body class="outer" style="margin:0;padding:0;background-color:#080808 !important;font-family:Arial,Helvetica,sans-serif;color:#e8e8e8;">
  <table class="outer" width="100%" cellpadding="0" cellspacing="0" bgcolor="#080808" style="background-color:#080808 !important;padding:40px 20px;">
    <tr>
      <td align="center" bgcolor="#080808" class="outer" style="background-color:#080808 !important;">
        <table class="inner" width="100%" style="max-width:680px;background-color:#080808 !important;" cellpadding="0" cellspacing="0" bgcolor="#080808">

          <!-- Header -->
          <tr>
            <td bgcolor="#080808" class="inner" style="background-color:#080808 !important;padding-bottom:32px;border-bottom:2px solid #1a1a1a;">
              <p style="margin:0 0 4px;font-family:monospace;font-size:9px;letter-spacing:0.3em;color:#555555;text-transform:uppercase;">Music Intelligence Report</p>
              <h1 style="margin:0;font-size:48px;font-weight:900;letter-spacing:-2px;color:#e8e8e8;line-height:1;">DUCER</h1>
              ${filename ? `<p style="margin:6px 0 0;font-family:monospace;font-size:11px;color:#555555;">${escapeHtml(filename)}</p>` : ''}
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td bgcolor="#080808" class="inner" style="background-color:#080808 !important;padding:28px 0 24px;">
              <p style="margin:0 0 10px;font-size:14px;color:#aaaaaa;line-height:1.6;">Hey ${escapeHtml(name)},</p>
              <p style="margin:0;font-size:14px;color:#aaaaaa;line-height:1.6;">Your full Ducer intelligence report is below${filename ? ` for <strong style="color:#e8e8e8;">${escapeHtml(filename)}</strong>` : ''}. This is your track. No filter.</p>
            </td>
          </tr>

          <!-- Report Sections -->
          <tr>
            <td bgcolor="#080808" class="inner" style="background-color:#080808 !important;">
              ${sectionHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#080808" class="inner" style="background-color:#080808 !important;padding-top:40px;border-top:1px solid #222222;text-align:center;">
              <p style="margin:0 0 4px;font-family:monospace;font-size:16px;font-weight:900;letter-spacing:-0.5px;color:#e8e8e8;">DUCER</p>
              <p style="margin:0;font-family:monospace;font-size:9px;letter-spacing:0.2em;color:#444444;text-transform:uppercase;">Music Intelligence &copy; ${year}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}