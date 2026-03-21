/**
 * Settings type definitions — ALL 60+ settings from admin portal
 */

export interface OpeningHours {
  from: string;
  to: string;
  closed: boolean;
}

export interface KioskSettings {
  // Butiksinformation
  storeName: string;
  storeSubtitle: string;
  companyAddress: string;
  orgNumber: string;
  vatNumber: string;
  logoUrl: string;

  // Betalning
  swishNumber: string;
  paymentSwish: boolean;
  paymentCard: boolean;
  paymentCash: boolean;
  paymentQR: boolean;
  receiptPrefix: string;

  // Utseende / Tema
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  buttonRadius: number;
  fontFamily: string;
  productCardStyle: string;
  productsPerRow: number;
  themeMode: string;
  animationsEnabled: boolean;

  // Kiosk-display
  welcomeText: string;
  screensaverEnabled: boolean;
  screensaverDelay: number;
  screensaverText: string;
  bubbleText1: string;
  bubbleText2: string;
  bubbleVisible: boolean;
  selectButtonVisible: boolean;

  // Drift
  openingHours: Record<string, OpeningHours>;
  autoRestartTime: string;
  ordersPaused: boolean;
  pauseMessage: string;
  emergencyMessage: string;

  // Ljud & Tillganglighet
  soundEffects: boolean;
  soundVolume: number;
  largeTextMode: boolean;
  highContrast: boolean;

  // Funktioner
  offersEnabled: boolean;
  wishesEnabled: boolean;
  kioskLocked: boolean;
  tippingEnabled: boolean;
  tipAmount1: number;
  tipAmount2: number;
  tipAmount3: number;
  orderQueueEnabled: boolean;
  orderQueueFormat: string;

  // Kvittodesign
  receiptLogoUrl: string;
  receiptThankYou: string;
  receiptFooter: string;
  receiptShowOrderNumber: boolean;
  receiptShowDateTime: boolean;
  receiptShowVat: boolean;
  receiptFontSize: number;
  receiptPaperWidth: string;

  // Sakerhet
  kioskPassword: string;
  sessionTimeout: number;
}

export const DEFAULT_SETTINGS: KioskSettings = {
  storeName: "Corevo Kiosk",
  storeSubtitle: "",
  companyAddress: "",
  orgNumber: "",
  vatNumber: "",
  logoUrl: "",

  swishNumber: "",
  paymentSwish: true,
  paymentCard: false,
  paymentCash: false,
  paymentQR: false,
  receiptPrefix: "CR",

  primaryColor: "#2d6b5a",
  secondaryColor: "#d4a574",
  accentColor: "#f5a623",
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
  buttonRadius: 8,
  fontFamily: "Inter",
  productCardStyle: "style1",
  productsPerRow: 3,
  themeMode: "light",
  animationsEnabled: true,

  welcomeText: "Välkommen till vår kiosk!",
  screensaverEnabled: true,
  screensaverDelay: 5,
  screensaverText: "Välkommen!",
  bubbleText1: "",
  bubbleText2: "",
  bubbleVisible: true,
  selectButtonVisible: true,

  openingHours: {
    mon: { from: "08:00", to: "18:00", closed: false },
    tue: { from: "08:00", to: "18:00", closed: false },
    wed: { from: "08:00", to: "18:00", closed: false },
    thu: { from: "08:00", to: "18:00", closed: false },
    fri: { from: "08:00", to: "18:00", closed: false },
    sat: { from: "10:00", to: "16:00", closed: false },
    sun: { from: "00:00", to: "00:00", closed: true },
  },
  autoRestartTime: "03:00",
  ordersPaused: false,
  pauseMessage: "",
  emergencyMessage: "",

  soundEffects: true,
  soundVolume: 70,
  largeTextMode: false,
  highContrast: false,

  offersEnabled: true,
  wishesEnabled: true,
  kioskLocked: true,
  tippingEnabled: false,
  tipAmount1: 10,
  tipAmount2: 20,
  tipAmount3: 50,
  orderQueueEnabled: true,
  orderQueueFormat: "CR-####",

  receiptLogoUrl: "",
  receiptThankYou: "Tack för ditt köp!",
  receiptFooter: "",
  receiptShowOrderNumber: true,
  receiptShowDateTime: true,
  receiptShowVat: true,
  receiptFontSize: 12,
  receiptPaperWidth: "80mm",

  kioskPassword: "",
  sessionTimeout: 30,
};
