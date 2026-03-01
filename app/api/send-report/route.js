import { Resend } from 'resend'

export async function POST(request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { name, email, filename, report } = await request.json()

    await resend.emails.send({
      from: 'Ducer <reports@ducer.app>',
      to: email,
      bcc: 'vinny.olsauskas@gmail.com',
      subject: `Your Ducer Report — ${filename}`,
      html: `
        <div style="background:#0a0a0a;color:#ffffff;font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;">
          <p style="font-size:11px;letter-spacing:0.3em;color:#666;text-transform:uppercase;margin-bottom:8px;">Music Analysis</p>
          <h1 style="font-size:48px;font-weight:900;letter-spacing:-2px;margin:0 0 4px 0;">DUCER</h1>
          <p style="color:#666;font-size:13px;margin:0 0 40px 0;">${filename}</p>
          <hr style="border:none;border-top:1px solid #222;margin-bottom:40px;" />
          <p style="color:#999;font-size:14px;margin-bottom:32px;">Hey ${name}, here's your full analysis report.</p>
          <div style="color:#ccc;font-size:14px;line-height:1.8;white-space:pre-wrap;">${report}</div>
          <hr style="border:none;border-top:1px solid #222;margin:40px 0;" />
          <p style="color:#444;font-size:12px;">Ducer — ducer.app</p>
        </div>
      `
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}