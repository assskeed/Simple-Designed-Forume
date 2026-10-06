const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'forume-secret-change-me-2026';
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------
function uid(prefix = 'id') {
  return prefix + '_' + crypto.randomBytes(6).toString('hex');
}

function randomInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chunk = (n) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${chunk(4)}-${chunk(4)}-${chunk(4)}`;
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    avatarColor: u.avatarColor,
    avatar: u.avatar || '',
    gender: u.gender || '',
    age: u.age || null,
    createdAt: u.createdAt,
    postsCount: u.postsCount || 0,
    likesReceived: u.likesReceived || 0,
    bio: u.bio || '',
    prefix: u.prefix || null,
    banned: !!u.banned,
    postingRestrictedUntil: u.postingRestrictedUntil || null,
    balance: typeof u.balance === 'number' ? u.balance : 2500,
  };
}

const AVATAR_COLORS = ['#3b9add', '#8e44ad', '#16a085', '#e67e22', '#e74c3c', '#2ecc71', '#f1c40f', '#3498db'];
function pickColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ---------- data layer (JSON file, без нативных модулей) ----------
let db = null;

function seed() {
  const now = Date.now();
  const day = 86400000;
  const adminPass = bcrypt.hashSync('1122', 10);

  const admin = {
    id: uid('u'), username: 'ask', passwordHash: adminPass,
    role: 'admin', avatarColor: '#3b9add', createdAt: now,
    postsCount: 1, likesReceived: 0, bio: 'Администратор проекта.', prefix: { id: 'founder', name: 'Основатель', color: '#f1c40f' },
  };

  const categories = [
    {
      id: 'cat_main', title: 'Главное',
      forums: [
        { id: 'news', name: 'Новости проекта', description: 'Обновления форума, события и объявления администрации.', icon: '📢' },
        { id: 'rules', name: 'Правила и помощь', description: 'Правила форума, гайды для новичков, вопросы администрации.', icon: '📜' },
        { id: 'flood', name: 'Флудилка', description: 'Свободное общение на любые темы. Оффтоп разрешён.', icon: '💬' },
      ],
    },
    {
      id: 'cat_games', title: 'Игры и софт',
      forums: [
        { id: 'cs2', name: 'CS 2', description: 'Обсуждение игры, конфиги, скины, поиск тиммейтов.', icon: '🔫' },
        { id: 'mc', name: 'Minecraft', description: 'Серверы, моды, плагины, сборки и карты.', icon: '🧱' },
        { id: 'gta', name: 'GTA V / RP', description: 'Гайды, RP-серверы, торговля и обсуждение обновлений.', icon: '🚗' },
        { id: 'cheats', name: 'Читы и баги', description: 'Обсуждение багов, эксплойтов и античитов. Без вредоносов.', icon: '🐞' },
      ],
    },
    {
      id: 'cat_dev', title: 'Разработка и маркет',
      forums: [
        { id: 'web', name: 'Веб-разработка', description: 'HTML, CSS, JS, React, backend. Помощь с кодом.', icon: '🌐' },
        { id: 'py', name: 'Python / Backend', description: 'Боты, парсинг, API, базы данных, хостинг.', icon: '🐍' },
        { id: 'market', name: 'Маркет / Услуги', description: 'Покупка и продажа аккаунтов, услуг, дизайна. Только через гаранта.', icon: '🛒' },
      ],
    },
  ];

  const threads = [];
  const posts = [];

  function addThread(forumId, title, author, text, opts = {}) {
    const t = {
      id: uid('t'), forumId, title,
      authorId: author.id, authorName: author.username,
      createdAt: opts.createdAt || Date.now(),
      pinned: !!opts.pinned, closed: !!opts.closed,
      views: opts.views ?? 1,
      postsCount: 1,
      lastAt: opts.createdAt || Date.now(),
      lastBy: author.username,
    };
    threads.push(t);
    posts.push({
      id: uid('p'), threadId: t.id,
      authorId: author.id, authorName: author.username,
      text, createdAt: t.createdAt, likes: [], status: 'approved',
    });
    return t;
  }

  addThread('rules', 'Правила форума (кратко)', admin,
    '1. Без спама и флуда вне флудилки.\n2. Без вредоносов и стилеров — бан навсегда.\n3. Маркет — только через гаранта.\n4. Уважайте других участников.', { pinned: true, createdAt: now });

  const invites = [
    {
      id: uid('inv'), code: 'SKEETBESTCHEAT', maxUses: 30, usedCount: 0,
      usedBy: [], createdBy: 'asked', createdAt: now,
      expiresAt: now + 30 * day, note: 'Основной инвайт-код', active: true,
    },
  ];

  return {
    users: [admin],
    invites, categories, threads, posts,
    conversations: [], messages: [], tickets: [], prefixes: [
      { id: 'founder', name: 'Основатель', color: '#f1c40f', price: 0, grantable: true },
      { id: 'trusted', name: 'Проверенный', color: '#4a9de2', price: 100, grantable: true },
      { id: 'helper', name: 'Помощник', color: '#2ecc71', price: 250, grantable: true },
      { id: 'vip', name: 'VIP', color: '#e67e22', price: 500, grantable: true },
    ],
    meta: { createdAt: now },
  };
}

function getInitialMarketItems() {
  const now = Date.now();
  const day = 86400000;
  const admin = (db && db.users ? db.users.find((u) => u.username === 'ask') : null) || { id: 'u_ask', username: 'ask', avatarColor: '#3b9add' };

  return [
    {
      id: uid('mkt'),
      title: 'Steam | CS2 Prime (15 медалей) + Инвентарь 3,850 ₽ | 1,450 ч. | Родная почта',
      category: 'cs2',
      price: 690,
      description: 'Личный аккаунт Steam. CS2 Prime статус, выслуга 7 лет, инвентарь на 3850 руб (АК-47 Ледяной уголь, AWP Древесная гадюка, глок и др.). Без VAC и привязок. Родная почта и первый чек в комплекте.',
      origin: 'personal',
      warranty: '24h',
      credentials: 'cs2_pro_player:SuperSecretPass2026! | Почта: cs2_first_mail@rambler.ru:RamblerPass99 | R-код: R12345',
      sellerId: admin.id,
      sellerName: admin.username,
      sellerAvatar: admin.avatar || '',
      sellerColor: admin.avatarColor || '#3b9add',
      status: 'active',
      buyerId: null,
      buyerName: null,
      boughtAt: null,
      views: 148,
      createdAt: now - 3 * 3600000,
    },
    {
      id: uid('mkt'),
      title: 'Telegram | Аккаунт с Premium на 6 месяцев + Канал 1.8k подписчиков',
      category: 'telegram',
      price: 420,
      description: 'Чистый аккаунт Telegram, зарегистрирован 1.5 года назад (отлежка). Подписка Telegram Premium активна еще 6 месяцев. Владелец канала на 1800 живых подписчиков без спамблока.',
      origin: 'personal',
      warranty: '24h',
      credentials: '+79991234567 | 2FA пароль: TgSecretPass2026 | Tdata / Session string в архиве',
      sellerId: admin.id,
      sellerName: admin.username,
      sellerAvatar: admin.avatar || '',
      sellerColor: admin.avatarColor || '#3b9add',
      status: 'active',
      buyerId: null,
      buyerName: null,
      boughtAt: null,
      views: 94,
      createdAt: now - 5 * 3600000,
    },
    {
      id: uid('mkt'),
      title: 'Discord | Подписка Nitro Boost 1 год + Значок Early Supporter',
      category: 'discord',
      price: 850,
      description: 'Discord аккаунт с регистрацией в 2018 году, значок Early Supporter. Активная подписка Nitro на 1 год без слета. 2 сервера с бустами 3 уровня.',
      origin: 'resale',
      warranty: '12h',
      credentials: 'discord_vip_user@gmail.com:DiscordPass999 | Токен: mfa.a9sd8fa8sdf7a6sd5f_secure_token',
      sellerId: admin.id,
      sellerName: admin.username,
      sellerAvatar: admin.avatar || '',
      sellerColor: admin.avatarColor || '#3b9add',
      status: 'active',
      buyerId: null,
      buyerName: null,
      boughtAt: null,
      views: 215,
      createdAt: now - 8 * 3600000,
    },
    {
      id: uid('mkt'),
      title: 'Epic Games | GTA V Premium + Cyberpunk 2077 + RDR2 + 55 раздач',
      category: 'epic',
      price: 550,
      description: 'Аккаунт Epic Games с купленными GTA 5 (чистый онлайн без банов), Cyberpunk 2077, Red Dead Redemption 2 и более 55 топовых игр. Смена почты доступна моментально.',
      origin: 'personal',
      warranty: '24h',
      credentials: 'epic_gamer2026@rambler.ru:EpicMasterKey123',
      sellerId: admin.id,
      sellerName: admin.username,
      sellerAvatar: admin.avatar || '',
      sellerColor: admin.avatarColor || '#3b9add',
      status: 'active',
      buyerId: null,
      buyerName: null,
      boughtAt: null,
      views: 68,
      createdAt: now - 12 * 3600000,
    },
    {
      id: uid('mkt'),
      title: 'Valorant | Vandal Prime + Phantom Ion + Нож Reaver | Ранг: Платина 2',
      category: 'valorant',
      price: 1200,
      description: 'Личный аккаунт Valorant регион EU. Скины: Vandal Prime (все расцветки), Phantom Ion, Керамбит Reaver. Полный доступ со сменой почты, доступен соревновательный режим.',
      origin: 'personal',
      warranty: '24h',
      credentials: 'val_prime_player#EU1:RiotPassword2026!',
      sellerId: admin.id,
      sellerName: admin.username,
      sellerAvatar: admin.avatar || '',
      sellerColor: admin.avatarColor || '#3b9add',
      status: 'active',
      buyerId: null,
      buyerName: null,
      boughtAt: null,
      views: 180,
      createdAt: now - 1 * day,
    },
    {
      id: uid('mkt'),
      title: 'Minecraft | Java & Bedrock Edition | Лицензия + Плащ Миграции',
      category: 'other',
      price: 390,
      description: 'Официальная лицензия Microsoft с полным доступом к Minecraft Java & Bedrock. Без банов на Hypixel и популярных серверах. Красивый никнейм и плащ мигратора.',
      origin: 'resale',
      warranty: '24h',
      credentials: 'mc_legend_craft@outlook.com:CraftPass2026',
      sellerId: admin.id,
      sellerName: admin.username,
      sellerAvatar: admin.avatar || '',
      sellerColor: admin.avatarColor || '#3b9add',
      status: 'active',
      buyerId: null,
      buyerName: null,
      boughtAt: null,
      views: 110,
      createdAt: now - 2 * day,
    },
  ];
}

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (!db.users || !db.invites) throw new Error('bad db');
      db.conversations ||= [];
      db.messages ||= [];
      db.tickets ||= [];
      db.prefixes ||= [
        { id: 'trusted', name: 'Проверенный', color: '#4a9de2', price: 100, grantable: true },
        { id: 'helper', name: 'Помощник', color: '#2ecc71', price: 250, grantable: true },
        { id: 'vip', name: 'VIP', color: '#e67e22', price: 500, grantable: true },
      ];
      db.market ||= [];
      if (!db.market.length) {
        db.market = getInitialMarketItems();
      }
      db.users.forEach((u) => {
        u.role ||= 'user';
        if (typeof u.balance !== 'number' || u.balance < 500) u.balance = 2500;
        u.postsCount ||= 0;
        u.likesReceived ||= 0;
      });
      db.posts.forEach((p) => { p.status ||= 'approved'; });
      db.threads.forEach((t) => { if (t.postsCount === 0) t.postsCount = db.posts.filter((p) => p.threadId === t.id && p.status === 'approved').length; });
      return;
    }
  } catch (e) {
    console.error('DB повреждена, пересоздаю:', e.message);
  }
  db = seed();
  db.market = getInitialMarketItems();
  save();
}

function save() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

load();

// ---------- auth ----------
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '14d' });
}

function authOptional(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  req.user = null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = db.users.find((u) => u.id === payload.id) || null;
      if (req.user && typeof req.user.balance !== 'number') {
        req.user.balance = 2500;
      }
    } catch { req.user = null; }
  }
  next();
}

function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Нужно войти в аккаунт' });
    next();
  });
}

function adminRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Нужно войти в аккаунт' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только для администратора' });
    next();
  });
}

function staffRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Нужно войти в аккаунт' });
    if (!['admin', 'moderator', 'support'].includes(req.user.role)) return res.status(403).json({ error: 'Доступ только для сотрудников' });
    next();
  });
}

function moderationRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Нужно войти в аккаунт' });
    if (!['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ error: 'Решать судьбу публикаций могут только модераторы и администраторы' });
    next();
  });
}

function postingAllowed(req, res, next) {
  if (req.user.banned) return res.status(403).json({ error: 'Ваш аккаунт заблокирован' });
  if (req.user.postingRestrictedUntil && req.user.postingRestrictedUntil > Date.now()) {
    return res.status(403).json({ error: `Публикации ограничены до ${new Date(req.user.postingRestrictedUntil).toLocaleString('ru-RU')}` });
  }
  next();
}

function visiblePosts(threadId, user) {
  return db.posts.filter((p) => p.threadId === threadId && (p.status === 'approved' || p.authorId === user?.id || ['admin', 'moderator'].includes(user?.role)));
}

// ---------- helpers для статистики ----------
function forumStats(forumId) {
  const th = db.threads.filter((t) => t.forumId === forumId);
  const ids = new Set(th.map((t) => t.id));
  const msgCount = db.posts.filter((p) => ids.has(p.threadId) && p.status === 'approved').length;
  let last = null;
  for (const p of db.posts) {
    if (!ids.has(p.threadId) || p.status !== 'approved') continue;
    if (!last || p.createdAt > last.createdAt) last = p;
  }
  let lastThread = null;
  let lastUser = null;
  if (last) {
    lastThread = th.find((t) => t.id === last.threadId);
    lastUser = db.users.find((u) => u.id === last.authorId);
  }
  return {
    threads: th.length,
    messages: msgCount,
    last: last ? {
      id: last.id,
      threadId: last.threadId,
      authorName: last.authorName,
      authorAvatar: lastUser?.avatar || '',
      authorColor: lastUser?.avatarColor || '#3b9add',
      createdAt: last.createdAt,
    } : null,
    lastThread: lastThread ? {
      id: lastThread.id,
      title: lastThread.title,
      authorName: lastThread.authorName,
    } : null,
  };
}

// ---------- API ----------

// Статистика + онлайн
app.get('/api/stats', (req, res) => {
  const onlineUsers = db.users.slice(0, 8).map((u) => ({
    id: u.id,
    username: u.username,
    avatar: u.avatar || '',
    avatarColor: u.avatarColor || '#3b9add',
    role: u.role,
  }));
  res.json({
    threads: db.threads.length,
    messages: db.posts.filter((p) => p.status === 'approved').length,
    users: db.users.length,
    onlineCount: Math.max(db.users.length, 1),
    onlineUsers,
    newestUser: [...db.users].sort((a, b) => b.createdAt - a.createdAt)[0]?.username || '—',
  });
});

// Список разделов
app.get('/api/forums', (req, res) => {
  const out = db.categories.map((c) => ({
    id: c.id,
    title: c.title,
    forums: c.forums.map((f) => ({ ...f, ...forumStats(f.id) })),
  }));
  res.json(out);
});

// Последние темы для ленты форума
app.get('/api/latest-threads', (req, res) => {
  const allForums = db.categories.flatMap((c) => c.forums);
  const list = db.threads
    .filter((t) => db.posts.some((p) => p.threadId === t.id && p.status === 'approved'))
    .sort((a, b) => (b.pinned - a.pinned) || (b.lastAt - a.lastAt))
    .slice(0, 30)
    .map((t) => {
      const forum = allForums.find((f) => f.id === t.forumId);
      const author = db.users.find((u) => u.id === t.authorId);
      const replies = Math.max(0, db.posts.filter((p) => p.threadId === t.id && p.status === 'approved').length - 1);
      return {
        id: t.id,
        forumId: t.forumId,
        forumName: forum?.name || 'Раздел',
        title: t.title,
        pinned: t.pinned,
        closed: t.closed,
        views: t.views,
        replies,
        authorName: t.authorName,
        authorAvatar: author?.avatar || '',
        authorColor: author?.avatarColor || '#3b9add',
        lastAt: t.lastAt,
        lastBy: t.lastBy,
      };
    });
  res.json(list);
});

// Темы раздела
app.get('/api/forums/:forumId/threads', (req, res) => {
  const forumId = req.params.forumId;
  const all = db.categories.flatMap((c) => c.forums);
  const forum = all.find((f) => f.id === forumId);
  if (!forum) return res.status(404).json({ error: 'Раздел не найден' });
  const list = db.threads
    .filter((t) => t.forumId === forumId && db.posts.some((p) => p.threadId === t.id && p.status === 'approved'))
    .sort((a, b) => (b.pinned - a.pinned) || (b.lastAt - a.lastAt))
    .map((t) => ({
      ...t,
      replies: Math.max(0, db.posts.filter((p) => p.threadId === t.id && p.status === 'approved').length - 1),
      lastPost: db.posts.filter((p) => p.threadId === t.id && p.status === 'approved').sort((a, b) => b.createdAt - a.createdAt)[0] || null,
    }));
  res.json({ forum, threads: list });
});

// Создать тему
app.post('/api/forums/:forumId/threads', authRequired, postingAllowed, (req, res) => {
  const forumId = req.params.forumId;
  const all = db.categories.flatMap((c) => c.forums);
  if (!all.find((f) => f.id === forumId)) return res.status(404).json({ error: 'Раздел не найден' });
  const { title = '', text = '' } = req.body;
  if (title.trim().length < 4) return res.status(400).json({ error: 'Заголовок от 4 символов' });
  if (text.trim().length < 2) return res.status(400).json({ error: 'Напишите первое сообщение' });
  const t = {
    id: uid('t'), forumId, title: title.trim().slice(0, 140),
    authorId: req.user.id, authorName: req.user.username,
    createdAt: Date.now(), pinned: false, closed: false,
    views: 1, postsCount: 0, lastAt: Date.now(), lastBy: req.user.username,
  };
  db.threads.push(t);
  db.posts.push({
    id: uid('p'), threadId: t.id, authorId: req.user.id,
    authorName: req.user.username, text: text.trim().slice(0, 10000),
    createdAt: Date.now(), likes: [], status: 'pending',
  });
  save();
  res.json({ ...t, moderation: 'Сообщение отправлено на модерацию' });
});

// Просмотр темы + сообщения
app.get('/api/threads/:id', authOptional, (req, res) => {
  const t = db.threads.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Тема не найдена' });
  t.views += 1;
  save();
  const list = db.posts
    .filter((p) => p.threadId === t.id && (p.status === 'approved' || p.authorId === req.user?.id || ['admin', 'moderator'].includes(req.user?.role)))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((p) => {
      const author = db.users.find((u) => u.id === p.authorId);
      return {
        ...p,
        likesCount: (p.likes || []).length,
        liked: req.user ? (p.likes || []).includes(req.user.id) : false,
        authorRole: author?.role || 'user',
        authorColor: author?.avatarColor || '#3b9add',
        authorAvatar: author?.avatar || '',
      };
    });
  res.json({ thread: t, posts: list });
});

// Ответить в тему
app.post('/api/threads/:id/posts', authRequired, postingAllowed, (req, res) => {
  const t = db.threads.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Тема не найдена' });
  if (t.closed && !['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Тема закрыта' });
  }
  const { text = '' } = req.body;
  if (text.trim().length < 2) return res.status(400).json({ error: 'Сообщение слишком короткое' });
  const p = {
    id: uid('p'), threadId: t.id, authorId: req.user.id,
    authorName: req.user.username, text: text.trim().slice(0, 10000),
    createdAt: Date.now(), likes: [], status: 'pending',
  };
  db.posts.push(p);
  save();
  res.json({ ...p, moderation: 'Ответ отправлен на модерацию' });
});

// Лайк
app.post('/api/posts/:id/like', authRequired, (req, res) => {
  const p = db.posts.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Сообщение не найдено' });
  if (p.status !== 'approved') return res.status(403).json({ error: 'Сообщение ещё не опубликовано' });
  p.likes = p.likes || [];
  const i = p.likes.indexOf(req.user.id);
  if (i >= 0) p.likes.splice(i, 1);
  else {
    p.likes.push(req.user.id);
    const author = db.users.find((u) => u.id === p.authorId);
    if (author && author.id !== req.user.id) author.likesReceived = (author.likesReceived || 0) + 1;
  }
  save();
  res.json({ likes: p.likes.length, liked: p.likes.includes(req.user.id) });
});

// Поиск
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json([]);
  const out = db.threads
    .filter((t) => t.title.toLowerCase().includes(q) ||
      db.posts.some((p) => p.threadId === t.id && p.text.toLowerCase().includes(q)))
    .slice(0, 30);
  res.json(out);
});

// Участники
app.get('/api/members', (req, res) => {
  res.json([...db.users].sort((a, b) => (b.postsCount || 0) - (a.postsCount || 0)).map(publicUser));
});

app.get('/api/users/:username', (req, res) => {
  const user = db.users.find((u) => u.username.toLowerCase() === req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(publicUser(user));
});

app.put('/api/me/profile', authRequired, (req, res) => {
  req.user.bio = String(req.body.bio || '').trim().slice(0, 500);
  req.user.gender = String(req.body.gender || '').trim().slice(0, 30);
  const age = Number(req.body.age);
  req.user.age = Number.isInteger(age) && age >= 13 && age <= 120 ? age : null;
  const avatar = String(req.body.avatar || '');
  if (avatar && (!avatar.startsWith('data:image/') || avatar.length > 2_000_000)) return res.status(400).json({ error: 'Некорректная аватарка' });
  req.user.avatar = avatar;
  save();
  res.json(publicUser(req.user));
});

app.get('/api/messages', authRequired, (req, res) => {
  const mine = db.messages.filter((m) => m.fromId === req.user.id || m.toId === req.user.id).sort((a, b) => a.createdAt - b.createdAt);
  res.json(mine.map((m) => ({ ...m, from: publicUser(db.users.find((u) => u.id === m.fromId)), to: publicUser(db.users.find((u) => u.id === m.toId)) })));
});

app.post('/api/messages', authRequired, postingAllowed, (req, res) => {
  const to = db.users.find((u) => u.username.toLowerCase() === String(req.body.username || '').trim().toLowerCase());
  const text = String(req.body.text || '').trim();
  if (!to) return res.status(404).json({ error: 'Получатель не найден' });
  if (to.id === req.user.id) return res.status(400).json({ error: 'Нельзя отправить сообщение самому себе' });
  if (text.length < 1) return res.status(400).json({ error: 'Введите сообщение' });
  const message = { id: uid('msg'), fromId: req.user.id, toId: to.id, text: text.slice(0, 5000), createdAt: Date.now(), read: false };
  db.messages.push(message); save(); res.json(message);
});

app.get('/api/prefixes', authRequired, (req, res) => res.json(db.prefixes));
app.post('/api/prefixes/:id/buy', authRequired, (req, res) => {
  const prefix = db.prefixes.find((p) => p.id === req.params.id);
  if (!prefix) return res.status(404).json({ error: 'Префикс не найден' });
  if ((req.user.balance || 0) < prefix.price) return res.status(400).json({ error: 'Недостаточно средств' });
  req.user.balance -= prefix.price; req.user.prefix = prefix; save(); res.json(publicUser(req.user));
});

// ---------- AUTH: регистрация ТОЛЬКО по инвайту ----------

/*
  Логика инвайтов:
  - код создаёт ТОЛЬКО админ (POST /api/admin/invites)
  - при регистрации код обязателен, должен быть активным, не просроченным, с остатком использований
  - после успешной регистрации usedCount += 1, в usedBy пишется кто активировал
*/
app.post('/api/register', (req, res) => {
  const { username = '', password = '', inviteCode = '' } = req.body;
  const name = username.trim();
  const code = inviteCode.trim().toUpperCase();

  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
    return res.status(400).json({ error: 'Ник: 3–16 символов (латиница, цифры, _)' });
  }
  if (password.length < 4) return res.status(400).json({ error: 'Пароль от 4 символов' });
  if (!code) return res.status(400).json({ error: 'Введите код приглашения. Без него регистрация невозможна.' });

  if (db.users.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Такой ник уже занят' });
  }

  const invite = db.invites.find((i) => i.code.toUpperCase() === code);
  if (!invite) return res.status(400).json({ error: 'Неверный код приглашения' });
  if (!invite.active) return res.status(400).json({ error: 'Этот код деактивирован' });
  if (invite.expiresAt && invite.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Срок действия кода истёк' });
  }
  if (invite.usedCount >= invite.maxUses) {
    return res.status(400).json({ error: 'Этот код уже использован (лимит исчерпан)' });
  }

  const user = {
    id: uid('u'), username: name,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'user', avatarColor: pickColor(name),
    createdAt: Date.now(), postsCount: 0, likesReceived: 0,
    balance: 2500,
  };
  db.users.push(user);
  invite.usedCount += 1;
  invite.usedBy.push({ username: name, at: Date.now() });
  save();
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
  const { username = '', password = '' } = req.body;
  const user = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(400).json({ error: 'Неверный логин или пароль' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.get('/api/me', authRequired, (req, res) => {
  res.json(publicUser(req.user));
});

// ---------- ADMIN: только админ управляет кодами ----------

// Создать код (только admin)
app.post('/api/admin/invites', adminRequired, (req, res) => {
  const { maxUses = 1, expiresInDays = 7, note = '', customCode = '' } = req.body;
  let code = (customCode || '').trim().toUpperCase().replace(/\s+/g, '-').slice(0, 32);
  if (!code) code = randomInviteCode();
  if (db.invites.some((i) => i.code.toUpperCase() === code)) {
    return res.status(400).json({ error: 'Такой код уже существует' });
  }
  const uses = Math.max(1, Math.min(1000, parseInt(maxUses, 10) || 1));
  const days = parseFloat(expiresInDays) || 0;
  const invite = {
    id: uid('inv'), code, maxUses: uses, usedCount: 0,
    usedBy: [], createdBy: req.user.username, createdAt: Date.now(),
    expiresAt: days > 0 ? Date.now() + days * 86400000 : null,
    note: String(note).slice(0, 200), active: true,
  };
  db.invites.push(invite);
  save();
  res.json(invite);
});

// Список кодов
app.get('/api/admin/invites', adminRequired, (req, res) => {
  res.json([...db.invites].sort((a, b) => b.createdAt - a.createdAt));
});

// Удалить/деактивировать
app.delete('/api/admin/invites/:id', adminRequired, (req, res) => {
  const i = db.invites.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Код не найден' });
  db.invites.splice(i, 1);
  save();
  res.json({ ok: true });
});

app.post('/api/admin/invites/:id/toggle', adminRequired, (req, res) => {
  const inv = db.invites.find((x) => x.id === req.params.id);
  if (!inv) return res.status(404).json({ error: 'Код не найден' });
  inv.active = !inv.active;
  save();
  res.json(inv);
});

// Пользователи для админа
app.get('/api/admin/users', adminRequired, (req, res) => {
  res.json(db.users.map((u) => ({ ...publicUser(u), createdAt: u.createdAt })));
});

app.post('/api/admin/users/:id/role', adminRequired, (req, res) => {
  const u = db.users.find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Пользователь не найден' });
  const { role } = req.body;
  if (!['user', 'moderator', 'support', 'admin'].includes(role)) return res.status(400).json({ error: 'Плохая роль' });
  if (u.id === req.user.id && role !== 'admin') return res.status(400).json({ error: 'Нельзя снять админа с себя' });
  u.role = role;
  save();
  res.json(publicUser(u));
});

app.get('/api/staff/moderation', moderationRequired, (req, res) => {
  res.json(db.posts.filter((p) => p.status === 'pending').map((p) => ({
    ...p,
    thread: db.threads.find((t) => t.id === p.threadId) || { title: 'Удалённая тема' },
    author: publicUser(db.users.find((u) => u.id === p.authorId)) || { username: p.authorName || 'Пользователь', role: 'user' },
  })));
});

app.post('/api/staff/moderation/:id', moderationRequired, (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Публикация не найдена' });
  if (!['approve', 'reject'].includes(req.body.action)) return res.status(400).json({ error: 'Неверное решение' });
  post.status = req.body.action === 'approve' ? 'approved' : 'rejected';
  if (post.status === 'approved') {
    const thread = db.threads.find((t) => t.id === post.threadId);
    if (thread) { thread.postsCount += 1; thread.lastAt = post.createdAt; thread.lastBy = post.authorName; }
    const author = db.users.find((u) => u.id === post.authorId);
    if (author) author.postsCount = (author.postsCount || 0) + 1;
  }
  save(); res.json(post);
});

app.post('/api/admin/users/:id/sanction', adminRequired, (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user || user.id === req.user.id) return res.status(400).json({ error: 'Нельзя применить санкцию к этому пользователю' });
  const type = req.body.type;
  if (type === 'ban') user.banned = !!req.body.value;
  else if (type === 'posting') user.postingRestrictedUntil = req.body.minutes > 0 ? Date.now() + Number(req.body.minutes) * 60000 : null;
  else return res.status(400).json({ error: 'Неизвестный тип санкции' });
  save(); res.json(publicUser(user));
});

app.post('/api/admin/users/:id/prefix', staffRequired, (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  const prefix = db.prefixes.find((p) => p.id === req.body.prefixId);
  if (!user || !prefix) return res.status(404).json({ error: 'Пользователь или префикс не найден' });
  user.prefix = prefix; save(); res.json(publicUser(user));
});

app.get('/api/tickets', authRequired, (req, res) => {
  const list = ['admin', 'moderator', 'support'].includes(req.user.role) ? db.tickets : db.tickets.filter((t) => t.userId === req.user.id);
  res.json(list.map((t) => ({ ...t, user: publicUser(db.users.find((u) => u.id === t.userId)) || { username: 'Пользователь' } })));
});

app.post('/api/tickets', authRequired, (req, res) => {
  if (['admin', 'moderator', 'support'].includes(req.user.role)) return res.status(403).json({ error: 'Сотрудники форума не могут создавать обращения в поддержку' });
  const subject = String(req.body.subject || '').trim(); const text = String(req.body.text || '').trim();
  if (subject.length < 3 || text.length < 2) return res.status(400).json({ error: 'Укажите тему и вопрос' });
  const ticket = { id: uid('ticket'), userId: req.user.id, subject: subject.slice(0, 120), messages: [{ id: uid('tm'), authorId: req.user.id, text: text.slice(0, 5000), createdAt: Date.now() }], status: 'open', assignedTo: null, createdAt: Date.now(), updatedAt: Date.now() };
  db.tickets.push(ticket); save(); res.json(ticket);
});

app.post('/api/tickets/:id/reply', authRequired, (req, res) => {
  const ticket = db.tickets.find((t) => t.id === req.params.id);
  if (!ticket || (ticket.userId !== req.user.id && !['admin', 'moderator', 'support'].includes(req.user.role))) return res.status(404).json({ error: 'Обращение не найдено' });
  if (ticket.status === 'closed' && !['admin', 'moderator', 'support'].includes(req.user.role)) return res.status(403).json({ error: 'Обращение закрыто' });
  const text = String(req.body.text || '').trim(); if (text.length < 2) return res.status(400).json({ error: 'Введите ответ' });
  ticket.messages.push({ id: uid('tm'), authorId: req.user.id, text: text.slice(0, 5000), createdAt: Date.now() }); ticket.updatedAt = Date.now(); save(); res.json(ticket);
});

app.post('/api/tickets/:id/status', staffRequired, (req, res) => {
  const ticket = db.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Обращение не найдено' });
  if (!['open', 'pending', 'closed'].includes(req.body.status)) return res.status(400).json({ error: 'Неверный статус' });
  ticket.status = req.body.status; ticket.assignedTo = req.user.id; ticket.updatedAt = Date.now(); save(); res.json(ticket);
});

app.post('/api/admin/threads/:id/pin', adminRequired, (req, res) => {
  const t = db.threads.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Тема не найдена' });
  t.pinned = !t.pinned;
  save();
  res.json(t);
});

app.post('/api/admin/threads/:id/close', adminRequired, (req, res) => {
  const t = db.threads.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Тема не найдена' });
  t.closed = !t.closed;
  save();
  res.json(t);
});

app.delete('/api/admin/threads/:id', adminRequired, (req, res) => {
  const i = db.threads.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Тема не найдена' });
  const [t] = db.threads.splice(i, 1);
  db.posts = db.posts.filter((p) => p.threadId !== t.id);
  save();
  res.json({ ok: true });
});

app.delete('/api/admin/posts/:id', moderationRequired, (req, res) => {
  const index = db.posts.findIndex((p) => p.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Сообщение не найдено' });
  const post = db.posts[index];
  db.posts.splice(index, 1);
  const thread = db.threads.find((t) => t.id === post.threadId);
  if (thread) {
    thread.postsCount = db.posts.filter((p) => p.threadId === thread.id && p.status === 'approved').length;
    const last = db.posts.filter((p) => p.threadId === thread.id && p.status === 'approved').sort((a, b) => b.createdAt - a.createdAt)[0];
    thread.lastAt = last?.createdAt || thread.createdAt;
    thread.lastBy = last?.authorName || thread.authorName;
  }
  save(); res.json({ ok: true });
});

// ==========================================
// МАРКЕТПЛЕЙС (LZT Market style)
// ==========================================

function formatMarketItem(item, reqUser) {
  const seller = db.users.find((u) => u.id === item.sellerId);
  const canSeeCredentials = !!reqUser && (item.buyerId === reqUser.id || item.sellerId === reqUser.id || reqUser.role === 'admin');

  return {
    id: item.id,
    title: item.title,
    category: item.category,
    price: item.price,
    description: item.description,
    origin: item.origin,
    warranty: item.warranty,
    status: item.status, // 'active' | 'sold' | 'removed'
    sellerId: item.sellerId,
    sellerName: item.sellerName,
    sellerAvatar: seller?.avatar || item.sellerAvatar || '',
    sellerColor: seller?.avatarColor || item.sellerColor || '#3b9add',
    sellerRole: seller?.role || 'user',
    buyerId: item.buyerId,
    buyerName: item.buyerName,
    boughtAt: item.boughtAt,
    views: item.views || 0,
    createdAt: item.createdAt,
    credentials: canSeeCredentials ? item.credentials : undefined,
    hasPurchased: !!reqUser && item.buyerId === reqUser.id,
    isOwner: !!reqUser && item.sellerId === reqUser.id,
  };
}

// Список товаров маркета с фильтрацией и поиском
app.get('/api/market', authOptional, (req, res) => {
  const {
    category = 'all',
    q = '',
    origin = 'all',
    warranty = 'all',
    minPrice,
    maxPrice,
    sort = 'new',
    tab = 'all',
  } = req.query;

  let items = [...(db.market || [])];

  // Вкладки
  if (tab === 'my_items') {
    if (!req.user) return res.status(401).json({ error: 'Войдите в аккаунт' });
    items = items.filter((x) => x.sellerId === req.user.id);
  } else if (tab === 'my_purchases') {
    if (!req.user) return res.status(401).json({ error: 'Войдите в аккаунт' });
    items = items.filter((x) => x.buyerId === req.user.id);
  } else {
    items = items.filter((x) => x.status === 'active' || x.status === 'sold');
  }

  // Фильтр по категории
  if (category && category !== 'all') {
    items = items.filter((x) => x.category.toLowerCase() === category.toLowerCase());
  }

  // Фильтр по происхождению
  if (origin && origin !== 'all') {
    items = items.filter((x) => x.origin.toLowerCase() === origin.toLowerCase());
  }

  // Фильтр по гарантии
  if (warranty && warranty !== 'all') {
    items = items.filter((x) => x.warranty.toLowerCase() === warranty.toLowerCase());
  }

  // Поиск по ключевым словам
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    items = items.filter((x) =>
      x.title.toLowerCase().includes(query) ||
      (x.description && x.description.toLowerCase().includes(query)) ||
      x.category.toLowerCase().includes(query)
    );
  }

  // Диапазон цен
  const min = parseFloat(minPrice);
  const max = parseFloat(maxPrice);
  if (!isNaN(min)) items = items.filter((x) => x.price >= min);
  if (!isNaN(max)) items = items.filter((x) => x.price <= max);

  // Сортировка
  if (sort === 'cheap') {
    items.sort((a, b) => a.price - b.price);
  } else if (sort === 'expensive') {
    items.sort((a, b) => b.price - a.price);
  } else if (sort === 'views') {
    items.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else {
    items.sort((a, b) => b.createdAt - a.createdAt);
  }

  res.json(items.map((item) => formatMarketItem(item, req.user)));
});

// Просмотр одного товара маркета
app.get('/api/market/:id', authOptional, (req, res) => {
  const item = (db.market || []).find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Товар не найден' });
  item.views = (item.views || 0) + 1;
  save();
  res.json(formatMarketItem(item, req.user));
});

// Выставление аккаунта на продажу
app.post('/api/market', authRequired, postingAllowed, (req, res) => {
  const {
    title = '',
    category = 'other',
    price,
    description = '',
    origin = 'resale',
    warranty = '24h',
    credentials = '',
  } = req.body;

  const t = title.trim();
  if (t.length < 5) return res.status(400).json({ error: 'Заголовок должен содержать минимум 5 символов' });
  if (t.length > 160) return res.status(400).json({ error: 'Слишком длинный заголовок (максимум 160 символов)' });

  const p = Math.round(Number(price));
  if (isNaN(p) || p < 10) return res.status(400).json({ error: 'Минимальная цена — 10 ₽' });
  if (p > 1000000) return res.status(400).json({ error: 'Максимальная цена — 1 000 000 ₽' });

  const creds = String(credentials || '').trim();
  if (creds.length < 3) return res.status(400).json({ error: 'Укажите данные для покупателя (логин:пароль, почту, токен)' });

  const validCategories = ['steam', 'cs2', 'telegram', 'discord', 'epic', 'valorant', 'fortnite', 'genshin', 'services', 'other'];
  const cat = validCategories.includes(category) ? category : 'other';

  const validOrigins = ['personal', 'resale', 'autoreg', 'brute', 'phishing', 'stealer'];
  const orig = validOrigins.includes(origin) ? origin : 'resale';

  const validWarranties = ['none', '12h', '24h', '3d'];
  const war = validWarranties.includes(warranty) ? warranty : '24h';

  const newItem = {
    id: uid('mkt'),
    title: t,
    category: cat,
    price: p,
    description: String(description || '').trim().slice(0, 5000),
    origin: orig,
    warranty: war,
    credentials: creds.slice(0, 3000),
    sellerId: req.user.id,
    sellerName: req.user.username,
    sellerAvatar: req.user.avatar || '',
    sellerColor: req.user.avatarColor || '#3b9add',
    status: 'active',
    buyerId: null,
    buyerName: null,
    boughtAt: null,
    views: 1,
    createdAt: Date.now(),
  };

  db.market ||= [];
  db.market.unshift(newItem);
  save();

  res.json(formatMarketItem(newItem, req.user));
});

// Покупка аккаунта
app.post('/api/market/:id/buy', authRequired, (req, res) => {
  const item = (db.market || []).find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Товар не найден' });
  if (item.status !== 'active') return res.status(400).json({ error: 'Этот товар уже продан или снят с продажи' });
  if (item.sellerId === req.user.id) return res.status(400).json({ error: 'Нельзя купить собственный товар' });

  const buyer = req.user;
  buyer.balance = typeof buyer.balance === 'number' ? buyer.balance : 2500;

  if (buyer.balance < item.price) {
    return res.status(400).json({
      error: `Недостаточно средств. Требуется: ${item.price} ₽, на вашем балансе: ${buyer.balance} ₽.`,
      needDeposit: item.price - buyer.balance,
    });
  }

  // Перевод баланса
  buyer.balance -= item.price;
  const seller = db.users.find((u) => u.id === item.sellerId);
  if (seller) {
    seller.balance = (seller.balance || 0) + item.price;
  }

  item.status = 'sold';
  item.buyerId = buyer.id;
  item.buyerName = buyer.username;
  item.boughtAt = Date.now();

  save();

  res.json({
    success: true,
    message: 'Аккаунт успешно куплен! Данные для входа доступны ниже.',
    item: formatMarketItem(item, buyer),
    newBalance: buyer.balance,
  });
});

// Удаление товара (продавец или админ)
app.delete('/api/market/:id', authRequired, (req, res) => {
  const item = (db.market || []).find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Товар не найден' });
  if (item.sellerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'У вас нет прав для удаления этого товара' });
  }

  item.status = 'removed';
  save();
  res.json({ ok: true });
});

// Пополнение тестового баланса
app.post('/api/market/deposit', authRequired, (req, res) => {
  const amount = Math.min(100000, Math.max(10, Math.round(Number(req.body.amount) || 500)));
  req.user.balance = (typeof req.user.balance === 'number' ? req.user.balance : 0) + amount;
  save();
  res.json({ success: true, balance: req.user.balance });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Нет такого API' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n=== UFound запущен: http://localhost:${PORT} ===`);
  console.log('Администратор: ask / 1122');
  console.log('Регистрация по инвайт-кодам.\n');
});
