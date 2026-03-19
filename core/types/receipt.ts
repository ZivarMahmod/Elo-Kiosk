/**
 * Receipt-related type definitions
 */

export interface ReceiptItem {
  namn: string;
  antal: number;
  prisStyck: number;
  prisTotal: number;
}

export interface Receipt {
  id: string;
  kvittoNummer: string;
  datum: string;
  tid: string;
  items: ReceiptItem[];
  total: number;
  status: "registrerad" | "ej_registrerad";
  tagged: boolean;
  tagType: string | null;
  betalning: string;
  createdAt: string;
}

export interface CreateReceiptInput {
  kvittoNummer: string;
  datum: string;
  tid: string;
  items: ReceiptItem[];
  total: number;
  status?: string;
  tagged?: boolean;
  tagType?: string | null;
  betalning?: string;
}

export interface UpdateReceiptInput {
  id: string;
  status?: string;
  tagged?: boolean;
  tagType?: string | null;
}
