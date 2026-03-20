/**
 * Integration/Plugin system types
 * Defines the interface for all integrations (email, Swish, etc.)
 */

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  category: "payment" | "communication" | "analytics" | "other";
  enabled: boolean;
  configured: boolean;
  configFields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "email" | "url" | "toggle" | "select";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

export interface IntegrationConfig {
  [key: string]: string | boolean;
}

export interface EmailReceiptData {
  to: string;
  storeName: string;
  receiptNumber: string;
  date: string;
  time: string;
  items: { name: string; qty: number; unitPrice: number; total: number }[];
  total: number;
  paymentMethod: string;
  thankYouMessage?: string;
  footer?: string;
}
