/* Brainstein Supabase authentication helper.
 * Use only the anon/publishable key in browser code.
 * Never expose a Supabase service_role/secret key here.
 */
window.supabaseAuth = (() => {
  const SUPABASE_URL = 'https://vpsehljhihkwruqeanod.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwc2VobGpoaWhrd3J1cWVhbm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5ODk4MDksImV4cCI6MjEwNDU2NTgwOX0.tqcnLhwjvN8snqHFGsi8rs687_32B0nufU0ReFk-3nw';

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  async function signInWithGoogle() {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`
      }
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  function syncUser(user) {
    if (!window.state) return;
    if (!user) {
      window.state.user = { name: 'Guest Observer', handle: 'guest-observer', signed: false };
      return;
    }

    const metadata = user.user_metadata || {};
    const name = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Google User';
    const handle = (metadata.user_name || user.email?.split('@')[0] || 'google-user')
      .replace(/[^a-z0-9-]/gi, '-').toLowerCase();

    window.state.user = {
      name,
      handle,
      email: user.email || '',
      photoURL: metadata.avatar_url || metadata.picture || '',
      uid: user.id,
      signed: true
    };
  }

  async function hydrate() {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    syncUser(session?.user || null);

    client.auth.onAuthStateChange((_event, nextSession) => {
      syncUser(nextSession?.user || null);
      if (typeof window.updateAuthUI === 'function') window.updateAuthUI();
    });
  }

  return { client, hydrate, signInWithGoogle, signOut, syncUser };
})();
