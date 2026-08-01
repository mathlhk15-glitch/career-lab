(()=>{
'use strict';
const keys={bridge:'careerLabBridgeV2',keyword:'careerLabKeywordV1',inquiry:'careerLabInquiryV1',roadmap:'careerLabRoadmapV1',submission:'careerLabSubmissionV1',mode:'careerLabStorageModeV1'};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function getMode(){return sessionStorage.getItem(keys.mode)||localStorage.getItem(keys.mode)||'private'}
function stores(){return getMode()==='public'?[sessionStorage]:[localStorage,sessionStorage]}
function read(key){for(const st of stores()){try{const v=st.getItem(key);if(v)return JSON.parse(v)}catch{}}return null}
function write(key,value){const st=getMode()==='public'?sessionStorage:localStorage;st.setItem(key,JSON.stringify(value));return value}
function removeAll(){Object.values(keys).forEach(k=>{localStorage.removeItem(k);sessionStorage.removeItem(k)})}
function download(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),400)}
async function copy(text,msg='복사했습니다.'){try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else throw 0;alert(msg)}catch{prompt('아래 내용을 직접 복사하세요.',text)}}
function nav(active){return `<nav class="flow-nav no-print" aria-label="학생 성장 로드맵"><a href="index.html" ${active==='career'?'aria-current="page"':''}>STEP 0 진로 가설</a><a href="keyword.html" ${active==='keyword'?'aria-current="page"':''}>STEP 1 질문 만들기</a><a href="inquiry.html" ${active==='inquiry'?'aria-current="page"':''}>STEP 2 탐구 설계</a><a href="roadmap.html" ${active==='roadmap'?'aria-current="page"':''}>STEP 3 성장 로드맵</a><a href="submission.html" ${active==='submission'?'aria-current="page"':''}>STEP 4 최종 제출</a><a href="guide.html">사용 안내</a></nav>`}
function mountNav(active){const el=document.querySelector('[data-flow-nav]');if(el)el.innerHTML=nav(active)}
function setStatus(id,text,type='info'){const el=document.getElementById(id);if(!el)return;el.textContent=text;el.className=`notice ${type}`}
window.FLOW={keys,esc,read,write,download,copy,removeAll,mountNav,setStatus,getMode};
})();
