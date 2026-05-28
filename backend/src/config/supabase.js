// Supabase Client Initialization for Express Backend
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase URL and Service Role Key must be set in environment variables');
  console.error('   Get keys from: https://supabase.com/dashboard → Settings → API');
  console.error('   The keys should start with "eyJ" (JWT format)');
  process.exit(1);
}

// Validate that the key looks valid (starts with "eyJ" for JWT or "sb_" for new Supabase keys)
if (!supabaseServiceKey.startsWith('eyJ') && !supabaseServiceKey.startsWith('sb_')) {
  console.error('❌ Invalid SUPABASE_SERVICE_ROLE_KEY format');
  console.error('   The key should start with "eyJ" or "sb_" - copy the full key from Supabase dashboard');
  process.exit(1);
}

// Create Supabase client with service role key for backend operations
// Service role key has elevated privileges for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Helper function to handle API responses
const successResponse = (message, data = null) => ({
  success: true,
  message,
  ...(data && { data }),
});

const errorResponse = (message, details = null) => ({
  success: false,
  error: message,
  ...(details && { details }),
});

module.exports = { supabase, successResponse, errorResponse };