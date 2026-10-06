const $ = (s) => document.querySelector(s);
const app = $('#app');
let selectedTicketId = null;
const store = {
  get token() { return localStorage.getItem('forume_token'); },
  set token(v) { v ? localStorage.setItem('forume_token', v) : localStorage.removeItem('forume_token'); },
  user: null,
};

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', ...(opts.headers || {}) };
  if (store.token) headers.Authorization = 'Bearer ' + store.token;
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Ошибка ' + res.status));
  return data;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(ts) {
  return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const roleShieldSvg = '<svg class="badge-icon" viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path fill-rule="evenodd" d="M8 .5L1.5 3v5c0 4.2 2.8 8.1 6.5 9 3.7-.9 6.5-4.8 6.5-9V3L8 .5zm2.9 6.1a.75.75 0 0 0-1.1-1l-3.3 3.7-1.5-1.5a.75.75 0 0 0-1.1 1.1l2.1 2.1a.75.75 0 0 0 1.1 0l3.8-4.4z"/></svg>';

function roleBadge(role) {
  const map = { admin: 'Администратор', moderator: 'Модератор', support: 'Саппорт', user: 'Пользователь' };
  const label = map[role] || role;
  return `<span class="badge ${esc(role)}">${roleShieldSvg}<span>${esc(label)}</span></span>`;
}
function avatar(name, color, user) {
  return user?.avatar
    ? `<div class="avatar avatar-image" style="background-image:url('${user.avatar}')"></div>`
    : `<div class="avatar" style="background:${esc(color || '#3b9add')}">${esc((name || '?')[0].toUpperCase())}</div>`;
}
function latestAvatar(name, color, avatarUrl) {
  return avatarUrl
    ? `<div class="nl-latest-ava" style="background-image:url('${avatarUrl}')"></div>`
    : `<div class="nl-latest-ava" style="background:${esc(color || '#0098be')}">${esc((name || '?')[0].toUpperCase())}</div>`;
}

// Цветовая схема разделов форума
const forumColors = {
  news: '#d9383a',
  rules: '#f36c21',
  flood: '#9b51e0',
  cs2: '#e05a2b',
  mc: '#22c55e',
  gta: '#3b82f6',
  cheats: '#eab308',
  web: '#0098be',
  py: '#06b6d4',
  market: '#10b981',
};
function getForumColor(id) {
  return forumColors[id] || '#0098be';
}

// Иконки разделов форума под конкретные темы
function getForumIconSvg(id, name = '') {
  const normId = (id || '').toLowerCase();
  const normName = (name || '').toLowerCase();

  // Новости проекта (рупор / объявления)
  if (normId === 'news' || normName.includes('новост')) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4v16l-5-4H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h3l5-4zm2 2.5a6 6 0 0 1 0 11v-2a4 4 0 0 0 0-7v-2zm3-3a9 9 0 0 1 0 17v-2a7 7 0 0 0 0-13V3.5z"/></svg>`;
  }
  // Правила и помощь (щит с подтверждением)
  if (normId === 'rules' || normName.includes('правил') || normName.includes('помощ') || normName.includes('help')) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2l7 3.5v6.2c0 4.8-3.1 9.3-7 10.3-3.9-1-7-5.5-7-10.3V5.5L12 2zm-1.1 13.4l5.4-5.4-1.4-1.4-4 4-2-2-1.4 1.4 3.4 3.4z"/></svg>`;
  }
  // Флудилка / Свободное общение (диалоговые пузыри)
  if (normId === 'flood' || normName.includes('флуд') || normName.includes('общен') || normName.includes('оффтоп')) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 2H8a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h1v3.5l4-3.5h7a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3zm-6 16H6.5l-3 2.5V17H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1v7a4 4 0 0 0 4 4h6v1z"/></svg>`;
  }
  // CS 2 (прицел / снайперская сетка)
  if (normId === 'cs2' || normName.includes('cs') || normName.includes('кс') || normName.includes('counter')) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path fill-rule="evenodd" d="M11 2a1 1 0 0 1 2 0v2.06c4.07.47 7.47 3.87 7.94 7.94H23a1 1 0 1 1 0 2h-2.06c-.47 4.07-3.87 7.47-7.94 7.94V24a1 1 0 1 1-2 0v-2.06c-4.07-.47-7.47-3.87-7.94-7.94H1a1 1 0 1 1 0-2h2.06c.47-4.07 3.87-7.47 7.94-7.94V2zm0 4.08C7.62 6.54 4.54 9.62 4.08 13c.46 3.38 3.54 6.46 6.92 6.92V17a1 1 0 1 1 2 0v2.92c3.38-.46 6.46-3.54 6.92-6.92H17a1 1 0 1 1 0-2h2.92C19.46 7.62 16.38 4.54 13 4.08V7a1 1 0 1 1-2 0V4.08zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" clip-rule="evenodd"/></svg>`;
  }
  // Minecraft (3D изометрический воксель / куб)
  if (normId === 'mc' || normName.includes('mine') || normName.includes('майн') || normName.includes('крафт')) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2l9 5.2v9.6L12 22l-9-5.2V7.2L12 2zm0 2.3L4.8 8.4 12 12.6l7.2-4.2L12 4.3zM4 10.1v6.7l7 4v-6.7l-7-4zm16 0l-7 4v6.7l7-4v-6.7z"/></svg>`;
  }
  // GTA V / RP (спорткар / автомобиль)
  if (normId === 'gta' || normName.includes('gta') || normName.includes('гта') || normName.includes('rp') || normName.includes('рп')) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.9 6c-.2-.6-.8-1-1.4-1h-11c-.7 0-1.2.4-1.4 1L3 12v7c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h12v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-7l-2.1-6zm-12.4 1h11l1.4 4H5.1l1.4-4zM6.5 15.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm11 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"/></svg>`;
  }
  // Читы и баги (жук-эксплойт)
  if (normId === 'cheats' || normName.includes('чит') || normName.includes('баг') || normName.includes('эксплойт') || normName.includes('cheat')) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 8h-1.8a6 6 0 0 0-1.8-2l1.3-1.3a1 1 0 1 0-1.4-1.4l-1.6 1.6C13 4.3 12 4 11 4s-2 .3-2.7.9L6.7 3.3A1 1 0 0 0 5.3 4.7l1.3 1.3C5.6 6.9 5.2 7.8 4.8 9H3a1 1 0 1 0 0 2h1.6c0 .3 0 .7 0 1s0 .7 0 1H3a1 1 0 1 0 0 2h1.8c.5 1.6 1.8 2.9 3.4 3.5l-1.2 1.2a1 1 0 1 0 1.4 1.4l1.8-1.8c.3 0 .5.1.8.1s.5 0 .8-.1l1.8 1.8a1 1 0 0 0 1.4-1.4l-1.2-1.2c1.6-.6 2.9-1.9 3.4-3.5H19a1 1 0 1 0 0-2h-1.6c0-.3 0-.7 0-1s0-.7 0-1H19a1 1 0 1 0 0-2zm-6 7h-2c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1z"/></svg>`;
  }
  // Веб-разработка (теги кода < / >)
  if (normId === 'web' || normName.includes('веб') || normName.includes('web') || normName.includes('html') || normName.includes('js')) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8.7 16.6L4.1 12l4.6-4.6L7.3 6l-6 6 6 6 1.4-1.4zm6.6 0l4.6-4.6-4.6-4.6L16.7 6l6 6-6 6-1.4-1.4zM13.6 3.5l-5 17 1.9.5 5-17-1.9-.5z"/></svg>`;
  }
  // Python / Backend (терминал >_)
  if (normId === 'py' || normName.includes('python') || normName.includes('пайтон') || normName.includes('backend') || normName.includes('бэкенд') || normName.includes('бот')) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H4V7h16v12zm-13-8l3.5 2.5L7 16l-1.2-.9 2.2-1.6-2.2-1.6L7 11zm5 5h5v1.5h-5V16z"/></svg>`;
  }
  // Маркет / Услуги (корзина)
  if (normId === 'market' || normName.includes('маркет') || normName.includes('услуг') || normName.includes('магазин') || normName.includes('торг')) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.6-1.4 2.5c-.2.3-.2.6-.2 1 0 1.1.9 2 2 2h12v-2H7.4l.9-1.6h7.5c.8 0 1.4-.4 1.7-1l3.6-6.5c.1-.2.2-.4.2-.6 0-.6-.4-1-1-1H5.2L4.3 2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;
  }
  // Универсальная папка для категорий по умолчанию
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-1.5V9a3 3 0 0 0-3-3h-3.379a4.5 4.5 0 0 1-2.121-.527l-.6-.3A4.5 4.5 0 0 0 6.779 4.5H4.5A3 3 0 0 0 1.5 7.5v10.5a3 3 0 0 0 3 3h15z"/></svg>`;
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - Number(ts)) / 1000));
  if (diffSec < 60) return 'сейчас';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}м`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}ч`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}д`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}мес`;
  return `${Math.floor(diffDays / 365)}г`;
}

