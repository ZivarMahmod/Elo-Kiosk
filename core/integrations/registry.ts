/**
 * Integration Registry — manages available integrations
 * Admin can enable/disable integrations from settings
 */

import type { Integration } from "./types";

export const INTEGRATIONS: Integration[] = [
  {
    id: "email-receipts",
    name: "Email-kvitton",
    description: "Skicka kvitton till kunder via email (Resend/Brevo)",
    icon: "mail-outline",
    category: "communication",
    enabled: false,
    configured: false,
    configFields: [
      { key: "provider", label: "Leverantör", type: "select", required: true, options: [
        { label: "Resend", value: "resend" },
        { label: "Brevo (Sendinblue)", value: "brevo" },
      ]},
      { key: "apiKey", label: "API-nyckel", type: "password", required: true, placeholder: "re_..." },
      { key: "fromEmail", label: "Avsändaradress", type: "email", required: true, placeholder: "kvitto@dinbutik.se" },
      { key: "fromName", label: "Avsändarnamn", type: "text", placeholder: "Elo Kiosk" },
    ],
  },
  {
    id: "swish-api",
    name: "Swish Commerce API",
    description: "Automatisk betalningsverifiering via Swish API",
    icon: "phone-portrait-outline",
    category: "payment",
    enabled: false,
    configured: false,
    configFields: [
      { key: "merchantId", label: "Merchant-ID", type: "text", required: true },
      { key: "certPath", label: "Certifikatsökväg", type: "text", required: true },
      { key: "callbackUrl", label: "Callback URL", type: "url", placeholder: "https://..." },
      { key: "testMode", label: "Testläge", type: "toggle" },
    ],
  },
  {
    id: "webhook",
    name: "Webhooks",
    description: "Skicka händelser till externa system (ny order, retur, etc.)",
    icon: "code-outline",
    category: "other",
    enabled: false,
    configured: false,
    configFields: [
      { key: "url", label: "Webhook URL", type: "url", required: true, placeholder: "https://..." },
      { key: "secret", label: "Hemlig nyckel", type: "password", placeholder: "whsec_..." },
      { key: "events", label: "Händelser", type: "select", options: [
        { label: "Alla händelser", value: "all" },
        { label: "Nya ordrar", value: "order.created" },
        { label: "Returer", value: "order.returned" },
      ]},
    ],
  },
  {
    id: "analytics",
    name: "Google Analytics",
    description: "Spåra försäljning och kundbeteende",
    icon: "analytics-outline",
    category: "analytics",
    enabled: false,
    configured: false,
    configFields: [
      { key: "measurementId", label: "Measurement ID", type: "text", required: true, placeholder: "G-XXXXXXXX" },
    ],
  },
];
