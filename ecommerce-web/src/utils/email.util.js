// src/utils/email.util.js
// Install: npm install nodemailer
// Add to .env: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, CLIENT_URL

import nodemailer from "nodemailer";

// ─── Transporter ──────────────────────────────────────────────────────────────
// Works with Gmail, Outlook, SendGrid SMTP, Mailtrap (dev), etc.
// For Gmail: use an App Password (not your account password)
//   Google Account → Security → 2FA on → App Passwords → generate one
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST   || "smtp.gmail.com",
  port:   parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_PORT === "465", // true only for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }
});

// ─── Send OTP Email ───────────────────────────────────────────────────────────
export const sendPasswordResetOTP = async (toEmail, otp) => {
  const appName = process.env.APP_NAME || "MyEcommerceWebApp";
  const from    = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  console.log(process.env.EMAIL_USER)

  const mailOptions = {
    from:    `"${appName}" <${from}>`,
    to:      toEmail,
    subject: `Your Password Reset Code — ${appName}`,
    // Plain text fallback
    text: `Your password reset code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please ignore this email.`,
    // HTML version
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background:#111827;padding:32px;text-align:center;">
                    <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                      ${appName}
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:40px 32px;">
                    <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">
                      Password Reset Request
                    </p>
                    <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
                      We received a request to reset your password. Use the code below to continue.
                      It expires in <strong style="color:#111827;">15 minutes</strong>.
                    </p>

                    <!-- OTP Box -->
                    <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
                      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;">
                        Your Reset Code
                      </p>
                      <p style="margin:0;font-size:42px;font-weight:800;color:#111827;letter-spacing:10px;font-variant-numeric:tabular-nums;">
                        ${otp}
                      </p>
                    </div>

                    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                      If you didn't request a password reset, you can safely ignore this email.
                      Your password will not be changed.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      © ${new Date().getFullYear()} ${appName}. This is an automated message.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// ─── Verify transporter (call once on server start, optional) ─────────────────
export const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email transporter ready");
  } catch (err) {
    console.error("❌ Email transporter config error:", err.message);
  }
};