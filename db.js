/**
 * db.js — Persistent inquiry storage
 *
 * Uses PostgreSQL when DATABASE_URL is set (Render).
 * Falls back to file-based JSON storage otherwise (local dev).
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ── State ──────────────────────────────────────────────
let pool = null;
let isActive = false;

// File-based paths (set by init)
let inquiriesFile = null;
function defaultInquiriesFile() {
  return path.join(__dirname, 'inquiries', 'inquiries.json');
}

// ── Initialisation ─────────────────────────────────────
async function init(opts = {}) {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
      connectionTimeoutMillis: 5000,
      ...opts.pool,
    });

    // Verify the connection actually works before committing to Postgres
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      isActive = true;
      console.log('🗄️  Using PostgreSQL for inquiry storage');
    } catch (err) {
      console.error('❌  PostgreSQL connection failed:', err.message);
      console.log('📁  Falling back to file-based storage');
      pool = null;
      inquiriesFile = opts.inquiriesFile || defaultInquiriesFile();
      return;
    }
  } else {
    inquiriesFile = opts.inquiriesFile || defaultInquiriesFile();
    console.log('📁  Using file-based inquiry storage');
  }
}

function isUsingPostgres() {
  return isActive;
}

// ── Schema ──────────────────────────────────────────────
async function createTable() {
  if (!isActive) return false;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(255) NOT NULL,
        email         VARCHAR(255) NOT NULL,
        phone         VARCHAR(50)  DEFAULT 'Not provided',
        service       VARCHAR(100) DEFAULT 'Not specified',
        message       TEXT         NOT NULL,
        read          BOOLEAN      DEFAULT FALSE,
        created_at    TIMESTAMPTZ  DEFAULT NOW()
      )
    `);
    console.log('✅  PostgreSQL inquiries table ready');
    return true;
  } catch (err) {
    console.error('❌  Failed to create inquiries table:', err.message);
    console.log('📁  Falling back to file-based storage');
    isActive = false;
    pool = null;
    return false;
  }
}

// ── File helpers (fallback) ────────────────────────────
function loadFileInquiries() {
  if (!inquiriesFile) return [];
  try {
    if (fs.existsSync(inquiriesFile)) {
      return JSON.parse(fs.readFileSync(inquiriesFile, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load inquiries from file:', err.message);
  }
  return [];
}

function saveFileInquiries(inquiries) {
  if (!inquiriesFile) return;
  try {
    const dir = path.dirname(inquiriesFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(inquiriesFile, JSON.stringify(inquiries, null, 2));
  } catch (err) {
    console.error('Failed to save inquiries to file:', err.message);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Public API ─────────────────────────────────────────
async function addInquiry(inquiry) {
  if (isActive) {
    const result = await pool.query(
      `INSERT INTO inquiries (name, email, phone, service, message, read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        inquiry.name,
        inquiry.email,
        inquiry.phone || 'Not provided',
        inquiry.service || 'Not specified',
        inquiry.message,
        false,
        inquiry.timestamp || new Date().toISOString(),
      ]
    );
    return rowToInquiry(result.rows[0]);
  }

  // File fallback
  const inquiries = loadFileInquiries();
  const entry = {
    ...inquiry,
    id: generateId(),
    timestamp: inquiry.timestamp || new Date().toISOString(),
    read: false,
  };
  inquiries.push(entry);
  saveFileInquiries(inquiries);
  return entry;
}

async function loadInquiries() {
  if (isActive) {
    const result = await pool.query(
      'SELECT * FROM inquiries ORDER BY created_at DESC'
    );
    return result.rows.map(rowToInquiry);
  }
  const inquiries = loadFileInquiries();
  inquiries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return inquiries;
}

async function getInquiryStats() {
  if (isActive) {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int                                          AS total,
        COUNT(*) FILTER (WHERE NOT read)::int                  AS unread,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS "thisMonth",
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS today
      FROM inquiries
    `);
    return result.rows[0];
  }

  const inquiries = loadFileInquiries();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    total: inquiries.length,
    unread: inquiries.filter((i) => !i.read).length,
    thisMonth: inquiries.filter((i) => new Date(i.timestamp) >= monthStart).length,
    today: inquiries.filter((i) => new Date(i.timestamp) >= todayStart).length,
  };
}

async function getInquiryById(id) {
  if (isActive) {
    const result = await pool.query('SELECT * FROM inquiries WHERE id = $1', [id]);
    return result.rows.length ? rowToInquiry(result.rows[0]) : null;
  }
  const inquiries = loadFileInquiries();
  return inquiries.find((i) => i.id === id) || null;
}

async function updateInquiry(id, updates) {
  if (isActive) {
    const setClauses = [];
    const values = [];
    let idx = 1;

    if (updates.read !== undefined) {
      setClauses.push(`read = $${idx++}`);
      values.push(updates.read);
    }
    if (updates.name) {
      setClauses.push(`name = $${idx++}`);
      values.push(updates.name);
    }
    if (updates.email) {
      setClauses.push(`email = $${idx++}`);
      values.push(updates.email);
    }
    if (updates.phone) {
      setClauses.push(`phone = $${idx++}`);
      values.push(updates.phone);
    }
    if (updates.service) {
      setClauses.push(`service = $${idx++}`);
      values.push(updates.service);
    }
    if (updates.message) {
      setClauses.push(`message = $${idx++}`);
      values.push(updates.message);
    }

    if (setClauses.length === 0) return null;
    values.push(id);

    const result = await pool.query(
      `UPDATE inquiries SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows.length ? rowToInquiry(result.rows[0]) : null;
  }

  // File fallback
  const inquiries = loadFileInquiries();
  const idx = inquiries.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  inquiries[idx] = { ...inquiries[idx], ...updates };
  saveFileInquiries(inquiries);
  return inquiries[idx];
}

async function deleteInquiry(id) {
  if (isActive) {
    const result = await pool.query('DELETE FROM inquiries WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
  const inquiries = loadFileInquiries();
  const filtered = inquiries.filter((i) => i.id !== id);
  if (filtered.length === inquiries.length) return false;
  saveFileInquiries(filtered);
  return true;
}

// ── Migration: copy file-based inquiries into PostgreSQL ──
async function migrateFileInquiries(filePath) {
  if (!isActive) return 0;

  let fileInquiries;
  try {
    if (fs.existsSync(filePath)) {
      fileInquiries = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      return 0;
    }
  } catch {
    return 0;
  }

  if (!Array.isArray(fileInquiries) || fileInquiries.length === 0) return 0;

  let migrated = 0;
  for (const inq of fileInquiries) {
    // Skip duplicates by checking if an entry with same email + message exists
    const dup = await pool.query(
      'SELECT id FROM inquiries WHERE email = $1 AND message = $2 LIMIT 1',
      [inq.email, inq.message]
    );
    if (dup.rows.length > 0) continue;

    await pool.query(
      `INSERT INTO inquiries (name, email, phone, service, message, read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        inq.name,
        inq.email,
        inq.phone || 'Not provided',
        inq.service || 'Not specified',
        inq.message,
        inq.read || false,
        inq.timestamp || new Date().toISOString(),
      ]
    );
    migrated++;
  }

  if (migrated > 0) {
    console.log(`📦  Migrated ${migrated} file-based inquiries to PostgreSQL`);
  }
  return migrated;
}

// ── Helpers ────────────────────────────────────────────
function rowToInquiry(row) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    service: row.service,
    message: row.message,
    read: row.read,
    timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

// ── Exports ─────────────────────────────────────────────
module.exports = {
  init,
  isUsingPostgres,
  createTable,
  addInquiry,
  loadInquiries,
  getInquiryStats,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  migrateFileInquiries,
};
