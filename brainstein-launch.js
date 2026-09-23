(function () {
  'use strict';

  var APP_URL = './brainstein.html';
  var SUPABASE_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var AUTH_URL = './supabase-auth.js';
  var UI_URL = './auth-integration.js';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('Unable to load ' + src));
      };
      document.head.appendChild(script);
    });
  }

  function showError(error) {
    document.body.innerHTML = '';
    var message = document.createElement('main');
    message.style.cssText = 'font:16px system-ui,sans-serif;padding:2rem;max-width:42rem;margin:auto';
    message.innerHTML = '<h1>Brainstein could not start</h1><p></p>';
    message.querySelector('p').textContent = error.message;
    document.body.appendChild(message);
  }

  function bootApp(html) {
    var parser = new DOMParser();
    var documentFragment = parser.parseFromString(html, 'text/html');
    var base = document.createElement('base');
    base.href = new URL('./', window.location.href).href;
    document.head.appendChild(base);

    document.title = documentFragment.title || 'Brainstein';
    document.head.insertAdjacentHTML('afterbegin', documentFragment.head.innerHTML);
    document.body.innerHTML = documentFragment.body.innerHTML;

    return loadScript(SUPABASE_URL)
      .then(function () { return loadScript(AUTH_URL); })
      .then(function () { return loadScript(UI_URL); })
      .then(function () {
        var scripts = Array.prototype.slice.call(document.querySelectorAll('script[data-brainstein-app]'));
        return Promise.all(scripts.map(function (script) {
          return loadScript(script.src);
        }));
      });
  }

  fetch(APP_URL, { credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) throw new Error('Brainstein returned HTTP ' + response.status);
      return response.text();
    })
    .then(bootApp)
    .catch(showError);
})();
