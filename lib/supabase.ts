import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
// Supabase replaced the legacy anon JWT key with the publishable API key (`sb_publishable_...`).
// Fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY for backwards compatibility.
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'your-publishable-key';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