let cachedCategories = null;
async function refreshSidebarCategories() {
  try {
    if (!cachedCategories) {
      cachedCategories = await api('/api/forums');
    }
    const box = $('#sidebarCategories');
    if (!box) return;
    const currentHash = location.hash;
    const allForums = cachedCategories.flatMap((c) => c.forums);
    box.innerHTML = allForums.map((f) => {
      const color = getForumColor(f.id);
      const active = currentHash === `#/forum/${f.id}` ? 'active' : '';
      return `<a href="#/forum/${f.id}" class="nl-side-cat-row ${active}">
        <span class="side-dot" style="background:${color}; color:${color}"></span>
        <span>${esc(f.name)}</span>
      </a>`;
    }).join('');
  } catch { /* ignore */ }
}

// ---------- шапка / пользователь ----------
async function refreshMe() {
  if (!store.token) { store.user = null; renderUserbox(); return; }
  try { store.user = await api('/api/me'); }
  catch { store.user = null; store.token = null; }
  renderUserbox();
}

function renderUserbox() {
  const box = $('#userbox');
  const adminLink = $('#navAdmin');
  const profileLink = $('#navProfile');
  if (store.user) {
    if (profileLink) profileLink.style.display = '';
    adminLink.style.display = store.user.role === 'admin' ? '' : 'none';
    $('#navMessages').style.display = '';
    $('#navModeration').style.display = ['admin', 'moderator'].includes(store.user.role) ? '' : 'none';
    box.innerHTML = `
      <a href="#/profile" class="userbox-profile" title="Открыть профиль">
        ${avatar(store.user.username, store.user.avatarColor, store.user)}
        <span class="userbox-profile-text"><b>${esc(store.user.username)}</b>${roleBadge(store.user.role)}</span>
      </a>
      <button class="btn ghost small" id="btnLogout">Выйти</button>`;
    $('#btnLogout').onclick = () => { store.token = null; store.user = null; renderUserbox(); location.hash = '#/'; loadStats(); router(); };
  } else {
    if (profileLink) profileLink.style.display = 'none';
    adminLink.style.display = 'none';
    $('#navMessages').style.display = 'none';
    $('#navModeration').style.display = 'none';
    box.innerHTML = `
      <a class="btn small" href="#/login">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" style="margin-right:4px"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/></svg>
        Войти
      </a>
      <a class="btn ghost small" href="#/register">Регистрация</a>`;
  }
}

async function loadStats() {
  try {
    const s = await api('/api/stats');
    const statsbar = $('#statsbar');
    if (statsbar) {
      statsbar.innerHTML = `
        <span>Тем: <b>${s.threads}</b></span>
        <span>Сообщений: <b>${s.messages}</b></span>
        <span>Пользователей: <b>${s.users}</b></span>
        <span>Новый участник: <b>${esc(s.newestUser)}</b></span>`;
    }
  } catch { /* ignore */ }
}

// ---------- роутер с анимацией переходов ----------
let currentNavId = 0;
async function router() {
  const navId = ++currentNavId;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.remove('active'));
  const hash = location.hash || '#/';
  const clean = hash.replace(/^#\//, '');
  const [route, id] = clean.split('/');

  // Sidebar highlights
  $('#sideTopicsLink')?.classList.toggle('active', !route);
  $('#sideAllCategories')?.classList.toggle('highlight', !route);
  document.querySelectorAll('.nl-side-cat-row').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('href') === hash);
  });
  refreshSidebarCategories();

  // Анимация затухания предыдущего экрана
  app.classList.remove('page-fade-in');
  app.classList.add('page-fade-out');

  await new Promise((r) => setTimeout(r, 120));
  if (navId !== currentNavId) return;

  try {
    if (!route) await viewHome();
    else if (route === 'forum') await viewForum(id);
    else if (route === 'thread') await viewThread(id);
    else if (route === 'members') await viewMembers();
    else if (route === 'profile') await viewProfile(id);
    else if (route === 'messages') await viewMessages();
    else if (route === 'support') await viewSupport();
    else if (route === 'login') await viewLogin();
    else if (route === 'register') await viewRegister();
    else if (route === 'admin') await viewAdmin();
    else if (route === 'moderation') await viewModeration();
    else app.innerHTML = '<div class="card"><div class="card-head">404</div><div style="padding:14px">Страница не найдена. <a href="#/">На главную</a></div></div>';
  } catch (err) {
    app.innerHTML = `<div class="alert">${esc(err.message)}</div>`;
  } finally {
    if (navId === currentNavId) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      app.classList.remove('page-fade-out');
      app.classList.add('page-fade-in');
    }
  }
}
window.addEventListener('hashchange', router);

