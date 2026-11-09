/* Applies the stored appearance before first paint (no theme flash).
   Only a UI preference is read here - never any token or credential. */
(function () {
  try {
    var pref = localStorage.getItem('toshakino.appearance');
    if (pref !== 'light' && pref !== 'dark') pref = 'system';
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
