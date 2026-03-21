/**
 * Email Receipt Service
 * Sends receipt emails via Resend or Brevo API
 */

import type { EmailReceiptData, IntegrationConfig } from "./types";

/**
 * Generate HTML receipt email
 */
function generateReceiptHTML(data: EmailReceiptData): string {
  const itemRows = data.items.map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${item.qty}x ${item.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">${item.unitPrice} kr</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${item.total} kr</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:500px;margin:0 auto;padding:24px">
        <!-- Header -->
        <div style="background:#2d6b5a;border-radius:16px 16px 0 0;padding:28px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">${data.storeName}</h1>
          <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px">Kvitto</p>
        </div>

        <!-- Body -->
        <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
          <!-- Receipt info -->
          <div style="display:flex;justify-content:space-between;margin-bottom:20px;border-bottom:2px dashed #e5e7eb;padding-bottom:16px">
            <div>
              <p style="margin:0;font-size:13px;color:#6b7c74">Kvittonummer</p>
              <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#2c3e35">${data.receiptNumber}</p>
            </div>
            <div style="text-align:right">
              <p style="margin:0;font-size:13px;color:#6b7c74">Datum</p>
              <p style="margin:4px 0 0;font-size:14px;color:#2c3e35">${data.date} ${data.time}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7c74">${data.paymentMethod}</p>
            </div>
          </div>

          <!-- Items -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px 0;font-size:12px;color:#6b7c74;text-transform:uppercase;border-bottom:1px solid #e5e7eb">Artikel</th>
                <th style="text-align:right;padding:8px 0;font-size:12px;color:#6b7c74;text-transform:uppercase;border-bottom:1px solid #e5e7eb">Styckpris</th>
                <th style="text-align:right;padding:8px 0;font-size:12px;color:#6b7c74;text-transform:uppercase;border-bottom:1px solid #e5e7eb">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <!-- Total -->
          <div style="background:#f0f7f4;border-radius:10px;padding:16px;text-align:center;margin-bottom:20px">
            <p style="margin:0;font-size:14px;color:#6b7c74">TOTALT</p>
            <p style="margin:4px 0 0;font-size:32px;font-weight:700;color:#2d6b5a">${data.total} kr</p>
          </div>

          <!-- Thank you -->
          ${data.thankYouMessage ? `<p style="text-align:center;color:#6b7c74;font-style:italic;margin:16px 0">${data.thankYouMessage}</p>` : ""}
          ${data.footer ? `<p style="text-align:center;color:#8a9b93;font-size:12px;margin-top:12px">${data.footer}</p>` : ""}
        </div>

        <!-- Footer -->
        <p style="text-align:center;color:#8a9b93;font-size:11px;margin-top:16px">
          Skickat från ${data.storeName} via Corevo
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send receipt email via Resend API
 */
async function sendViaResend(config: IntegrationConfig, data: EmailReceiptData): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${config.fromName || data.storeName} <${config.fromEmail}>`,
        to: [data.to],
        subject: `Kvitto ${data.receiptNumber} — ${data.storeName}`,
        html: generateReceiptHTML(data),
      }),
    });
    return response.ok;
  } catch (err) {
    console.error("[Email] Resend error:", err);
    return false;
  }
}

/**
 * Send receipt email via Brevo (Sendinblue) API
 */
async function sendViaBrevo(config: IntegrationConfig, data: EmailReceiptData): Promise<boolean> {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": String(config.apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: String(config.fromName || data.storeName), email: String(config.fromEmail) },
        to: [{ email: data.to }],
        subject: `Kvitto ${data.receiptNumber} — ${data.storeName}`,
        htmlContent: generateReceiptHTML(data),
      }),
    });
    return response.ok;
  } catch (err) {
    console.error("[Email] Brevo error:", err);
    return false;
  }
}

/**
 * Send receipt email using configured provider
 */
export async function sendReceiptEmail(
  config: IntegrationConfig,
  data: EmailReceiptData
): Promise<boolean> {
  const provider = config.provider;
  if (provider === "resend") return sendViaResend(config, data);
  if (provider === "brevo") return sendViaBrevo(config, data);
  console.error("[Email] Unknown provider:", provider);
  return false;
}

/**
 * Generate receipt HTML (exported for preview)
 */
export { generateReceiptHTML };
