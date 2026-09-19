/* Brainstein Supabase authentication helper.
 * Use only the anon/publishable key in browser code.
 * Never expose a Supabase service_role/secret key here.
 */
window.BRAINSTEIN_CONFIG = window.BRAINSTEIN_CONFIG || {
  supabaseUrl: 'https://vpsehljhihkwruqeanod.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwc2VobGpoaWhrd3J1cWVhbm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5ODk4MDksImV4cCI6MjEwNDU2NTgwOX0.tqc8vTgAfuY2x0VvM63n58s1wD7f9sh7slTQ0H4w4-Q'
};

window.supabaseAuth = (() => {
  const config = window.BRAINSTEIN_CONFIG || {};
  const SUPABASE_URL = safeText(config.supabaseUrl, 'https://YOUR_PROJECT_REF.supabase.co');
  const SUPABASE_ANON_KEY = safeText(config.supabaseAnonKey, 'YOUR_SUPABASE_ANON_KEY');

  const client = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    : null;

  function safeText(value, fallback = 'Guest') {
    if (value === null || value === undefined || !String(value).trim()) return fallback;
    return String(value).trim();
  }

  function normalizeUser(sessionUser) {
    if (!sessionUser) {
      return {
        name: 'Guest Observer',
        handle: 'guest-observer',
        signed: false,
        avatar: 'G',
        email: ''
      };
    }

    const metadata = sessionUser.user_metadata || {};
    const fullName = safeText(
      metadata.full_name || metadata.name || sessionUser.email?.split('@')[0] || 'User',
      'User'
    );
    const handleBase = safeText(
      (metadata.user_name || sessionUser.email || 'user')
        .split('@')[0]
        .replace(/[^a-z0-9-]/gi, '-')
        .toLowerCase(),
      'user'
    );

    return {
      name: fullName,
      handle: handleBase,
      signed: true,
      avatar: fullName.charAt(0).toUpperCase(),
      email: sessionUser.email || '',
      photoURL: metadata.avatar_url || metadata.picture || '',
      uid: sessionUser.id || ''
    };
  }

  function syncUserFromSession(sessionUser) {
    window.state = window.state || {};
    window.state.user = normalizeUser(sessionUser);
    if (typeof window.updateAuthUI === 'function') {
      window.updateAuthUI();
    }
  }

  function getAuthRedirectUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('auth', 'callback');
    return url.toString();
  }

  async function signUp(email, password) {
    if (!client) throw new Error('Supabase client is not initialized');

    const cleanEmail = safeText(email, '').toLowerCase();
    const cleanPassword = safeText(password, '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email.');
    }

    if (cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password: cleanPassword
    });

    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    if (!client) throw new Error('Supabase client is not initialized');

    const cleanEmail = safeText(email, '').toLowerCase();
    const cleanPassword = safeText(password, '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email.');
    }

    if (cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword
    });

    if (error) throw error;
    return data;
  }

  async function signInWithGoogle() {
    if (!client) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl()
      }
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!client) {
      syncUserFromSession(null);
      return;
    }

    const { error } = await client.auth.signOut();
    if (error) throw error;
    syncUserFromSession(null);
  }

  async function hydrate() {
    if (!client) {
      syncUserFromSession(null);
      return;
    }

    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      console.error('Supabase session error:', error);
      syncUserFromSession(null);
      return;
    }

    syncUserFromSession(session?.user || null);

    client.auth.onAuthStateChange((_event, nextSession) => {
      syncUserFromSession(nextSession?.user || null);
    });
  }

  return {
    client,
    hydrate,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    syncUserFromSession,
    normalizeUser
  };
})();
