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

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <p>Hey ${name},</p>
        <p>Here's your Ducer report${filename ? ` for <strong>${filename}</strong>` : ''}.</p>
        <hr style="margin: 24px 0;" />
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${escapeHtml(report)}</pre>
      </div>
    `

    const { data, error } = await resend.emails.send({
      from: 'Ducer <reports@ducer.app>',
      to: [email],
      bcc: ['vinny.olsauskas@gmail.com'],
      subject,
      html,
      replyTo: 'vinny.olsauskas@gmail.com',
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

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}