/* 願望池 — 通知中心 */
(function () {
  'use strict';
  WP.mountChrome('notify');

  var I = WP.icons;
  var subEl = WP.$('#notif-sub');
  var markBtn = WP.$('#mark-all');
  var listEl = WP.$('#notif-list');
  var settingsHost = WP.$('#settings-host');

  /* 頁首登入／登出後（登入狀態改變）整頁重載，讓內容與身分一致 */
  var lastUid = WP.me() ? WP.me().id : null;
  var baseRenderHeader = WP.renderHeader;
  WP.renderHeader = function (active) {
    baseRenderHeader(active);
    var uid = WP.me() ? WP.me().id : null;
    if (uid !== lastUid) { lastUid = uid; location.reload(); }
  };

  /* 通知類型 → 圖示樣式 */
  var TYPE_META = {
    reg: { cls: 'n-reg', ic: I.check },
    wait: { cls: 'n-wait', ic: I.clock },
    promote: { cls: 'n-promote', ic: I.spark },
    change: { cls: 'n-change', ic: I.info },
    remind: { cls: 'n-remind', ic: I.bell }
  };

  var REMIND_KEYS = ['remind3d', 'remind1d', 'remindDay'];
  var SETTING_GROUPS = [
    { label: '活動提醒', rows: [
      ['remind3d', '活動前 3 天提醒', '已報名的活動開始前 3 天通知你'],
      ['remind1d', '活動前 1 天提醒', '已報名的活動開始前 1 天通知你'],
      ['remindDay', '活動當天提醒', '活動當天再提醒一次，別忘了準時出席']
    ] },
    { label: '通知管道', rows: [
      ['chLine', 'LINE 通知', '掃下方 QR Code 加入官方帳號並完成綁定後，通知會真實推送到你的 LINE'],
      ['chEmail', 'Email 通知', '示範模擬，不會真的發送']
    ] }
  ];

  /* ---------- 頁首（副標＋全部標為已讀） ---------- */
  function renderHead() {
    if (!WP.me()) {
      subEl.textContent = '報名、候補、異動與活動提醒，都會集中在這裡。';
      markBtn.hidden = true;
      return;
    }
    var unread = WP.unreadCount();
    subEl.textContent = unread > 0 ? '未讀 ' + unread + ' 則' : '沒有未讀通知';
    markBtn.hidden = false;
    markBtn.disabled = unread === 0;
  }

  /* ---------- 通知列表 ---------- */
  function renderList() {
    if (!WP.me()) {
      listEl.innerHTML =
        '<div class="empty"><div class="empty-ic">' + I.bell + '</div>' +
        '<p>登入後查看你的通知</p>' +
        '<button class="btn btn-primary" id="login-go">登入</button></div>';
      WP.$('#login-go', listEl).addEventListener('click', function () {
        WP.askLogin(function () { location.reload(); });
      });
      return;
    }

    var list = WP.myNotifs();
    if (!list.length) {
      listEl.innerHTML =
        '<div class="empty"><div class="empty-ic">' + I.bell + '</div>' +
        '<p>目前沒有通知，去報名一場活動吧！</p>' +
        '<a class="btn btn-light" href="index.html">探索活動</a></div>';
      return;
    }

    listEl.innerHTML = list.map(function (n) {
      var meta = TYPE_META[n.type] || { cls: 'n-remind', ic: I.info };
      return '<article class="notif-item' + (n.read ? '' : ' unread') + '" data-id="' + WP.esc(n.id) + '" role="button" tabindex="0">' +
        '<span class="notif-ic ' + meta.cls + '">' + meta.ic + '</span>' +
        '<div class="notif-main">' +
        '<h4>' + WP.esc(n.title) + (n.read ? '' : '<i class="new-dot"></i>') + '</h4>' +
        '<p>' + WP.esc(n.body) + '</p>' +
        '<time>' + WP.esc(WP.fmtDT(n.createdAt)) + '</time>' +
        '</div>' +
        (n.eventId ? '<span class="notif-go">' + I.arrowR + '</span>' : '') +
        '</article>';
    }).join('');

    WP.$$('.notif-item', listEl).forEach(function (item) {
      item.addEventListener('click', function () { openNotif(item.dataset.id); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotif(item.dataset.id); }
      });
    });
  }

  function openNotif(id) {
    var n = WP.myNotifs().find(function (x) { return x.id === id; });
    if (!n) return;
    WP.markRead(n.id);
    if (n.eventId) {
      location.href = 'event.html?id=' + encodeURIComponent(n.eventId);
      return;
    }
    renderHead();
    renderList();
    WP.renderHeader();
  }

  /* ---------- LINE 綁定引導 ---------- */
  var LINE_ADD_URL = 'https://lin.ee/TGdeZpc';
  function lineBindHTML() {
    var me = WP.me();
    return '<div class="line-bind">' +
      '<img class="line-qr" src="image/M_gainfriends_2dbarcodes_GW.png" alt="願望池 LINE 官方帳號 QR Code" loading="lazy">' +
      '<div class="line-bind-main">' +
      '<h3>綁定 LINE，通知不漏接</h3>' +
      '<ol>' +
      '<li>掃描 QR Code，或手機直接按下方按鈕加入官方帳號</li>' +
      '<li>傳送你的暱稱' + (me ? '「<b>' + WP.esc(me.name) + '</b>」' : '') + '給機器人</li>' +
      '<li>收到「已完成綁定 ✅」就完成了</li>' +
      '</ol>' +
      '<a class="btn btn-line" href="' + LINE_ADD_URL + '" target="_blank" rel="noopener">加入 LINE 好友</a>' +
      '</div></div>';
  }

  /* ---------- 提醒設定 ---------- */
  function renderSettings() {
    if (!WP.me()) { settingsHost.innerHTML = ''; return; }
    var s = WP.settings();
    settingsHost.innerHTML =
      '<div class="form-card settings-card">' +
      '<div class="form-head"><span class="fc-ic fc-red">' + I.bell + '</span><h2>提醒設定</h2></div>' +
      SETTING_GROUPS.map(function (g) {
        return '<p class="set-group">' + WP.esc(g.label) + '</p>' +
          g.rows.map(function (row) {
            return '<div class="setting-row"><div>' +
              '<div class="s-lab">' + WP.esc(row[1]) + '</div>' +
              '<div class="s-hint">' + WP.esc(row[2]) + '</div>' +
              '</div>' +
              '<label class="switch"><input type="checkbox" data-key="' + row[0] + '"' + (s[row[0]] ? ' checked' : '') + '><span class="knob"></span></label>' +
              '</div>';
          }).join('');
      }).join('') +
      lineBindHTML() +
      '<p class="set-note">' + I.info + '<span>站內通知顯示在這個瀏覽器；LINE 通知需先完成上方綁定（未綁定則自動略過），Email 為示範模擬。</span></p>' +
      '</div>';

    WP.$$('.switch input', settingsHost).forEach(function (input) {
      input.addEventListener('change', function () {
        var patch = {};
        patch[input.dataset.key] = input.checked;
        WP.saveSettings(patch);
        WP.toast('設定已更新', 'success');
        if (REMIND_KEYS.indexOf(input.dataset.key) !== -1) {
          WP.ensureReminders();
          renderHead();
          renderList();
          WP.renderHeader();
        }
      });
    });
  }

  /* ---------- 全部標為已讀 ---------- */
  markBtn.innerHTML = I.check + '全部標為已讀';
  markBtn.addEventListener('click', function () {
    WP.markAllRead();
    WP.toast('已全部標為已讀', 'success');
    renderHead();
    renderList();
    WP.renderHeader();
  });

  renderHead();
  renderList();
  renderSettings();
})();
