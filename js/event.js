/* 願望池 — 活動詳情頁 */
(function () {
  'use strict';
  WP.mountChrome('explore');

  var I = WP.icons;
  var evId = WP.qs('id');
  var page = WP.$('#ev-page');

  var rosterTab = 'confirmed';                 // 主辦人名單目前分頁
  var editingId = null;                        // 行內編輯中的留言 id
  var cmDraft = { name: '', text: '' };        // 留言草稿（重繪時保留）

  function isOwner(ev) {
    var me = WP.me();
    return !!(me && ev.organizerId === me.id);
  }
  // 主辦人本人或平台管理員（admin）皆可管理
  function canManage(ev) { return isOwner(ev) || WP.isAdmin(); }

  /* ---------- 找不到活動 ---------- */
  function renderNotFound() {
    document.title = '願望池・找不到活動';
    page.innerHTML =
      '<section class="container"><div class="empty ev-notfound">' +
      '<div class="empty-ic">' + I.search + '</div>' +
      '<p>找不到這場活動，可能已被主辦人移除，或連結有誤。</p>' +
      '<a class="btn btn-light" href="index.html">' + I.arrowL + '回探索活動</a>' +
      '</div></section>';
  }

  /* ---------- Hero ---------- */
  function heroHTML(ev) {
    var tags = (ev.tags || []).map(function (t) {
      return '<span class="tag">#' + WP.esc(t) + '</span>';
    }).join('');
    return '<section class="ev-hero">' +
      '<img src="' + WP.esc(WP.coverFor(ev)) + '" alt="">' +
      '<div class="ev-hero-in"><div class="container">' +
      '<div class="ev-badges">' +
      WP.statusPill(ev) +
      '<span class="pill pill-price">' + I.tag + WP.fmtFee(ev.fee) + '</span>' +
      (ev.category ? '<span class="pill pill-cat">' + WP.esc(ev.category) + '</span>' : '') +
      '</div>' +
      '<h1 class="ev-title">' + WP.esc(ev.title) + '</h1>' +
      (tags ? '<div class="tag-row">' + tags + '</div>' : '') +
      '</div></div></section>';
  }

  /* ---------- 資訊列 ---------- */
  /** 地圖連結：主辦人貼的優先；沒貼就用地點名稱組 Google 地圖搜尋 */
  function mapLinkOf(ev) {
    if (ev.mapUrl && /^https?:\/\//i.test(ev.mapUrl)) return ev.mapUrl;
    var q = [ev.venue, ev.city].filter(Boolean).join(' ');
    if (!q) return '';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }

  function infobarHTML(ev) {
    var org = WP.getUser(ev.organizerId);
    var place = ev.venue ? ev.venue + (ev.city ? '，' + ev.city : '') : (ev.city || '地點未定');
    var mapHref = mapLinkOf(ev);
    var placeVal = WP.esc(place) + (mapHref
      ? ' <a class="map-link" href="' + WP.esc(mapHref) + '" target="_blank" rel="noopener">' + I.pin + '地圖</a>'
      : '');
    function item(ic, lab, val) {
      return '<div class="info-item"><span class="info-ic">' + ic + '</span>' +
        '<div><div class="lab">' + lab + '</div><div class="val">' + val + '</div></div></div>';
    }
    return '<section class="infobar"><div class="container infobar-in">' +
      '<div class="info-item">' + WP.avatar(org, 'lg') +
      '<div><div class="lab">主辦人</div><div class="val">' + WP.esc(org ? org.name : '神秘主辦人') + '</div></div></div>' +
      item(I.calendar, '活動日期', WP.esc(WP.fmtDateRange(ev))) +
      item(I.clock, '活動時間', WP.esc(WP.fmtTimeRange(ev))) +
      item(I.pin, '活動地點', placeVal) +
      '</div></section>';
  }

  /* ---------- 活動介紹 ---------- */
  function introHTML(ev, c) {
    var items = [
      '報名時間：' + WP.esc(WP.fmtDT(ev.regStart)) + ' ～ ' + WP.esc(WP.fmtDT(ev.regEnd)),
      '名額：' + ev.capacity + ' 人（目前 ' + c.confirmed + ' 人報名）'
    ];
    if ((ev.waitlistCap || 0) > 0) {
      items.push('候補名額：' + ev.waitlistCap + ' 人');
      items.push('如有名額釋出，候補者將依序遞補');
    }
    items.push('如需取消請於活動開始前操作');
    if (ev.contact) items.push('聯絡資訊：' + WP.esc(ev.contact));
    return '<section class="band"><div class="container">' +
      '<h2 class="sec-title">活動介紹</h2>' +
      '<div class="rich-text">' + WP.esc(ev.desc || '主辦人還沒有填寫活動介紹。') + '</div>' +
      '<div class="notice-box"><h4>' + I.info + '報名須知</h4><ul>' +
      items.map(function (s) { return '<li>' + s + '</li>'; }).join('') +
      '</ul></div>' +
      '</div></section>';
  }

  /* ---------- 我的報名狀態 ---------- */
  function myRegHTML(ev, st) {
    var reg = WP.myRegFor(ev.id);
    if (!reg) return '';
    var canAct = ['open', 'full', 'upcoming', 'closed'].indexOf(st) !== -1;
    var acts = canAct
      ? '<span class="acts">' +
        '<button class="btn btn-light btn-sm" data-act="my-edit">' + I.edit + '修改報名資料</button>' +
        '<button class="btn btn-danger btn-sm" data-act="my-cancel">取消報名</button></span>'
      : '';
    if (reg.state === 'waitlist') {
      return '<div class="my-reg-box is-wait"><span class="st">' + I.clock +
        '候補中・目前順位 第 ' + WP.waitPosition(reg.id) + ' 位</span>' + acts + '</div>';
    }
    return '<div class="my-reg-box"><span class="st">' + I.check + '你已報名成功</span>' + acts + '</div>';
  }

  /* ---------- 報名資訊 ---------- */
  function regHTML(ev, c, st) {
    var pct = WP.percent(ev);
    var wlCap = ev.waitlistCap || 0;
    var myReg = WP.myRegFor(ev.id);
    var cta = '';
    var notes = [];

    function disabledBtn(txt) {
      return '<button class="btn btn-light btn-lg btn-block" disabled>' + txt + '</button>';
    }

    if (st === 'cancelled') {
      cta = '<div class="cancel-note">' + I.info +
        '<div><b>此活動已取消</b><p>造成不便請見諒，歡迎回探索頁看看其他活動。</p></div></div>';
    } else if (st === 'draft') {
      cta = disabledBtn('草稿尚未發布');
    } else if (isOwner(ev) && (st === 'open' || st === 'full')) {
      cta = disabledBtn('你是本活動的主辦人');
    } else if (myReg && (st === 'open' || st === 'full')) {
      cta = disabledBtn(myReg.state === 'waitlist' ? '你已在候補名單中' : '你已報名此活動');
    } else if (st === 'open') {
      cta = '<button class="btn btn-primary btn-lg btn-block" data-act="join">立即報名</button>';
    } else if (st === 'full' && c.waitlist < wlCap) {
      cta = '<button class="btn btn-primary btn-lg btn-block" data-act="join">加入候補</button>';
      notes.push(I.info + '<span>正取名額已滿，目前候補 <b class="wait-chip">' + c.waitlist +
        ' 人</b>（上限 ' + wlCap + ' 人），送出後將依序遞補</span>');
    } else if (st === 'full') {
      cta = disabledBtn('已額滿');
      notes.push(I.info + '<span>正取與候補名額皆已額滿，可以留言關注是否有名額釋出</span>');
    } else if (st === 'upcoming') {
      cta = disabledBtn('報名尚未開始');
      notes.push(I.clock + '<span>報名將於 <b>' + WP.esc(WP.fmtDT(ev.regStart)) + '</b> 開放，先把時間記下來</span>');
    } else if (st === 'closed') {
      cta = disabledBtn('報名已截止');
      notes.push(I.info + '<span>' + (ev.regClosed
        ? '主辦人已關閉報名'
        : '報名已於 ' + WP.esc(WP.fmtDT(ev.regEnd)) + ' 截止') + '</span>');
    } else if (st === 'ongoing') {
      cta = disabledBtn('活動進行中');
    } else if (st === 'ended') {
      cta = disabledBtn('活動已結束');
    }

    if (c.waitlist > 0 && st !== 'full') {
      notes.push(I.users + '<span><b class="wait-chip">候補 ' + c.waitlist + ' 人</b>・如有名額釋出將依序遞補</span>');
    }

    return '<section class="band alt"><div class="container">' +
      '<h2 class="sec-title">報名資訊</h2>' +
      '<p class="sec-sub">名額有限，出發前記得再確認一次時間與地點。</p>' +
      myRegHTML(ev, st) +
      '<div class="reg-card' + ((st === 'ended' || st === 'cancelled') ? ' is-past' : '') + '">' +
      '<div class="reg-top">' +
      '<div><div class="lab">報名進度</div><div class="reg-count">' + c.confirmed +
      '<small> / ' + ev.capacity + '</small></div></div>' +
      '<div class="reg-pct"><b>' + pct + '%</b><span>已報名比例</span></div>' +
      '</div>' +
      '<div class="bar"><i class="' + (pct >= 100 ? 'is-full' : '') + '" style="width:' + pct + '%"></i></div>' +
      cta +
      notes.map(function (n) { return '<div class="reg-note">' + n + '</div>'; }).join('') +
      '</div>' +
      attendeesHTML(ev) +
      (canManage(ev) ? ownerHTML(ev, c) : '') +
      '</div></section>';
  }

  /* ---------- 參加名單（所有人可見，僅顯示暱稱） ---------- */
  var ATT_BGS = ['#F2B8AC', '#F5D3A1', '#BCD9C0', '#B9CFE0', '#E4C6E0', '#F0E1A8', '#C9C4E4', '#F5C1CE', '#CFE0D8', '#EAD3BE'];
  function nameAvatar(name) {
    name = String(name || '?');
    var s = 0;
    for (var i = 0; i < name.length; i++) s += name.charCodeAt(i);
    return '<span class="avatar sm" style="background:' + ATT_BGS[s % ATT_BGS.length] + '">' +
      WP.esc(name.charAt(0).toUpperCase()) + '</span>';
  }
  /** 報名者頭像：有綁定帳號就用帳號的大頭照（含動物大頭照），否則用暱稱首字底色 */
  function regAvatar(r) {
    var u = r.userId ? WP.getUser(r.userId) : null;
    return u ? WP.avatar(u, 'sm') : nameAvatar(r.name);
  }

  function attendeesHTML(ev) {
    if (ev.draft) return '';
    var me = WP.me();
    var regs = WP.regsOf(ev.id);
    var confirmed = regs.filter(function (r) { return r.state === 'confirmed'; });
    var waits = regs.filter(function (r) { return r.state === 'waitlist'; });

    function chip(r, extra) {
      var isMe = !!(me && r.userId === me.id);
      var isOrg = r.userId === ev.organizerId;
      return '<span class="att-chip' + (isMe ? ' is-me' : '') + '">' + regAvatar(r) +
        '<span class="att-name">' + WP.esc(r.name) + '</span>' +
        (isOrg ? '<i class="att-org">主辦人</i>' : '') +
        (extra || '') + (isMe ? '<i class="att-me">你</i>' : '') + '</span>';
    }

    var body = confirmed.length
      ? '<div class="att-wrap">' + confirmed.map(function (r) { return chip(r); }).join('') + '</div>'
      : '<p class="att-empty">還沒有人報名，來當第一個吧！</p>';

    var waitBlock = waits.length
      ? '<div class="att-group"><div class="att-lab">' + I.clock + '候補名單<b>' + waits.length + ' 人</b></div>' +
        '<div class="att-wrap">' + waits.map(function (r, i) {
          return chip(r, '<i class="att-pos">第 ' + (i + 1) + ' 位</i>');
        }).join('') + '</div></div>'
      : '';

    return '<div class="att-card">' +
      '<div class="att-group"><div class="att-lab">' + I.users + '參加名單<b>' + confirmed.length + ' 人</b></div>' + body + '</div>' +
      waitBlock +
      '<p class="att-note">名單僅顯示暱稱；聯絡資料只有主辦人看得到。</p>' +
      '</div>';
  }

  /* ---------- 主辦人面板 ---------- */
  var TABS = [['confirmed', '正取'], ['waitlist', '候補'], ['cancelled', '已取消']];

  function ownerHTML(ev, c) {
    var st = WP.statusOf(ev);
    var acts = ['<a class="btn btn-light btn-sm" href="create.html?id=' + encodeURIComponent(ev.id) + '">' + I.edit + '編輯活動</a>'];
    if (!ev.cancelled && st !== 'ended') {
      acts.push('<button class="btn btn-light btn-sm" data-act="op-transfer">' + I.users + '轉移主辦權</button>');
    }
    if (!ev.cancelled && !ev.draft && st !== 'ended' && st !== 'ongoing') {
      acts.push(ev.regClosed
        ? '<button class="btn btn-light btn-sm" data-act="op-open">' + I.check + '重新開放報名</button>'
        : '<button class="btn btn-light btn-sm" data-act="op-close">' + I.x + '關閉報名</button>');
    }
    acts.push('<button class="btn btn-light btn-sm" data-act="op-csv">' + I.download + '匯出 CSV</button>');
    acts.push('<button class="btn btn-light btn-sm" data-act="op-xls">' + I.download + '匯出 Excel</button>');
    if (!ev.cancelled && st !== 'ended') {
      acts.push('<button class="btn btn-danger btn-sm" data-act="op-cancel">取消活動</button>');
    }
    acts.push('<button class="btn btn-danger btn-sm" data-act="op-del">' + I.trash + '刪除活動</button>');

    var tabs = TABS.map(function (t) {
      return '<button class="' + (rosterTab === t[0] ? 'active' : '') +
        '" data-act="tab" data-tab="' + t[0] + '">' + t[1] + '<b>(' + c[t[0]] + ')</b></button>';
    }).join('');

    return '<div class="owner-panel">' +
      '<div class="owner-head"><h3>' + I.users + (isOwner(ev) ? '主辦人管理' : '平台管理員') + '</h3>' +
      '<div class="owner-acts">' + acts.join('') + '</div></div>' +
      '<div class="tabs">' + tabs + '</div>' +
      '<div class="roster-wrap">' + rosterHTML(ev) + '</div>' +
      '</div>';
  }

  function rosterHTML(ev) {
    var isWait = rosterTab === 'waitlist';
    var st = WP.statusOf(ev);
    // 已結束／已取消的活動不再提供逐筆取消（避免無意義的遞補）
    var canCancel = rosterTab !== 'cancelled' && st !== 'ended' && st !== 'cancelled';
    var list = WP.regsOf(ev.id).filter(function (r) { return r.state === rosterTab; });
    var head = '<tr><th>#</th>' + (isWait ? '<th>順位</th>' : '') +
      '<th>暱稱或姓名</th><th>Email</th><th>電話</th><th>備註</th><th>報名時間</th>' +
      (canCancel ? '<th></th>' : '') + '</tr>';
    var cols = 6 + (isWait ? 1 : 0) + (canCancel ? 1 : 0);
    if (!list.length) {
      var emptyTxt = {
        confirmed: '還沒有人報名，把活動分享出去吧！',
        waitlist: '目前沒有人在候補。',
        cancelled: '目前沒有取消的報名。'
      }[rosterTab];
      return '<table class="roster">' + head +
        '<tr><td colspan="' + cols + '" class="muted">' + emptyTxt + '</td></tr></table>';
    }
    var rows = list.map(function (r, i) {
      function cell(v) { return v ? WP.esc(v) : '<span class="muted">—</span>'; }
      return '<tr><td class="muted">' + (i + 1) + '</td>' +
        (isWait ? '<td><b class="wait-chip">第 ' + WP.waitPosition(r.id) + ' 位</b></td>' : '') +
        '<td class="name">' + WP.esc(r.name) + '</td>' +
        '<td>' + cell(r.email) + '</td>' +
        '<td>' + cell(r.phone) + '</td>' +
        '<td>' + cell(r.note) + '</td>' +
        '<td class="muted">' + WP.esc(WP.fmtDT(r.createdAt)) + '</td>' +
        (canCancel ? '<td><button class="btn btn-danger btn-sm" data-act="cancel-reg" data-reg="' + WP.esc(r.id) + '">取消</button></td>' : '') +
        '</tr>';
    }).join('');
    return '<table class="roster">' + head + rows + '</table>';
  }

  /* ---------- 留言討論 ---------- */
  function commentItemHTML(cm, ev) {
    var user = cm.userId ? WP.getUser(cm.userId) : { name: cm.name };
    var isOrg = !!(cm.userId && cm.userId === ev.organizerId);
    var isAdm = !isOrg && !!(cm.userId && WP.isAdmin(user));
    var body;
    if (editingId === cm.id) {
      body = '<div class="cm-editing">' +
        '<textarea maxlength="500" data-edit-box>' + WP.esc(cm.text) + '</textarea>' +
        '<div class="cm-edit-acts">' +
        '<button class="btn btn-light btn-sm" data-act="cm-edit-cancel">取消</button>' +
        '<button class="btn btn-primary btn-sm" data-act="cm-edit-save" data-id="' + WP.esc(cm.id) + '">儲存</button>' +
        '</div></div>';
    } else {
      body = '<div class="comment-text">' + WP.esc(cm.text) + '</div>';
    }
    var acts = '';
    if (editingId !== cm.id) {
      if (WP.canEditComment(cm)) {
        acts += '<button data-act="cm-edit" data-id="' + WP.esc(cm.id) + '" title="編輯留言" aria-label="編輯留言">' + I.edit + '</button>';
      }
      if (WP.canDeleteComment(cm, ev)) {
        acts += '<button class="del" data-act="cm-del" data-id="' + WP.esc(cm.id) + '" title="刪除留言" aria-label="刪除留言">' + I.trash + '</button>';
      }
    }
    return '<div class="comment-item">' + WP.avatar(user) +
      '<div class="comment-main">' +
      '<div class="comment-head"><span class="who">' + WP.esc(cm.name || '路人') +
      (isOrg ? '<i class="is-org">主辦人</i>' : (isAdm ? '<i class="is-org is-adm">管理員</i>' : '')) + '</span>' +
      '<time>' + WP.esc(WP.fmtDT(cm.createdAt)) + (cm.editedAt ? '・已編輯' : '') + '</time></div>' +
      body + '</div>' +
      (acts ? '<div class="comment-acts">' + acts + '</div>' : '') +
      '</div>';
  }

  function commentsHTML(ev) {
    var me = WP.me();
    var list = WP.commentsOf(ev.id);
    var formTop = me
      ? '<div class="cm-as">' + WP.avatar(me, 'sm') + '<b>' + WP.esc(me.name) + '</b><span>以此身分留言</span></div>'
      : '<input id="cm-name" maxlength="20" placeholder="你的暱稱" autocomplete="off" value="' + WP.esc(cmDraft.name) + '">';
    var form = '<div class="comment-form">' + formTop +
      '<textarea id="cm-text" maxlength="500" placeholder="寫下你的想法或問題...">' + WP.esc(cmDraft.text) + '</textarea>' +
      '<div class="comment-foot"><span class="char-count" id="cm-count">0/500</span>' +
      '<button class="btn btn-primary" data-act="cm-send" id="cm-send" disabled>送出留言</button></div></div>';
    var body = list.length
      ? '<div class="comment-list">' + list.map(function (cm) { return commentItemHTML(cm, ev); }).join('') + '</div>'
      : '<div class="empty"><div class="empty-ic">' + I.chat + '</div><p>目前沒有留言，來當第一個發言的人吧！</p></div>';
    return '<section class="band"><div class="container">' +
      '<h2 class="sec-title">留言討論</h2>' +
      '<p class="sec-sub">' + list.length + ' 則留言</p>' +
      form + body +
      '</div></section>';
  }

  /* ---------- 全頁重繪 ---------- */
  function render() {
    var ev = WP.getEvent(evId);
    if (!ev || (ev.draft && !canManage(ev))) { renderNotFound(); return; }
    document.title = '願望池・' + ev.title;
    var c = WP.counts(ev.id);
    var st = WP.statusOf(ev);

    var draftBar = (ev.draft && canManage(ev))
      ? '<div class="draft-bar"><div class="container in">' + I.info +
        '<span>這是尚未發布的草稿，只有你看得到。</span>' +
        '<a class="btn btn-primary btn-sm" href="create.html?id=' + encodeURIComponent(ev.id) + '">繼續編輯</a>' +
        '</div></div>'
      : '';

    page.innerHTML = draftBar + heroHTML(ev) + infobarHTML(ev) +
      introHTML(ev, c) + regHTML(ev, c, st) + commentsHTML(ev);

    bindCommentForm();
  }

  function bindCommentForm() {
    var text = WP.$('#cm-text', page);
    if (!text) return;
    var name = WP.$('#cm-name', page);
    var send = WP.$('#cm-send', page);
    var count = WP.$('#cm-count', page);
    function sync() {
      cmDraft.text = text.value;
      count.textContent = text.value.length + '/500';
      send.disabled = !text.value.trim();
    }
    text.addEventListener('input', sync);
    if (name) name.addEventListener('input', function () { cmDraft.name = name.value; });
    sync();
  }

  /* ---------- 事件（委派） ---------- */
  page.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!btn || !page.contains(btn)) return;
    var act = btn.getAttribute('data-act');
    var ev = WP.getEvent(evId);
    if (!ev) return;

    if (act === 'join') {
      WP.regModal(ev, null, function () { render(); });

    } else if (act === 'my-edit') {
      var reg = WP.myRegFor(ev.id);
      if (reg) WP.regModal(ev, reg, function () { render(); });

    } else if (act === 'my-cancel') {
      var myReg = WP.myRegFor(ev.id);
      if (!myReg) return;
      WP.confirm({
        title: '取消報名',
        body: '取消後名額將立即釋出，若有候補者將自動依序遞補。確定要取消這次報名嗎？',
        danger: true, okText: '取消報名'
      }).then(function (yes) {
        if (!yes) return;
        var r = WP.cancelReg(myReg.id);
        if (r && r.ok) {
          WP.toast('已為你取消報名');
          if (r.promoted) WP.toast('候補的「' + r.promoted.name + '」已自動遞補為正取', 'success');
        }
        render();
      });

    } else if (act === 'op-close') {
      WP.setRegClosed(ev.id, true);
      WP.toast('已關閉報名');
      render();

    } else if (act === 'op-open') {
      WP.setRegClosed(ev.id, false);
      WP.toast('已重新開放報名', 'success');
      render();

    } else if (act === 'op-transfer') {
      var tm = WP.modal({
        title: '轉移主辦權',
        body: '<p class="modal-sub">輸入新主辦人的暱稱。轉移後對方將取得這場活動的完整管理權限；' +
          '你會保留原本的參加名額，但無法再管理這場活動。</p>' +
          '<form id="tf-form" novalidate>' +
          '<div class="field"><label>新主辦人暱稱 <b class="req">*</b></label>' +
          '<input name="name" maxlength="20" autocomplete="off" required></div>' +
          '<div class="modal-actions"><button class="btn btn-primary" type="submit">確認轉移</button></div>' +
          '</form>'
      });
      var tf = WP.$('#tf-form', tm.el);
      tf.name.focus();
      tf.addEventListener('submit', function (e2) {
        e2.preventDefault();
        var r = WP.transferEvent(ev.id, tf.name.value);
        if (!r.ok) { WP.toast(r.msg, 'warn'); tf.name.focus(); return; }
        tm.close();
        WP.toast('已將主辦權轉移給「' + r.user.name + '」' + (r.existed ? '' : '（新使用者）'), 'success');
        render();
      });

    } else if (act === 'op-cancel') {
      WP.confirm({
        title: '取消活動',
        body: '取消後將通知所有已報名者，且無法復原。確定取消「' + ev.title + '」？',
        danger: true, okText: '取消活動'
      }).then(function (yes) {
        if (!yes) return;
        WP.cancelEvent(ev.id);
        WP.toast('活動已取消，系統將通知所有已報名者', 'warn');
        render();
      });

    } else if (act === 'op-del') {
      WP.confirm({ title: '刪除活動', body: '確定刪除此活動？', danger: true, okText: '刪除' })
        .then(function (yes) {
          if (!yes) return;
          WP.deleteEvent(ev.id);
          location.href = 'index.html';
        });

    } else if (act === 'op-csv') {
      WP.exportCSV(ev);
      WP.toast('已下載 CSV 名單', 'success');

    } else if (act === 'op-xls') {
      WP.exportExcel(ev);
      WP.toast('已下載 Excel 名單', 'success');

    } else if (act === 'tab') {
      rosterTab = btn.getAttribute('data-tab');
      render();

    } else if (act === 'cancel-reg') {
      var rid = btn.getAttribute('data-reg');
      WP.confirm({
        title: '取消這筆報名',
        body: '取消後名額將釋出，若有候補者將自動依序遞補。確定取消這筆報名？',
        danger: true, okText: '取消報名'
      }).then(function (yes) {
        if (!yes) return;
        var r = WP.cancelReg(rid);
        if (r && r.ok) {
          WP.toast('已取消該筆報名');
          if (r.promoted) WP.toast('候補的「' + r.promoted.name + '」已自動遞補為正取', 'success');
        }
        render();
      });

    } else if (act === 'cm-send') {
      var textEl = WP.$('#cm-text', page);
      var nameEl = WP.$('#cm-name', page);
      var me = WP.me();
      var text = textEl.value.trim();
      if (!text) return;
      var name = me ? me.name : (nameEl ? nameEl.value.trim() : '');
      if (!me && !name) {
        WP.toast('留個暱稱，大家才知道你是誰', 'warn');
        if (nameEl) nameEl.focus();
        return;
      }
      WP.addComment(ev.id, name, text);
      cmDraft = { name: '', text: '' };
      WP.toast('留言已送出', 'success');
      render();

    } else if (act === 'cm-edit') {
      editingId = btn.getAttribute('data-id');
      render();
      var box = WP.$('[data-edit-box]', page);
      if (box) box.focus();

    } else if (act === 'cm-edit-cancel') {
      editingId = null;
      render();

    } else if (act === 'cm-edit-save') {
      var cid = btn.getAttribute('data-id');
      var boxEl = WP.$('[data-edit-box]', page);
      var newText = boxEl ? boxEl.value.trim() : '';
      if (!newText) {
        WP.toast('留言內容不能是空白', 'warn');
        if (boxEl) boxEl.focus();
        return;
      }
      WP.editComment(cid, newText);
      editingId = null;
      WP.toast('留言已更新', 'success');
      render();

    } else if (act === 'cm-del') {
      var did = btn.getAttribute('data-id');
      WP.confirm({ title: '刪除留言', body: '刪除後就找不回來了，確定刪除這則留言？', danger: true, okText: '刪除' })
        .then(function (yes) {
          if (!yes) return;
          WP.deleteComment(did);
          WP.toast('留言已刪除');
          render();
        });
    }
  });

  render();
})();
