// The Codex of Reliquary: what every page does (stars, menus, search over the whole site, flipbooks,
// carousels, lightbox, the progress bar and the "on this page" list).
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stars: a slow field, some twinkling, now and then a shooting one.
  const cv = $('#stars');
  if (cv) {
    const cx = cv.getContext('2d');
    let W, H, stars = [], shooting = [], mx = 0, my = 0;
    const resize = () => { W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio;
      stars = Array.from({length: Math.min(240, (innerWidth * innerHeight) / 5500)}, () => ({x: Math.random() * W, y: Math.random() * H,
        r: (Math.random() * 1.3 + .2) * devicePixelRatio, p: Math.random() * 6.28, s: .4 + Math.random() * 1.2, d: Math.random() * .6 + .2})); };
    resize(); addEventListener('resize', resize);
    addEventListener('mousemove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
    const draw = t => {
      cx.clearRect(0, 0, W, H);
      for (const s of stars) {
        const a = .35 + .65 * Math.abs(Math.sin(t / 1000 * s.s + s.p));
        cx.fillStyle = `rgba(255,${230 + (s.p * 4 | 0)},${200 + (s.p * 8 | 0)},${a})`;
        cx.beginPath(); cx.arc(s.x + mx * 30 * s.d * devicePixelRatio, s.y + my * 30 * s.d * devicePixelRatio, s.r, 0, 6.28); cx.fill();
      }
      if (Math.random() < .005) shooting.push({x: Math.random() * W, y: Math.random() * H * .5, l: 1});
      shooting = shooting.filter(s => (s.l -= .018) > 0);
      for (const s of shooting) {
        const g = cx.createLinearGradient(s.x, s.y, s.x - 160, s.y - 60);
        g.addColorStop(0, `rgba(255,236,190,${s.l})`); g.addColorStop(1, 'rgba(255,236,190,0)');
        cx.strokeStyle = g; cx.lineWidth = 2 * devicePixelRatio; cx.beginPath(); cx.moveTo(s.x, s.y); cx.lineTo(s.x - 160, s.y - 60); cx.stroke();
        s.x += 14 * devicePixelRatio; s.y += 5 * devicePixelRatio;
      }
      if (!still) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  // The home page's slideshow and counters.
  const slides = $$('.slide'); let si = 0;
  if (slides.length > 1 && !still) setInterval(() => { slides[si].classList.remove('on'); si = (si + 1) % slides.length; slides[si].classList.add('on'); }, 7000);
  const countUp = el => { const n = +el.dataset.count, t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); };

  // Reveal on scroll.
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('in');
    if (e.target.dataset.count) countUp(e.target); io.unobserve(e.target); }), {rootMargin: '0px 0px -8% 0px'});
  $$('.reveal, [data-count]').forEach(el => io.observe(el));

  // Progress bar and back to top.
  const top = $('.to-top'), bar = $('#progress');
  const onScroll = () => { const h = document.documentElement, span = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.width = (span > 0 ? h.scrollTop / span * 100 : 0) + '%';
    if (top) top.classList.toggle('show', h.scrollTop > innerHeight * .8); };
  addEventListener('scroll', onScroll, {passive: true}); onScroll();

  // "On this page": the chapter's sub-headings, the one being read lit.
  const onpage = $$('.onpage a');
  if (onpage.length) {
    const byId = new Map(onpage.map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return;
      onpage.forEach(a => a.classList.remove('active')); byId.get(e.target.id)?.classList.add('active'); }), {rootMargin: '-20% 0px -70% 0px'});
    $$('.chap-body h3[id]').forEach(h => spy.observe(h));
  }

  // Menus: hover on a desktop, a tap anywhere; the drawer on small screens.
  $$('.dd > .navlink').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const dd = b.parentElement, was = dd.classList.contains('open');
    $$('.dd.open').forEach(d => d.classList.remove('open')); if (!was) dd.classList.add('open'); }));
  addEventListener('click', e => { if (!e.target.closest('.dd')) $$('.dd.open').forEach(d => d.classList.remove('open')); });
  const drawer = $('.drawer'), burger = $('.burger');
  burger?.addEventListener('click', () => { const open = drawer.classList.toggle('open'); burger.textContent = open ? '✕' : '☰'; document.body.style.overflow = open ? 'hidden' : ''; });

  // Flipbooks: frames played in turn, a scrubber, play and pause.
  $$('.flipbook').forEach(fb => {
    const imgs = $$('.frames img', fb), scrub = $('.fb-scrub', fb), play = $('.fb-play', fb); let i = 0, on = true, seen = false;
    const show = k => { imgs[i].classList.remove('on'); i = k; imgs[i].classList.add('on'); scrub.value = i; };
    new IntersectionObserver(es => { seen = es[0].isIntersecting; }).observe(fb);
    setInterval(() => { if (on && seen && !still) show((i + 1) % imgs.length); }, +fb.dataset.speed || 700);
    scrub.addEventListener('input', () => { on = false; play.textContent = '▶'; show(+scrub.value); });
    play.addEventListener('click', () => { on = !on; play.textContent = on ? '❚❚' : '▶'; });
  });

  // Carousels.
  $$('.carousel').forEach(c => { const tr = $('.car-track', c);
    $('.car-prev', c).addEventListener('click', () => tr.scrollBy({left: -tr.clientWidth * .9, behavior: 'smooth'}));
    $('.car-next', c).addEventListener('click', () => tr.scrollBy({left: tr.clientWidth * .9, behavior: 'smooth'})); });

  // Lightbox over every picture that can be zoomed.
  const zooms = $$('a.zoom'), lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap'); let zi = 0;
  const open = k => { zi = (k + zooms.length) % zooms.length; const a = zooms[zi]; lbImg.src = a.getAttribute('href');
    lbImg.classList.toggle('pix', /\.png$/.test(a.getAttribute('href'))); lbCap.textContent = a.dataset.caption || ''; lb.hidden = false; };
  zooms.forEach((a, k) => a.addEventListener('click', e => { e.preventDefault(); open(k); }));
  if (lb) {
    $('.lb-close').addEventListener('click', () => lb.hidden = true);
    $('.lb-prev').addEventListener('click', () => open(zi - 1));
    $('.lb-next').addEventListener('click', () => open(zi + 1));
    lb.addEventListener('click', e => { if (e.target === lb) lb.hidden = true; });
  }

  // Search: the whole site (assets/search-index.js), page by page and heading by heading.
  const search = $('#search'), input = $('#search-input'), results = $('#search-results');
  const index = window.CODEX_INDEX || [];
  let sel = 0, hits = [];
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
    sel = 0;
    const mark = s => { let out = escape(s);
      for (const w of words) out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); return out; };
    results.innerHTML = hits.map((h, k) => `<li class="${k ? '' : 'sel'}"><a href="${h.e.u}"><b>${escape(h.e.t)}</b><em>${escape(h.e.p)}</em>`
      + `<small>${h.snip ? '…' + mark(h.snip) + '…' : ''}</small></a></li>`).join('') || '<li><a><small>Rien de tel dans le Codex.</small></a></li>';
  };
  const openSearch = () => { if (!search) return; search.hidden = false; input.value = ''; render(''); setTimeout(() => input.focus(), 30); };
  if (search) {
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', e => {
      const items = $$('li', results);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[sel]?.classList.remove('sel');
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[sel]?.classList.add('sel'); items[sel]?.scrollIntoView({block: 'nearest'}); }
      if (e.key === 'Enter' && hits[sel]) { search.hidden = true; location.href = hits[sel].e.u; }
    });
    search.addEventListener('click', e => { if (e.target === search) search.hidden = true; });
    results.addEventListener('click', () => search.hidden = true);
  }
  $$('[data-search]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); drawer?.classList.remove('open'); openSearch(); }));
  addEventListener('keydown', e => {
    const typing = /input|textarea|select/i.test(document.activeElement?.tagName || '');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' || e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') { if (search) search.hidden = true; if (lb) lb.hidden = true; $$('.dd.open').forEach(d => d.classList.remove('open')); }
    if (lb && !lb.hidden && e.key === 'ArrowRight') open(zi + 1);
    if (lb && !lb.hidden && e.key === 'ArrowLeft') open(zi - 1);
    // Arrows between chapters, as in a book.
    if (!typing && (!lb || lb.hidden) && (!search || search.hidden) && e.altKey) {
      if (e.key === 'ArrowRight' && $('.pager a.next')) location.href = $('.pager a.next').href;
      if (e.key === 'ArrowLeft' && $('.pager a.prev')) location.href = $('.pager a.prev').href;
    }
  });
})();
