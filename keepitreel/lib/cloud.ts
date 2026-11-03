import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.WXT_SUPABASE_URL as string | undefined;
const key = import.meta.env.WXT_SUPABASE_ANON_KEY as string | undefined;
export const cloud = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;
export async function cloudRequest(body: Record<string, unknown>) {
  if (!cloud) throw new Error('Cloud analysis is not configured in this build.');
  const { data, error } = await cloud.functions.invoke('analyze', { body });
  if (error) {
    const context = error.context;
    if (context instanceof Response) {
      const detail = await context.json().catch(() => ({}));
      throw new Error(detail.error || 'Analysis service is unavailable. Try again later.');
    }
    throw new Error(error.message);
  }
  if (data.error) throw new Error(data.error);
  return data;
}
