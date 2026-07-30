/* 願望池 — 建立／編輯活動 */
(function () {
  'use strict';
  WP.mountChrome('create');

  var I = WP.icons;
  WP.$('#back-btn').innerHTML = I.arrowL;

  function goBack() {
    if (history.length > 1) history.back();
    else location.href = 'index.html';
  }
  WP.$('#back-btn').addEventListener('click', goBack);

  function showEmpty(icon, text, actions) {
    WP.$('#form-wrap').innerHTML =
      '<div class="empty"><div class="empty-ic">' + icon + '</div>' +
      '<p>' + text + '</p>' + (actions || '') + '</div>';
  }

  /* ---------- 編輯模式判斷 ---------- */
  var editId = WP.qs('id');
  var editing = null;

  if (editId) {
    editing = WP.getEvent(editId);
    document.title = '願望池・編輯活動';
    WP.$('#page-title').textContent = '編輯活動';

    if (!editing) {
      WP.$('#page-sub').textContent = '找不到你要編輯的活動。';
      showEmpty(I.search, '找不到這場活動，可能已被刪除。',
        '<a class="btn btn-light" href="index.html">回探索活動</a>');
      return;
    }
    var me = WP.me();
    if (!me) {
      WP.$('#page-sub').textContent = '登入後才能編輯自己主辦的活動。';
      showEmpty(I.info, '請先登入，才能編輯這場活動。',
        '<button class="btn btn-primary" id="login-go" type="button">登入</button>');
      WP.$('#login-go').addEventListener('click', function () {
        WP.askLogin(function () { location.reload(); }, '登入後即可繼續編輯活動。');
      });
      return;
    }
    if (me.id !== editing.organizerId && !WP.isAdmin(me)) {
      WP.$('#page-sub').textContent = '只有活動主辦人或平台管理員可以編輯這場活動。';
      showEmpty(I.info, '你沒有編輯這場活動的權限。',
        '<a class="btn btn-light" href="event.html?id=' + encodeURIComponent(editing.id) + '">查看活動頁</a>');
      return;
    }
    WP.$('#page-sub').textContent = '修改後儲存即可生效；時間或地點變更時，系統會自動通知所有已報名者。';
  }

  /* ---------- 表單元素 ---------- */
  var f = WP.$('#ev-form');
  var el = f.elements;
  var draftBtn = WP.$('#draft-btn');
  var publishBtn = WP.$('#publish-btn');

  WP.$('#ic-basic').innerHTML = I.info;
  WP.$('#ic-time').innerHTML = I.clock;
  WP.$('#ic-place').innerHTML = I.pin;
  WP.$('#ic-reg').innerHTML = I.users;
  WP.$('#ic-desc').innerHTML = I.text;

  WP.$('#cancel-btn').addEventListener('click', goBack);

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function nowLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  /** datetime-local 字串 → Date（沿用 WP.dt，避免被當成 UTC） */
  function parseDTL(v) {
    var p = (v || '').split('T');
    return WP.dt(p[0], p[1] || '00:00');
  }
  /** Date → datetime-local 字串（本地時間，YYYY-MM-DDTHH:MM） */
  function fmtDTL(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  /** "HH:MM" 加上整數小時（跨午夜取模，僅回傳時分） */
  function addHours(hm, delta) {
    var p = (hm || '').split(':');
    if (p.length < 2) return '';
    var h = (parseInt(p[0], 10) + delta) % 24;
    if (h < 0) h += 24;
    return pad2(h) + ':' + pad2(parseInt(p[1], 10) || 0);
  }

  /**
   * 時間選單：時（整點）＋ 分 兩個 select，值同步到隱藏 input。
   * 先選整點即成立（分預設 00），要調分鐘再改分的 select（或用鍵盤）。
   */
  function makeTimePicker(name, onUserChange) {
    var wrap = WP.$('.time-select[data-time="' + name + '"]');
    var hSel = WP.$('.tp-h', wrap);
    var mSel = WP.$('.tp-m', wrap);
    var hidden = el[name];
    var ph = document.createElement('option');
    ph.value = ''; ph.textContent = '時';
    hSel.appendChild(ph);
    for (var h = 0; h < 24; h++) {
      var oh = document.createElement('option');
      oh.value = pad2(h); oh.textContent = pad2(h);
      hSel.appendChild(oh);
    }
    for (var m = 0; m < 60; m += 5) {
      var om = document.createElement('option');
      om.value = pad2(m); om.textContent = pad2(m);
      mSel.appendChild(om);
    }
    mSel.value = '00';
    function syncHidden() { hidden.value = hSel.value ? (hSel.value + ':' + mSel.value) : ''; }
    function onChange() { syncHidden(); if (onUserChange) onUserChange(); }
    hSel.addEventListener('change', onChange);
    mSel.addEventListener('change', onChange);
    return {
      get: function () { return hidden.value; },
      set: function (v) {
        v = (v || '');
        if (v) {
          var p = v.split(':');
          hSel.value = pad2(parseInt(p[0], 10) || 0);
          var mv = pad2(parseInt(p[1], 10) || 0);
          // 儲存的分鐘不在每 5 分鐘的清單時，臨時補上該選項
          var has = Array.prototype.some.call(mSel.options, function (o) { return o.value === mv; });
          if (!has) { var ex = document.createElement('option'); ex.value = mv; ex.textContent = mv; mSel.appendChild(ex); }
          mSel.value = mv;
        } else { hSel.value = ''; mSel.value = '00'; }
        syncHidden();
      }
    };
  }

  /* ---------- 時間連動 ---------- */
  // 使用者是否手動改過結束時間／報名截止時間；未動過才自動帶入
  var endTouched = false, regEndTouched = false;

  // 開始時間變更 → 未改過的結束時間帶入「開始＋1 小時」、報名截止帶入「開始－1 小時」
  function onStartChange() {
    var s = startPicker.get();
    if (s && !endTouched) endPicker.set(addHours(s, 1));
    syncRegEnd();
  }
  // 報名截止 = 活動開始（日期＋時間）－1 小時；需同時有日期與開始時間
  function syncRegEnd() {
    if (regEndTouched) return;
    var d = el.date.value, s = startPicker.get();
    if (!d || !s) return;
    el.regEnd.value = fmtDTL(new Date(WP.dt(d, s).getTime() - 3600000));
  }

  var startPicker = makeTimePicker('start', onStartChange);
  var endPicker = makeTimePicker('end', function () { endTouched = true; });
  el.regEnd.addEventListener('input', function () { regEndTouched = true; });
  el.date.addEventListener('change', syncRegEnd);

  /* ---------- 預填 ---------- */
  if (editing) {
    el.title.value = editing.title || '';
    el.category.value = editing.category || '';
    el.tags.value = (editing.tags || []).join(', ');
    el.cover.value = editing.cover || '';
    el.date.value = editing.date || '';
    el.dateEnd.value = editing.dateEnd || '';
    startPicker.set(editing.start || '');
    endPicker.set(editing.end || '');
    endTouched = !!editing.end;          // 已有結束時間就別自動覆寫
    regEndTouched = true;                // 沿用原本存的報名截止時間
    el.regStart.value = (editing.regStart || '').slice(0, 16);
    el.regEnd.value = (editing.regEnd || '').slice(0, 16);
    el.city.value = editing.city || '';
    el.venue.value = editing.venue || '';
    el.mapUrl.value = editing.mapUrl || '';
    el.capacity.value = editing.capacity || '';
    el.waitlistCap.value = editing.waitlistCap > 0 ? editing.waitlistCap : '';
    el.fee.value = editing.fee > 0 ? editing.fee : '';
    el.contact.value = editing.contact || '';
    el.desc.value = editing.desc || '';
    if (!editing.draft) {
      // 已發布的活動：主按鈕改為儲存變更，不再提供草稿
      publishBtn.textContent = '儲存變更';
      draftBtn.style.display = 'none';
    }
  } else {
    el.regStart.value = nowLocal();
  }

  /* ---------- 字數統計 ---------- */
  var countEl = WP.$('#desc-count');
  function syncCount() { countEl.textContent = el.desc.value.length + '/2000'; }
  el.desc.addEventListener('input', syncCount);
  syncCount();

  /* ---------- 驗證 ---------- */
  function setErr(name, msg) {
    var field = el[name].closest('.field');
    field.classList.add('invalid');
    var e = WP.$('.err', field);
    if (e) e.textContent = msg;
  }
  function clearErrs() {
    WP.$$('.field.invalid', f).forEach(function (x) { x.classList.remove('invalid'); });
  }
  function focusFirstErr() {
    var first = WP.$('.field.invalid', f);
    if (!first) return;
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var input = WP.$('input, select, textarea', first);
    if (input) try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
  }
  // 重新輸入時解除欄位的錯誤狀態
  ['input', 'change'].forEach(function (evt) {
    f.addEventListener(evt, function (e) {
      var field = e.target.closest('.field');
      if (field) field.classList.remove('invalid');
    });
  });

  function collect() {
    return {
      title: el.title.value.trim(),
      category: el.category.value,
      tags: el.tags.value.split(/[,，、]/).map(function (t) { return t.trim(); }).filter(Boolean),
      cover: el.cover.value.trim(),
      date: el.date.value,
      dateEnd: el.dateEnd.value,
      start: el.start.value,
      end: el.end.value,
      regStart: el.regStart.value,
      regEnd: el.regEnd.value,
      city: el.city.value.trim(),
      venue: el.venue.value.trim(),
      mapUrl: el.mapUrl.value.trim(),
      capacity: Math.max(0, parseInt(el.capacity.value, 10) || 0),
      waitlistCap: Math.max(0, parseInt(el.waitlistCap.value, 10) || 0),
      fee: Math.max(0, Number(el.fee.value) || 0),
      contact: el.contact.value.trim(),
      desc: el.desc.value.trim()
    };
  }

  /** 發布需完整驗證；儲存草稿只要求活動名稱 */
  function validate(data, asDraft) {
    var ok = true;
    function bad(name, msg) { setErr(name, msg); ok = false; }

    if (!data.title) bad('title', '請填寫活動名稱');
    if (asDraft) return ok;

    if (!data.category) bad('category', '請選擇活動類別');
    if (!data.date) bad('date', '請選擇開始日期');
    if (data.dateEnd && data.date && data.dateEnd < data.date) bad('dateEnd', '結束日期不能早於開始日期');
    // 開始／結束時間與地點依規格為選填；只在都有填時檢查先後關係
    if (data.start && data.end && data.end <= data.start) bad('end', '結束時間必須晚於開始時間');
    if (!data.regStart) bad('regStart', '請選擇報名開始時間');
    if (!data.regEnd) bad('regEnd', '請選擇報名截止時間');
    else if (data.regStart && parseDTL(data.regStart) >= parseDTL(data.regEnd)) {
      bad('regEnd', '報名截止時間必須晚於報名開始時間');
    } else if (data.date && parseDTL(data.regEnd) > WP.dt(data.date, data.start || '23:59')) {
      bad('regEnd', '報名截止時間不能晚於活動開始時間');
    }
    if (data.mapUrl && !/^https?:\/\//i.test(data.mapUrl)) {
      bad('mapUrl', '請貼上 https:// 開頭的完整網址');
    }
    if (!(data.capacity >= 1)) bad('capacity', '請填寫報名人數上限（至少 1 人）');
    if (!data.desc) bad('desc', '請填寫活動內容說明');
    return ok;
  }

  /* ---------- 送出 ---------- */
  function submit(asDraft) {
    clearErrs();
    var data = collect();
    if (!validate(data, asDraft)) { focusFirstErr(); return; }

    WP.requireLogin(function (me) {
      data.draft = !!asDraft;
      if (editing) {
        data.id = editing.id; // organizerId 沿用原值，不隨表單覆寫
      } else {
        data.organizerId = me.id;
      }
      var ev = WP.saveEvent(data);
      if (asDraft) {
        WP.toast('草稿已儲存，可到「我的活動」繼續編輯', 'success');
        setTimeout(function () { location.href = 'my.html'; }, 700);
      } else {
        WP.toast(editing && !editing.draft ? '變更已儲存' : '活動發布成功！', 'success');
        setTimeout(function () { location.href = 'event.html?id=' + encodeURIComponent(ev.id); }, 700);
      }
    }, editing ? '要先登入才能編輯活動，輸入暱稱即可開始。' : '要先登入才能建立活動，輸入暱稱即可開始。');
  }

  f.addEventListener('submit', function (e) { e.preventDefault(); submit(false); });
  draftBtn.addEventListener('click', function () { submit(true); });
})();
