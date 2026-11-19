import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './lib/cors';
import turso from './lib/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      const target = (req.query.target as string) || 'user';
      const result = await turso.execute({
        sql: 'SELECT id, target, type, title, message, timestamp, read FROM notifications WHERE target = ? ORDER BY timestamp DESC LIMIT 50',
        args: [target],
      });
      const notifications = result.rows.map(row => ({
        id: row.id as string,
        type: row.type as string,
        title: row.title as string,
        message: row.message as string,
        timestamp: row.timestamp as string,
        read: (row.read as number) === 1,
      }));
      return res.status(200).json(notifications);
    }

    if (req.method === 'POST') {
      const n = req.body;
      await turso.execute({
        sql: 'INSERT INTO notifications (id, target, type, title, message, timestamp, read) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [n.id, n.target, n.type, n.title, n.message, n.timestamp, n.read ? 1 : 0],
      });
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PATCH') {
      const { id, target, markAllRead } = req.body;

      if (markAllRead && target) {
        await turso.execute({
          sql: 'UPDATE notifications SET read = 1 WHERE target = ?',
          args: [target],
        });
      } else if (id) {
        await turso.execute({
          sql: 'UPDATE notifications SET read = 1 WHERE id = ?',
          args: [id],
        });
      } else {
        return res.status(400).json({ error: 'Provide id or target+markAllRead' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('/api/notifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

