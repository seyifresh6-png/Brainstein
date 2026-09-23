/* Brainstein auth UI bridge. */
(function () {
  'use strict';

  const DEFAULT_USER = { name: 'Guest Observer', handle: 'guest-observer', signed: false, avatar: 'G', email: '' };

  function ensureState() {
    if (!window.state || typeof window.state !== 'object') window.state = {};
    if (!window.state.user || typeof window.state.user !== 'object') window.state.user = { ...DEFAULT_USER };
    return window.state;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function updateAuthUI() {
    const user = ensureState().user;
    const signedIn = user.signed === true;
    document.querySelector('[data-auth="login"]')?.style && (document.querySelector('[data-auth="login"]').style.display = signedIn ? 'none' : '');
    document.querySelector('[data-auth="signup"]')?.style && (document.querySelector('[data-auth="signup"]').style.display = signedIn ? 'none' : '');
    document.getElementById('userChip')?.classList.toggle('on', signedIn);
    setText('chipName', signedIn ? user.name : 'Guest');
    setText('chipAv', signedIn ? (user.name || 'U').charAt(0).toUpperCase() : 'G');
    setText('popName', signedIn ? user.name : DEFAULT_USER.name);
    setText('popHdl', '@' + (signedIn ? user.handle || 'user' : DEFAULT_USER.handle));
    setText('popAv', signedIn ? (user.name || 'U').charAt(0).toUpperCase() : 'G');
  }

  function toast(message, icon) {
    if (typeof window.toast === 'function') window.toast(message, icon || 'check');
    else console.info(message);
  }

  function closeAuth() { document.getElementById('ovAuth')?.classList.remove('open'); }

  async function submitAuth() {
    const submit = document.getElementById('auSubmit');
    const email = document.getElementById('auEmail')?.value || '';
    const password = document.getElementById('auPass')?.value || '';
    const mode = (document.querySelector('.au-tabs button.on')?.dataset.tab || 'signup').toLowerCase();
    if (!window.supabaseAuth) return toast('Authentication is unavailable.', 'alert-circle');
    try {
      if (submit) { submit.disabled = true; submit.textContent = mode === 'login' ? 'Logging in…' : 'Creating account…'; }
      if (mode === 'login') {
        const result = await window.supabaseAuth.signIn(email, password);
        window.supabaseAuth.syncUserFromSession(result?.user || result?.session?.user);
        toast('Signed in successfully', 'check');
        closeAuth();
      } else {
        const result = await window.supabaseAuth.signUp(email, password);
        if (result?.user && !result.session) toast('Verification email sent. Check your inbox.', 'mail');
        else { toast('Account created successfully', 'check'); closeAuth(); }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      toast(error?.message || 'Authentication failed', 'alert-circle');
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = mode === 'login' ? 'Log in' : 'Create account'; }
    }
  }

  function bind() {
    ensureState();
    window.updateAuthUI = updateAuthUI;
    document.querySelectorAll('[data-auth="login"], [data-auth="signup"]').forEach((button) => button.addEventListener('click', () => {
      document.getElementById('ovAuth')?.classList.add('open');
      document.querySelector(`.au-tabs button[data-tab="${button.dataset.auth === 'login' ? 'login' : 'signup'}"]`)?.click();
    }));
    document.querySelectorAll('.au-tabs button').forEach((button) => button.addEventListener('click', () => {
      document.querySelectorAll('.au-tabs button').forEach((tab) => tab.classList.toggle('on', tab === button));
      const submit = document.getElementById('auSubmit');
      if (submit) submit.textContent = button.dataset.tab === 'login' ? 'Log in' : 'Create account';
    }));
    document.getElementById('auSubmit')?.addEventListener('click', submitAuth);
    document.querySelector('[data-oauth="Google"]')?.addEventListener('click', () => window.supabaseAuth?.signInWithGoogle().catch((error) => toast(error?.message || 'Google sign-in failed', 'alert-circle')));
    document.getElementById('userChip')?.addEventListener('click', async () => {
      const user = ensureState().user;
      if (user.signed && window.confirm(`Sign out ${user.name}?`)) { await window.supabaseAuth.signOut(); toast('Signed out', 'check'); }
    });
    updateAuthUI();
    window.supabaseAuth?.hydrate?.().catch((error) => console.error('Supabase hydration failed:', error));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
