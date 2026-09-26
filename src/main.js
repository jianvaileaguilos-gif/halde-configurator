import './style.css';
import { createScene } from './scene.js';

// ---------- Build options (illustrative pricing) ----------
const OPTIONS = {
  trim: [
    { id: 'touring', name: 'Touring', price: 96400, desc: 'Dual motor, 610 km range, air suspension.', range: 610, accel: 4.1 },
    { id: 'performance', name: 'Performance', price: 118900, desc: 'Uprated motors, carbon ceramic brakes, 3.2 s to 100.', range: 560, accel: 3.2 },
  ],
  paint: [
    { id: 'graphite', name: 'Graphite', hex: '#2b2e33', price: 0 },
    { id: 'glacier', name: 'Glacier White', hex: '#e6e8ea', price: 1200 },
    { id: 'fjord', name: 'Fjord Blue', hex: '#1f3a5a', price: 1800 },
    { id: 'signal', name: 'Signal Orange', hex: '#d0502a', price: 2400 },
    { id: 'moss', name: 'Moss', hex: '#3b4637', price: 1800 },
    { id: 'silver', name: 'Quicksilver', hex: '#a8adb3', price: 1200 },
  ],
  wheel: [
    { id: 'silver', name: 'Forged Silver', hex: '#c4c8cd', price: 0 },
    { id: 'gunmetal', name: 'Gunmetal', hex: '#4a4e54', price: 900 },
    { id: 'black', name: 'Gloss Black', hex: '#1a1b1d', price: 900 },
    { id: 'bronze', name: 'Satin Bronze', hex: '#7a6248', price: 1400 },
  ],
  caliper: [
    { id: 'black', name: 'Black', hex: '#1b1d20', price: 0 },
    { id: 'grey', name: 'Titanium', hex: '#8a8f96', price: 450 },
    { id: 'orange', name: 'Signal Orange', hex: '#e4572e', price: 650 },
  ],
  cabin: [
    { id: 'obsidian', name: 'Obsidian Leather', hex: '#1c1d1f', price: 0 },
    { id: 'tan', name: 'Cognac Leather', hex: '#6b3a1f', price: 2100 },
    { id: 'stone', name: 'Stone Wool Blend', hex: '#9b968e', price: 1600 },
  ],
};

const FINISH_PRICE = { gloss: 0, satin: 2800 };
const DEFAULT_STATE = { trim: 'touring', paint: 'graphite', finish: 'gloss', wheel: 'silver', caliper: 'black', cabin: 'obsidian' };
const STORE_KEY = 'halde-build';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      const valid = { ...DEFAULT_STATE };
      for (const key of Object.keys(OPTIONS)) {
        if (OPTIONS[key].some((o) => o.id === saved[key])) valid[key] = saved[key];
      }
      if (saved.finish in FINISH_PRICE) valid.finish = saved.finish;
      return valid;
    }
  } catch (e) {}
  return { ...DEFAULT_STATE };
}
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {}
}

const state = loadState();
const pick = (group) => OPTIONS[group].find((o) => o.id === state[group]);

// ---------- 3D scene ----------
const stage = $('#stage');
const loaderEl = $('#stage-loader');
const loaderFill = $('#loader-fill');
const loaderText = $('#loader-text');
const errorEl = $('#stage-error');

let car = null;
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

if (hasWebGL()) {
  car = createScene({
    canvas: $('#car-canvas'),
    container: stage,
    onProgress: (p) => {
      loaderFill.style.width = `${Math.round(p * 100)}%`;
      loaderText.textContent = `Loading model ${Math.round(p * 100)}%`;
    },
    onLoad: () => {
      loaderFill.style.width = '100%';
      loaderEl.classList.add('is-done');
      loaderEl.setAttribute('aria-busy', 'false');
      loaderText.textContent = 'Model loaded';
    },
    onError: () => {
      loaderEl.classList.add('is-done');
      errorEl.hidden = false;
    },
  });
  applyAllToScene();
  car.load();
} else {
  loaderEl.classList.add('is-done');
  errorEl.hidden = false;
  $('p', errorEl).textContent = 'Your browser does not support WebGL, so the 3D preview is unavailable. You can still choose options below.';
  $('#retry-load').hidden = true;
}

$('#retry-load').addEventListener('click', () => {
  errorEl.hidden = true;
  loaderEl.classList.remove('is-done');
  loaderFill.style.width = '0%';
  loaderText.textContent = 'Loading model';
  car?.load();
});

