/* Philippe 3D Printservice: scroll-printen, materiaalkiezer, prijsindicatie en offerteformulier */
(function () {
  'use strict';

  // ---------- Contactgegevens: hier invullen ----------
  const CONTACT = {
    email: 'info@philippe3d.nl',      // vervang door het echte e-mailadres
    tel: '+31600000000',              // vervang door het echte nummer, zonder spaties
    telTekst: '06 00000000',          // zoals het op de site getoond wordt
    regio: 'Nederland, ophalen op afspraak'
  };
  document.getElementById('contactMail').textContent = CONTACT.email;
  document.getElementById('contactMail').href = 'mailto:' + CONTACT.email;
  document.getElementById('contactTel').textContent = CONTACT.telTekst;
  document.getElementById('contactTel').href = 'tel:' + CONTACT.tel;
  document.getElementById('contactRegio').textContent = CONTACT.regio;
  document.getElementById('footMail').textContent = CONTACT.email;

  // ---------- Navigatie ----------
  const nav = document.getElementById('nav');
  const navLinks = document.getElementById('navLinks');
  document.getElementById('navToggle').addEventListener('click', () => navLinks.classList.toggle('is-open'));
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('is-open')));

  // ---------- Reveal ----------
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  // Fallback: ook bij snel scrollen alles tonen wat in beeld staat
  function revealCheck() { document.querySelectorAll('.reveal:not(.is-in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight - 40 && r.bottom > 0) el.classList.add('is-in'); }); }
  window.addEventListener('scroll', revealCheck, { passive: true }); window.addEventListener('load', revealCheck); setTimeout(revealCheck, 300);


  // ---------- Hero: printer die vanzelf print en herhaalt ----------
  const heroRect = document.getElementById('heroClipRect');
  const heroHead = document.getElementById('heroHead');
  const heroGantry = document.getElementById('heroGantry');
  const heroLine = document.getElementById('heroLayerLine');
  const heroPct = document.getElementById('heroPct');
  const heroLayer = document.getElementById('heroLayer');
  const HERO_TOP = 100, HERO_BOTTOM = 258, HERO_LAYERS = 158;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let heroStart = performance.now();
  const HERO_DUUR = 14000, HERO_PAUZE = 2500;

  // Breedte van de vaas op een bepaalde hoogte, voor de beweging van de printkop
  function vaasBreedte(y) {
    const t = (y - HERO_TOP) / (HERO_BOTTOM - HERO_TOP); // 0 boven, 1 onder
    // smal boven, breed in het midden, iets smaller onder
    const half = 12 + 48 * Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.08)) + (1 - t) * 0;
    return half;
  }
  function heroFrame(now) {
    let t = (now - heroStart) / HERO_DUUR;
    if (t > 1 + HERO_PAUZE / HERO_DUUR) { heroStart = now; t = 0; }
    const p = Math.min(1, t);
    const y = HERO_BOTTOM - p * (HERO_BOTTOM - HERO_TOP);
    heroRect.setAttribute('y', y);
    heroRect.setAttribute('height', HERO_BOTTOM - y + 2);
    heroGantry.setAttribute('transform', 'translate(0,' + (y - 48) + ')');
    const half = vaasBreedte(y);
    const x = 160 + Math.sin(p * 140) * (p < 1 ? half : 0);
    heroHead.setAttribute('transform', 'translate(' + x + ',0)');
    heroLine.setAttribute('y1', y); heroLine.setAttribute('y2', y);
    heroLine.setAttribute('x1', 160 - half); heroLine.setAttribute('x2', 160 + half);
    heroLine.style.opacity = p < 1 ? .9 : 0;
    heroPct.textContent = Math.round(p * 100) + '%';
    heroLayer.textContent = p < 1 ? 'laag ' + Math.round(p * HERO_LAYERS) + ' / ' + HERO_LAYERS : 'klaar';
    if (!reduce) requestAnimationFrame(heroFrame);
  }
  if (reduce) { heroStart = -HERO_DUUR; heroFrame(0); } else requestAnimationFrame(heroFrame);

  // ---------- Scroll-print stages ----------
  const stages = [...document.querySelectorAll('.stage')].map(sec => {
    const svg = sec.querySelector('.obj-svg');
    const obj = svg.querySelector('.obj');
    return {
      sec,
      rect: svg.querySelector('.clip-rect'),
      line: svg.querySelector('.layer-line'),
      head: svg.querySelector('.head'),
      pct: sec.querySelector('.pct'),
      layer: sec.querySelector('.layer'),
      layers: +sec.dataset.layers,
      bbox: null, obj
    };
  });
  function meetObjecten() {
    stages.forEach(s => { try { s.bbox = s.obj.getBBox(); } catch (e) { s.bbox = { x: 60, y: 60, width: 280, height: 280 }; } });
  }
  meetObjecten();

  let ticking = false;
  function updateStages() {
    ticking = false;
    const vh = window.innerHeight;
    stages.forEach(s => {
      const r = s.sec.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return; // ver buiten beeld
      const total = r.height - vh;
      let p = total > 0 ? (-r.top) / total : 1;
      p = Math.max(0, Math.min(1, p));
      // Printen begint pas na een klein stukje scrollen en is klaar op 85%, zodat je het eindresultaat nog even ziet
      const q = Math.max(0, Math.min(1, (p - 0.05) / 0.8));
      const b = s.bbox || { x: 60, y: 60, width: 280, height: 280 };
      const bottom = b.y + b.height + 1;
      const y = bottom - q * (b.height + 2);
      s.rect.setAttribute('y', y);
      s.rect.setAttribute('height', Math.max(0, bottom - y));
      s.line.setAttribute('y1', y); s.line.setAttribute('y2', y);
      s.line.setAttribute('x1', b.x - 10); s.line.setAttribute('x2', b.x + b.width + 10);
      const cx = b.x + b.width / 2;
      const hx = cx + Math.sin(q * 120) * (b.width / 2) * (q < 1 ? 1 : 0);
      s.head.setAttribute('transform', 'translate(' + hx + ',' + (y - 4) + ')');
      s.pct.textContent = Math.round(q * 100) + '%';
      s.layer.textContent = q < 1 ? 'laag ' + Math.round(q * s.layers) + ' / ' + s.layers : 'klaar, ' + s.layers + ' lagen';
      s.sec.classList.toggle('is-done', q >= 1);
    });
  }
  function onScroll() {
    nav.classList.toggle('is-solid', window.scrollY > 40);
    if (!ticking) { ticking = true; requestAnimationFrame(updateStages); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { meetObjecten(); onScroll(); });
  onScroll(); updateStages();

  // ---------- Materiaal en kleur ----------
  const root = document.documentElement;
  let mat = 'PLA', matFactor = 1, kleur = 'oranje';
  const matLabel = document.getElementById('matLabel');
  function kleurTekstContrast(hex) {
    // Op een witte of gele filamentkleur zou oranje-tekst slecht lezen; accentkleur voor tekst apart houden
    const c = hex.replace('#', '');
    const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), bl = parseInt(c.substr(4, 2), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * bl) / 255;
    return lum;
  }
  document.getElementById('materials').addEventListener('click', e => {
    const card = e.target.closest('.mat-card'); if (!card) return;
    document.querySelectorAll('.mat-card').forEach(c => c.classList.toggle('is-active', c === card));
    mat = card.dataset.mat; matFactor = +card.dataset.factor;
    document.querySelectorAll('.readout .mat').forEach(m => m.textContent = mat + ' · 0.2 mm');
    matLabel.textContent = mat + ', ' + kleur;
    berekenPrijs();
  });
  document.getElementById('swatches').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#swatches button').forEach(x => x.classList.toggle('is-active', x === b));
    const c = getComputedStyle(b).getPropertyValue('--c').trim();
    const cl = getComputedStyle(b).getPropertyValue('--cl').trim();
    root.style.setProperty('--filament', c);
    root.style.setProperty('--filament-licht', cl);
    // Tekstaccent alleen meekleuren als het leesbaar blijft op donker
    const lum = kleurTekstContrast(c);
    root.style.setProperty('--filament-tekst', lum < 0.25 ? '#ff6a1f' : c);
    kleur = b.dataset.name.toLowerCase();
    matLabel.textContent = mat + ', ' + kleur;
  });

  // ---------- Prijsindicatie ----------
  const qty = document.getElementById('qty'), infill = document.getElementById('infill'), design = document.getElementById('design');
  let gram = 25, sizeName = 'klein';
  document.getElementById('sizeSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#sizeSeg button').forEach(x => x.classList.toggle('is-active', x === b));
    gram = +b.dataset.g; sizeName = b.dataset.size; berekenPrijs();
  });
  [qty, infill, design].forEach(el => el.addEventListener('input', berekenPrijs));
  function euro(n) { return '€ ' + Math.round(n).toLocaleString('nl-NL'); }
  function berekenPrijs() {
    const n = +qty.value, inf = +infill.value;
    document.getElementById('qtyOut').textContent = n;
    document.getElementById('infillOut').textContent = inf + '%';
    // Materiaalgewicht groeit met de vulling, opstart- en afwerkkosten per stuk, korting bij aantallen
    const g = gram * (0.55 + 0.45 * inf / 100) * matFactor;
    const materiaal = g * 0.09;
    const uurtjes = g / 18; // printtijd in uren, ruw
    const machine = uurtjes * 2.5;
    const afwerking = 4;
    let perStuk = materiaal + machine + afwerking;
    const korting = n >= 25 ? 0.75 : n >= 10 ? 0.85 : n >= 5 ? 0.92 : 1;
    perStuk *= korting;
    let laag = perStuk * n * 0.85, hoog = perStuk * n * 1.25;
    const ontwerp = design.checked ? (sizeName === 'klein' ? 25 : sizeName === 'middel' ? 45 : 75) : 0;
    laag += ontwerp; hoog += ontwerp * 1.6;
    laag = Math.max(laag, 8 + ontwerp);
    document.getElementById('priceOut').textContent = euro(laag) + ' tot ' + euro(hoog);
    document.getElementById('priceSub').textContent = n + (n === 1 ? ' stuk' : ' stuks') + ' · ' + sizeName + ' · ' + mat + ' · ' + inf + '% vulling';
    document.getElementById('priceMat').textContent = mat + ', ' + kleur;
    const totUur = uurtjes * n;
    document.getElementById('printTime').textContent = totUur < 1 ? Math.round(totUur * 60) + ' minuten' : totUur < 48 ? totUur.toFixed(1).replace('.', ',') + ' uur' : Math.round(totUur / 24) + ' dagen';
    document.getElementById('designCost').textContent = ontwerp ? 'vanaf ' + euro(ontwerp) : 'niet van toepassing';
  }
  berekenPrijs();

  // ---------- Offerteformulier ----------
  const form = document.getElementById('quoteForm');
  const typeSeg = document.getElementById('typeSeg');
  let type = 'Onderdeel';
  typeSeg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    typeSeg.querySelectorAll('button').forEach(x => x.classList.toggle('is-active', x === b));
    type = b.dataset.type;
  });
  // Knoppen in de scroll-secties kiezen het type alvast
  document.querySelectorAll('[data-type].btn').forEach(a => a.addEventListener('click', () => {
    const b = typeSeg.querySelector('[data-type="' + a.dataset.type + '"]');
    if (b) b.click();
  }));
  const fileInput = document.getElementById('bestand');
  const fileHint = document.getElementById('fileHint');
  fileInput.addEventListener('change', () => {
    const names = [...fileInput.files].map(f => f.name);
    fileHint.textContent = names.length ? 'Gekozen: ' + names.join(', ') + '. Voeg deze als bijlage toe in de e-mail die opent.' : 'Gekozen bestanden worden in je bericht genoemd. Voeg ze als bijlage toe in de e-mail die opent.';
  });
  const formError = document.getElementById('formError');
  const $ = id => document.getElementById(id);

  function bericht() {
    const files = [...fileInput.files].map(f => f.name);
    return [
      'Hoi Philippe,', '',
      'Ik wil graag iets laten printen.', '',
      'Type: ' + type,
      'Beschrijving: ' + $('beschrijving').value.trim(),
      $('afmetingen').value.trim() ? 'Afmetingen: ' + $('afmetingen').value.trim() : null,
      'Aantal: ' + ($('aantal').value || 1),
      'Materiaal en kleur (voorkeur): ' + mat + ', ' + kleur,
      'Richtprijs op de site: ' + $('priceOut').textContent,
      files.length ? 'Bestanden (als bijlage): ' + files.join(', ') : null, '',
      'Naam: ' + $('naam').value.trim(),
      'E-mail: ' + $('email').value.trim(),
      $('tel').value.trim() ? 'Telefoon: ' + $('tel').value.trim() : null, '',
      'Groet,', $('naam').value.trim()
    ].filter(r => r !== null).join('\n');
  }
  function valideer() {
    if (!$('beschrijving').value.trim()) return 'Beschrijf kort wat je wilt laten printen.';
    if (!$('naam').value.trim()) return 'Vul je naam in.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($('email').value.trim())) return 'Vul een geldig e-mailadres in.';
    return '';
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fout = valideer();
    if (fout) { formError.textContent = fout; formError.hidden = false; return; }
    formError.hidden = true;
    const onderwerp = 'Offerte 3D print: ' + type + ' (' + ($('aantal').value || 1) + ' st.)';
    window.location.href = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent(onderwerp) + '&body=' + encodeURIComponent(bericht());
  });
  const waBtn = document.getElementById('waBtn');
  waBtn.addEventListener('click', e => {
    const fout = valideer();
    if (fout) { e.preventDefault(); formError.textContent = fout; formError.hidden = false; return; }
    formError.hidden = true;
    waBtn.href = 'https://wa.me/' + CONTACT.tel.replace(/\D/g, '') + '?text=' + encodeURIComponent(bericht());
  });
})();
