/* 願望池 — 首頁（探索活動） */
(function () {
  'use strict';
  WP.mountChrome('explore');

  var I = WP.icons;
  WP.$('#s-kw-wrap .s-ic').outerHTML = I.search;
  WP.$('.s-when .s-cal').outerHTML = I.calendar;

  // 手機版採「方案 C：內容優先」——搜尋收合成頁首圖示、隱藏月份列、狀態改三段式；桌機不受影響
  function isMobile() { return window.matchMedia('(max-width: 720px)').matches; }
  function closeSearchPanel() { var sz = WP.$('#search'); if (sz) sz.classList.remove('open'); }

  var state = {
    q: WP.qs('q') || '',
    when: WP.qs('when') || '',
    date: WP.qs('date') || '',
    filter: WP.qs('filter') || 'open',
    monthPinned: WP.qs('month') || null // 使用者選定的月份（'all' 或 'YYYY-MM'）；null＝自動選最近有活動的月份
  };

  var FILTERS = [
    ['all', '全部活動'],
    ['open', '報名中'],
    ['soon', '即將舉行'],
    ['full', '已額滿'],
    ['ended', '已結束']
  ];
  // 舊網址若帶已移除的 filter（例如 upcoming），回退到「報名中」，避免無對應晶片卻仍在篩選
  if (!FILTERS.some(function (f) { return f[0] === state.filter; })) state.filter = 'open';

  /** 月份標籤：同一年只顯示「7 月」，跨年才加年份 */
  function monthLabel(ym) {
    var p = ym.split('-');
    return p[0] === String(new Date().getFullYear()) ? (parseInt(p[1], 10) + ' 月') : (p[0] + ' 年 ' + parseInt(p[1], 10) + ' 月');
  }

  var kwInput = WP.$('#s-kw');
  var whenSel = WP.$('#s-when');
  var dateInput = WP.$('#s-date');
  kwInput.value = state.q;
  whenSel.value = state.when === 'date' ? 'pick' : state.when;
  if (state.when === 'date') { dateInput.hidden = false; dateInput.value = state.date; }

  /* ---------- 熱門標籤 ---------- */
  function renderHotTags() {
    var freq = {};
    WP.events().forEach(function (ev) {
      if (ev.draft || ev.cancelled) return;
      (ev.tags || []).forEach(function (t) { freq[t] = (freq[t] || 0) + 1; });
    });
    var top = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 6);
    WP.$('#hot-tags').innerHTML = '<span>熱門：</span>' + top.map(function (t) {
      return '<button data-tag="' + WP.esc(t) + '">#' + WP.esc(t) + '</button>';
    }).join('');
    WP.$$('#hot-tags button').forEach(function (b) {
      b.addEventListener('click', function () {
        kwInput.value = b.dataset.tag;
        state.q = b.dataset.tag;
        render();
        if (isMobile()) closeSearchPanel(); // 選了標籤就收起搜尋面板，露出結果
      });
    });
  }

  /* ---------- 篩選邏輯 ---------- */
  function matchWhen(ev) {
    if (!state.when) return true;
    var today = WP.todayStr();
    var last = WP.lastDay(ev); // 連續多天活動：以整個區間比對
    if (state.when === 'today') return ev.date <= today && last >= today;
    if (state.when === 'date') return !state.date || (ev.date <= state.date && last >= state.date);
    var days = state.when === '7d' ? 7 : 30;
    var lim = new Date(); lim.setDate(lim.getDate() + days);
    var limitStr = lim.getFullYear() + '-' + ('0' + (lim.getMonth() + 1)).slice(-2) + '-' + ('0' + lim.getDate()).slice(-2);
    return last >= today && ev.date <= limitStr; // 活動區間與 [今天, 上限] 有重疊
  }
  function matchQ(ev) {
    if (!state.q) return true;
    var q = state.q.toLowerCase().replace(/^#/, '');
    var org = WP.getUser(ev.organizerId);
    var hay = [ev.title, ev.venue, ev.city, ev.category, org && org.name].concat(ev.tags || [])
      .filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  }
  /** 「即將舉行」：開始日落在今天～7 天內，且活動尚未開始（不含已在進行中的多天活動） */
  function startsSoon(ev) {
    var today = WP.todayStr();
    if (!ev.date || ev.date < today) return false; // 開始日在過去（含已進行中的多天活動）→ 排除
    var lim = new Date(); lim.setDate(lim.getDate() + 7);
    var limStr = lim.getFullYear() + '-' + ('0' + (lim.getMonth() + 1)).slice(-2) + '-' + ('0' + lim.getDate()).slice(-2);
    if (ev.date > limStr) return false; // 超過未來 7 天 → 排除
    return WP.dt(ev.date, ev.start || '00:00') > new Date(); // 今天但開始時間已過的排除（尚未開始才算）
  }
  function matchFilter(ev, st) {
    if (state.filter === 'all') return st !== 'cancelled';
    if (state.filter === 'soon') return st !== 'cancelled' && startsSoon(ev);
    if (state.filter === 'ended') return st === 'ended';
    if (state.filter === 'open') return st === 'open';
    return st === state.filter;
  }

  // 除了「月份」以外的所有條件（供月份清單與結果共用）
  function passesBase(ev) {
    if (ev.draft) return false;
    var st = WP.statusOf(ev);
    return matchFilter(ev, st) && matchWhen(ev) && matchQ(ev);
  }
  function matchMonth(ev, month) {
    return month === 'all' || (ev.date || '').slice(0, 7) === month;
  }
  /** 從活動清單取出有活動的月份（YYYY-MM），由早到晚 */
  function monthsOf(list) {
    var set = {};
    list.forEach(function (ev) { var m = (ev.date || '').slice(0, 7); if (m) set[m] = 1; });
    return Object.keys(set).sort();
  }
  /** 最近有活動的月份：今天所在月起算第一個有活動的月份；全部都過去了則取最近的過去月份 */
  function nearestMonth(months) {
    if (!months.length) return 'all';
    var cur = WP.todayStr().slice(0, 7);
    for (var i = 0; i < months.length; i++) if (months[i] >= cur) return months[i];
    return months[months.length - 1];
  }

  /* ---------- 渲染 ---------- */
  function renderChips() {
    WP.$('#status-chips').innerHTML = FILTERS.map(function (f) {
      return '<button class="chip' + (state.filter === f[0] ? ' active' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>';
    }).join('');
    WP.$$('#status-chips .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        state.filter = b.dataset.f;
        render();
      });
    });
  }

  function renderMonthChips(months, active) {
    var chips = [['all', '全部月份']].concat(months.map(function (m) { return [m, monthLabel(m)]; }));
    WP.$('#month-chips').innerHTML = chips.map(function (c) {
      return '<button class="chip' + (active === c[0] ? ' active' : '') + '" data-m="' + c[0] + '">' + c[1] + '</button>';
    }).join('');
    WP.$$('#month-chips .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        state.monthPinned = b.dataset.m;
        render();
      });
    });
  }

  function render() {
    renderChips();
    var base = WP.events().filter(passesBase);
    var months = monthsOf(base);
    // 釘選的月份若已無活動（例如切換了狀態），取消釘選、改回自動
    if (state.monthPinned && state.monthPinned !== 'all' && months.indexOf(state.monthPinned) === -1) state.monthPinned = null;
    // 未釘選就自動選最近有活動的月份；手機版（方案 C）改顯示全部月份，靠日期分組往下滑
    var curMonth = state.monthPinned != null ? state.monthPinned : (isMobile() ? 'all' : nearestMonth(months));
    renderMonthChips(months, curMonth);
    syncURL();

    var list = base.filter(function (ev) { return matchMonth(ev, curMonth); });
    var today = WP.todayStr();

    // 依開始日期分組；未來由近到遠，已過期放最後（新→舊）
    var groups = {};
    list.forEach(function (ev) { (groups[ev.date] = groups[ev.date] || []).push(ev); });
    var dates = Object.keys(groups).sort();
    // 連續多天活動要等結束日過了才算「已結束」；整組活動都結束才歸到過去區
    function groupEnded(d) {
      return groups[d].every(function (ev) { return WP.lastDay(ev) < today; });
    }
    var future = dates.filter(function (d) { return !groupEnded(d); });
    var past = dates.filter(groupEnded).reverse();
    var ordered = future.concat(past);

    WP.$('#result-count').textContent = '共 ' + list.length + ' 場活動';

    if (!list.length) {
      WP.$('#event-groups').innerHTML =
        '<div class="empty"><div class="empty-ic">' + I.search + '</div>' +
        '<p>找不到符合條件的活動，換個關鍵字或條件試試。</p>' +
        '<button class="btn btn-light" id="clear-f">清除所有條件</button></div>';
      WP.$('#clear-f').addEventListener('click', function () {
        state = { q: '', when: '', date: '', filter: 'open', monthPinned: null };
        kwInput.value = ''; whenSel.value = ''; dateInput.hidden = true; dateInput.value = '';
        render();
      });
      return;
    }

    var firstPast = past.length ? past[0] : null;
    WP.$('#event-groups').innerHTML = ordered.map(function (d) {
      var evs = groups[d].sort(function (a, b) { return (a.start || '') < (b.start || '') ? -1 : 1; });
      var wl = WP.weekdayLabel(d);
      return (d === firstPast ? '<div class="past-divider">已結束的活動</div>' : '') +
        '<section class="date-group">' +
        '<div class="date-head">' +
        '<h2>' + WP.fmtMD(d) + '<span class="' + (wl === '今天' ? 'is-today' : '') + '">' + wl + '</span></h2>' +
        '<span class="count">' + evs.length + ' 場活動</span></div>' +
        '<div class="egrid">' + evs.map(function (ev) { return WP.eventCard(ev); }).join('') + '</div>' +
        '</section>';
    }).join('');
  }

  function syncURL() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.when) p.set('when', state.when);
    if (state.when === 'date' && state.date) p.set('date', state.date);
    if (state.filter !== 'open') p.set('filter', state.filter);
    if (state.monthPinned != null) p.set('month', state.monthPinned);
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  /* ---------- 事件 ---------- */
  var debounce;
  kwInput.addEventListener('input', function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      state.q = kwInput.value.trim();
      render();
    }, 200);
  });
  WP.$('#s-go').addEventListener('click', function () {
    state.q = kwInput.value.trim();
    render();
    if (isMobile()) closeSearchPanel();
  });
  kwInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { state.q = kwInput.value.trim(); render(); if (isMobile()) { kwInput.blur(); closeSearchPanel(); } }
  });
  whenSel.addEventListener('change', function () {
    if (whenSel.value === 'pick') {
      dateInput.hidden = false;
      state.when = 'date';
      if (dateInput.value) state.date = dateInput.value;
      dateInput.focus();
      if (dateInput.showPicker) try { dateInput.showPicker(); } catch (e) {}
    } else {
      dateInput.hidden = true;
      dateInput.value = '';
      state.when = whenSel.value;
      state.date = '';
    }
    render();
  });
  dateInput.addEventListener('change', function () {
    state.date = dateInput.value;
    render();
  });

  // 頁首放大鏡：手機版點擊展開／收合搜尋面板（桌機維持原本捲動到搜尋區的行為）
  // 用事件委派綁在 document，頁首重繪後仍有效
  document.addEventListener('click', function (e) {
    var ic = e.target.closest('.icon-btn');
    if (!ic || !isMobile()) return;
    e.preventDefault();
    var sz = WP.$('#search');
    if (!sz) return;
    var willOpen = !sz.classList.contains('open');
    sz.classList.toggle('open', willOpen);
    if (willOpen) { window.scrollTo({ top: 0, behavior: 'smooth' }); kwInput.focus(); }
  });

  renderHotTags();
  render();

  // 手機版若網址帶有搜尋關鍵字，一進來就展開搜尋面板讓使用者看得到
  if (isMobile() && state.q) { var sz0 = WP.$('#search'); if (sz0) sz0.classList.add('open'); }
})();
