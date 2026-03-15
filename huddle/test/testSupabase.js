// test/testSupabase.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTests() {
  console.log('\n--- Testing Supabase ---\n');

  // 1. Sign in
  console.log('1. Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'odnt123@gmail.com',
    password: 'power123',
  });
  if (authError) return console.error('❌ Auth failed:', authError.message);
  const userId = authData.user.id;
  console.log('✅ Signed in as:', userId);

  // 2. Get profile
  console.log('\n2. Fetching profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (profileError) console.error('❌ Profile error:', profileError.message);
  else console.log('✅ Profile:', profile);

  // 3. Create session
  console.log('\n3. Creating session...');
  const sessionId = 'TEST' + Date.now().toString().slice(-4);
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({ id: sessionId, name: 'Test Huddle', host_id: userId, radius: 150 })
    .select()
    .single();
  if (sessionError) console.error('❌ Session error:', sessionError.message);
  else console.log('✅ Session created:', session.id);

  // 4. Join session
  console.log('\n4. Joining session...');
  const { data: member, error: memberError } = await supabase
    .from('session_members')
    .insert({ session_id: sessionId, user_id: userId, status: 'safe' })
    .select()
    .single();
  if (memberError) console.error('❌ Join error:', memberError.message);
  else console.log('✅ Joined session');

  // 5. Update location
  console.log('\n5. Updating location...');
  const { data: updated, error: updateError } = await supabase
    .from('session_members')
    .update({ latitude: 18.4762, longitude: -77.8939, status: 'safe' })
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .select()
    .single();
  if (updateError) console.error('❌ Location update error:', updateError.message);
  else console.log('✅ Location updated:', updated.latitude, updated.longitude);

  // 6. Test realtime
  console.log('\n6. Testing realtime (5 second listen)...');

  await new Promise((resolve) => {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_members',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        console.log('✅ Realtime update received:', payload.new);
      })
      .subscribe(async (status) => {
        console.log('Realtime status:', status);

        if (status === 'SUBSCRIBED') {
          console.log('Connected — triggering test update...');
          await supabase
            .from('session_members')
            .update({ status: 'alert', latitude: 18.4800, longitude: -77.8900 })
            .eq('session_id', sessionId)
            .eq('user_id', userId);
        }

        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime channel error');
          await channel.unsubscribe();
          resolve();
        }
      });

    // Cleanup and resolve after 5 seconds
    setTimeout(async () => {
      await channel.unsubscribe();
      console.log('✅ Realtime test done');
      resolve();
    }, 5000);
  });

  console.log('\n7. Testing user movement...');

  // Simulate a path — starts inside radius (150m), drifts outside
  const CENTER_LAT = 18.4762;
  const CENTER_LNG = -77.8939;
  const RADIUS     = 150; // meters

  const movementPath = [
    { latitude: 18.4762, longitude: -77.8939 }, // step 1 — dead center
    { latitude: 18.4765, longitude: -77.8940 }, // step 2 — slight move
    { latitude: 18.4770, longitude: -77.8945 }, // step 3 — moving out
    { latitude: 18.4775, longitude: -77.8950 }, // step 4 — near boundary
    { latitude: 18.4780, longitude: -77.8960 }, // step 5 — outside zone ⚠️
    { latitude: 18.4785, longitude: -77.8970 }, // step 6 — further out
    { latitude: 18.4770, longitude: -77.8955 }, // step 7 — heading back
    { latitude: 18.4763, longitude: -77.8941 }, // step 8 — back inside ✅
  ];

  function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  for (let i = 0; i < movementPath.length; i++) {
    const { latitude, longitude } = movementPath[i];
    const distance = getDistanceMeters(CENTER_LAT, CENTER_LNG, latitude, longitude);
    const status   = distance <= RADIUS ? 'safe' : 'alert';

    const { error } = await supabase
      .from('session_members')
      .update({
        latitude,
        longitude,
        status,
        last_updated: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error(`❌ Step ${i + 1} failed:`, error.message);
    } else {
      const icon = status === 'safe' ? '✅' : '⚠️';
      console.log(
        `${icon} Step ${i + 1}: (${latitude}, ${longitude}) — ${distance.toFixed(1)}m from center — status: ${status}`
      );
    }

    // Wait 1 second between steps to simulate real movement
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('✅ Movement test done');

  // ─────────────────────────────────────────
  // 8. TEST SESSION EXPIRY
  // Creates a session with expires_at set to
  // 5 seconds from now, polls until it's gone
  // ─────────────────────────────────────────

  console.log('\n8. Testing session expiry...');

  // First add the auto-delete function to Supabase if not already there
  // (run this SQL once in Supabase SQL editor):
  //
  // CREATE OR REPLACE FUNCTION delete_expired_sessions()
  // RETURNS void LANGUAGE plpgsql AS $$
  // BEGIN
  //   DELETE FROM public.sessions WHERE expires_at < now();
  // END;
  // $$;

  const expirySessionId = 'EXP' + Date.now().toString().slice(-4);
  const expiresIn5Seconds = new Date(Date.now() + 5000).toISOString();

  // Create a session that expires in 5 seconds
  const { error: expSessionError } = await supabase
    .from('sessions')
    .insert({
      id:         expirySessionId,
      name:       'Expiry Test Session',
      host_id:    userId,
      radius:     100,
      expires_at: expiresIn5Seconds,
    });

  if (expSessionError) {
    console.error('❌ Could not create expiry session:', expSessionError.message);
  } else {
    console.log(`✅ Expiry session created: ${expirySessionId}`);
    console.log(`   Expires at: ${expiresIn5Seconds}`);
    console.log('   Waiting for expiry...');

    // Manually trigger cleanup (since pg_cron needs setup,
    // we call the function directly via RPC)
    await new Promise(r => setTimeout(r, 6000)); // wait 6 seconds

    // Call the cleanup function
    const { error: rpcError } = await supabase.rpc('delete_expired_sessions');
    if (rpcError) {
      console.error('❌ RPC error (did you add the SQL function?):', rpcError.message);
      console.log('   Run this in Supabase SQL editor:');
      console.log(`
        CREATE OR REPLACE FUNCTION delete_expired_sessions()
        RETURNS void LANGUAGE plpgsql AS $$
        BEGIN
          DELETE FROM public.sessions WHERE expires_at < now();
        END;
        $$;
      `);
    }

    // Check if session was deleted
    const { data: expiredSession } = await supabase
      .from('sessions')
      .select('id, expires_at')
      .eq('id', expirySessionId)
      .single();

    if (!expiredSession) {
      console.log('✅ Expiry test passed — session was deleted after expiry');
    } else {
      console.log('⚠️  Session still exists — make sure delete_expired_sessions() SQL function is added');
      console.log('   Session data:', expiredSession);

      // Clean it up manually
      await supabase.from('sessions').delete().eq('id', expirySessionId);
      console.log('   Manually deleted expiry test session');
    }
  }

  // 7. Cleanup
  console.log('\n7. Cleaning up...');
  await supabase.from('sessions').update({ active: false }).eq('id', sessionId);
  console.log('✅ All tests done. Session deactivated.');
  process.exit(0);
}


runTests().catch(console.error);