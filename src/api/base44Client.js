import { createClient } from '@base44/sdk';

const appId = import.meta.env.VITE_BASE44_APP_ID || '6a2805fd0a257742b748317a';

/** Same-origin client — works on the hosted Base44 app without a separate login */
export const base44 = createClient({ appId });
