/* ============================================================
   CAR SHOWCASE — MASTER SCRIPT
   Handles: theme, auth, validation, search, audio
   ============================================================ */

/* ── 1. THEME MANAGEMENT ───────────────────────────────────── */

/**
 * Loads saved theme from localStorage and applies it.
 * Called on every page load.
 */
function initTheme() {
  const saved = localStorage.getItem('cs_theme') || 'light';
  applyTheme(saved);
}

/**
 * Applies a theme class to the body element and updates
 * the toggle button text accordingly.
 * @param {string} theme - 'light' | 'dark'
 */
function applyTheme(theme) {
  const body = document.getElementById('body');
  if (!body) return;
  body.className = theme;

  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
}

/**
 * Toggles between light and dark themes, persists choice.
 */
function toggleTheme() {
  const body = document.getElementById('body');
  const current = body.className;
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('cs_theme', next); // Persist to localStorage
}

/* ── 2. CUSTOM VALIDATION FUNCTIONS ───────────────────────── */
// NOTE: No HTML5 `required` or `type="email"` are used.
// All validation is custom JavaScript.

/**
 * Validates an email address using regex.
 * Big-O: O(n) where n = string length (regex scan)
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates password meets minimum requirements:
 * - At least 8 characters
 * - Contains at least one number
 * @param {string} pw
 * @returns {{ valid: boolean, message: string }}
 */
function validatePassword(pw) {
  if (pw.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters.' };
  }
  if (!/[0-9]/.test(pw)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  return { valid: true, message: '' };
}

/**
 * Validates a full name (not empty, at least 2 chars).
 * @param {string} name
 * @returns {boolean}
 */
function isValidName(name) {
  return name.trim().length >= 2;
}

/**
 * Shows or hides an error message under a field.
 * @param {string} fieldId  - input element id
 * @param {string} msgId    - error message element id
 * @param {boolean} isError - true = show error, false = clear
 * @param {string} [msg]    - optional message text
 */
function setFieldError(fieldId, msgId, isError, msg) {
  const field = document.getElementById(fieldId);
  const msgEl = document.getElementById(msgId);
  if (!field || !msgEl) return;

  if (isError) {
    field.classList.add('error');
    msgEl.textContent = msg || '';
    msgEl.classList.add('show');
  } else {
    field.classList.remove('error');
    msgEl.classList.remove('show');
  }
}

/* ── 3. PASSWORD STRENGTH ──────────────────────────────────── */

/**
 * Updates the password strength bar in real time.
 * @param {string} pw
 */
function updatePasswordStrength(pw) {
  const bar = document.getElementById('pw-strength-bar');
  if (!bar) return;

  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[^a-zA-Z0-9]/.test(pw))  score++;

  const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#27ae60'];
  const widths  = ['25%', '50%', '75%', '100%'];
  bar.style.width      = score > 0 ? widths[score - 1] : '0%';
  bar.style.background = score > 0 ? colors[score - 1] : 'transparent';
}

/* ── 4. USER REGISTRATION ──────────────────────────────────── */

/**
 * Handles the sign-up form submission.
 * Writes new user to localStorage.
 * Complexity: O(1) amortised for localStorage read/write.
 */
