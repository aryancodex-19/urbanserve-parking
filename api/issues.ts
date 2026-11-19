import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './lib/cors';
import turso from './lib/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      const result = await turso.execute(
        'SELECT id, location, type, priority, status, desc, date FROM issues ORDER BY date DESC'
      );
      const issues = result.rows.map(row => ({
        id: row.id as string,
        location: row.location as string,
        type: row.type as string,
        priority: row.priority as string,
        status: row.status as string,
        desc: row.desc as string,
        date: row.date as string,
      }));
      return res.status(200).json(issues);
    }

    if (req.method === 'POST') {
      const iss = req.body;
      await turso.execute({
        sql: 'INSERT INTO issues (id, location, type, priority, status, desc, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [iss.id, iss.location, iss.type, iss.priority, iss.status, iss.desc, iss.date],
      });
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body;
      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required' });
      }
      await turso.execute({
        sql: 'UPDATE issues SET status = ? WHERE id = ?',
        args: [status, id],
      });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('/api/issues error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