function applyAllToScene() {
  if (!car) return;
  car.setColor('body', pick('paint').hex);
  car.setColor('wheel', pick('wheel').hex);
  car.setColor('caliper', pick('caliper').hex);
  car.setColor('leather', pick('cabin').hex);
  car.setFinish(state.finish);
}

// ---------- Options UI ----------
function renderTrims() {
  const list = $('#trim-list');
  list.setAttribute('role', 'radiogroup');
  list.setAttribute('aria-label', 'Version');
  list.innerHTML = OPTIONS.trim
    .map(
      (t) => `
      <button type="button" class="trim" role="radio" data-id="${t.id}" aria-checked="${t.id === state.trim}">
        <span class="trim-name">${t.name}</span>
        <span class="trim-price">${money.format(t.price)}</span>
        <span class="trim-desc">${t.desc}</span>
      </button>`
    )
    .join('');
}

function renderSwatches(group, listId) {
  const list = $(listId);
  list.setAttribute('role', 'radiogroup');
  list.setAttribute('aria-label', group);
  list.innerHTML = OPTIONS[group]
    .map((o) => {
      const price = o.price ? `, plus ${money.format(o.price)}` : ', included';
      return `<button type="button" class="swatch" role="radio" data-group="${group}" data-id="${o.id}"
        style="--sw:${o.hex}" aria-checked="${o.id === state[group]}" aria-label="${o.name}${price}" title="${o.name}"></button>`;
    })
    .join('');
}

function syncUI() {
  $$('.trim').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === state.trim)));
  $$('.swatch').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === state[b.dataset.group])));
  $$('#finish-list button').forEach((b) => b.classList.toggle('is-active', b.dataset.finish === state.finish));

  const label = (o) => (o.price ? `${o.name} +${money.format(o.price)}` : o.name);
  $('#paint-name').textContent = label(pick('paint'));
  $('#wheel-name').textContent = label(pick('wheel'));
  $('#caliper-name').textContent = label(pick('caliper'));
  $('#cabin-name').textContent = label(pick('cabin'));

  const trim = pick('trim');
  $('#metric-range').firstChild.textContent = trim.range;
  $('#metric-accel').firstChild.textContent = trim.accel.toFixed(1);

  const total = totalPrice();
  $('#total-price').textContent = money.format(total);
  $('#summary-total').textContent = money.format(total);
  renderSummary();
}

function totalPrice() {
  return (
    pick('trim').price +
    pick('paint').price +
    FINISH_PRICE[state.finish] +
    pick('wheel').price +
    pick('caliper').price +
    pick('cabin').price
  );
}

function renderSummary() {
  const paint = pick('paint');
  const rows = [
    ['Version', pick('trim').name],
    ['Paint', `${paint.name}, ${state.finish === 'satin' ? 'satin' : 'gloss'}`, paint.hex],
    ['Wheels', pick('wheel').name, pick('wheel').hex],
    ['Brake calipers', pick('caliper').name, pick('caliper').hex],
    ['Cabin', pick('cabin').name, pick('cabin').hex],
    ['Deposit', money.format(2500)],
  ];
  $('#summary-list').innerHTML = rows
    .map(
      ([k, v, hex]) => `<li><span class="k">${k}</span><span class="v">${hex ? `<span class="dot" style="--sw:${hex}"></span>` : ''}${v}</span></li>`
    )
    .join('');
}

renderTrims();
renderSwatches('paint', '#paint-list');
renderSwatches('wheel', '#wheel-list');
renderSwatches('caliper', '#caliper-list');
renderSwatches('cabin', '#cabin-list');
syncUI();

const SCENE_KEY = { paint: 'body', wheel: 'wheel', caliper: 'caliper', cabin: 'leather' };
// Show the part that changed, so the choice is visible without hunting for it
const FOCUS_VIEW = { wheel: 'side', caliper: 'side', cabin: 'cabin' };

$('.panel').addEventListener('click', (e) => {
  const trimBtn = e.target.closest('.trim');
  const swatch = e.target.closest('.swatch');
  const finishBtn = e.target.closest('[data-finish]');

  if (trimBtn) {
    state.trim = trimBtn.dataset.id;
  } else if (swatch) {
    const { group, id } = swatch.dataset;
    state[group] = id;
    car?.setColor(SCENE_KEY[group], pick(group).hex);
    if (FOCUS_VIEW[group]) setActiveView(FOCUS_VIEW[group]);
  } else if (finishBtn) {
    state.finish = finishBtn.dataset.finish;
    car?.setFinish(state.finish);
  } else {
    return;
  }
  saveState();
  syncUI();
});

