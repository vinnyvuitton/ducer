import { Resend } from 'resend'

export async function POST(request) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const {
      message, errorType, stack, filename, timestamp,
      activeSection, sectionsCompleted, sectionsVisible,
      userAgent, note
    } = await request.json()

    const row = (label, value, color = '#e8e8e8') => `
    <tr><td style="padding-bottom:14px;vertical-align:top;">
      <span style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#555;">${label}</span><br/>
      <span style="font-size:13px;color:${color};line-height:1.5;">${escapeHtml(String(value || 'unknown'))}</span>
    </td></tr>`

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:32px;background:#080808;font-family:monospace;color:#e8e8e8;">
  <h2 style="margin:0 0 6px;font-size:20px;font-weight:900;color:#ff4444;letter-spacing:-0.5px;">DUCER ERROR ALERT</h2>
  <p style="margin:0 0 24px;font-size:11px;color:#555;">${escapeHtml(timestamp || new Date().toISOString())}</p>

  <table cellpadding="0" cellspacing="0" style="border:1px solid #2a0000;background:#120000;padding:20px;width:100%;max-width:600px;margin-bottom:16px;">
    ${row('Likely Cause', note || 'Unknown', '#ffaa44')}
    ${row('Error Type', errorType || 'Error', '#ff6666')}
    ${row('Error Message', message || 'Unknown error', '#ff6666')}
    ${row('File', filename || 'unknown')}
    ${row('Active Section', activeSection ? `Section ${activeSection}` : 'Pre-analysis')}
    ${row('Progress', `${sectionsCompleted || 0} sections completed, ${sectionsVisible || 0} visible`)}
    ${row('Browser', userAgent || 'unknown')}
  </table>

  <table cellpadding="0" cellspacing="0" style="border:1px solid #1a1a1a;background:#0a0a0a;padding:20px;width:100%;max-width:600px;">
    <tr><td>
      <span style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#555;">Stack Trace</span><br/>
      <pre style="font-size:11px;color:#555;margin:8px 0 0;white-space:pre-wrap;line-height:1.6;">${escapeHtml(stack || 'No stack available')}</pre>
    </td></tr>
  </table>

  <p style="margin:20px 0 0;font-size:10px;color:#333;letter-spacing:0.1em;">DUCER &copy; ${new Date().getFullYear()}</p>
</body>
</html>`

    await resend.emails.send({
      from: 'Ducer Alerts <reports@ducer.app>',
      to: ['vinny.olsauskas@gmail.com'],
      replyTo: 'reports@ducer.app',
      subject: `[DUCER ALERT] ${errorType || 'Error'} on ${filename || 'unknown'} — Section ${activeSection || 0}`,
      html,
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error('Alert error failed:', err)
    return Response.json({ success: false })
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}