function handleSignup(event) {
  event.preventDefault();

  const name     = document.getElementById('signup-name').value;
  const email    = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;

  let hasError = false;

  // Validate name
  if (!isValidName(name)) {
    setFieldError('signup-name', 'err-name', true, 'Please enter your full name (min 2 characters).');
    hasError = true;
  } else {
    setFieldError('signup-name', 'err-name', false);
  }

  // Validate email (custom regex — no type="email")
  if (!isValidEmail(email)) {
    setFieldError('signup-email', 'err-email', true, 'Please enter a valid email address.');
    hasError = true;
  } else {
    setFieldError('signup-email', 'err-email', false);
  }

  // Validate password
  const pwResult = validatePassword(password);
  if (!pwResult.valid) {
    setFieldError('signup-password', 'err-password', true, pwResult.message);
    hasError = true;
  } else {
    setFieldError('signup-password', 'err-password', false);
  }

  // Confirm password
  if (password !== confirm) {
    setFieldError('signup-confirm', 'err-confirm', true, 'Passwords do not match.');
    hasError = true;
  } else {
    setFieldError('signup-confirm', 'err-confirm', false);
  }

  if (hasError) return;

  // Check if email already registered
  const users = JSON.parse(localStorage.getItem('cs_users') || '[]');
  const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

  if (exists) {
    setFieldError('signup-email', 'err-email', true, 'This email is already registered.');
    return;
  }

  // Store new user in localStorage
  users.push({ name: name.trim(), email: email.toLowerCase().trim(), password });
  localStorage.setItem('cs_users', JSON.stringify(users));

  // Show success
  const success = document.getElementById('signup-success');
  if (success) success.classList.add('show');

  showToast('Account created! Redirecting to login…');
  setTimeout(() => { window.location.href = 'login.html'; }, 1800);
}

/* ── 5. USER LOGIN ─────────────────────────────────────────── */

/**
 * Handles the login form submission.
 * Uses localStorage for credentials, sessionStorage for session.
 */
function handleLogin(event) {
  event.preventDefault();

  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  let hasError = false;

  if (!isValidEmail(email)) {
    setFieldError('login-email', 'err-login-email', true, 'Please enter a valid email address.');
    hasError = true;
  } else {
    setFieldError('login-email', 'err-login-email', false);
  }

  if (password.length === 0) {
    setFieldError('login-password', 'err-login-pw', true, 'Please enter your password.');
    hasError = true;
  } else {
    setFieldError('login-password', 'err-login-pw', false);
  }

  if (hasError) return;

  // Look up user in localStorage
  const users = JSON.parse(localStorage.getItem('cs_users') || '[]');
  const user  = users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    setFieldError('login-email', 'err-login-email', true, 'Invalid email or password.');
    return;
  }

  // Create active session in sessionStorage
  sessionStorage.setItem('cs_session', JSON.stringify({ name: user.name, email: user.email }));

  showToast(`Welcome back, ${user.name}!`);
  setTimeout(() => { window.location.href = 'index.html'; }, 1200);
}

/* ── 6. SESSION & AUTH ─────────────────────────────────────── */

/**
 * Returns the currently logged-in user from sessionStorage, or null.
 * @returns {{ name: string, email: string } | null}
 */
function getSession() {
  const raw = sessionStorage.getItem('cs_session');
  return raw ? JSON.parse(raw) : null;
}

/**
 * Logs the user out by clearing sessionStorage, then redirects.
 */
function logout() {
  sessionStorage.removeItem('cs_session');
  showToast('You have been logged out.');
  setTimeout(() => { window.location.href = 'index.html'; }, 1000);
}

/**
 * Updates the auth link in the nav based on session state.
 * Shows user name if logged in, Login link if not.
 */
function updateAuthUI() {
  const user    = getSession();
  const authEl  = document.getElementById('auth-nav-item');
  if (!authEl) return;

  if (user) {
    authEl.innerHTML = `
      <span class="user-badge">👤 ${user.name.split(' ')[0]}</span>
      <a href="#" onclick="logout(); return false;" style="color:var(--accent);font-size:0.82rem;font-weight:600;margin-left:0.5rem;">Logout</a>
    `;
  } else {
    authEl.innerHTML = `<a href="login.html">Login</a>`;
  }
}

/* ── 7. SEARCH & FILTER ────────────────────────────────────── */

/**
 * Car data array used for search filtering.
 * O(n) linear scan for filtering — n = number of cars (9 total).
 */
