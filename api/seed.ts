import { createClient } from '@libsql/client/web';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function getTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL is missing');
  return createClient({ url, authToken });
}

function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

export const FACILITIES_SEED = [
  {
    id: 'kanakia-road',
    name: 'Kanakia Road Public Parking',
    address: 'Kanakia Road, Mira Road East',
    lat: 19.3005,
    lng: 72.8762,
    totalSlots: 50,
    rate: '₹20/hr',
    zones: [
      { prefix: 'A', count: 25 },
      { prefix: 'B', count: 25 },
    ],
  },
  {
    id: 'station-hub',
    name: 'Mira Road Station Hub',
    address: 'Station Road, Mira Road East',
    lat: 19.2982,
    lng: 72.8761,
    totalSlots: 40,
    rate: '₹25/hr',
    zones: [
      { prefix: 'A', count: 20 },
      { prefix: 'B', count: 20 },
    ],
  },
  {
    id: 'cinemax-arcade',
    name: 'Cinemax Arcade Parking Hub',
    address: 'Near Cinemax, Mira Road East',
    lat: 19.3014,
    lng: 72.8756,
    totalSlots: 30,
    rate: '₹30/hr',
    zones: [
      { prefix: 'A', count: 15 },
      { prefix: 'B', count: 15 },
    ],
  },
  {
    id: 'beverly-park',
    name: 'Beverly Park Lane Parking',
    address: 'Beverly Park Road, Mira Road East',
    lat: 19.2993,
    lng: 72.8774,
    totalSlots: 24,
    rate: '₹20/hr',
    zones: [
      { prefix: 'A', count: 12 },
      { prefix: 'B', count: 12 },
    ],
  },
  {
    id: 'shanti-park',
    name: 'Shanti Park Stand Parking',
    address: 'Shanti Park, Mira Road East',
    lat: 19.3021,
    lng: 72.8779,
    totalSlots: 26,
    rate: '₹20/hr',
    zones: [
      { prefix: 'A', count: 13 },
      { prefix: 'B', count: 13 },
    ],
  },
  {
    id: 'jangid-complex',
    name: 'Jangid Complex Parking',
    address: 'Jangid Estate, Mira Road East',
    lat: 19.3009,
    lng: 72.8786,
    totalSlots: 20,
    rate: '₹20/hr',
    zones: [
      { prefix: 'A', count: 10 },
      { prefix: 'B', count: 10 },
    ],
  },
  {
    id: 'kanakia-zillion',
    name: 'Kanakia Zillion Lot',
    address: 'Behind Cinemax, Mira Road East',
    lat: 19.2990,
    lng: 72.8751,
    totalSlots: 30,
    rate: '₹25/hr',
    zones: [
      { prefix: 'A', count: 15 },
      { prefix: 'B', count: 15 },
    ],
  },
  {
    id: 'gcc-club',
    name: 'GCC Club Road Parking',
    address: 'Off Mira Bhayandar Road, Mira Road East',
    lat: 19.3026,
    lng: 72.8745,
    totalSlots: 36,
    rate: '₹30/hr',
    zones: [
      { prefix: 'A', count: 18 },
      { prefix: 'B', count: 18 },
    ],
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const turso = getTurso();

    // 1. Create Tables
    await turso.executeMultiple(`
      CREATE TABLE IF NOT EXISTS facilities (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        address       TEXT NOT NULL,
        lat           REAL NOT NULL,
        lng           REAL NOT NULL,
        total_slots   INTEGER NOT NULL,
        rate          TEXT NOT NULL,
        zones         TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS slots (
        id            TEXT NOT NULL,
        facility_id   TEXT NOT NULL REFERENCES facilities(id),
        status        TEXT NOT NULL DEFAULT 'available',
        last_updated  TEXT NOT NULL,
        PRIMARY KEY (id, facility_id)
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        user_name     TEXT NOT NULL,
        booked_by     TEXT NOT NULL,
        facility_id   TEXT NOT NULL REFERENCES facilities(id),
        facility_name TEXT NOT NULL,
        slot_id       TEXT NOT NULL,
        date          TEXT NOT NULL,
        start_time    TEXT NOT NULL,
        end_time      TEXT NOT NULL,
        time          TEXT,
        status        TEXT NOT NULL DEFAULT 'Upcoming',
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS issues (
        id            TEXT PRIMARY KEY,
        location      TEXT NOT NULL,
        type          TEXT NOT NULL,
        priority      TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'Open',
        desc          TEXT NOT NULL,
        date          TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS usage_records (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        date          TEXT NOT NULL,
        time          TEXT NOT NULL,
        occupied      INTEGER NOT NULL,
        available     INTEGER NOT NULL,
        percent       INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS activities (
        id            INTEGER PRIMARY KEY,
        description   TEXT NOT NULL,
        timestamp     TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id            TEXT PRIMARY KEY,
        target        TEXT NOT NULL,
        type          TEXT NOT NULL,
        title         TEXT NOT NULL,
        message       TEXT NOT NULL,
        timestamp     TEXT NOT NULL,
        read          INTEGER NOT NULL DEFAULT 0
      );
    `);

    // 2. Seed initial data
    const batchStatements: Array<{ sql: string; args: unknown[] }> = [];

    for (const fac of FACILITIES_SEED) {
      batchStatements.push({
        sql: `INSERT OR REPLACE INTO facilities (id, name, address, lat, lng, total_slots, rate, zones)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          fac.id,
          fac.name,
          fac.address,
          fac.lat,
          fac.lng,
          fac.totalSlots,
          fac.rate,
          JSON.stringify(fac.zones),
        ],
      });

      fac.zones.forEach((zone) => {
        for (let i = 1; i <= zone.count; i++) {
          const slotId = `${zone.prefix}${i.toString().padStart(2, '0')}`;
          let status = 'available';
          const rand = Math.random();
          if (rand > 0.8) status = 'maintenance';
          else if (rand > 0.35) status = 'occupied';

          if (fac.id === 'kanakia-road' && slotId === 'A02') {
            status = 'occupied';
          }

          batchStatements.push({
            sql: `INSERT OR REPLACE INTO slots (id, facility_id, status, last_updated)
                  VALUES (?, ?, ?, ?)`,
            args: [slotId, fac.id, status, new Date().toISOString()],
          });
        }
      });
    }

    const today = new Date().toISOString().split('T')[0];
    batchStatements.push({
      sql: `INSERT OR REPLACE INTO bookings (id, user_id, user_name, booked_by, facility_id, facility_name, slot_id, date, start_time, end_time, time, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'BK-1024',
        'user1',
        'user1',
        'user1',
        'kanakia-road',
        'Kanakia Road Public Parking',
        'A02',
        today,
        '10:00',
        '12:00',
        '10:00 - 12:00',
        'Upcoming',
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    });

    const defaultIssues = [
      {
        id: 'ISS-001',
        location: 'Slot A04',
        type: 'Slot Damage',
        priority: 'High',
        status: 'Open',
        desc: 'Concrete surface broken.',
        date: new Date().toISOString(),
      },
      {
        id: 'ISS-002',
        location: 'Entry Gate',
        type: 'Entry Gate',
        priority: 'Medium',
        status: 'In Progress',
        desc: 'Barrier arm responding slowly.',
        date: new Date().toISOString(),
      },
      {
        id: 'ISS-003',
        location: 'Lighting A',
        type: 'Lighting',
        priority: 'Low',
        status: 'Resolved',
        desc: 'Bulb replacement.',
        date: new Date().toISOString(),
      },
    ];

    for (const iss of defaultIssues) {
      batchStatements.push({
        sql: `INSERT OR REPLACE INTO issues (id, location, type, priority, status, desc, date)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [iss.id, iss.location, iss.type, iss.priority, iss.status, iss.desc, iss.date],
      });
    }

    const defaultUsage = [
      { date: today, time: '10:00', occupied: 22, available: 23, percent: 49 },
      { date: today, time: '13:00', occupied: 32, available: 13, percent: 71 },
      { date: today, time: '17:00', occupied: 41, available: 4, percent: 91 },
    ];
    for (const u of defaultUsage) {
      batchStatements.push({
        sql: `INSERT INTO usage_records (date, time, occupied, available, percent)
              VALUES (?, ?, ?, ?, ?)`,
        args: [u.date, u.time, u.occupied, u.available, u.percent],
      });
    }

    batchStatements.push({
      sql: `INSERT OR REPLACE INTO activities (id, description, timestamp)
            VALUES (?, ?, ?)`,
      args: [Date.now(), 'System initialized with demo data', new Date().toISOString()],
    });

    await turso.batch(batchStatements, 'write');

    return res.status(200).json({
      success: true,
      message: 'Turso SQLite database initialized and seeded successfully.',
      facilitiesCount: FACILITIES_SEED.length,
    });
  } catch (err: unknown) {
    console.error('Seed error:', err);
    return res.status(500).json({
      error: 'Failed to seed database',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
