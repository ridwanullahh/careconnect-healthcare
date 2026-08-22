// Bismillah Ar-Rahman Ar-Raheem.
// Cloudflare Pages Function middleware — intercepts all /api/* requests.
// Delegates to the shared handler which talks to Lightbase directly.
import { handleRequest } from '../../apps/backend/src/handler';

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const envRecord: Record<string, string> = {};
  for (const key in env) {
    const val = (env as any)[key];
    if (typeof val === 'string') envRecord[key] = val;
  }
  return handleRequest(request, envRecord);
};
