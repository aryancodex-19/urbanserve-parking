import { createClient } from '@libsql/client/web';

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is missing.');
  }

  return createClient({
    url,
    authToken,
  });
}

// Lazy proxy so importing this module never throws before the handler runs
const turso = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getTursoClient();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default turso;
