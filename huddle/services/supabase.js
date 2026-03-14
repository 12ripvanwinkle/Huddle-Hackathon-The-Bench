// NOTE: This file must export a working `supabase` client for the app to start.
// Replace the stub below with your Supabase project URL + anon key, or provide
// environment variables to keep secrets out of source control.

// Example (uncomment + fill in):
// import { createClient } from '@supabase/supabase-js';
// export const supabase = createClient(
//   'https://<YOUR-PROJECT>.supabase.co',
//   '<YOUR-ANON-KEY>'
// );

// --- STUB (safe default, no network) ---------------------------------
// This lets the app boot without crashing even if you haven't configured
// Supabase yet. It provides the same minimal API surface used in App.js.

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (_event, callback) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signOut: async () => ({}),
  },
};
