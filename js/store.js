/* 願望池 — 資料層（localStorage 版，無後端） */
window.WP = window.WP || {};
(function () {
  'use strict';

  var KEY = 'wishpool_db_v1';
  var ANON_KEY = 'wishpool_anon_id';

  /* ---------- 小工具 ---------- */
  function uid(p) { return (p || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dstr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function offsetDate(days) { var d = new Date(); d.setDate(d.getDate() + days); return dstr(d); }
  function dt(dateStr, timeStr) { return new Date(dateStr + 'T' + (timeStr || '00:00')); }
  function nowISO() { var d = new Date(); return dstr(d) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function isoOffset(days, time) { return offsetDate(days) + 'T' + (time || '12:00'); }

  WP.dt = dt;
  WP.todayStr = function () { return dstr(new Date()); };

  /* ---------- 讀寫 ---------- */
  var db = null;
  function load() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    if (!db || db.v !== 1) { db = seed(); persist(); } // 種子資料不標記時間，讓雲端資料優先
    if (!db.orgRegMig) migrateOrganizerRegs();
    return db;
  }
  /** 既有活動補上主辦人報名（一次性遷移；不更新 u，避免蓋掉較新的雲端資料） */
  function migrateOrganizerRegs() {
    db.orgRegMig = true;
    db.events.forEach(function (ev) { ensureOrganizerReg(ev); });
    persist();
  }
  function persist() { localStorage.setItem(KEY, JSON.stringify(db)); }
  function save() {
    db.u = Date.now(); // 最後修改時間，供多裝置同步比對新舊
    persist();
    schedulePush();
  }
  WP.save = save;
  WP.resetDemo = function () {
    db = seed();
    db.u = Date.now(); // 重置視為一次修改，蓋過雲端舊資料
    persist();
    var done = function () { location.reload(); };
    if (WP.gasUrl()) pushNow().then(done, done); else done();
  };

  WP.anonId = function () {
    var id = localStorage.getItem(ANON_KEY);
    if (!id) { id = uid('anon'); localStorage.setItem(ANON_KEY, id); }
    return id;
  };

  /* ---------- 種子資料 ---------- */
  var NAME_POOL = ['小魚', '阿凱', 'Momo', '雨晴', '大寶', 'Nina', '阿哲', 'Kiki', '子軒', '美美', 'Leo', '小P', '安安', '喬喬', 'Ray', '婷婷', '阿福', 'Jas', '冠宇', '思思', 'Eric', '芋頭', '龍龍', 'Q比', '家家', 'Vivi', '小海', 'Ben', '千千', '阿樂', '以晴', '柏翰', 'Yuki', '阿德', '貝貝', '小軒', 'Mia', '阿寬', '語彤', 'Ken', '小婕', '阿泰', 'Fiona', '俊宇', '采潔', 'Toby', '小霓', '阿丞', 'Peggy', '大衛', 'Nono', '靜怡', '阿邦', '品睿', '小柚', 'Hank', '奕辰', 'Zoe', '阿國', '若瑄'];
  var AVATAR_BGS = ['#F2B8AC', '#F5D3A1', '#BCD9C0', '#B9CFE0', '#E4C6E0', '#F0E1A8', '#C9C4E4', '#F5C1CE', '#CFE0D8', '#EAD3BE'];

  function seed() {
    var d = { v: 1, session: null, users: [], events: [], regs: [], comments: [], notifs: [], settings: {} };

    function addUser(id, name, emoji, bg) { d.users.push({ id: id, name: name, emoji: emoji || '', bg: bg || AVATAR_BGS[d.users.length % AVATAR_BGS.length], createdAt: nowISO() }); return id; }
    addUser('org_badminton', '週三羽球社', '🏸', '#F2B8AC');
    addUser('org_hiroko', 'Hiroko 老師', '👩‍🏫', '#F5D3A1');
    addUser('org_meeple', '城南桌遊團', '🎲', '#BCD9C0');
    addUser('org_lens', '光圈研究所', '📷', '#E4C6E0');
    addUser('org_hike', '島嶼徒步', '⛰️', '#CFE0D8');
    addUser('org_mood', 'Mood Records', '🎧', '#2B2620');
    addUser('org_wheat', '小麥廚房 Wheat Kitchen', '🥐', '#F5D3A1');
    addUser('org_ai', 'Taipei AI Builders', '🤖', '#B9CFE0');
    addUser('org_ride', '北投夜騎團', '🚴', '#C9C4E4');
    addUser('org_coffee', '好日咖啡', '☕', '#EAD3BE');

    function ev(o) {
      d.events.push(Object.assign({
        id: uid('ev'), cover: '', tags: [], city: '台北', fee: 0, contact: '', mapUrl: '',
        waitlistCap: 0, cancelled: false, regClosed: false, draft: false,
        createdAt: nowISO(), updatedAt: nowISO()
      }, o));
      return d.events[d.events.length - 1];
    }
    function regs(eventId, n, state, poolOffset, dayAgoBase) {
      for (var i = 0; i < n; i++) {
        var name = NAME_POOL[(poolOffset + i) % NAME_POOL.length];
        if (poolOffset + i >= NAME_POOL.length) name += '_' + (poolOffset + i);
        d.regs.push({
          id: uid('reg'), eventId: eventId, userId: 'seed_' + eventId + '_' + i,
          name: name, email: '', phone: '', note: '',
          state: state, createdAt: isoOffset(-(dayAgoBase + Math.floor(i / 3)), pad2(9 + (i % 12)) + ':' + pad2((i * 7) % 60)), updatedAt: nowISO()
        });
      }
    }

    var e1 = ev({ id: 'ev_badminton',
      title: '週末羽球團練・初學者友善', category: '運動健身', tags: ['羽球', '團練', '初學者'],
      date: offsetDate(2), start: '19:00', end: '21:30', city: '台北', venue: '天母運動中心 B 棟 3 樓',
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=%E5%A4%A9%E6%AF%8D%E9%81%8B%E5%8B%95%E4%B8%AD%E5%BF%83',
      desc: '歡迎所有想揮拍流汗的朋友，現場提供球與飲水，第一次來也有人帶。\n\n程度不拘，會依實力分場輪打，中場有基礎步伐與發球小教學。記得穿運動服與室內運動鞋，毛巾自備。',
      regStart: isoOffset(-12, '09:00'), regEnd: offsetDate(1) + 'T18:00',
      capacity: 16, waitlistCap: 4, fee: 250, contact: 'LINE 社群：wed-badminton',
      organizerId: 'org_badminton'
    });
    var e2 = ev({ id: 'ev_japanese',
      title: '日語讀書會・N3 文法練功房', category: '學習成長', tags: ['日語', '讀書會', 'N3'],
      date: offsetDate(2), start: '14:00', end: '16:00', city: '台北', venue: '永康街共學空間 2F',
      desc: '一起把 N3 文法一次打通！每週輪流導讀＋大量例句練習，會有 Hiroko 老師在旁補充口語用法。\n\n請自備《TRY! N3》課本，現場提供講義與茶水。',
      regStart: isoOffset(-14, '10:00'), regEnd: offsetDate(1) + 'T20:00',
      capacity: 8, waitlistCap: 5, fee: 300, contact: 'Email：hiroko.study@example.com',
      organizerId: 'org_hiroko'
    });
    var e3 = ev({ id: 'ev_boardgame',
      title: '城南桌遊夜・德式策略場', category: '桌遊娛樂', tags: ['桌遊', '策略', '德式'],
      date: offsetDate(6), start: '18:30', end: '22:30', city: '台北', venue: '南港 Meeple 桌遊咖啡',
      desc: '本週主打《電力公司》與《農家樂》，也會開新手友善的《璀璨寶石》桌。店內低消一杯飲品，桌費已含在報名費中。\n\n歡迎單刀赴會，我們會幫你湊桌！',
      regStart: isoOffset(-10, '12:00'), regEnd: offsetDate(5) + 'T18:00',
      capacity: 20, waitlistCap: 4, fee: 200, contact: 'LINE：meeple-south',
      organizerId: 'org_meeple'
    });
    var e4 = ev({ id: 'ev_photo',
      title: '迪化街攝影外拍・老街光影', category: '藝文攝影', tags: ['攝影', '外拍', '老街'],
      date: offsetDate(6), start: '15:30', end: '18:30', city: '台北', venue: '迪化街 1 段集合',
      desc: '跟著老師走一趟迪化街，從騎樓光影到黃昏色溫，練習構圖與測光。手機或相機皆可參加。\n\n拍完會找間老屋咖啡店互相看片交流。',
      regStart: isoOffset(-9, '09:00'), regEnd: offsetDate(5) + 'T21:00',
      capacity: 12, waitlistCap: 3, fee: 0, contact: 'IG：@aperture.lab',
      organizerId: 'org_lens'
    });
    var e5 = ev({ id: 'ev_hike',
      title: '陽明山日出爬山團・夢幻湖路線', category: '戶外踏青', tags: ['登山', '日出', '陽明山'],
      date: offsetDate(13), start: '04:30', end: '09:00', city: '台北', venue: '夢幻湖登山口',
      desc: '凌晨出發看日出！路線平緩適合新手，全程約 4 小時含休息。請自備頭燈、水與簡單早餐。\n\n天氣不佳將提前一天在留言區公告延期。',
      regStart: isoOffset(-7, '08:00'), regEnd: offsetDate(12) + 'T12:00',
      capacity: 15, waitlistCap: 5, fee: 150, contact: 'LINE：island-hike',
      organizerId: 'org_hike'
    });
    var e6 = ev({ id: 'ev_vinyl',
      title: '週日 Vinyl 黑膠分享會', category: '音樂表演', tags: ['黑膠', '音樂', '分享會'],
      date: offsetDate(13), start: '14:00', end: '17:00', city: '台北', venue: '赤峰街 Mood Records',
      desc: '帶一張你最愛的黑膠來，輪流播放並聊聊它的故事。店內音響是 Tannoy 同軸，值得一聽。\n\n報名費含手沖咖啡一杯。',
      regStart: isoOffset(-6, '10:00'), regEnd: offsetDate(12) + 'T22:00',
      capacity: 10, waitlistCap: 3, fee: 350, contact: 'IG：@mood.records',
      organizerId: 'org_mood'
    });
    var e7 = ev({ id: 'ev_bread',
      title: '新手做麵包・週末兩日手作營', category: '手作烘焙', tags: ['烘焙', '麵包', '手作'],
      date: offsetDate(20), dateEnd: offsetDate(21), start: '09:30', end: '13:00', city: '台北', venue: '南港・小麥廚房',
      desc: '連續兩天的手作營：第一天揉麵、發酵與整形，第二天出爐並學習保存與擺盤。一次做兩款：奶油小餐包與佛卡夏，材料與圍裙由教室準備，成品全部帶回家。\n\n適合零基礎，親子可同行（一大一小算一個名額）。',
      regStart: isoOffset(-5, '09:00'), regEnd: offsetDate(18) + 'T20:00',
      capacity: 8, waitlistCap: 3, fee: 1200, contact: 'Email：hi@wheatkitchen.tw',
      organizerId: 'org_wheat'
    });
    var e8 = ev({ id: 'ev_ai',
      title: 'AI 工程師月會・LLM 實戰分享', category: '科技交流', tags: ['AI', 'LLM', '技術分享'],
      date: offsetDate(20), start: '19:30', end: '22:00', city: '台北', venue: '信義區 Mox Space',
      desc: '本月主題：RAG 在生產環境的踩坑實錄、Agent 工作流設計模式。兩場 talk＋自由交流。\n\n免費參加，備有輕食飲料，歡迎帶名片來交朋友。',
      regStart: isoOffset(-15, '12:00'), regEnd: offsetDate(19) + 'T18:00',
      capacity: 60, waitlistCap: 10, fee: 0, contact: 'Discord：taipei-ai-builders',
      organizerId: 'org_ai'
    });
    var e9 = ev({ id: 'ev_ride',
      title: '河濱夜騎・大稻埕到關渡', category: '戶外踏青', tags: ['單車', '夜騎', '河濱'],
      date: offsetDate(-6), start: '19:00', end: '21:30', city: '台北', venue: '大稻埕碼頭 YouBike 站集合',
      desc: '沿淡水河騎到關渡宮再折返，全程約 22 公里，速度輕鬆聊天為主。沒有車可以現場借 YouBike。',
      regStart: isoOffset(-20, '09:00'), regEnd: offsetDate(-7) + 'T18:00',
      capacity: 12, waitlistCap: 0, fee: 0, contact: 'LINE：beitou-night-ride',
      organizerId: 'org_ride'
    });
    var e10 = ev({ id: 'ev_coffee',
      title: '手沖咖啡入門・週末小聚', category: '美食聚會', tags: ['咖啡', '手沖', '入門'],
      date: offsetDate(27), start: '10:00', end: '12:30', city: '台北', venue: '好日咖啡・民生社區店',
      desc: '從磨豆、注水到風味描述，兩小時帶你入門手沖。器材由店內提供，會喝到三支不同產區的豆子。\n\n報名於下週開放，名額有限請鎖定。',
      regStart: isoOffset(5, '12:00'), regEnd: offsetDate(26) + 'T18:00',
      capacity: 10, waitlistCap: 2, fee: 450, contact: 'IG：@goodday.coffee',
      organizerId: 'org_coffee'
    });

    regs(e1.id, 12, 'confirmed', 0, 2);
    regs(e2.id, 8, 'confirmed', 12, 3);
    regs(e2.id, 3, 'waitlist', 20, 1);
    regs(e3.id, 14, 'confirmed', 23, 2);
    regs(e4.id, 9, 'confirmed', 37, 2);
    regs(e5.id, 7, 'confirmed', 46, 1);
    regs(e6.id, 6, 'confirmed', 53, 1);
    regs(e7.id, 5, 'confirmed', 6, 1);
    regs(e8.id, 60, 'confirmed', 0, 4);
    regs(e8.id, 8, 'waitlist', 30, 1);
    regs(e9.id, 10, 'confirmed', 40, 8);

    d.comments.push(
      { id: uid('c'), eventId: e1.id, userId: null, anonId: 'seed_anon_1', name: '小魚', text: '第一次參加，請問需要自備球拍嗎？', createdAt: isoOffset(-4, '14:20') },
      { id: uid('c'), eventId: e1.id, userId: 'org_badminton', anonId: '', name: '週三羽球社', text: '現場有公用球拍可以借，直接來就好！第一次來會有幹部帶熱身 💪', createdAt: isoOffset(-4, '15:02') },
      { id: uid('c'), eventId: e5.id, userId: null, anonId: 'seed_anon_2', name: '阿凱', text: '請問夢幻湖登山口附近好停車嗎？還是建議搭車上山？', createdAt: isoOffset(-2, '21:40') }
    );
    return d;
  }

  /* ---------- 使用者 ---------- */
  // 平台管理員：以暱稱「admin」或「管理員」登入即具備全站活動管理權（示範等級的權限模型）
  var ADMIN_NAMES = ['admin', '管理員'];
  function isAdminName(name) { return ADMIN_NAMES.indexOf(String(name || '').trim().toLowerCase()) !== -1; }
  WP.isAdmin = function (user) {
    var u = (user === undefined) ? WP.me() : user;
    return !!(u && isAdminName(u.name));
  };
  /** 我是否可管理這場活動（主辦人本人或平台管理員） */
  WP.canManage = function (ev) {
    var me = WP.me();
    if (!me || !ev) return false;
    return ev.organizerId === me.id || WP.isAdmin(me);
  };

  WP.me = function () {
    var d = load();
    if (!d.session) return null;
    return d.users.find(function (u) { return u.id === d.session; }) || null;
  };
  WP.getUser = function (id) { return load().users.find(function (u) { return u.id === id; }) || null; };
  WP.login = function (name) {
    var d = load();
    name = (name || '').trim();
    if (!name) return null;
    var u = d.users.find(function (x) { return x.name === name; });
    if (!u) {
      u = { id: uid('u'), name: name, emoji: '', bg: AVATAR_BGS[Math.floor(Math.random() * AVATAR_BGS.length)], createdAt: nowISO() };
      if (isAdminName(name)) { u.emoji = '🛡️'; u.bg = '#2B2620'; }
      d.users.push(u);
    }
    d.session = u.id;
    save();
    return u;
  };
  WP.logout = function () { load().session = null; save(); };

  /* ---------- 活動 ---------- */
  WP.events = function () { return load().events.slice(); };
  WP.getEvent = function (id) { return load().events.find(function (e) { return e.id === id; }) || null; };

  /** 建立或更新活動；編輯已發布活動且時間/地點變更時通知所有已報名者 */
  WP.saveEvent = function (data) {
    var d = load();
    var old = data.id ? d.events.find(function (e) { return e.id === data.id; }) : null;
    if (old) {
      var stBefore = WP.statusOf(old);
      var wasDraft = !!old.draft;
      var moved = ['date', 'dateEnd', 'start', 'end', 'venue', 'city'].some(function (k) { return old[k] !== data[k]; });
      Object.assign(old, data, { updatedAt: nowISO() });
      fillFromWaitlist(old.id); // 名額調大時讓候補依序遞補
      if (moved && !old.draft && !old.cancelled && stBefore !== 'ended') {
        activeRegs(old.id).forEach(function (r) {
          if (r.userId) WP.notify(r.userId, { type: 'change', eventId: old.id, title: '活動異動通知', body: '「' + old.title + '」的時間或地點已更新，請重新確認活動資訊。' });
        });
      }
      if (wasDraft && !old.draft) ensureOrganizerReg(old); // 發布時主辦人自動列入名單
      save();
      if (wasDraft && !old.draft) announceLine(old); // 草稿首次發布也算新活動
      return old;
    }
    var ev = Object.assign({
      id: uid('ev'), cover: '', tags: [], fee: 0, contact: '', mapUrl: '', waitlistCap: 0,
      cancelled: false, regClosed: false, draft: false,
      createdAt: nowISO(), updatedAt: nowISO()
    }, data);
    d.events.push(ev);
    if (!ev.draft) ensureOrganizerReg(ev); // 主辦人本人算一個參與名額
    save();
    if (!ev.draft) announceLine(ev);
    return ev;
  };

  /** 轉移主辦權：newName 不存在時自動建立使用者；舊主辦人保留參加名額 */
  WP.transferEvent = function (eventId, newName) {
    var d = load();
    var ev = d.events.find(function (e) { return e.id === eventId; });
    if (!ev) return { ok: false, msg: '找不到活動' };
    newName = (newName || '').trim();
    if (!newName) return { ok: false, msg: '請輸入新主辦人的暱稱' };
    var u = d.users.find(function (x) { return x.name === newName; });
    var existed = !!u;
    if (!u) {
      u = { id: uid('u'), name: newName, emoji: '', bg: AVATAR_BGS[Math.floor(Math.random() * AVATAR_BGS.length)], createdAt: nowISO() };
      d.users.push(u);
    }
    if (u.id === ev.organizerId) return { ok: false, msg: '「' + newName + '」已經是這場活動的主辦人了' };

    var oldId = ev.organizerId;
    ev.organizerId = u.id;
    ev.updatedAt = nowISO();
    d.regs.forEach(function (r) {
      if (r.eventId !== eventId) return;
      if (r.userId === oldId && r.note === '主辦人') r.note = ''; // 舊主辦人轉為一般參加者
      if (r.userId === u.id && r.state !== 'cancelled' && !r.note) r.note = '主辦人';
    });
    ensureOrganizerReg(ev); // 新主辦人尚未報名且還有空位時列入名單
    save();
    WP.notify(u.id, {
      type: 'change', eventId: eventId, title: '主辦權轉移',
      body: '你已成為「' + ev.title + '」的主辦人，可以在活動頁管理報名名單。'
    });
    return { ok: true, user: u, existed: existed };
  };

  /** 主辦人自動列入正取名單（佔一個名額）；已有任何報名紀錄（含自行取消）或已額滿則不動 */
  function ensureOrganizerReg(ev) {
    if (!ev || ev.draft || ev.cancelled) return;
    var d = load();
    var org = d.users.find(function (u) { return u.id === ev.organizerId; });
    if (!org) return;
    var has = d.regs.some(function (r) { return r.eventId === ev.id && r.userId === ev.organizerId; });
    if (has) return;
    var c = WP.counts(ev.id);
    if (c.confirmed >= ev.capacity) return;
    d.regs.push({
      id: uid('reg'), eventId: ev.id, userId: ev.organizerId,
      name: org.name, email: '', phone: '', note: '主辦人',
      state: 'confirmed',
      createdAt: ev.regStart || ev.createdAt || nowISO(), // 排在名單最前
      updatedAt: nowISO()
    });
  }

  /** 新活動發布時，公告到所有已加入機器人的 LINE 群組 */
  function announceLine(ev) {
    var url = WP.gasUrl();
    if (!url || typeof fetch !== 'function') return;
    var when = (ev.date || '日期未定') +
      (ev.dateEnd && ev.dateEnd > ev.date ? ' ～ ' + ev.dateEnd : '') +
      (ev.start ? ' ' + ev.start : '') + (ev.start && ev.end ? '–' + ev.end : '');
    var lines = [
      ev.title,
      '📅 ' + when,
      '📍 ' + (ev.venue || ev.city || '地點未定'),
      '💰 ' + (ev.fee > 0 ? 'NT$ ' + ev.fee : '免費') + '・名額 ' + ev.capacity + ' 人'
    ];
    if (ev.mapUrl && /^https?:\/\//i.test(ev.mapUrl)) lines.push('🗺️ ' + ev.mapUrl);
    try {
      if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) {
        lines.push(new URL('event.html?id=' + encodeURIComponent(ev.id), location.href).href);
      }
    } catch (e) {}
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'announce', title: '新活動上架 🎉', body: lines.join('\n') })
      }).catch(function () {});
    } catch (e2) {}
  }

  WP.deleteEvent = function (id) {
    var d = load();
    d.events = d.events.filter(function (e) { return e.id !== id; });
    d.regs = d.regs.filter(function (r) { return r.eventId !== id; });
    d.comments = d.comments.filter(function (c) { return c.eventId !== id; });
    d.notifs = d.notifs.filter(function (n) { return n.eventId !== id; });
    save();
  };

  WP.cancelEvent = function (id) {
    var ev = WP.getEvent(id);
    if (!ev) return;
    ev.cancelled = true;
    ev.updatedAt = nowISO();
    activeRegs(id).forEach(function (r) {
      if (r.userId) WP.notify(r.userId, { type: 'change', eventId: id, title: '活動取消通知', body: '很抱歉，「' + ev.title + '」已取消，造成不便請見諒。' });
    });
    save();
  };

  WP.setRegClosed = function (id, closed) {
    var ev = WP.getEvent(id);
    if (!ev) return;
    ev.regClosed = !!closed;
    ev.updatedAt = nowISO();
    save();
  };

  /* ---------- 狀態判斷 ---------- */
  /** 回傳：draft | cancelled | ended | ongoing | upcoming | closed | full | open */
  WP.statusOf = function (ev, now) {
    now = now || new Date();
    if (ev.cancelled) return 'cancelled';
    if (ev.draft) return 'draft';
    var lastDay = (ev.dateEnd && ev.dateEnd > ev.date) ? ev.dateEnd : ev.date;
    var start = dt(ev.date, ev.start || '00:00');
    var end = dt(lastDay, ev.end || '23:59');
    if (end < start) end = dt(lastDay, '23:59');
    if (now > end) return 'ended';
    if (now >= start) return 'ongoing';
    if (ev.regClosed) return 'closed'; // 主辦人手動關閉優先於「即將開始」
    if (ev.regStart && now < new Date(ev.regStart)) return 'upcoming';
    if (ev.regEnd && now > new Date(ev.regEnd)) return 'closed';
    if (WP.counts(ev.id).confirmed >= ev.capacity) return 'full';
    return 'open';
  };

  /* ---------- 報名 ---------- */
  function activeRegs(eventId) {
    return load().regs.filter(function (r) { return r.eventId === eventId && r.state !== 'cancelled'; });
  }
  WP.regsOf = function (eventId) {
    return load().regs.filter(function (r) { return r.eventId === eventId; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
  };
  WP.counts = function (eventId) {
    var c = { confirmed: 0, waitlist: 0, cancelled: 0 };
    load().regs.forEach(function (r) { if (r.eventId === eventId) c[r.state]++; });
    return c;
  };
  WP.getReg = function (id) { return load().regs.find(function (r) { return r.id === id; }) || null; };
  WP.myRegFor = function (eventId) {
    var me = WP.me();
    if (!me) return null;
    return load().regs.find(function (r) { return r.eventId === eventId && r.userId === me.id && r.state !== 'cancelled'; }) || null;
  };
  WP.myRegs = function () {
    var me = WP.me();
    if (!me) return [];
    return load().regs.filter(function (r) { return r.userId === me.id; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  };
  WP.waitPosition = function (regId) {
    var reg = WP.getReg(regId);
    if (!reg || reg.state !== 'waitlist') return 0;
    var list = load().regs.filter(function (r) { return r.eventId === reg.eventId && r.state === 'waitlist'; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
    return list.indexOf(reg) + 1;
  };

  /** 報名活動：額滿時自動進候補。form = {name, email, phone, note} */
  WP.register = function (eventId, form) {
    var ev = WP.getEvent(eventId);
    if (!ev) return { ok: false, msg: '找不到活動' };
    var st = WP.statusOf(ev);
    if (st !== 'open' && st !== 'full') return { ok: false, msg: '目前不在報名期間' };
    var me = WP.me();
    if (me && WP.myRegFor(eventId)) return { ok: false, msg: '你已經報名過這場活動了' };

    fillFromWaitlist(eventId); // 先讓既有候補遞補，避免新報名者插隊
    var c = WP.counts(eventId);
    var state;
    if (c.confirmed < ev.capacity) state = 'confirmed';
    else if (c.waitlist < (ev.waitlistCap || 0)) state = 'waitlist';
    else return { ok: false, msg: '正取與候補名額皆已額滿' };

    var reg = {
      id: uid('reg'), eventId: eventId, userId: me ? me.id : null,
      name: (form.name || '').trim(), email: (form.email || '').trim(),
      phone: (form.phone || '').trim(), note: (form.note || '').trim(),
      state: state, createdAt: nowISO(), updatedAt: nowISO()
    };
    load().regs.push(reg);
    save();

    var pos = state === 'waitlist' ? WP.waitPosition(reg.id) : 0;
    if (me) {
      if (state === 'confirmed') {
        WP.notify(me.id, { type: 'reg', eventId: eventId, title: '報名成功', body: '已為你保留「' + ev.title + '」的名額。' + channelNote(me.id) });
      } else {
        WP.notify(me.id, { type: 'wait', eventId: eventId, title: '已加入候補名單', body: '「' + ev.title + '」目前候補順位：第 ' + pos + ' 位。' });
      }
      WP.ensureReminders();
    }
    return { ok: true, reg: reg, state: state, position: pos };
  };

  WP.updateReg = function (regId, form) {
    var reg = WP.getReg(regId);
    if (!reg) return null;
    ['name', 'email', 'phone', 'note'].forEach(function (k) {
      if (form[k] !== undefined) reg[k] = (form[k] || '').trim();
    });
    reg.updatedAt = nowISO();
    save();
    return reg;
  };

  /** 取消報名：釋出名額並自動遞補候補第一順位 */
  WP.cancelReg = function (regId) {
    var reg = WP.getReg(regId);
    if (!reg || reg.state === 'cancelled') return { ok: false };
    var wasConfirmed = reg.state === 'confirmed';
    reg.state = 'cancelled';
    reg.updatedAt = nowISO();
    var promoted = null;
    if (wasConfirmed) promoted = fillFromWaitlist(reg.eventId)[0] || null;
    save();
    return { ok: true, promoted: promoted };
  };

  function promoteNext(eventId) {
    var d = load();
    var ev = WP.getEvent(eventId);
    if (!ev) return null;
    var st = WP.statusOf(ev);
    // 活動已無報名意義（結束／進行中／取消／草稿）時不遞補，避免發出誤導通知
    if (st === 'ended' || st === 'ongoing' || st === 'cancelled' || st === 'draft') return null;
    if (WP.counts(eventId).confirmed >= ev.capacity) return null;
    var next = d.regs.filter(function (r) { return r.eventId === eventId && r.state === 'waitlist'; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; })[0];
    if (!next) return null;
    next.state = 'confirmed';
    next.promotedAt = nowISO();
    next.updatedAt = nowISO();
    if (next.userId) {
      WP.notify(next.userId, { type: 'promote', eventId: eventId, title: '候補遞補成功', body: '您已成功遞補為「' + ev.title + '」的正式參加者。' });
    }
    return next;
  }

  /** 只要還有空位就依序遞補候補，回傳全部被遞補者（可能為空陣列） */
  function fillFromWaitlist(eventId) {
    var promoted = [];
    var next;
    while ((next = promoteNext(eventId))) promoted.push(next);
    return promoted;
  }

  /* ---------- 留言 ---------- */
  WP.commentsOf = function (eventId) {
    return load().comments.filter(function (c) { return c.eventId === eventId; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
  };
  WP.addComment = function (eventId, name, text) {
    var me = WP.me();
    var c = {
      id: uid('c'), eventId: eventId,
      userId: me ? me.id : null, anonId: me ? '' : WP.anonId(),
      name: me ? me.name : (name || '').trim(),
      text: (text || '').trim(), createdAt: nowISO()
    };
    load().comments.push(c);
    save();
    return c;
  };
  WP.editComment = function (id, text) {
    var c = load().comments.find(function (x) { return x.id === id; });
    if (!c) return null;
    c.text = (text || '').trim();
    c.editedAt = nowISO();
    save();
    return c;
  };
  WP.deleteComment = function (id) {
    var d = load();
    d.comments = d.comments.filter(function (x) { return x.id !== id; });
    save();
  };
  WP.canEditComment = function (c) {
    var me = WP.me();
    if (me && c.userId === me.id) return true;
    return !c.userId && c.anonId === WP.anonId();
  };
  WP.canDeleteComment = function (c, ev) {
    var me = WP.me();
    if (WP.canEditComment(c)) return true;
    return !!(me && (WP.isAdmin(me) || (ev && ev.organizerId === me.id)));
  };

  /* ---------- 通知 ---------- */
  function channelNote(userId) {
    var s = WP.settings(userId);
    var ch = [];
    if (s.chLine) ch.push('LINE（需綁定）');
    if (s.chEmail) ch.push('Email（模擬）');
    return ch.length ? '（已同步發送：' + ch.join('、') + '）' : '';
  }
  WP.notify = function (userId, data) {
    if (!userId) return;
    var n = Object.assign({
      id: uid('n'), userId: userId, type: 'info', eventId: null,
      title: '', body: '', key: '', read: false, createdAt: nowISO()
    }, data);
    load().notifs.push(n);
    save();
    maybeLinePush(userId, n);
  };

  /** 收件者開啟 LINE 通知時，把通知轉發給 Apps Script 推播（有綁定才會真的送出） */
  function maybeLinePush(userId, n) {
    var url = WP.gasUrl();
    if (!url || typeof fetch !== 'function') return;
    if (!WP.settings(userId).chLine) return;
    var user = WP.getUser(userId);
    if (!user) return;
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'notify', to: user.name, title: n.title, body: n.body })
      }).catch(function () {}); // 盡力而為，失敗不影響站內通知
    } catch (e) {}
  }
  WP.myNotifs = function () {
    var me = WP.me();
    if (!me) return [];
    return load().notifs.filter(function (n) { return n.userId === me.id; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  };
  WP.unreadCount = function () {
    return WP.myNotifs().filter(function (n) { return !n.read; }).length;
  };
  WP.markRead = function (id) {
    var n = load().notifs.find(function (x) { return x.id === id; });
    if (n) { n.read = true; save(); }
  };
  WP.markAllRead = function () {
    WP.myNotifs().forEach(function (n) { n.read = true; });
    save();
  };

  /* ---------- 通知設定 ---------- */
  var DEFAULT_SETTINGS = { remind3d: true, remind1d: true, remindDay: true, chLine: true, chEmail: false };
  WP.settings = function (userId) {
    var me = userId ? { id: userId } : WP.me();
    if (!me) return Object.assign({}, DEFAULT_SETTINGS);
    return Object.assign({}, DEFAULT_SETTINGS, load().settings[me.id] || {});
  };
  WP.saveSettings = function (patch) {
    var me = WP.me();
    if (!me) return;
    var d = load();
    d.settings[me.id] = Object.assign({}, WP.settings(), patch);
    save();
  };

  /** 活動提醒（3 天／1 天／當天）：每次載入頁面時檢查並補發，不重複 */
  WP.ensureReminders = function () {
    var me = WP.me();
    if (!me) return;
    var s = WP.settings();
    var d = load();
    var today = dt(WP.todayStr(), '00:00');
    WP.myRegs().forEach(function (r) {
      if (r.state !== 'confirmed') return;
      var ev = WP.getEvent(r.eventId);
      if (!ev || ev.cancelled || ev.draft) return;
      var st = WP.statusOf(ev);
      if (st === 'ended' || st === 'ongoing') return;
      var days = Math.round((dt(ev.date, '00:00') - today) / 86400000);
      var tag = null, label = null;
      if (days === 0) { tag = 'day'; label = '就是今天'; }
      else if (days === 1) { tag = '1d'; label = '明天登場'; }
      else if (days <= 3 && days > 1) { tag = '3d'; label = days + ' 天後開始'; }
      if (!tag) return;
      if (tag === 'day' && !s.remindDay) return;
      if (tag === '1d' && !s.remind1d) return;
      if (tag === '3d' && !s.remind3d) return;
      var key = 'remind:' + tag + ':' + ev.id + ':' + me.id;
      if (d.notifs.some(function (n) { return n.key === key; })) return;
      WP.notify(me.id, {
        type: 'remind', eventId: ev.id, key: key, title: '活動提醒',
        body: '「' + ev.title + '」' + label + '（' + ev.date + ' ' + (ev.start || '') + '），別忘了準時出席！'
      });
    });
  };

  /* ---------- Google 試算表同步 ---------- */
  // 預設連線的 Apps Script 網址（頁尾「連接 Google 試算表」可覆寫或中斷）
  var DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwRe79n4AtRL3KyHhXW3_O9OJ8Xm4GUQQIsUZD98iyatM3ii7ywWthnawJ_6IH3pxqf/exec';
  var GAS_KEY = 'wishpool_gas_url';
  var GAS_OFF = '__off__'; // 使用者明確中斷連線的標記，避免回退到預設網址
  var pushTimer = null;
  var syncState = 'idle'; // idle | syncing | ok | error（未設定網址時一律回報 off）

  WP.gasUrl = function () {
    var v = localStorage.getItem(GAS_KEY);
    if (v === GAS_OFF) return '';
    return v || DEFAULT_GAS_URL;
  };
  WP.setGasUrl = function (url) {
    url = (url || '').trim();
    if (!url) localStorage.setItem(GAS_KEY, GAS_OFF);
    else if (url === DEFAULT_GAS_URL) localStorage.removeItem(GAS_KEY);
    else localStorage.setItem(GAS_KEY, url);
    syncState = 'idle';
    emitSync();
  };
  WP.syncState = function () { return WP.gasUrl() ? syncState : 'off'; };

  function emitSync() {
    try { window.dispatchEvent(new CustomEvent('wp-sync', { detail: WP.syncState() })); } catch (e) {}
  }
  function setSync(s) { syncState = s; emitSync(); }

  function schedulePush() {
    if (!WP.gasUrl()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushNow(); }, 1200); // 連續操作只推一次
  }

  function pushNow() {
    var url = WP.gasUrl();
    if (!url) return Promise.resolve(false);
    clearTimeout(pushTimer);
    setSync('syncing');
    // session（誰登入中）是各裝置自己的狀態，不上雲
    var payload = Object.assign({}, load(), { session: null });
    // Content-Type 用 text/plain 避免 CORS preflight（Apps Script 不支援 OPTIONS）
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); })
      .then(function (res) {
        setSync(res && res.ok ? 'ok' : 'error');
        return !!(res && res.ok);
      })
      .catch(function () { setSync('error'); return false; });
  }
  WP.pushNow = pushNow;

  /** 開頁時與雲端對時：雲端較新→採用並回呼（通常整頁重載）；本機較新或雲端為空→上傳本機 */
  WP.cloudInit = function (onRemoteNewer) {
    var url = WP.gasUrl();
    if (!url) return;
    setSync('syncing');
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) throw new Error('bad response');
        var remote = res.db;
        var local = load();
        var lu = local.u || 0;
        var ru = (remote && remote.u) || 0;
        if (remote && remote.v === 1 && ru > lu) {
          remote.session = local.session || null; // 登入狀態留在本機
          if (remote.session && !remote.users.some(function (u) { return u.id === remote.session; })) {
            var meUser = local.users.find(function (u) { return u.id === local.session; });
            if (meUser) remote.users.push(meUser); else remote.session = null;
          }
          db = remote;
          persist();
          setSync('ok');
          if (onRemoteNewer) onRemoteNewer();
        } else if (!remote || lu > ru) {
          pushNow(); // 雲端為空或較舊：把本機推上去
        } else {
          setSync('ok');
        }
      })
      .catch(function () { setSync('error'); });
  };

  // 其他分頁寫入時使記憶體快取失效，避免整包互相覆寫
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) db = null;
    });
  }

  load();
})();
