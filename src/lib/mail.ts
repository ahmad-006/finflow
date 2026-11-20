import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER || "inform.finflow@gmail.com";
const smtpPass = process.env.SMTP_PASS || "dlsxvzkgsbaykqdt";
const smtpFrom = process.env.SMTP_FROM || `FinFlow <${smtpUser}>`;

export const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const sentEmailsLog: SendMailOptions[] = [];

export async function sendEmail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  sentEmailsLog.push(options);

  const isTestRecipient =
    options.to.endsWith(".test") ||
    options.to.includes("audit.test") ||
    options.to.includes("test.pk") ||
    options.to.includes("example.com") ||
    options.to.includes("localhost") ||
    options.to.includes("finflow.test");

  const isEmailEnabled = process.env.ENABLE_EMAIL === "true";

  // Suppress actual SMTP dispatch to avoid mailbox bounce flooding during tests and local development
  if (!isEmailEnabled || isTestRecipient) {
    console.log(`[Mail Suppressed]: Email to ${options.to} not dispatched via SMTP ("${options.subject}")`);
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  try {
    const info = await mailTransporter.sendMail({
      from: smtpFrom,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send email via SMTP";
    console.error("[SMTP Mailer Error]:", message);
    return { success: false, error: message };
  }
}

/**
 * Inkline v3 Email Template Wrapper: Clean monochromatic styling, 1px borders, zero shadows.
 */
function wrapInklineEmail(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0D1B2A;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB;">
    <tr>
      <td style="padding: 24px 32px; border-bottom: 1px solid #E5E7EB;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            <td>
              <span style="font-size: 16px; font-weight: 700; letter-spacing: -0.02em; color: #0D1B2A; text-transform: uppercase;">FINFLOW</span>
              <span style="font-size: 11px; font-weight: 500; letter-spacing: 0.05em; color: #6B7280; margin-left: 8px;">INTELLIGENCE</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        ${contentHtml}
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #F8F9FA; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; line-height: 1.5;">
        This is an automated communication from FinFlow Cash Flow Intelligence. If you did not request this, you can safely ignore this message.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends Signup Email Verification 6-digit OTP
 */
export async function sendSignupOtpEmail(email: string, otp: string): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #0D1B2A; letter-spacing: -0.02em;">Verify your email address</h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #4B5563; line-height: 1.6;">
      Thank you for registering with FinFlow. Enter the following 6-digit verification code to activate your business cash flow cockpit:
    </p>
    <div style="margin: 24px 0; padding: 18px 24px; background-color: #F8F9FA; border: 1px solid #E5E7EB; text-align: center;">
      <span style="font-family: monospace, Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0D1B2A;">${otp}</span>
    </div>
    <p style="margin: 0 0 8px 0; font-size: 13px; color: #6B7280;">
      This verification code expires in 15 minutes. For security, never share this code with anyone.
    </p>
  `;

  const text = `FinFlow Email Verification\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 15 minutes.\nIf you did not create a FinFlow account, please ignore this email.`;

  const res = await sendEmail({
    to: email,
    subject: `FinFlow Verification Code: ${otp}`,
    html: wrapInklineEmail("Verify Your Email", content),
    text,
  });

  return res.success;
}

/**
 * Sends Password Reset 6-digit OTP & Secure Link
 */
export async function sendPasswordResetEmail(email: string, otp: string, resetUrl: string): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #0D1B2A; letter-spacing: -0.02em;">Reset your password</h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #4B5563; line-height: 1.6;">
      We received a request to reset your FinFlow account password. Enter the 6-digit code below on the password reset page or click the direct button:
    </p>
    <div style="margin: 24px 0; padding: 18px 24px; background-color: #F8F9FA; border: 1px solid #E5E7EB; text-align: center;">
      <span style="font-family: monospace, Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0D1B2A;">${otp}</span>
    </div>
    <div style="margin: 28px 0; text-align: center;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #0D1B2A; color: #FFFFFF; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 0;">Reset Password Directly</a>
    </div>
    <p style="margin: 0; font-size: 13px; color: #6B7280;">
      This code and link will expire in 15 minutes. If you did not request a password reset, no action is required and your account remains secure.
    </p>
  `;

  const text = `FinFlow Password Reset\n\nYour 6-digit reset code is: ${otp}\n\nOr use this link: ${resetUrl}\n\nThis code expires in 15 minutes.`;

  const res = await sendEmail({
    to: email,
    subject: `FinFlow Password Reset: ${otp}`,
    html: wrapInklineEmail("Reset Your Password", content),
    text,
  });

  return res.success;
}

/**
 * Sends Client Payment Reminder Email (Phase 8: Domain 8)
 */
export async function sendInvoiceReminderEmail(params: {
  clientEmail: string;
  clientName: string;
  companyName: string;
  invoiceNumber: string;
  amountFormatted: string;
  dueDateFormatted: string;
  isOverdue: boolean;
  publicPayUrl: string;
}): Promise<boolean> {
  const urgencyTitle = params.isOverdue ? "Payment Overdue Notice" : "Upcoming Invoice Reminder";
  const urgencyColor = params.isOverdue ? "#DC2626" : "#0D1B2A";

  const content = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: ${urgencyColor}; letter-spacing: -0.02em;">${urgencyTitle}</h2>
    <p style="margin: 0 0 18px 0; font-size: 14px; color: #4B5563; line-height: 1.6;">
      Dear ${params.clientName},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #4B5563; line-height: 1.6;">
      ${params.isOverdue
        ? `This is a reminder that invoice <strong>${params.invoiceNumber}</strong> from <strong>${params.companyName}</strong> was due on <strong>${params.dueDateFormatted}</strong> and is currently outstanding.`
        : `This is a friendly reminder that invoice <strong>${params.invoiceNumber}</strong> from <strong>${params.companyName}</strong> is scheduled for payment on <strong>${params.dueDateFormatted}</strong>.`}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin: 20px 0; border: 1px solid #E5E7EB; border-collapse: collapse;">
      <tr style="background-color: #F8F9FA;">
        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #6B7280; border-bottom: 1px solid #E5E7EB;">Invoice #</td>
        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0D1B2A; border-bottom: 1px solid #E5E7EB; text-align: right;">${params.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #6B7280; border-bottom: 1px solid #E5E7EB;">Due Date</td>
        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0D1B2A; border-bottom: 1px solid #E5E7EB; text-align: right;">${params.dueDateFormatted}</td>
      </tr>
      <tr style="background-color: #F8F9FA;">
        <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0D1B2A;">Total Balance Due</td>
        <td style="padding: 12px 16px; font-size: 16px; font-weight: 700; color: #0D1B2A; text-align: right;">${params.amountFormatted}</td>
      </tr>
    </table>
    <div style="margin: 28px 0; text-align: center;">
      <a href="${params.publicPayUrl}" style="display: inline-block; background-color: #0D1B2A; color: #FFFFFF; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 0;">View & Settle Invoice Online</a>
    </div>
    <p style="margin: 0; font-size: 13px; color: #6B7280; line-height: 1.5;">
      If you have already processed this payment, please disregard this notice or contact ${params.companyName}.
    </p>
  `;

  const text = `${urgencyTitle}\n\nInvoice: ${params.invoiceNumber}\nAmount: ${params.amountFormatted}\nDue: ${params.dueDateFormatted}\n\nView online: ${params.publicPayUrl}`;

  const res = await sendEmail({
    to: params.clientEmail,
    subject: `${params.isOverdue ? "[OVERDUE] " : ""}Invoice ${params.invoiceNumber} from ${params.companyName}`,
    html: wrapInklineEmail(urgencyTitle, content),
    text,
  });

  return res.success;
}
