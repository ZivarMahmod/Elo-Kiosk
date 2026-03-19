/**
 * SQLite table definitions for Elo Kiosk
 * All tables matching admin portal data model
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
-- Products table with all enhanced kiosk fields
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Available',
  categoryId TEXT DEFAULT '',
  description TEXT DEFAULT '',
  imageUrl TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  descriptionShort TEXT DEFAULT '',
  descriptionLong TEXT DEFAULT '',
  campaignPrice REAL,
  campaignFrom TEXT,
  campaignTo TEXT,
  backgroundColor TEXT DEFAULT '',
  textColor TEXT DEFAULT '',
  badgeLabel TEXT DEFAULT '',
  badgeColor TEXT DEFAULT '',
  stockStatus TEXT DEFAULT 'i_lager',
  minStockLevel INTEGER DEFAULT 0,
  sortWeight INTEGER DEFAULT 0,
  showOnKiosk INTEGER DEFAULT 1,
  allergens TEXT DEFAULT '[]',
  nutritionInfo TEXT DEFAULT '',
  vatRate INTEGER DEFAULT 25,
  costPrice REAL,
  supplierName TEXT DEFAULT '',
  internalNote TEXT DEFAULT '',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status INTEGER DEFAULT 1,
  description TEXT,
  emoji TEXT DEFAULT '',
  color TEXT DEFAULT '#d5ddd8',
  subtitle TEXT DEFAULT '',
  parentId TEXT,
  visibleFrom TEXT,
  visibleTo TEXT,
  bannerImageUrl TEXT,
  sortOrder INTEGER DEFAULT 0,
  showOnKiosk INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT
);

-- Receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  kvittoNummer TEXT NOT NULL,
  datum TEXT NOT NULL,
  tid TEXT NOT NULL,
  items TEXT NOT NULL DEFAULT '[]',
  total REAL NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'ej_registrerad',
  tagged INTEGER DEFAULT 0,
  tagType TEXT,
  betalning TEXT DEFAULT 'Swish',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  type TEXT,
  status INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT
);

-- Stock allocations (product in warehouse)
CREATE TABLE IF NOT EXISTS stock_allocations (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  warehouseId TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reservedQuantity INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- Stock adjustments log
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);

-- Offers / deals
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  products TEXT DEFAULT '[]',
  discount REAL DEFAULT 0,
  offerPrice REAL DEFAULT 0,
  isMainOffer INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Customer wishes
CREATE TABLE IF NOT EXISTS wishes (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tags for receipts
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '',
  color TEXT DEFAULT '#6b7c74',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Key-value settings store
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Kiosk identity and account linking
CREATE TABLE IF NOT EXISTS kiosk_identity (
  id TEXT PRIMARY KEY,
  kioskId TEXT NOT NULL UNIQUE,
  accountEmail TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  linkedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);
`;
