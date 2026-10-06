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
      <button class="user-balance-pill" onclick="openDepositModal()" title="Баланс маркета · Нажмите для пополнения">
        <span class="user-balance-icon">₽</span>
        <span>${store.user.balance || 0} ₽</span>
      </button>
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
    else if (route === 'market') await viewMarket(id);
    else if (route === 'forum' && id === 'market') { location.hash = '#/market'; return; }
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

    // 1. Блоки категорий в стиле XenForo / Radmir
    const catBlocksHtml = (cats || []).map((c) => {
      const forumNodes = (c.forums || []).map((f) => {
        const color = getForumColor(f.id);

        let extraHtml = '';
        if (f.lastThread && f.last) {
          extraHtml = `
            <div class="forum-node-extra">
              ${avatar(f.last.authorName, f.last.authorColor, { avatar: f.last.authorAvatar })}
              <div class="forum-node-extra-body">
                <a href="#/thread/${f.lastThread.id}" class="forum-node-extra-title" title="${esc(f.lastThread.title)}">${esc(f.lastThread.title)}</a>
                <div class="forum-node-extra-meta">
                  <span class="muted">${timeAgo(f.last.createdAt)}</span> · <a href="#/profile/${esc(f.last.authorName)}">${esc(f.last.authorName)}</a>
                </div>
              </div>
            </div>`;
        } else {
          extraHtml = `
            <div class="forum-node-extra">
              <div class="forum-node-extra-empty">Нет новых тем</div>
            </div>`;
        }

        return `
          <div class="forum-node">
            <div class="cat-squircle" style="background:${color}18; border-color:${color}40; color:${color}">
              ${getForumIconSvg(f.id, f.name)}
            </div>
            <div class="forum-node-main">
              <a href="${f.id === 'market' ? '#/market' : `#/forum/${f.id}`}" class="forum-node-title">
                ${esc(f.name)}
                ${f.id === 'market' ? '<span class="label-prefix label-prefix--cyan" style="margin-left:8px; font-size:10.5px">LZT Маркет</span>' : ''}
              </a>
              <div class="forum-node-desc">${esc(f.description || '')}</div>
              <div class="forum-node-stats-mobile">
                <span>Темы: <b>${f.threads}</b></span> · <span>Сообщения: <b>${f.messages}</b></span>
              </div>
            </div>
            <div class="forum-node-stats">
              <div class="node-stat-row"><span>Темы:</span><span class="node-stat-num">${f.threads}</span></div>
              <div class="node-stat-row"><span>Сообщ:</span><span class="node-stat-num">${f.messages}</span></div>
            </div>
            ${extraHtml}
          </div>`;
      }).join('');

      return `
        <div class="cat-block">
          <div class="cat-block-head">
            <span>${esc(c.title)}</span>
            <span class="cat-block-count">${c.forums.length} разделов</span>
          </div>
          <div class="cat-block-list">
            ${forumNodes || '<div style="padding:16px" class="muted">В этой категории пока нет разделов</div>'}
          </div>
        </div>`;
    }).join('');

    // 2. Виджет: Новые сообщения (последние обсуждения)
    const latestWidgetRows = (latestThreads.length ? latestThreads : []).slice(0, 6).map((t) => {
      const color = getForumColor(t.forumId);
      const isHot = (t.replies || 0) >= 5;
      return `
        <div class="widget-thread-row">
          ${latestAvatar(t.authorName, t.authorColor, t.authorAvatar)}
          <div class="widget-thread-main">
            <a href="#/thread/${t.id}" class="widget-thread-title">
              ${t.pinned ? '<span class="nl-pin">📌</span>' : ''}${esc(t.title)}
            </a>
            <div class="widget-thread-meta">
              <span class="stream-cat-pill">
                <span class="stream-dot" style="background:${color}"></span>
                <a href="#/forum/${t.forumId}">${esc(t.forumName)}</a>
              </span>
              <span>·</span>
              <span class="muted">${esc(t.authorName)}</span>
              <span>·</span>
              <span class="stream-time">${timeAgo(t.lastAt)}</span>
            </div>
          </div>
          <div class="stream-right">
            <span class="stream-replies-pill ${isHot ? 'hot' : ''}" title="Ответов">
              ${t.replies}
            </span>
          </div>
        </div>`;
    }).join('');

    // 3. Онлайн пользователи в виджете
    const onlineUsersList = stats.onlineUsers || [];
    const onlineBadgesHtml = onlineUsersList.length ? onlineUsersList.map((u) => {
      const dotColor = u.role === 'admin' ? '#38bdf8' : (u.role === 'moderator' ? '#34d399' : '#94a3b8');
      return `
        <a href="#/profile/${esc(u.username)}" class="widget-online-user" title="${esc(u.username)} (${esc(u.role)})">
          <span class="stream-dot" style="background:${dotColor}"></span>
          <span>${esc(u.username)}</span>
        </a>`;
    }).join('') : '<span class="muted" style="font-size:12px">Нет пользователей онлайн</span>';

    app.innerHTML = `
      <div class="subnav-bar">
        <div class="subnav-left">
          <a href="#/" class="subnav-link active">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L8.354 1.146z"/></svg>
            Разделы форума
          </a>
          <a href="#/market" class="subnav-link">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
            Маркет
          </a>
          <a href="#/forum/news" class="subnav-link">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M12 4v16l-5-4H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h3l5-4zm2 2.5a6 6 0 0 1 0 11v-2a4 4 0 0 0 0-7v-2zm3-3a9 9 0 0 1 0 17v-2a7 7 0 0 0 0-13V3.5z"/></svg>
            Новости
          </a>
          <a href="#/members" class="subnav-link">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/></svg>
            Пользователи
          </a>
          <a href="#/support" class="subnav-link">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/></svg>
            Поддержка
          </a>
        </div>
        <div class="subnav-right">
          ${store.user ? `
            <a href="#/forum/cs2" class="btn small" style="display:inline-flex; align-items:center; gap:6px">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/></svg>
              Создать тему
            </a>
          ` : `
            <a href="#/login" class="btn ghost small">Войдите для публикации</a>
          `}
        </div>
      </div>

      <div class="nl-home-grid">
        <div class="cat-blocks-container">
          ${catBlocksHtml || '<div class="card" style="padding:20px; color:var(--muted)">Разделов пока нет</div>'}
        </div>

        <div class="widget-stack">
          <!-- Виджет 1: Новые сообщения -->
          <div class="widget-card">
            <div class="widget-head">
              <div class="widget-head-left">
                <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" style="color:var(--accent-bright)"><path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-1.5 2.5-1.5 3.5C2.5 13 4.5 16 8 16z"/></svg>
                <span>Новые сообщения</span>
              </div>
              <a href="#/forum/cs2" class="widget-head-link">Все темы →</a>
            </div>
            <div class="widget-latest-list">
              ${latestWidgetRows || '<div style="padding:16px" class="muted">Тем пока нет</div>'}
            </div>
          </div>

          <!-- Виджет 2: Статистика форума -->
          <div class="widget-card">
            <div class="widget-head">
              <div class="widget-head-left">
                <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" style="color:var(--accent-bright)"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm4 10h1.5V7H4v5zm3 0h1.5V4H7v8zm3 0h1.5V9H10v3z"/></svg>
                <span>Статистика форума</span>
              </div>
            </div>
            <div class="widget-body">
              <div class="widget-stats-rows">
                <div class="widget-stat-pair">
                  <span class="widget-stat-label">Темы:</span>
                  <span class="widget-stat-value">${stats.threads ?? 0}</span>
                </div>
                <div class="widget-stat-pair">
                  <span class="widget-stat-label">Сообщения:</span>
                  <span class="widget-stat-value">${stats.messages ?? 0}</span>
                </div>
                <div class="widget-stat-pair">
                  <span class="widget-stat-label">Пользователи:</span>
                  <span class="widget-stat-value">${stats.users ?? 0}</span>
                </div>
                <div class="widget-stat-pair">
                  <span class="widget-stat-label">Новый участник:</span>
                  <span class="widget-stat-value">
                    ${stats.newestUser ? `<a href="#/profile/${esc(stats.newestUser)}">${esc(stats.newestUser)}</a>` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Виджет 3: Пользователи онлайн -->
          <div class="widget-card">
            <div class="widget-head">
              <div class="widget-head-left">
                <span class="uf-live-pulse" style="width:8px; height:8px"><span class="uf-live-pulse-dot" style="background:#22c55e"></span></span>
                <span>Сейчас на форуме</span>
              </div>
              <span class="cat-block-count">Онлайн: ${stats.onlineCount || 1}</span>
            </div>
            <div class="widget-body">
              <div class="widget-online-flow">
                ${onlineBadgesHtml}
              </div>
              <div class="widget-footer-count">
                Всего посетителей: <b>${stats.onlineCount || 1}</b> (пользователей: <b>${onlineUsersList.length}</b>)
              </div>
            </div>
          </div>

          <!-- Виджет 4: Сообщество и навигация -->
          <div class="widget-card">
            <div class="widget-head">
              <div class="widget-head-left">
                <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" style="color:var(--accent-bright)"><path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12z"/></svg>
                <span>Сообщество UFounded</span>
              </div>
            </div>
            <div class="widget-body">
              <div class="widget-social-grid">
                <a href="#/support" class="widget-social-btn">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/></svg>
                  Поддержка
                </a>
                <a href="#/members" class="widget-social-btn">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>
                  Участники
                </a>
                <a href="#/messages" class="widget-social-btn">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2z"/></svg>
                  Чат / ЛС
                </a>
                <a href="#/forum/rules" class="widget-social-btn">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M12 2l7 3.5v6.2c0 4.8-3.1 9.3-7 10.3-3.9-1-7-5.5-7-10.3V5.5L12 2z"/></svg>
                  Правила
                </a>
              </div>
            </div>
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

// ==========================================
// МАРКЕТПЛЕЙС (LZT Market style)
// ==========================================

const MARKET_PLATFORMS = [
  { id: 'all', name: 'Все товары', icon: '🌐' },
  { id: 'cs2', name: 'CS 2', icon: '🎯' },
  { id: 'steam', name: 'Steam', icon: '💨' },
  { id: 'telegram', name: 'Telegram', icon: '✈️' },
  { id: 'discord', name: 'Discord', icon: '🎮' },
  { id: 'epic', name: 'Epic Games', icon: '⚡' },
  { id: 'valorant', name: 'Valorant', icon: '🗡️' },
  { id: 'fortnite', name: 'Fortnite', icon: '🦹' },
  { id: 'genshin', name: 'Genshin', icon: '✨' },
  { id: 'other', name: 'Minecraft / Другое', icon: '🧱' },
  { id: 'services', name: 'Услуги и софт', icon: '🛠️' },
];

const MARKET_ORIGINS = {
  personal: { label: 'Личный', cls: 'origin-personal' },
  resale: { label: 'Перепродажа', cls: 'origin-resale' },
  autoreg: { label: 'Авторег', cls: 'origin-autoreg' },
  brute: { label: 'Брут', cls: 'origin-brute' },
  phishing: { label: 'Фишинг', cls: 'origin-phishing' },
  stealer: { label: 'Стиллер', cls: 'origin-stealer' },
};

const MARKET_WARRANTIES = {
  none: 'На момент покупки',
  '12h': '12 часов гарантии',
  '24h': '24 часа гарантии',
  '3d': '3 дня гарантии',
};

function getMarketPlatformSvg(cat) {
  const c = (cat || '').toLowerCase();
  if (c === 'cs2') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path fill-rule="evenodd" d="M11 2a1 1 0 0 1 2 0v2.06c4.07.47 7.47 3.87 7.94 7.94H23a1 1 0 1 1 0 2h-2.06c-.47 4.07-3.87 7.47-7.94 7.94V24a1 1 0 1 1-2 0v-2.06c-4.07-.47-7.47-3.87-7.94-7.94H1a1 1 0 1 1 0-2h2.06c.47-4.07 3.87-7.47 7.94-7.94V2zm0 4.08C7.62 6.54 4.54 9.62 4.08 13c.46 3.38 3.54 6.46 6.92 6.92V17a1 1 0 1 1 2 0v2.92c3.38-.46 6.46-3.54 6.92-6.92H17a1 1 0 1 1 0-2h2.92C19.46 7.62 16.38 4.54 13 4.08V7a1 1 0 1 1-2 0V4.08zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" clip-rule="evenodd"/></svg>`;
  if (c === 'steam') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.848-1.503 3.351-3.351 3.351-1.604 0-2.952-1.135-3.284-2.646L.38 15.02C1.758 20.198 6.442 24 11.979 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z"/></svg>`;
  if (c === 'telegram') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06-.01.19-.04.38z"/></svg>`;
  if (c === 'discord') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;
  if (c === 'epic') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l8 4.5v11L12 22 4 17.5v-11L12 2zm0 3.3L6.5 8.4v7.2L12 18.7l5.5-3.1V8.4L12 5.3zm-1 3.7h2v6h-2V9z"/></svg>`;
  if (c === 'valorant') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.2 4l9.8 16 9.8-16h-4.9L12 12.1 7.1 4H2.2z"/></svg>`;
  if (c === 'fortnite') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 2v20l5-4V2H7zm6 0v14l4-3.2V2h-4z"/></svg>`;
  if (c === 'genshin') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l2.6 6.8L22 12l-7.4 3.2L12 22l-2.6-6.8L2 12l7.4-3.2L12 2z"/></svg>`;
  if (c === 'other') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l9 5.2v9.6L12 22l-9-5.2V7.2L12 2zm0 2.3L4.8 8.4 12 12.6l7.2-4.2L12 4.3zM4 10.1v6.7l7 4v-6.7l-7-4zm16 0l-7 4v6.7l7-4v-6.7z"/></svg>`;
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.6-1.4 2.5c-.2.3-.2.6-.2 1 0 1.1.9 2 2 2h12v-2H7.4l.9-1.6h7.5c.8 0 1.4-.4 1.7-1l3.6-6.5c.1-.2.2-.4.2-.6 0-.6-.4-1-1-1H5.2L4.3 2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;
}

let marketFilterState = {
  category: 'all',
  q: '',
  origin: 'all',
  warranty: 'all',
  minPrice: '',
  maxPrice: '',
  sort: 'new',
  tab: 'all',
};

function closeMarketModal() {
  const m = document.querySelector('.market-modal-backdrop');
  if (m) m.remove();
}

function copyMarketText(text, btn) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = 'Скопировано! ✓';
    btn.classList.add('success');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('success');
    }, 2000);
  }
}

async function viewMarket(id) {
  document.querySelector('[data-nav="market"]')?.classList.add('active');
  if (id && id !== 'catalog') {
    await viewMarketItem(id);
  } else {
    await viewMarketCatalog();
  }
}

async function viewMarketCatalog() {
  app.innerHTML = '<div class="muted" style="padding:20px">Загрузка маркета...</div>';
  try {
    const params = new URLSearchParams();
    if (marketFilterState.category !== 'all') params.set('category', marketFilterState.category);
    if (marketFilterState.q) params.set('q', marketFilterState.q);
    if (marketFilterState.origin !== 'all') params.set('origin', marketFilterState.origin);
    if (marketFilterState.warranty !== 'all') params.set('warranty', marketFilterState.warranty);
    if (marketFilterState.minPrice) params.set('minPrice', marketFilterState.minPrice);
    if (marketFilterState.maxPrice) params.set('maxPrice', marketFilterState.maxPrice);
    if (marketFilterState.sort) params.set('sort', marketFilterState.sort);
    if (marketFilterState.tab !== 'all') params.set('tab', marketFilterState.tab);

    const items = await api(`/api/market?${params.toString()}`);

    // Платформы (верхние фильтры)
    const platformChipsHtml = MARKET_PLATFORMS.map((p) => {
      const active = marketFilterState.category === p.id ? 'active' : '';
      return `
        <div class="platform-chip ${active}" onclick="setMarketCategory('${p.id}')">
          <span class="platform-chip-icon">${getMarketPlatformSvg(p.id)}</span>
          <span>${esc(p.name)}</span>
        </div>`;
    }).join('');

    // Карточки товаров
    const itemsHtml = items.length ? items.map((item) => {
      const orig = MARKET_ORIGINS[item.origin] || { label: item.origin, cls: 'origin-resale' };
      const warText = MARKET_WARRANTIES[item.warranty] || 'Гарантия';
      const isSold = item.status === 'sold';

      let actionBtn = '';
      if (isSold) {
        if (item.hasPurchased) {
          actionBtn = `<button class="btn small success" onclick="event.stopPropagation(); viewMarketItem('${item.id}')">🔑 Куплено</button>`;
        } else {
          actionBtn = `<span class="badge closed" style="margin:0">Куплен</span>`;
        }
      } else {
        if (item.isOwner) {
          actionBtn = `<span class="badge user" style="margin:0">Ваш лот</span>`;
        } else {
          actionBtn = `<button class="btn small primary market-buy-btn" onclick="event.stopPropagation(); openBuyModal('${item.id}')">Купить</button>`;
        }
      }

      return `
        <div class="market-card" onclick="location.hash='#/market/${item.id}'" style="cursor:pointer">
          <div class="market-card-head">
            <span class="market-platform-tag">
              <span style="color:var(--accent-bright)">${getMarketPlatformSvg(item.category)}</span>
              <span>${esc(item.category)}</span>
            </span>
            <div class="market-badges-cluster">
              <span class="badge-origin ${orig.cls}">${esc(orig.label)}</span>
              <span class="badge-warranty" title="Гарантия">🛡️ ${esc(warText.replace(' гарантии', ''))}</span>
              ${isSold ? '<span class="badge closed" style="margin:0">Продан</span>' : ''}
            </div>
          </div>
          <div class="market-card-body">
            <a href="#/market/${item.id}" class="market-card-title" onclick="event.stopPropagation()">${esc(item.title)}</a>
            <div class="market-card-desc-snippet">${esc(item.description || 'Без дополнительного описания')}</div>
            <div class="market-seller-meta">
              ${avatar(item.sellerName, item.sellerColor, { avatar: item.sellerAvatar })}
              <span>${esc(item.sellerName)}</span>
              <span class="muted">· ${timeAgo(item.createdAt)}</span>
              <span class="muted" style="margin-left:auto">👁 ${item.views}</span>
            </div>
          </div>
          <div class="market-card-foot">
            <div class="market-card-price">${item.price} ₽</div>
            <div class="market-card-actions" onclick="event.stopPropagation()">
              ${actionBtn}
              <a href="#/market/${item.id}" class="btn small ghost">Инфо</a>
            </div>
          </div>
        </div>`;
    }).join('') : `
      <div class="card" style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--muted)">
        <div style="font-size: 38px; margin-bottom: 10px">🔍</div>
        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px">Товаров не найдено</div>
        <div>Попробуйте изменить параметры поиска или выберите другую категорию.</div>
        <div style="margin-top: 16px">
          <button class="btn ghost small" onclick="resetMarketFilters()">Сбросить фильтры</button>
          ${store.user ? '<button class="btn small primary" onclick="openSellModal()" style="margin-left:8px">+ Продать аккаунт</button>' : ''}
        </div>
      </div>`;

    app.innerHTML = `
      <div class="market-page">
        <!-- Полоса платформ в стиле LZT -->
        <div class="market-platforms-scroll">
          ${platformChipsHtml}
        </div>

        <!-- Верхняя панель управления и табов -->
        <div class="market-toolbar">
          <div class="market-tabs">
            <div class="market-tab ${marketFilterState.tab === 'all' ? 'active' : ''}" onclick="setMarketTab('all')">
              Каталог товаров
            </div>
            ${store.user ? `
              <div class="market-tab ${marketFilterState.tab === 'my_items' ? 'active' : ''}" onclick="setMarketTab('my_items')">
                Мои объявления
              </div>
              <div class="market-tab ${marketFilterState.tab === 'my_purchases' ? 'active' : ''}" onclick="setMarketTab('my_purchases')">
                Мои покупки
              </div>
            ` : ''}
          </div>
          <div class="market-toolbar-actions">
            ${store.user ? `
              <button class="user-balance-pill" onclick="openDepositModal()" title="Нажмите для пополнения">
                <span class="user-balance-icon">₽</span>
                <span>Баланс: <b>${store.user.balance || 0} ₽</b></span>
                <span style="font-size:11px;opacity:0.8">+</span>
              </button>
              <button class="btn-sell-market" onclick="openSellModal()">
                <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/></svg>
                Продать аккаунт
              </button>
            ` : `
              <a href="#/login" class="btn small ghost">Войдите для покупок и продаж</a>
            `}
          </div>
        </div>

        <!-- Фильтры и поиск LZT -->
        <div class="market-filters">
          <div class="market-search-row">
            <div class="market-search-input-wrap">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
              <input class="market-search-input" id="mktSearch" placeholder="Поиск по названию или описанию..." value="${esc(marketFilterState.q)}">
            </div>
            <button class="btn small" onclick="applyMarketSearch()">Найти</button>
            <button class="btn ghost small" onclick="resetMarketFilters()">Сброс</button>
          </div>

          <div class="market-filter-row">
            <div class="market-filter-group">
              <span>Цена:</span>
              <input class="market-price-input" id="mktMin" type="number" placeholder="От ₽" value="${esc(marketFilterState.minPrice)}">
              <span>—</span>
              <input class="market-price-input" id="mktMax" type="number" placeholder="До ₽" value="${esc(marketFilterState.maxPrice)}">
            </div>

            <div class="market-filter-group">
              <span>Происхождение:</span>
              <select id="mktOrigin" onchange="marketFilterState.origin=this.value; viewMarketCatalog();">
                <option value="all" ${marketFilterState.origin === 'all' ? 'selected' : ''}>Любое</option>
                <option value="personal" ${marketFilterState.origin === 'personal' ? 'selected' : ''}>Личный</option>
                <option value="resale" ${marketFilterState.origin === 'resale' ? 'selected' : ''}>Перепродажа</option>
                <option value="autoreg" ${marketFilterState.origin === 'autoreg' ? 'selected' : ''}>Авторег</option>
                <option value="brute" ${marketFilterState.origin === 'brute' ? 'selected' : ''}>Брут</option>
                <option value="phishing" ${marketFilterState.origin === 'phishing' ? 'selected' : ''}>Фишинг</option>
                <option value="stealer" ${marketFilterState.origin === 'stealer' ? 'selected' : ''}>Стиллер</option>
              </select>
            </div>

            <div class="market-filter-group">
              <span>Гарантия:</span>
              <select id="mktWarranty" onchange="marketFilterState.warranty=this.value; viewMarketCatalog();">
                <option value="all" ${marketFilterState.warranty === 'all' ? 'selected' : ''}>Любая</option>
                <option value="24h" ${marketFilterState.warranty === '24h' ? 'selected' : ''}>24 часа</option>
                <option value="12h" ${marketFilterState.warranty === '12h' ? 'selected' : ''}>12 часов</option>
                <option value="3d" ${marketFilterState.warranty === '3d' ? 'selected' : ''}>3 дня</option>
                <option value="none" ${marketFilterState.warranty === 'none' ? 'selected' : ''}>На момент покупки</option>
              </select>
            </div>

            <div class="market-filter-group" style="margin-left:auto">
              <span>Сортировка:</span>
              <select id="mktSort" onchange="marketFilterState.sort=this.value; viewMarketCatalog();">
                <option value="new" ${marketFilterState.sort === 'new' ? 'selected' : ''}>Сначала новые</option>
                <option value="cheap" ${marketFilterState.sort === 'cheap' ? 'selected' : ''}>Сначала дешевые</option>
                <option value="expensive" ${marketFilterState.sort === 'expensive' ? 'selected' : ''}>Сначала дорогие</option>
                <option value="views" ${marketFilterState.sort === 'views' ? 'selected' : ''}>По просмотрам</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Сетка товаров -->
        <div class="market-grid">
          ${itemsHtml}
        </div>
      </div>`;

    // Event listeners
    $('#mktSearch')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyMarketSearch();
    });
    $('#mktMin')?.addEventListener('change', (e) => {
      marketFilterState.minPrice = e.target.value;
      viewMarketCatalog();
    });
    $('#mktMax')?.addEventListener('change', (e) => {
      marketFilterState.maxPrice = e.target.value;
      viewMarketCatalog();
    });
  } catch (err) {
    app.innerHTML = `<div class="alert">${esc(err.message)}</div>`;
  }
}

