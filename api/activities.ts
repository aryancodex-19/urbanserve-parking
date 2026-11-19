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
        'SELECT id, description, timestamp FROM activities ORDER BY id DESC LIMIT 50'
      );
      const activities = result.rows.map((row) => ({
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
  } catch (err: unknown) {
    console.error('/api/activities error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
