import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './lib/cors';
import turso from './lib/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const hasUrl = Boolean(process.env.TURSO_DATABASE_URL);
    const hasToken = Boolean(process.env.TURSO_AUTH_TOKEN);
    const urlPreview = process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.slice(0, 20) + '...' : 'none';

    // Try a ping query
    let dbStatus = 'untested';
    let dbError = null;
    try {
      const ping = await turso.execute('SELECT 1 as val');
      dbStatus = 'connected (' + ping.rows[0].val + ')';
    } catch (e: unknown) {
      dbStatus = 'failed';
      dbError = e instanceof Error ? e.message : String(e);
    }

    return res.status(200).json({
      status: 'ok',
      hasUrl,
      hasToken,
      urlPreview,
      dbStatus,
      dbError,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: 'Health check exception',
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}
