// The ticket page: a bug, a crash, an idea or any message, sent by mail through Web3Forms
// (https://web3forms.com), straight from the browser. The form changes with the kind of ticket:
// what is shown ([data-for]), what the labels say ([data-text-<kind>], [data-ph-<kind>]), what is
// asked for (a log for a crash). Only what is shown is sent. The access key is public by design:
// it only lets a page send mail to the address it was made for. The draft and the list of sent
// tickets stay in this browser.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const form = $('#ticket');
  if (!form) return;
  const KEY = form.dataset.key || '';
  const LOG_MAX = 30000;
  const DRAFT = 'ebisu.ticket.draft', SENT = 'ebisu.ticket.sent';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window: nothing kept */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* idem */ } },
  };
  const send = $('#send'), status = $('#status'), logArea = $('#t-log'), detected = $('#detected'), rest = $('#rest');
  const texts = ['t-title', 't-desc', 't-why', 't-fix', 't-steps', 't-shot', 't-log', 't-name', 't-email'];
  const groups = ['type', 'where', 'moment', 'balance', 'severity', 'importance'];
  let version = form.dataset.version || '';

  const TIPS = {
    bug: ['Un titre qui dit ce qui casse.', 'Ce que vous faisiez juste avant.', 'Ce qui aurait dû se passer.', 'Le log, si une erreur s\'affiche.'],
    crash: ['Le log : sans lui, un crash est presque impossible à corriger.', 'Le moment exact du plantage.', 'Ce que vous veniez de faire.'],
    idee: ['Une seule idée par ticket.', 'Comment elle marcherait en jeu.', 'Pourquoi elle rendrait le jeu plus fun.'],
    equilibrage: ['Ce qui est trop fort ou trop faible, et face à quoi.', 'Des chiffres, si vous en avez.', 'Ce que vous changeriez.'],
    visuel: ['Le bloc, l\'objet ou le menu concerné.', 'Un lien vers une capture d\'écran.', 'Avec ou sans pack de shaders ?'],
    autre: ['Un titre clair.', 'Votre pseudo et un mail si vous attendez une réponse.'],
  };

  // Without a key the form still fills, and its text can be copied; it cannot be sent.
  if (!KEY) { $('.config-warn').hidden = false; send.disabled = true; }
  // Opened as a file, the page may not send anything: browsers keep a file away from the network.
  if (KEY && location.protocol === 'file:') {
    const w = $('.config-warn'); w.hidden = false;
    w.textContent = 'Cette page est ouverte comme un fichier : le navigateur refuse alors l\'envoi. Ouvrez le Codex depuis son adresse en ligne '
      + 'pour envoyer le ticket ; ici, « Copier le ticket » fonctionne.';
  }

  const value = name => form.querySelector(`input[name=${name}]:checked`)?.value || '';
  const label = name => { const r = form.querySelector(`input[name=${name}]:checked`); return r ? ($('b', r.nextElementSibling) || r.nextElementSibling).textContent.trim() : ''; };
  const shown = el => !el.closest('[hidden]');

  // The form for one kind of ticket.
  function adapt() {
    const kind = value('type');
    rest.hidden = !kind;
    $('#pick-first').hidden = !!kind;
    if (!kind) { $$('.ticket-side [data-for]').forEach(el => el.hidden = true); return; }
    $$('[data-for]').forEach(el => el.hidden = !el.dataset.for.split(' ').includes(kind));
    $$('[data-text-' + kind + ']').forEach(el => el.textContent = el.getAttribute('data-text-' + kind));
    $$('[data-ph-' + kind + ']').forEach(el => el.placeholder = el.getAttribute('data-ph-' + kind));
    $$('.when-crash').forEach(el => el.hidden = kind !== 'crash');
    $$('.when-bug').forEach(el => el.hidden = kind === 'crash');
    // The log is asked for, not just welcome, when the game crashes.
    if (kind === 'crash') logArea.setAttribute('aria-required', 'true'); else logArea.removeAttribute('aria-required');
    // The steps counted again, as some come and go.
    let n = 1;
    $$('.step-title .st-num').forEach(s => { if (shown(s)) s.textContent = n++; });
    $('#tips').innerHTML = '';
    (TIPS[kind] || []).forEach(t => { const li = document.createElement('li'); li.textContent = t; $('#tips').appendChild(li); });
    $$('.field.invalid input, .field.invalid textarea').forEach(el => mark(el, ''));
    say('');
  }

  // An error is written under its field and tied to it (RGAA 11.10), not only drawn in red.
  function mark(input, message) {
    const field = input.closest('.field'), err = field && $('.err-msg', field);
    if (field) field.classList.toggle('invalid', !!message);
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    if (err) { err.textContent = message; err.hidden = !message; }
  }
  form.addEventListener('change', e => { if (e.target.name !== 'type') return; adapt();
    if (!document.documentElement.classList.contains('still')) rest.animate?.([{opacity: 0, transform: 'translateY(10px)'}, {opacity: 1, transform: 'none'}], 350); });

  // The draft: kept as it is typed, given back on the next visit.
  const draft = store.get(DRAFT, null);
  if (draft) {
    texts.forEach(id => { if (draft[id] != null && $('#' + id)) $('#' + id).value = draft[id]; });
    groups.forEach(n => { const r = draft[n] && form.querySelector(`input[name=${n}][value="${CSS.escape(draft[n])}"]`); if (r) r.checked = true; });
    if (draft.version) version = draft.version;
  }
  adapt();
  if (logArea.value) analyse(logArea.value);
  const keep = () => { const d = {version}; texts.forEach(id => d[id] = $('#' + id).value); groups.forEach(n => d[n] = value(n)); store.set(DRAFT, d); };
  form.addEventListener('input', keep); form.addEventListener('change', keep);

  // Counters under the long fields.
  $$('[data-max]').forEach(el => { const c = el.parentElement.querySelector('.counter');
    const upd = () => c && (c.textContent = el.value.length + ' / ' + el.dataset.max); el.addEventListener('input', upd); upd(); });

  // The log: dropped, chosen or pasted, cut to its end, and read for what went wrong.
  const drop = $('#drop'), file = $('#t-file');
  drop.addEventListener('click', () => file.click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => e.dataTransfer.files[0] && read(e.dataTransfer.files[0]));
  file.addEventListener('change', () => file.files[0] && read(file.files[0]));
  logArea.addEventListener('input', () => analyse(logArea.value));
  function read(f) {
    const r = new FileReader();
    r.onload = () => { setLog(String(r.result)); $('#drop b').textContent = '✓ ' + f.name + ' (' + Math.round(f.size / 1024) + ' Ko)'; keep(); };
    r.readAsText(f);
  }
  function setLog(text) {
    if (text.length > LOG_MAX) text = '[… début coupé : ' + (text.length - LOG_MAX) + ' caractères …]\n' + text.slice(-LOG_MAX);
    logArea.value = text; analyse(text);
  }
  const KNOWN = [
    {re: /SocketTimeoutException|Read timed out/, note: 'Délai réseau des services Mojang (comptes, skins), courant en développement : sans gravité, ce n\'est pas un bug du mod.'},
    {re: /OutOfMemoryError/, note: 'Mémoire épuisée : donnez plus de RAM au jeu (-Xmx) avant tout.'},
  ];
  function analyse(text) {
    const lines = [], seen = new Set(), notes = [];
    if (/---- Minecraft Crash Report ----/.test(text)) {
      const d = text.match(/^Description: (.*)$/m); if (d) lines.push('Description : ' + d[1]);
    }
    for (const raw of text.split(/\r?\n/)) {
      const l = raw.trim();
      if (lines.length >= 5) break;
      if (/^(Caused by: |[\w.$]*(Exception|Error)(: |$))|Mixin .*failed|InvalidMixinException|MixinApplyError/.test(l) && !seen.has(l)) { seen.add(l); lines.push(l); }
    }
    for (const k of KNOWN) if (k.re.test(text)) notes.push(k.note);
    const mod = text.match(/^\s*-\s+ebisu\s+(\S+)/m);
    if (mod) version = mod[1];
    detected.classList.toggle('on', lines.length > 0 || notes.length > 0);
    $('#detected-text').textContent = lines.join('\n');
    $('#detected-note').textContent = notes.join(' ');
    $('#detected-note').hidden = !notes.length;
  }

  // What the mail says: the kind, then every field shown, under its own label.
  const ticketId = () => 'RLQ-' + Date.now().toString(36).slice(-5).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
  const cleanLabel = el => el.textContent.replace(/\((facultatif|obligatoire)\)/, '').trim();
  function report(id) {
    const r = {'Ticket': id, 'Genre': label('type')};
    $$('.group').forEach(g => { if (shown(g)) { const v = value(g.querySelector('input').name); if (v) r[g.dataset.name] = v; } });
    $$('.ticket-rest .field').forEach(f => {
      const input = f.querySelector('input, textarea');
      if (!shown(f) || !input || input.id === 't-log' || input.id === 't-name' || input.id === 't-email') return;
      const v = input.value.trim(); if (v) r[cleanLabel(f.querySelector('label'))] = v;
    });
    if (shown(logArea)) {
      if ($('#detected-text').textContent) r['Erreur repérée'] = $('#detected-text').textContent;
      if (logArea.value.trim()) r['Log'] = logArea.value.trim();
    }
    r['Version du mod'] = version || '-';
    r['Pseudo'] = $('#t-name').value.trim() || '-';
    r['Contact'] = $('#t-email').value.trim() || '-';
    r['Navigateur'] = navigator.userAgent;
    return r;
  }
  const asText = r => Object.entries(r).map(([k, v]) => k === 'Log' ? `\n----- ${k} -----\n${v}` : `${k} : ${v}`).join('\n');

  // Every rule, with what to write to meet it. The first field in error takes the focus.
  const RULES = [
    ['t-title', 'Titre', el => el.value.trim().length >= 4, 'Le titre est obligatoire : écrivez au moins 4 caractères.'],
    ['t-desc', 'Description', el => el.value.trim().length >= 10, 'La description est obligatoire : écrivez au moins 10 caractères.'],
    ['t-log', 'Log', el => value('type') !== 'crash' || el.value.trim().length >= 20,
      'Pour un crash, le log est obligatoire : choisissez le fichier latest.log ou collez son contenu ici.'],
    ['t-email', 'Mail', el => !el.value.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim()),
      'Cette adresse mail n\'est pas valide : elle doit ressembler à nom@exemple.fr.'],
  ];
  function check() {
    const kind = value('type');
    if (!kind) { say('Choisissez d\'abord le genre de ticket.', 'err'); $('input[name=type]').focus(); return false; }
    const bad = [];
    RULES.forEach(([id, name, ok, message]) => { const el = $('#' + id), wrong = shown(el) && !ok(el); mark(el, wrong ? message : ''); if (wrong) bad.push([el, name]); });
    if (!bad.length) return true;
    say(bad.length === 1 ? 'Un champ est à corriger : ' + bad[0][1] + '.' : bad.length + ' champs sont à corriger : ' + bad.map(b => b[1]).join(', ') + '.', 'err');
    bad[0][0].focus();
    return false;
  }
  // A field put right loses its error as it is typed.
  form.addEventListener('input', e => { const rule = RULES.find(r => r[0] === e.target.id); if (rule && e.target.getAttribute('aria-invalid') && rule[2](e.target)) mark(e.target, ''); });
  function say(text, cls) { status.textContent = text; status.className = 'status ' + (cls || ''); }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!KEY || !check()) return;
    if ($('#t-hp').checked) return; // a robot ticked the hidden box
    const id = ticketId(), r = report(id), email = $('#t-email').value.trim();
    const qual = r['Gravité'] || r['Importance'] || r['Moment'] || r['Problème'];
    const subject = `[Ebisu ${id}] ${r['Genre']}${qual ? ' (' + qual + ')' : ''} : ${$('#t-title').value.trim()}`;
    const payload = Object.assign({access_key: KEY, subject, from_name: 'Codex Ebisu' + (r['Pseudo'] !== '-' ? ' · ' + r['Pseudo'] : ''), botcheck: ''},
      email ? {replyto: email} : {}, r);
    send.disabled = true; send.innerHTML = '<span class="spinner" aria-hidden="true"></span> Envoi…'; say('Envoi du ticket…');
    try {
      // A form, not JSON: a "simple" request, which the browser sends without asking the service first.
      const data = new FormData();
      Object.entries(payload).forEach(([k, v]) => data.append(k, v));
      const res = await fetch('https://api.web3forms.com/submit', {method: 'POST', headers: {Accept: 'application/json'}, body: data});
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || ('HTTP ' + res.status));
      const sent = store.get(SENT, []); sent.unshift({id, title: $('#t-title').value.trim(), type: r['Genre'], at: new Date().toISOString()}); store.set(SENT, sent.slice(0, 20));
      store.del(DRAFT);
      $('#sent-id').textContent = id; form.hidden = true; $('#sent').classList.add('on'); confetti(); listSent();
      // The focus follows the form to its answer, which a screen reader then reads.
      $('#sent-title').focus();
    } catch (err) {
      say('L\'envoi a échoué (' + err.message + '). Réessayez, ou copiez le ticket.', 'err');
    } finally {
      send.disabled = !KEY; send.innerHTML = '<span aria-hidden="true">✉ </span>Envoyer le ticket';
    }
  });

  $('#copy').addEventListener('click', async () => {
    if (!value('type')) { say('Choisissez le genre de ticket.', 'err'); return; }
    const text = asText(report(ticketId()));
    try { await navigator.clipboard.writeText(text); say('Ticket copié dans le presse-papiers.', 'ok'); }
    catch (e) { say('Copie impossible ici.', 'err'); }
  });
  $('#again').addEventListener('click', () => {
    form.reset(); logArea.value = ''; detected.classList.remove('on'); $('#drop b').textContent = 'Choisir le fichier latest.log ou un crash report';
    version = form.dataset.version || '';
    $('#sent').classList.remove('on'); form.hidden = false; adapt(); say('');
    $('input[name=type]').focus();
  });

  // The tickets sent from this browser.
  function listSent() {
    const ul = $('#my-tickets'), sent = store.get(SENT, []);
    ul.innerHTML = sent.length ? sent.map(t => `<li><b>${t.id}</b><span></span><small></small></li>`).join('')
      : '<li><small>Aucun ticket envoyé depuis ce navigateur.</small></li>';
    if (sent.length) $$('li', ul).forEach((li, i) => { $('span', li).textContent = sent[i].title;
      $('small', li).textContent = sent[i].type + ' · ' + new Date(sent[i].at).toLocaleString('fr-FR'); });
  }
  listSent();

  // A burst of gold when it is sent.
  function confetti() {
    if (document.documentElement.classList.contains('still')) return;
    const c = document.createElement('canvas'); c.className = 'confetti'; document.body.appendChild(c);
    const x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
    const colors = ['#ffc65a', '#ffe29a', '#ff4f7b', '#6bffb4', '#5cc8ff', '#b07cff'];
    const bits = Array.from({length: 160}, () => ({x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - .5) * 16, vy: Math.random() * -14 - 4,
      s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: colors[Math.random() * colors.length | 0]}));
    let t = 0;
    const step = () => { x.clearRect(0, 0, c.width, c.height); t++;
      for (const b of bits) { b.vy += .45; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        x.save(); x.translate(b.x, b.y); x.rotate(b.r); x.fillStyle = b.c; x.globalAlpha = Math.max(0, 1 - t / 140); x.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); x.restore(); }
      if (t < 140) requestAnimationFrame(step); else c.remove(); };
    requestAnimationFrame(step);
  }
})();
