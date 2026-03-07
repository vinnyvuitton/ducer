import { Resend } from 'resend'

export async function POST(request) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { message, filename, timestamp } = await request.json()

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:32px;background:#080808;font-family:monospace;color:#e8e8e8;">
  <h2 style="margin:0 0 24px;font-size:20px;font-weight:900;color:#ff4444;letter-spacing:-0.5px;">DUCER ERROR ALERT</h2>
  <table cellpadding="0" cellspacing="0" style="border:1px solid #2a0000;background:#120000;padding:20px;width:100%;max-width:560px;">
    <tr><td style="padding-bottom:12px;">
      <span style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#555;">Time</span><br/>
      <span style="font-size:13px;color:#e8e8e8;">${escapeHtml(timestamp || new Date().toISOString())}</span>
    </td></tr>
    <tr><td style="padding-bottom:12px;">
      <span style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#555;">File</span><br/>
      <span style="font-size:13px;color:#e8e8e8;">${escapeHtml(filename || 'unknown')}</span>
    </td></tr>
    <tr><td>
      <span style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#555;">Error</span><br/>
      <span style="font-size:13px;color:#ff6666;">${escapeHtml(message || 'Unknown error')}</span>
    </td></tr>
  </table>
  <p style="margin:20px 0 0;font-size:10px;color:#333;letter-spacing:0.1em;">DUCER &copy; ${new Date().getFullYear()}</p>
</body>
</html>`

    await resend.emails.send({
      from: 'Ducer Alerts <reports@ducer.app>',
      to: ['vinny.olsauskas@gmail.com'],
      replyTo: 'reports@ducer.app',
      subject: `[DUCER ALERT] Error${filename ? ` on ${filename}` : ''} - ${new Date().toLocaleString()}`,
      html,
    })

    return Response.json({ success: true })
  } catch (err) {
    // Fail silently - don't let alert errors surface to users
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