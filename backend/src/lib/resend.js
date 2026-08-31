async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn('Missing Resend configuration. Email not sent.');
    return { sent: false };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `MujuzPM <${fromEmail}>`,
        to,
        subject,
        html
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

      console.error(`[resend] Failed to send email to ${to}.`);
      if (isVerifiedSenderIssue) {
         console.error(`[resend] ERROR: Resend rejected the sender identity (${fromEmail}). You must use a verified domain for RESEND_FROM_EMAIL. You cannot send emails from arbitrary domains unless verified in your Resend dashboard.`);
      } else {
         console.error(`[resend] Error details: Status ${res.status} - ${errorText}`);
      }
      return { sent: false };
    }

    console.log(`[resend] Email sent to ${to}: ${subject}`);
    return { sent: true };
  } catch (e) {
    console.error('Error sending Resend email:', e);
    return { sent: false };
  }
}

export async function sendAdminApprovalNotification(user) {
  const adminEmail = process.env.ADMIN_APPROVAL_EMAIL;
  if (!adminEmail) {
    console.warn('Missing ADMIN_APPROVAL_EMAIL. Approval notification not sent.');
    return { sent: false };
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

  return sendEmail({ to: adminEmail, subject: 'Action Required: New MujuzPM Registration', html });
}

// Case A — an email that already has a MujuzPM account. No account/password
// is created here; they accept from their existing account (in-app
// notification is sent alongside this by the caller — see notify.js).
export async function sendExistingUserInviteEmail({ to, inviterName, workspaceName, projectName, role }) {
  const target = projectName ? `the "${projectName}" project` : `the "${workspaceName}" workspace`;
  const html = `
    <h2>You've been invited</h2>
    <p>${inviterName} invited you to join ${target} in the ${workspaceName} workspace on MujuzPM, as <strong>${role}</strong>.</p>
    <p>Log in to MujuzPM to accept or decline this invitation — you'll find it under the notification bell.</p>
  `;
  return sendEmail({ to, subject: `You've been invited to ${projectName || workspaceName} on MujuzPM`, html });
}

// Case B — a brand-new email with no MujuzPM account yet. Links to a
// tokenized signup URL; no account or password is created until they
// complete signup themselves.
export async function sendNewUserSignupInviteEmail({ to, inviterName, workspaceName, projectName, role, token, origin }) {
  const link = `${origin}/signup?invite=${encodeURIComponent(token)}`;
  const target = projectName ? `the "${projectName}" project` : `the "${workspaceName}" workspace`;
  const html = `
    <h2>You're invited to MujuzPM</h2>
    <p>${inviterName} has invited you to join ${target} in the ${workspaceName} workspace on MujuzPM, as <strong>${role}</strong>.</p>
    <p>Create your MujuzPM account to accept the invitation:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link expires in 7 days.</p>
  `;
  return sendEmail({ to, subject: `You're invited to join ${projectName || workspaceName} on MujuzPM`, html });
}