// ---------- главная страница ----------
async function viewHome() {
  document.querySelector('[data-nav="home"]')?.classList.add('active');
  try {
    const [cats, latestThreads, stats] = await Promise.all([
      api('/api/forums'),
      api('/api/latest-threads').catch(() => []),
      api('/api/stats').catch(() => ({})),
    ]);
    cachedCategories = cats;
    refreshSidebarCategories();

    // Онлайн-аватарки
    const onlineAvatars = (stats.onlineUsers || []).slice(0, 8).map((u) => {
      const bg = u.avatar ? `background-image:url('${u.avatar}')` : `background:${u.avatarColor || '#0284c7'}`;
      const char = u.avatar ? '' : esc(u.username[0]?.toUpperCase() || '?');
      return `<div class="uf-live-avatar" style="${bg}" title="${esc(u.username)}">${char}</div>`;
    }).join('');

    // Левая колонка: категории и разделы с акцентными squircle-иконками
    const allForums = cats.flatMap((c) => c.forums.map((f) => ({ ...f, catTitle: c.title })));
    const catRows = allForums.map((f) => {
      const color = getForumColor(f.id);
      return `
        <div class="cat-row">
          <div class="cat-squircle" style="background:${color}18; border-color:${color}40; color:${color}">
            ${getForumIconSvg(f.id, f.name)}
          </div>
          <div class="cat-info">
            <a href="#/forum/${f.id}" class="cat-name">${esc(f.name)}</a>
            <div class="cat-desc">${esc(f.description || '')}</div>
          </div>
          <div class="cat-badge">
            <b>${f.threads}</b> <span class="muted" style="font-size:11px">тем</span>
          </div>
        </div>`;
    }).join('');

    // Правая колонка: последние темы со счетчиком ответов и датой
    const latestRows = (latestThreads.length ? latestThreads : []).slice(0, 20).map((t) => {
      const color = getForumColor(t.forumId);
      const isHot = t.replies >= 5;
      return `
        <div class="stream-row">
          ${latestAvatar(t.authorName, t.authorColor, t.authorAvatar)}
          <div class="stream-content">
            <a href="#/thread/${t.id}" class="stream-title">
              ${t.pinned ? '<span class="nl-pin">📌</span>' : ''}${esc(t.title)}
            </a>
            <div class="stream-meta">
              <span class="stream-cat-pill">
                <span class="stream-dot" style="background:${color}; box-shadow:0 0 6px ${color}"></span>
                <a href="#/forum/${t.forumId}">${esc(t.forumName)}</a>
              </span>
              <span>·</span>
              <span class="muted">${esc(t.authorName)}</span>
            </div>
          </div>
          <div class="stream-right">
            <span class="stream-replies-pill ${isHot ? 'hot' : ''}" title="Ответов">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.427-.697 2.898-.882A1 1 0 0 1 5.9 13.8a8.03 8.03 0 0 0 2.1.272c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a1.042 1.042 0 0 1 .708.022z"/></svg>
              ${t.replies}
            </span>
            <span class="stream-time">${timeAgo(t.lastAt)}</span>
          </div>
        </div>`;
    }).join('');

    app.innerHTML = `
      <div class="uf-toolbar">
        <div class="uf-segmented">
          <button class="uf-seg-btn active" onclick="location.hash='#/'">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.606 2.046 1.488l.214.659a.5.5 0 0 0 .476.353H13.5A1.5 1.5 0 0 1 15 6v6.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"/></svg>
            <span>Разделы</span>
          </button>
          <button class="uf-seg-btn" onclick="location.hash='#/'">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-1.5 2.5-1.5 3.5C2.5 13 4.5 16 8 16z"/></svg>
            <span>Популярные</span>
          </button>
          <button class="uf-seg-btn" onclick="location.hash='#/'">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
            <span>Свежее</span>
          </button>
        </div>
        <div class="uf-quick-stat">
          <span class="uf-live-pulse"><span class="uf-live-pulse-dot"></span></span>
          <span>Сообщество UFounded</span>
        </div>
      </div>

      <div class="uf-livebar">
        <div class="uf-live-left">
          <div class="uf-live-badge">
            <span class="uf-live-pulse"><span class="uf-live-pulse-ring"></span><span class="uf-live-pulse-dot"></span></span>
            <span><b>${stats.onlineCount || 1}</b> онлайн</span>
          </div>
          <div class="uf-live-avatars">
            ${onlineAvatars || '<div class="uf-live-avatar" style="background:#0284c7">U</div>'}
          </div>
        </div>
        <div class="uf-live-metrics">
          <div class="uf-metric-chip">Темы: <b>${stats.threads ?? 0}</b></div>
          <div class="uf-metric-chip">Сообщения: <b>${stats.messages ?? 0}</b></div>
          <div class="uf-metric-chip">Пользователи: <b>${stats.users ?? 0}</b></div>
        </div>
      </div>

      <div class="nl-home-grid">
        <div class="nl-panel">
          <div class="nl-panel-head">
            <span>Категории</span>
            <span>Статистика</span>
          </div>
          <div class="cat-list">
            ${catRows || '<div style="padding:16px" class="muted">Разделов пока нет</div>'}
          </div>
        </div>

        <div class="nl-panel">
          <div class="nl-panel-head">
            <span>Последняя активность</span>
            <span style="font-weight:400; text-transform:none; color:var(--muted); font-size:11px">Всего: ${latestThreads.length}</span>
          </div>
          <div class="stream-list">
            ${latestRows || '<div style="padding:16px" class="muted">Тем пока нет</div>'}
          </div>
        </div>
      </div>`;
  } catch (e) {
    app.innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  }
}

