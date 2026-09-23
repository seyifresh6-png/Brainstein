(function () {
  'use strict';

  var APP_URL = './brainstein.html';

  function showError(error) {
    document.body.innerHTML = '';
    var main = document.createElement('main');
    main.style.cssText = 'font:16px system-ui,sans-serif;padding:2rem;max-width:42rem;margin:auto;line-height:1.6;';

    var title = document.createElement('h1');
    title.textContent = 'Brainstein could not start';
    title.style.marginBottom = '0.75rem';

    var paragraph = document.createElement('p');
    paragraph.textContent = error && error.message ? error.message : 'Unknown startup error.';
    paragraph.style.color = '#b9bec9';

    main.appendChild(title);
    main.appendChild(paragraph);
    document.body.appendChild(main);
  }

  function boot(source) {
    var cleaned = source.trim();
    if (!cleaned) {
      throw new Error('Brainstein HTML is empty.');
    }

    document.open();
    document.write(cleaned);
    document.close();
  }

  fetch(APP_URL, { credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Brainstein returned HTTP ' + response.status);
      }
      return response.text();
    })
    .then(boot)
    .catch(showError);
})();





















































































