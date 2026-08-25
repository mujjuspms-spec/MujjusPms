import nodemailer from 'nodemailer';

let transporterPromise = null;
let usingRealSmtp = false;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  if (process.env.SMTP_HOST) {
    usingRealSmtp = true;
    transporterPromise = Promise.resolve(nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    }));
    return transporterPromise;
  }

  // No real SMTP configured — use an Ethereal test inbox so the send pipeline
  // is genuinely exercised end-to-end. Swap in SMTP_HOST/PORT/USER/PASS env
  // vars to deliver to real inboxes.
  usingRealSmtp = false;
  transporterPromise = nodemailer.createTestAccount().then((acct) =>
    nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: acct.user, pass: acct.pass },
    })
  );
  return transporterPromise;
}

export async function sendMail({ to, subject, html }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from: 'MujuzPM <notifications@mujuzpm.com>', to, subject, html });
  const previewUrl = usingRealSmtp ? null : nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log(`[mailer] preview: ${previewUrl}`);
  return { previewUrl, delivered: usingRealSmtp };
}
