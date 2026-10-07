/* 진로 실험실 ↔ 경일 진로·탐구 성장 시스템 연결 v1.0
 * 공통 메뉴를 붙이고, STEP 1·2의 질문과 설계를 공통 탐구노트(KNotes)와 주고받습니다.
 * 기존 화면 코드(app.js, keyword.js, inquiry.js …)는 고치지 않고 이 파일에서만 연결합니다.
 */
(function () {
  'use strict';
  var K = window.KIS, N = window.KNotes;
  if (!K || !N) return;
  var esc = K.esc, S = K.SITES;
  var page = (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '') || 'index.html';
  var active = { 'index.html': 'discover', 'keyword.html': 'topic', 'inquiry.html': 'topic', 'roadmap.html': 'growth', 'submission.html': 'growth' }[page] || '';
  var TARGET_KEY = 'kyungil.labTargetNote';
  K.mountNav(active, document.querySelector('header.topbar') || document.body.firstChild);
  N.migrate();

  var CSS = '.kis-panel{border:1px solid #c9d6ee;border-left:4px solid #1f56c2;background:#f5f8fe;border-radius:10px;padding:14px 16px;margin:0 0 16px;display:flex;flex-direction:column;gap:8px;color:#1c2738}' +
    '.kis-panel h2{font-size:1.05rem;margin:0}.kis-panel p{margin:0}.kis-panel .kis-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.kis-panel select{min-height:44px;font:inherit;max-width:100%;padding:6px 8px;border-radius:8px;border:1px solid #c9d6ee;background:#fff;color:#1c2738}' +
    '.kis-panel .kis-btn{min-height:44px;font:inherit;font-weight:700;padding:0 14px;border-radius:8px;border:1.5px solid #1f56c2;background:#1f56c2;color:#fff;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}' +
    '.kis-panel .kis-btn.ghost{background:#fff;color:#1f56c2}.kis-panel ul{margin:0;padding-left:1.2em}.kis-msg{font-size:.9rem;margin-top:6px}' +
    '.kis-panel .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.kis-panel-compact{padding:8px 12px;margin-bottom:10px}.kis-panel-compact p{margin:0}.kis-hub-line{font-weight:800;text-decoration:none}@media print{.kis-panel,.kis-msg{display:none!important}}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function panelAfterNav(html) {
    var p = document.createElement('section'); p.className = 'kis-panel no-print'; p.innerHTML = html;
    var anchor = document.querySelector('[data-flow-nav]');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(p, anchor.nextSibling);
    else { var m = document.querySelector('main') || document.body; m.insertBefore(p, m.firstChild); }
    return p;
  }
  function msgAfter(id, html) {
    var host = $(id); if (!host) return;
    var m = $('kisMsg');
    if (!m) { m = document.createElement('p'); m.id = 'kisMsg'; m.className = 'kis-msg'; m.setAttribute('role', 'status'); host.parentNode.insertBefore(m, host.nextSibling); }
    m.innerHTML = html;
  }
  /* 학생이 명시적으로 고른 노트만 이어 씁니다. 질문 문구가 달라져도 같은 탐구로 유지합니다. */
  function setTarget(id) { try { if (id) sessionStorage.setItem(TARGET_KEY, id); else sessionStorage.removeItem(TARGET_KEY); } catch (e) {} }
  function targetNote() {
    var id = ''; try { id = sessionStorage.getItem(TARGET_KEY) || ''; } catch (e) {}
    return id ? N.get(id) : null;
  }
  function push(patch) {
    var n = targetNote();
    var lab = N.labBridge();
    if (!patch.interest) patch.interest = N.interestText(lab);
    patch.links = Object.assign({}, patch.links || {}, { lab: true });
    if (!n) n = N.create(patch, 'careerLab'); else n = N.merge(n.id, patch);
    N.setActive(n.id); setTarget(n.id);
    return n;
  }
  /* 진로 실험실 첫 화면에서 새로 시작하면 이전 탐구 연결은 끊습니다. */
  if (page === 'index.html') {
    setTarget('');
    var hubIntro = panelAfterNav('<p><a class="kis-hub-line" href="' + S.hub + 'index.html">🏠 처음이면 통합 허브에서 시작하기 →</a></p>');
    hubIntro.classList.add('kis-panel-compact');
    hubIntro.setAttribute('aria-label', '통합 허브 안내');
  }
  function noteLink(n) { return '<a href="' + S.hub + 'notes.html#' + encodeURIComponent(n.id) + '">「' + esc(N.title(n)) + '」 탐구노트 열기 →</a>'; }

  /* STEP 1 질문 만들기: 저장·이동 버튼을 누르는 순간 화면의 질문을 노트에 담습니다. */
  if (page === 'keyword.html') {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('#saveKeyword,#goInquiry'); if (!b) return;
      var q = val('finalQuestion'), topic = val('topic');
      if (!topic || !q) return;
      var checks = ['checkSpecific','checkEvidence','checkOpen'].map(function (id) { var x=$(id); return !!(x && x.checked); });
      if (!checks.every(Boolean)) return;
      /* STEP 1에서 완전히 다른 주제를 시작하면 직전 탐구를 덮어쓰지 않고 새 노트를 만듭니다. */
      var current = targetNote();
      if (current && current.topic && current.topic.trim() !== topic.trim()) setTarget('');
      var n = push({ question: q, topic: topic, start: { from: 'career', text: val('reason') } });
      msgAfter('keywordMessage', '📓 내 탐구노트에도 담았어요. ' + noteLink(n));
    });
    var curId = N.getActive(), cur = curId && N.get(curId);
    panelAfterNav('<h2>📓 내 탐구노트와 연결돼요</h2><p>여기서 저장한 탐구 질문은 공통 <b>내 탐구노트</b>에도 담겨요. 질문 수준(찾기 → 설명하기 → 비교·분석하기 → 판단·확장하기)은 탐구노트에서 스스로 골라 보세요.</p>' +
      '<div class="kis-row">' + (cur ? noteLink(cur) : '') + '<a class="kis-btn ghost" href="' + S.explore + 'index.html">🧭 주제가 막히면 진로 탐구 길잡이</a></div>');
  }

  /* STEP 2 탐구 설계: 노트에서 불러오기 + 저장할 때 노트에 담기 */
  if (page === 'inquiry.html') {
    var incomingId = new URLSearchParams(location.search).get('note');
    if (incomingId && N.get(incomingId)) { setTarget(incomingId); N.setActive(incomingId); }
    var notes = N.list();
    var activeId = N.getActive();
    var p = panelAfterNav('<h2>📓 내 탐구노트에서 불러오기</h2>' +
      (notes.length ? '<div class="kis-row"><label class="sr-only" for="kisPick">불러올 탐구노트</label><select id="kisPick">' + notes.map(function (n) {
        return '<option value="' + esc(n.id) + '"' + (n.id === activeId ? ' selected' : '') + '>' + esc(N.title(n)) + ' · ' + esc(N.stageLabel(n.stage)) + '</option>';
      }).join('') + '</select><button type="button" class="kis-btn" id="kisLoad">이 노트로 설계 채우기</button></div>'
        : '<p>아직 탐구노트가 없어요. 진로 탐구 길잡이에서 주제를 고르고 “탐구노트에 담기”를 누르면 여기서 불러올 수 있어요.</p>') +
      '<p><a href="' + S.explore + 'index.html">🧭 진로 탐구 길잡이 주제은행에서 주제·질문·방법 고르기 →</a></p><p id="kisLoadMsg" role="status"></p>');
    var lb = $('kisLoad');
    if (lb) lb.addEventListener('click', function () {
      var n = N.get($('kisPick').value); if (!n) return;
      function fill(id, v) { var el = $(id); if (el && v && !el.value.trim()) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } }
      fill('question', n.question);
      fill('sources', n.evidence.map(function (e) { return e.title; }).filter(Boolean).join('\n'));
      fill('roles', n.role);
      fill('limits', n.limits);
      var savedInquiry = window.FLOW && window.FLOW.read(window.FLOW.keys.inquiry);
      var m = K.MAP.toLab[n.method]; var card = (!savedInquiry && m) && document.querySelector('[data-method="' + m + '"]'); if (card) card.click();
      N.setActive(n.id); setTarget(n.id);
      $('kisLoadMsg').textContent = '비어 있던 칸에 노트 내용을 채웠어요. 이미 쓴 칸은 그대로 두었어요.';
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('#saveInquiry,#goRoadmap'); if (!b) return;
      var q = val('question');
      if (!q || !val('purpose') || !val('target') || !val('sources') || !val('procedure')) return;
      var checks = ['cTime','cData','cMethod','cEthics','cRevise'].map(function (id) { var x=$(id); return !!(x && x.checked); });
      if (!checks.every(Boolean)) return;
      var sel = document.querySelector('[data-method].selected');
      var method = sel ? K.MAP.fromLab[sel.getAttribute('data-method')] : '';
      var src = val('sources');
      var n = push({ question: q, method: method || '', evidence: src ? src.split(/\n+/).map(function (s) { return { title: s.trim() }; }).filter(function (x) { return x.title; }) : [],
        role: val('roles'), limits: val('limits'), stage: 'doing' });
      msgAfter('inquiryMessage', '📓 탐구노트에도 저장했어요. ' + noteLink(n));
    });
  }

  /* STEP 3 성장 로드맵: 탐구에서 달라진 점을 옆에 보여 줍니다. */
  if (page === 'roadmap.html') {
    var done = N.list().filter(function (n) { return n.change.after || n.next || n.revision; });
    panelAfterNav('<h2>🌳 내 탐구노트에서 달라진 점</h2>' + (done.length ? '<ul>' + done.slice(0, 4).map(function (n) {
      return '<li><b>' + esc(N.title(n)) + '</b>' + (n.change.after ? ' — 바뀐 판단: ' + esc(n.change.after) : '') + (n.next ? ' / 다음 질문: ' + esc(n.next) : '') + '</li>';
    }).join('') + '</ul>' : '<p>탐구노트의 “마친 뒤” 칸(수정, 판단 변화, 다음 질문)을 채우면 여기에 모여요. 로드맵을 쓸 때 근거로 쓰세요.</p>') +
      '<p><a href="' + S.hub + 'notes.html">📓 내 탐구노트 열기 →</a></p>');
  }

  /* STEP 4 최종 제출: 선생님께 보여드릴 활동 요약 */
  if (page === 'submission.html') {
    var all = N.list();
    var sp = panelAfterNav('<h2>📓 탐구노트 활동 요약</h2>' + (all.length ? '<div class="kis-row"><label class="sr-only" for="kisSum">요약할 탐구노트</label><select id="kisSum">' + all.map(function (n) { return '<option value="' + esc(n.id) + '">' + esc(N.title(n)) + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="kis-btn" id="kisCopy">활동 요약 복사</button></div><p class="kis-msg" id="kisCopyMsg" role="status"></p>' : '<p>아직 탐구노트가 없어요.</p>') +
      '<p>' + esc(K.SUMMARY_NOTICE) + '</p>');
    var cb = $('kisCopy');
    if (cb) cb.addEventListener('click', function () {
      var n = N.get($('kisSum').value); if (!n) return;
      var text = N.summary(n), m = $('kisCopyMsg');
      if (window.FLOW && window.FLOW.copy) { window.FLOW.copy(text, '활동 요약을 복사했습니다.'); return; }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { m.textContent = '복사했어요.'; }, function () { m.textContent = '복사하지 못했어요. 내 탐구노트의 활동 요약 탭에서 복사하세요.'; });
      else m.textContent = '이 화면에서는 복사가 막혀 있어요. 내 탐구노트의 활동 요약 탭에서 복사하세요.';
    });
  }
})();
