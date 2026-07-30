/* 願望池 — 個人活動中心（我的報名／我的活動） */
(function () {
  'use strict';
  WP.mountChrome('mine');

  var I = WP.icons;
  var statHost = WP.$('#stat-strip');
  var tabHost = WP.$('#center-tabs');
  var body = WP.$('#center-body');

  var me = WP.me();

  /* ---------- 未登入：置中空狀態 ---------- */
  if (!me) {
    // 這頁在任何登入完成後都整頁重載（含頁首的「登入」按鈕）
    var origAskLogin = WP.askLogin;
    WP.askLogin = function (then, intro) {
      origAskLogin(function (u) {
        if (then) then(u);
        location.reload();
      }, intro);
    };
    body.innerHTML =
      '<div class="empty guest-empty">' +
      '<div class="empty-ic">' + I.ticket + '</div>' +
      '<p>登入後查看你的報名與活動</p>' +
      '<button class="btn btn-primary" id="guest-login">登入</button>' +
      '</div>';
    WP.$('#guest-login').addEventListener('click', function () {
      WP.askLogin(function () { location.reload(); });
    });
    return;
  }

  statHost.hidden = false;
  tabHost.hidden = false;
  WP.$('#head-sub').innerHTML = '嗨，' + WP.esc(me.name) + '！你的報名紀錄與主辦的活動，都在這裡一次掌握。';

  /* ---------- 個人資料卡（大頭照） ---------- */
  var profileCard = document.createElement('div');
  profileCard.className = 'profile-card';
  function renderProfile() {
    me = WP.me();
    var sub = me.avatar ? ('大頭照：' + WP.avatarLabel(me.avatar)) : '還沒設定大頭照，挑一隻動物更好認！';
    profileCard.innerHTML =
      '<span class="pc-ava">' + WP.avatar(me, 'lg') + '</span>' +
      '<div class="pc-main"><b>' + WP.esc(me.name) + '</b><span>' + WP.esc(sub) + '</span></div>' +
      '<button class="btn btn-light btn-sm" id="pc-edit">' + I.edit + '更換大頭照</button>';
    WP.$('#pc-edit', profileCard).addEventListener('click', function () {
      WP.pickAvatar(function () { renderProfile(); });
    });
  }
  renderProfile();
  statHost.parentNode.insertBefore(profileCard, statHost);

  var state = {
    tab: WP.qs('tab') === 'hosted' ? 'hosted' : 'mine',
    sub: 'all'
  };

  var SUBS = [
    ['all', '全部'],
    ['confirmed', '已報名'],
    ['waitlist', '候補中'],
    ['cancelled', '已取消'],
    ['ended', '已結束']
  ];
  var PILL = {
    confirmed: { label: '已報名', cls: 's-open' },
    waitlist: { label: '候補中', cls: 's-full' },
    cancelled: { label: '已取消', cls: 's-cancelled' },
    evcancelled: { label: '活動已取消', cls: 's-cancelled' },
    ended: { label: '已結束', cls: 's-ended' }
  };

  /* ---------- 資料 ---------- */
  /** 報名的顯示狀態：已取消＞活動已取消＞已結束＞候補中＞已報名 */
  function displayState(reg, ev) {
    if (reg.state === 'cancelled') return 'cancelled';
    var st = WP.statusOf(ev);
    if (st === 'cancelled') return 'evcancelled';
    if (st === 'ended') return 'ended';
    if (reg.state === 'waitlist') return 'waitlist';
    return 'confirmed';
  }
  function myRegRows() {
    return WP.myRegs().map(function (reg) {
      var ev = WP.getEvent(reg.eventId);
      return ev ? { reg: reg, ev: ev, disp: displayState(reg, ev) } : null;
    }).filter(Boolean);
  }
  function hostedEvents() {
    var today = WP.todayStr();
    var admin = WP.isAdmin(me); // 管理員可看到並管理全站所有活動
    return WP.events().filter(function (ev) { return admin || ev.organizerId === me.id; })
      .sort(function (a, b) {
        var af = a.date >= today, bf = b.date >= today;
        if (af !== bf) return af ? -1 : 1;      // 未來的排前面
        if (a.date === b.date) return (a.start || '') < (b.start || '') ? -1 : 1;
        if (af) return a.date < b.date ? -1 : 1; // 未來：由近到遠
        return a.date > b.date ? -1 : 1;         // 過去：新→舊
      });
  }

  /* ---------- 渲染 ---------- */
  function renderStats() {
    var rows = myRegRows();
    function n(key) { return rows.filter(function (r) { return r.disp === key; }).length; }
    var stats = [
      [n('confirmed'), '已報名'],
      [n('waitlist'), '候補中'],
      [hostedEvents().length, WP.isAdmin(me) ? '全站活動' : '我建立的活動']
    ];
    statHost.innerHTML = stats.map(function (s) {
      return '<div class="stat-box"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>';
    }).join('');
  }

  function renderTabs() {
    var tabs = [['mine', '我的報名'], ['hosted', WP.isAdmin(me) ? '全站活動管理' : '我的活動']];
    tabHost.innerHTML = tabs.map(function (t) {
      return '<button class="chip' + (state.tab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    WP.$$('button', tabHost).forEach(function (b) {
      b.addEventListener('click', function () {
        state.tab = b.dataset.tab;
        render();
      });
    });
  }

  /* ---------- 我的報名 ---------- */
  function regItemHTML(row) {
    var reg = row.reg, ev = row.ev, disp = row.disp;
    var url = 'event.html?id=' + encodeURIComponent(ev.id);
    var pill = PILL[disp];
    var label = pill.label;
    if (disp === 'waitlist') label += '（第 ' + WP.waitPosition(reg.id) + ' 位）';

    var st = WP.statusOf(ev);
    // 與詳情頁一致：進行中／已結束／已取消的活動不可修改或取消報名
    var canAct = ['open', 'full', 'upcoming', 'closed'].indexOf(st) !== -1;
    // 重新報名需仍有正取或候補名額
    var canRereg = st === 'open' ||
      (st === 'full' && WP.counts(ev.id).waitlist < (ev.waitlistCap || 0));
    var acts = '';
    if ((disp === 'confirmed' || disp === 'waitlist') && canAct) {
      acts = '<button class="btn btn-light btn-sm" data-act="edit" data-id="' + WP.esc(reg.id) + '">修改資料</button>' +
        '<button class="btn btn-danger btn-sm" data-act="cancel" data-id="' + WP.esc(reg.id) + '">取消報名</button>';
    } else if (disp === 'cancelled' && canRereg) {
      acts = '<button class="btn btn-primary btn-sm" data-act="rereg" data-id="' + WP.esc(reg.id) + '">重新報名</button>';
    } else {
      acts = '<a class="btn btn-light btn-sm" href="' + url + '">查看活動</a>';
    }

    var dim = (disp === 'ended' || disp === 'cancelled' || disp === 'evcancelled') ? ' is-dim' : '';
    return '<article class="mreg-item' + dim + '">' +
      '<a class="thumb-wrap" href="' + url + '"><img class="thumb" src="' + WP.esc(WP.coverFor(ev)) + '" alt="" loading="lazy"></a>' +
      '<div class="mreg-main">' +
        '<h3><a href="' + url + '">' + WP.esc(ev.title) + '</a></h3>' +
        '<div class="mreg-meta">' +
          '<span>' + I.calendar + WP.esc(WP.fmtDateRange(ev)) + ' ' + WP.esc(WP.fmtTimeRange(ev)) + '</span>' +
          '<span>' + I.pin + WP.esc(ev.venue || ev.city || '地點未定') + '</span>' +
          '<span>' + I.ticket + '報名於 ' + WP.esc(WP.fmtDT(reg.createdAt)) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="mreg-side">' +
        '<span class="pill status r-pill ' + pill.cls + '"><i class="dot"></i>' + label + '</span>' +
        (acts ? '<div class="acts">' + acts + '</div>' : '') +
      '</div>' +
    '</article>';
  }

  function bindRegActs() {
    WP.$$('[data-act]', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var reg = WP.getReg(btn.dataset.id);
        if (!reg) return;
        var ev = WP.getEvent(reg.eventId);
        if (!ev) return;
        if (btn.dataset.act === 'edit') {
          WP.regModal(ev, reg, render);
        } else if (btn.dataset.act === 'cancel') {
          WP.confirm({
            title: '取消報名',
            body: '確定取消報名「' + ev.title + '」？取消後名額將釋出給候補。',
            danger: true, okText: '取消報名'
          }).then(function (yes) {
            if (!yes) return;
            WP.cancelReg(reg.id);
            WP.toast('已取消報名', 'success');
            render();
          });
        } else if (btn.dataset.act === 'rereg') {
          WP.regModal(ev, null, render);
        }
      });
    });
  }

  function renderMine() {
    var rows = myRegRows();
    if (!rows.length) {
      body.innerHTML =
        '<div class="empty"><div class="empty-ic">' + I.ticket + '</div>' +
        '<p>還沒有報名任何活動</p>' +
        '<a class="btn btn-primary" href="index.html">去逛逛</a></div>';
      return;
    }
    var filtered = state.sub === 'all'
      ? rows
      : rows.filter(function (r) {
          if (state.sub === 'cancelled') return r.disp === 'cancelled' || r.disp === 'evcancelled';
          return r.disp === state.sub;
        });

    var chips = SUBS.map(function (s) {
      return '<button class="chip' + (state.sub === s[0] ? ' active' : '') + '" data-sub="' + s[0] + '">' + s[1] + '</button>';
    }).join('');

    body.innerHTML =
      '<div class="center-toolbar">' +
        '<div class="sub-chips">' + chips + '</div>' +
        '<span class="toolbar-note">共 ' + filtered.length + ' 筆</span>' +
      '</div>' +
      (filtered.length
        ? '<div class="mreg-list">' + filtered.map(regItemHTML).join('') + '</div>'
        : '<div class="empty"><div class="empty-ic">' + I.search + '</div><p>這個狀態下沒有報名紀錄。</p></div>');

    WP.$$('.sub-chips .chip', body).forEach(function (b) {
      b.addEventListener('click', function () {
        state.sub = b.dataset.sub;
        render();
      });
    });
    bindRegActs();
  }

  /* ---------- 我的活動（主辦人視角） ---------- */
  function hostItemHTML(ev) {
    var url = 'event.html?id=' + encodeURIComponent(ev.id);
    var c = WP.counts(ev.id);
    var st = WP.statusOf(ev);
    var dim = (st === 'ended' || st === 'cancelled') ? ' is-dim' : '';
    return '<article class="mreg-item' + dim + '">' +
      '<a class="thumb-wrap" href="' + url + '"><img class="thumb" src="' + WP.esc(WP.coverFor(ev)) + '" alt="" loading="lazy"></a>' +
      '<div class="mreg-main">' +
        '<h3><a href="' + url + '">' + WP.esc(ev.title) + '</a></h3>' +
        '<div class="mreg-meta">' +
          '<span>' + I.calendar + WP.esc(WP.fmtDateRange(ev)) + ' ' + WP.esc(WP.fmtTimeRange(ev)) + '</span>' +
          '<span>' + I.pin + WP.esc(ev.venue || ev.city || '地點未定') + '</span>' +
          '<span>' + I.users + c.confirmed + ' / ' + ev.capacity + ' 人・候補 ' + c.waitlist + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="mreg-side">' +
        WP.statusPill(ev) +
        '<div class="acts">' +
          '<a class="btn btn-light btn-sm" href="' + url + '">管理</a>' +
          '<a class="btn btn-light btn-sm" href="create.html?id=' + encodeURIComponent(ev.id) + '">編輯</a>' +
          '<button class="btn btn-danger btn-sm" data-del="' + WP.esc(ev.id) + '">刪除</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderHosted() {
    var list = hostedEvents();
    var createBtn = '<a class="btn btn-primary" href="create.html">' + I.plus + '建立新活動</a>';
    if (!list.length) {
      body.innerHTML =
        '<div class="empty"><div class="empty-ic">' + I.spark + '</div>' +
        '<p>還沒有建立活動，來揪一團吧</p>' + createBtn + '</div>';
      return;
    }
    body.innerHTML =
      '<div class="center-toolbar">' +
        '<span class="toolbar-note">' + (WP.isAdmin(me)
          ? '管理員視角：全站共 ' + list.length + ' 場活動（含草稿與已取消）'
          : '你主辦了 ' + list.length + ' 場活動（含草稿與已取消）') + '</span>' +
        createBtn +
      '</div>' +
      '<div class="mreg-list">' + list.map(hostItemHTML).join('') + '</div>';

    WP.$$('[data-del]', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        WP.confirm({ title: '刪除活動', body: '確定刪除此活動？', danger: true, okText: '刪除' })
          .then(function (yes) {
            if (!yes) return;
            WP.deleteEvent(btn.dataset.del);
            WP.toast('活動已刪除', 'success');
            render();
          });
      });
    });
  }

  /* ---------- 主流程 ---------- */
  function syncURL() {
    var p = new URLSearchParams(location.search);
    if (state.tab === 'hosted') p.set('tab', 'hosted'); else p.delete('tab');
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  function render() {
    renderStats();
    renderTabs();
    if (state.tab === 'hosted') renderHosted(); else renderMine();
    syncURL();
  }

  render();
})();
