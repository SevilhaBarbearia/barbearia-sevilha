import { processNotifications } from './handler.ts';

Deno.serve(processNotifications);
