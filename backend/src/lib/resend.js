export async function sendAdminApprovalNotification(user) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_APPROVAL_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !adminEmail || !fromEmail) {
    console.warn('Missing Resend configuration. Approval notification not sent.');
    return;
  }

  const html = `
    <h2>New Registration Pending Approval</h2>
    <p>A new user has registered for MujuzPM and is awaiting your approval.</p>
    <ul>
      <li><strong>Name:</strong> ${user.name}</li>
      <li><strong>Email:</strong> ${user.email}</li>
      <li><strong>Registration Date:</strong> ${new Date().toLocaleString()}</li>
      <li><strong>Status:</strong> PENDING</li>
    </ul>
    <p>Please log in to the MujuzPM admin dashboard to approve or reject this user.</p>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `MujuzPM <${fromEmail}>`,
        to: adminEmail,
        subject: 'Action Required: New MujuzPM Registration',
        html: html
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      let isVerifiedSenderIssue = false;
      try {
        const errJson = JSON.parse(errorText);
        // Resend typically returns validation errors if the domain isn't verified
        if (errJson.statusCode === 403 || errorText.includes('verified')) {
          isVerifiedSenderIssue = true;
        }
      } catch (e) {}

      console.error(`[resend] Failed to send Admin approval notification to ${adminEmail}.`);
      if (isVerifiedSenderIssue) {
         console.error(`[resend] ERROR: Resend rejected the sender identity (${fromEmail}). You must use a verified domain for RESEND_FROM_EMAIL. You cannot send emails from arbitrary domains unless verified in your Resend dashboard.`);
      } else {
         console.error(`[resend] Error details: Status ${res.status} - ${errorText}`);
      }
    } else {
      console.log(`[resend] Admin approval notification sent for ${user.email}`);
    }
  } catch (e) {
    console.error('Error sending Resend notification:', e);
  }
}