const CAR_DATA = [
  // BMW
  { id:1, brand:'BMW',      model:'M3 Competition',   price:73900,  type:'Sedan',    hp:503,  engine:'3.0L Twin-Turbo I6', img:'https://images.unsplash.com/photo-1617531653332-bd46c16f4d68?auto=format&fit=crop&w=600&q=80', page:'bmw.html' },
  { id:2, brand:'BMW',      model:'X5 M60i',          price:91700,  type:'SUV',      hp:523,  engine:'4.4L Twin-Turbo V8', img:'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80', page:'bmw.html' },
  { id:3, brand:'BMW',      model:'i8 Roadster',      price:147500, type:'Hybrid',   hp:369,  engine:'1.5L Turbo + Electric', img:'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80', page:'bmw.html' },
  // Mercedes
  { id:4, brand:'Mercedes', model:'G-Class AMG 63',   price:167800, type:'SUV',      hp:577,  engine:'4.0L Twin-Turbo V8', img:'https://images.unsplash.com/photo-1617654112368-308f6e39bef0?auto=format&fit=crop&w=600&q=80', page:'mercedes.html' },
  { id:5, brand:'Mercedes', model:'AMG GT Black',     price:161400, type:'Coupe',    hp:720,  engine:'4.0L Twin-Turbo V8', img:'https://images.unsplash.com/photo-1618843992363-2d4f40d7e1ae?auto=format&fit=crop&w=600&q=80', page:'mercedes.html' },
  { id:6, brand:'Mercedes', model:'S-Class S580',     price:111900, type:'Sedan',    hp:496,  engine:'4.0L Twin-Turbo V8', img:'https://images.unsplash.com/photo-1541899481682-56bcd35f2bc1?auto=format&fit=crop&w=600&q=80', page:'mercedes.html' },
  // Audi
  { id:7, brand:'Audi',     model:'R8 V10 Plus',      price:158600, type:'Coupe',    hp:620,  engine:'5.2L Naturally Aspirated V10', img:'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=600&q=80', page:'audi.html' },
  { id:8, brand:'Audi',     model:'Q8 e-tron',        price:74400,  type:'SUV',      hp:402,  engine:'Dual Electric Motors', img:'https://images.unsplash.com/photo-1551446591-142875a901a1?auto=format&fit=crop&w=600&q=80', page:'audi.html' },
  { id:9, brand:'Audi',     model:'RS6 Avant',        price:118900, type:'Wagon',    hp:591,  engine:'4.0L Twin-Turbo V8', img:'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=600&q=80', page:'audi.html' },
];

/**
 * Filters CAR_DATA based on user inputs.
 * Time complexity: O(n) — single pass through the array.
 * Space complexity: O(k) — k = number of matching results.
 */
function filterCars() {
  const query    = (document.getElementById('search-query')?.value || '').toLowerCase();
  const brand    = (document.getElementById('filter-brand')?.value || '');
  const maxPrice = parseInt(document.getElementById('filter-price')?.value || '0');
  const type     = (document.getElementById('filter-type')?.value || '');

  const results = CAR_DATA.filter(car => {
    const matchQuery = !query || car.model.toLowerCase().includes(query) || car.brand.toLowerCase().includes(query);
    const matchBrand = !brand || car.brand === brand;
    const matchPrice = !maxPrice || car.price <= maxPrice;
    const matchType  = !type  || car.type === type;
    return matchQuery && matchBrand && matchPrice && matchType;
  });

  renderSearchResults(results);
}

/**
 * Renders filtered car cards into the results container.
 * @param {Array} cars
 */
