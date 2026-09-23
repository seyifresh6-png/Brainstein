/* Brainstein auth UI bridge.
 * Load this after supabase-auth.js and before the application's main script.
 */
(function () {
  'use strict';

  const DEFAULT_USER = {
    name: 'Guest Observer',
    handle: 'guest-observer',
    signed: false,
    avatar: 'G',
    email: ''
  };

  function ensureState() {
    if (!window.state || typeof window.state !== 'object') {
      window.state = {
        user: { ...DEFAULT_USER },
        view: 'home',
        channel: 'homework',
        theme: 'dark',
        lib: { q: '', cat: 'All', type: 'All' },
        peerUsed: {}
      };
    } else if (!window.state.user || typeof window.state.user !== 'object') {
      window.state.user = { ...DEFAULT_USER };
    }
    return window.state;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function updateAuthUI() {
    const user = ensureState().user;
    const signedIn = user.signed === true;
    const loginButton = document.querySelector('[data-auth="login"]');
    const signupButton = document.querySelector('[data-auth="signup"]');
    const userChip = document.getElementById('userChip');

    if (loginButton) loginButton.style.display = signedIn ? 'none' : '';
    if (signupButton) signupButton.style.display = signedIn ? 'none' : '';
    if (userChip) userChip.classList.toggle('on', signedIn);

    setText('chipName', signedIn ? user.name : 'Guest');
    setText('chipAv', signedIn ? (user.name || 'G').charAt(0).toUpperCase() : 'G');
    setText('popName', signedIn ? user.name : DEFAULT_USER.name);
    setText('popHdl', '@' + (signedIn ? user.handle || 'user' : DEFAULT_USER.handle));
    setText('popAv', signedIn ? (user.name || 'G').charAt(0).toUpperCase() : 'G');
  }

  function toast(message, icon) {
    if (typeof window.toast === 'function') {
      window.toast(message, icon || 'check');
      return;
    }
    console.info(message);
  }

  function closeAuth() {
    const overlay = document.getElementById('ovAuth');
    if (overlay) overlay.classList.remove('open');
  }

  async function submitAuth() {
    const submit = document.getElementById('auSubmit');
    const email = document.getElementById('auEmail')?.value || '';
    const password = document.getElementById('auPass')?.value || '';
    const selectedTab = document.querySelector('.au-tabs button.on');
    const mode = (selectedTab?.dataset.tab || 'signup').toLowerCase();

    if (!window.supabaseAuth) {
      toast('Authentication is unavailable.', 'alert-circle');
      return;
    }

    try {
      if (submit) {
        submit.disabled = true;
        submit.textContent = mode === 'login' ? 'Logging in…' : 'Creating account…';
      }

      if (mode === 'login') {
        await window.supabaseAuth.signIn(email, password);
        toast('Signed in successfully', 'check');
        closeAuth();
      } else {
        const result = await window.supabaseAuth.signUp(email, password);
        if (result?.user && !result.session) {
          toast('Verification email sent. Check your inbox.', 'mail');
        } else {
          toast('Account created successfully', 'check');
          closeAuth();
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      toast(error?.message || 'Authentication failed', 'alert-circle');
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = mode === 'login' ? 'Log in' : 'Create account';
      }
    }
  }

  function bind() {
    ensureState();
    window.updateAuthUI = updateAuthUI;

    document.querySelectorAll('[data-auth="login"], [data-auth="signup"]').forEach((button) => {
      button.addEventListener('click', () => {
        const overlay = document.getElementById('ovAuth');
        if (overlay) overlay.classList.add('open');
        const mode = button.dataset.auth === 'login' ? 'login' : 'signup';
        const tab = document.querySelector(`.au-tabs button[data-tab="${mode}"]`);
        if (tab) tab.click();
      });
    });

    document.querySelectorAll('.au-tabs button').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.au-tabs button').forEach((tab) => {
          tab.classList.toggle('on', tab === button);
        });
        const submit = document.getElementById('auSubmit');
        if (submit) submit.textContent = button.dataset.tab === 'login' ? 'Log in' : 'Create account';
      });
    });

    document.getElementById('auSubmit')?.addEventListener('click', submitAuth);
    document.querySelector('[data-oauth="Google"]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      try {
        button.disabled = true;
        button.textContent = 'Connecting…';
        await window.supabaseAuth.signInWithGoogle();
      } catch (error) {
        console.error('Google authentication failed:', error);
        toast(error?.message || 'Google sign-in failed', 'alert-circle');
      } finally {
        button.disabled = false;
        button.textContent = 'Continue with Google';
      }
    });

    document.getElementById('userChip')?.addEventListener('click', async () => {
      const user = ensureState().user;
      if (!user.signed) return;
      if (!window.confirm(`Sign out ${user.name}?`)) return;
      try {
        await window.supabaseAuth.signOut();
        document.getElementById('profilePop')?.classList.remove('open');
        toast('Signed out', 'check');
      } catch (error) {
        console.error('Sign-out failed:', error);
        toast(error?.message || 'Could not sign out', 'alert-circle');
      }
    });

    updateAuthUI();
    window.supabaseAuth?.hydrate?.().catch((error) => {
      console.error('Supabase hydration failed:', error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