// ---------- раздел ----------
async function viewForum(forumId) {
  app.innerHTML = '<div class="muted">Загрузка...</div>';
  try {
    const { forum, threads } = await api(`/api/forums/${forumId}/threads`);
    const color = getForumColor(forum.id);
    app.innerHTML = `
      <div class="crumb"><a href="#/">Форум</a> / <span style="color:#fff">${esc(forum.name)}</span></div>
      <div class="card">
        <div class="card-head" style="display:flex; align-items:center; gap:12px">
          <div class="cat-squircle" style="width:34px; height:34px; border-radius:9px; background:${color}18; border-color:${color}40; color:${color}; flex-shrink:0">
            ${getForumIconSvg(forum.id, forum.name)}
          </div>
          <span style="font-size:15px; font-weight:700">${esc(forum.name)}</span>
          <span class="muted" style="font-weight:400; font-size:12px; margin-left:auto">Тем: ${threads.length}</span>
        </div>
        ${threads.length ? threads.map((t) => `
          <div class="thread-row">
            ${avatar(t.authorName, t.authorColor || '#2c3646')}
            <div class="thread-main">
              <a href="#/thread/${t.id}">${esc(t.title)}</a>
              ${t.pinned ? '<span class="badge pin" style="margin-left:6px">📌 Закреплено</span>' : ''}
              ${t.closed ? '<span class="badge closed" style="margin-left:6px">🔒 Закрыто</span>' : ''}
              <div class="thread-meta">${esc(t.authorName)} · ${fmtDate(t.createdAt)} · последнее: ${esc(t.lastBy || '—')}</div>
            </div>
            <div class="thread-stats">Ответов: <b>${t.replies}</b><br>Просмотров: <b>${t.views}</b></div>
          </div>`).join('') : '<div style="padding:16px" class="muted">Тем пока нет. Создайте первую!</div>'}
      </div>
      <div class="card">
        <div class="card-head">Создать тему</div>
        <div style="padding:16px">
          ${store.user ? `
            <label>Заголовок</label><input id="ntTitle" maxlength="140" placeholder="О чём хотите поговорить?">
            <label>Сообщение</label><textarea id="ntText" placeholder="Текст первого сообщения..."></textarea>
            <div style="margin-top:12px"><button class="btn" id="btnCreateThread">Опубликовать</button></div>
          ` : '<div class="notice">Чтобы создавать темы, <a href="#/login">войдите</a> или <a href="#/register">зарегистрируйтесь по инвайт-коду</a>.</div>'}
        </div>
      </div>`;
    $('#btnCreateThread')?.addEventListener('click', async () => {
      try {
        const t = await api(`/api/forums/${forumId}/threads`, {
          method: 'POST',
          body: JSON.stringify({ title: $('#ntTitle').value, text: $('#ntText').value }),
        });
        location.hash = '#/thread/' + t.id;
      } catch (e) { alert(e.message); }
    });
  } catch (e) {
    app.innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  }
}

// ---------- тема ----------
async function viewThread(threadId) {
  app.innerHTML = '<div class="muted">Загрузка темы...</div>';
  try {
    const { thread, posts } = await api(`/api/threads/${threadId}`);
    const isAdmin = store.user?.role === 'admin';
    app.innerHTML = `
      <div class="crumb"><a href="#/">Форум</a> / <a href="#/forum/${thread.forumId}">Раздел</a> / ${esc(thread.title.slice(0, 60))}</div>
      <div class="card">
        <div class="card-head">${thread.pinned ? '📌 ' : ''}${esc(thread.title)}
          <span>${thread.closed ? '<span class="badge closed">Закрыто</span>' : ''} <span class="muted" style="font-weight:400">👁 ${thread.views}</span></span>
        </div>
        ${posts.map((p) => `
          <div class="post">
            <div class="post-side">
              ${avatar(p.authorName, p.authorColor, { avatar: p.authorAvatar })}
              <div><b>${esc(p.authorName)}</b><br>${roleBadge(p.authorRole)}</div>
            </div>
            <div class="post-body">
              <div class="post-head"><span>${fmtDate(p.createdAt)}</span><span>#${p.id.slice(-5)}</span></div>
              <div class="post-text">${esc(p.text)}</div>
              <div class="post-actions">
                <button class="btn ghost small" data-like="${p.id}">${p.liked ? '💙' : '🤍'} ${p.likesCount}</button>
                ${['admin','moderator'].includes(store.user?.role) ? `<button class="btn danger small" data-delete-post="${p.id}">Удалить</button>` : ''}
              </div>
            </div>
          </div>`).join('')}
      </div>
      ${isAdmin ? `
      <div class="card"><div class="card-head">Модерация (админ)</div>
        <div style="padding:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn ghost small" id="admPin">${thread.pinned ? 'Открепить' : 'Закрепить'}</button>
          <button class="btn ghost small" id="admClose">${thread.closed ? 'Открыть' : 'Закрыть'}</button>
          <button class="btn danger small" id="admDel">Удалить тему</button>
        </div>
      </div>` : ''}
      <div class="card">
        <div class="card-head">Ответить</div>
        <div style="padding:14px">
          ${store.user
            ? (thread.closed && !['admin', 'moderator'].includes(store.user.role)
              ? '<div class="alert">Тема закрыта.</div>'
              : `<textarea id="replyText" placeholder="Ваше сообщение..."></textarea>
                 <div style="margin-top:10px"><button class="btn" id="btnReply">Отправить</button></div>`)
            : '<div class="notice">Чтобы отвечать, <a href="#/login">войдите</a> или <a href="#/register">зарегистрируйтесь по инвайт-коду</a>.</div>'}
        </div>
      </div>`;

    document.querySelectorAll('[data-like]').forEach((b) => {
      b.onclick = async () => {
        if (!store.user) { location.hash = '#/login'; return; }
        try {
          const r = await api(`/api/posts/${b.dataset.like}/like`, { method: 'POST' });
          b.innerHTML = `${r.liked ? '💙' : '🤍'} ${r.likes}`;
        } catch (e) { alert(e.message); }
      };
    });
    document.querySelectorAll('[data-delete-post]').forEach((b) => {
      b.onclick = async () => { if (!confirm('Удалить это сообщение?')) return; try { await api(`/api/admin/posts/${b.dataset.deletePost}`, { method: 'DELETE' }); router(); } catch (e) { alert(e.message); } };
    });
    $('#btnReply')?.addEventListener('click', async () => {
      try {
        await api(`/api/threads/${threadId}/posts`, { method: 'POST', body: JSON.stringify({ text: $('#replyText').value }) });
        router(); loadStats();
      } catch (e) { alert(e.message); }
    });
    $('#admPin')?.addEventListener('click', async () => { await api(`/api/admin/threads/${threadId}/pin`, { method: 'POST' }); router(); });
    $('#admClose')?.addEventListener('click', async () => { await api(`/api/admin/threads/${threadId}/close`, { method: 'POST' }); router(); });
    $('#admDel')?.addEventListener('click', async () => {
      if (!confirm('Удалить тему и все сообщения?')) return;
      await api(`/api/admin/threads/${threadId}`, { method: 'DELETE' });
      location.hash = '#/';
    });
  } catch (e) {
    app.innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  }
}