function renderSearchResults(cars) {
  const container = document.getElementById('search-results');
  const countEl   = document.getElementById('results-count');
  if (!container) return;

  if (countEl) countEl.textContent = `${cars.length} car${cars.length !== 1 ? 's' : ''} found`;

  if (cars.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:4rem;color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:1rem">🔍</div>
        <p style="font-size:1.1rem;font-weight:600">No cars match your filters.</p>
        <p style="font-size:0.9rem;margin-top:0.5rem">Try adjusting the search criteria.</p>
      </div>`;
    return;
  }

  container.innerHTML = cars.map(car => `
    <article class="car-card">
      <img src="${car.img}" alt="${car.brand} ${car.model}" loading="lazy">
      <div class="car-card-body">
        <span class="car-badge">${car.brand}</span>
        <h3>${car.model}</h3>
        <p class="car-desc">${car.engine} · ${car.hp} hp · ${car.type}</p>
        <div class="car-price">$${car.price.toLocaleString()}</div>
        <a href="${car.page}" class="btn btn-outline">View Details</a>
      </div>
    </article>
  `).join('');
}

/* ── 8. ENGINE SOUND (Web Audio API) ───────────────────────── */

let audioCtx = null;

/**
 * Synthesises a car engine revving sound using the Web Audio API.
 * Uses an oscillator with a sawtooth wave + waveshaper for distortion.
 * No external audio file required.
 */
function playEngineSound() {
  const btn = document.getElementById('sound-btn');

  // Create (or resume) the AudioContext
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  // ── Oscillator (engine note) ──
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(60,  now);
  osc.frequency.linearRampToValueAtTime(240, now + 0.6);
  osc.frequency.linearRampToValueAtTime(180, now + 1.2);
  osc.frequency.linearRampToValueAtTime(90,  now + 2.0);

  // ── Waveshaper (adds harmonic distortion) ──
  const shaper = audioCtx.createWaveShaper();
  const curve  = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = (Math.PI + 300) * x / (Math.PI + 300 * Math.abs(x));
  }
  shaper.curve = curve;

  // ── Gain envelope ──
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0,    now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.6);
  gain.gain.linearRampToValueAtTime(0.10, now + 1.8);
  gain.gain.linearRampToValueAtTime(0,    now + 2.2);

  // ── Connect graph ──
  osc.connect(shaper);
  shaper.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 2.4);

  // Visual feedback
  if (btn) {
    btn.classList.add('playing');
    setTimeout(() => btn.classList.remove('playing'), 2400);
  }

  showToast('🔊 Engine revving!');
}

/* ── 9. TOAST NOTIFICATION ──────────────────────────────────── */

/**
 * Shows a temporary toast message at the bottom of the screen.
 * @param {string} message
 * @param {number} [duration=2500] ms
 */
function showToast(message, duration = 2500) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/* ── 10. IMAGE MAP HOTSPOT TOOLTIP ─────────────────────────── */

/**
 * Shows the floating tooltip for an image map hotspot.
 * @param {Event} e
 * @param {string} label
 */
function showHotspot(e, label) {
  const tip = document.getElementById('hotspot-tip');
  if (!tip) return;
  tip.textContent = label;
  tip.classList.add('visible');
  moveTooltip(e);
}

function moveTooltip(e) {
  const tip  = document.getElementById('hotspot-tip');
  const wrap = document.querySelector('.img-map-wrap');
  if (!tip || !wrap) return;
  const rect = wrap.getBoundingClientRect();
  tip.style.left = (e.clientX - rect.left + 12) + 'px';
  tip.style.top  = (e.clientY - rect.top  - 36) + 'px';
}

function hideHotspot() {
  const tip = document.getElementById('hotspot-tip');
  if (tip) tip.classList.remove('visible');
}

/* ── 11. ACTIVE NAV LINK ────────────────────────────────────── */

/**
 * Marks the current page's nav link as active.
 */
function setActiveNav() {
  const path  = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === path) link.classList.add('active');
  });
}

/* ── INIT ──────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateAuthUI();
  setActiveNav();

  // Search page — live filtering
  const searchInputs = ['search-query', 'filter-brand', 'filter-price', 'filter-type'];
  searchInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', filterCars);
  });

  // Initial render if on search page
  if (document.getElementById('search-results')) {
    filterCars();
  }

  // Signup form
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
    const pwInput = document.getElementById('signup-password');
    if (pwInput) pwInput.addEventListener('input', () => updatePasswordStrength(pwInput.value));
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  // Image map mouse tracking
  const mapImg = document.getElementById('dash-img');
  if (mapImg) mapImg.addEventListener('mousemove', moveTooltip);
});
