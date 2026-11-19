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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const turso = getTurso();
    if (req.method === 'GET') {
      const result = await turso.execute(
        'SELECT id, date, time, occupied, available, percent FROM usage_records ORDER BY id DESC'
      );
      const records = result.rows.map((row) => ({
        date: row.date as string,
        time: row.time as string,
        occupied: row.occupied as number,
        available: row.available as number,
        percent: row.percent as number,
      }));
      return res.status(200).json(records);
    }

    if (req.method === 'POST') {
      const rec = req.body;
      await turso.execute({
        sql: 'INSERT INTO usage_records (date, time, occupied, available, percent) VALUES (?, ?, ?, ?, ?)',
        args: [rec.date, rec.time, rec.occupied, rec.available, rec.percent],
      });
      return res.status(201).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: unknown) {
    console.error('/api/usage error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