// ---------- участники ----------
async function viewMembers() {
  document.querySelector('[data-nav="members"]')?.classList.add('active');
  app.innerHTML = '<div class="muted">Загрузка...</div>';
  try {
    const users = await api('/api/members');
    app.innerHTML = `
      <div class="crumb"><a href="#/">Форум</a> / Участники</div>
      <div class="card"><div class="card-head">Участники (${users.length})</div>
      <div style="overflow:auto"><table class="tbl">
        <tr><th>Пользователь</th><th>Роль</th><th>Сообщений</th><th>Лайков</th><th>Регистрация</th></tr>
        ${users.map((u) => `<tr>
              <td><a href="#/profile/${encodeURIComponent(u.username)}"><b>${esc(u.username)}</b></a></td>
          <td>${roleBadge(u.role)}</td><td>${u.postsCount}</td><td>${u.likesReceived}</td>
          <td class="muted">${fmtDate(u.createdAt)}</td>
        </tr>`).join('')}
      </table></div></div>`;
  } catch (e) { app.innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
}

async function viewProfile(username) {
  if (!username) {
    if (!store.user) { location.hash = '#/login'; return; }
    username = store.user.username;
  } else {
    username = decodeURIComponent(username);
  }

  const isMe = store.user?.username === username;
  if (isMe) document.querySelector('[data-nav="profile"]')?.classList.add('active');
  else document.querySelector('[data-nav="members"]')?.classList.add('active');

  app.innerHTML = '<div class="muted">Загрузка профиля...</div>';

  try {
    const [u, prefixes] = await Promise.all([
      api(`/api/users/${encodeURIComponent(username)}`),
      isMe ? api('/api/prefixes').catch(() => []) : Promise.resolve([]),
    ]);

    const canManage = store.user?.role === 'admin' && !isMe;
    const regDateStr = u.createdAt ? fmtDate(u.createdAt) : 'Не указана';

    app.innerHTML = `
      <div class="crumb">
        <a href="#/">Форум</a> / <a href="#/members">Участники</a> / <span style="color:#fff">${esc(u.username)}</span>
      </div>

      <!-- Главная карточка профиля -->
      <div class="profile-card">
        <div class="profile-banner"></div>
        <div class="profile-header-body">
          <div class="profile-avatar-large" style="${u.avatar ? `background-image:url('${u.avatar}')` : `background:${u.avatarColor || '#0098be'}`}">
            ${u.avatar ? '' : esc(u.username[0]?.toUpperCase() || '?')}
          </div>
          <div class="profile-head-info">
            <h2>
              <span>${esc(u.username)}</span>
              ${roleBadge(u.role)}
              ${u.prefix ? `<span class="prefix" style="background:${u.prefix.color}">${esc(u.prefix.name)}</span>` : ''}
            </h2>
            <div class="profile-meta-row">
              <span class="profile-meta-item">
                <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>
                Регистрация: <b>${regDateStr}</b>
              </span>
              <span class="profile-meta-item">
                <span class="${u.banned ? 'text-danger' : 'text-success'}">● ${u.banned ? 'Заблокирован' : 'Активен'}</span>
              </span>
            </div>

            <!-- Сетка статистики пользователя -->
            <div class="profile-stats-grid">
              <div class="profile-stat-box">
                <span class="profile-stat-label">Дата регистрации</span>
                <span class="profile-stat-val">${regDateStr}</span>
              </div>
              <div class="profile-stat-box">
                <span class="profile-stat-label">Сообщений на форуме</span>
                <span class="profile-stat-val">${u.postsCount || 0}</span>
              </div>
              <div class="profile-stat-box">
                <span class="profile-stat-label">Симпатий / Лайков</span>
                <span class="profile-stat-val">${u.likesReceived || 0}</span>
              </div>
              <div class="profile-stat-box">
                <span class="profile-stat-label">Баланс монет</span>
                <span class="profile-stat-val" style="color:var(--accent-bright)">${u.balance ?? 0}</span>
              </div>
            </div>

            ${!isMe && store.user ? `
              <div style="margin-top:14px; display:flex; gap:8px">
                <button class="btn small" id="writePm">💬 Написать сообщение</button>
                ${canManage ? `
                  <button class="btn danger small" id="profileBan">${u.banned ? 'Разбанить' : 'Забанить'}</button>
                  <button class="btn ghost small" id="profileMute">Мут на 60 мин</button>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Детали и биография -->
      <div class="card">
        <div class="card-head">Информация об участнике</div>
        <div style="padding:16px 20px">
          <div class="profile-info-row">
            <div class="profile-info-label">Имя пользователя:</div>
            <div class="profile-info-value"><b>${esc(u.username)}</b></div>
          </div>
          <div class="profile-info-row">
            <div class="profile-info-label">Роль в сообществе:</div>
            <div class="profile-info-value">${roleBadge(u.role)}</div>
          </div>
          <div class="profile-info-row">
            <div class="profile-info-label">Дата регистрации:</div>
            <div class="profile-info-value">${regDateStr}</div>
          </div>
          <div class="profile-info-row">
            <div class="profile-info-label">Пол:</div>
            <div class="profile-info-value">${esc(u.gender || 'Не указан')}</div>
          </div>
          <div class="profile-info-row">
            <div class="profile-info-label">Возраст:</div>
            <div class="profile-info-value">${u.age ? `${u.age} лет` : 'Не указан'}</div>
          </div>
          <div class="profile-info-row">
            <div class="profile-info-label">О себе:</div>
            <div class="profile-info-value">${esc(u.bio || 'Пользователь пока ничего не рассказал о себе.')}</div>
          </div>
        </div>
      </div>

      <!-- Если это свой профиль — форма настроек -->
      ${isMe ? `
        <div class="card">
          <div class="card-head">Редактировать профиль</div>
          <div style="padding:16px 20px">
            <label>О себе</label>
            <textarea id="profileBio" placeholder="Расскажите немного о себе, увлечениях или контактах...">${esc(u.bio || '')}</textarea>
            
            <div class="grid2" style="margin-top:10px">
              <div>
                <label>Пол</label>
                <select id="profileGender">
                  <option value="">Не указан</option>
                  <option value="Мужской" ${u.gender === 'Мужской' ? 'selected' : ''}>Мужской</option>
                  <option value="Женский" ${u.gender === 'Женский' ? 'selected' : ''}>Женский</option>
                  <option value="Другой" ${u.gender === 'Другой' ? 'selected' : ''}>Другой</option>
                </select>
              </div>
              <div>
                <label>Возраст</label>
                <input id="profileAge" type="number" min="13" max="120" placeholder="18" value="${u.age || ''}">
              </div>
            </div>

            <label style="margin-top:12px">Аватарка</label>
            <input id="profileAvatarFile" type="file" accept="image/*">
            <div id="avatarPreview" class="muted" style="margin-top:6px; font-size:12px">Поддерживаются форматы JPG, PNG, WebP (до 2 МБ).</div>

            <div style="margin-top:16px">
              <button class="btn" id="saveProfile">Сохранить изменения</button>
            </div>
          </div>
        </div>

        ${prefixes && prefixes.length ? `
          <div class="card">
            <div class="card-head">Префиксы для ника</div>
            <div style="padding:16px 20px">
              ${prefixes.map((p) => `
                <div class="ticket-message" style="display:flex; justify-content:space-between; align-items:center">
                  <div>
                    <span class="prefix" style="background:${p.color}">${esc(p.name)}</span>
                    <span class="muted">${p.price} монет</span>
                  </div>
                  <button class="btn small" data-buy-prefix="${p.id}">Приобрести</button>
                </div>`).join('')}
            </div>
          </div>
        ` : ''}
      ` : ''}
    `;

    // Event listeners
    $('#writePm')?.addEventListener('click', () => {
      location.hash = '#/messages';
      setTimeout(() => { const el = $('#pmTo'); if (el) el.value = u.username; }, 120);
    });

    document.querySelectorAll('[data-buy-prefix]').forEach((b) => {
      b.onclick = async () => {
        try {
          await api(`/api/prefixes/${b.dataset.buyPrefix}/buy`, { method: 'POST' });
          await refreshMe();
          viewProfile(username);
        } catch (e) { alert(e.message); }
      };
    });

    $('#profileBan')?.addEventListener('click', async () => {
      await api(`/api/admin/users/${u.id}/sanction`, { method: 'POST', body: JSON.stringify({ type: 'ban', value: !u.banned }) });
      viewProfile(username);
    });

    $('#profileMute')?.addEventListener('click', async () => {
      await api(`/api/admin/users/${u.id}/sanction`, { method: 'POST', body: JSON.stringify({ type: 'posting', minutes: 60 }) });
      viewProfile(username);
    });

    let avatarData = u.avatar || '';
    $('#profileAvatarFile')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2_000_000) return alert('Файл должен быть меньше 2 МБ');
      const reader = new FileReader();
      reader.onload = () => {
        avatarData = reader.result;
        $('#avatarPreview').textContent = '✅ Аватарка выбрана (нажмите "Сохранить изменения")';
      };
      reader.readAsDataURL(file);
    });

    $('#saveProfile')?.addEventListener('click', async () => {
      try {
        await api('/api/me/profile', {
          method: 'PUT',
          body: JSON.stringify({
            bio: $('#profileBio').value,
            gender: $('#profileGender').value,
            age: $('#profileAge').value,
            avatar: avatarData,
          }),
        });
        await refreshMe();
        viewProfile(username);
      } catch (e) { alert(e.message); }
    });
  } catch (e) {
    app.innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  }
}

