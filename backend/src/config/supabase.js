const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your-project') || supabaseServiceKey.includes('your-service-role-key')) {
  console.warn('[Supabase Config Warning]: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is using placeholder values or is not set in backend/.env');
}

/**
 * Dedicated Supabase Client initialized with Service Role Key.
 * NOTE: Service Role Key bypasses Row Level Security (RLS) and must NEVER be exposed to the React frontend!
 */
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-service-role-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

module.exports = supabase;