function setMarketCategory(catId) {
  marketFilterState.category = catId;
  viewMarketCatalog();
}

function setMarketTab(tabId) {
  marketFilterState.tab = tabId;
  viewMarketCatalog();
}

function applyMarketSearch() {
  marketFilterState.q = $('#mktSearch')?.value.trim() || '';
  viewMarketCatalog();
}

function resetMarketFilters() {
  marketFilterState = {
    category: 'all',
    q: '',
    origin: 'all',
    warranty: 'all',
    minPrice: '',
    maxPrice: '',
    sort: 'new',
    tab: 'all',
  };
  viewMarketCatalog();
}

// Просмотр отдельного товара маркета
async function viewMarketItem(itemId) {
  app.innerHTML = '<div class="muted" style="padding:20px">Загрузка объявления...</div>';
  try {
    const item = await api(`/api/market/${itemId}`);
    const orig = MARKET_ORIGINS[item.origin] || { label: item.origin, cls: 'origin-resale' };
    const warText = MARKET_WARRANTIES[item.warranty] || 'Гарантия';
    const isSold = item.status === 'sold';

    let unlockedBox = '';
    if (item.credentials) {
      unlockedBox = `
        <div class="market-unlocked-box">
          <div class="market-unlocked-head">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>
            <span>Данные для входа в аккаунт (выданы после покупки):</span>
          </div>
          <pre class="market-creds-pre" id="itemCreds">${esc(item.credentials)}</pre>
          <div style="margin-top: 10px; display:flex; gap:10px; align-items:center">
            <button class="btn small success" onclick="copyMarketText($('#itemCreds').textContent, this)">Копировать данные</button>
            <span class="muted" style="font-size:12px">${item.boughtAt ? 'Куплено: ' + fmtDate(item.boughtAt) : ''}</span>
          </div>
        </div>`;
    }

    let buyActionHtml = '';
    if (isSold) {
      buyActionHtml = item.hasPurchased
        ? '<div class="notice" style="margin:0">✅ Вы приобрели этот товар. Данные отображены выше.</div>'
        : '<div class="alert" style="margin:0; background:rgba(100,116,139,0.1); border-color:rgba(100,116,139,0.3); color:#94a3b8">Товар уже продан другому покупателю.</div>';
    } else {
      if (item.isOwner) {
        buyActionHtml = `
          <div style="display:flex; gap:10px; align-items:center">
            <span class="badge user" style="margin:0">Ваше объявление</span>
            <button class="btn danger small" onclick="deleteMarketItem('${item.id}')">Снять с продажи</button>
          </div>`;
      } else {
        buyActionHtml = `
          <button class="btn primary" style="width:100%; font-size:15px; padding:12px; font-weight:700" onclick="openBuyModal('${item.id}')">
            Купить аккаунт за ${item.price} ₽
          </button>`;
      }
    }

    app.innerHTML = `
      <div>
        <div class="crumb">
          <a href="#/market">Маркет</a> / 
          <a href="#/market" onclick="setMarketCategory('${item.category}')">${esc(item.category.toUpperCase())}</a> / 
          <span style="color:#fff">${esc(item.title)}</span>
        </div>

        ${unlockedBox}

        <div style="display:grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items:start">
          <!-- Левая колонка: описание и детали -->
          <div class="card">
            <div class="card-head" style="gap:10px; flex-wrap:wrap">
              <div style="display:flex; align-items:center; gap:8px">
                <span style="color:var(--accent-bright)">${getMarketPlatformSvg(item.category)}</span>
                <span>${esc(item.title)}</span>
              </div>
              <div class="market-badges-cluster">
                <span class="badge-origin ${orig.cls}">${esc(orig.label)}</span>
                <span class="badge-warranty">🛡️ ${esc(warText)}</span>
              </div>
            </div>
            <div style="padding: 20px; display:flex; flex-direction:column; gap:16px">
              <div>
                <h4 style="margin:0 0 8px; color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:0.5px">Описание и характеристики</h4>
                <div style="font-size:14.5px; line-height:1.6; white-space:pre-wrap; word-break:break-word; color:#e2eaf4">
                  ${esc(item.description || 'Продавец не указал подробное описание.')}
                </div>
              </div>

              <div style="border-top:1px solid var(--border); padding-top:14px">
                <table class="tbl">
                  <tr><th style="width:160px">Категория</th><td>${esc(item.category.toUpperCase())}</td></tr>
                  <tr><th>Происхождение</th><td>${esc(orig.label)}</td></tr>
                  <tr><th>Гарантия</th><td>${esc(warText)}</td></tr>
                  <tr><th>Дата публикации</th><td>${fmtDate(item.createdAt)}</td></tr>
                  <tr><th>Просмотров</th><td>${item.views}</td></tr>
                </table>
              </div>
            </div>
          </div>

          <!-- Правая колонка: покупка и продавец -->
          <div style="display:flex; flex-direction:column; gap:16px">
            <div class="card" style="box-shadow: 0 4px 20px rgba(0,0,0,0.3)">
              <div class="card-head">Оплата товара</div>
              <div style="padding: 20px; display:flex; flex-direction:column; gap:16px">
                <div>
                  <div class="muted" style="font-size:12px; margin-bottom:4px">Стоимость товара:</div>
                  <div style="font-size:28px; font-weight:800; color:#34d399">${item.price} ₽</div>
                </div>

                <div style="font-size:12px; color:var(--muted); line-height:1.4">
                  🛡️ Покупка через безопасную сделку маркета. Данные от аккаунта будут выданы моментально после оплаты.
                </div>

                ${buyActionHtml}
              </div>
            </div>

            <div class="card">
              <div class="card-head">Продавец</div>
              <div style="padding: 18px; display:flex; flex-direction:column; gap:12px">
                <div style="display:flex; align-items:center; gap:12px">
                  ${avatar(item.sellerName, item.sellerColor, { avatar: item.sellerAvatar })}
                  <div>
                    <a href="#/profile/${esc(item.sellerName)}" style="font-weight:700; color:#fff; font-size:15px">${esc(item.sellerName)}</a>
                    <div style="margin-top:2px">${roleBadge(item.sellerRole)}</div>
                  </div>
                </div>

                <div style="display:flex; gap:8px; margin-top:4px">
                  <a href="#/profile/${esc(item.sellerName)}" class="btn small ghost" style="flex:1; text-align:center">Профиль</a>
                  <a href="#/messages" class="btn small" style="flex:1; text-align:center">Написать</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  } catch (err) {
    app.innerHTML = `<div class="alert">${esc(err.message)}</div>`;
  }
}

async function deleteMarketItem(id) {
  if (!confirm('Вы уверены, что хотите снять этот товар с продажи?')) return;
  try {
    await api(`/api/market/${id}`, { method: 'DELETE' });
    location.hash = '#/market';
  } catch (e) {
    alert(e.message);
  }
}

// Модальное окно: Выставить аккаунт на продажу
function openSellModal() {
  if (!store.user) {
    location.hash = '#/login';
    return;
  }
  closeMarketModal();

  const modal = document.createElement('div');
  modal.className = 'market-modal-backdrop';
  modal.onclick = (e) => { if (e.target === modal) closeMarketModal(); };

  modal.innerHTML = `
    <div class="market-modal">
      <div class="market-modal-head">
        <h3>
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style="color:var(--accent-bright)"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/></svg>
          Выставить аккаунт на продажу
        </h3>
        <button class="market-modal-close" onclick="closeMarketModal()">&times;</button>
      </div>

      <div class="market-modal-body">
        <div id="sellModalErr"></div>

        <div class="market-field">
          <label>Категория / Игра *</label>
          <select id="sellCat">
            <option value="cs2">CS 2</option>
            <option value="steam">Steam</option>
            <option value="telegram">Telegram</option>
            <option value="discord">Discord</option>
            <option value="epic">Epic Games</option>
            <option value="valorant">Valorant</option>
            <option value="fortnite">Fortnite</option>
            <option value="genshin">Genshin Impact</option>
            <option value="other">Minecraft / Другое</option>
            <option value="services">Услуги и софт</option>
          </select>
        </div>

        <div class="market-field">
          <label>Название объявления *</label>
          <input id="sellTitle" placeholder="например: CS2 Prime (15 медалей) + Инвентарь 3000₽ | Родная почта" maxlength="140">
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px">
          <div class="market-field">
            <label>Цена (в рублях ₽) *</label>
            <input id="sellPrice" type="number" min="10" max="1000000" placeholder="490">
          </div>

          <div class="market-field">
            <label>Происхождение *</label>
            <select id="sellOrigin">
              <option value="personal">Личный</option>
              <option value="resale" selected>Перепродажа</option>
              <option value="autoreg">Авторег</option>
              <option value="brute">Брут</option>
              <option value="phishing">Фишинг</option>
              <option value="stealer">Стиллер</option>
            </select>
          </div>
        </div>

        <div class="market-field">
          <label>Гарантия *</label>
          <select id="sellWarranty">
            <option value="24h" selected>24 часа гарантии</option>
            <option value="12h">12 часов гарантии</option>
            <option value="3d">3 дня гарантии</option>
            <option value="none">На момент покупки</option>
          </select>
        </div>

        <div class="market-field">
          <label>Описание и характеристики товара</label>
          <textarea id="sellDesc" placeholder="Опишите аккаунт: инвентарь, ранг, ссылки, отлежку, наличие чеков..."></textarea>
        </div>

        <div class="market-field">
          <label style="color:#38bdf8">Данные от аккаунта для покупателя *</label>
          <textarea id="sellCreds" placeholder="Логин:Пароль, почта, секретный вопрос, токен...&#10;Будет выдано покупателю автоматически при оплате." style="border-color:rgba(56,189,248,0.4)"></textarea>
          <small class="muted" style="font-size:11.5px">🔒 Данные хранятся в зашифрованном виде и передаются покупателю моментально в момент оплаты.</small>
        </div>
      </div>

      <div class="market-modal-foot">
        <button class="btn ghost small" onclick="closeMarketModal()">Отмена</button>
        <button class="btn primary small" id="btnSubmitSell">Опубликовать на маркете</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  $('#btnSubmitSell').onclick = async () => {
    const errBox = $('#sellModalErr');
    try {
      errBox.innerHTML = '';
      const title = $('#sellTitle').value.trim();
      const category = $('#sellCat').value;
      const price = Number($('#sellPrice').value);
      const origin = $('#sellOrigin').value;
      const warranty = $('#sellWarranty').value;
      const description = $('#sellDesc').value.trim();
      const credentials = $('#sellCreds').value.trim();

      if (title.length < 5) throw new Error('Заголовок должен содержать минимум 5 символов');
      if (isNaN(price) || price < 10) throw new Error('Минимальная цена — 10 ₽');
      if (!credentials) throw new Error('Укажите данные от аккаунта для покупателя');

      const newItem = await api('/api/market', {
        method: 'POST',
        body: JSON.stringify({ title, category, price, origin, warranty, description, credentials }),
      });

      closeMarketModal();
      location.hash = `#/market/${newItem.id}`;
    } catch (err) {
      errBox.innerHTML = `<div class="alert">${esc(err.message)}</div>`;
    }
  };
}

// Модальное окно: Покупка аккаунта
async function openBuyModal(itemId) {
  if (!store.user) {
    location.hash = '#/login';
    return;
  }
  closeMarketModal();

  const modal = document.createElement('div');
  modal.className = 'market-modal-backdrop';
  modal.onclick = (e) => { if (e.target === modal) closeMarketModal(); };

  modal.innerHTML = `
    <div class="market-modal">
      <div class="market-modal-head">
        <h3>
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style="color:#22c55e"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
          Покупка аккаунта
        </h3>
        <button class="market-modal-close" onclick="closeMarketModal()">&times;</button>
      </div>
      <div class="market-modal-body" id="buyModalContent">
        <div class="muted">Загрузка данных товара...</div>
      </div>
    </div>`;

  document.body.appendChild(modal);

  try {
    const item = await api(`/api/market/${itemId}`);
    const userBalance = store.user.balance || 0;
    const canAfford = userBalance >= item.price;
    const warText = MARKET_WARRANTIES[item.warranty] || 'Гарантия';

    $('#buyModalContent').innerHTML = `
      <div id="buyErr"></div>
      <div>
        <div style="font-size:16px; font-weight:700; color:#fff; margin-bottom:4px">${esc(item.title)}</div>
        <div class="muted" style="font-size:12px">Продавец: <b>${esc(item.sellerName)}</b> · Гарантия: <b>${esc(warText)}</b></div>
      </div>

      <div style="background:#050d18; border:1px solid var(--border); border-radius:8px; padding:14px; display:flex; justify-content:space-between; align-items:center">
        <div>
          <div class="muted" style="font-size:11.5px">К списанию:</div>
          <div style="font-size:22px; font-weight:800; color:#34d399">${item.price} ₽</div>
        </div>
        <div style="text-align:right">
          <div class="muted" style="font-size:11.5px">Ваш баланс:</div>
          <div style="font-size:16px; font-weight:700; color:${canAfford ? '#fff' : '#f87171'}">${userBalance} ₽</div>
        </div>
      </div>

      ${canAfford ? `
        <div class="notice" style="margin:0">
          🛡️ Безопасная сделка. С вашего баланса спишется <b>${item.price} ₽</b>, данные от аккаунта будут выданы немедленно.
        </div>
        <div style="margin-top:10px">
          <button class="btn primary" id="btnConfirmBuy" style="width:100%; padding:11px; font-weight:700">
            Оплатить ${item.price} ₽ и получить данные
          </button>
        </div>
      ` : `
        <div class="alert" style="margin:0">
          Недостаточно средств на балансе. Не хватает: <b>${item.price - userBalance} ₽</b>.
        </div>
        <div style="display:flex; gap:8px; margin-top:10px">
          <button class="btn small primary" style="flex:1" onclick="closeMarketModal(); openDepositModal();">
            Пополнить баланс (+${item.price - userBalance} ₽)
          </button>
        </div>
      `}`;

    $('#btnConfirmBuy')?.addEventListener('click', async () => {
      const errBox = $('#buyErr');
      try {
        errBox.innerHTML = '<div class="muted">Обработка покупки...</div>';
        const res = await api(`/api/market/${itemId}/buy`, { method: 'POST' });
        store.user.balance = res.newBalance;
        renderUserbox();

        $('#buyModalContent').innerHTML = `
          <div style="text-align:center; padding:10px 0">
            <div style="font-size:42px; margin-bottom:8px">🎉</div>
            <h3 style="margin:0 0 6px; color:#4ade80">Покупка успешно завершена!</h3>
            <div class="muted" style="font-size:13px">С вашего баланса списано ${item.price} ₽. Остаток: <b>${res.newBalance} ₽</b></div>
          </div>

          <div class="market-unlocked-box">
            <div class="market-unlocked-head">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>
              <span>Данные для входа в аккаунт:</span>
            </div>
            <pre class="market-creds-pre" id="boughtCreds">${esc(res.item.credentials)}</pre>
            <div style="margin-top:10px; display:flex; gap:10px">
              <button class="btn small success" onclick="copyMarketText($('#boughtCreds').textContent, this)">Копировать данные</button>
              <button class="btn small ghost" onclick="closeMarketModal(); location.hash='#/market/${item.id}';">К объявлению</button>
            </div>
          </div>`;
      } catch (e) {
        errBox.innerHTML = `<div class="alert">${esc(e.message)}</div>`;
      }
    });
  } catch (err) {
    $('#buyModalContent').innerHTML = `<div class="alert">${esc(err.message)}</div>`;
  }
}

// Модальное окно: Пополнение баланса
function openDepositModal() {
  if (!store.user) {
    location.hash = '#/login';
    return;
  }
  closeMarketModal();

  const modal = document.createElement('div');
  modal.className = 'market-modal-backdrop';
  modal.onclick = (e) => { if (e.target === modal) closeMarketModal(); };

  modal.innerHTML = `
    <div class="market-modal">
      <div class="market-modal-head">
        <h3>
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style="color:#22c55e"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"/></svg>
          Пополнение баланса
        </h3>
        <button class="market-modal-close" onclick="closeMarketModal()">&times;</button>
      </div>

      <div class="market-modal-body">
        <div id="depositErr"></div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:#060f1b; border:1px solid var(--border); padding:12px 16px; border-radius:8px">
          <span class="muted" style="font-size:13px">Текущий баланс:</span>
          <span style="font-size:18px; font-weight:800; color:#34d399">${store.user.balance || 0} ₽</span>
        </div>

        <div>
          <label style="font-size:12px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px">Быстрый выбор суммы:</label>
          <div class="deposit-chips-grid">
            <button class="deposit-chip" onclick="$('#depAmount').value='200'">+200 ₽</button>
            <button class="deposit-chip" onclick="$('#depAmount').value='500'">+500 ₽</button>
            <button class="deposit-chip" onclick="$('#depAmount').value='1000'">+1 000 ₽</button>
            <button class="deposit-chip" onclick="$('#depAmount').value='2500'">+2 500 ₽</button>
            <button class="deposit-chip" onclick="$('#depAmount').value='5000'">+5 000 ₽</button>
            <button class="deposit-chip" onclick="$('#depAmount').value='10000'">+10 000 ₽</button>
          </div>
        </div>

        <div class="market-field">
          <label>Сумма пополнения (₽)</label>
          <input id="depAmount" type="number" min="10" max="100000" value="500" placeholder="500">
        </div>
      </div>

      <div class="market-modal-foot">
        <button class="btn ghost small" onclick="closeMarketModal()">Отмена</button>
        <button class="btn primary small" id="btnDoDeposit">Пополнить баланс</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  $('#btnDoDeposit').onclick = async () => {
    const errBox = $('#depositErr');
    try {
      errBox.innerHTML = '';
      const amount = Number($('#depAmount').value);
      if (isNaN(amount) || amount < 10) throw new Error('Минимальная сумма — 10 ₽');

      const res = await api('/api/market/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });

      store.user.balance = res.balance;
      renderUserbox();
      closeMarketModal();

      if (location.hash.startsWith('#/market')) {
        router();
      }
    } catch (err) {
      errBox.innerHTML = `<div class="alert">${esc(err.message)}</div>`;
    }
  };
}

// ---------- старт ----------
(async () => {
  await refreshMe();
  await loadStats();
  await refreshSidebarCategories();
  router();
})();