async function viewMessages() {
  if (!store.user) { location.hash = '#/login'; return; }
  document.querySelector('[data-nav="messages"]')?.classList.add('active');
  const messages = await api('/api/messages');
  app.innerHTML = `<div class="crumb">Личные сообщения</div><div class="grid2"><div class="card"><div class="card-head">Новое сообщение</div><div style="padding:14px"><label>Получатель</label><input id="pmTo" placeholder="Ник пользователя"><label>Сообщение</label><textarea id="pmText"></textarea><button class="btn" id="sendPm" style="margin-top:10px">Отправить</button><div id="pmErr" style="margin-top:14px"></div></div></div><div class="card"><div class="card-head">Переписка</div>${messages.length ? messages.map(m => `<div class="ticket-message"><b>${m.fromId === store.user.id ? 'Вы' : `<a href="#/profile/${encodeURIComponent(m.from.username)}">${esc(m.from.username)}</a>`}</b> <span class="muted">→ ${m.toId === store.user.id ? 'Вы' : esc(m.to.username)} · ${fmtDate(m.createdAt)}</span><br>${esc(m.text)}</div>`).join('') : '<div style="padding:14px" class="muted">Сообщений пока нет.</div>'}</div></div>`;
  $('#sendPm').onclick = async () => { try { await api('/api/messages', { method:'POST', body: JSON.stringify({ username:$('#pmTo').value, text:$('#pmText').value }) }); viewMessages(); } catch(e) { $('#pmErr').innerHTML = `<div class="alert">${esc(e.message)}</div>`; } };
}

async function viewSupport() {
  const tickets = store.user ? await api('/api/tickets') : [];
  const staff = ['admin','support'].includes(store.user?.role);
  if (tickets.length && !tickets.some((t) => t.id === selectedTicketId)) selectedTicketId = tickets[0].id;
  const selected = tickets.find((t) => t.id === selectedTicketId);
  document.querySelector('[data-nav="support"]')?.classList.add('active');
  const canCreateTicket = store.user && !['admin','moderator','support'].includes(store.user.role);
  app.innerHTML = `<div class="crumb">Поддержка</div>${canCreateTicket ? `<div class="card"><div class="card-head">Создать обращение</div><div style="padding:14px"><label>Тема вопроса</label><input id="ticketSubject" placeholder="Например: проблема с аккаунтом"><label>Опишите вопрос</label><textarea id="ticketText"></textarea><button class="btn" id="createTicket" style="margin-top:10px">Отправить обращение</button></div></div>` : !store.user ? '<div class="notice">Войдите, чтобы создать обращение в поддержку.</div>' : '<div class="notice">Сотрудникам форума нельзя создавать обращения. Здесь отображается очередь поддержки.</div>'}<div class="support-layout"><div class="card support-list"><div class="card-head">Обращения (${tickets.length})</div>${tickets.length ? tickets.map(t => `<button class="ticket-select ${t.id === selectedTicketId ? 'active' : ''}" data-ticket-select="${t.id}"><b>${esc(t.subject)}</b><span class="badge ${t.status === 'closed' ? 'closed' : 'moderator'}">${esc(t.status)}</span><small>${staff ? esc(t.user?.username || '') + ' · ' : ''}${fmtDate(t.updatedAt)}</small></button>`).join('') : '<div style="padding:14px" class="muted">Обращений пока нет.</div>'}</div><div class="card support-chat">${selected ? `<div class="card-head"><span>${esc(selected.subject)}</span><span>${staff ? `<a href="#/profile/${encodeURIComponent(selected.user?.username || '')}">${esc(selected.user?.username || '')}</a>` : ''} <span class="badge ${selected.status === 'closed' ? 'closed' : 'moderator'}">${esc(selected.status)}</span></span></div><div class="chat-messages">${selected.messages.map(m => `<div class="chat-bubble ${m.authorId === store.user.id ? 'mine' : 'theirs'}"><small>${m.authorId === selected.userId ? esc(selected.user?.username || 'Пользователь') : 'Поддержка'} · ${fmtDate(m.createdAt)}</small><div>${esc(m.text)}</div></div>`).join('')}</div><div style="padding:12px"><textarea data-ticket-reply="${selected.id}" placeholder="Ответить в обращении"></textarea><button class="btn small" data-send-ticket="${selected.id}" style="margin-top:6px">Отправить</button>${staff ? `<button class="btn ghost small" data-close-ticket="${selected.id}" style="margin-left:6px">${selected.status === 'closed' ? 'Открыть' : 'Закрыть'}</button>` : ''}</div>` : '<div style="padding:14px" class="muted">Выберите обращение слева.</div>'}</div></div>`;
  $('#createTicket')?.addEventListener('click', async () => { try { await api('/api/tickets', {method:'POST', body:JSON.stringify({subject:$('#ticketSubject').value,text:$('#ticketText').value})}); viewSupport(); } catch(e) { alert(e.message); } });
  document.querySelectorAll('[data-close-ticket]').forEach(b => b.onclick = async () => { const t = tickets.find(x=>x.id===b.dataset.closeTicket); await api(`/api/tickets/${t.id}/status`, {method:'POST',body:JSON.stringify({status:t.status==='closed'?'open':'closed'})}); viewSupport(); });
  document.querySelectorAll('[data-send-ticket]').forEach(b => b.onclick = async () => { const text = document.querySelector(`[data-ticket-reply="${b.dataset.sendTicket}"]`).value; try { await api(`/api/tickets/${b.dataset.sendTicket}/reply`, { method:'POST', body:JSON.stringify({text}) }); viewSupport(); } catch(e) { alert(e.message); } });
  document.querySelectorAll('[data-ticket-select]').forEach(b => b.onclick = () => { selectedTicketId = b.dataset.ticketSelect; viewSupport(); });
}

