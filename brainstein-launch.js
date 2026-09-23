(function () {
  'use strict';

  var APP_URL = './brainstein.html';
  var SUPABASE_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var AUTH_URL = './supabase-auth.js';
  var UI_URL = './auth-integration.js';

  function loadExternalScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('Unable to load ' + src));
      };
      document.body.appendChild(script);
    });
  }

  function loadInlineScript(source) {
    var script = document.createElement('script');
    script.textContent = source;
    document.body.appendChild(script);
  }

  function showError(error) {
    document.body.innerHTML = '';
    var main = document.createElement('main');
    main.style.cssText = 'font:16px system-ui,sans-serif;padding:2rem;max-width:42rem;margin:auto';
    var heading = document.createElement('h1');
    heading.textContent = 'Brainstein could not start';
    var paragraph = document.createElement('p');
    paragraph.textContent = error && error.message ? error.message : 'Unknown startup error.';
    main.appendChild(heading);
    main.appendChild(paragraph);
    document.body.appendChild(main);
  }

  function boot(source) {
    var parsed = new DOMParser().parseFromString(source, 'text/html');
    if (parsed.querySelector('parsererror')) {
      throw new Error('The Brainstein document could not be parsed.');
    }

    document.title = parsed.title || 'Brainstein';
    document.head.innerHTML = parsed.head.innerHTML;
    document.body.innerHTML = parsed.body.innerHTML;

    var scripts = Array.prototype.slice.call(document.querySelectorAll('script'));
    var firstApplicationScript = false;

    document.querySelectorAll('script').forEach(function (script) {
      script.remove();
    });

    var chain = Promise.resolve();
    scripts.forEach(function (original) {
      chain = chain.then(function () {
        var sourceText = original.textContent || '';
        var sourceUrl = original.getAttribute('src');

        if (!firstApplicationScript && !sourceUrl && sourceText.indexOf('BRAINSTEIN') !== -1) {
          firstApplicationScript = true;
          return loadExternalScript(SUPABASE_URL)
            .then(function () { return loadExternalScript(AUTH_URL); })
            .then(function () { return loadExternalScript(UI_URL); })
            .then(function () { loadInlineScript(sourceText); });
        }

        if (sourceUrl) return loadExternalScript(sourceUrl);
        if (sourceText.trim()) loadInlineScript(sourceText);
        return undefined;
      });
    });

    return chain;
  }

  fetch(APP_URL, { credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) throw new Error('Brainstein returned HTTP ' + response.status);
      return response.text();
    })
    .then(boot)
    .catch(showError);
})();
