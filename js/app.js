/* 願望池 — 共用 UI 元件與工具（依賴 store.js） */
window.WP = window.WP || {};
(function () {
  'use strict';

  /* ---------- DOM 小工具 ---------- */
  WP.$ = function (sel, root) { return (root || document).querySelector(sel); };
  WP.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  WP.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  WP.qs = function (name) { return new URLSearchParams(location.search).get(name) || ''; };

  /* ---------- 圖示（inline SVG） ---------- */
  var I = {};
  function svg(inner, vb) {
    return '<svg class="ic" viewBox="' + (vb || '0 0 24 24') + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }
  I.search = svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>');
  I.calendar = svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>');
  I.clock = svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>');
  I.pin = svg('<path d="M12 21s-6.5-5.3-6.5-10a6.5 6.5 0 0 1 13 0c0 4.7-6.5 10-6.5 10Z"/><circle cx="12" cy="10.6" r="2.3"/>');
  I.users = svg('<circle cx="9.5" cy="8.5" r="3.2"/><path d="M3.5 19.5c.7-3 3-4.7 6-4.7s5.3 1.7 6 4.7"/><path d="M15.5 5.8a3.2 3.2 0 0 1 0 5.5M17.5 15.2c1.7.6 2.7 2 3 4.3"/>');
  I.bell = svg('<path d="M18 10a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10 19.5a2.2 2.2 0 0 0 4 0"/>');
  I.tag = svg('<path d="m3.5 12.5 8 8a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8l-8-8H5.5a2 2 0 0 0-2 2v7Z"/><circle cx="8.5" cy="8.5" r="1.4"/>');
  I.arrowR = svg('<path d="M4 12h15M13 6l6 6-6 6"/>');
  I.arrowL = svg('<path d="M20 12H5M11 18l-6-6 6-6"/>');
  I.info = svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.3"/>');
  I.chat = svg('<path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12Z"/>');
  I.edit = svg('<path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17l-1 4Z"/><path d="m13.5 6.5 3 3"/>');
  I.trash = svg('<path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7M18 6.5l-.8 12.6a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 6.5"/><path d="M10 10.5v5M14 10.5v5"/>');
  I.download = svg('<path d="M12 4v11M7 11l5 5 5-5"/><path d="M4.5 19.5h15"/>');
  I.x = svg('<path d="m6 6 12 12M18 6 6 18"/>');
  I.check = svg('<path d="m4.5 12.5 5 5L19.5 7"/>');
  I.plus = svg('<path d="M12 5v14M5 12h14"/>');
  I.ticket = svg('<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"/><path d="M14 6v12" stroke-dasharray="2.5 2.5"/>');
  I.text = svg('<path d="M5 5.5h14M5 10h14M5 14.5h9"/>');
  I.spark = svg('<path d="M12 3c.8 3.6 2.4 5.2 6 6-3.6.8-5.2 2.4-6 6-.8-3.6-2.4-5.2-6-6 3.6-.8 5.2-2.4 6-6Z" fill="currentColor" stroke="none"/><path d="M19 14.5c.4 1.8 1.2 2.6 3 3-1.8.4-2.6 1.2-3 3-.4-1.8-1.2-2.6-3-3 1.8-.4 2.6-1.2 3-3Z" fill="currentColor" stroke="none"/>', '0 0 24 24');
  I.logo = '<svg class="logo-mark" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" fill="#E2634C"/><g fill="#FFF6EA"><ellipse cx="18" cy="10.4" rx="3.4" ry="5"/><ellipse cx="18" cy="25.6" rx="3.4" ry="5"/><ellipse cx="10.4" cy="18" rx="5" ry="3.4"/><ellipse cx="25.6" cy="18" rx="5" ry="3.4"/><circle cx="18" cy="18" r="2.4" fill="#E2634C"/></g></svg>';
  WP.icons = I;

  /* ---------- 格式化 ---------- */
  var WEEK = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  function validDateStr(dateStr) { return !!dateStr && !isNaN(WP.dt(dateStr, '00:00')); }
  WP.weekdayZh = function (dateStr) { return validDateStr(dateStr) ? WEEK[WP.dt(dateStr, '00:00').getDay()] : ''; };
  WP.weekdayLabel = function (dateStr) {
    if (!validDateStr(dateStr)) return '';
    var today = WP.todayStr();
    if (dateStr === today) return '今天';
    var t = new Date(); t.setDate(t.getDate() + 1);
    var tm = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
    if (dateStr === tm) return '明天';
    return WP.weekdayZh(dateStr);
  };
  WP.fmtMD = function (dateStr) {
    if (!validDateStr(dateStr)) return '日期未定';
    var d = WP.dt(dateStr, '00:00');
    return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  };
  WP.fmtFull = function (dateStr) {
    if (!validDateStr(dateStr)) return '日期未定';
    return dateStr + '(' + WP.weekdayZh(dateStr) + ')';
  };
  /** 是否為連續多天活動（結束日期存在且晚於開始日期） */
  WP.isMultiDay = function (ev) { return !!(ev.dateEnd && ev.dateEnd > ev.date); };
  /** 活動最後一天（單日活動即開始日期） */
  WP.lastDay = function (ev) { return WP.isMultiDay(ev) ? ev.dateEnd : ev.date; };
  /** 連續天數（含頭尾）；非多天回傳 1 */
  WP.dayCount = function (ev) {
    if (!WP.isMultiDay(ev)) return 1;
    return Math.round((WP.dt(ev.dateEnd, '00:00') - WP.dt(ev.date, '00:00')) / 86400000) + 1;
  };
  /** 活動日期：單日沿用 fmtFull，多天顯示「起 ～ 迄」 */
  WP.fmtDateRange = function (ev) {
    if (!validDateStr(ev.date)) return '日期未定';
    if (!WP.isMultiDay(ev)) return WP.fmtFull(ev.date);
    return WP.fmtFull(ev.date) + ' ～ ' + WP.fmtFull(ev.dateEnd);
  };
  WP.fmtTimeRange = function (ev) {
    if (ev.start && ev.end) return ev.start + ' – ' + ev.end;
    return ev.start || '時間未定';
  };
  WP.fmtDT = function (iso) { return iso ? iso.replace('T', ' ') : ''; };
  WP.fmtFee = function (fee) {
    return (fee > 0) ? 'NT$ ' + Number(fee).toLocaleString('en-US') : '免費';
  };
  WP.percent = function (ev) {
    var c = WP.counts(ev.id);
    if (!ev.capacity) return 0;
    return Math.min(100, Math.round(c.confirmed / ev.capacity * 100));
  };

  /* ---------- 活動狀態顯示 ---------- */
  WP.STATUS = {
    open: { label: '報名中', cls: 's-open' },
    full: { label: '已額滿', cls: 's-full' },
    upcoming: { label: '即將開始', cls: 's-upcoming' },
    closed: { label: '報名截止', cls: 's-closed' },
    ongoing: { label: '進行中', cls: 's-ongoing' },
    ended: { label: '已結束', cls: 's-ended' },
    cancelled: { label: '已取消', cls: 's-cancelled' },
    draft: { label: '草稿', cls: 's-draft' }
  };
  WP.statusPill = function (ev) {
    var key = WP.statusOf(ev);
    var meta = WP.STATUS[key];
    var label = meta.label;
    if (key === 'full') {
      var c = WP.counts(ev.id);
      if ((ev.waitlistCap || 0) > c.waitlist) label = '已額滿・候補中';
    }
    return '<span class="pill status ' + meta.cls + '"><i class="dot"></i>' + label + '</span>';
  };

  /* ---------- 封面圖 ---------- */
  var COVER_THEMES = {
    '運動健身': ['#F4C4AE', '#DF6A4F', '🏸'],
    '學習成長': ['#F5DCA8', '#D2913C', '📖'],
    '桌遊娛樂': ['#D5E3C4', '#6F9A54', '🎲'],
    '戶外踏青': ['#C4DCCB', '#4C8464', '⛰️'],
    '藝文攝影': ['#E0CBE4', '#8A62A0', '📷'],
    '音樂表演': ['#F2CCC4', '#BA5B4A', '🎧'],
    '手作烘焙': ['#F4DBB8', '#C08640', '🥐'],
    '科技交流': ['#C8D6EC', '#4E6FA4', '🤖'],
    '美食聚會': ['#F4D2B4', '#C67840', '☕'],
    '其他': ['#E6DCC8', '#8E7E60', '✨']
  };
  WP.coverFor = function (ev) {
    if (ev.cover) return ev.cover;
    var t = COVER_THEMES[ev.category] || COVER_THEMES['其他'];
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + t[0] + '"/><stop offset="1" stop-color="' + t[1] + '"/></linearGradient></defs>' +
      '<rect width="800" height="500" fill="url(#g)"/>' +
      '<circle cx="120" cy="90" r="150" fill="#FFF6EA" opacity="0.14"/>' +
      '<circle cx="690" cy="60" r="100" fill="#FFF6EA" opacity="0.10"/>' +
      '<circle cx="620" cy="430" r="210" fill="#2B2018" opacity="0.08"/>' +
      '<text x="740" y="450" font-size="150" text-anchor="end">' + t[2] + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  };

  /* ---------- 頭像 ---------- */
  WP.avatar = function (user, size) {
    var cls = 'avatar' + (size ? ' ' + size : '');
    if (!user) return '<span class="' + cls + '" style="background:#E6DCC8">?</span>';
    var inner = user.emoji || WP.esc((user.name || '?').trim().charAt(0).toUpperCase());
    var dark = user.bg === '#2B2620';
    return '<span class="' + cls + '" style="background:' + WP.esc(user.bg || '#E6DCC8') + (dark ? ';color:#FFF6EA' : '') + '">' + inner + '</span>';
  };

  /* ---------- 活動卡片（首頁／我的活動共用） ---------- */
  WP.eventCard = function (ev, opts) {
    opts = opts || {};
    var c = WP.counts(ev.id);
    var pct = WP.percent(ev);
    var org = WP.getUser(ev.organizerId);
    var url = 'event.html?id=' + encodeURIComponent(ev.id);
    var tags = (ev.tags || []).slice(0, 3).map(function (t) {
      return '<span class="tag">#' + WP.esc(t) + '</span>';
    }).join('');
    var waitTxt = c.waitlist > 0 ? '<em>・候補 ' + c.waitlist + '</em>' : '';
    var key = WP.statusOf(ev);
    var dim = (key === 'ended' || key === 'cancelled') ? ' is-dim' : '';
    return '<article class="ecard' + dim + '">' +
      '<a class="ecard-media" href="' + url + '">' +
        '<img src="' + WP.esc(WP.coverFor(ev)) + '" alt="" loading="lazy">' +
        '<span class="pill pill-price">' + I.tag + WP.fmtFee(ev.fee) + '</span>' +
        WP.statusPill(ev) +
      '</a>' +
      '<div class="ecard-body">' +
        (tags ? '<div class="tag-row">' + tags + '</div>' : '') +
        '<h3 class="ecard-title"><a href="' + url + '">' + WP.esc(ev.title) + '</a></h3>' +
        (WP.isMultiDay(ev)
          ? '<div class="meta-row">' + I.calendar + '<span>' + WP.esc(WP.fmtMD(ev.date) + ' – ' + WP.fmtMD(ev.dateEnd)) + '・連續 ' + WP.dayCount(ev) + ' 天</span></div>'
          : '') +
        '<div class="meta-row">' + I.clock + '<span>' + WP.fmtTimeRange(ev) + '</span></div>' +
        '<div class="meta-row">' + I.pin + '<span>' + WP.esc(ev.venue || ev.city || '地點未定') + '</span></div>' +
        '<div class="cap-row"><span class="cap-num">' + I.users + c.confirmed + ' / ' + ev.capacity + ' 人' + waitTxt + '</span><b class="pct">' + pct + '%</b></div>' +
        '<div class="bar"><i class="' + (pct >= 100 ? 'is-full' : '') + '" style="width:' + pct + '%"></i></div>' +
        '<div class="ecard-foot">' +
          '<span class="org">' + WP.avatar(org, 'sm') + '<span class="org-name">' + WP.esc(org ? org.name : '') + '</span></span>' +
          '<a class="more" href="' + url + '">查看詳情 ' + I.arrowR + '</a>' +
        '</div>' +
      '</div>' +
    '</article>';
  };

  /* ---------- Toast ---------- */
  WP.toast = function (msg, type) {
    var wrap = WP.$('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' t-' + type : '');
    t.innerHTML = (type === 'success' ? I.check : type === 'warn' ? I.info : I.spark) + '<span>' + WP.esc(msg) + '</span>';
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 2800);
  };

  /* ---------- Modal ---------- */
  WP.modal = function (opts) {
    var ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="modal-card' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
      '<button class="modal-x" aria-label="關閉">' + I.x + '</button>' +
      (opts.title ? '<h3 class="modal-title">' + opts.title + '</h3>' : '') +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      '</div>';
    document.body.appendChild(ov);
    document.body.classList.add('no-scroll');
    function close() {
      ov.classList.add('closing');
      document.body.classList.remove('no-scroll');
      setTimeout(function () { ov.remove(); }, 180);
      document.removeEventListener('keydown', onKey);
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    WP.$('.modal-x', ov).addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(function () { ov.classList.add('show'); });
    return { el: ov, close: close };
  };

  /** 確認對話框，回傳 Promise<boolean> */
  WP.confirm = function (opts) {
    return new Promise(function (resolve) {
      var m = WP.modal({
        title: WP.esc(opts.title || '確認'),
        body: '<p class="confirm-text">' + WP.esc(opts.body || '') + '</p>' +
          '<div class="modal-actions">' +
          '<button class="btn btn-light" data-act="no">取消</button>' +
          '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="yes">' + WP.esc(opts.okText || '確定') + '</button>' +
          '</div>',
        onClose: function () { resolve(false); }
      });
      WP.$('[data-act="yes"]', m.el).addEventListener('click', function () {
        resolve(true); // 先解析，onClose 的 resolve(false) 會被忽略
        m.el.querySelector('.modal-x').click();
      });
      WP.$('[data-act="no"]', m.el).addEventListener('click', function () {
        m.el.querySelector('.modal-x').click();
      });
    });
  };

  /* ---------- 登入 ---------- */
  WP.askLogin = function (then, intro) {
    var m = WP.modal({
      title: '登入願望池',
      body: '<p class="modal-sub">' + WP.esc(intro || '輸入一個暱稱就能開始，資料只存在這台裝置的瀏覽器裡；示範版僅以暱稱識別身分。') + '</p>' +
        '<form id="login-form" novalidate>' +
        '<div class="field"><label>你的暱稱 <b class="req">*</b></label>' +
        '<input name="name" maxlength="20" autocomplete="off" required></div>' +
        '<div class="modal-actions"><button class="btn btn-primary btn-block" type="submit">開始揪團</button></div>' +
        '</form>'
    });
    var form = WP.$('#login-form', m.el);
    form.name.focus();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      if (!name) { form.name.focus(); return; }
      WP.login(name);
      m.close();
      WP.toast('哈囉，' + name + '！', 'success');
      WP.renderHeader();
      if (then) then(WP.me());
      else if (document.body.dataset.reloadOnAuth) location.reload();
    });
  };
  WP.requireLogin = function (then, intro) {
    var me = WP.me();
    if (me) { then(me); return; }
    WP.askLogin(then, intro);
  };

  /* ---------- 報名表單（報名／修改共用） ---------- */
  WP.regModal = function (ev, existing, onDone) {
    var c = WP.counts(ev.id);
    var isEdit = !!existing;
    var toWaitlist = !isEdit && c.confirmed >= ev.capacity;
    var wlFull = toWaitlist && c.waitlist >= (ev.waitlistCap || 0);
    var v = existing || { name: (WP.me() ? WP.me().name : ''), email: '', phone: '', note: '' };
    var notice = '';
    if (wlFull) {
      notice = '<div class="wait-note">' + I.info + '<span>正取與候補名額皆已額滿，目前無法報名，可以到留言區關注是否有名額釋出。</span></div>';
    } else if (toWaitlist) {
      notice = '<div class="wait-note">' + I.info + '<span>正取名額已滿，送出後將加入<b>候補名單</b>（目前候補 ' + c.waitlist + ' 人），釋出名額時依序遞補。</span></div>';
    }
    var m = WP.modal({
      title: isEdit ? '修改報名資料' : WP.esc(ev.title),
      body: (isEdit ? '' : '<p class="modal-sub">' + WP.esc(WP.fmtDateRange(ev)) + ' ' + WP.esc(WP.fmtTimeRange(ev)) + '・' + WP.esc(ev.venue || '') + '</p>') +
        notice +
        '<form id="reg-form" novalidate>' +
        '<div class="field"><label>暱稱或姓名 <b class="req">*</b></label><input name="name" maxlength="20" required value="' + WP.esc(v.name) + '"></div>' +
        '<div class="grid2">' +
        '<div class="field"><label>Email</label><input name="email" type="email" placeholder="選填" value="' + WP.esc(v.email) + '"></div>' +
        '<div class="field"><label>電話</label><input name="phone" type="tel" maxlength="15" placeholder="選填" value="' + WP.esc(v.phone) + '"></div>' +
        '</div>' +
        '<div class="field"><label>備註</label><textarea name="note" rows="2" maxlength="200" placeholder="想讓主辦人知道的事（選填）">' + WP.esc(v.note) + '</textarea></div>' +
        '<div class="modal-actions"><button class="btn btn-primary btn-block" type="submit"' + (wlFull ? ' disabled' : '') + '>' +
        (isEdit ? '儲存變更' : (wlFull ? '已額滿' : (toWaitlist ? '加入候補' : '確認報名'))) + '</button></div>' +
        '</form>'
    });
    var form = WP.$('#reg-form', m.el);
    form.name.focus();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = { name: form.name.value, email: form.email.value, phone: form.phone.value, note: form.note.value };
      if (!data.name.trim()) { form.name.focus(); return; }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        WP.toast('Email 格式看起來不太對', 'warn'); form.email.focus(); return;
      }
      if (isEdit) {
        WP.updateReg(existing.id, data);
        m.close();
        WP.toast('報名資料已更新', 'success');
        if (onDone) onDone({ state: existing.state });
        return;
      }
      if (!WP.me()) WP.login(data.name);
      var r = WP.register(ev.id, data);
      m.close();
      if (!r.ok) { WP.toast(r.msg, 'warn'); return; }
      WP.renderHeader();
      var done = WP.modal({
        title: '',
        body: '<div class="success-pop">' +
          '<span class="success-ic ' + (r.state === 'waitlist' ? 'is-wait' : '') + '">' + (r.state === 'waitlist' ? I.clock : I.check) + '</span>' +
          '<h3>' + (r.state === 'waitlist' ? '已加入候補名單' : '報名成功') + '</h3>' +
          '<p>' + (r.state === 'waitlist'
            ? '目前候補順位：<b>第 ' + r.position + ' 位</b><br>有名額釋出時將自動依序遞補。'
            : '已為你保留「' + WP.esc(ev.title) + '」的名額，<br>活動前會再提醒你。') + '</p>' +
          '<button class="btn btn-primary" data-act="ok">好的</button>' +
          '</div>'
      });
      WP.$('[data-act="ok"]', done.el).addEventListener('click', done.close);
      if (onDone) onDone(r);
    });
  };

  /* ---------- 匯出名單 ---------- */
  var STATE_ZH = { confirmed: '正取', waitlist: '候補', cancelled: '已取消' };
  /** 防試算表公式注入：以 = + - @ 或 Tab 開頭的儲存格前置單引號 */
  function safeCell(v) {
    v = String(v == null ? '' : v);
    return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  }
  function rosterRows(eventId) {
    return WP.regsOf(eventId).map(function (r, i) {
      return [i + 1, STATE_ZH[r.state] || r.state, safeCell(r.name), safeCell(r.email), safeCell(r.phone), safeCell(r.note), WP.fmtDT(r.createdAt)];
    });
  }
  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  var HEAD = ['#', '狀態', '暱稱或姓名', 'Email', '電話', '備註', '報名時間'];
  WP.exportCSV = function (ev) {
    var lines = [HEAD].concat(rosterRows(ev.id)).map(function (row) {
      return row.map(function (cell) { return '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"'; }).join(',');
    });
    downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), ev.title + '-報名名單.csv');
  };
  WP.exportExcel = function (ev) {
    var rows = [HEAD].concat(rosterRows(ev.id)).map(function (row) {
      return '<tr>' + row.map(function (cell) { return '<td>' + WP.esc(cell) + '</td>'; }).join('') + '</tr>';
    }).join('');
    var html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head>' +
      '<body><table border="1">' + rows + '</table></body></html>';
    downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }), ev.title + '-報名名單.xls');
  };

  /* ---------- 頁首／頁尾 ---------- */
  WP.renderHeader = function (active) {
    if (active !== undefined) WP._activeNav = active;
    active = WP._activeNav || '';
    var host = WP.$('#site-head');
    if (!host) return;
    var me = WP.me();
    var unread = WP.unreadCount();
    var nav = [
      ['explore', 'index.html', '探索活動'],
      ['create', 'create.html', '建立活動'],
      ['mine', 'my.html', '我的活動'],
      ['notify', 'notify.html', '通知']
    ].map(function (n) {
      var badge = (n[0] === 'notify' && unread > 0) ? '<i class="nav-badge">' + (unread > 99 ? '99+' : unread) + '</i>' : '';
      return '<a href="' + n[1] + '" class="' + (active === n[0] ? 'active' : '') + '">' + n[2] + badge + '</a>';
    }).join('');
    host.innerHTML = '<div class="container head-in">' +
      '<a class="brand" href="index.html">' + I.logo + '<span class="brand-name">願望池<i>.</i></span></a>' +
      '<nav class="main-nav">' + nav + '</nav>' +
      '<div class="head-actions">' +
      '<a class="icon-btn" href="index.html#search" aria-label="搜尋">' + I.search + '</a>' +
      (me
        ? '<button class="user-chip" id="user-chip">' + WP.avatar(me, 'sm') + '<span>' + WP.esc(me.name) + '</span>' +
          (WP.isAdmin(me) ? '<i class="admin-tag">管理員</i>' : '') + '</button>'
        : '<button class="btn btn-primary btn-round" id="login-btn">登入</button>') +
      '</div></div>' +
      (me ? '<div class="user-menu" id="user-menu" hidden>' +
        '<a href="my.html">' + I.ticket + '個人活動中心</a>' +
        '<a href="notify.html">' + I.bell + '通知' + (unread ? '（' + unread + '）' : '') + '</a>' +
        '<button id="logout-btn">' + I.arrowL + '登出</button></div>' : '');
    var loginBtn = WP.$('#login-btn', host);
    if (loginBtn) loginBtn.addEventListener('click', function () { WP.askLogin(); });
    var chip = WP.$('#user-chip', host);
    if (chip) {
      var menu = WP.$('#user-menu', host);
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
      });
      WP.$('#logout-btn', menu).addEventListener('click', function () {
        WP.logout();
        WP.toast('已登出');
        WP.renderHeader();
        if (document.body.dataset.reloadOnAuth) location.reload();
      });
    }
  };

  // 點頁面其他處關閉使用者選單——模組層級只註冊一次，避免重繪頁首時累積監聽器
  document.addEventListener('click', function () {
    var menu = document.getElementById('user-menu');
    if (menu) menu.hidden = true;
  });

  // 頁尾只顯示同步狀態，不揭露試算表網址（設定入口：console 執行 WP.sheetsModal()）
  var SYNC_LABEL = {
    off: '',
    idle: '☁ 雲端同步已啟用',
    syncing: '☁ 同步中…',
    ok: '☁ 已同步',
    error: '☁ 同步失敗，將自動重試'
  };

  WP.renderFooter = function () {
    var host = WP.$('#site-foot');
    if (!host) return;
    var connected = !!WP.gasUrl();
    host.innerHTML = '<div class="container foot-in">' +
      '<span class="foot-brand">' + I.logo + '願望池<i>.</i></span>' +
      '<p>把想做的事丟進池子裡，總會有人跟你一起。' +
      (connected ? '資料會自動同步到雲端。' : '示範資料僅儲存在此瀏覽器（localStorage）。') + '</p>' +
      '<span class="foot-sync" id="sync-state">' + SYNC_LABEL[WP.syncState()] + '</span>' +
      '<button class="foot-reset" id="reset-demo">重置示範資料</button>' +
      '</div>';
    WP.$('#reset-demo', host).addEventListener('click', function () {
      WP.confirm({ title: '重置示範資料', body: '將清除所有活動、報名與留言，回到初始示範狀態' + (WP.gasUrl() ? '，並同步覆寫雲端資料' : '') + '。確定重置？', danger: true, okText: '重置' })
        .then(function (yes) { if (yes) WP.resetDemo(); });
    });
  };

  // 同步狀態變化時更新頁尾標籤（模組層級只註冊一次）
  window.addEventListener('wp-sync', function (e) {
    var el = document.getElementById('sync-state');
    if (el) {
      el.textContent = SYNC_LABEL[e.detail] || '';
      el.classList.toggle('is-error', e.detail === 'error');
    }
  });

  /** Google 試算表連線設定彈窗（不對外揭露現有網址；由 console 執行 WP.sheetsModal() 開啟） */
  WP.sheetsModal = function () {
    var cur = WP.gasUrl();
    var m = WP.modal({
      title: '同步到 Google 試算表',
      wide: true,
      body: '<p class="modal-sub">' +
        (cur ? '目前狀態：<b>已連接</b>（網址不顯示）。貼上新網址可更換連線目標。'
             : '將網站資料自動備份到你的 Google 試算表，並可在多台裝置間同步。') +
        '設定方式請看專案資料夾裡的 <b>google-sheets/設定教學.md</b>。</p>' +
        '<form id="sheets-form" novalidate>' +
        '<div class="field"><label>Apps Script 網頁應用程式網址</label>' +
        '<input name="url" type="url" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off"></div>' +
        '<div class="modal-actions">' +
        (cur ? '<button class="btn btn-danger" type="button" data-act="disconnect">中斷連線</button>' : '') +
        '<button class="btn btn-primary" type="submit">儲存並立即同步</button>' +
        '</div></form>'
    });
    var form = WP.$('#sheets-form', m.el);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var url = form.url.value.trim();
      if (!/^https:\/\/script\.google(?:usercontent)?\.com\//.test(url)) {
        WP.toast('請貼上 Apps Script 部署後的 /exec 網址', 'warn');
        form.url.focus();
        return;
      }
      WP.setGasUrl(url);
      m.close();
      WP.toast('設定已儲存，同步中…', 'success');
      WP.cloudInit(function () { location.reload(); });
    });
    var dis = WP.$('[data-act="disconnect"]', m.el);
    if (dis) dis.addEventListener('click', function () {
      WP.setGasUrl('');
      m.close();
      WP.toast('已中斷試算表連線（本機與試算表的資料都保留）');
      WP.renderFooter();
    });
  };

  /** 每頁進入點：渲染頁首頁尾＋補發提醒通知＋與雲端對時 */
  WP.mountChrome = function (active) {
    WP.ensureReminders();
    WP.renderHeader(active);
    WP.renderFooter();
    WP.cloudInit(function () { location.reload(); }); // 雲端較新時採用雲端版本並重載
  };
})();