async function viewModeration() {
  if (!['admin', 'moderator'].includes(store.user?.role)) { location.hash = '#/login'; return; }
  document.querySelector('[data-nav="moderation"]')?.classList.add('active');
  try {
    const pending = await api('/api/staff/moderation');
    app.innerHTML = `<div class="crumb">Модерация публикаций</div><div class="card"><div class="card-head">Очередь (${pending.length})</div>${pending.length ? pending.map(p => `<div class="ticket-message"><b>${esc(p.author?.username || p.authorName || 'Пользователь')} · ${esc(p.thread?.title || 'Новая тема')}</b><div class="muted">${fmtDate(p.createdAt)}</div><div style="margin:5px 0">${esc(p.text)}</div><button class="btn small" data-moderate="${p.id}" data-action="approve">Опубликовать</button> <button class="btn danger small" data-moderate="${p.id}" data-action="reject">Отклонить</button></div>`).join('') : '<div style="padding:14px" class="muted">Очередь пуста.</div>'}</div>`;
    document.querySelectorAll('[data-moderate]').forEach(b => b.onclick = async () => { await api(`/api/staff/moderation/${b.dataset.moderate}`, { method:'POST', body:JSON.stringify({ action:b.dataset.action }) }); viewModeration(); loadStats(); });
  } catch (e) { app.innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
}

// ---------- вход ----------
function viewLogin() {
  app.innerHTML = `
    <div class="crumb"><a href="#/">Форум</a> / Вход</div>
    <div class="card form-box"><div class="card-head">Вход</div>
      <div style="padding:14px">
        <div id="err"></div>
        <label>Логин</label><input id="lUser" autocomplete="username">
        <label>Пароль</label><input id="lPass" type="password" autocomplete="current-password">
        <div style="margin-top:12px"><button class="btn" id="btnLogin" style="width:100%">Войти</button></div>
        <div class="muted" style="margin-top:10px">Нет аккаунта? <a href="#/register">Регистрация — только по коду приглашения</a></div>
      </div>
    </div>`;
  $('#btnLogin').onclick = async () => {
    try {
      const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ username: $('#lUser').value, password: $('#lPass').value }) });
      store.token = r.token; store.user = r.user; renderUserbox(); loadStats(); location.hash = '#/';
    } catch (e) { $('#err').innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
  };
}

// ---------- регистрация (invite-only) ----------
function viewRegister() {
  app.innerHTML = `
    <div class="crumb"><a href="#/">Форум</a> / Регистрация</div>
    <div class="card form-box"><div class="card-head">Регистрация</div>
      <div style="padding:14px">
        <div class="invite-hint">🔑 <b>Регистрация только по коду приглашения.</b><br>
        Код может создать <b>только администратор</b> в разделе «Админ» → «Инвайты». Без действующего кода создать аккаунт нельзя.</div>
        <div id="err"></div>
        <label>Ник (3–16, латиница/цифры/_)</label><input id="rUser" autocomplete="username">
        <label>Пароль (от 4 символов)</label><input id="rPass" type="password" autocomplete="new-password">
        <label>Код приглашения *</label><input id="rCode" placeholder="XXXX-XXXX-XXXX" style="font-weight:700;letter-spacing:1px">
        <div style="margin-top:12px"><button class="btn" id="btnReg" style="width:100%">Создать аккаунт</button></div>
        <div class="muted" style="margin-top:10px">Уже есть аккаунт? <a href="#/login">Войти</a></div>
      </div>
    </div>`;
  $('#btnReg').onclick = async () => {
    try {
      const r = await api('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username: $('#rUser').value, password: $('#rPass').value, inviteCode: $('#rCode').value }),
      });
      store.token = r.token; store.user = r.user; renderUserbox(); loadStats();
      app.innerHTML = `<div class="notice">✅ Аккаунт <b>${esc(r.user.username)}</b> создан! Инвайт-код использован. <a href="#/">Перейти на форум</a></div>`;
    } catch (e) { $('#err').innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
  };
}

