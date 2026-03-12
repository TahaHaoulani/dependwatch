import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

/**
 * Request-scoped session. Deduplicated within a single RSC request so layouts
 * and pages do not each trigger a separate session lookup.
 */
export const auth = cache(async () => {
  return getServerSession(authOptions);
});
