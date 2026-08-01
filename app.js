(()=>{
'use strict';
const D=window.CAREER_DATA;
const STATE_KEY='careerLabStateV2';
const CLASS_RECORDS_KEY='careerLabClassRecordsV1';
const CLASS_REFERENCE_KEY='careerLabClassReferenceV1';
const GALLERY_KEY='careerLabApprovedGalleryV1';
const BRIDGE_KEY='careerLabBridgeV2';
let storage=sessionStorage;
let currentStep=1;
let inactivityTimer=null;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.()||`r-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
const actionBy=id=>D.actions.find(x=>x.id===id);
const prefBy=id=>D.preferredActions.find(x=>x.id===id);
const targetBy=id=>D.targets.find(x=>x.id===id);
const jobBy=id=>D.jobs.find(x=>x.id===id);
const expBy=id=>D.experiments.find(x=>x.id===id);
const courseBy=id=>D.courseCatalog.find(x=>x.id===id);

const emptyExperience=()=>({area:'',situation:'',actionText:'',result:'',feeling:'',actions:[],interest:'',outcome:'',exampleHint:''});
const defaultState=()=>({
  version:D.config.version,
  resultId:uid(),createdAt:new Date().toISOString(),device:null,startType:'',startDetail:'',areas:[],
  experiences:[emptyExperience(),emptyExperience(),emptyExperience()],peerMemory:'',hypothesisDecisions:{},
  preferredActions:[],targets:[],environments:{social:3,structure:3,pace:3,place:3,time:3},subjects:[],selectedCourses:[],
  selectedJob:'',jobPage:0,filters:{time:'1주',mode:'개인',place:'자율시간',device:'가능',cost:'0원',output:'이미지'},
  selectedExperiment:'',galleryOffset:0,plan:{why:'',schedule:'',resources:'',feedback:'',question:''},teacherApproval:false,
  reflection:{status:'아직 실행 전',did:'',coreAction:'',fun:'',hard:'',change:'',again:'잘 모르겠다',nextQuestion:'',finalDecision:'판단 보류'},
  revisitWhen:'2학기 진로시간',revisitCustom:''
});
let state=defaultState();

function deepMerge(base,loaded){
  const out={...base,...loaded};
  out.experiences=(loaded?.experiences||base.experiences).map((e,i)=>({...emptyExperience(),...(base.experiences[i]||{}),...e}));
  out.environments={...base.environments,...(loaded?.environments||{})};
  out.filters={...base.filters,...(loaded?.filters||{})};
  out.plan={...base.plan,...(loaded?.plan||{})};
  out.reflection={...base.reflection,...(loaded?.reflection||{})};
  return out;
}
function load(){
  try{const raw=storage.getItem(STATE_KEY);state=raw?deepMerge(defaultState(),JSON.parse(raw)):defaultState();}
  catch(err){console.warn(err);state=defaultState();}
}
function save(){
  storage.setItem(STATE_KEY,JSON.stringify(state));
  resetInactivity();
}
function resetInactivity(){
  clearTimeout(inactivityTimer);
  if(state.device!=='public')return;
  inactivityTimer=setTimeout(()=>{
    alert(`공용 기기 보호를 위해 ${D.config.inactivityMinutes}분 동안 입력이 없어 작업 내용을 초기화합니다.`);
    clearAll(true);
  },D.config.inactivityMinutes*60*1000);
}
['click','keydown','input','change','touchstart'].forEach(ev=>document.addEventListener(ev,resetInactivity,{passive:true}));

function setDevice(type){
  state.device=type;
  sessionStorage.setItem('careerLabStorageModeV1',type);
  if(type==='private')localStorage.setItem('careerLabStorageModeV1',type);else localStorage.removeItem('careerLabStorageModeV1');
  storage=type==='private'?localStorage:sessionStorage;
  load();
  state.device=type;
  save();
  $('#heroSection').classList.add('hidden');
  $('#workspace').classList.remove('hidden');
  $('#storageBadge').textContent=type==='private'?'개인 기기 저장':'공용 기기·15분 미사용 시 삭제';
  renderAll();
}
$$('[data-device]').forEach(b=>b.addEventListener('click',()=>setDevice(b.dataset.device)));

function renderAll(){renderProgress();renderStep1();renderStep2();renderStep3();renderStep4();renderStep5();showStep(currentStep);}
function renderProgress(){
  $$('.progress-nav button').forEach(b=>{const n=+b.dataset.step;b.classList.toggle('active',n===currentStep);b.classList.toggle('done',n<currentStep)});
  const guides={1:['1차시 목표','경험 3개와 실제 행동을 찾아보세요.','권장 20분'],2:['2차시 목표','흥미와 결과를 구분하고 행동 가설을 검토하세요.','권장 15분'],3:['2차시 목표','직무 행동·대상·환경·과목을 살펴보세요.','권장 20분'],4:['3차시 목표','실제로 가능한 미니 실험 하나를 계획하세요.','권장 20분'],5:['후속 활동','실험 후 성찰하고 탐구 질문으로 연결하세요.','권장 15분']};
  const g=guides[currentStep];$('#guideTitle').textContent=g[0];$('#guideText').textContent=g[1];$('#timerText').textContent=g[2];
}
function showStep(n){
  currentStep=Math.min(5,Math.max(1,n));
  $$('[data-step-panel]').forEach(p=>p.classList.toggle('hidden',+p.dataset.stepPanel!==currentStep));
  $('#prevStep').disabled=currentStep===1;
  $('#nextStep').textContent=currentStep===5?'완료':'다음';
  $('#stepMessage').textContent='';renderProgress();window.scrollTo({top:0,behavior:'smooth'});
}
$$('.progress-nav button').forEach(b=>b.addEventListener('click',()=>showStep(+b.dataset.step)));
$('#prevStep').addEventListener('click',()=>showStep(currentStep-1));
$('#nextStep').addEventListener('click',()=>{
  const msg=validateStep(currentStep);$('#stepMessage').textContent=msg||'';
  if(!msg&&currentStep<5)showStep(currentStep+1);
  else if(!msg){renderStep5();alert('진로 가설 카드가 완성되었습니다. 요약을 복사하거나 익명 결과 파일을 저장한 뒤, 공용 기기라면 데이터를 삭제해 주세요.');}
});

function privacyFindings(text,mode='all'){
  const findings=[];const t=String(text||'');
  const rules=[
    {label:'전화번호',severity:'block',re:/(?:01[016789])[-\s]?\d{3,4}[-\s]?\d{4}/},
    {label:'이메일',severity:'block',re:/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/},
    {label:'주민등록번호',severity:'block',re:/\d{6}[-\s]?[1-4]\d{6}/},
    {label:'상세 주소',severity:'block',re:/(?:로|길|동|읍|면)\s*\d{1,4}(?:-\d{1,4})?/},
    {label:'학번·반번호',severity:'block',re:/(?:학번|학생번호|출석번호|\d학년\s*\d반\s*\d번)/},
    {label:'실명 가능 표현',severity:'warn',re:/[가-힣]{2,4}\s*(?:선생님|학생|친구|엄마|아빠|형|누나|언니|오빠)/},
    {label:'민감정보',severity:'block',re:/(?:진단|치료|상담내용|가정형편|가족갈등|경제사정|병원|질병)/}
  ];
  rules.forEach(rule=>{if(rule.re.test(t)&&(mode==='all'||rule.severity===mode))findings.push(rule.label)});
  return [...new Set(findings)];
}
function allFreeText(){
  return [state.startDetail,state.peerMemory,...state.experiences.flatMap(e=>[e.situation,e.actionText,e.result,e.feeling]),...Object.values(state.plan),...Object.values(state.reflection),state.revisitCustom].join(' ');
}
function validateStep(s){
  if(s===1){
    if(!state.startType)return '현재 진로 상태를 선택하세요.';
    if(['interest','job'].includes(state.startType)&&state.startDetail.trim().length<2)return '관심 분야나 희망 직업을 짧게 적어주세요.';
    const valid=state.experiences.filter(e=>e.situation.trim()&&e.actionText.trim()).length;
    if(valid<2)return '최소 2개의 경험에서 상황과 내가 한 행동을 적어주세요.';
    const privacy=privacyFindings(allFreeText(),'block');if(privacy.length)return `개인정보 또는 민감정보로 보이는 표현을 확인하세요: ${privacy.join(', ')}`;
  }
  if(s===2){const picked=state.experiences.reduce((n,e)=>n+e.actions.length,0);if(picked<3)return '경험에서 실제로 한 행동을 합쳐 3개 이상 골라주세요.';}
  if(s===3){if(state.preferredActions.length!==2)return '더 해보고 싶은 직무 행동을 2개 선택하세요.';if(state.targets.length<1)return '관심 대상을 1개 이상 선택하세요.';if(!state.selectedJob)return '비교할 직업 카드 하나를 선택하세요.';}
  if(s===4){
    if(!state.selectedExperiment)return '실행해 볼 미니 실험 하나를 선택하세요.';
    const exp=expBy(state.selectedExperiment);if(exp?.needsPeople&&!state.teacherApproval)return '다른 사람이 참여하는 활동은 담당교사와 상의하겠다는 항목을 확인하세요.';
  }
  return '';
}

function startPrompt(){
  if(state.startType==='interest')return `관심 분야 “${state.startDetail||'미입력'}”와 연결되는 실제 경험을 찾아봅니다.`;
  if(state.startType==='job')return `희망 직업 “${state.startDetail||'미입력'}”에서 실제로 자주 할 행동과 비슷한 경험을 찾아봅니다.`;
  return '최근 한 달의 수업·취미·친구 관계에서 작은 경험부터 찾아봅니다.';
}
function renderStep1(){
  $('#startTypeChoices').innerHTML=D.startTypes.map(x=>`<button type="button" class="choice-card ${state.startType===x.id?'selected':''}" data-start="${x.id}"><strong>${x.title}</strong><small>${x.desc}</small></button>`).join('');
  $$('[data-start]').forEach(b=>b.onclick=()=>{state.startType=b.dataset.start;if(b.dataset.start==='open')state.startDetail='';save();renderStep1()});
  const detailWrap=$('#startDetailWrap');detailWrap.classList.toggle('hidden',state.startType==='open'||!state.startType);
  $('#startDetailLabel').textContent=state.startType==='job'?'현재 생각 중인 희망 직업':'현재 관심 분야';
  $('#startDetail').placeholder=state.startType==='job'?'예: 교사, 로봇공학자, 영상 제작자':'예: 심리, 생명, 미디어, 기계';
  $('#startDetail').value=state.startDetail;$('#startDetail').oninput=e=>{state.startDetail=e.target.value;save()};
  $('#startDetailHelp').textContent=startPrompt();
  $('#experienceAreaChoices').innerHTML=D.experienceAreas.map(x=>`<button type="button" class="chip ${state.areas.includes(x.id)?'selected':''}" data-area="${x.id}">${x.icon} ${x.label}</button>`).join('');
  $$('[data-area]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.area;
    if(state.areas.includes(id)){state.areas=state.areas.filter(v=>v!==id)}else{state.areas=[...state.areas,id];const empty=state.experiences.find(e=>!e.area);if(empty)empty.area=id;}
    save();renderStep1();
  });
  const selectedAreas=state.areas.length?D.experienceAreas.filter(x=>state.areas.includes(x.id)):D.experienceAreas;
  const areaOptions=`<option value="">경험 영역 선택</option>`+selectedAreas.map(x=>`<option value="${x.id}">${x.label}</option>`).join('');
  const fragments={situation:['수업·활동에서 ','모둠 과제를 하다가 ','최근 한 달 동안 ','취미나 게임을 하면서 '],actionText:['자료를 찾아 ','핵심을 골라 ','친구에게 설명하고 ','다른 방법을 시도해 ','역할과 순서를 정해 ','오류를 찾아 수정해 '],result:['그 결과 ','친구의 반응은 ','처음과 달라진 점은 '],feeling:['재미있었던 점은 ','힘들었던 점은 ']};
  $('#experienceForms').innerHTML=state.experiences.map((e,i)=>`<article class="card experience-card"><h3>경험 ${i+1}${i===0?' · 자세히 쓰기':' · 짧게 써도 괜찮음'}</h3>${e.exampleHint?`<div class="notice info"><strong>기억 도움 예시</strong><br>${esc(e.exampleHint)}<br><small>그대로 제출하지 말고 본인의 실제 경험으로 바꾸어 쓰세요.</small></div>`:''}<div class="field-grid"><div class="field"><label>경험 영역</label><select data-exp="${i}" data-field="area">${areaOptions}</select></div><div class="field"><label>상황</label><textarea data-exp="${i}" data-field="situation" placeholder="언제, 어떤 일이었나요?">${esc(e.situation)}</textarea><div class="fragment-row">${fragments.situation.map(v=>`<button type="button" class="fragment" data-frag-exp="${i}" data-frag-field="situation" data-frag="${esc(v)}">${esc(v)}</button>`).join('')}</div></div><div class="field"><label>내가 직접 한 행동</label><textarea data-exp="${i}" data-field="actionText" placeholder="내가 실제로 한 일은 무엇이었나요?">${esc(e.actionText)}</textarea><div class="fragment-row">${fragments.actionText.map(v=>`<button type="button" class="fragment" data-frag-exp="${i}" data-frag-field="actionText" data-frag="${esc(v)}">${esc(v)}</button>`).join('')}</div></div><div class="field"><label>결과</label><textarea data-exp="${i}" data-field="result" placeholder="무엇이 달라졌거나 완성되었나요?">${esc(e.result)}</textarea></div>${i===0?`<div class="field"><label>느낌</label><textarea data-exp="${i}" data-field="feeling" placeholder="재미있었던 점과 힘들었던 점은 무엇인가요?">${esc(e.feeling)}</textarea></div>`:''}</div><div class="word-warning" data-warning="${i}"></div><div class="privacy-warning" data-privacy="${i}"></div></article>`).join('');
  state.experiences.forEach((e,i)=>{const sel=$(`select[data-exp="${i}"][data-field="area"]`);if(sel)sel.value=e.area});
  $$('[data-exp]').forEach(el=>el.oninput=()=>{const i=+el.dataset.exp;state.experiences[i][el.dataset.field]=el.value;showInputHint(i);save()});
  $$('[data-frag-exp]').forEach(b=>b.onclick=()=>{const i=+b.dataset.fragExp,field=b.dataset.fragField;state.experiences[i][field]=(state.experiences[i][field]+' '+b.dataset.frag).trimStart();save();renderStep1()});
  $('#peerMemory').value=state.peerMemory;$('#peerMemory').oninput=e=>{state.peerMemory=e.target.value;save();showPeerPrivacy()};
  state.experiences.forEach((_,i)=>showInputHint(i));showPeerPrivacy();
}
function showPeerPrivacy(){const el=$('#peerMemory');if(!el)return;const f=privacyFindings(el.value);el.classList.toggle('field-alert',f.length>0);}
function showInputHint(i){
  const e=state.experiences[i],w=$(`[data-warning="${i}"]`),p=$(`[data-privacy="${i}"]`);if(!w)return;
  const text=(e.situation+' '+e.actionText+' '+e.result).trim(),vague=/열심히|잘했다|재미있었다|최선을/.test(text);
  w.textContent=text.length>0&&text.length<30?'조금 더 구체적으로 적어보세요. ‘내가 직접 한 일’과 ‘그 결과’를 한 문장씩 추가하면 좋습니다.':vague?'‘열심히·잘했다’ 대신 자료 찾기, 비교하기, 설명하기, 수정하기처럼 실제 행동을 적어보세요.':'';
  const findings=privacyFindings(text+' '+e.feeling);p.textContent=findings.length?`개인정보·민감정보 가능성: ${findings.join(', ')}. 실명과 구체적 정보는 지우세요.`:'';
}
$('#useStarterExamples').onclick=()=>{
  $('#starterExamples').innerHTML=D.starterExamples.map((x,i)=>`<button type="button" class="choice-card starter" data-example="${i}">${esc(x)}</button>`).join('');
  $$('.starter').forEach(b=>b.onclick=()=>{const target=state.experiences.findIndex(e=>!e.situation.trim()&&!e.actionText.trim());const i=target<0?0:target;state.experiences[i].exampleHint=D.starterExamples[+b.dataset.example];save();renderStep1();$('#starterDialog').close()});
  $('#starterDialog').showModal();
};

function actionStats(){
  const map={};D.actions.forEach(a=>map[a.id]={count:0,interests:[],outcomes:[],experiences:[]});
  state.experiences.forEach((e,idx)=>e.actions.forEach(id=>{map[id].count++;map[id].interests.push(e.interest);map[id].outcomes.push(e.outcome);map[id].experiences.push(idx+1)}));return map;
}
function categoryFor(stat){
  const fun=stat.interests.includes('재미있었다');
  const hard=stat.interests.includes('힘들었다');
  const good=stat.outcomes.some(x=>x==='스스로 만족했다'||x==='다른 사람의 긍정적 반응이 있었다');
  if(fun&&good)return'core';if(fun&&!good)return'grow';if(hard&&good)return'burden';return'unclear';
}
function computeHypotheses(){
  const stats=actionStats();
  return D.hypotheses.map((h,idx)=>{const matched=h.actions.filter(id=>stats[id]?.count>0);const evidence=matched.reduce((n,id)=>n+stats[id].count,0);return{id:`h${idx}`,text:h.text,actions:matched,evidence};}).filter(h=>h.actions.length>=2||h.evidence>=3);
}
function renderStep2(){
  $('#actionReview').innerHTML=state.experiences.map((e,i)=>{const group=D.actions.map(a=>`<label class="action-option"><input type="checkbox" data-act-exp="${i}" value="${a.id}" ${e.actions.includes(a.id)?'checked':''}><span><strong>${a.label}</strong><small>${a.desc}</small></span></label>`).join('');return `<article class="card action-card"><h3>경험 ${i+1}</h3><p>${esc(e.situation||'아직 작성하지 않음')}</p><p class="help">내가 직접 한 행동을 최대 3개 고르세요.</p><div class="chip-grid">${group}</div><div class="ratings"><label>해보니 어땠나요?<select data-rating-exp="${i}" data-kind="interest"><option value="">선택</option><option>재미있었다</option><option>괜찮았다</option><option>힘들었다</option><option>잘 모르겠다</option></select></label><label>결과는 어땠나요?<select data-rating-exp="${i}" data-kind="outcome"><option value="">선택</option><option>스스로 만족했다</option><option>다른 사람의 긍정적 반응이 있었다</option><option>기대만큼 나오지 않았다</option><option>확인하기 어렵다</option></select></label></div></article>`}).join('');
  $$('[data-act-exp]').forEach(c=>c.onchange=()=>{const i=+c.dataset.actExp;let arr=state.experiences[i].actions;if(c.checked&&arr.length>=3){c.checked=false;alert('한 경험에서는 행동을 최대 3개까지 선택할 수 있습니다.');return}state.experiences[i].actions=c.checked?[...arr,c.value]:arr.filter(v=>v!==c.value);save();renderStep2()});
  $$('[data-rating-exp]').forEach(s=>{const i=+s.dataset.ratingExp;s.value=state.experiences[i][s.dataset.kind];s.onchange=()=>{state.experiences[i][s.dataset.kind]=s.value;save();renderMatrix();renderHypotheses()}});
  renderMatrix();renderHypotheses();
}
function renderMatrix(){
  const stats=actionStats(),cats={core:[],grow:[],burden:[],unclear:[]};
  Object.entries(stats).filter(([,s])=>s.count).forEach(([id,s])=>cats[categoryFor(s)].push(actionBy(id).label));
  const defs=[['core','재미있고 결과도 좋았음','더 확인할 핵심 영역','matrix-core'],['grow','재미있지만 아직 서툼','잠재 성장 영역','matrix-grow'],['burden','결과는 좋았지만 힘들었음','피로·부담 영역','matrix-burden'],['unclear','아직 판단하기 어려움','추가 확인 영역','matrix-unclear']];
  $('#matrix').innerHTML=defs.map(([id,title,sub,cls])=>`<div class="matrix-cell ${cls}"><h4>${title}</h4><small>${sub}</small>${cats[id].length?`<ul>${cats[id].map(x=>`<li>${x}</li>`).join('')}</ul>`:'<p class="help">아직 해당 행동이 없습니다.</p>'}${id==='burden'?'<p class="help">잘한다고 해서 반드시 직업으로 선택할 필요는 없습니다.</p>':''}</div>`).join('');
}
function renderHypotheses(){
  const hs=computeHypotheses();
  if(!hs.length){$('#hypothesisList').innerHTML='<div class="empty-state">서로 다른 경험에서 행동을 선택하면 가설이 나타납니다.</div>';return;}
  $('#hypothesisList').innerHTML=hs.map(h=>`<div class="hypothesis"><strong>${esc(h.text)}</strong><p class="evidence">근거 행동: ${h.actions.map(id=>actionBy(id).label).join(', ')} · 누적 근거 ${h.evidence}회</p>${state.peerMemory?`<p class="evidence">또래 관찰 참고: ${esc(state.peerMemory)}</p>`:''}<div class="hypothesis-controls">${['매우 나답다','어느 정도 맞다','아직 판단하기 어렵다','나와 다르다'].map(v=>`<button type="button" data-hyp="${h.id}" data-value="${v}" class="${state.hypothesisDecisions[h.id]===v?'selected':''}">${v}</button>`).join('')}</div></div>`).join('');
  $$('[data-hyp]').forEach(b=>b.onclick=()=>{state.hypothesisDecisions[b.dataset.hyp]=b.dataset.value;save();renderHypotheses();renderSummary()});
}

function renderStep3(){
  $('#preferredActions').innerHTML=D.preferredActions.map(x=>`<button type="button" class="chip ${state.preferredActions.includes(x.id)?'selected':''}" data-pref="${x.id}">${x.label}</button>`).join('');
  $$('[data-pref]').forEach(b=>b.onclick=()=>{const id=b.dataset.pref;if(state.preferredActions.includes(id))state.preferredActions=state.preferredActions.filter(v=>v!==id);else if(state.preferredActions.length<2)state.preferredActions=[...state.preferredActions,id];else return alert('직무 행동은 2개까지 선택합니다.');save();renderStep3();renderStep4()});
  $('#targetChoices').innerHTML=D.targets.map(x=>`<button type="button" class="chip ${state.targets.includes(x.id)?'selected':''}" data-target="${x.id}">${x.label}</button>`).join('');
  $$('[data-target]').forEach(b=>b.onclick=()=>{const id=b.dataset.target;if(state.targets.includes(id))state.targets=state.targets.filter(v=>v!==id);else if(state.targets.length<2)state.targets=[...state.targets,id];else return alert('관심 대상은 2개까지 선택합니다.');save();renderStep3()});
  $('#environmentChoices').innerHTML=D.environments.map(e=>`<div class="env-row"><span>${e.left}</span><div class="scale">${[1,2,3,4,5].map(v=>`<label><input type="radio" name="env-${e.id}" value="${v}" ${state.environments[e.id]===v?'checked':''}><span>${v}</span></label>`).join('')}</div><span class="env-label right">${e.right}</span></div>`).join('');
  $$('input[name^="env-"]').forEach(r=>r.onchange=()=>{state.environments[r.name.slice(4)]=+r.value;save();renderJobs();renderCourseRecommendations()});
  $('#subjectChoices').innerHTML=D.subjects.map(x=>`<button type="button" class="chip ${state.subjects.includes(x)?'selected':''}" data-subject="${x}">${x}</button>`).join('');
  $$('[data-subject]').forEach(b=>b.onclick=()=>{const x=b.dataset.subject;if(state.subjects.includes(x))state.subjects=state.subjects.filter(v=>v!==x);else if(state.subjects.length<D.config.maxSubjects)state.subjects=[...state.subjects,x];else return alert(`관심 영역은 ${D.config.maxSubjects}개까지 선택합니다.`);save();renderStep3()});
  renderJobs();renderCourseRecommendations();renderStudentComparison($('#studentComparison'));
}
function scoreJob(j){
  let s=0;s+=state.preferredActions.filter(a=>j.actions.includes(a)).length*40;s+=state.targets.filter(t=>j.targets.includes(t)).length*20;s+=state.subjects.filter(x=>j.subjects.includes(x)).length*5;
  D.environments.forEach(e=>{const diff=Math.abs((state.environments[e.id]||3)-(j.env[e.id]||3));s+=Math.max(0,6-diff*2)});
  const q=state.startDetail.trim().toLowerCase();if(q){const hay=[j.name,j.problem,...j.majors,...j.tasks].join(' ').toLowerCase();if(hay.includes(q))s+=state.startType==='job'?70:25;}
  return s;
}
function envDistance(a,b){return D.environments.reduce((sum,e)=>sum+Math.abs((a.env[e.id]||3)-(b.env[e.id]||3)),0)}
function candidatePools(sorted){
  const direct=sorted.slice(0,Math.min(8,sorted.length));
  const anchor=sorted[0]||D.jobs[0];
  const adjacent=sorted.filter(j=>j.id!==anchor.id&&j.actions.some(a=>anchor.actions.includes(a))&&j.targets.some(t=>anchor.targets.includes(t)));
  const surprise=sorted.filter(j=>j.id!==anchor.id&&(!j.actions.some(a=>anchor.actions.includes(a))||!j.targets.some(t=>anchor.targets.includes(t))));
  const compare=sorted.filter(j=>j.id!==anchor.id&&j.actions.some(a=>anchor.actions.includes(a))).sort((a,b)=>envDistance(b,anchor)-envDistance(a,anchor));
  return {direct,adjacent:adjacent.length?adjacent:sorted.slice(1),surprise:surprise.length?surprise:sorted.slice(2),compare:compare.length?compare:sorted.slice(3)};
}
function jobTypes(){
  const sorted=[...D.jobs].sort((a,b)=>scoreJob(b)-scoreJob(a));const pools=candidatePools(sorted);const i=state.jobPage;
  const chosen=[];const take=(type,pool)=>{if(!pool.length)return;let job=pool[i%pool.length];let guard=0;while(chosen.includes(job.id)&&guard<pool.length){guard++;job=pool[(i+guard)%pool.length]}chosen.push(job.id);return{type,job}};
  return [take('먼저 살펴볼 후보',pools.direct),take('함께 비교할 후보',pools.adjacent),take('의외로 연결되는 후보',pools.surprise),take('환경 차이를 확인할 후보',pools.compare)].filter(Boolean);
}
function renderJobs(){
  $('#jobCards').innerHTML=jobTypes().map(({type,job})=>`<article class="job-card ${state.selectedJob===job.id?'selected':''}"><span class="type">${type}</span><h4>${esc(job.name)}</h4><p><strong>해결하는 문제</strong><br>${esc(job.problem)}</p><p><strong>자주 하는 일</strong></p><ul>${job.tasks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p><strong>힘들 수 있는 점</strong><br>${esc(job.hard)}</p><div class="tag-row">${job.actions.map(a=>`<span class="tag">${esc(actionBy(a)?.label||a)}</span>`).join('')}</div><p><strong>관련 전공 예시</strong><br>${job.majors.map(esc).join(' · ')}</p><p><strong>연계해 볼 과목 영역</strong><br>${job.subjects.map(esc).join(' · ')} <small>(학교 개설 확인)</small></p><p><strong>동아리 성격</strong><br>${esc(job.club)}</p><p class="source-status"><small>정보 상태: ${esc(job.source)}</small></p><button type="button" class="select-job ${state.selectedJob===job.id?'secondary':''}" data-job="${job.id}">${state.selectedJob===job.id?'선택됨':'이 직업을 더 비교하기'}</button></article>`).join('');
  $$('[data-job]').forEach(b=>b.onclick=()=>{state.selectedJob=b.dataset.job;save();renderJobs();renderCourseRecommendations();renderStep4()});
}
$('#refreshJobs').onclick=()=>{state.jobPage=(state.jobPage+1)%Math.max(1,Math.min(8,D.jobs.length));save();renderJobs()};
function courseScore(c){
  let s=0;s+=state.preferredActions.filter(a=>c.actions.includes(a)).length*30;s+=state.targets.filter(t=>c.targets.includes(t)).length*20;
  const job=jobBy(state.selectedJob);if(job&&job.subjects.some(sub=>c.area.includes(sub)||sub.includes(c.area.split('·')[0])))s+=35;
  if(state.subjects.some(sub=>c.area.includes(sub)))s+=15;return s;
}
function recommendedCourses(){return [...D.courseCatalog].sort((a,b)=>courseScore(b)-courseScore(a)).slice(0,8)}
function renderCourseRecommendations(){
  const list=recommendedCourses();$('#courseRecommendations').innerHTML=list.map(c=>`<label class="course-card ${state.selectedCourses.includes(c.id)?'selected':''}"><input type="checkbox" data-course="${c.id}" ${state.selectedCourses.includes(c.id)?'checked':''}><span><strong>${esc(c.name)}</strong><small>${esc(c.area)} · ${esc(c.note)}</small></span></label>`).join('');
  $$('[data-course]').forEach(c=>c.onchange=()=>{const id=c.dataset.course;if(c.checked&&state.selectedCourses.length>=D.config.maxCourses){c.checked=false;return alert(`확인해 볼 과목은 ${D.config.maxCourses}개까지 선택합니다.`)}state.selectedCourses=c.checked?[...state.selectedCourses,id]:state.selectedCourses.filter(v=>v!==id);save();renderCourseRecommendations();renderSummary()});
}

function renderStep4(){
  const opts={time:['30분','1주','2~4주'],mode:['개인','모둠'],place:['수업','동아리','자율시간','방학'],device:['불필요','가능','필요'],cost:['0원','소액 가능'],output:['글','발표','이미지','데이터','제작물']};
  $('#experimentFilters').innerHTML=Object.entries(opts).map(([k,arr])=>`<label>${({time:'가능한 시간',mode:'진행 방식',place:'활동 장면',device:'컴퓨터 사용',cost:'비용',output:'결과물'}[k])}<select data-filter="${k}">${arr.map(v=>`<option ${state.filters[k]===v?'selected':''}>${v}</option>`).join('')}</select></label>`).join('');
  $$('[data-filter]').forEach(s=>s.onchange=()=>{state.filters[s.dataset.filter]=s.value;save();renderExperiments()});renderExperiments();renderGallery();renderPlan();
  $('#teacherApproval').checked=state.teacherApproval;$('#teacherApproval').onchange=e=>{state.teacherApproval=e.target.checked;save()};
}
function experimentScore(x){let s=0;if(state.preferredActions.includes(x.action))s+=50;if(x.time===state.filters.time)s+=20;if(x.mode===state.filters.mode)s+=10;if(x.place===state.filters.place)s+=10;if(x.output===state.filters.output)s+=10;if(state.filters.device==='불필요'&&x.device==='불필요')s+=10;if(state.filters.cost==='0원'&&x.cost==='0원')s+=10;return s}
function renderExperiments(){
  const list=[...D.experiments].sort((a,b)=>experimentScore(b)-experimentScore(a)).slice(0,3);
  $('#experimentCards').innerHTML=list.map(x=>`<article class="job-card ${state.selectedExperiment===x.id?'selected':''}"><span class="type">${x.time} · ${x.mode} · ${x.cost}</span><h4>${esc(x.title)}</h4><ol>${x.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p><strong>완료 기준</strong><br>${esc(x.complete)}</p><p><strong>어려울 때 대안</strong><br>${esc(x.fallback)}</p>${x.needsPeople?'<p class="notice warning">다른 사람의 동의와 담당교사 확인이 필요합니다.</p>':''}<button type="button" data-experiment="${x.id}">${state.selectedExperiment===x.id?'선택됨':'이 실험 선택'}</button></article>`).join('');
  $$('[data-experiment]').forEach(b=>b.onclick=()=>{state.selectedExperiment=b.dataset.experiment;state.teacherApproval=false;save();renderExperiments();renderPlan();renderStep5()});
}
function approvedGallery(){
  try{return JSON.parse(localStorage.getItem(GALLERY_KEY)||'[]')}catch{return[]}
}
function galleryItems(){return [...D.galleryExamples,...approvedGallery().map((x,i)=>({...x,id:x.id||`school-${i}`,status:'학교 승인 사례'}))]}
function renderGallery(){
  const items=galleryItems().filter(x=>!state.preferredActions.length||state.preferredActions.includes(x.action));const pool=items.length?items:galleryItems();
  const shown=[];for(let i=0;i<Math.min(4,pool.length);i++)shown.push(pool[(state.galleryOffset+i)%pool.length]);
  $('#galleryCards').innerHTML=shown.map(x=>`<article class="gallery-card"><span class="type ${x.status==='학교 승인 사례'?'approved':''}">${esc(x.status)}</span><h4>${esc(x.title)}</h4><p><strong>활동</strong><br>${esc(x.summary)}</p><p><strong>결과물</strong><br>${esc(x.result)}</p><p><strong>배운 점</strong><br>${esc(x.reflection)}</p><div class="tag-row"><span class="tag">${esc(actionBy(x.action)?.label||x.action)}</span><span class="tag">${esc(x.duration)}</span></div></article>`).join('');
}
$('#refreshGallery').onclick=()=>{state.galleryOffset=(state.galleryOffset+4)%Math.max(1,galleryItems().length);save();renderGallery()};
function renderPlan(){
  const x=expBy(state.selectedExperiment);if(!x){$('#experimentPlan').innerHTML='<div class="empty-state">추천 활동 중 하나를 선택하세요.</div>';return}
  const p=state.plan;if(!p.why)p.why=`${actionBy(x.action)?.label||'이 행동'}을 실제로 재미있고 반복할 만한지 확인한다.`;if(!p.schedule)p.schedule=x.time;if(!p.question)p.question='어떤 부분이 재미있었고, 어떤 어려움은 감수하기 힘들었는가?';
  $('#experimentPlan').innerHTML=`<div class="plan-grid"><label>확인하려는 가설<textarea data-plan="why">${esc(p.why)}</textarea></label><label>기간과 일정<textarea data-plan="schedule">${esc(p.schedule)}</textarea></label><label>필요한 자료와 도구<textarea data-plan="resources">${esc(p.resources)}</textarea></label><label>받을 피드백<textarea data-plan="feedback" placeholder="누구에게 무엇을 물을지 적습니다.">${esc(p.feedback)}</textarea></label><label>활동 후 확인할 질문<textarea data-plan="question">${esc(p.question)}</textarea></label></div>`;
  $$('[data-plan]').forEach(el=>el.oninput=()=>{state.plan[el.dataset.plan]=el.value;save()});
}

function approvedHypotheses(){return computeHypotheses().filter(h=>['매우 나답다','어느 정도 맞다'].includes(state.hypothesisDecisions[h.id])).map(h=>h.text)}
function renderStep5(){
  const r=state.reflection;const fields=[['status','진행 상태','select',['아직 실행 전','진행 중','완료','계획대로 끝내지 못했지만 배운 점이 있음']],['did','실제로 무엇을 했나요?','textarea'],['coreAction','내가 맡은 핵심 행동은 무엇이었나요?','textarea'],['fun','예상보다 재미있었던 부분','textarea'],['hard','예상보다 힘들었던 부분','textarea'],['change','피드백을 받고 바꾼 점','textarea'],['again','이 행동을 다시 해보고 싶은가요?','select',['다시 해보고 싶다','조건이 맞으면 해보고 싶다','잘 모르겠다','다른 행동을 탐색하고 싶다']],['nextQuestion','다음에는 무엇을 더 확인하고 싶은가요?','textarea'],['finalDecision','현재 판단','select',['관심 확대','관심 유지','판단 보류','다른 방향 탐색']]];
  $('#reflectionForm').innerHTML=fields.map(([id,label,type,opts])=>type==='select'?`<label>${label}<select data-reflect="${id}">${opts.map(o=>`<option ${r[id]===o?'selected':''}>${o}</option>`).join('')}</select></label>`:`<label>${label}<textarea data-reflect="${id}">${esc(r[id])}</textarea></label>`).join('');
  $$('[data-reflect]').forEach(el=>el.oninput=()=>{state.reflection[el.dataset.reflect]=el.value;save();renderSummary()});
  $('#revisitWhen').value=state.revisitWhen;$('#revisitCustom').value=state.revisitCustom;$('#revisitCustom').classList.toggle('hidden',state.revisitWhen!=='직접 정하기');
  $('#revisitWhen').onchange=e=>{state.revisitWhen=e.target.value;$('#revisitCustom').classList.toggle('hidden',e.target.value!=='직접 정하기');save();renderSummary()};$('#revisitCustom').oninput=e=>{state.revisitCustom=e.target.value;save();renderSummary()};
  renderSummary();renderStudentComparison($('#finalComparison'));
}
function summaryText(){
  const job=jobBy(state.selectedJob),exp=expBy(state.selectedExperiment),actions=state.preferredActions.map(id=>prefBy(id)?.label).filter(Boolean),targets=state.targets.map(id=>targetBy(id)?.label).filter(Boolean),courses=state.selectedCourses.map(id=>courseBy(id)?.name).filter(Boolean),revisit=state.revisitWhen==='직접 정하기'?state.revisitCustom:state.revisitWhen,r=state.reflection;
  return `나의 진로 가설 카드\n- 반복해서 확인할 행동: ${actions.join(', ')||'아직 선택 전'}\n- 관심 대상: ${targets.join(', ')||'아직 선택 전'}\n- 현재 행동 가설: ${approvedHypotheses().join(' / ')||'직접 확인 중'}\n- 또래 관찰 참고: ${state.peerMemory||'없음'}\n- 비교한 직업: ${job?.name||'아직 선택 전'}\n- 확인해 볼 과목: ${courses.join(', ')||'아직 선택 전'}\n- 선택한 미니 실험: ${exp?.title||'아직 선택 전'}\n- 확인하려는 점: ${state.plan.why||'아직 작성 전'}\n- 진행 상태: ${r.status}\n- 실제로 한 일: ${r.did||'활동 후 작성'}\n- 내가 맡은 핵심 행동: ${r.coreAction||'활동 후 작성'}\n- 재미있었던 점: ${r.fun||'활동 후 작성'}\n- 힘들었던 점: ${r.hard||'활동 후 작성'}\n- 피드백 후 바꾼 점: ${r.change||'활동 후 작성'}\n- 다시 해볼 의향: ${r.again}\n- 아직 확인할 질문: ${r.nextQuestion||state.plan.question||'아직 작성 전'}\n- 현재 판단: ${r.finalDecision}\n- 다시 살펴볼 시점: ${revisit||'정하지 않음'}`;
}
function renderSummary(){
  const job=jobBy(state.selectedJob),exp=expBy(state.selectedExperiment),actions=state.preferredActions.map(id=>prefBy(id)?.label).filter(Boolean).join(', '),targets=state.targets.map(id=>targetBy(id)?.label).filter(Boolean).join(', '),courses=state.selectedCourses.map(id=>courseBy(id)?.name).filter(Boolean).join(', '),revisit=state.revisitWhen==='직접 정하기'?state.revisitCustom:state.revisitWhen,r=state.reflection;
  $('#summaryCard').innerHTML=`<dl><dt>반복해서 확인할 행동</dt><dd>${esc(actions||'아직 선택 전')}</dd><dt>관심 대상</dt><dd>${esc(targets||'아직 선택 전')}</dd><dt>현재 행동 가설</dt><dd>${esc(approvedHypotheses().join(' / ')||'직접 확인 중')}</dd><dt>또래 관찰 참고</dt><dd>${esc(state.peerMemory||'없음')}</dd><dt>비교한 직업</dt><dd>${esc(job?.name||'아직 선택 전')}</dd><dt>확인해 볼 과목</dt><dd>${esc(courses||'아직 선택 전')}</dd><dt>선택한 미니 실험</dt><dd>${esc(exp?.title||'아직 선택 전')}</dd><dt>확인하려는 점</dt><dd>${esc(state.plan.why||'아직 작성 전')}</dd><dt>진행 상태</dt><dd>${esc(r.status)}</dd><dt>실제로 한 일</dt><dd>${esc(r.did||'활동 후 작성')}</dd><dt>핵심 행동</dt><dd>${esc(r.coreAction||'활동 후 작성')}</dd><dt>재미있었던 점</dt><dd>${esc(r.fun||'활동 후 작성')}</dd><dt>힘들었던 점</dt><dd>${esc(r.hard||'활동 후 작성')}</dd><dt>피드백 후 바꾼 점</dt><dd>${esc(r.change||'활동 후 작성')}</dd><dt>다시 해볼 의향</dt><dd>${esc(r.again)}</dd><dt>다음 질문</dt><dd>${esc(r.nextQuestion||state.plan.question||'활동 후 작성')}</dd><dt>현재 판단</dt><dd>${esc(r.finalDecision)}</dd><dt>다시 살펴볼 시점</dt><dd>${esc(revisit||'정하지 않음')}</dd></dl>`;
}

async function copyText(text,success){
  try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else throw new Error('clipboard unavailable');alert(success);}
  catch{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();if(ok)alert(success);else prompt('자동 복사가 되지 않았습니다. 아래 내용을 직접 복사하세요.',text);}
}
$('#copySummary').onclick=()=>copyText(summaryText(),'요약을 복사했습니다.');
$('#copyAiPrompt').onclick=()=>{const prompt=`아래 내용은 내가 직접 확인하고 선택한 진로 탐색 결과입니다. 없는 경험이나 성과를 추가하지 마세요. 적성이나 진로를 확정하지 말고, 추가로 확인할 질문과 학교 안에서 비용 없이 할 수 있는 작은 실험만 제안해 주세요.\n\n${summaryText()}\n\n다음 형식으로 답해 주세요.\n1. 추가로 확인할 질문 3개\n2. 학교 안에서 비용 없이 할 수 있는 활동 3개\n3. 각 활동으로 확인할 수 있는 점\n4. 결과를 과장하거나 진로를 단정하지 말 것`;copyText(prompt,'선택적 추가 탐색용 프롬프트를 복사했습니다. 외부 AI에 붙여넣기 전 개인정보가 없는지 다시 확인하세요.')};

function anonymousRecord(){return{type:'career-lab-anonymous-result',version:1,resultId:state.resultId,createdAt:state.createdAt,startType:state.startType,preferredActions:[...state.preferredActions],targets:[...state.targets],selectedJob:state.selectedJob,selectedExperiment:state.selectedExperiment,selectedCourses:[...state.selectedCourses],finalDecision:state.reflection.finalDecision,status:state.reflection.status};}
function downloadJson(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
$('#exportAnonymous').onclick=()=>downloadJson(anonymousRecord(),`career-result-${state.resultId.slice(0,8)}.json`);
$('#copyAnonymous').onclick=()=>copyText(JSON.stringify(anonymousRecord()),'개인정보가 없는 익명 제출 코드를 복사했습니다.');

function bridgeData(){return{version:2,approvedActions:state.preferredActions,targets:state.targets,selectedCourses:state.selectedCourses,jobGroup:jobBy(state.selectedJob)?.name||'',experiment:expBy(state.selectedExperiment)?.title||'',questionSeed:state.reflection.nextQuestion||state.plan.question||'',unknown:state.reflection.hard||'',coreAction:state.reflection.coreAction||'',change:state.reflection.change||''}}
$('#goKeyword').onclick=async()=>{
  const bridgeStore=state.device==='public'?sessionStorage:localStorage;bridgeStore.setItem(BRIDGE_KEY,JSON.stringify(bridgeData()));const path=D.config.keywordPath;
  if(location.protocol==='file:'){await copyText(JSON.stringify(bridgeData(),null,2),'연계 데이터를 복사했습니다. 같은 폴더의 keyword.html을 직접 열고 붙여넣으세요.');return;}
  try{const res=await fetch(path,{method:'HEAD'});if(!res.ok)throw new Error();window.location.href=path;}catch{downloadJson(bridgeData(),'career-keyword-bridge.json');alert('keyword.html을 찾지 못해 연계 데이터를 JSON 파일로 저장했습니다. README의 연결 방법을 확인하세요.');}
};
$('#printBtn').onclick=()=>{renderStep5();window.print()};

function countList(records,key){const m={};records.forEach(r=>(r[key]||[]).forEach(v=>m[v]=(m[v]||0)+1));return m}
function countSingle(records,key){const m={};records.forEach(r=>{const v=r[key]||'미선택';m[v]=(m[v]||0)+1});return m}
function makeReference(records){return{type:'career-lab-class-reference',version:1,createdAt:new Date().toISOString(),total:records.length,actions:countList(records,'preferredActions'),targets:countList(records,'targets'),jobs:countSingle(records,'selectedJob'),experiments:countSingle(records,'selectedExperiment'),courses:countList(records,'selectedCourses'),decisions:countSingle(records,'finalDecision')}}
function getClassReference(){try{return JSON.parse(localStorage.getItem(CLASS_REFERENCE_KEY)||'null')}catch{return null}}
function labelFor(group,id){if(group==='actions')return prefBy(id)?.label||id;if(group==='targets')return targetBy(id)?.label||id;if(group==='jobs')return jobBy(id)?.name||id;if(group==='experiments')return expBy(id)?.title||id;if(group==='courses')return courseBy(id)?.name||id;return id}
function chartHtml(title,obj,group,own=[]){const entries=Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]).slice(0,10),max=Math.max(1,...entries.map(x=>x[1]));return `<section class="chart-card"><h4>${esc(title)}</h4>${entries.length?entries.map(([id,n])=>`<div class="bar-row ${own.includes(id)?'my-choice':''}"><span>${esc(labelFor(group,id))}${own.includes(id)?' · 나':''}</span><div class="bar-track"><i style="width:${Math.max(4,n/max*100)}%"></i></div><b>${n}</b></div>`).join(''):'<p class="help">자료가 없습니다.</p>'}</section>`}
function renderStudentComparison(container){
  if(!container)return;const ref=getClassReference();if(!ref){container.innerHTML='<div class="empty-state">교사가 제공한 학급 비교 자료를 불러오면 익명 선택 분포가 표시됩니다.</div>';return}
  container.innerHTML=`<p class="help">익명 집계 ${ref.total}명 기준 · 우열이나 적합도 비교가 아닙니다.</p>${chartHtml('관심 직무 행동',ref.actions,'actions',state.preferredActions)}${chartHtml('관심 대상',ref.targets,'targets',state.targets)}${chartHtml('확인해 볼 과목',ref.courses,'courses',state.selectedCourses)}`;
}

$('#classReferenceBtn').onclick=()=>{$('#classReferenceMessage').textContent='';$('#classReferenceDialog').showModal()};
async function parseFileInput(input){const files=[...(input.files||[])],out=[],errors=[];for(const f of files){try{out.push(JSON.parse(await f.text()))}catch{errors.push(f.name)}}return {items:out,errors}}
$('#importClassReference').onclick=async()=>{
  const parsed=await parseFileInput($('#classReferenceFile'));const fileObjs=parsed.items;let obj=fileObjs[0];if(!obj&&$('#classReferencePaste').value.trim()){try{obj=JSON.parse($('#classReferencePaste').value)}catch{}}
  if(parsed.errors.length)$('#classReferenceMessage').textContent=`형식 오류로 제외된 파일: ${parsed.errors.join(', ')}. `;if(!obj||obj.type!=='career-lab-class-reference'){return $('#classReferenceMessage').textContent+= '올바른 학급 비교 JSON이 아닙니다.'}
  localStorage.setItem(CLASS_REFERENCE_KEY,JSON.stringify(obj));$('#classReferenceMessage').textContent+=`${obj.total}명의 익명 집계를 불러왔습니다.`;renderStudentComparison($('#studentComparison'));renderStudentComparison($('#finalComparison'));
};
$('#clearClassReference').onclick=()=>{localStorage.removeItem(CLASS_REFERENCE_KEY);$('#classReferenceMessage').textContent='학급 비교 자료를 삭제했습니다.';renderStudentComparison($('#studentComparison'));renderStudentComparison($('#finalComparison'))};

function loadClassRecords(){try{return JSON.parse(localStorage.getItem(CLASS_RECORDS_KEY)||'[]')}catch{return[]}}
function saveClassRecords(records){localStorage.setItem(CLASS_RECORDS_KEY,JSON.stringify(records))}
function normalizeRecords(items){const flat=Array.isArray(items)?items:[items];return flat.flatMap(x=>x?.type==='career-lab-anonymous-result'?[x]:Array.isArray(x)?normalizeRecords(x):[])}
function renderDashboard(){
  const records=loadClassRecords(),ref=makeReference(records);$('#dashboardSummary').innerHTML=`<div class="metric"><strong>${records.length}</strong><span>익명 결과 수</span></div><div class="metric"><strong>${Object.keys(ref.actions).length}</strong><span>선택된 행동 종류</span></div><div class="metric"><strong>${Object.keys(ref.jobs).filter(x=>x!=='미선택').length}</strong><span>탐색 직업 수</span></div>`;
  $('#dashboardCharts').innerHTML=chartHtml('직무 행동 분포',ref.actions,'actions')+chartHtml('관심 대상 분포',ref.targets,'targets')+chartHtml('직업 탐색 분포',ref.jobs,'jobs')+chartHtml('미니 실험 분포',ref.experiments,'experiments')+chartHtml('과목 탐색 분포',ref.courses,'courses')+chartHtml('최종 판단 분포',ref.decisions,'decisions');
}
$('#teacherDashboardBtn').onclick=()=>{renderDashboard();$('#teacherDashboardDialog').showModal()};
$('#importStudentRecords').onclick=async()=>{
  const parsed=await parseFileInput($('#studentRecordFiles'));const fileObjs=parsed.items;let pasted=[];const txt=$('#studentRecordPaste').value.trim();if(txt){try{const p=JSON.parse(txt);pasted=Array.isArray(p)?p:[p]}catch{pasted=txt.split(/\n+/).map(x=>{try{return JSON.parse(x)}catch{return null}}).filter(Boolean)}}
  const incoming=normalizeRecords([...fileObjs,...pasted]),existing=loadClassRecords(),map=new Map(existing.map(r=>[r.resultId,r]));incoming.forEach(r=>map.set(r.resultId,r));saveClassRecords([...map.values()]);const errorMsg=parsed.errors.length?` 형식 오류로 제외: ${parsed.errors.join(', ')}.`:'';$('#dashboardMessage').textContent=`${incoming.length}개를 읽었고, 중복을 제외해 총 ${map.size}개를 보관합니다.${errorMsg}`;renderDashboard();
};
$('#exportClassReference').onclick=()=>downloadJson(makeReference(loadClassRecords()),'career-class-reference.json');
$('#exportClassCsv').onclick=()=>{const r=makeReference(loadClassRecords()),rows=[['구분','항목','인원']];for(const group of ['actions','targets','jobs','experiments','courses','decisions'])Object.entries(r[group]).forEach(([id,n])=>rows.push([group,labelFor(group,id),n]));const csv='\ufeff'+rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='career-class-dashboard.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)};
$('#clearDashboardData').onclick=()=>{if(confirm('교사 기기에 저장된 익명 학급 집계 자료를 모두 삭제할까요?')){localStorage.removeItem(CLASS_RECORDS_KEY);renderDashboard();$('#dashboardMessage').textContent='삭제했습니다.'}};

$('#importGalleryExamples').onclick=()=>{try{const arr=JSON.parse($('#galleryImportPaste').value);if(!Array.isArray(arr))throw new Error();const validActions=new Set(D.preferredActions.map(a=>a.id));const rejected=[];const safe=arr.filter((x,i)=>{const ok=x&&x.title&&x.action&&x.summary&&validActions.has(x.action);if(!ok)rejected.push(i+1);return ok}).map(x=>({id:x.id||uid(),title:String(x.title).slice(0,100),action:x.action,targets:Array.isArray(x.targets)?x.targets.filter(t=>D.targets.some(d=>d.id===t)).slice(0,3):[],duration:String(x.duration||''),summary:String(x.summary).slice(0,500),result:String(x.result||'').slice(0,300),reflection:String(x.reflection||'').slice(0,500)}));localStorage.setItem(GALLERY_KEY,JSON.stringify([...approvedGallery(),...safe]));$('#galleryAdminMessage').textContent=`승인 사례 ${safe.length}개를 추가했습니다.${rejected.length?` action 값 오류 등으로 제외된 항목: ${rejected.join(', ')}번`:''}`;renderGallery()}catch{$('#galleryAdminMessage').textContent='JSON 배열 형식을 확인하세요.'}};
$('#exportGalleryExamples').onclick=()=>downloadJson(approvedGallery(),'career-approved-gallery.json');
$('#clearGalleryExamples').onclick=()=>{if(confirm('교사 기기에 저장된 승인 사례를 삭제할까요?')){localStorage.removeItem(GALLERY_KEY);$('#galleryAdminMessage').textContent='승인 사례를 삭제했습니다.';renderGallery()}};

function clearAll(silent=false){localStorage.removeItem(STATE_KEY);sessionStorage.removeItem(STATE_KEY);localStorage.removeItem(BRIDGE_KEY);state=defaultState();if(!silent)location.reload();else location.reload()}
$('#clearBtn').onclick=()=>$('#clearDialog').showModal();$('#confirmClear').onclick=e=>{e.preventDefault();clearAll()};

resetInactivity();
})();