// Arrow-key navigation inside each radio group
$('.panel').addEventListener('keydown', (e) => {
  const item = e.target.closest('[role="radio"]');
  if (!item || !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  const items = $$('[role="radio"]', item.parentElement);
  const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
  const next = items[(items.indexOf(item) + dir + items.length) % items.length];
  next.focus();
  next.click();
});

// ---------- Camera views ----------
function setActiveView(view) {
  $$('[data-view]').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
  car?.setView(view);
}
$$('[data-view]').forEach((b) => b.addEventListener('click', () => setActiveView(b.dataset.view)));

car?.controls.addEventListener('start', () => {
  $$('[data-view]').forEach((b) => b.classList.remove('is-active'));
  $('.stage-hint')?.classList.add('is-hidden');
});

const spinBtn = $('#spin-toggle');
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) spinBtn.hidden = true;
spinBtn.addEventListener('click', () => {
  const on = spinBtn.getAttribute('aria-pressed') !== 'true';
  spinBtn.setAttribute('aria-pressed', String(on));
  car?.setAutoRotate(on);
});

// "Choose your cabin" jumps to the cabin options and frames the interior
$('[data-cabin-jump]').addEventListener('click', () => {
  setTimeout(() => setActiveView('cabin'), 400);
});

// ---------- Theme ----------
const themeBtn = $('#theme-toggle');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : darkQuery.matches;
}
function syncThemeIcon() {
  const dark = isDark();
  themeBtn.innerHTML = `<i class="ph ${dark ? 'ph-sun' : 'ph-moon'}" aria-hidden="true"></i>`;
  themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  car?.syncBackground();
}
themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('halde-theme', next);
  } catch (e) {}
  syncThemeIcon();
});
darkQuery.addEventListener('change', syncThemeIcon);
syncThemeIcon();

// ---------- Mobile menu ----------
const menuBtn = $('#menu-toggle');
const menu = $('#mobile-menu');
function setMenu(open) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menuBtn.innerHTML = `<i class="ph ${open ? 'ph-x' : 'ph-list'}" aria-hidden="true"></i>`;
}
menuBtn.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', (e) => {
  if (e.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) {
    setMenu(false);
    menuBtn.focus();
  }
});
window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
  if (e.matches) setMenu(false);
});

// ---------- Scroll reveals ----------
const revealIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        revealIO.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);
$$('.reveal').forEach((el) => revealIO.observe(el));

// ---------- Reservation form ----------
const form = $('#reserve-form');
const submitBtn = $('#submit-btn');
const fields = {
  name: { el: $('#f-name'), check: (v) => (v.trim().length >= 2 ? '' : 'Enter your full name.') },
  email: {
    el: $('#f-email'),
    check: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address, like name@example.com.'),
  },
  country: { el: $('#f-country'), check: (v) => (v ? '' : 'Choose where the car will be delivered.') },
};

function validateField(key) {
  const f = fields[key];
  const msg = f.check(f.el.value);
  const wrap = f.el.closest('.field');
  const err = $(`#${f.el.id}-error`);
  wrap.classList.toggle('has-error', !!msg);
  err.textContent = msg;
  f.el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (msg) f.el.setAttribute('aria-describedby', err.id);
  else f.el.removeAttribute('aria-describedby');
  return !msg;
}

Object.keys(fields).forEach((key) => {
  const { el } = fields[key];
  el.addEventListener('blur', () => {
    if (el.value) validateField(key);
  });
  el.addEventListener('input', () => {
    if (el.closest('.field').classList.contains('has-error')) validateField(key);
  });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const results = Object.keys(fields).map(validateField);
  const firstInvalid = Object.keys(fields).find((k, i) => !results[i]);
  if (firstInvalid) {
    fields[firstInvalid].el.focus();
    return;
  }

  submitBtn.classList.add('is-loading');
  submitBtn.setAttribute('aria-busy', 'true');

  // Demo only: simulate a network request
  setTimeout(() => {
    submitBtn.classList.remove('is-loading');
    submitBtn.removeAttribute('aria-busy');
    const first = fields.name.el.value.trim().split(/\s+/)[0];
    $('#success-text').textContent = `Thanks, ${first}. Your ${pick('paint').name} Halde GT ${pick('trim').name} is on the list. We have sent a confirmation to ${fields.email.el.value.trim()}.`;
    const success = $('#form-success');
    success.hidden = false;
    success.focus();
  }, 1200);
});
