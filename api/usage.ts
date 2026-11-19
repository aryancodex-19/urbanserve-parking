import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './lib/cors';
import turso from './lib/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      const result = await turso.execute(
        'SELECT id, date, time, occupied, available, percent FROM usage_records ORDER BY id DESC'
      );
      const records = result.rows.map(row => ({
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
  } catch (err) {
    console.error('/api/usage error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

