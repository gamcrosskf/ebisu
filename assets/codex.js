// The Codex of Ebisu: what every page does (menus, search over the whole site, flipbooks,
// carousels, lightbox, the progress bar and the "on this page" list).
// Accessible (RGAA 4.1): every control works from the keyboard and says its state, the search and
// the lightbox are dialogs that keep the focus and give it back, and the only things that move, the
// flipbooks, each have their pause (and stay still when the system asks to reduce motion).
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  let still = root.classList.contains('still');

  // Progress bar and back to top.
  const top = $('.to-top'), bar = $('#progress');
  const onScroll = () => { const h = document.documentElement, span = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.width = (span > 0 ? h.scrollTop / span * 100 : 0) + '%';
    if (top) top.classList.toggle('show', h.scrollTop > innerHeight * .8); };
  addEventListener('scroll', onScroll, {passive: true}); onScroll();

  // "On this page": the chapter's sub-headings, the one being read lit.
  const onpage = $$('.onpage a');
  if (onpage.length) {
    const byId = new Map(onpage.map(a => [decodeURIComponent(a.getAttribute('href').slice(1)), a]));
    const spy = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return;
      onpage.forEach(a => a.classList.remove('active')); byId.get(e.target.id)?.classList.add('active'); }), {rootMargin: '-20% 0px -70% 0px'});
    byId.forEach((a, id) => { const h = document.getElementById(id); if (h) spy.observe(h); });
  }

  // Flipbooks: frames played in turn, a scrubber, play and pause.
  const books = $$('.flipbook').map(fb => {
    const imgs = $$('.frames img', fb), scrub = $('.fb-scrub', fb), play = $('.fb-play', fb); let i = 0, on = !still, seen = false;
    const show = k => { imgs[i].classList.remove('on'); i = k; imgs[i].classList.add('on'); scrub.value = i;
      scrub.setAttribute('aria-valuetext', 'Image ' + (i + 1) + ' sur ' + imgs.length); };
    const playing = v => { on = v; $('span', play).textContent = on ? '❚❚' : '▶';
      play.setAttribute('aria-label', on ? 'Mettre en pause l\'animation' : 'Lire l\'animation'); };
    playing(on);
    new IntersectionObserver(es => { seen = es[0].isIntersecting; }).observe(fb);
    setInterval(() => { if (on && seen) show((i + 1) % imgs.length); }, +fb.dataset.speed || 700);
    scrub.addEventListener('input', () => { playing(false); show(+scrub.value); });
    play.addEventListener('click', () => playing(!on));
    return playing;
  });

  // Chronicle pages: a button turns each one over.
  $$('.pc-flip').forEach(b => b.addEventListener('click', () => { const v = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(v)); b.closest('.page-card').classList.toggle('flipped', v); }));

  // Menus: a button opens each (Enter, Space or a click), Échap closes it; the mouse may also hover.
  const dds = $$('.dd');
  const shut = (dd, focus) => { dd.classList.remove('open'); const b = $('button', dd); b.setAttribute('aria-expanded', 'false'); if (focus) b.focus(); };
  dds.forEach(dd => {
    const b = $('button', dd);
    // A click of the mouse (detail > 0) only previews the menu, like the hover: it closes when the pointer
    // leaves. Opened from the keyboard (Enter, Space: detail 0), it stays until Échap or the focus moves on.
    b.addEventListener('click', e => { e.stopPropagation(); const was = dd.classList.contains('open'); dds.forEach(d => shut(d));
      if (!was) { dd.classList.add('open'); b.setAttribute('aria-expanded', 'true'); dd.byMouse = e.detail > 0; } });
    dd.addEventListener('focusout', e => { if (!dd.contains(e.relatedTarget)) shut(dd); });
    dd.addEventListener('mouseleave', () => { dd.classList.remove('hushed'); if (dd.byMouse && dd.classList.contains('open')) shut(dd); });
  });
  addEventListener('click', e => { if (!e.target.closest('.dd')) dds.forEach(d => shut(d)); });

  // The drawer, on small screens.
  const drawer = $('.drawer'), burger = $('.burger');
  const setDrawer = open => { if (!drawer) return; drawer.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open));
    $('span', burger).textContent = open ? '✕' : '☰'; document.body.style.overflow = open ? 'hidden' : ''; };
  burger?.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
  addEventListener('resize', () => { if (drawer?.classList.contains('open') && getComputedStyle(burger).display === 'none') setDrawer(false); });

  // Dialogs (the search, the lightbox): the focus goes in, stays in, and comes back where it was.
  const openDialog = (d, first) => { if (d.hidden) { d.opener = document.activeElement; d.hidden = false; } first.focus(); };
  const closeDialog = d => { if (!d || d.hidden) return; d.hidden = true; if (d.opener && document.contains(d.opener)) d.opener.focus(); };
  const openOne = () => [$('#search'), $('#lightbox')].find(d => d && !d.hidden);
  addEventListener('keydown', e => {
    const d = e.key === 'Tab' && openOne();
    if (!d) return;
    const f = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', d).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  // Carousels.
  $$('.carousel').forEach(c => { const tr = $('.car-track', c);
    $('.car-prev', c).addEventListener('click', () => tr.scrollBy({left: -tr.clientWidth * .9, behavior: still ? 'auto' : 'smooth'}));
    $('.car-next', c).addEventListener('click', () => tr.scrollBy({left: tr.clientWidth * .9, behavior: still ? 'auto' : 'smooth'})); });

  // Releases: one button folds or unfolds every version.
  const all = $('.rel-all');
  if (all) all.addEventListener('click', () => {
    const open = all.dataset.open !== '1';
    $$('.rel-card').forEach(d => { d.open = open; });
    all.dataset.open = open ? '1' : '0';
    all.textContent = open ? 'Tout replier' : 'Tout déplier';
  });
  // A link to a version opens its card.
  $$('.rel-nav a').forEach(a => a.addEventListener('click', () => { const d = $(a.getAttribute('href') + ' details'); if (d) d.open = true; }));
  // Lightbox over every picture that can be zoomed.
  const zooms = $$('a.zoom'), lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap'); let zi = 0;
  const show = k => { zi = (k + zooms.length) % zooms.length; const a = zooms[zi]; lbImg.src = a.getAttribute('href');
    lbImg.classList.toggle('pix', /\.png$/.test(a.getAttribute('href'))); lbImg.alt = lbCap.textContent = a.dataset.caption || ''; };
  zooms.forEach((a, k) => a.addEventListener('click', e => { e.preventDefault(); show(k); openDialog(lb, $('.lb-close', lb)); }));
  if (lb) {
    $('.lb-close', lb).addEventListener('click', () => closeDialog(lb));
    $('.lb-prev', lb).addEventListener('click', () => show(zi - 1));
    $('.lb-next', lb).addEventListener('click', () => show(zi + 1));
    lb.addEventListener('click', e => { if (e.target === lb) closeDialog(lb); });
    // The arrows only work while the lightbox is open (no single-key shortcut elsewhere, RGAA 12.10).
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(zi + 1); if (e.key === 'ArrowLeft') show(zi - 1); });
  }

  // Search: the whole site (assets/search-index.js), page by page and heading by heading.
  const search = $('#search'), input = $('#search-input'), results = $('#search-results'), count = $('#search-count');
  const index = window.CODEX_INDEX || [];
  let hits = [], countTimer = 0;
  const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  index.forEach(e => { e.n = norm(e.x); e.nt = norm(e.t); });
  const escape = s => s.replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
  const render = q => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    hits = !words.length ? index.filter(e => !e.u.includes('#')).slice(0, 12).map(e => ({e, snip: ''})) : index.map(e => {
      if (!words.every(w => e.n.includes(w) || e.nt.includes(w))) return null;
      const at = Math.max(0, e.n.indexOf(words[0]));
      return {e, snip: e.x.slice(Math.max(0, at - 50), at + 120), score: words.filter(w => e.nt.includes(w)).length * 10 + (e.u.includes('#') ? 1 : 3)};
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 16);
    const mark = s => { let out = escape(s);
      for (const w of words) out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); return out; };
    results.innerHTML = hits.map(h => `<li><a href="${h.e.u}"><b>${escape(h.e.t)}</b> <em>${escape(h.e.p)}</em>`
      + `<small>${h.snip ? '…' + mark(h.snip) + '…' : ''}</small></a></li>`).join('') || '<li class="none">Rien de tel dans le Codex.</li>';
    // The number of results is said once the typing pauses, not at every letter.
    clearTimeout(countTimer);
    countTimer = setTimeout(() => { count.textContent = !words.length ? '' : hits.length ? hits.length + ' résultat' + (hits.length > 1 ? 's' : '')
      + ' : flèche bas pour les parcourir.' : 'Aucun résultat.'; }, 600);
  };
  const openSearch = () => { if (!search) return; input.value = ''; render(''); count.textContent = ''; openDialog(search, input); };
  if (search) {
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); $('a', results)?.focus(); }
      if (e.key === 'Enter' && hits[0]) { e.preventDefault(); location.href = hits[0].e.u; closeDialog(search); }
    });
    results.addEventListener('keydown', e => {
      const links = $$('a', results), k = links.indexOf(document.activeElement);
      if (k < 0 || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      if (e.key === 'ArrowUp' && k === 0) input.focus(); else links[Math.min(links.length - 1, k + (e.key === 'ArrowDown' ? 1 : -1))].focus();
    });
    search.addEventListener('click', e => { if (e.target === search) closeDialog(search); });
    $('.search-close', search).addEventListener('click', () => closeDialog(search));
    // A result on this very page only moves the page: the dialog closes without handing the focus back to the button.
    results.addEventListener('click', e => { if (e.target.closest('a')) { search.opener = null; search.hidden = true; } });
  }
  $$('[data-search]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); setDrawer(false); openSearch(); }));

  addEventListener('keydown', e => {
    const typing = /input|textarea|select/i.test(document.activeElement?.tagName || '');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') {
      const d = openOne();
      if (d) { closeDialog(d); return; }
      const dd = dds.find(x => x.classList.contains('open'));
      if (dd) { shut(dd, dd.contains(document.activeElement)); return; }
      // A menu shown by the hover is dismissed too, without moving the mouse (RGAA 10.13).
      dds.forEach(x => { if (x.matches(':hover')) x.classList.add('hushed'); });
      if (drawer?.classList.contains('open')) { setDrawer(false); burger.focus(); }
    }
    // Arrows between chapters, as in a book (with Alt: never a single key).
    if (!typing && !openOne() && e.altKey) {
      if (e.key === 'ArrowRight' && $('.pager a.next')) location.href = $('.pager a.next').href;
      if (e.key === 'ArrowLeft' && $('.pager a.prev')) location.href = $('.pager a.prev').href;
    }
  });
})();
