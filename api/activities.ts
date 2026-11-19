import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './lib/cors';
import turso from './lib/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      const result = await turso.execute(
        'SELECT id, description, timestamp FROM activities ORDER BY id DESC LIMIT 50'
      );
      const activities = result.rows.map(row => ({
        id: row.id as number,
        description: row.description as string,
        timestamp: row.timestamp as string,
      }));
      return res.status(200).json(activities);
    }

    if (req.method === 'POST') {
      const act = req.body;
      await turso.execute({
        sql: 'INSERT INTO activities (id, description, timestamp) VALUES (?, ?, ?)',
        args: [act.id, act.description, act.timestamp],
      });
      return res.status(201).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('/api/activities error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