// ---------- админка ----------
async function viewAdmin() {
  if (!store.user) { location.hash = '#/login'; return; }
  if (store.user.role !== 'admin') {
    app.innerHTML = '<div class="alert">⛔ Только для администратора. Коды приглашений может создавать только админ.</div>';
    return;
  }
  document.querySelector('[data-nav="admin"]')?.classList.add('active');
  app.innerHTML = '<div class="muted">Загрузка админки...</div>';
  try {
    const [invites, users, pending] = await Promise.all([api('/api/admin/invites'), api('/api/admin/users'), api('/api/staff/moderation')]);
    app.innerHTML = `
      <div class="crumb"><a href="#/">Форум</a> / Админ-панель</div>
      <div class="grid2">
        <div class="card">
          <div class="card-head">➕ Создать инвайт-код</div>
          <div style="padding:14px">
            <div id="invErr"></div>
            <label>Свой код (необязательно — иначе сгенерируется)</label>
            <input id="invCustom" placeholder="например VIP-FRIENDS">
            <label>Макс. использований</label>
            <input id="invUses" type="number" value="1" min="1" max="1000">
            <label>Срок действия (дней, 0 — бессрочно)</label>
            <input id="invDays" type="number" value="7" min="0" max="3650">
            <label>Заметка</label>
            <input id="invNote" placeholder="для кого / зачем">
            <div style="margin-top:12px"><button class="btn" id="btnMakeInvite" style="width:100%">Сгенерировать код</button></div>
            <div id="invResult" style="margin-top:10px"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-head">👥 Пользователи (${users.length})</div>
          <div style="max-height:420px;overflow:auto"><table class="tbl">
            <tr><th>Ник</th><th>Роль</th><th></th></tr>
            ${users.map((u) => `<tr><td><b>${esc(u.username)}</b></td><td>${roleBadge(u.role)}</td>
          <td><select data-role="${u.id}">
                ${['user', 'moderator', 'support', 'admin'].map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
              </select><br><button class="btn ghost small" data-ban="${u.id}" data-banned="${u.banned}" style="margin-top:4px">${u.banned ? 'Разбанить' : 'Забанить'}</button><button class="btn ghost small" data-restrict="${u.id}" style="margin-top:4px">Ограничить посты</button></td></tr>`).join('')}
          </table></div>
        </div>
      </div>
      <div class="card"><div class="card-head">🛡 Премодерация (${pending.length})</div>
        ${pending.length ? pending.map(p => `<div class="ticket-message"><b>${esc(p.author?.username || p.authorName || 'Пользователь')} · ${esc(p.thread?.title || 'Тема')}</b><div style="margin:5px 0">${esc(p.text)}</div><button class="btn small" data-moderate="${p.id}" data-action="approve">Опубликовать</button> <button class="btn danger small" data-moderate="${p.id}" data-action="reject">Отклонить</button></div>`).join('') : '<div style="padding:14px" class="muted">Очередь пуста.</div>'}
      </div>
      <div class="card">
        <div class="card-head">🔑 Инвайт-коды (${invites.length}) — создаёт только админ</div>
        <div style="overflow:auto"><table class="tbl">
          <tr><th>Код</th><th>Использовано</th><th>Статус</th><th>Истекает</th><th>Заметка</th><th>Кто использовал</th><th></th></tr>
          ${invites.map((i) => `<tr>
            <td><code class="invite">${esc(i.code)}</code> <button class="btn ghost small" data-copy="${esc(i.code)}">Копировать</button></td>
            <td><b>${i.usedCount}/${i.maxUses}</b></td>
            <td>${i.active ? '✅ активен' : '⏸ выкл'}</td>
            <td class="muted">${i.expiresAt ? fmtDate(i.expiresAt) : '∞'}</td>
            <td>${esc(i.note || '—')}</td>
            <td class="muted">${(i.usedBy || []).map((x) => esc(x.username)).join(', ') || '—'}</td>
            <td style="white-space:nowrap">
              <button class="btn ghost small" data-toggle="${i.id}">${i.active ? 'Выкл' : 'Вкл'}</button>
              <button class="btn danger small" data-del="${i.id}">Удалить</button>
            </td>
          </tr>`).join('') || '<tr><td colspan="7" class="muted">Кодов нет — создайте первый слева.</td></tr>'}
        </table></div>
      </div>`;

    $('#btnMakeInvite').onclick = async () => {
      try {
        const inv = await api('/api/admin/invites', {
          method: 'POST',
          body: JSON.stringify({
            customCode: $('#invCustom').value, maxUses: $('#invUses').value,
            expiresInDays: $('#invDays').value, note: $('#invNote').value,
          }),
        });
        $('#invResult').innerHTML = `<div class="notice">✅ Код создан: <code class="invite">${esc(inv.code)}</code> — отправьте его другу, он вводится при регистрации.</div>`;
        setTimeout(viewAdmin, 1200);
      } catch (e) { $('#invErr').innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
    };
    document.querySelectorAll('[data-copy]').forEach((b) => {
      b.onclick = () => { navigator.clipboard?.writeText(b.dataset.copy); b.textContent = 'Скопировано!'; };
    });
    document.querySelectorAll('[data-toggle]').forEach((b) => {
      b.onclick = async () => { await api(`/api/admin/invites/${b.dataset.toggle}/toggle`, { method: 'POST' }); viewAdmin(); };
    });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Удалить код?')) return;
        await api(`/api/admin/invites/${b.dataset.del}`, { method: 'DELETE' }); viewAdmin();
      };
    });
    document.querySelectorAll('[data-role]').forEach((sel) => {
      sel.onchange = async () => {
        try { await api(`/api/admin/users/${sel.dataset.role}/role`, { method: 'POST', body: JSON.stringify({ role: sel.value }) }); }
        catch (e) { alert(e.message); viewAdmin(); }
      };
    });
    document.querySelectorAll('[data-moderate]').forEach((b) => b.onclick = async () => { await api(`/api/staff/moderation/${b.dataset.moderate}`, { method:'POST', body:JSON.stringify({action:b.dataset.action}) }); viewAdmin(); });
    document.querySelectorAll('[data-ban]').forEach((b) => b.onclick = async () => { await api(`/api/admin/users/${b.dataset.ban}/sanction`, { method:'POST', body:JSON.stringify({type:'ban',value:b.dataset.banned !== 'true'}) }); viewAdmin(); });
    document.querySelectorAll('[data-restrict]').forEach((b) => b.onclick = async () => { const minutes = prompt('Ограничить публикации на сколько минут? 0 для снятия ограничения', '60'); if (minutes === null) return; await api(`/api/admin/users/${b.dataset.restrict}/sanction`, {method:'POST',body:JSON.stringify({type:'posting',minutes:Number(minutes)})}); viewAdmin(); });
  } catch (e) {
    app.innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  }
}

// ---------- поиск ----------
let searchTimer = null;
$('#globalSearch').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const q = e.target.value.trim();
  const box = $('#searchResults');
  if (q.length < 2) { box.style.display = 'none'; return; }
  searchTimer = setTimeout(async () => {
    try {
      const r = await api('/api/search?q=' + encodeURIComponent(q));
      box.innerHTML = r.length
        ? r.map((t) => `<a href="#/thread/${t.id}">${esc(t.title)} <span class="muted">— ${esc(t.authorName)}</span></a>`).join('')
        : '<div style="padding:10px" class="muted">Ничего не найдено</div>';
      box.style.display = 'block';
    } catch { /* ignore */ }
  }, 250);
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.top-search')) $('#searchResults').style.display = 'none';
});

// ---------- старт ----------
(async () => {
  await refreshMe();
  await loadStats();
  await refreshSidebarCategories();
  router();
})();
