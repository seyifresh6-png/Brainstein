window.supabaseAuth = (() => {
  const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

  const client = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }) : null;

  function safeText(value, fallback = 'Guest') {
    if (!value || !String(value).trim()) return fallback;
    return String(value).trim();
  }

  async function signInWithGoogle() {
    if (!client) {
      throw new Error('Supabase client is not initialized');
    }

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
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  function syncUserFromSession(sessionUser) {
    if (!sessionUser) {
      window.state = window.state || {};
      window.state.user = {
        name: 'Guest Observer',
        handle: 'guest-observer',
        signed: false,
        avatar: 'G',
        email: ''
      };
      return;
    }

    const fullName = safeText(sessionUser.user_metadata?.full_name, sessionUser.email?.split('@')[0] || 'User');
    const firstLetter = fullName.charAt(0).toUpperCase();

    window.state = window.state || {};
    window.state.user = {
      name: fullName,
      handle: safeText((sessionUser.user_metadata?.user_name || sessionUser.email || 'user').split('@')[0].replace(/[^a-z0-9-]/gi, '-').toLowerCase(), 'user'),
      signed: true,
      avatar: firstLetter,
      email: sessionUser.email || '',
      photoURL: sessionUser.user_metadata?.avatar_url || ''
    };
  }

  async function hydrate() {
    if (!client) return;
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      console.error('Supabase session error:', error);
      return;
    }

    syncUserFromSession(session?.user || null);

    client.auth.onAuthStateChange((event, session) => {
      syncUserFromSession(session?.user || null);
      if (typeof window.updateAuthUI === 'function') {
        window.updateAuthUI();
      }
    });
  }

  return {
    client,
    hydrate,
    signInWithGoogle,
    signOut,
    syncUserFromSession
  };
})();
