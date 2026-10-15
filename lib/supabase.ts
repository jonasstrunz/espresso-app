import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const rawKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

const isValidUrl = (url?: string) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl! : 'https://placeholder.supabase.co';
const supabaseKey = rawKey && rawKey.length > 0 ? rawKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);


