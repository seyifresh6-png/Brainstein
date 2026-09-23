/* Brainstein Supabase authentication helper.
 * Use only the anon/publishable key in browser code.
 * Never expose a Supabase service_role/secret key here.
 */
window.BRAINSTEIN_CONFIG = window.BRAINSTEIN_CONFIG || {
  supabaseUrl: 'https://vpsehljhihkwruqeanod.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ2cHNlaGxqaGloa3dydXFyZWFub2QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4ODk4OTgwOSwiZXhwIjoyMTA0NTY1ODA5fQ.tqc8vTgAfuY2x0VvM63n58s1wD7f9sh7slTQ0H4w4-Q'
};

window.supabaseAuth = (() => {
  const config = window.BRAINSTEIN_CONFIG || {};

  function safeText(value, fallback = 'Guest') {
    if (value === null || value === undefined || !String(value).trim()) return fallback;
    return String(value).trim();
  }

  function nameFromEmail(email) {
    const localPart = safeText(email, 'user').split('@')[0];
    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'User';
  }

  const SUPABASE_URL = safeText(config.supabaseUrl, 'https://YOUR_PROJECT_REF.supabase.co');
  const SUPABASE_ANON_KEY = safeText(config.supabaseAnonKey, 'YOUR_SUPABASE_ANON_KEY');
  const client = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  function ensureState() {
    if (!window.state || typeof window.state !== 'object') window.state = {};
    if (!window.state.user || typeof window.state.user !== 'object') {
      window.state.user = { name: 'Guest Observer', handle: 'guest-observer', signed: false, avatar: 'G', email: '' };
    }
    return window.state;
  }

  function normalizeUser(sessionUser) {
    if (!sessionUser) {
      return { name: 'Guest Observer', handle: 'guest-observer', signed: false, avatar: 'G', email: '' };
    }

    const metadata = sessionUser.user_metadata || {};
    const email = sessionUser.email || '';
    const fullName = safeText(metadata.full_name || metadata.name || nameFromEmail(email), 'User');
    const handleBase = safeText(
      (metadata.user_name || email || 'user').split('@')[0].replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
      'user'
    );

    return {
      name: fullName,
      handle: handleBase,
      signed: true,
      avatar: fullName.charAt(0).toUpperCase(),
      email,
      photoURL: metadata.avatar_url || metadata.picture || '',
      uid: sessionUser.id || ''
    };
  }

  function syncUserFromSession(sessionUser) {
    const state = ensureState();
    state.user = normalizeUser(sessionUser);
    if (typeof window.updateAuthUI === 'function') window.updateAuthUI();
  }

  function getAuthRedirectUrl() {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    url.searchParams.set('auth', 'callback');
    return url.toString();
  }

  function validateCredentials(email, password) {
    const cleanEmail = safeText(email, '').toLowerCase();
    const cleanPassword = safeText(password, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Please enter a valid email.');
    if (cleanPassword.length < 6) throw new Error('Password must be at least 6 characters.');
    return { cleanEmail, cleanPassword };
  }

  async function signUp(email, password) {
    if (!client) throw new Error('Supabase client is not initialized');
    const credentials = validateCredentials(email, password);
    const { data, error } = await client.auth.signUp({
      email: credentials.cleanEmail,
      password: credentials.cleanPassword,
      options: { data: { full_name: nameFromEmail(credentials.cleanEmail) } }
    });
    if (error) throw error;
    if (data?.user && data.session) syncUserFromSession(data.user);
    return data;
  }

  async function signIn(email, password) {
    if (!client) throw new Error('Supabase client is not initialized');
    const credentials = validateCredentials(email, password);
    const { data, error } = await client.auth.signInWithPassword(credentials);
    if (error) throw error;
    syncUserFromSession(data?.user || data?.session?.user);
    return data;
  }

  async function signInWithGoogle() {
    if (!client) throw new Error('Supabase client is not initialized');
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getAuthRedirectUrl() } });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!client) { syncUserFromSession(null); return; }
    const { error } = await client.auth.signOut();
    if (error) throw error;
    syncUserFromSession(null);
  }

  async function hydrate() {
    ensureState();
    if (!client) { syncUserFromSession(null); return; }
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      syncUserFromSession(data?.session?.user || null);
      client.auth.onAuthStateChange((_event, nextSession) => syncUserFromSession(nextSession?.user || null));
    } catch (error) {
      console.error('Supabase session hydration failed:', error);
      syncUserFromSession(null);
    }
  }

  return { client, hydrate, signIn, signUp, signInWithGoogle, signOut, syncUserFromSession, normalizeUser };
})();
