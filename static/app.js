function solaOpenGameCenter(){try{sessionStorage.setItem('sola_game_return',location.pathname+location.search+location.hash)}catch(e){}location.assign('/games')}
try{themeApply(localStorage.getItem('sola2-theme')||'sunset')}catch{themeApply('sunset')}
const root=document.getElementById('app');
const state={connectionLost:false,noticeOnlyImportant:false,me:null,csrf:'',view:'home',chatId:null,chatName:'',chatKind:'',timer:null,officialAdmin:false,avatarVersion:Date.now(),unreadNotifications:0,notificationFilter:'all'};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const $=(selector,base=document)=>base.querySelector(selector);
function add(parent,...nodes){nodes.forEach(n=>parent.append(n));return parent}
function button(text,handler,cls='btn'){const n=el('button',cls,text);n.type='button';n.onclick=handler;return n}
function avatar(name,small=false,userId=null){const a=el('div','avatar'+(small?' small':''),(name||'?').slice(0,1).toUpperCase());if(userId){const img=el('img','avatar-image');img.alt=name+'のアイコン';img.loading='lazy';img.src='/api/avatars/'+encodeURIComponent(userId)+'?v='+state.avatarVersion;img.onerror=async()=>img.remove();a.append(img)}return a}

function field(placeholder,type='text'){const x=el('input','field');x.placeholder=placeholder;x.type=type;return x}
function title(text,actions=[]){const bar=el('div','top');add(bar,el('h1','',text));if(actions.length)add(bar,add(el('div','topactions'),...actions));return bar}
function card(...children){return add(el('div','card'),...children)}
function message(text,kind='note'){return el('div',kind,text)}
function setError(box,text){box.textContent=text||''}
async function api(url,method='GET',data){
  const opt={method,headers:{'X-CSRF-Token':state.csrf}};
  if(data!==undefined){opt.headers['Content-Type']='application/json';opt.body=JSON.stringify(data)}
  let res,lastError;
  for(let attempt=0;attempt<(method==='GET'?3:1);attempt++){
    try{const started=performance.now();res=await fetch(url,opt);state.connectionLost=false;connectionBanner(false);
      const timing=res.headers.get('Server-Timing');const m=timing?.match(/dur=([\d.]+)/);
      if(url.startsWith('/api/')){sola26Metrics.push({path:url.split('?')[0],ms:m?Number(m[1]):Math.round(performance.now()-started)});if(sola26Metrics.length>60)sola26Metrics.shift()}
      if(method==='GET'&&[502,503,504].includes(res.status)&&attempt<2){await new Promise(r=>setTimeout(r,250*(attempt+1)));continue}
      break;
    }catch(e){lastError=e;state.connectionLost=true;connectionBanner(true);if(attempt<2&&method==='GET'){await new Promise(r=>setTimeout(r,250*(attempt+1)));continue}throw new Error('通信できなかったよ。再接続してね')}
  }
  if(!res)throw lastError||new Error('通信エラー');
  const json=await res.json().catch(async()=>({}));if(!res.ok)throw new Error(json.error||'操作に失敗したよ（'+res.status+'）');
  if(json.csrf)state.csrf=json.csrf;return json;
}
// v49: Theme-aware dialogs replace browser prompt/confirm/alert.
// Promises are queued to avoid overlapping modals.
let sola49DialogQueue=Promise.resolve();
function sola49Dialog(kind,text,defaultValue=''){
  const run=async()=>new Promise(resolve=>{
    const overlay=el('div','sola49-overlay');
    const panel=el('div','sola49-dialog');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    const heading=el('h2','sola49-dialog-title',kind==='prompt'?'入力':kind==='confirm'?'確認':'お知らせ');
    const msg=el('p','sola49-dialog-message',text);
    const controls=el('div','sola49-dialog-actions');
    const input=kind==='prompt'?el('textarea','sola49-dialog-input'):null;
    if(input){input.value=String(defaultValue??'');input.rows=String(text).length>90?3:2;input.setAttribute('aria-label',String(text));}
    let done=false;const finish=value=>{if(done)return;done=true;document.removeEventListener('keydown',key);overlay.remove();resolve(value)};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();finish(kind==='prompt'?null:false)}else if(e.key==='Enter'&&kind==='prompt'&&!e.shiftKey){e.preventDefault();finish(input.value)}};
    document.addEventListener('keydown',key);
    if(kind!=='alert')controls.append(button('キャンセル',async()=>finish(kind==='prompt'?null:false),'sola49-dialog-cancel'));
    controls.append(button('OK',async()=>finish(kind==='prompt'?input.value:true),'sola49-dialog-ok'));
    panel.append(heading,msg);if(input)panel.append(input);panel.append(controls);overlay.append(panel);
    overlay.addEventListener('mousedown',e=>{if(e.target===overlay)finish(kind==='prompt'?null:false)});
    document.body.append(overlay);(input||controls.lastElementChild).focus();
  });
  const next=sola49DialogQueue.then(run,run);sola49DialogQueue=next.then(async()=>{},async()=>{});return next;
}
const sola49Prompt=(message,value='')=>sola49Dialog('prompt',message,value);
const sola49Confirm=message=>sola49Dialog('confirm',message);
const sola49Alert=message=>sola49Dialog('alert',message);

function toast(text){
  let holder=document.getElementById('sola-toast-stack');if(!holder){holder=el('div','sola-toast-stack');holder.id='sola-toast-stack';document.body.append(holder)}
  const item=el('div','sola-toast',text);holder.append(item);setTimeout(async()=>{item.classList.add('leaving');setTimeout(async()=>item.remove(),280)},3800)
}
function groupAvatar(id,name,small=false){
  const pic=avatar(name||'G',small);if(id){const img=el('img','avatar-image');img.src='/api/group-icons/'+id+'?v='+Date.now();img.alt='グループアイコン';img.onerror=async()=>img.remove();pic.append(img)}return pic
}
const draftKey=id=>'sola2-draft-'+state.me.id+'-'+id;
function readDraft(id){try{return localStorage.getItem(draftKey(id))||''}catch{return ''}}
function saveDraft(id,value){try{if(value)localStorage.setItem(draftKey(id),value);else localStorage.removeItem(draftKey(id))}catch{}}
function nickName(u){return u.nickname||u.username}
function applyBubbleColor(){if(!state.me)return;const c=localStorage.getItem('sola2-bubble-'+state.me.id)||'#ffd2d0';document.documentElement.style.setProperty('--sola-my-bubble',c)}
let noticeStarted=false,noticeBaseline=null;
async function pollInAppNotices(){if(!state.me)return;try{
 const data=await api('/api/notifications');const items=data.notifications||[];
 if(noticeBaseline===null){noticeBaseline=items.length?Math.max(...items.map(n=>n.id)):0;return}
 const fresh=items.filter(n=>n.id>noticeBaseline && !n.is_read && !(n.kind==='message'&&n.chat_kind==='group')).reverse();
 if(items.length)noticeBaseline=Math.max(noticeBaseline,...items.map(n=>n.id));
 const importantKinds=['group_request','group_decision','transfer','group_admin'];
 fresh.slice(-4).forEach(n=>{
   if(state.noticeOnlyImportant&&!importantKinds.includes(n.kind))return;
   if(document.visibilityState==='visible')toast('🔔 '+n.text);
   else if('Notification' in window&&Notification.permission==='granted'&&window.isSecureContext){
     try{const note=new Notification('SOLA CHAT',{body:n.text,icon:'/static/sola-icon.png',tag:'sola-notice-'+n.id});note.onclick=async()=>{window.focus();openNotificationTarget(n).catch(e=>toast(e.message));note.close()}}catch{}
   }
 });
 updateNotificationBadge();
 }catch{}}
// 通知から対象の画面へ移動する。参加権限の確認は既存APIに任せる。
async function openNotificationTarget(n){
  if(n.chat_id){
    const list=await api('/api/chats');
    const chat=(list.chats||[]).find(c=>Number(c.id)===Number(n.chat_id));
    if(chat){openChat(chat.id,chat.name,chat.kind);return}
    toast('このチャットは現在開けないよ');navigate('chats');return
  }
  if(n.kind==='friend_request'||n.kind==='friend_accept'){navigate('notifications');return}
  if(n.actor_id){navigate('search');const main=document.querySelector('main');if(main)await renderUserProfile(main,n.actor_id);return}
  navigate('notifications');
}
function startInAppNotices(){if(noticeStarted)return;noticeStarted=true;setInterval(pollInAppNotices,10000);setInterval(sola44PollInvites,4500);sola44PollInvites()}

let sola44ShownInvites=new Set();
async function sola44PollInvites(){
 if(!state.me)return;
 try{const r=await fetch('/game-api/me',{cache:'no-store'});if(!r.ok)return;const data=await r.json();
 for(const m of (data.matches||[])){
  if(m.status!=='pending'||m.me!=='guest'||sola44ShownInvites.has(m.id))continue;
  sola44ShownInvites.add(m.id);
  const overlay=el('div','sola44-invite-overlay');const panel=el('div','sola44-invite-dialog');
  const label={ttt:'○×ゲーム',connect4:'四目並べ',reversi:'リバーシ'}[m.game]||m.game;
  panel.append(el('h2','','🎮 対戦への招待'),el('p','',m.host+' さんから「'+label+'」への招待が届いたよ。5分以内に返事をしてね。'));
  const actions=el('div','sola44-invite-actions');
  const respond=async accept=>{try{await api('/game-api/respond','POST',{id:m.id,accept});overlay.remove();toast(accept?'招待に参加したよ。ゲームセンターを開いてね。':'招待を辞退したよ');if(accept)solaOpenGameCenter()}catch(e){toast(e.message);overlay.remove()}};
  actions.append(button('参加',async()=>respond(true),'btn'),button('辞退',async()=>respond(false),'btn secondary'),button('あとで',async()=>overlay.remove(),'btn secondary'));
  panel.append(actions);overlay.append(panel);document.body.append(overlay);
 }
 }catch(e){console.warn('match invite polling',e)}
}

function stopTimer(){if(state.timer){clearInterval(state.timer);state.timer=null}if(state.contextCleanup)state.contextCleanup()}
function navigate(view,replace=false){if(view==='notifications'){sola47OpenNotifications();return}if(typeof solaQrScannerClose==='function')solaQrScannerClose();stopTimer();state.view=view;state.chatId=null;render();solaSetPath(solaPagePaths[view]||'/chats',replace)}
function solaReturnToChatHome(){
  state.sola43DashTab=state.chatKind==='dm'?'dm':'group';
  navigate('home');
}
// The status button stays in place; details appear in a small anchored popover.
// v52: live server health, sampled about every two seconds while visible.
const sola52Health={ok:null,ms:null,http:null,checked:0,pending:false};
async function sola52CheckHealth(){
  if(sola52Health.pending)return;
  if(!navigator.onLine){Object.assign(sola52Health,{ok:false,ms:null,http:null,checked:Date.now()});window.dispatchEvent(new Event('sola-health-change'));return}
  sola52Health.pending=true;
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),1800);
  const started=performance.now();
  try{
    const res=await fetch('/api/me',{cache:'no-store',signal:controller.signal});
    Object.assign(sola52Health,{ok:res.ok,ms:Math.round(performance.now()-started),http:res.status,checked:Date.now()});
  }catch(e){Object.assign(sola52Health,{ok:false,ms:null,http:null,checked:Date.now()})}
  finally{clearTimeout(timeout);sola52Health.pending=false;window.dispatchEvent(new Event('sola-health-change'))}
}
let sola52HealthTimer=null;
function sola52StartHealth(){
  if(sola52HealthTimer!==null)return;
  sola52CheckHealth();
  sola52HealthTimer=setInterval(()=>{if(!document.hidden)sola52CheckHealth()},2000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sola52CheckHealth()});
  window.addEventListener('online',sola52CheckHealth);
  window.addEventListener('offline',sola52CheckHealth);
}
function sola52HealthLabel(){
  if(!navigator.onLine||sola52Health.ok===false)return ['● オフライン','offline'];
  if(sola52Health.ok===null)return ['● 確認中','checking'];
  if(sola52Health.ms>=500)return ['● 接続が遅い','slow'];
  if(sola52Health.ms>=200)return ['● 接続普通','normal'];
  return ['● 接続良好','good'];
}
function solaConnectionControl(){
  sola52StartHealth();
  const wrapper=el('span','sola48-connection-wrap');
  const trigger=button('● 確認中',()=>toggle(),'sola48-connection-trigger');
  trigger.setAttribute('aria-label','接続状態の詳細');
  trigger.setAttribute('aria-expanded','false');
  // Attach to body to avoid clipping under the chat header or message composer.
  const popup=el('div','sola48-connection-popup sola52-floating-popup');popup.hidden=true;
  popup.setAttribute('role','status');document.body.append(popup);
  const position=()=>{
    if(popup.hidden||!trigger.isConnected)return;
    const r=trigger.getBoundingClientRect();
    const width=popup.offsetWidth||210;const height=popup.offsetHeight||120;
    let left=Math.max(8,Math.min(r.left,window.innerWidth-width-8));
    let top=r.bottom+8;
    if(top+height>window.innerHeight-8)top=Math.max(8,r.top-height-8);
    popup.style.left=left+'px';popup.style.top=top+'px';
  };
  const update=()=>{
    const [label,kind]=sola52HealthLabel();trigger.textContent=label;
    trigger.classList.remove('offline','normal','slow','checking');
    if(kind!=='good')trigger.classList.add(kind);
    if(!popup.hidden){
      const status=kind==='good'?'良好':kind==='normal'?'普通':kind==='slow'?'遅い':kind==='checking'?'確認中':'オフライン';
      popup.replaceChildren(el('strong','','接続情報'),el('p','','状態：'+status),el('p','','応答時間：'+(sola52Health.ms===null?'測定不可':sola52Health.ms+' ms')),el('p','','HTTP：'+(sola52Health.http??'—')));
      position();
    }
  };
  const close=()=>{popup.hidden=true;trigger.setAttribute('aria-expanded','false')};
  const toggle=()=>{if(!popup.hidden){close();return}popup.hidden=false;trigger.setAttribute('aria-expanded','true');update();position()};
  const onOutside=e=>{if(!wrapper.contains(e.target)&&!popup.contains(e.target))close()};
  const onEscape=e=>{if(e.key==='Escape')close()};
  const cleanup=()=>{popup.remove();window.removeEventListener('sola-health-change',update);document.removeEventListener('click',onOutside);document.removeEventListener('keydown',onEscape);window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true)};
  wrapper.append(trigger);update();
  window.addEventListener('sola-health-change',update);
  document.addEventListener('click',onOutside);document.addEventListener('keydown',onEscape);
  window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
  const observer=new MutationObserver(()=>{if(!wrapper.isConnected){observer.disconnect();cleanup()}});
  // Observe after insertion, otherwise a later render would immediately clean it up.
  queueMicrotask(()=>{if(wrapper.isConnected)observer.observe(document.getElementById('app'),{childList:true,subtree:true});else cleanup()});
  return wrapper;
}

function copyText(value){navigator.clipboard?.writeText(value).then(async()=>toast('リンクをコピーしたよ')).catch(async()=>await sola49Prompt('このリンクをコピーしてね',value))}
function applyBubbleShape(){document.documentElement.dataset.bubbleShape='round'}
function connectionBanner(lost){let b=document.getElementById('sola-connection-banner');if(lost){if(!b){b=el('div','sola-connection-banner','通信が切れているよ。再接続を待ってね…');b.id='sola-connection-banner';document.body.append(b)}}else if(b){b.remove();toast('通信が復旧したよ')}}
window.addEventListener('offline',async()=>connectionBanner(true));window.addEventListener('online',async()=>{connectionBanner(false);if(state.me){updateNotificationBadge();if(state.chatId)render()}});
function brandIcon(size='normal'){const img=el('img','sola-logo '+size);img.src='/static/sola-icon.png';img.alt='SOLA CHAT ホーム';return img}
/* SOLA26 FRONTEND — self-contained UI helpers */
const sola26Metrics=[];
function sola26Empty(text){return el('div','sola26-empty',text)}
function sola26LinkPreview(text){
  const match=String(text||'').match(/https?:\/\/[^\s<>"']+/i);if(!match)return null;
  let url;try{url=new URL(match[0].replace(/[.,!?。、]+$/,''));if(!['http:','https:'].includes(url.protocol))return null}catch{return null}
  const a=el('a','sola26-link');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer nofollow';
  a.append(el('span','sola26-link-title','🔗 '+url.hostname),el('span','sola26-link-url',url.href.slice(0,160)));
  return a;
}
function sola26ShowMaintenance(){
  if(!state.me)return;
  api('/api/sola26/maintenance').then(r=>{
    let b=document.getElementById('sola26-maintenance');
    if(!r.message){b?.remove();return}
    if(!b){b=el('div','sola26-maintenance');b.id='sola26-maintenance';document.body.prepend(b)}
    b.textContent='🛠️ '+r.message;
  }).catch(async()=>{});
}
function sola26BackTop(main){
  const btn=button('↑ ページ上部へ',async()=>{main.scrollTo({top:0,behavior:'smooth'});window.scrollTo({top:0,behavior:'smooth'})},'sola26-back-top');
  main.append(btn);
}
async function sola26HealthUI(main){
  const box=card(el('h3','','🖥️ サーバー稼働状況'));main.append(box);
  const result=el('p','subtle','読み込み中…');box.append(result);
  const refresh=async()=>{try{const r=await api('/api/sola26/health');result.textContent='DB: '+r.database+' ('+r.backend+') / 応答: '+r.db_ms+'ms'}catch(e){result.textContent=e.message}};
  box.append(button('再計測',refresh,'btn secondary small'));await refresh();
  const note=card(el('h3','','🛠️ メンテナンスのお知らせ'));
  const input=field('メンテナンス予定・空欄で解除');input.maxLength=300;
  const current=await api('/api/sola26/maintenance').catch(async()=>({message:''}));input.value=current.message||'';
  note.append(input,button('お知らせを保存',async()=>{try{await api('/api/sola26/maintenance','POST',{message:input.value});toast('保存したよ');sola26ShowMaintenance()}catch(e){toast(e.message)}},'btn small'));main.append(note);
  const metric=card(el('h3','','⏱️ 最近のAPI応答時間'));
  const list=el('div','sola26-metrics');metric.append(list);
  const draw=async()=>{list.replaceChildren();sola26Metrics.slice(-20).reverse().forEach(x=>list.append(el('div','subtle',x.path+' · '+x.ms+'ms')));if(!sola26Metrics.length)list.append(sola26Empty('まだ計測データがないよ'))};
  metric.append(button('更新',draw,'btn secondary small'));draw();main.append(metric);
}

function render(){
  try{document.documentElement.dataset.theme=localStorage.getItem('sola2-theme')||'sunset'}catch{}
  if(state.me){startInAppNotices();applyBubbleColor();applyBubbleShape();document.body.classList.add('sola-authenticated');sola26ShowMaintenance()}
  stopTimer();root.replaceChildren();if(!state.me){renderAuth();return}
  const shell=el('div','shell'+(state.chatId?' chat-mode':'')),main=el('main','main sola-page-enter');
  if(state.chatId){root.append(add(shell,main));renderChat(main);return}
  // v44.1: clear, consistent SVG navigation icons (no external icon library)
  const solaNavPaths={
    menu:'M4 7h16 M4 12h16 M4 17h16',
    moon:'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
    plus:'M12 5v14 M5 12h14',
    qr:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M21 14v3 M18 20h3 M14 20v1',
    users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    home:'m3 10 9-7 9 7 M5 9v12h14V9 M9 21v-7h6v7',
    chat:'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z',
    groupchat:'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z M8 10h8 M8 14h5',
    bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
    game:'M6 12h4 M8 10v4 M15 11h.01 M18 13h.01 M6 6h12a4 4 0 0 1 3.9 3.2l1 7a3 3 0 0 1-4.8 2.8L15 17H9l-3.1 2a3 3 0 0 1-4.8-2.8l1-7A4 4 0 0 1 6 6z',
    grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    palette:'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 2-2c0-1-.5-1.5-.5-2.2a2 2 0 0 1 2-2H19a3 3 0 0 0 3-3A9 9 0 0 0 12 3z M7.5 11h.01 M10 7h.01 M15 7h.01 M17 11h.01',
    trophy:'M8 21h8 M12 17v4 M7 4h10v7a5 5 0 0 1-10 0z M7 6H4v3a4 4 0 0 0 4 4 M17 6h3v3a4 4 0 0 1-4 4',
    flag:'M5 21V4 M5 5c4-3 8 3 13 0v11c-5 3-9-3-13 0',
    shield:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
    settings:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06-1.87 1.87-.06-.06A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1 .6V21h-6v-2a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06-1.87-1.87.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H2v-4h2a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87L4.2 7.07 6.07 5.2l.06.06A1.7 1.7 0 0 0 8 5.6a1.7 1.7 0 0 0 1-.6V3h6v2a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06 1.87 1.87-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1h2v4h-2a1.7 1.7 0 0 0-.6 1z',
    user:'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2 M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    pencil:'M12 20h9 M16 4l4 4-11 11-5 1 1-5z'
  };
  const solaNavIcon=(name)=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','24');svg.setAttribute('height','24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',solaNavPaths[name]||solaNavPaths.grid);svg.append(path);return svg};
  const sidebar=el('aside','sidebar sola43-sidebar'),bottom=el('nav','bottomnav');
  const header=el('div','sola43-side-header');
  header.append(button('',async()=>{const collapsed=sidebar.classList.toggle('sola43-compact');try{localStorage.setItem('sola44-sidebar-compact',collapsed?'1':'0')}catch{}},'sola43-collapse'),button('☾',async()=>{themeApply(document.documentElement.dataset.theme==='night'?'sunset':'night');render()},'sola43-moon'),button('🌅',async()=>navigate('home'),'sola43-brand'));
  header.querySelector('.sola43-collapse').append(solaNavIcon('menu'));header.querySelector('.sola43-collapse').setAttribute('aria-label','メニューを開閉');header.querySelector('.sola43-collapse').title='メニューを開閉';
  sidebar.append(header);try{if(localStorage.getItem('sola44-sidebar-compact')==='1')sidebar.classList.add('sola43-compact')}catch{}
  const profile=button('',async()=>navigate('profile'),'sola43-side-profile');profile.append(avatar(state.me.username,false,state.me.id));
  const profileInfo=el('div','sola43-profile-info');profileInfo.append(el('strong','',state.me.username),el('small','','マイページを開く'));profile.append(profileInfo,el('span','','✎'));profile.title='マイページ';sidebar.append(profile);
  const group=(heading,items)=>{sidebar.append(el('div','sola43-side-label',heading));items.forEach(([name,ico,action,active])=>{const item=button('',action,'sola43-side-link'+(active?' active':''));const iconWrap=el('span','sola43-side-icon');iconWrap.append(solaNavIcon(ico));item.append(iconWrap,el('span','',name));item.title=name;item.setAttribute('aria-label',name);if(name==='通知'){const count=el('span','sola47-bell-count');count.dataset.notificationCount='';count.hidden=!state.unreadNotifications;count.textContent=String(state.unreadNotifications);item.append(count)}sidebar.append(item)})};
  group('メイン',[
    ['ホーム','home',async()=>navigate('home'),state.view==='home'],
    ...(state.officialAdmin?[['ダッシュボード','shield',async()=>navigate('admin'),state.view==='admin']]:[])
  ]);
  group('新しく始める',[
    ['新しいチャット','plus',async()=>navigate('search'),false],['QRコード','qr',async()=>navigate('join'),false]
  ]);
  group('ツール・表示',[
    ['ゲーム','game',solaOpenGameCenter,false],['テーマ切替','palette',async()=>{themeApply(document.documentElement.dataset.theme==='night'?'sunset':'night');render()},false],['実績バッジ','trophy',async()=>navigate('badges'),state.view==='badges'],['通報','flag',async()=>navigate('reports'),state.view==='reports']
  ]);
  const footer=el('div','sola43-side-footer');footer.append(button('⚙ 設定',async()=>navigate('profile'),'sola43-settings'),button('利用規約',async()=>navigate('profile'),'sola43-terms'));sidebar.append(footer);
  [['home','⌂','ホーム'],['chats','💬','チャット'],['profile','⚙','設定'],['games','🎮','ゲーム']].forEach(([v,ico,name])=>{const item=button('',async()=>v==='games'?solaOpenGameCenter():v==='notifications'?sola47OpenNotifications():navigate(v),state.view===v?'active':'');item.append(el('span','symbol',ico),el('span','',name));if(v==='notifications'){const count=el('span','sola47-bell-count');count.dataset.notificationCount='';count.hidden=!state.unreadNotifications;count.textContent=String(state.unreadNotifications);item.append(count)}bottom.append(item)});
  add(shell,sidebar,main,bottom);root.append(shell);
  if(!state.me.username.startsWith('sola_user_'))solaPhase1ThemeWelcome();
  const home=button('',async()=>navigate('home'),'mobilehome');add(home,brandIcon('mini'),el('span','','SOLA CHAT'));main.append(home);
  ({home:renderSolaHome,chats:renderChats,join:renderJoinGroup,search:renderSearch,notifications:renderNotifications,profile:renderProfile,badges:sola31BadgePage,reports:sola32ReportsPage,admin:renderAdminDashboard}[state.view]||renderChats)(main)
}
async function updateNotificationBadge(){if(!state.me)return;try{const r=await api('/api/notifications/summary');state.unreadNotifications=r.unread;document.querySelectorAll('[data-notification-count]').forEach(b=>{b.textContent=r.unread>99?'99+':String(r.unread);b.hidden=!r.unread})}catch{}}

function renderAuth(){
 const outer=el('div','auth');const box=el('div','authcard sola37-auth');
 box.append(brandIcon('auth-logo'),el('h1','','SOLA CHAT 2.0'),el('p','subtle','ようこそ！ アカウントを準備しよう。'));
 const actions=el('div','stack');const err=el('div','error');
 const create=button('新しくアカウントを作る',async()=>{create.disabled=true;try{const r=await api('/api/sola-id/create','POST',{});state.csrf=r.csrf;sola37ShowId(r.sola_id,true)}catch(e){setError(err,e.message);create.disabled=false}},'btn');
 const restore=button('SOLA-IDを入力して復元',async()=>{
  actions.replaceChildren();const input=field('sola-xxxx-xxxx-xxxx-xxxx');input.autocomplete='off';input.spellcheck=false;
  actions.append(el('p','subtle','保存したSOLA-IDを入力してね。大文字・小文字も区別するよ。'),input,button('このアカウントを復元',async()=>{try{const r=await api('/api/sola-id/restore','POST',{sola_id:input.value});state.me=r.user;state.csrf=r.csrf;state.officialAdmin=Boolean(r.official_admin);render();if(r.setup_pending)sola37Setup();solaStartRoute()}catch(e){setError(err,e.message)}},'btn'),button('戻る',async()=>render(),'btn secondary'));
 },'btn secondary');
 actions.append(create,restore);box.append(actions,err);outer.append(box);root.append(outer);
}
function sola37ShowId(id,needsSetup){
 const overlay=el('div','sola37-overlay');const panel=el('div','sola37-panel');
 panel.append(el('h2','','🔐 SOLA-IDを発行したよ！'),el('p','','このIDをコピーして、安全な場所に保存してね。マイページからも自分だけ確認できるよ。他の人には教えないでね。'));
 const code=el('div','sola37-code',id);panel.append(code);
 panel.append(button('📋 SOLA-IDをコピー',async()=>{try{await navigator.clipboard.writeText(id);toast('コピーしたよ')}catch{sola49Prompt('IDをコピーしてね',id)}},'btn'));
 panel.append(el('p','sola37-warning','⚠️ このIDを知っている人はアカウントを復元できるよ。絶対に公開しないでね。'));
 const check=el('label','sola37-check');const input=el('input');input.type='checkbox';check.append(input,document.createTextNode(' IDを安全な場所に保存しました'));panel.append(check);
 const next=button('SOLA CHATへ進む',async()=>{overlay.remove();if(needsSetup)sola37Setup();else{const r=await api('/api/me');state.me=r.user;state.csrf=r.csrf;state.officialAdmin=Boolean(r.official_admin);render();if(r.setup_pending)sola37Setup();solaStartRoute()}},'btn');next.disabled=true;input.onchange=async()=>next.disabled=!input.checked;panel.append(next);overlay.append(panel);document.body.append(overlay);
}
function sola37Setup(){
 const overlay=el('div','sola37-overlay');const panel=el('div','sola37-panel');
 panel.append(el('h2','','🌅 プロフィールを決めよう'));const name=field('ユーザー名（3〜24文字）');panel.append(name);
 panel.append(el('p','','デザインを選ぼう'));const themes=el('div','row wrap');[['sunset','🌇 夕日'],['pink','🌸 桃'],['night','🌌 夜空']].forEach(([v,label])=>themes.append(button(label,async()=>{themeApply(v);toast(label+'を選択したよ')},'btn secondary small')));panel.append(themes);
 const err=el('div','error');panel.append(err);
 panel.append(button('SOLA CHATを始める',async()=>{try{const r=await api('/api/sola-id/setup','POST',{username:name.value});state.me=r.user;state.csrf=r.csrf;state.officialAdmin=Boolean(r.official_admin);try{localStorage.setItem('sola2-theme-chosen-'+state.me.id,'1')}catch{}overlay.remove();render();solaStartRoute();sola37AvatarPrompt()}catch(e){setError(err,e.message)}},'btn'));
 overlay.append(panel);document.body.append(overlay);
}
function sola37AvatarPrompt(){
 const overlay=el('div','sola37-overlay');const panel=el('div','sola37-panel');panel.append(el('h2','','アイコンを設定しよう'));
 const picker=field('','file');picker.accept='image/png,image/jpeg,image/webp';panel.append(picker);
 const status=el('p','subtle');panel.append(status);
 panel.append(button('アイコンを保存',async()=>{if(!picker.files?.[0])return;const fd=new FormData();fd.append('avatar',picker.files[0]);try{const r=await fetch('/api/avatar',{method:'POST',headers:{'X-CSRF-Token':state.csrf},body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error);state.avatarVersion=Date.now();overlay.remove();render()}catch(e){status.textContent=e.message}},'btn'),button('あとで設定する',async()=>overlay.remove(),'btn secondary'));
 overlay.append(panel);document.body.append(overlay);
}

function sola46Icon(name){
 const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','24');svg.setAttribute('height','24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.9');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
 const paths={plus:['M12 5v14','M5 12h14'],qr:['M3 3h7v7H3z','M14 3h7v7h-7z','M3 14h7v7H3z','M14 14h3','M14 18h3','M21 14v3','M18 21h3','M21 18v3'],group:['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8','M22 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75']};
 for(const d of (paths[name]||paths.plus)){const e=document.createElementNS(ns,'path');e.setAttribute('d',d);svg.append(e)}return svg;
}

function renderSolaHome(main){
 main.classList.add('sola43-main');
 const dash=el('section','sola43-dashboard');
 const top=el('div','sola43-topbar');
 const logo=button('🎮 ゲーム',solaOpenGameCenter,'sola43-game');
 const switcher=el('div','sola43-switcher');
 const setTab=(kind)=>{state.sola43DashTab=kind;render()};
 [['dm','個人'],['group','グループ']].forEach(([v,t])=>switcher.append(button(t,async()=>setTab(v),'sola43-switch'+((state.sola43DashTab||'dm')===v?' active':''))));
 const tools=el('div','sola43-top-tools');tools.append(solaConnectionControl(),button('🔔 お知らせ',async()=>sola47OpenNotifications(),'sola43-notices'));
 top.append(logo,switcher,tools);dash.append(top);
 const kind=state.sola43DashTab||'dm';
 const heading=el('div','sola43-dash-heading');heading.append(el('div','sola45-heading-icon',kind==='dm'?'✦':'✧'),el('h2','',kind==='dm'?'チャットを始めよう':'グループチャット'),el('p','',kind==='dm'?'過去にチャットした相手から選ぶか、新しいチャットを始められるよ':'参加中のグループを開いたり、新しく作成できるよ'));dash.append(heading);
 const actions=el('div','sola43-dash-actions');
 const options=kind==='dm'?[['plus','新しいチャット','ユーザーを選んでチャットを開始',async()=>navigate('search')],['qr','QRを読み取る','QRコードをカメラで読み取る',openQrScanner]]:[['plus','グループ作成','新しいグループを作成',createGroup],['qr','グループに参加','コードからグループに参加',async()=>navigate('join')],['group','公式グループ','公式のグループを探す',async()=>{state.solaChatFilter='official';navigate('chats')}]];
 options.forEach(([symbol,t,detail,fn])=>{const b=button('',fn,'sola43-action');const ico=el('span','sola45-action-icon');ico.append(sola46Icon(symbol));b.append(ico);const content=el('span','sola45-action-copy');content.append(el('strong','',t),el('small','',detail));b.append(content,el('span','sola45-action-arrow','›'));actions.append(b)});dash.append(actions);
 const searchWrap=el('div','sola45-search-wrap');searchWrap.append(el('span','sola45-search-icon','⌕'));const search=el('input','sola43-search');search.placeholder='名前で検索…';search.setAttribute('aria-label','チャット検索');searchWrap.append(search);dash.append(searchWrap);
 const sort=el('div','sola43-sort');const recent=button('◷ 最近順',async()=>{state.sola43Sort='recent';draw()},'');const alpha=button('☷ 名前順',async()=>{state.sola43Sort='name';draw()},'');sort.append(recent,alpha);dash.append(sort);
 const list=el('div','sola43-chat-list');dash.append(list);main.append(dash);
 let chats=[],officialGroups=[],openGroups=[];
 const makeRow=(x,category)=>{
   const row=el('div','sola54-group-row '+(category==='official'?'sola54-official':category==='open'?'sola54-open':''));
   const icon=category==='official'?el('div','sola54-official-icon','★'):x.kind==='group'?groupAvatar(x.id,x.name):avatar(x.name,false,x.other_user_id||null);
   row.append(icon);
   const info=el('div','sola54-info');const head=el('div','sola54-head');head.append(el('strong','',x.name));
   if(category==='official')head.append(el('span','sola54-label official','常設'));
   else if(x.kind==='group')head.append(el('span','sola54-label '+(x.join_mode==='approval'?'approval':'open'),x.join_mode==='approval'?'申請制':'オープン'));
   const members=x.member_count??x.members;
   if((x.kind==='group'||category==='official'||category==='open'||category==='joined')&&members!=null){
     const count=el('span','sola54-members','👥 '+Number(members).toLocaleString('ja-JP')+'人');
     count.title='現在の参加人数（管理者・作成者を含む）';
     head.append(count);
   }
   info.append(head,el('div','sola54-preview',x.last_message||x.description||'メッセージはまだないよ'));
   if(x.last_message_time)info.append(el('small','sola54-time',x.last_message_time));
   row.append(info);
   if(x.unread)row.append(el('span','sola54-unread',x.unread>99?'99+':String(x.unread)));
   if(category==='open')row.append(button('参加',async()=>{try{const result=await api('/api/groups/'+x.id+'/join','POST');if(result.pending){toast('参加申請を送ったよ');return}openChat(x.id,x.name,'group')}catch(e){sola49Alert(e.message)}},'sola54-join'));
   else row.addEventListener('click',()=>category==='official'&&!chats.some(c=>c.id===x.id)?openOrJoin(x.id):openChat(x.id,x.name,x.kind));
   if(category!=='open'){row.setAttribute('role','button');row.tabIndex=0;row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();row.click()}})}
   return row;
 };
 const section=(heading,items,category)=>{const title=el('h3','sola54-section-title',heading);list.append(title);if(!items.length){list.append(el('div','sola54-empty','表示するグループはまだないよ'));return}items.forEach(x=>list.append(makeRow(x,category)))};
 const draw=()=>{
   const q=search.value.trim().toLowerCase();list.replaceChildren();
   recent.classList.toggle('active',state.sola43Sort!=='name');alpha.classList.toggle('active',state.sola43Sort==='name');
   const sorter=(arr)=>{const items=arr.filter(x=>x.name.toLowerCase().includes(q));if(state.sola43Sort==='name')items.sort((a,b)=>a.name.localeCompare(b.name,'ja'));else items.sort((a,b)=>Number(b.id)-Number(a.id));return items};
   if(kind==='group'){
     const joined=chats.filter(x=>x.kind==='group'&&!x.official);
     section('常設チャット（全員が参加できます）',sorter(officialGroups),'official');
     section('参加中のグループチャット（'+joined.length+'）',sorter(joined),'joined');
     section('オープンチャット（誰でも参加できます）',sorter(openGroups),'open');
   }else{
     const items=sorter(chats.filter(x=>x.kind==='dm'));
     if(!items.length)list.append(el('div','sola43-empty',q?'一致するチャットがないよ':'まだ個人チャットがないよ'));
     items.forEach(x=>list.append(makeRow(x,'dm')));
   }
 };
 recent.onclick=()=>{state.sola43Sort='recent';draw()};alpha.onclick=()=>{state.sola43Sort='name';draw()};
 search.addEventListener('input',draw);list.append(el('div','sola43-empty','チャットを読み込み中…'));
 Promise.all([api('/api/chats'),api('/api/groups/official'),api('/api/groups/open-directory')]).then(([r,o,g])=>{if(!dash.isConnected)return;chats=r.chats||[];officialGroups=o.groups||[];openGroups=g.groups||[];draw()}).catch(e=>{if(dash.isConnected)list.replaceChildren(el('div','sola43-empty','読み込めませんでした：'+e.message))});
}

async function renderChats(main){

  add(main,title('チャット',[button('🔑 グループに入る',async()=>navigate('join'),'btn secondary small'),button('＋ グループ作成',createGroup,'btn small')]));
  const loading=card(el('div','sola-skeleton'),el('div','sola-skeleton short'),el('div','sola-skeleton'),el('div','sola-skeleton short'));loading.setAttribute('aria-label','チャットを読み込み中');main.append(loading);
  try{
    const [r,d]=await Promise.all([api('/api/chats'),api('/api/groups/official')]);
      const solaAllChats=(r.chats||[]).slice();
      const solaFilter=state.solaChatFilter||'all';
      if(solaFilter==='dm') {r.chats=solaAllChats.filter(x=>x.kind==='dm');d.groups=[];}
      else if(solaFilter==='group') {r.chats=solaAllChats.filter(x=>x.kind==='group'&&!x.official);d.groups=[];}
      else if(solaFilter==='official') {r.chats=solaAllChats.filter(x=>x.official);}
      loading.remove();
    const official=d.groups.filter(g=>g.official), joinedOfficial=new Set(r.chats.filter(x=>x.official).map(x=>x.id));
    if(official.length){main.append(el('h3','mutedtitle','📌 公式グループ'));const c=card();official.forEach(g=>{const item=chatRow(g.name,'作成者：'+(g.creator||'運営'),true,async()=>joinedOfficial.has(g.id)?openChat(g.id,g.name,'group'):openOrJoin(g.id),true);item.querySelector('.avatar')?.replaceWith(groupAvatar(g.id,g.name));c.append(item)});main.append(c)}
    const list=r.chats.filter(x=>!x.official);
    if(solaFilter!=='official') main.append(el('h3','mutedtitle',solaFilter==='dm'?'チャット一覧（2人）':solaFilter==='group'?'チャット一覧（グループ）':'チャット一覧（2人・グループ）'));
    const c=card();
    if(!list.length && solaFilter!=='official')c.append(sola26Empty('まだチャットがないよ。グループIDを入力して参加するか、友だちを追加しよう！'));
    list.forEach(x=>{
      const row=el('div','chat-list-line');
      const entry=chatRow(x.name,x.kind==='group'?'👥 '+(x.member_count||0)+'人 · '+(x.last_message||'メッセージはまだないよ'):(x.last_message||'メッセージはまだないよ'),false,async()=>openChat(x.id,x.name,x.kind),x.kind==='group',x.other_user_id||null);
      if(x.kind==='group')entry.querySelector('.avatar')?.replaceWith(groupAvatar(x.id,x.name));
      if(x.unread){const count=el('span','unread-count'+(x.kind==='dm'?' dm-unread-count':''),x.unread>99?'99+':String(x.unread));count.title=x.kind==='dm'?'未読のDM '+x.unread+'件':'未読メッセージ '+x.unread+'件';count.setAttribute('aria-label',count.title);entry.append(count);if(x.kind==='dm')entry.classList.add('has-unread-dm')}
      const pin=button(x.pinned?'📌':'📍',async()=>{try{await api('/api/chats/'+x.id+'/pin','POST');renderChatsFresh()}catch(e){sola49Alert(e.message)}},'pin-button');pin.title=x.pinned?'ピン留めを外す':'ピン留めする';pin.setAttribute('aria-label',pin.title);
      row.append(entry,pin);c.append(row)
    });if(solaFilter!=='official')main.append(c)
    // SOLA CHAT LIST AUTO REFRESH 2500MS
    // Poll silently; rebuild the page only when the list actually changes.
    const chatListSignature=chats=>JSON.stringify(chats.map(x=>[
      x.id,x.kind,x.name,x.last_message,x.unread,x.pinned,x.official,
      x.group_code,x.other_user_id,x.creator?.username
    ]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
    let previousSignature=chatListSignature(solaAllChats);
    let inFlight=false;
    state.timer=setInterval(async()=>{
      if(inFlight||state.view!=='chats'||state.chatId||!main.isConnected||document.visibilityState!=='visible')return;
      inFlight=true;
      try{
        const latest=await api('/api/chats');
        if(state.view!=='chats'||state.chatId||!main.isConnected)return;
        const nextSignature=chatListSignature(latest.chats||[]);
        if(nextSignature!==previousSignature){
          previousSignature=nextSignature;
          render(); // render() cancels the old interval before drawing the updated list.
        }
      }catch(e){
        // Keep the existing list visible during a temporary connection failure.
      }finally{inFlight=false}
    },2500);
  }catch(e){loading.replaceChildren(message(e.message))}
}
function renderChatsFresh(){navigate('chats')}
function themeApply(name){
  const allowed=['sunset','pink','night'];if(!allowed.includes(name))name='sunset';
  document.documentElement.dataset.theme=name;
  try{localStorage.setItem('sola2-theme',name)}catch{}
}
function renderThemePanel(main){
  const panel=card(el('h3','mutedtitle','🎨 テーマ切り替え'),el('p','subtle','この端末の表示テーマを変更できるよ。'));
  const controls=el('div','row wrap');
  [['sunset','🌅 夕焼け'],['pink','🌸 ピンク'],['night','🌙 夜空']].forEach(([id,label])=>{
    const b=button(label,async()=>{themeApply(id);main.replaceChildren();renderProfile(main)},'btn secondary small'+(document.documentElement.dataset.theme===id?' chosen-theme':''));controls.append(b)
  });panel.append(controls);main.append(panel)
}
async function copyGroupId(id){
  try{await navigator.clipboard.writeText(String(id));sola49Alert('グループIDをコピーしたよ：'+id)}
  catch{await sola49Prompt('このIDをコピーしてね',String(id))}
}
async function renderGroupManagement(main,id){
  const view=el('div','group-management');main.append(view);
  try{
    const r=await api('/api/groups/'+id+'/members');
    const box=card(el('h3','mutedtitle','グループ管理'));box.classList.add('sola-group-admin-card');
    box.append(el('div','subtle','作成者：'+(r.members.find(x=>x.id===r.chat.creator_id)?.username||'不明')+' · 作成日：'+formatDate(r.chat.created_at)+' · 上限：'+r.chat.max_members+'人'));
    if(r.is_owner)box.append(button('👥 人数上限を変更',async()=>{const n=await sola49Prompt('グループの最大人数（2〜500人）',r.chat.max_members);if(n===null)return;try{await api('/api/groups/'+id+'/capacity','PATCH',{max_members:n});view.remove();renderGroupManagement(main,id)}catch(e){toast(e.message)}},'btn secondary small'));
    const idBar=el('div','row wrap');
    idBar.append(el('span','group-id','グループID：'+r.chat.group_code),button('📋 IDをコピー',async()=>copyGroupId(r.chat.group_code),'btn secondary small'));
    box.append(idBar);
    const qrButton=button('📱 招待QRコード',async()=>{const old=$('.sola-qr',box);if(old){old.remove();return}const img=el('img','sola-qr');img.src='/api/qr?kind=group&id='+id;img.alt='グループ招待QRコード';box.append(img)},'btn secondary small');box.append(qrButton);
    box.append(el('div','subtle','参加方式：'+(r.chat.join_mode==='open'?'オープン制':'申請制')),el('p','subtle',r.chat.description||'説明文はまだないよ'));
    if(r.is_owner){const modeButton=button('⚙️ 参加方式を変更',async()=>{const newMode=await sola53ModeDialog('参加方式を変更',r.chat.join_mode||'approval');if(!newMode)return;try{await api('/api/groups/'+id+'/join-mode','PATCH',{join_mode:newMode});view.remove();renderGroupManagement(main,id);toast('参加方式を変更したよ')}catch(e){sola49Alert(e.message)}},'btn secondary small');box.append(modeButton)}
    if(r.can_manage){const iconPick=field('','file');iconPick.accept='image/png,image/jpeg,image/webp';iconPick.classList.add('hidden-file');iconPick.onchange=async()=>{const f=iconPick.files?.[0];if(!f)return;const fd=new FormData();fd.append('icon',f);try{const response=await fetch('/api/groups/'+id+'/icon',{method:'POST',headers:{'X-CSRF-Token':state.csrf},body:fd});const result=await response.json();if(!response.ok)throw new Error(result.error||'変更できなかったよ');toast('グループアイコンを変更したよ');view.remove();renderGroupManagement(main,id)}catch(e){sola49Alert(e.message)}};box.append(iconPick,button('📷 グループアイコンを変更',async()=>iconPick.click(),'btn secondary small'))}
    if(r.can_manage){const change=button('📝 グループ説明文を編集',async()=>{const description=await sola49Prompt('グループ説明文（500文字以内）',r.chat.description||'');if(description===null)return;try{await api('/api/groups/'+id,'PATCH',{description});view.remove();renderGroupManagement(main,id)}catch(e){sola49Alert(e.message)}},'btn secondary small');box.append(change)}
    if(!r.chat.official&&r.chat.creator_id!==state.me.id){
      box.append(button('🚪 グループから退出',async()=>{
        if(!await sola49Confirm('このグループから退出する？ 再参加にはグループIDが必要だよ。'))return;
        try{await api('/api/groups/'+id+'/leave','POST');navigate('chats')}catch(e){sola49Alert(e.message)}
      },'btn secondary small'))
    }
    if(r.can_manage){
      const rename=button('✏️ グループ名を変更',async()=>{
        const name=await sola49Prompt('新しいグループ名',r.chat.name);if(name===null)return;
        try{const updated=await api('/api/groups/'+id,'PATCH',{name});state.chatName=updated.name;render()}catch(e){sola49Alert(e.message)}
      },'btn secondary small');box.append(rename);
      box.append(el('h4','sola-group-section-heading','参加申請（'+r.pending.length+'件）'));
      if(!r.pending.length)box.append(el('p','subtle','参加申請はないよ'));
      r.pending.forEach(req=>{const line=el('div','member-line');add(line,el('span','grow',req.username),button('承認',async()=>{if(!await sola49Confirm(req.username+'の参加申請を承認する？'))return;try{await api('/api/groups/'+id+'/requests/'+req.id+'/approve','POST');view.remove();renderGroupManagement(main,id)}catch(e){sola49Alert(e.message)}},'btn small'),button('却下',async()=>{if(!await sola49Confirm(req.username+'の参加申請を却下する？'))return;try{await api('/api/groups/'+id+'/requests/'+req.id+'/reject','POST');view.remove();renderGroupManagement(main,id)}catch(e){sola49Alert(e.message)}},'btn secondary small'));box.append(line)})

    }
    box.append(el('h4','sola-group-section-heading','メンバー（'+r.members.length+'人）'));
    const memberSearch=field('メンバー名で検索');const memberSort=el('select','field sola26-member-sort');[['joined','参加順'],['name','名前順'],['online','オンライン優先'],['role','管理者優先']].forEach(([v,t])=>{const o=el('option','',t);o.value=v;memberSort.append(o)});box.append(memberSearch,memberSort);const memberContainer=el('div','member-search-results');box.append(memberContainer);
    function drawMembers(){memberContainer.replaceChildren();r.members.filter(u=>u.username.toLowerCase().includes(memberSearch.value.trim().toLowerCase())).sort((a,b)=>memberSort.value==='name'?a.username.localeCompare(b.username,'ja'):memberSort.value==='online'?Number(b.online)-Number(a.online):memberSort.value==='role'?Number(b.id===r.chat.creator_id)*2+Number(b.coadmin)-(Number(a.id===r.chat.creator_id)*2+Number(a.coadmin)):0).forEach(u=>{
      const row=el('div','member-line sola-member-card');const pic=avatar(u.username,true,u.id);solaProfileClick(pic,u.id);pic.append(el('span','presence-dot '+(u.online?'is-online':'is-offline')));add(row,pic,el('span','grow',u.username+(u.id===r.chat.creator_id?' 👑':u.coadmin?' 🛡️ 共同管理者':'')+(u.status==='busy'?' · 取り込み中':u.online?' · オンライン':' · オフライン')));
      if(r.is_owner&&!r.chat.official&&u.id!==r.chat.creator_id){row.append(button('👑 管理者を引き継ぐ',async()=>{if(!await sola49Confirm(u.username+'に管理者を引き継ぐ？ この操作は元に戻せないよ。'))return;try{await api('/api/groups/'+id+'/transfer','POST',{user_id:u.id});view.remove();renderGroupManagement(main,id)}catch(e){sola49Alert(e.message)}},'btn secondary small'));row.append(button('退出させる',async()=>{
        if(!await sola49Confirm(u.username+'をグループから退出させる？（再参加には再び承認が必要）'))return;
        try{await api('/api/groups/'+id+'/members/'+u.id,'DELETE');view.remove();renderGroupManagement(main,id)}catch(e){sola49Alert(e.message)}
      },'btn secondary small'))}
      if(r.is_owner&&u.id!==r.chat.creator_id&&u.id!==state.me.id)row.append(button('🚫 BAN',async()=>{const reason=await sola49Prompt(u.username+'をBANする理由（必須）');if(!reason||!reason.trim())return;if(!await sola49Confirm(u.username+'をBANして再参加を禁止する？'))return;try{await api('/api/groups/'+id+'/bans/'+u.id,'POST',{reason:reason.trim()});view.remove();renderGroupManagement(main,id)}catch(e){sola49Alert(e.message)}},'btn secondary small'));
      if(r.is_owner&&u.id!==r.chat.creator_id&&u.id!==state.me.id)row.append(button(u.coadmin?'🛡️ 共同管理者を解除':'🛡️ 共同管理者にする',async()=>{if(!await sola49Confirm(u.username+'の共同管理者権限を'+(u.coadmin?'解除':'付与')+'する？'))return;try{await api('/api/groups/'+id+'/coadmins/'+u.id,u.coadmin?'DELETE':'POST');view.remove();renderGroupManagement(main,id)}catch(e){sola49Alert(e.message)}},'btn secondary small'));
      if(r.can_manage&&!r.is_owner&&u.id!==r.chat.creator_id&&u.id!==state.me.id)row.append(button('退出させる',async()=>{if(!await sola49Confirm('このメンバーを退出させる？'))return;try{await api('/api/groups/'+id+'/members/'+u.id,'DELETE');view.remove();renderGroupManagement(main,id)}catch(e){sola49Alert(e.message)}},'btn secondary small'));
      const actions=[...row.children].filter(x=>x.tagName==='BUTTON');if(actions.length){const group=el('div','sola-member-actions');row.append(group);actions.forEach(b=>{if(b.textContent.includes('退出させる'))b.classList.add('sola-danger');group.append(b)})}memberContainer.append(row)
    })}
    memberSearch.oninput=drawMembers;memberSort.onchange=drawMembers;drawMembers();
    if(r.is_owner&&r.bans?.length){box.append(el('h4','sola-group-section-heading','🚫 BAN中のユーザー（'+r.bans.length+'人）'));r.bans.forEach(u=>{const line=el('div','member-line');line.append(el('span','grow',u.username+' · '+u.reason),button('BAN解除',async()=>{if(!await sola49Confirm(u.username+'のBANを解除する？'))return;try{await api('/api/groups/'+id+'/bans/'+u.user_id,'DELETE');view.remove();renderGroupManagement(main,id)}catch(e){sola49Alert(e.message)}},'btn secondary small'));box.append(line)})}

    // v30: Destructive history reset; only visible to the actual owner.
    if(r.is_owner){
      const danger=el('div','sola-group-danger');
      danger.append(el('div','sola-group-danger-label','危険な操作'));
      danger.append(button('🗑️ メッセージを全て削除',async()=>{
        const groupName=r.chat.name;
        if(!await sola49Confirm('「'+groupName+'」のメッセージ・画像・添付ファイル・リアクションを全て完全削除するよ。\n元に戻せないよ。本当に続ける？'))return;
        const typed=await sola49Prompt('最終確認：グループ名「'+groupName+'」を正確に入力してね');
        if(typed!==groupName){if(typed!==null)sola49Alert('グループ名が一致しないため中止したよ');return}
        try{
          const result=await api('/api/groups/'+id+'/messages/all','DELETE',{confirm:'DELETE_ALL_MESSAGES',group_name:groupName});
          view.remove();toast((result.deleted||0)+'件のメッセージを完全削除したよ');
          if(state.chatId===id)render();
        }catch(e){sola49Alert(e.message)}
      },'btn sola-clear-all-btn'));
      box.append(danger);
    }
    const topActions=[...box.children].filter(x=>x.tagName==='BUTTON'&&x.classList.contains('btn'));
    if(topActions.length){const actionGrid=el('div','sola-group-action-grid');box.insertBefore(actionGrid,topActions[0]);topActions.forEach(b=>actionGrid.append(b))}
    // One collapsible history panel. Never append another panel on repeated clicks.

    if(r.is_owner)r.members.filter(u=>u.coadmin&&u.id!==state.me.id&&u.id!==r.chat.creator_id).forEach(u=>{const pbutton=button('🔐 '+u.username+'の権限設定',async()=>{const request=await sola49Confirm('「'+u.username+'」に参加申請の承認権限を与える？');const members=await sola49Confirm('メンバーの退出操作を許可する？');const announcement=false;try{await api('/api/groups/'+id+'/permissions/'+u.id,'POST',{requests:request,members,announcement});toast('権限を保存したよ')}catch(e){toast(e.message)}},'btn secondary small');box.append(pbutton)});
    const close=button('×',async()=>view.remove(),'sola-admin-close');close.setAttribute('aria-label','グループ管理を閉じる');box.prepend(close);
    view.append(box)
  }catch(e){view.append(card(message(e.message)))}
}

function chatRow(name,sub,official,onClick,isGroup=false,userId=null,online=null){const row=button('',onClick,'listitem');const pic=avatar(isGroup?'G':name,false,userId);if(online!==null)pic.append(el('span','presence-dot '+(online?'is-online':'is-offline')));add(row,pic,add(el('div','grow'),add(el('div','row wrap'),el('span','itemtitle',name),...(official?[el('span','pill','公式')]:[])),el('div','preview',sub)),el('span','subtle','›'));return row}
async function openOrJoin(id){try{const r=await api('/api/groups/'+id+'/join','POST');if(r.pending){sola49Alert('参加申請を送ったよ！管理者の承認を待ってね。');navigate('chats')}else openChat(id,'','group')}catch(e){sola49Alert(e.message)}}
// 最近開いたチャットをユーザーごとに端末へ保存する（秘密のSOLA-IDは保存しない）
function solaRecentChatKey(){return 'sola44-recent-chats-'+String(state.me?.id||'guest')}
function solaRecentChatIds(){try{const data=JSON.parse(localStorage.getItem(solaRecentChatKey())||'[]');return Array.isArray(data)?data.map(String):[]}catch{return []}}
function solaRememberChat(id){try{const ids=solaRecentChatIds().filter(x=>x!==String(id));ids.unshift(String(id));localStorage.setItem(solaRecentChatKey(),JSON.stringify(ids.slice(0,80)))}catch{}}
async function openChat(id,name,kind){
  solaRememberChat(id);
  state.sola43DashTab=kind==='dm'?'dm':'group';
  state.chatId=id;state.chatName=name;state.chatKind=kind;render();
  if(kind==='dm'){solaSetPath('/dm/'+id);return}
  if(kind==='group'){
    try{const result=await api('/api/chats');const group=result.chats.find(c=>c.id===id&&c.kind==='group');if(!group?.group_code)throw new Error('グループIDが見つからないよ');if(state.chatId===id)solaSetPath('/room/'+group.group_code)}
    catch(e){if(state.chatId===id)toast('グループURLを取得できなかったよ：'+e.message)}
  }
}
async function renderJoinGroup(main){
  add(main,title('🔑 グループに入る',[button('📷 QRを読み取る',openQrScanner,'btn secondary small'),button('← チャットに戻る',async()=>navigate('chats'),'btn secondary small')]));
  const form=el('form','join-form'),idInput=field('グループID（英数字8文字）','text'),find=button('IDで確認',async()=>{},'btn');
  idInput.autocomplete='off';idInput.maxLength=8;idInput.style.textTransform='uppercase';
  find.type='submit';find.onclick=null;
  const result=card(message('グループの作成者からIDを教えてもらって入力してね。','subtle'));
  add(form,el('label','label','グループID'),idInput,find);
  main.append(card(el('p','subtle','グループ名では検索できないよ。IDを入力して参加できるよ。申請制のグループでは管理者の承認が必要だよ。'),form),result);
  form.onsubmit=async e=>{
    e.preventDefault();result.replaceChildren();
    const id=idInput.value.trim().toUpperCase();
    if(!/^[A-Z0-9]{8}$/.test(id)){result.append(message('グループIDは英数字8文字で入力してね'));return}
    find.disabled=true;
    try{
      const r=await api('/api/groups/by-code/'+encodeURIComponent(id)),g=r.group;
      const heading=el('div','itemtitle',g.name),details=el('p','subtle',`ID: ${g.group_code} ／ 作成者: ${g.creator||'不明'} ／ ${g.members}/${g.max_members}人 ／ ${g.join_mode==='open'?'オープン制':'申請制'} ／ 作成: ${formatDate(g.created_at)}`);
      result.append(heading,details);if(g.description)result.append(el('p','subtle',g.description));
      if(g.official)result.append(el('span','pill','公式'));
      const enter=button(g.joined?'チャットを開く':g.join_mode==='open'?'参加する':g.request_status==='pending'?'申請中':'参加を申請する',async()=>{
        enter.disabled=true;
        try{if(!g.joined){const res=await api('/api/groups/'+g.id+'/join','POST');if(res.pending){sola49Alert('参加申請を送ったよ！管理者の承認を待ってね。');navigate('chats');return}}openChat(g.id,g.name,'group')}
        catch(ex){sola49Alert(ex.message);enter.disabled=false}
      },'btn');result.append(enter);if(g.request_status==='pending'&&!g.joined)result.append(button('参加申請を取り消す',async()=>{if(!await sola49Confirm('参加申請を取り消す？'))return;try{await api('/api/groups/'+g.id+'/requests/cancel','POST');toast('申請を取り消したよ');form.requestSubmit()}catch(e){toast(e.message)}},'btn secondary small'))
    }catch(ex){result.append(message(ex.message))}finally{find.disabled=false}
  }
}
function sola53ModeDialog(heading,initial='approval',groupName=''){
  return new Promise(resolve=>{
    const overlay=el('div','sola49-overlay sola53-overlay');
    const panel=el('div','sola49-dialog sola53-dialog');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    panel.append(el('h2','sola49-dialog-title',heading));
    let nameInput=null;
    if(heading==='グループを作成'){
      panel.append(el('label','label','グループ名'));
      nameInput=el('input','sola53-name');nameInput.placeholder='例：プログラミング部';nameInput.value=groupName;nameInput.maxLength=60;panel.append(nameInput);
    }
    panel.append(el('h3','sola53-label','参加方式'));
    const choices=el('div','sola53-choices');const info=el('div','sola53-info');let selected=initial;
    const options=[['approval','🔒 申請制','参加希望者が申請し、グループ管理者が承認すると参加できる。'],['open','🌐 オープン制','参加申請や承認なしで、すぐにグループに参加できる。']];
    const render=()=>{choices.replaceChildren();options.forEach(([value,label,description])=>{const choice=el('button','sola53-choice'+(selected===value?' selected':''));choice.type='button';choice.append(el('strong','',(selected===value?'◉ ':'◯ ')+label),el('span','',description));choice.onclick=()=>{selected=value;render()};choices.append(choice)});info.textContent='選択中：'+(selected==='approval'?'申請制':'オープン制')+' — '+(selected==='approval'?'参加申請が届いたら、管理者が承認・拒否できる。':'参加ボタンを押したら、すぐにチャットに入れる。')};render();panel.append(choices,info);
    const actions=el('div','sola49-dialog-actions');const finish=value=>{overlay.remove();document.removeEventListener('keydown',onKey);resolve(value)};
    const onKey=e=>{if(e.key==='Escape')finish(null)};document.addEventListener('keydown',onKey);
    actions.append(button('キャンセル',()=>finish(null),'sola49-dialog-cancel'),button(heading==='グループを作成'?'グループを作成':'変更を保存',()=>{if(nameInput){const name=nameInput.value.trim();if(name.length<2){nameInput.focus();return}finish({name,join_mode:selected})}else finish(selected)},'sola49-dialog-ok'));
    panel.append(actions);overlay.append(panel);overlay.addEventListener('click',e=>{if(e.target===overlay)finish(null)});document.body.append(overlay);(nameInput||choices.querySelector('button'))?.focus();
  });
}
async function createGroup(){const selected=await sola53ModeDialog('グループを作成');if(!selected)return;try{const official=state.officialAdmin?await sola49Confirm('SOLA公式グループとして作る？（キャンセルなら通常グループ）'):false;const r=await api('/api/groups','POST',{...selected,official});await sola49Alert('グループを作成したよ！\nグループID: '+r.group_code+'\nメンバーにこのIDを伝えてね。');openChat(r.id,selected.name,'group')}catch(e){sola49Alert(e.message)}}

function renderSearch(main){add(main,title('ユーザー検索',[button('📷 QRを読み取る',openQrScanner,'btn secondary small')]));const q=field('ユーザー名の一部を入力'),results=card(sola26Empty('名前を入力して検索してね'));main.append(card(q),results);let seq=0;q.oninput=async()=>{const n=++seq;if(!q.value.trim()){results.replaceChildren(sola26Empty('名前を入力して検索してね'));return}try{const r=await api('/api/users?q='+encodeURIComponent(q.value));if(n!==seq)return;results.replaceChildren();if(!r.users.length)results.append(sola26Empty('見つからなかったよ'));r.users.forEach(u=>results.append(chatRow(u.username,(u.online?'🟢 オンライン · ':'⚪ オフライン · ')+(u.bio||'プロフィールを見る'),false,async()=>renderUserProfile(main,u.id),false,u.id,u.online)))}catch(e){results.replaceChildren(message(e.message))}}}
// v22: shared, animated profile card. Uses the existing profile endpoint and privacy rules.
async function solaOpenProfileCard(userId){
  if(!userId)return;
  document.querySelector('.sola-v22-overlay')?.remove();
  const overlay=el('div','sola-v22-overlay');
  const dialog=el('section','sola-v22-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','ユーザープロフィール');
  const close=async()=>{overlay.classList.add('closing');document.removeEventListener('keydown',onKey);setTimeout(async()=>overlay.remove(),190)};
  const onKey=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',onKey);
  overlay.onclick=e=>{if(e.target===overlay)close()};
  const cover=el('div','sola-v22-cover');cover.style.backgroundImage='url(/api/v28/covers/'+encodeURIComponent(userId)+')';const closeButton=button('×',close,'sola-v22-close');closeButton.setAttribute('aria-label','閉じる');cover.append(closeButton);
  const content=el('div','sola-v22-content');content.append(el('div','sola-v22-loading','プロフィールを読み込み中…'));
  dialog.append(cover,content);overlay.append(dialog);document.body.append(overlay);closeButton.focus();
  try{
    const r=await api('/api/users/'+encodeURIComponent(userId));
    if(!overlay.isConnected||overlay.classList.contains('closing'))return;
    const u=r.user;content.replaceChildren();
    const photo=avatar(u.username,false,u.id);photo.classList.add('sola-v22-avatar');
    const identity=el('div','sola-v22-identity');identity.append(photo,el('h2','',u.username+(u.id===state.me.id?' （自分）':'')),el('p','sola-v22-bio',u.bio||'自己紹介は未設定です'));
    const info=el('div','sola-v22-info');info.append(el('strong','','ⓘ ユーザー情報'),el('p','',(u.status==='busy'?'🟠 取り込み中':u.online?'🟢 オンライン':'⚪ オフライン')));
    const idRow=button('＃ IDを見る',async()=>{idRow.textContent='ID: '+(u.public_code||u.id);},'sola-v22-id');
    info.append(el('p','','📅 アカウント作成日：'+sola28Date(u.created_at)));
    const achievements=el('section','sola39-achievements');
    achievements.append(el('h3','','🏅 実績バッジ一覧'));
    const badgeLine=el('div','sola28-badge-line sola39-badge-list');
    const earnedBadges=Array.isArray(u.display_badges)?u.display_badges:[];
    if(earnedBadges.length){earnedBadges.forEach(b=>badgeLine.append(el('span','sola28-badge',sola28BadgeName(b))))}
    else badgeLine.append(el('p','sola39-badge-empty','表示中の実績バッジはありません'));
    achievements.append(badgeLine);
    content.append(identity,info,idRow,achievements);
    if(u.id!==state.me.id){
      const actions=el('div','sola-v22-actions');
      if(!r.blocked)actions.append(button('💬 個人チャットを開く',async()=>{try{const x=await api('/api/dms/'+u.id,'POST');close();openChat(x.id,u.username+'とのチャット','dm')}catch(e){toast(e.message)}},'btn small'));
      content.append(actions);
    }
  }catch(e){content.replaceChildren(el('p','',e.message||'プロフィールを表示できませんでした'))}
}
function solaProfileClick(node,userId){if(!node||!userId)return;node.classList.add('sola-v22-profile-trigger');node.setAttribute('role','button');node.tabIndex=0;node.title='プロフィールを見る';node.addEventListener('click',e=>{e.stopPropagation();solaOpenProfileCard(userId)});node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();solaOpenProfileCard(userId)}})}

async function renderUserProfile(main,id){main.replaceChildren(title('プロフィール',[button('← 戻る',async()=>navigate('search'),'btn secondary small')]));const c=card(message('読み込み中…'));main.append(c);try{const r=await api('/api/users/'+id);c.replaceChildren(add(el('div','row'),avatar(r.user.username,false,r.user.id),add(el('div','grow'),el('div','itemtitle',r.user.username),el('div','preview',r.user.bio||'自己紹介なし'))));const actions=el('div','row wrap');c.append(el('p','subtle',r.user.status==='busy'?'🟠 取り込み中':r.user.online?'🟢 オンライン':'⚪ オフライン'));
 if(false){actions.append(button('👥 共通グループ',async()=>{try{const x=await api('/api/friends/'+id+'/common-groups');const names=x.groups.map(g=>g.name);toast(names.length?'共通グループ：'+names.join('、'):'共通グループはないよ')}catch(e){toast(e.message)}},'btn secondary small'));actions.append(button('✏️ ニックネーム',async()=>{const value=await sola49Prompt('自分の画面だけに表示する名前（空欄で解除）',r.user.nickname||'');if(value===null)return;try{await api('/api/nicknames/'+id,'PUT',{nickname:value});toast('ニックネームを保存したよ');renderUserProfile(main,id)}catch(e){sola49Alert(e.message)}},'btn secondary small'))}if(r.blocked){actions.append(message('このユーザーをブロック中'));}else if(!r.blocked)actions.append(button('💬 個人チャットを開く',async()=>api('/api/dms/'+id,'POST').then(x=>openChat(x.id,r.user.username+'とのチャット','dm')).catch(e=>sola49Alert(e.message))));actions.append(button(r.blocked?'ブロック解除':'🚫 ブロック',async()=>{if(!await sola49Confirm(r.blocked?'ブロックを解除する？':'このユーザーをブロックする？'))return;try{await api('/api/users/'+id+'/block','POST');renderUserProfile(main,id)}catch(e){sola49Alert(e.message)}},'btn secondary small'));actions.append(button('⚑ 通報',async()=>sendReport({user_id:id}),'btn secondary small'));actions.append(button('🔗 プロフィールリンク',async()=>copyText(location.origin+'/user/'+r.user.public_code),'btn secondary small'));c.append(actions)}catch(e){c.replaceChildren(message(e.message))}}
async function renderFriends(main){main.replaceChildren();add(main,title('友だち'));const c=card(message('読み込み中…'));main.append(c);try{const r=await api('/api/friends');c.replaceChildren();c.append(el('h3','mutedtitle','届いた申請'));if(!r.requests.length)c.append(message('申請はないよ','subtle'));r.requests.forEach(req=>{const line=el('div','listitem');add(line,avatar(req.username,false,req.user_id),el('div','grow',req.username),button('承認',async()=>api('/api/friends/accept/'+req.id,'POST').then(async()=>renderFriends(main)).catch(e=>sola49Alert(e.message)),'btn small'));c.append(line)});c.append(el('h3','mutedtitle','フレンド一覧'));if(!r.friends.length)c.append(message('ユーザー検索から友だちを追加しよう','subtle'));r.friends.forEach(u=>{const line=el('div','chat-list-line');const entry=chatRow(nickName(u),u.bio||'チャットを開始',false,async()=>api('/api/dms/'+u.id,'POST').then(x=>openChat(x.id,nickName(u)+'とのチャット','dm')).catch(e=>sola49Alert(e.message)),false,u.id,u.online);const fav=button(u.favorite?'★':'☆',async()=>{try{await api('/api/friends/'+u.id+'/favorite','POST');renderFriends(main)}catch(e){sola49Alert(e.message)}},'pin-button');fav.title='お気に入り';line.append(entry,fav);c.append(line)})}catch(e){c.replaceChildren(message(e.message))}}
function renderProfile(main){
  main.classList.add('sola-profile-page');
  main.append(title('マイページ'));
  const layout=el('div','sola-profile-grid');main.append(layout);
  const left=el('div','sola-profile-column'),right=el('div','sola-profile-column');layout.append(left,right);
  const photo=avatar(state.me.username,false,state.me.id);photo.classList.add('avatar-large');
  const picker=field('','file');picker.accept='image/jpeg,image/png,image/webp';picker.classList.add('avatar-picker');
  const status=el('div','subtle sola-profile-status','画像は2MB以下（JPEG・PNG・WebP）');
  const choose=button('📷 アイコン変更',async()=>picker.click(),'btn small');
  picker.onchange=async()=>{const file=picker.files?.[0];if(!file)return;if(file.size>2*1024*1024){status.textContent='2MB以下の画像を選んでね';return}
    choose.disabled=true;status.textContent='画像を保存中…';try{const fd=new FormData();fd.append('avatar',file);const response=await fetch('/api/avatar',{method:'POST',headers:{'X-CSRF-Token':state.csrf},body:fd});const data=await response.json();if(!response.ok)throw new Error(data.error||'保存できなかったよ');state.avatarVersion=Date.now();const replacement=avatar(state.me.username,false,state.me.id);replacement.classList.add('avatar-large');photo.replaceWith(replacement);status.textContent='アイコンを変更したよ！'}catch(e){status.textContent=e.message}finally{choose.disabled=false;picker.value=''}};
  const remove=button('元に戻す',async()=>{try{await api('/api/avatar','DELETE');state.avatarVersion=Date.now();main.replaceChildren();renderProfile(main)}catch(e){status.textContent=e.message}},'btn secondary small');
  const bio=el('textarea','field');bio.rows=2;bio.maxLength=200;bio.value=state.me.bio||'';
  const profile=card();profile.classList.add('sola-profile-main');
  const identity=el('div','sola-profile-identity');identity.append(photo,add(el('div','sola-profile-identity-details'),el('div','itemtitle',state.me.username),add(el('div','row wrap'),choose,remove),status));
  profile.append(identity,picker,el('label','label','自己紹介'),bio,button('自己紹介を保存',async()=>{try{await api('/api/profile','POST',{bio:bio.value});state.me.bio=bio.value;toast('自己紹介を保存したよ')}catch(e){sola49Alert(e.message)}},'btn small'));left.append(profile);

  sola28ProfileExtras(left);
  const share=card(el('h3','','🔗 プロフィール共有'));
  const link=button('リンクをコピー',async()=>copyText(location.origin+'/user/'+state.me.public_code),'btn secondary small');
  const qr=el('img','sola-qr sola-profile-qr-image');qr.src='/api/qr?kind=user&id='+state.me.id;qr.alt='フレンド追加QRコード';
  qr.onerror=async()=>{qr.replaceWith(el('p','subtle','QRコードを表示できなかったよ。サーバーと qrcode のインストールを確認してね。'))};
  const qrActions=el('div','sola-qr-actions');
  qrActions.append(link,button('📷 QRを読み取る',openQrScanner,'btn secondary small'));
  const qrDetails=el('details','sola32-qr-details');qrDetails.append(el('summary','','QRコードを表示'),qr);share.append(qrActions,qrDetails);right.append(share);

  const appearance=card(el('h3','','🎨 デザイン'));
  const themeLabel=el('div','label','テーマ');const themes=el('div','sola-profile-choice-row');
  [['sunset','🌅 夕焼け'],['pink','🌸 ピンク'],['night','🌙 夜空']].forEach(([id,label])=>{
    const b=button(label,async()=>{themeApply(id);main.replaceChildren();renderProfile(main)},'btn secondary small'+(document.documentElement.dataset.theme===id?' chosen-theme':''));themes.append(b)
  });
  const paletteLabel=el('div','label','吹き出しの色');const palette=el('div','sola-profile-colors');
  [['夕焼け','#ffd2d0'],['桃色','#f7bfdd'],['空色','#bedbf5'],['薄紫','#d9c7f6'],['ミント','#bfe7dc']].forEach(([label,color])=>{
    const swatch=button('',async()=>{localStorage.setItem('sola2-bubble-'+state.me.id,color);applyBubbleColor();toast('吹き出しの色を変更したよ')},'sola-profile-swatch');swatch.style.background=color;swatch.title=label;swatch.setAttribute('aria-label',label);palette.append(swatch)
  });appearance.append(themeLabel,themes,paletteLabel,palette);right.append(appearance);

  const tools=card(el('h3','','🔔 通知とアカウント'));const toolRow=el('div','sola-profile-tool-row');
  toolRow.append(button('ブラウザ通知を許可',async()=>{if(!('Notification' in window)){toast('このブラウザは通知に対応していないよ');return}if(!window.isSecureContext){toast('通知はHTTPSまたはlocalhostで利用できるよ');return}const p=await Notification.requestPermission();toast(p==='granted'?'通知を許可したよ':'通知は許可されていないよ')},'btn secondary small'));

  // v26: make self-deletion visible in the account controls, without removing confirmation safeguards.
  const deleteSelfButton=button('🗑 自分のアカウントを削除',async()=>{
    if(!await sola49Confirm('本当にアカウントを削除する？ この操作は元に戻せないよ。'))return;
    const password='';
    const confirmation=await sola49Prompt('確認のため DELETE と入力');if(confirmation===null)return;
    try{await api('/api/account/delete','POST',{password,confirmation});state.me=null;location.href='/'}catch(e){sola49Alert(e.message)}
  },'btn secondary small sola-v26-delete-self');
  toolRow.append(deleteSelfButton);
  tools.append(toolRow,el('p','subtle sola-v26-delete-note','削除するとログインできなくなるよ。過去のメッセージは「削除済みユーザー」として残る。'));left.append(tools);
  // SOLA ELEVEN FEATURES 2026: account security controls.
  const security=card(el('h3','','🔐 アカウントの安全設定'));
  const historyBox=el('div','sola-login-history');historyBox.hidden=true;
  const historyButton=button('最近のログイン履歴を表示',async()=>{if(!historyBox.hidden){historyBox.hidden=true;return}try{const result=await api('/api/account/login-history');historyBox.replaceChildren();if(!result.history.length)historyBox.append(message('履歴はまだないよ','subtle'));result.history.forEach(h=>historyBox.append(el('div','sola-history-line',h.device+' · '+formatDate(h.created_at))));historyBox.hidden=false}catch(e){toast(e.message)}},'btn secondary small');
  const idArea=el('div','sola38-id-area');
  const idStatus=el('p','subtle','SOLA-IDは本人だけが確認できる復元用の秘密情報だよ。他の人には教えないでね。');
  const idDisplay=el('div','sola38-id-display');idDisplay.hidden=true;
  const idActions=el('div','row wrap');
  const reveal=button('👁️ 自分のSOLA-IDを表示',async()=>{
    if(!idDisplay.hidden){idDisplay.hidden=true;idDisplay.replaceChildren();reveal.textContent='👁️ 自分のSOLA-IDを表示';return}
    try{
      const r=await api('/api/sola-id/mine');
      if(r.status==='not_issued'){
        idStatus.textContent='まだSOLA-IDが発行されていないよ。下のボタンから発行してね。';return
      }
      if(r.status==='needs_recovery'){
        idStatus.textContent='v37以前に発行したIDは暗号化保存されていないため、最初の1回だけ保存したSOLA-IDを入力してね。';
        const input=field('SOLA-ID');input.placeholder='sola-xxxx-xxxx-xxxx-xxxx';input.autocomplete='off';
        idDisplay.replaceChildren(input,button('このIDを登録',async()=>{try{await api('/api/sola-id/save-existing','POST',{sola_id:input.value});idDisplay.hidden=true;reveal.click()}catch(e){toast(e.message)}},'btn small'));
        idDisplay.hidden=false;return
      }
      const code=el('code','sola38-id-code',r.sola_id);
      idDisplay.replaceChildren(code,button('📋 コピー',async()=>copyText(r.sola_id),'btn secondary small'));
      idDisplay.hidden=false;reveal.textContent='🙈 SOLA-IDを隠す';
    }catch(e){toast(e.message)}
  },'btn secondary small');
  idActions.append(reveal,button('旧アカウントのSOLA-IDを発行（未発行の場合）',async()=>{try{const r=await api('/api/sola-id/claim','POST',{});sola37ShowId(r.sola_id,false)}catch(e){toast(e.message)}},'btn secondary small'));
  idArea.append(idStatus,idActions,idDisplay);
  security.append(idArea,historyButton,historyBox);main.append(security);

}
async function renderChat(main){
  const id=state.chatId;
  const back=button('← ホーム',solaReturnToChatHome,'btn secondary small');
  const box=el('div','chatbox'),header=el('div','chatheader'),heading=el('div','itemtitle',state.chatName||'チャット'),messages=el('div','messages');
  const connection=solaConnectionControl();
  const presence=el('div','chat-presence');
  if(state.chatKind==='dm'){heading.title='相手のプロフィールを見る';heading.classList.add('sola-v22-profile-trigger');heading.onclick=async()=>{if(typeof dmOtherId!=='undefined'&&dmOtherId)solaOpenProfileCard(dmOtherId)}}

  const manage=button('⚙️ グループ管理',async()=>{
    if($('.group-management',box)){$('.group-management',box).remove();return}
    renderGroupManagement(box,id)
  },'btn secondary small');
  const replyBanner=el('div','reply-banner');replyBanner.hidden=true;
  const form=el('form','chatcomposer'),input=field('メッセージを入力'),send=button('送信',async()=>{});
  const picker=field('','file');picker.type='file';picker.accept='image/jpeg,image/png,image/webp';picker.classList.add('hidden-file');
  const imageButton=button('📷',async()=>picker.click(),'btn secondary');imageButton.title='写真を送信';
  const filePicker=field('','file');filePicker.classList.add('hidden-file');filePicker.accept='.pdf,.txt,.csv,.md,.docx,.xlsx,.pptx';
  const fileButton=button('📎',async()=>filePicker.click(),'btn secondary');fileButton.title='ファイルを送信';
  send.type='submit';send.onclick=null;
  const logo=button('',solaReturnToChatHome,'chat-home-logo');logo.append(brandIcon('mini'));add(header,back,logo,add(el('div','chat-title-block'),heading,presence,connection));if(state.chatKind==='group'){header.append(button('🔑 ID',async()=>{try{const r=await api('/api/groups/'+id+'/members');copyGroupId(r.chat.group_code)}catch(e){sola49Alert(e.message)}},'btn secondary small'),manage)}
  add(form,imageButton,picker,fileButton,filePicker,input,send);
  input.value=readDraft(id);let lastTypingSent=0;
  input.addEventListener('input',async()=>{saveDraft(id,input.value);if(state.chatKind==='dm'&&input.value.trim()&&Date.now()-lastTypingSent>2500){lastTypingSent=Date.now();api('/api/chats/'+id+'/typing','POST').catch(async()=>{})}});
  const typingBubble=el('div','sola-typing');typingBubble.hidden=true;typingBubble.textContent='●  ●  ●　入力中…';
  add(box,header,messages,typingBubble,replyBanner,form);main.append(box);
  // SOLA ELEVEN FEATURES 2026: scroll position and jump-to-latest.
  const scrollKey='sola-scroll-'+state.me.id+'-'+id;
  let firstChatLoad=true;
  const latestButton=button('↓ 最新へ',async()=>{messages.scrollTop=messages.scrollHeight;sessionStorage.removeItem(scrollKey)},'sola-jump-latest');
  box.append(latestButton);
  const updateJump=async()=>{const near=messages.scrollHeight-messages.scrollTop-messages.clientHeight<160;latestButton.hidden=near;try{sessionStorage.setItem(scrollKey,near?'bottom':String(messages.scrollTop))}catch{}};
  messages.addEventListener('scroll',updateJump,{passive:true});latestButton.hidden=true;
  // SOLA_AUTO_OLDER_SCROLL_V1: reaching the top fetches the previous 60 messages.
  const olderMessages=new Map();
  let fetchingOlder=false,hasMoreOlder=true;
  const olderLoading=el('div','sola-auto-older-status','以前のメッセージを読み込み中…');
  olderLoading.hidden=true;
  box.insertBefore(olderLoading,messages);
  async function loadOlderOnScroll(force=false){
    if(fetchingOlder||!hasMoreOlder||firstChatLoad||state.chatId!==id||refreshing)return;
    if(!force&&messages.scrollTop>140)return;
    const first=messages.querySelector('[data-sola-message-id]');
    if(!first)return;
    const before=Number(first.dataset.solaMessageId);
    if(!Number.isInteger(before)||before<1)return;
    fetchingOlder=true;
    olderLoading.hidden=false;
    const oldHeight=messages.scrollHeight,oldTop=messages.scrollTop;
    try{
      const result=await api('/api/chats/'+id+'/messages?before='+before);
      if(state.chatId!==id)return;
      const fetched=result.messages||[];
      const previousSize=olderMessages.size;
      fetched.forEach(m=>olderMessages.set(m.id,m));
      hasMoreOlder=fetched.length===60&&olderMessages.size>previousSize;
      // Polling may be finishing; defer the redraw until it is free.
      for(let n=0;refreshing&&n<25;n++)await new Promise(resolve=>setTimeout(resolve,80));
      if(refreshing)return;
      lastRenderedSignature=null;
      await refresh(false,true);
      // Keep the same message in view after older messages are prepended.
      messages.scrollTop=oldTop+(messages.scrollHeight-oldHeight);
      updateJump();
    }catch(e){
      toast('以前のメッセージを読み込めなかったよ：'+e.message);
    }finally{
      fetchingOlder=false;
      olderLoading.hidden=true;
    }
  }
  messages.addEventListener('scroll',async()=>{if(messages.scrollTop<=140)loadOlderOnScroll()},{passive:true});
  let replyTarget=null,refreshing=false,lastRenderedSignature=null;
  const expandedLongMessages=new Set();
  let initialUnread=0,unreadMarkerId=null,unreadMarkerDetermined=false;
  try{
    const chats=await api('/api/chats');
    const thisChat=(chats.chats||[]).find(c=>String(c.id)===String(id));
    initialUnread=Math.max(0,Number(thisChat?.unread)||0);
  }catch{}
  const sendingStatus=el('div','sola-v15-send-status');sendingStatus.hidden=true;
  form.after(sendingStatus);
  function setSendingStatus(label,failed=false){sendingStatus.textContent=label;sendingStatus.hidden=!label;sendingStatus.classList.toggle('failed',failed)}
  async function jumpToReply(messageId){
    const locate=async()=>Array.from(messages.querySelectorAll('[data-sola-message-id]')).find(n=>Number(n.dataset.solaMessageId)===Number(messageId));
    let target=locate();
    let tries=0;
    while(!target&&hasMoreOlder&&tries++<100){
      const first=messages.querySelector('[data-sola-message-id]');
      if(!first||Number(first.dataset.solaMessageId)<=Number(messageId))break;
      await loadOlderOnScroll(true);
      target=locate();
    }
    if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('sola26-reply-highlight');setTimeout(async()=>target.classList.remove('sola26-reply-highlight'),1800)}
    else toast('返信元が見つからなかったよ');
  }

  // Float a reaction independently of the message layout, so bubbles never jump.
  function celebrateReaction(emoji,anchor){
    const r=anchor.getBoundingClientRect();
    const burst=el('span','sola-reaction-burst',emoji);
    burst.style.left=(r.left+r.width/2)+'px';
    burst.style.top=(r.top+r.height/2)+'px';
    document.body.append(burst);
    burst.addEventListener('animationend',async()=>burst.remove(),{once:true});
    setTimeout(async()=>burst.remove(),1100);
  }
  // One floating context panel: desktop right click, tablet/phone long press.
  // It is attached to body, not the chat column, so it never resizes a bubble.
  const contextMenu=el('div','sola-context-menu');contextMenu.hidden=true;
  contextMenu.setAttribute('role','menu');contextMenu.setAttribute('aria-label','メッセージの操作');
  document.body.append(contextMenu);
  const contextAbort=new AbortController();
  let longPressTimer=null,longPressStart=null,suppressTapUntil=0;
  function cancelLongPress(){if(longPressTimer!==null){clearTimeout(longPressTimer);longPressTimer=null}longPressStart=null}
  function closeContextMenu(){
    if(contextMenu.hidden)return;
    contextMenu.hidden=true;contextMenu.replaceChildren();
    contextMenu.classList.remove('sola-context-show');
  }
  function openContextMenu(m,actions,reactionMenu,bubble,x,y){
    cancelLongPress();
    contextMenu.replaceChildren();
    reactionMenu.hidden=false;
    contextMenu.append(reactionMenu,actions);
    contextMenu.hidden=false;
    contextMenu.classList.remove('sola-context-show');
    // Calculate against the viewport, and avoid hiding under the composer.
    contextMenu.style.left='0px';contextMenu.style.top='0px';
    const rect=contextMenu.getBoundingClientRect(),pad=10;
    const left=Math.max(pad,Math.min(x-rect.width/2,innerWidth-rect.width-pad));
    const above=y-rect.height-14;
    const top=above>=pad?above:Math.min(y+14,innerHeight-rect.height-pad);
    contextMenu.style.left=Math.round(left)+'px';
    contextMenu.style.top=Math.round(Math.max(pad,top))+'px';
    contextMenu.style.setProperty('--sola-pop-origin',above>=pad?'50% 100%':'50% 0%');
    void contextMenu.offsetWidth;
    contextMenu.classList.add('sola-context-show');
    // Avoid auto-focusing the first emoji; keyboard focus remains available via Tab.
  }
  document.addEventListener('pointerdown',e=>{
    if(!contextMenu.hidden&&!contextMenu.contains(e.target))closeContextMenu();
  },{signal:contextAbort.signal});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeContextMenu()}, {signal:contextAbort.signal});
  messages.addEventListener('scroll',closeContextMenu,{passive:true,signal:contextAbort.signal});
  contextMenu.addEventListener('click',e=>{if(e.target.closest('button'))closeContextMenu()});
  state.contextCleanup=async()=>{cancelLongPress();contextAbort.abort();contextMenu.remove();state.contextCleanup=null};
  function clearReply(){replyTarget=null;replyBanner.replaceChildren();replyBanner.hidden=true}
  input.addEventListener('keydown',e=>{if(e.key==='Escape'&&replyTarget){e.preventDefault();clearReply();toast('返信を解除したよ')}});
  function selectReply(m){replyTarget=m;replyBanner.hidden=false;replyBanner.replaceChildren(el('span','grow','↩ '+m.username+'：'+(m.body||'📷 写真').slice(0,80)),button('×',clearReply,'btn secondary small'));input.focus()}
  let pendingTextToken=null;
  form.onsubmit=async e=>{
    e.preventDefault();const body=input.value.trim();if(!body||send.disabled)return;
    send.disabled=true;setSendingStatus('送信中…');
    try{
      if(!pendingTextToken||pendingTextToken.body!==body)pendingTextToken={body,token:(crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):(Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)))};
      await api('/api/chats/'+id+'/messages','POST',{body,reply_to:replyTarget?.id||null,client_token:pendingTextToken.token});
      pendingTextToken=null;input.value='';saveDraft(id,'');clearReply();setSendingStatus('送信完了');await refresh(true);setTimeout(async()=>{if(sendingStatus.textContent==='送信完了')setSendingStatus('')},1800);
    }catch(ex){setSendingStatus('送信失敗：再試行できるよ',true);toast(ex.message+'。もう一度送信すると再試行するよ')}finally{send.disabled=false;input.focus()}
  };
  // SOLA ELEVEN FEATURES 2026: image compression, real upload progress, drag and drop.
  const uploadProgress=el('div','sola-upload-progress');uploadProgress.hidden=true;
  const progressLabel=el('span','','送信準備中…'),progressBar=el('progress');progressBar.max=100;progressBar.value=0;
  uploadProgress.append(progressLabel,progressBar);box.append(uploadProgress);
  async function compressImage(file){
    if(!file.type.startsWith('image/'))throw new Error('画像ファイルを選んでね');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('JPEG・PNG・WebPのみ送信できるよ');
    const bmp=typeof createImageBitmap==='function'?await createImageBitmap(file):await new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=async()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=async()=>{URL.revokeObjectURL(url);reject(new Error('画像を読み込めなかったよ'))};img.src=url;
    });try{
      const scale=Math.min(1,1600/Math.max(bmp.width,bmp.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bmp,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.78));
      if(!blob)throw new Error('画像を圧縮できなかったよ');
      const output=new File([blob],(file.name.replace(/\.[^.]+$/,'')||'photo')+'.jpg',{type:'image/jpeg'});
      return output.size<file.size?output:file;
    }finally{bmp.close?.()}
  }
  let sola26ActiveUpload=null;
  const sola26CancelUpload=button('送信キャンセル',async()=>{sola26ActiveUpload?.abort()},'sola26-upload-cancel');uploadProgress.append(sola26CancelUpload);
  function uploadWithProgress(url,formData){
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();sola26ActiveUpload=xhr;xhr.open('POST',url);xhr.setRequestHeader('X-CSRF-Token',state.csrf);
      xhr.upload.onprogress=e=>{if(e.lengthComputable){progressBar.value=Math.round(e.loaded/e.total*100);progressLabel.textContent='アップロード '+progressBar.value+'%'}};
      xhr.onerror=async()=>reject(new Error('通信に失敗したよ'));xhr.onabort=async()=>reject(new Error('送信をキャンセルしたよ'));xhr.onloadend=async()=>{if(sola26ActiveUpload===xhr)sola26ActiveUpload=null};
      xhr.onload=async()=>{let data={};try{data=JSON.parse(xhr.responseText)}catch{}if(xhr.status>=200&&xhr.status<300)resolve(data);else reject(new Error(data.error||'送信できなかったよ'))};
      xhr.send(formData);
    })
  }
  let uploading=false;
  async function sendAttachment(file,asImage){
    if(uploading)return;
    uploading=true;imageButton.disabled=true;fileButton.disabled=true;uploadProgress.hidden=false;progressBar.value=0;
    try{
      progressLabel.textContent=asImage?'画像を準備中…':'ファイルを準備中…';
      let outgoing=asImage?await compressImage(file):file;
      if(outgoing.size>2*1024*1024)throw new Error('送信できるサイズは2MB以下だよ');
      const fd=new FormData();fd.append(asImage?'image':'file',outgoing);
      if(asImage&&replyTarget)fd.append('reply_to',replyTarget.id);
      await uploadWithProgress('/api/chats/'+id+'/'+(asImage?'images':'files'),fd);
      if(asImage)clearReply();toast('送信したよ');await refresh(true);
    }catch(e){sola49Alert(e.message)}finally{uploading=false;imageButton.disabled=false;fileButton.disabled=false;uploadProgress.hidden=true;picker.value='';filePicker.value=''}
  }
  picker.onchange=async()=>{const file=picker.files?.[0];if(file)sendAttachment(file,true)};
  filePicker.onchange=async()=>{const file=filePicker.files?.[0];if(file)sendAttachment(file,false)};
  const dropHint=el('div','sola-drop-hint','ここに画像・ファイルをドロップして送信');dropHint.hidden=true;box.append(dropHint);
  let dragDepth=0;
  box.addEventListener('dragenter',e=>{if(!e.dataTransfer?.types.includes('Files'))return;e.preventDefault();dragDepth++;dropHint.hidden=false});
  box.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
  box.addEventListener('dragleave',async()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)dropHint.hidden=true});
  box.addEventListener('drop',e=>{
    e.preventDefault();dragDepth=0;dropHint.hidden=true;
    const files=Array.from(e.dataTransfer?.files||[]);
    if(!files.length)return;
    if(files.some(file=>!file.type.startsWith('image/'))){sola49Alert('画像ファイルだけをドロップしてね');return}
    if(files.length>5){sola49Alert('画像は一度に5枚までだよ');return}
    // Confirm dropped images before uploading; no accidental instant sends.
    const overlay=el('div','sola56-preview-overlay');
    const dialog=el('div','sola56-preview-dialog');
    dialog.append(el('h3','','画像を送信する？'),el('p','subtle',files.length+'枚の画像を確認してから送信できるよ'));
    const thumbs=el('div','sola56-thumbs');
    const urls=[];
    files.forEach(file=>{const url=URL.createObjectURL(file);urls.push(url);const img=el('img','sola56-thumb');img.src=url;img.alt=file.name;thumbs.append(img)});
    dialog.append(thumbs);
    const cleanup=()=>{urls.forEach(url=>URL.revokeObjectURL(url));overlay.remove()};
    const buttons=el('div','row wrap');
    buttons.append(button('キャンセル',cleanup,'btn secondary'),button('送信',async()=>{
      cleanup();for(const file of files){await sendAttachment(file,true)}
    },'btn'));
    dialog.append(buttons);overlay.append(dialog);document.body.append(overlay);
  });
  const galleryButton=button('🖼️ ギャラリー',async()=>{const old=$('.sola-gallery',box);if(old){old.remove();return}const gallery=el('div','sola-gallery');box.append(gallery);try{const r=await api('/api/chats/'+id+'/gallery');gallery.append(add(el('div','row wrap'),el('h3','grow','画像ギャラリー'),button('×',async()=>gallery.remove(),'btn secondary small')));const grid=el('div','gallery-grid');if(!r.images.length)grid.append(message('写真はまだないよ','subtle'));r.images.forEach(m=>{const img=el('img','gallery-image');img.src='/api/chat-images/'+m.id;img.alt=m.username+'の写真';img.loading='lazy';img.onclick=async()=>window.open(img.src,'_blank','noopener');grid.append(img)});gallery.append(grid)}catch(e){gallery.append(message(e.message))}},'btn secondary small');
  header.append(galleryButton);
  // v16: server-side search covers old messages, not only the 60 currently shown.
  const searchToggle=button('⌕ 検索',async()=>{searchPanel.hidden=!searchPanel.hidden;if(!searchPanel.hidden)searchInput.focus()},'btn secondary small');
  header.append(searchToggle);
  const searchPanel=el('div','sola-v16-search');searchPanel.hidden=true;
  const searchInput=field('このチャット内を検索（2文字以上）');searchInput.maxLength=100;
  const searchResults=el('div','sola-v16-results');
  const searchGo=button('検索',runSearch,'btn secondary small');
  searchPanel.append(add(el('div','sola-v16-search-row'),searchInput,searchGo),searchResults);
  box.insertBefore(searchPanel,messages);
  searchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runSearch()}});
  async function runSearch(){
    const q=searchInput.value.trim();searchResults.replaceChildren();
    if(q.length<2){searchResults.append(el('div','subtle','2文字以上で検索してね'));return}
    searchGo.disabled=true;
    try{
      const result=await api('/api/chats/'+id+'/search?q='+encodeURIComponent(q));
      if(state.chatId!==id)return;
      if(!result.messages.length)searchResults.append(el('div','subtle','見つからなかったよ'));
      for(const m of result.messages){
        const item=button(m.username+'：'+String(m.body||'').slice(0,100),async()=>{searchPanel.hidden=true;await jumpToReply(m.id)},'sola-v16-result');
        searchResults.append(item);
      }
      if(result.messages.length===50)searchResults.append(el('div','subtle','最新50件を表示中'));
    }catch(e){searchResults.append(el('div','subtle',e.message))}finally{searchGo.disabled=false}
  }
  const announcement=el('div','chat-announcement');announcement.hidden=true;box.insertBefore(announcement,messages);
  // SOLA_SPEED_PRESENCE_V1: keep chat metadata and DM presence on independent, slower schedules.
  let lastChatMetaAt=0,lastDmPresenceAt=0,lastReadId=0,dmOtherId=null;
  async function refresh(forceBottom=false,preserveTop=false){
    if(state.chatId!==id||refreshing)return;refreshing=true;
    try{
      const r=await api('/api/chats/'+id+'/messages');if(state.chatId!==id)return;
      const wasNearBottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<110;
      // SOLA_SPEED_PRESENCE_V1: avoid requesting the chat list twice every poll.
      const now=Date.now();
      if(!lastChatMetaAt||now-lastChatMetaAt>30000){
        lastChatMetaAt=now;
        if(r.chat.kind==='dm'){
          try{
            const list=await api('/api/chats');
            const entry=list.chats.find(c=>c.id===id);
            dmOtherId=entry?.other_user_id||dmOtherId;
            heading.textContent=entry?.name||state.chatName||'チャット';
          }catch{heading.textContent=state.chatName||'チャット'}
        }else heading.textContent=r.chat.name||state.chatName||'チャット';
      }
      state.chatKind=r.chat.kind;
      if(r.chat.kind==='group'&&r.chat.announcement){announcement.textContent='📣 '+r.chat.announcement;announcement.hidden=false}else{announcement.hidden=true;announcement.textContent=''}
      if(r.chat.kind==='dm'){
        // Presence is refreshed at least every 8 seconds while the chat is visible.
        if(!lastDmPresenceAt||now-lastDmPresenceAt>=8000){
          lastDmPresenceAt=now;
          if(dmOtherId){
            try{
              const u=await api('/api/users/'+dmOtherId);
              const status=u.user.status;
              const isOnline=Boolean(u.user.online);
              presence.textContent=status==='busy'?'● 取り込み中':isOnline?'● オンライン':'● オフライン';
              presence.className='chat-presence '+(isOnline?'online':'offline');
            }catch{presence.textContent='● 状態を確認できないよ';presence.className='chat-presence'}
          }
        }
        try{const status=await api('/api/chats/'+id+'/typing');typingBubble.hidden=!status.typing}catch{typingBubble.hidden=true}
      }else{presence.textContent='グループチャット';presence.className='chat-presence'}
      if(r.chat.kind==='group'&&!header.contains(manage))header.append(button('🔑 ID',async()=>{try{const r=await api('/api/groups/'+id+'/members');copyGroupId(r.chat.group_code)}catch(e){sola49Alert(e.message)}},'btn secondary small'),manage);
      if(r.chat.kind==='group'&&!window.__solaV23GroupInfo?.[id]){
        try{const info=await api('/api/groups/'+id+'/members');(window.__solaV23GroupInfo??={})[id]={moderator:info.is_owner,official:info.chat.official}}catch{}
      }
      const combined=[...new Map([...olderMessages.values(),...r.messages].map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id);
      if(olderMessages.size===0&&r.messages.length<60)hasMoreOlder=false;
      if(!unreadMarkerDetermined){
        unreadMarkerDetermined=true;
        if(initialUnread>0&&r.messages.length){
          const incoming=r.messages.filter(m=>m.user_id!==state.me.id&&!m.is_system);
          const index=Math.max(0,incoming.length-initialUnread);
          unreadMarkerId=incoming[index]?.id||null;
        }
      }
      const messageSignature=JSON.stringify([combined,r.group_reads||{},unreadMarkerId]);
      // Polling every four seconds must not rebuild unchanged bubbles or close menus.
      if(messageSignature!==lastRenderedSignature){
      closeContextMenu();
      messages.replaceChildren();let lastId=null,lastDayKey=null;
      for(const m of combined){
        const stamp=solaParseServerTime(m.created_at);
        if(stamp){
          const key=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(stamp);
          if(key!==lastDayKey){
            const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
            const yesterday=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()-86400000));
            const label=key===today?'今日':key===yesterday?'昨日':new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long',day:'numeric'}).format(stamp);
            messages.append(el('div','sola-v15-day-divider',label));lastDayKey=key;
          }
        }
        if(unreadMarkerId===m.id)messages.append(el('div','sola-v15-unread-divider','ここから未読'));
        if(m.is_system){const event=el('div','sola26-system',m.username+'が'+m.body);event.dataset.solaMessageId=m.id;messages.append(event);lastId=null;continue}
        const mine=m.user_id===state.me.id;
        const line=el('div','bubbleline'+(mine?' mine':''));line.dataset.solaMessageId=m.id;
        const col=el('div','bubblecol');
        if(r.chat.kind==='group'&&!mine){
          const show=lastId!==m.user_id;const av=show?avatar(m.username,true,m.user_id):el('div','avatar small','');if(!show)av.style.visibility='hidden';line.append(av);
          if(show){solaProfileClick(av,m.user_id)}
        }
        const bubble=el('div','bubble');
        if(r.chat.kind==='group'&&!mine&&lastId!==m.user_id){const sender=el('div','sender sola50-sender',m.username);solaProfileClick(sender,m.user_id);bubble.append(sender)}
        if(m.deleted_at){bubble.append(el('div','subtle','送信が取り消されました'));col.append(bubble);line.append(col);messages.append(line);lastId=m.user_id;continue}
        if(m.reply_to){const quoted=el('div','quoted sola26-reply-target sola50-reply');const replyText='返信先：'+(m.reply_username||'ユーザー')+' / '+(m.reply_body||'📷 写真');quoted.append(el('span','sola50-reply-label',replyText));quoted.title=replyText+'（押すと返信元へ移動）';quoted.tabIndex=0;quoted.setAttribute('role','button');quoted.onclick=async()=>jumpToReply(m.reply_to);quoted.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();jumpToReply(m.reply_to)}};bubble.append(quoted)}
        if(m.body){
          const bodyNode=el('div','bubbletext',m.body);
          bubble.append(bodyNode);
          // v56: collapse only messages whose rendered text actually exceeds six lines.
          requestAnimationFrame(()=>{
            if(!bodyNode.isConnected)return;
            const style=getComputedStyle(bodyNode);
            const lineHeight=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.5||24;
            if(bodyNode.scrollHeight<=lineHeight*6+2)return;
            const toggle=button('もっと見る',()=>{
              const isExpanded=expandedLongMessages.has(m.id);
              if(isExpanded)expandedLongMessages.delete(m.id);else expandedLongMessages.add(m.id);
              bodyNode.classList.toggle('sola56-collapsed',isExpanded);
              toggle.textContent=isExpanded?'もっと見る':'閉じる';
            },'sola56-expand');
            if(!expandedLongMessages.has(m.id))bodyNode.classList.add('sola56-collapsed');
            else toggle.textContent='閉じる';
            bodyNode.after(toggle);
          });
          const preview=sola26LinkPreview(m.body);if(preview)bubble.append(preview)
        }if(m.edited_at)bubble.append(el('span','edit-mark','（編集済み）'));
        if(m.file_name){const link=el('a','chat-file','📎 '+m.file_name);link.href='/api/chat-files/'+m.id;link.download=m.file_name;link.title='ファイルを保存';bubble.append(link)}
        if(m.has_image){const img=el('img','message-image');img.src='/api/chat-images/'+m.id;img.alt='送信された写真';img.loading='lazy';img.onclick=async()=>window.open(img.src,'_blank','noopener');bubble.append(img)}
        // Reaction badges are absolutely overlaid on the bubble edge.
        // They NEVER participate in message width/height calculations.
        const reactionData=(m.reactions||[]).filter(r=>Number(r.count)>0);
        if(reactionData.length){
          const reactions=el('div','sola-reaction-overlay');
          reactions.setAttribute('aria-label','メッセージのリアクション');
          reactionData.forEach(r=>{
            const count=Number(r.count)||0;
            const chip=button(r.emoji+(count>1?' '+count:''),async()=>{
              try{await api('/api/messages/'+m.id+'/reactions','POST',{emoji:r.emoji});await refresh()}catch(e){sola49Alert(e.message)}
            },'sola-reaction-overlay-chip'+(r.mine?' mine-reaction':''));
            chip.title=r.emoji+' '+count+'件';
            chip.setAttribute('aria-label',r.emoji+' '+count+'件のリアクション');
            reactions.append(chip);
          });
          bubble.append(reactions);
          bubble.classList.add('sola-bubble-with-reactions');
        }
        col.append(bubble);
        const actions=el('div','message-actions');if(mine){if(!m.has_image)actions.append(button('✏️ 編集',async()=>{const body=await sola49Prompt('メッセージを編集',m.body);if(body===null)return;try{await api('/api/messages/'+m.id,'PATCH',{body});await refresh()}catch(e){sola49Alert(e.message)}},'tiny-action'));actions.append(button('🗑 送信取り消し',async()=>{if(!await sola49Confirm('このメッセージの送信を取り消す？'))return;try{await api('/api/messages/'+m.id,'DELETE');await refresh()}catch(e){sola49Alert(e.message)}},'tiny-action'))}else{actions.append(button('⚑ 通報',async()=>sendReport({user_id:m.user_id,message_id:m.id}),'tiny-action'));if(state.chatKind==='group'&&window.__solaV23GroupInfo?.[id]?.moderator)actions.append(button('🗑 管理者として削除',async()=>{if(!await sola49Confirm('このメッセージを管理者として削除する？'))return;try{await api('/api/messages/'+m.id,'DELETE');await refresh()}catch(e){sola49Alert(e.message)}},'tiny-action'))}actions.append(button('↩ 返信',async()=>selectReply(m),'tiny-action'));
        // Copy only the text the current user can already see; never copy private metadata.
        if(m.body&&m.body.trim())actions.append(button('📋 コピー',async()=>{
          try{
            if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(m.body);toast('メッセージをコピーしたよ')}
            else{const ta=document.createElement('textarea');ta.value=m.body;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();if(!ok)throw new Error('copy failed');toast('メッセージをコピーしたよ')}
          }catch{await sola49Prompt('このメッセージをコピーしてね',m.body)}
          closeContextMenu();
        },'tiny-action'));
        const reactionMenu=el('div','reaction-menu');reactionMenu.hidden=true;
        ['👍','❤️','😂','😮','🎉','🙏'].forEach(emoji=>reactionMenu.append(button(emoji,async()=>{
          celebrateReaction(emoji,bubble);
          try{await api('/api/messages/'+m.id+'/reactions','POST',{emoji});await refresh()}catch(e){sola49Alert(e.message)}
        },'emoji-action')));
        // No permanent action row beneath messages: actions only appear on request.
        line.addEventListener('contextmenu',e=>{
          if(e.target.closest('button,a,input'))return;
          e.preventDefault();openContextMenu(m,actions,reactionMenu,bubble,e.clientX,e.clientY);
        });
        line.addEventListener('pointerdown',e=>{
          if(e.pointerType==='mouse'||e.target.closest('button,a,input'))return;
          cancelLongPress();
          longPressStart={x:e.clientX,y:e.clientY,id:e.pointerId};
          const x=e.clientX,y=e.clientY;
          longPressTimer=setTimeout(async()=>{
            longPressTimer=null;suppressTapUntil=Date.now()+700;
            openContextMenu(m,actions,reactionMenu,bubble,x,y);
            if(navigator.vibrate)navigator.vibrate(12);
          },480);
        });
        line.addEventListener('pointermove',e=>{
          if(longPressStart&&longPressStart.id===e.pointerId&&
            Math.hypot(e.clientX-longPressStart.x,e.clientY-longPressStart.y)>11)cancelLongPress();
        });
        line.addEventListener('pointerup',cancelLongPress);
        line.addEventListener('pointercancel',cancelLongPress);
        line.addEventListener('click',e=>{
          if(Date.now()<suppressTapUntil){e.preventDefault();e.stopPropagation()}
        },true);
        // Keep message metadata outside the bubble, matching the requested layout.
        const meta=el('div','sola-v12-meta');
        if(mine&&r.chat.kind==='group'&&!m.deleted_at){
          const receipt=el('div','sola-group-read-receipt');
          const count=Number((r.group_reads||{})[String(m.id)]||0);
          receipt.append(el('span','','既読 '+count+'人'));
          const detail=button('詳しく',async()=>{
            try{
              const result=await api('/api/chats/'+id+'/messages/'+m.id+'/readers');
              const overlay=el('div','sola-read-overlay');
              const panel=el('div','sola-read-panel');
              const close=async()=>overlay.remove();
              panel.append(add(el('div','sola-read-panel-head'),el('h3','','既読した人（'+result.count+'人）'),button('×',close,'btn secondary small')));
              const people=el('div','sola-read-people');
              if(!result.readers.length)people.append(el('p','subtle','まだ誰も既読していないよ'));
              for(const person of result.readers){
                const entry=el('div','sola-read-person');
                entry.append(avatar(person.username,true,person.user_id),el('span','',person.username));
                people.append(entry);
              }
              panel.append(people);overlay.append(panel);
              overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
              document.body.append(overlay);
            }catch(e){sola49Alert(e.message)}
          },'sola-read-detail');
          receipt.append(detail);meta.append(receipt);
        }
        const date=solaParseServerTime(m.created_at);
        if(date){
          const stamp=el('time','sola-message-time',
            new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date));
          stamp.dateTime=date.toISOString();
          meta.append(stamp);
        }
        const more=button('•••',async()=>{
          const rect=more.getBoundingClientRect();
          if(!contextMenu.hidden){closeContextMenu();return}
          openContextMenu(m,actions,reactionMenu,bubble,rect.left+rect.width/2,rect.top+rect.height/2);
        },'sola-message-more');
        more.type='button';more.title='メッセージのメニュー';more.setAttribute('aria-label','メッセージのメニュー');
        const controls=el('div','sola-v12-controls');
        controls.append(meta,more);
        if(mine){
          line.append(controls,col);
          {const ownAvatar=avatar(state.me.username,true,state.me.id);solaProfileClick(ownAvatar,state.me.id);line.append(ownAvatar)}
        }else{
          line.append(col,controls);
        }
        messages.append(line);lastId=m.user_id
      }
      lastRenderedSignature=messageSignature;
      if(firstChatLoad){
        firstChatLoad=false;
        let stored='bottom';try{stored=sessionStorage.getItem(scrollKey)||'bottom'}catch{}
        if(stored!=='bottom'&&Number.isFinite(Number(stored)))messages.scrollTop=Number(stored);
        else messages.scrollTop=messages.scrollHeight;
      }else if(!preserveTop&&(wasNearBottom||forceBottom))messages.scrollTop=messages.scrollHeight;
      updateJump();
      }else if(forceBottom){messages.scrollTop=messages.scrollHeight;}
      if(r.messages.length&&document.visibilityState==='visible'){
        const newest=r.messages[r.messages.length-1].id;
        // Read receipts are only sent when the latest message changes.
        if(newest!==lastReadId){
          lastReadId=newest;
          api('/api/chats/'+id+'/read','POST',{last_id:newest}).catch(async()=>{lastReadId=0});
        }
      }
    }catch(e){messages.replaceChildren(message(e.message))}finally{refreshing=false}
  }
  await refresh(true);
  state.timer=setInterval(async()=>{if(state.chatId===id&&document.visibilityState==='visible'&&navigator.onLine)refresh()},3500)
}

async function sendReport(target){
  const reason=await sola49Prompt('通報理由を入力してね（5〜500文字）。通報は運営だけが確認するよ。');
  if(reason===null)return;
  try{await api('/api/reports','POST',{...target,reason});sola49Alert('通報を送ったよ')}catch(e){sola49Alert(e.message)}
}
async function renderNotifications(main){
  const allRead=button('✓ すべて既読',async()=>{try{await api('/api/notifications/read','POST');await updateNotificationBadge();navigate('notifications')}catch(e){sola49Alert(e.message)}},'btn secondary small');
  const refreshButton=button('↻ 更新',async()=>refreshNotifications(true),'btn secondary small');
  add(main,title('🔔 通知センター',[refreshButton,allRead]));
  const inviteBox=card(el('h3','','🎮 対戦への招待'));main.append(inviteBox);
  try{const data=await api('/game-api/invitations');const names={ttt:'○×ゲーム',connect4:'四目並べ',reversi:'リバーシ'};
    if(!data.invitations.length)inviteBox.append(el('p','subtle','対戦招待はまだないよ'));
    for(const m of data.invitations){const item=el('div','notification-card');const status=m.status==='pending'?'返事待ち':m.status==='expired'?'期限切れ':m.status==='declined'?'辞退済み':m.status==='playing'||m.status==='disconnected'?'対戦中':'終了';
      item.append(el('span','',m.host+' さんから '+(names[m.game]||m.game)+' · '+status));
      if(m.status==='pending'){const respond=async accept=>{try{await api('/game-api/respond','POST',{id:m.id,accept});navigate('notifications')}catch(e){toast(e.message)}};item.append(button('参加',async()=>respond(true),'btn small'),button('辞退',async()=>respond(false),'btn secondary small'))}
      if(m.status==='playing'||m.status==='disconnected')item.append(button('ゲームを開く',solaOpenGameCenter,'btn small'));
      inviteBox.append(item)}
  }catch(e){inviteBox.append(el('p','subtle','対戦招待を読み込めなかったよ'))}
  const tabs=el('div','notification-tabs'),content=card(message('読み込み中…'));
  const searchBox=field('通知を検索');const important=el('input');important.type='checkbox';important.checked=state.noticeOnlyImportant;
  const importantLabel=el('label','row wrap');importantLabel.append(important,el('span','','重要通知だけ表示'));main.append(card(searchBox,importantLabel),tabs,content);
  try{
    let r=await api('/api/notifications');state.unreadNotifications=r.unread;updateNotificationBadge();
    const options=[['all','すべて'],['unread','未読'],['group','グループ'],['other','その他']];
    const iconFor=kind=>kind==='friend_request'||kind==='friend_accept'?'👥':kind.startsWith('group')||kind==='transfer'?'👑':kind==='message'?'💬':'🔔';
    const kindMatch=(n,f)=>f==='all'||(f==='unread'?!n.is_read:f==='friend'?n.kind.startsWith('friend'):f==='group'?n.kind.startsWith('group')||n.kind==='transfer':!n.kind.startsWith('friend')&&!n.kind.startsWith('group')&&n.kind!=='transfer');
    const show=async()=>{
      tabs.replaceChildren();options.forEach(([key,label])=>tabs.append(button(label+(key==='unread'?' ('+r.notifications.filter(n=>!n.is_read).length+')':''),async()=>{state.notificationFilter=key;show()},'filter-chip'+(state.notificationFilter===key?' selected':''))));
      content.replaceChildren();const items=r.notifications.filter(n=>!n.kind.startsWith('friend')&&kindMatch(n,state.notificationFilter)&&(!state.noticeOnlyImportant||['friend_request','group_request','group_decision','transfer','group_admin'].includes(n.kind))&&n.text.toLowerCase().includes(searchBox.value.toLowerCase()));
      if(!items.length)content.append(sola26Empty('この種類の通知はまだないよ'));
      items.forEach(n=>{
        const item=el('div','notification-card'+(!n.is_read?' notification-new':''));
        const av=n.actor_id?avatar(n.actor_name||'?',false,n.actor_id):el('div','notification-system',iconFor(n.kind));
        const body=el('div','notification-body'),head=el('div','notification-head');
        add(head,el('span','notification-kind',iconFor(n.kind)+' '+(n.kind.startsWith('friend')?'フレンド':n.kind.startsWith('group')||n.kind==='transfer'?'グループ':'お知らせ')),el('time','notification-time',formatDate(n.created_at)));
        body.append(head,el('div','notification-text',n.text));
        const actions=el('div','notification-actions');
        const mark=async()=>{if(!n.is_read){await api('/api/notifications/'+n.id+'/read','POST');n.is_read=1;state.unreadNotifications=Math.max(0,state.unreadNotifications-1);updateNotificationBadge()}};
        const go=async()=>{try{await mark();await openNotificationTarget(n)}catch(e){toast('通知を開けなかったよ：'+e.message)}};
        item.classList.add('notification-clickable');item.tabIndex=0;item.setAttribute('role','link');item.setAttribute('aria-label','通知を開く: '+n.text);
        item.onclick=e=>{if(e.target.closest('button'))return;go()};item.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();go()}};
        
        if(n.chat_id)actions.append(button('チャットを開く',go,'btn secondary small'));
        if(n.actor_id&&n.kind!=='friend_request')actions.append(button('プロフィール',async()=>{try{await mark();renderUserProfile(main,n.actor_id)}catch(e){sola49Alert(e.message)}},'btn secondary small'));
        if(!n.is_read)actions.append(button('既読にする',async()=>{try{await mark();show()}catch(e){sola49Alert(e.message)}},'btn secondary small'));
        body.append(actions);item.append(av,body);content.append(item)
      })
    };
    let refreshing=false;
    async function refreshNotifications(manual=false){
      if(refreshing||!main.isConnected||state.view!=='notifications')return;
      refreshing=true;
      try{
        const next=await api('/api/notifications');
        if(!main.isConnected||state.view!=='notifications')return;
        const changed=JSON.stringify(next.notifications)!==JSON.stringify(r.notifications);
        r=next;
        state.unreadNotifications=next.unread;
        document.querySelectorAll('[data-notification-count]').forEach(b=>{b.textContent=next.unread>99?'99+':String(next.unread);b.hidden=!next.unread});
        if(changed||manual)show();
        if(manual)toast('通知を更新したよ');
      }catch(e){if(manual)toast('更新できなかったよ：'+e.message)}
      finally{refreshing=false}
    }
    searchBox.oninput=show;important.onchange=async()=>{state.noticeOnlyImportant=important.checked;show()};show();
    const notificationTimer=setInterval(async()=>{
      if(!main.isConnected||state.view!=='notifications'){clearInterval(notificationTimer);return}
      if(document.visibilityState==='visible')refreshNotifications();
    },10000);
    if(state.officialAdmin)main.append(card(button('⚑ 運営への通報一覧',async()=>renderAdminReports(main),'btn secondary small')))
  }catch(e){content.replaceChildren(message(e.message))}
}
// Server timestamps: SQLite uses UTC SQL strings; Flask may return RFC 1123 GMT dates.
function solaParseServerTime(value){
  if(!value)return null;
  const raw=String(value).trim();
  let normalized=raw;
  if(/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d+)?$/.test(raw)){
    normalized=raw.replace(' ','T')+'Z';
  }
  const parsed=new Date(normalized);
  return Number.isNaN(parsed.getTime())?null:parsed;
}
function formatDate(value){if(!value)return '';const date=new Date(String(value).replace(' ','T')+(String(value).includes('Z')||String(value).includes('+')?'':'Z'));return isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date)}
function renderNotificationsFresh(){navigate('notifications')}

let solaAdminLiveStop=null;
async function renderAdminDashboard(main){
 if(solaAdminLiveStop){solaAdminLiveStop();solaAdminLiveStop=null;}
 if(!state.officialAdmin){navigate('chats');return}

 main.replaceChildren(
  title('🛡️ SOLA ADMIN',[
   button('↻ 更新',async()=>renderAdminDashboard(main),'btn secondary small'),
   button('📋 通報を確認',
    async()=>renderAdminReports(main),'btn secondary small')
  ])
 );

 const content=el('div','sola-admin-dashboard');
 main.append(content);

 try{
  const data=await api('/api/admin/overview');
  const statNodes={};

  function section(name){
   const h=el('h3','sola-admin-section-title',name);
   content.append(h);
  }

  const stats=el('div','sola-admin-stats sola-admin-stats-new');

  [
   ['👥 総ユーザー数',data.counts.users],
   ['🟢 オンライン',data.counts.online],
   ['🏠 総ルーム数',data.counts.groups],
   ['💬 総メッセージ数',data.counts.messages]
  ].forEach(([label,value])=>{
   const number=el('strong','sola-admin-number',value);
   statNodes[label]=number;
   stats.append(card(el('div','subtle',label),number));
  });

  content.append(stats);
  // v27: separate owner transfer from deputy grants.
  const rolePanel=el('div','card sola-admin-roles');
  rolePanel.append(el('h3','','👑 運営権限管理'));
  const roleStatus=el('div','subtle','権限を読み込み中…');rolePanel.append(roleStatus);
  const roleActions=el('div','sola-v27-role-actions');rolePanel.append(roleActions);
  content.append(rolePanel);
  async function loadRoles(){
   try{
    const roles=await api('/api/admin/roles');
    roleStatus.textContent='管理者（1人）：'+roles.owner+' ／ 副管理者（'+roles.deputies.length+'人）：'+(roles.deputies.join('、')||'なし');
    roleActions.replaceChildren();
    state.sola28Owner=roles.is_owner;if(typeof drawUsers==='function')drawUsers();if(!roles.is_owner)return;
    const select=el('select','field');
    const first=el('option','','対象ユーザーを選択');first.value='';select.append(first);
    data.users.filter(u=>u.username.toLowerCase()!==roles.owner.toLowerCase()).forEach(u=>{const opt=el('option','',u.username);opt.value=String(u.id);select.append(opt)});
    roleActions.append(select);
    async function perform(kind){
     if(!select.value){sola49Alert('ユーザーを選択してね');return}
     const target=select.options[select.selectedIndex].textContent;
     const password='';
     try{
      if(kind==='transfer'){
       if(!await sola49Confirm('管理者を '+target+' に譲渡する？ あなたの管理者権限は失われるよ。'))return;
       const confirmation=await sola49Prompt('確認のため TRANSFER と入力');if(confirmation===null)return;
       await api('/api/admin/roles/transfer','POST',{user_id:Number(select.value),admin_password:password,confirmation});
       state.officialAdmin=false;toast('譲渡が完了したよ。新しい管理者は管理者としてログインしてね。');navigate('chats');return;
      }
      if(kind==='add')await api('/api/admin/roles/deputies','POST',{user_id:Number(select.value),admin_password:password});
      else await api('/api/admin/roles/deputies/'+select.value,'DELETE',{admin_password:password});
      await loadRoles();toast('管理者権限を更新したよ');
     }catch(e){sola49Alert(e.message)}
    }
    roleActions.append(button('👑 管理者を譲渡',async()=>perform('transfer'),'btn secondary small'),button('🛡️ 副管理者にする',async()=>perform('add'),'btn secondary small'),button('副管理者を解除',async()=>perform('remove'),'btn secondary small'));
   }catch(e){roleStatus.textContent='権限情報を取得できなかったよ：'+e.message}
  }
  loadRoles();
  sola28AdminExtras(content,data);


  // v26: tabs keep the dashboard compact and preserve all filters during live refresh.
  const adminTabs=el('div','sola-v26-admin-tabs');
  const userTab=button('👥 ユーザー管理',async()=>switchAdminTab('users'),'btn small');
  const groupTab=button('🏠 ルーム管理',async()=>switchAdminTab('groups'),'btn secondary small');
  adminTabs.append(userTab,groupTab);content.append(adminTabs);
  const userPanel=el('div','sola-v26-admin-panel');
  const groupPanel=el('div','sola-v26-admin-panel');
  const originalContentAppend=content.append.bind(content);
  let currentPanel=userPanel;
  content.append=(...nodes)=>currentPanel.append(...nodes);
  function switchAdminTab(tab){
    userPanel.hidden=tab!=='users';groupPanel.hidden=tab!=='groups';
    userTab.className=tab==='users'?'btn small':'btn secondary small';
    groupTab.className=tab==='groups'?'btn small':'btn secondary small';
  }
  section('👥 全ユーザー管理');

  const search=field('ユーザー名で検索');
  content.append(search);

  const statusFilter=el('select','field');
  [
   ['all','すべてのユーザー'],
   ['online','オンラインのみ'],
   ['offline','オフラインのみ']
  ].forEach(([value,label])=>{
   const option=el('option','',label);
   option.value=value;
   statusFilter.append(option);
  });
  content.append(statusFilter);

  const users=el('div','sola-admin-list');
  content.append(users);

  function drawUsers(){
   users.replaceChildren();

   data.users.filter(u=>{
    const match=u.username.toLowerCase()
      .includes(search.value.toLowerCase());

    const status=statusFilter.value==='all' ||
      (statusFilter.value==='online' && u.online) ||
      (statusFilter.value==='offline' && !u.online);

    return match && status;
   }).sort((a,b)=>Number(b.online)-Number(a.online))
   .forEach(u=>{
    const line=el('div','sola-admin-line sola-admin-user-row');

    const name=el('span','grow',
      (u.online?'🟢 ':'⚫ ')+u.username+
      (u.online?' · オンライン':' · オフライン'));
    solaProfileClick(name,u.id);

    line.append(
     name,
     button('プロフィール',
      async()=>solaOpenProfileCard(u.id),
      'btn secondary small')
    );
    line.append(button('⚠️ 警告',async()=>{const reason=await sola49Prompt(u.username+' への警告理由');if(!reason)return;try{await api('/api/v28/warnings/'+u.id,'POST',{reason});toast('警告を送信したよ')}catch(e){sola49Alert(e.message)}},'btn secondary small'));
    if(state.sola28Owner)line.append(button('🏅 バッジ',async()=>{const x=await api('/api/v28/badges');const choices=Object.entries(x.catalog).filter(([key])=>['early','verified','contributor','ideas','bug','supporter','event','winner','creator','beta','legend'].includes(key));const choice=await sola49Prompt('付与/取り消すバッジのIDを入力：\n'+choices.map(([k,v])=>k+' : '+v).join('\n'));if(!choice)return;const remove=await sola49Confirm('OK＝取り消し、キャンセル＝付与');try{await api('/api/v28/badges/grant/'+u.id,'POST',{badge:choice.trim(),remove});toast('バッジを更新したよ')}catch(e){sola49Alert(e.message)}},'btn secondary small'));
    if(state.sola28Owner)line.append(button('アカウント削除',async()=>{if(u.id===state.me.id){sola49Alert('管理者自身はここから削除できないよ');return}if(!await sola49Confirm(u.username+' を削除する？ 過去のメッセージは匿名で残るよ。取り消せないよ。'))return;const admin_password='';const confirmation=await sola49Prompt('確認のため DELETE と入力');if(confirmation===null)return;try{await api('/api/admin/users/'+u.id+'/delete','POST',{admin_password,confirmation});data.users=data.users.filter(x=>x.id!==u.id);drawUsers();toast('アカウントを削除したよ')}catch(e){sola49Alert(e.message)}},'btn secondary small'));
    users.append(line);
   });

   if(!users.children.length)
    users.append(message('該当するユーザーはいないよ','subtle'));
  }

  search.oninput=drawUsers;
  statusFilter.onchange=drawUsers;
  drawUsers();

  currentPanel=groupPanel;
  section('🏠 全ルーム管理');

  const groupSearch=field('ルーム名・ID・作成者で検索');
  content.append(groupSearch);

  const groups=el('div','sola-admin-list');
  content.append(groups);

  function drawGroups(){
   groups.replaceChildren();

   data.groups.filter(g=>
    (g.name+' '+g.group_code+' '+(g.owner||'')).toLowerCase()
      .includes(groupSearch.value.toLowerCase())
   ).forEach(g=>{
    const line=el('div','sola-admin-line sola-admin-group-row');

    const info=el('div','grow');
    info.append(
     el('strong','',g.name),
     el('div','subtle','ID: '+g.group_code),
     el('div','subtle','作成者: '+(g.owner||'不明')),
     el('div','subtle',
      '参加者 '+g.members+'人 · メッセージ '+g.messages+'件')
    );

    const enter=button('入室',async()=>{
      if(!await sola49Confirm('運営者として「'+g.name+'」に参加する？ 管理操作として履歴に記録されるよ。'))return;
      enter.disabled=true;
      try{await api('/api/admin/groups/'+g.id+'/enter','POST');openChat(g.id,g.name,'group')}
      catch(e){sola49Alert(e.message);enter.disabled=false}
    },'btn secondary small');
    line.append(info,enter);
    groups.append(line);
   });

   if(!groups.children.length)
    groups.append(message('該当するルームはないよ','subtle'));
  }

  groupSearch.oninput=drawGroups;
  drawGroups();

  content.append=originalContentAppend;
  content.append(userPanel,groupPanel);
  switchAdminTab('users');
  const liveInfo=el('p','sola-admin-live-info','● オンライン状態を4秒ごとに更新');
  content.append(liveInfo);
  let busy=false;
  const timer=setInterval(async()=>{
   if(state.view!=='admin'||!main.isConnected||!content.isConnected){clearInterval(timer);return;}
   if(busy||document.hidden||!navigator.onLine)return;
   busy=true;
   try{
    const fresh=await api('/api/admin/overview');
    if(state.view!=='admin'||!content.isConnected)return;
    data.users=fresh.users;data.groups=fresh.groups;data.counts=fresh.counts;
    [['👥 総ユーザー数','users'],['🟢 オンライン','online'],['🏠 総ルーム数','groups'],['💬 総メッセージ数','messages']].forEach(([label,key])=>{if(statNodes[label])statNodes[label].textContent=fresh.counts[key];});
    drawUsers();drawGroups();
    liveInfo.textContent='● オンライン状態を4秒ごとに更新 · 最終更新 '+new Date().toLocaleTimeString('ja-JP');
   }catch(e){liveInfo.textContent='● 更新できなかったよ。次の更新で再試行する';}
   finally{busy=false;}
  },4000);
  solaAdminLiveStop=async()=>clearInterval(timer);
  content.append(el('p','subtle',
   '管理者専用ダッシュボード · オンライン状態は4秒ごとに更新 · 入室操作は履歴に記録'));
  // v29: administrator back-to-top button removed.

 }catch(e){
  content.replaceChildren(message(e.message));
 }
}

async function renderAdminReports(main){
  main.replaceChildren(title('運営への通報',[button('← 通知',async()=>sola47OpenNotifications(),'btn secondary small')]));
  const filter=el('select','field');[['all','すべて'],['open','未対応'],['reviewing','確認中'],['resolved','対応済み']].forEach(([v,t])=>{const o=el('option','',t);o.value=v;filter.append(o)});
  const query=field('通報理由・ユーザー名で検索');const c=card(message('読み込み中…'));
  main.append(card(filter,query),c);
  try{const r=await api('/api/admin/reports');const show=async()=>{c.replaceChildren();const list=r.reports.filter(x=>(filter.value==='all'||(x.status||'open')===filter.value)&&[x.reason,x.target,x.reporter].some(t=>String(t||'').toLowerCase().includes(query.value.toLowerCase())));
    if(!list.length)c.append(sola26Empty('条件に合う通報はないよ'));
    list.forEach(x=>{const entry=card(el('div','itemtitle','通報 #'+x.id+'：'+(x.target||'不明')),el('div','subtle','通報者：'+x.reporter+' ／ メッセージID：'+(x.message_id||'なし')),el('p','',x.reason));
      const sel=el('select','field');[['open','未対応'],['reviewing','確認中'],['resolved','対応済み']].forEach(([v,t])=>{const o=el('option','',t);o.value=v;sel.append(o)});sel.value=x.status||'open';
      sel.onchange=async()=>{try{await api('/api/admin/reports/'+x.id+'/status','PATCH',{status:sel.value});x.status=sel.value;toast('対応状況を保存したよ');show()}catch(e){toast(e.message)}};entry.append(sel);c.append(entry)})};filter.onchange=show;query.oninput=show;show();await sola26HealthUI(main)
  }catch(e){c.replaceChildren(message(e.message))}
}
// SOLA_SPEED_PRESENCE_V1: foreground heartbeat every 12s; background tabs expire quickly.
let solaPresenceBusy=false;
async function solaPresencePing(){
  if(!state.me||document.visibilityState!=='visible'||solaPresenceBusy)return;
  solaPresenceBusy=true;
  try{await api('/api/presence','POST')}catch{}finally{solaPresenceBusy=false}
}
setInterval(solaPresencePing,12000);
setInterval(async()=>{if(state.me&&document.visibilityState==='visible')updateNotificationBadge()},30000);
document.addEventListener('visibilitychange',async()=>{if(!document.hidden&&state.me){solaPresencePing();updateNotificationBadge();if(state.chatId)render()}});

// QR scanner: detects locally on the device; scanned URLs are never opened externally.
let solaQrScannerClose=null;
let solaQrJsLoader=null;
async function solaQrFallback(){
  if(typeof window.jsQR==='function')return true;
  if(!solaQrJsLoader){
    solaQrJsLoader=new Promise(resolve=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      script.async=true;
      script.onload=async()=>resolve(typeof window.jsQR==='function');
      script.onerror=async()=>resolve(false);
      document.head.append(script);
    });
  }
  return solaQrJsLoader;
}
async function solaQrDetector(){
  if(typeof BarcodeDetector==='undefined')return null;
  try{
    if(BarcodeDetector.getSupportedFormats){
      const formats=await BarcodeDetector.getSupportedFormats();
      if(!formats.includes('qr_code'))return null;
    }
    return new BarcodeDetector({formats:['qr_code']});
  }catch{return null}
}
function solaQrDestination(value){
  let raw=String(value||'').trim();
  if(!raw)return null;
  if(/^https?:\/\//i.test(raw)){
    try{const url=new URL(raw);if(url.origin!==location.origin)return null;raw=url.hash||url.pathname}catch{return null}
  }
  const match=raw.match(/^#?\/?(?:user|group)\/([A-Za-z0-9]{8})\/?$/i);
  if(!match)return null;
  const kind=/^#?\/?user\//i.test(raw)?'user':'group';
  return {kind,code:match[1]};
}
async function solaQrGo(value){
  const dest=solaQrDestination(value);
  if(!dest)throw new Error('SOLA CHATのプロフィール・グループQRコードではないみたい。');
  if(dest.kind==='user'){
    const result=await api('/api/public-profiles/'+encodeURIComponent(dest.code));
    if(solaQrScannerClose)solaQrScannerClose();
    navigate('search');
    const main=document.querySelector('main');
    if(main)await renderUserProfile(main,result.user_id);
  }else{
    if(solaQrScannerClose)solaQrScannerClose();
    navigate('join');
    const input=document.querySelector('.join-form input');
    if(input){input.value=dest.code.toUpperCase();input.focus();const form=input.closest('form');if(form)form.requestSubmit()}
  }
}
function openQrScanner(){
  if(solaQrScannerClose)solaQrScannerClose();
  const overlay=el('div','sola-qr-overlay');
  const dialog=el('section','sola-qr-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','QRコード読み取り');
  const heading=el('div','sola-qr-dialog-heading');
  const closeButton=button('✕ 閉じる',async()=>close(),'btn secondary small');
  heading.append(el('h2','','📷 QRコードを読み取る'),closeButton);
  const status=el('p','sola-qr-hint','カメラを使うか、QRコードの画像を選んでね。');
  const video=el('video','sola-qr-video');video.autoplay=true;video.muted=true;video.playsInline=true;video.hidden=true;
  const canvas=document.createElement('canvas');
  const actions=el('div','sola-qr-dialog-actions');
  const cameraButton=button('📹 カメラを起動',async()=>startCamera(),'btn small');
  const fileButton=button('🖼️ 画像から読み取る',async()=>fileInput.click(),'btn secondary small');
  const fileInput=field('','file');fileInput.accept='image/*';fileInput.classList.add('hidden-file');
  const manual=field('SOLA CHATのリンクを貼り付け');manual.setAttribute('aria-label','QRコードのリンク');
  const manualButton=button('リンクを開く',async()=>{try{await solaQrGo(manual.value)}catch(e){status.textContent=e.message}},'btn secondary small');
  const manualRow=el('div','sola-qr-manual');manualRow.append(manual,manualButton);
  actions.append(cameraButton,fileButton);
  dialog.append(heading,status,video,actions,fileInput,manualRow);overlay.append(dialog);document.body.append(overlay);
  let stream=null,frameId=null,active=true,processing=false,detector=null,jsqrAvailable=false;
  const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const onKey=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',onKey);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  function stopCamera(){if(frameId!==null){cancelAnimationFrame(frameId);frameId=null}if(stream){stream.getTracks().forEach(track=>track.stop());stream=null}video.srcObject=null;video.hidden=true}
  function close(){if(!active)return;active=false;stopCamera();document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',onKey);overlay.remove();if(solaQrScannerClose===close)solaQrScannerClose=null}
  solaQrScannerClose=close;
  async function detect(source){
    if(detector){try{const found=await detector.detect(source);if(found.length)return found[0].rawValue}catch{}}
    if(!jsqrAvailable)return null;
    const w=source.videoWidth||source.naturalWidth||source.width;
    const h=source.videoHeight||source.naturalHeight||source.height;
    if(!w||!h)return null;
    const scale=Math.min(1,900/Math.max(w,h));
    canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    const result=window.jsQR(pixels.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});
    return result?.data||null;
  }
  async function setupDetector(){detector=await solaQrDetector();if(!detector)jsqrAvailable=await solaQrFallback();return Boolean(detector||jsqrAvailable)}
  async function startCamera(){
    if(stream)return;
    if(!navigator.mediaDevices?.getUserMedia){status.textContent='この環境ではカメラを使えないよ。HTTPSまたはlocalhostで試してね。';return}
    cameraButton.disabled=true;
    try{
      const supported=await setupDetector();
      if(!active)return;
      if(!supported){status.textContent='QR読み取り機能を読み込めなかったよ。ブラウザや通信を確認してね。';return}
      stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
      if(!active){stopCamera();return}
      video.srcObject=stream;video.hidden=false;await video.play();status.textContent='QRコードをカメラに映してね。';
      const tick=async()=>{
        if(!active||!stream)return;
        if(!processing&&video.readyState>=2){processing=true;try{const value=await detect(video);if(value){status.textContent='読み取れたよ！';await solaQrGo(value);return}}catch(e){status.textContent=e.message}finally{processing=false}}
        if(active&&stream)frameId=requestAnimationFrame(tick);
      };frameId=requestAnimationFrame(tick);
    }catch(e){if(active)status.textContent=e.name==='NotAllowedError'?'カメラが許可されていないよ。ブラウザの設定を確認してね。':'カメラを起動できなかったよ：'+e.message;stopCamera()}
    finally{if(active)cameraButton.disabled=false}
  }
  fileInput.onchange=async()=>{
    const file=fileInput.files?.[0];if(!file)return;
    fileButton.disabled=true;status.textContent='画像を読み取り中…';
    let bitmap=null;
    try{
      const supported=await setupDetector();if(!supported)throw new Error('このブラウザでQRコードを解析できなかったよ。');
      bitmap=await createImageBitmap(file);
      const value=await detect(bitmap);
      if(!value)throw new Error('画像からQRコードを見つけられなかったよ。');
      await solaQrGo(value);
    }catch(e){if(active)status.textContent=e.message}
    finally{bitmap?.close?.();fileButton.disabled=false;fileInput.value=''}
  };
  closeButton.focus();
}

// SOLA PAGE URL ROUTER v2
const solaPagePaths={home:'/home',chats:'/chats',join:'/join',search:'/search',notifications:'/notifications',profile:'/profile',reports:'/reports',badges:'/badges',admin:'/admin'};
function solaSetPath(path,replace=false){
  if(location.pathname===path&&!location.search&&!location.hash)return;
  history[replace?'replaceState':'pushState'](null,'',path);
}
let solaRouteSerial=0;
async function solaLoadRoute(){
  const serial=++solaRouteSerial;
  let path=location.pathname;
  if(path==='/login'){
    const next=new URLSearchParams(location.search).get('next');
    if(state.me&&next&&/^\/(room\/[A-Za-z0-9]{8}|dm\/\d+|user\/[A-Za-z0-9]{8}|admin)$/.test(next)){
      history.replaceState(null,'',next);path=next;
    }else if(state.me){navigate('home',true);return}
  }
  if(!state.me){render();return}
  const map={ '/':'home','/home':'home','/chats':'chats','/search':'search','/notifications':'notifications','/profile':'profile','/reports':'reports','/badges':'badges','/join':'join','/admin':'admin' };
  if(map[path]){
    const view=map[path];
    if(view==='notifications'){state.view='home';solaSetPath('/home',true);render();sola47OpenNotifications();return}
    if(view==='admin'&&!state.officialAdmin){navigate('chats',true);toast('管理者だけが開けるページだよ');return}
    state.chatId=null;state.view=view;render();return;
  }
  const group=path.match(/^\/room\/([A-Za-z0-9]{8})$/);
  const dm=path.match(/^\/dm\/(\d+)$/);
  const user=path.match(/^\/user\/([A-Za-z0-9]{8})$/);
  if(group||dm){
    try{
      const result=await api('/api/chats');if(serial!==solaRouteSerial)return;
      const chat=result.chats.find(c=>group?(c.kind==='group'&&String(c.group_code||'').toUpperCase()===group[1].toUpperCase()):(c.kind==='dm'&&Number(c.id)===Number(dm[1])));
      if(!chat)throw new Error('このチャットには参加していないよ');
      state.chatId=chat.id;state.chatKind=chat.kind;state.chatName=chat.name;state.sola43DashTab=chat.kind==='dm'?'dm':'group';state.view='chats';render();
    }catch(e){if(serial!==solaRouteSerial)return;navigate('chats',true);toast(e.message)}
    return;
  }
  if(user){
    try{
      const p=await api('/api/public-profiles/'+user[1]);if(serial!==solaRouteSerial)return;
      state.chatId=null;state.view='search';render();const main=document.querySelector('main');if(main)await renderUserProfile(main,p.user_id);
    }catch(e){if(serial!==solaRouteSerial)return;navigate('search',true);toast(e.message)}
    return;
  }
  navigate('home',true);
}
function solaStartRoute(){
  if(location.hash.match(/^#\/(user|group)\/[A-Za-z0-9]+$/))resolveDeepLink();
  else solaLoadRoute();
}
window.addEventListener('popstate',async()=>{if(state.me)solaLoadRoute();else render()});

async function resolveDeepLink(){if(!state.me)return;const m=location.hash.match(/^#\/(user|group)\/([A-Za-z0-9]+)$/);if(!m)return;const kind=m[1],key=m[2];history.replaceState(null,'',location.pathname);if(kind==='user'){try{const profile=await api('/api/public-profiles/'+encodeURIComponent(key));navigate('search');const main=document.querySelector('main');if(main)await renderUserProfile(main,profile.user_id)}catch(e){navigate('search');toast(e.message)}}else if(kind==='group'){navigate('join');const input=document.querySelector('main input');if(input){input.value=key;input.dispatchEvent(new Event('input',{bubbles:true}))}}}
(async()=>{try{const r=await api('/api/me');state.me=r.user;state.csrf=r.csrf;state.officialAdmin=Boolean(r.official_admin);render();if(r.setup_pending){sola37Setup()}if(state.me){updateNotificationBadge();pollInAppNotices();solaStartRoute();setTimeout(sola28CheckBadges,850)}}catch(e){root.replaceChildren(message('起動できなかったよ：'+e.message))}})();

// SOLA26: mobile visual viewport keeps the composer above the virtual keyboard.
if(window.visualViewport){const adjust=async()=>{document.documentElement.style.setProperty('--sola26-viewport-height',window.visualViewport.height+'px')};window.visualViewport.addEventListener('resize',adjust);adjust()}

/* SOLA_PHASE1_20261101: First-login theme chooser */
function solaPhase1ThemeWelcome(){
  if(!state.me||document.getElementById('sola-phase1-welcome'))return;
  const key='sola2-theme-chosen-'+state.me.id;
  try{if(localStorage.getItem(key))return}catch{return}
  const overlay=el('div','sola-phase1-overlay');overlay.id='sola-phase1-welcome';
  const dialog=el('div','sola-phase1-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','テーマを選ぶ');
  dialog.append(el('h2','','SOLA CHATへようこそ！'),el('p','','好きなテーマを選んでね。あとから変更できるよ。'));
  [['pink','🌸 桃'],['sunset','🌇 夕日'],['night','🌌 夜空']].forEach(([v,t])=>{
    dialog.append(button(t,async()=>{themeApply(v);try{localStorage.setItem(key,'1')}catch{}overlay.remove();render()},'sola-phase1-choice '+v));
  });
  overlay.append(dialog);document.body.append(overlay);
}

// v28 profile, achievements, warnings and help center.
const sola28Names={early:'初期メンバー',verified:'公式認定ユーザー',contributor:'コミュニティ貢献者',ideas:'アイデア提供者',bug:'バグ発見者',chat100:'チャット好き',chat1000:'おしゃべりマスター',year1:'1周年記念',owner:'管理者',deputy:'副管理者',supporter:'SOLAサポーター',event:'イベント参加者',winner:'イベント優勝者',creator:'クリエイター',beta:'ベータテスター',legend:'SOLAレジェンド',first:'はじめの一歩',chat5000:'会話の達人',halfyear:'半年記念',year2:'2周年記念'};
function sola28BadgeName(b){return sola28Names[b]||b}
function sola28Date(value){if(!value)return '不明';const d=new Date(value);return Number.isNaN(d.getTime())?String(value).slice(0,10):d.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'})}
async function sola28CheckBadges(){if(!state.me||document.querySelector('.sola28-award-overlay'))return;try{const r=await api('/api/v28/badges/unseen');for(const badge of r.badges){if(!state.me)break;await sola28Award(badge);await api('/api/v28/badges/seen','POST',{badge})}}catch(e){console.warn('badge animation',e)}}
function sola28Award(badge){return new Promise(resolve=>{const overlay=el('div','sola28-award-overlay');const panel=el('div','sola28-award-panel');panel.append(el('div','sola28-sparkle','✦ ✧ ✨ ✧ ✦'),el('div','sola28-award-icon','🏆'),el('h2','','バッジ「'+sola28BadgeName(badge)+'」を獲得したよ！'),el('p','','新しいバッジがコレクションに追加されたよ'));let done=false;const finish=async()=>{if(done)return;done=true;clearTimeout(timer);overlay.remove();resolve()};panel.append(button('閉じる',finish,'btn'));overlay.append(panel);document.body.append(overlay);const timer=setTimeout(finish,5000)})}
async function sola28ProfileExtras(parent){
 const section=card(el('h3','','🏅 バッジとプロフィール背景'));parent.append(section);
 section.append(el('p','subtle','アカウント作成日：'+sola28Date(state.me.created_at)+'（誰でも閲覧可能）'));
 const cover=el('div','sola28-cover-preview');cover.style.backgroundImage='url(/api/v28/covers/'+state.me.id+'?v='+Date.now()+')';section.append(cover);
 const picker=field('','file');picker.accept='image/png,image/jpeg,image/webp';picker.hidden=true;
 section.append(picker,button('🖼️ 背景画像を変更',async()=>picker.click(),'btn secondary small'),button('背景画像を削除',async()=>{try{await api('/api/v28/cover','DELETE');cover.style.backgroundImage='none';toast('背景を削除したよ')}catch(e){toast(e.message)}},'btn secondary small'));
 picker.onchange=async()=>{const file=picker.files?.[0];if(!file)return;if(file.size>3*1024*1024){toast('3MB以下の画像にしてね');return}const fd=new FormData();fd.append('cover',file);try{const res=await fetch('/api/v28/cover',{method:'POST',headers:{'X-CSRF-Token':state.csrf},body:fd});const data=await res.json();if(!res.ok)throw new Error(data.error);cover.style.backgroundImage='url(/api/v28/covers/'+state.me.id+'?v='+Date.now()+')';toast('背景を保存したよ')}catch(e){toast(e.message)}};
 const badgeDetails=el('details','sola32-badge-details');badgeDetails.append(el('summary','','🏅 表示バッジを編集（最大5個）'));section.append(badgeDetails);const list=el('div','sola28-badge-picker');badgeDetails.append(list);
 try{const data=await api('/api/v28/badges');let chosen=[...data.display];const count=el('div','subtle');badgeDetails.append(count);
 function draw(){list.replaceChildren();count.textContent=chosen.length+' / 5個を選択中';data.earned.forEach(key=>{const row=el('label','sola28-badge-option');const input=el('input');input.type='checkbox';input.checked=chosen.includes(key);input.disabled=!input.checked&&chosen.length>=5;input.onchange=async()=>{chosen=input.checked?[...chosen,key]:chosen.filter(x=>x!==key);draw()};row.append(input,el('span','sola28-badge-name',sola28BadgeName(key)));list.append(row)})}draw();badgeDetails.append(button('表示バッジを保存',async()=>{try{await api('/api/v28/badges/display','POST',{badges:chosen});toast('表示バッジを保存したよ')}catch(e){toast(e.message)}},'btn'))}catch(e){section.append(el('p','subtle',e.message))}

}

function sola32ReportsPage(main){
 main.classList.add('sola32-reports-page');
 main.append(title('🚩 通報・お問い合わせ'));
 const parent=main;
 const reportCard=card(el('h3','','🚩 ユーザーを通報'));
 reportCard.append(el('p','subtle','ユーザーのプロフィールやメッセージにある「通報」ボタンから、対象を指定して通報できるよ。'));
 reportCard.append(button('ユーザーを探す',async()=>navigate('search'),'btn secondary small'));
 parent.append(reportCard);
 const help=card(el('h3','','✉️ 運営へのお問い合わせ'));parent.append(help);const cat=el('select','field');[['bug','不具合'],['feature','機能要望'],['account','アカウント'],['other','その他']].forEach(([v,t])=>{const o=el('option','',t);o.value=v;cat.append(o)});const body=el('textarea','field');body.rows=4;body.placeholder='問い合わせ内容（5〜2000文字）';help.append(cat,body,button('送信',async()=>{try{await api('/api/v28/tickets','POST',{category:cat.value,body:body.value});body.value='';toast('問い合わせを送信したよ');load()}catch(e){toast(e.message)}},'btn'));
 const history=el('div','sola28-tickets');help.append(history);async function load(){try{const [t,w]=await Promise.all([api('/api/v28/tickets'),api('/api/v28/warnings/me')]);history.replaceChildren(el('h4','','問い合わせ履歴'));t.tickets.forEach(x=>history.append(card(el('div','',x.body),el('p','subtle','返信：'+(x.reply||'未返信')))));history.append(el('h4','','受け取った警告'));w.warnings.forEach(x=>history.append(el('p','',sola28Date(x.created_at)+'：'+x.reason)))}catch(e){history.textContent=e.message}}load();
 if(state.officialAdmin){const admin=card(el('h3','','🛡️ 管理者用の通報管理'));admin.append(button('通報一覧を開く',async()=>renderAdminReports(main),'btn secondary small'));parent.append(admin)}
}
async function sola28AdminExtras(parent,data){const section=card(el('h3','','✉️ 問い合わせ・管理操作ログ'));parent.append(section);const tickets=el('div');section.append(tickets);try{const r=await api('/api/v28/tickets');r.tickets.forEach(t=>{const item=card(el('div','itemtitle','#'+t.id+' '+t.username+'：'+t.category),el('p','',t.body),el('p','subtle','返信：'+(t.reply||'未返信')));item.append(button('返信',async()=>{const reply=await sola49Prompt('返信内容',t.reply||'');if(reply===null)return;try{await api('/api/v28/tickets/'+t.id+'/reply','POST',{reply});toast('返信したよ')}catch(e){toast(e.message)}},'btn secondary small'));tickets.append(item)})}catch(e){tickets.textContent=e.message}
 const logs=el('div');section.append(el('h4','','管理操作ログ'),logs);try{const r=await api('/api/v28/admin/log');r.logs.forEach(x=>logs.append(el('p','subtle',sola28Date(x.created_at)+' '+x.username+'：'+x.action+' '+x.detail)))}catch(e){logs.textContent=e.message}
}

// v31: badge collection with rarity, acquisition details and earned dates.
async function sola31BadgePage(main){
 main.append(title('🏅 バッジコレクション'));
 const content=card(el('p','subtle','バッジを読み込み中…'));content.classList.add('sola31-collection');main.append(content);
 try{
  const data=await api('/api/v31/badges');const badges=data.badges||[];
  const rarityColors={'コモン':'#8995a5','レア':'#3188e8','エピック':'#a15be6','レジェンド':'#d9a22b','ミシック':'#e35b8c'};
  const icons={'はじめの一歩':'💬','チャット好き':'🗨️','おしゃべりマスター':'💭','会話の達人':'👑','フレンドマスター':'👥','人気者':'💗','半年記念':'📅','1周年記念':'🎂','2周年記念':'🎉','初期メンバー':'🌟','バグ発見者':'🐞','アイデア提供者':'💡','イベント参加者':'🎊','ベータテスター':'🧪','クリエイター':'🎨','SOLAサポーター':'💖','コミュニティ貢献者':'🤝','公式認定ユーザー':'🏅','イベント優勝者':'🏆','SOLAレジェンド':'💎','管理者':'👑','副管理者':'🛡️','伝説のゲーマー':'🎮'};
  const head=el('div','sola31-collection-head');const headText=el('div');headText.append(el('h2','','✨ バッジコレクション'),el('p','','集めたバッジと獲得条件をチェックしよう'));
  const total=badges.filter(b=>b.earned).length;head.append(headText,el('span','sola31-progress-count','獲得 '+total+' / '+badges.length));
  const progress=el('div','sola31-progress');const progressBar=el('div','sola31-progress-fill');progressBar.style.width=(badges.length?total/badges.length*100:0)+'%';progress.append(progressBar);
  const controls=el('div','sola31-controls');const filter=el('select','sola31-filter');filter.setAttribute('aria-label','獲得状態');[['all','すべて'],['earned','獲得済み'],['locked','未獲得']].forEach(([v,n])=>{const o=el('option','',n);o.value=v;filter.append(o)});
  const rarity=el('select','sola31-filter');rarity.setAttribute('aria-label','レア度');[['all','全レア度'],...Object.keys(rarityColors).map(k=>[k,k])].forEach(([v,n])=>{const o=el('option','',n);o.value=v;rarity.append(o)});
  controls.append(filter,rarity);const grid=el('div','sola31-badge-grid');const empty=el('p','subtle');
  const showDetail=b=>{const modal=el('div','sola31-modal');const detail=card();detail.classList.add('sola31-detail');const icon=el('div','sola31-detail-icon',b.earned?(icons[b.name]||'🏅'):'🔒');icon.style.setProperty('--rarity-color',rarityColors[b.rarity]||'#8995a5');detail.append(icon,el('h3','',b.name),el('span','sola31-rarity',b.rarity),el('p','','入手方法：'+(b.method||'—')),el('p','','状態：'+(b.earned?'獲得済み':'未獲得')),el('p','','獲得日時：'+(b.awarded_at?sola28Date(b.awarded_at):'—')));detail.append(button('閉じる',async()=>modal.remove(),'btn'));modal.onclick=e=>{if(e.target===modal)modal.remove()};modal.append(detail);document.body.append(modal)};
  const draw=async()=>{grid.replaceChildren();const shown=badges.filter(b=>(filter.value==='all'||(filter.value==='earned'?b.earned:!b.earned))&&(rarity.value==='all'||rarity.value===b.rarity));shown.forEach(b=>{const tile=button('',async()=>showDetail(b),'sola31-badge-tile');tile.dataset.rarity=b.rarity;tile.classList.toggle('sola31-locked',!b.earned);tile.style.setProperty('--rarity-color',rarityColors[b.rarity]||'#8995a5');const icon=el('span','sola31-tile-icon',b.earned?(icons[b.name]||'🏅'):'🔒');tile.append(icon,el('span','sola31-tile-name',b.name),el('span','sola31-rarity',b.rarity));if(b.earned)tile.append(el('span','sola31-earned-check','✓'));grid.append(tile)});empty.textContent=shown.length?'':'該当するバッジはないよ。'};
  filter.onchange=draw;rarity.onchange=draw;content.replaceChildren(head,progress,controls,grid,empty);draw();
  const history=card(el('h3','','📜 獲得履歴'));history.classList.add('sola31-history');badges.filter(b=>b.earned).sort((a,b)=>String(b.awarded_at).localeCompare(String(a.awarded_at))).forEach(b=>history.append(el('p','subtle',sola28Date(b.awarded_at)+' · '+b.name+' · '+b.rarity)));main.append(history);
  content.append(button('プロフィールのバッジ表示を編集',async()=>navigate('profile'),'btn secondary small'));
 }catch(e){content.replaceChildren(message(e.message))}
}



// SOLA CHAT v47 — compact, theme-aware notification modal.
let sola47Overlay=null,sola47Tab='notifications',sola47NoticeBaseline=null;
function sola47CloseNotifications(){if(sola47Overlay){sola47Overlay.remove();sola47Overlay=null}}
function sola47Badge(n){return n.importance==='emergency'?'緊急':n.importance==='important'?'重要':'通常'}
async function sola47OpenNotifications(tab='notifications'){
 if(!state.me)return;
 sola47Tab=tab;
 if(!sola47Overlay){
   const overlay=el('div','sola47-overlay');overlay.onclick=e=>{if(e.target===overlay)sola47CloseNotifications()};
   const dialog=el('section','sola47-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','通知センター');
   overlay.append(dialog);document.body.append(overlay);sola47Overlay=overlay;
   const key=e=>{if(e.key==='Escape'){sola47CloseNotifications();document.removeEventListener('keydown',key)}};document.addEventListener('keydown',key);
 }
 const dialog=sola47Overlay.querySelector('.sola47-dialog');dialog.replaceChildren();
 const header=el('div','sola47-header');header.append(el('strong','','🔔 通知センター'),button('×',sola47CloseNotifications,'sola47-close'));dialog.append(header);
 const tabs=el('div','sola47-tabs');[['notifications','通知'],['announcements','SOLAのお知らせ']].forEach(([id,label])=>tabs.append(button(label,async()=>sola47OpenNotifications(id),'sola47-tab'+(sola47Tab===id?' active':''))));dialog.append(tabs);
 const body=el('div','sola47-list');body.append(message('読み込み中…'));dialog.append(body);
 const footer=el('div','sola47-footer');dialog.append(footer);
 try{
   if(sola47Tab==='notifications'){
     const [r,invites]=await Promise.all([api('/api/notifications'),api('/game-api/invitations').catch(async()=>({invitations:[]}))]);
     if(!sola47Overlay||!dialog.isConnected)return;
     body.replaceChildren();
     const activeInvites=(invites.invitations||[]).filter(m=>m.status==='pending');
     activeInvites.forEach(m=>{const item=el('article','sola47-item');item.append(el('strong','','🎮 対戦への招待'),el('p','',m.host+' さんから '+({ttt:'○×ゲーム',connect4:'四目並べ',reversi:'リバーシ'}[m.game]||m.game)+' への招待'));const actions=el('div','sola47-actions');const respond=async accept=>{try{await api('/game-api/respond','POST',{id:m.id,accept});sola47OpenNotifications()}catch(e){toast(e.message)}};actions.append(button('参加',async()=>respond(true),'btn small'),button('辞退',async()=>respond(false),'btn secondary small'));item.append(actions);body.append(item)});
     (r.notifications||[]).filter(n=>!n.kind.startsWith('friend')).forEach(n=>{
       const item=el('article','sola47-item'+(!n.is_read?' sola47-unread':''));
       item.append(el('strong','',n.kind==='message'?'💬 メッセージ':n.kind.startsWith('group')?'👥 グループ':'🔔 通知'),el('time','',formatDate(n.created_at)),el('p','',n.text));
       const actions=el('div','sola47-actions');const mark=async()=>{if(!n.is_read){await api('/api/notifications/'+n.id+'/read','POST');n.is_read=1;item.classList.remove('sola47-unread');updateNotificationBadge()}};
       if(n.chat_id)actions.append(button('チャットを開く',async()=>{try{await mark();sola47CloseNotifications();await openNotificationTarget(n)}catch(e){toast(e.message)}},'btn secondary small'));
       if(n.actor_id&&!n.chat_id)actions.append(button('プロフィールを開く',async()=>{try{await mark();sola47CloseNotifications();await openNotificationTarget(n)}catch(e){toast(e.message)}},'btn secondary small'));
       if(!n.is_read)actions.append(button('既読にする',async()=>{try{await mark();sola47OpenNotifications()}catch(e){toast(e.message)}},'btn secondary small'));
       item.append(actions);body.append(item);
     });
     if(!body.children.length)body.append(el('p','sola47-empty','通知はまだないよ'));
     footer.append(el('small','','通知は30日後に自動削除されるよ'),button('✓ すべて既読',async()=>{try{await api('/api/notifications/read','POST');await updateNotificationBadge();sola47OpenNotifications()}catch(e){toast(e.message)}},'btn secondary small'));
   }else{
     const r=await api('/api/v47/announcements');if(!sola47Overlay||!dialog.isConnected)return;
     body.replaceChildren();
     if(r.can_manage)footer.append(button('＋ お知らせを投稿',async()=>sola47EditNotice(null),'btn small'));
     (r.announcements||[]).forEach(n=>{
       const item=el('article','sola47-item sola47-announcement'+(!n.is_read?' sola47-unread':''));
       item.append(el('span','sola47-importance '+n.importance,sola47Badge(n)),el('strong','',n.title),el('time','',formatDate(n.created_at)),el('p','sola47-notice-body',n.body));
       const actions=el('div','sola47-actions');
       if(!n.is_read)actions.append(button('既読にする',async()=>{try{await api('/api/v47/announcements/'+n.id+'/read','POST');sola47OpenNotifications('announcements')}catch(e){toast(e.message)}},'btn secondary small'));
       if(r.can_manage){actions.append(button('編集',async()=>sola47EditNotice(n),'btn secondary small'),button('削除',async()=>{if(!await sola49Confirm('このお知らせを削除する？'))return;try{await api('/api/v47/announcements/'+n.id,'DELETE');sola47OpenNotifications('announcements')}catch(e){toast(e.message)}},'btn secondary small'))}
       item.append(actions);body.append(item);
     });
     if(!body.children.length)body.append(el('p','sola47-empty','SOLAのお知らせはまだないよ'));
     footer.append(el('small','','お知らせは投稿から30日後に自動削除されるよ'));
   }
 }catch(e){body.replaceChildren(message('読み込みに失敗したよ：'+e.message))}
}
function sola47EditNotice(notice){
 if(!sola47Overlay)return;
 const dialog=sola47Overlay.querySelector('.sola47-dialog');dialog.replaceChildren();
 const header=el('div','sola47-header');header.append(el('strong','',notice?'お知らせを編集':'お知らせを投稿'),button('×',async()=>sola47OpenNotifications('announcements'),'sola47-close'));dialog.append(header);
 const form=el('form','sola47-editor');const title=field('タイトル（100文字以内）');title.maxLength=100;title.value=notice?.title||'';
 const body=el('textarea','field');body.placeholder='お知らせの本文（3000文字以内）';body.maxLength=3000;body.rows=6;body.value=notice?.body||'';
 const level=el('select','field');[['normal','通常'],['important','重要'],['emergency','緊急']].forEach(([v,t])=>{const opt=el('option','',t);opt.value=v;level.append(opt)});level.value=notice?.importance||'normal';
 form.append(el('label','','タイトル'),title,el('label','','本文'),body,el('label','','重要度'),level);
 const submit=button('保存',async()=>form.requestSubmit(),'btn');submit.type='submit';form.append(submit);
 form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{await api(notice?'/api/v47/announcements/'+notice.id:'/api/v47/announcements',notice?'PUT':'POST',{title:title.value,body:body.value,importance:level.value});toast('お知らせを保存したよ');sola47OpenNotifications('announcements')}catch(err){toast(err.message);submit.disabled=false}};
 dialog.append(form);
}
async function sola47PollAnnouncements(){
 if(!state.me)return;
 try{
  const r=await api('/api/v47/announcements');const notices=r.announcements||[];
  const latest=notices.length?Math.max(...notices.map(n=>n.id)):0;
  if(sola47NoticeBaseline===null){sola47NoticeBaseline=latest;return}
  const fresh=notices.filter(n=>n.id>sola47NoticeBaseline&&(n.importance==='important'||n.importance==='emergency'));
  sola47NoticeBaseline=Math.max(sola47NoticeBaseline,latest);
  fresh.reverse().slice(-3).forEach(n=>{
   const popup=el('div','sola47-toast '+n.importance);popup.append(el('strong','',n.importance==='emergency'?'⚠ 緊急のお知らせ':'❗ 重要なお知らせ'),el('p','',n.title));
   popup.append(button('詳細を見る',async()=>{popup.remove();sola47OpenNotifications('announcements')},'btn small'),button('×',async()=>popup.remove(),'sola47-toast-close'));
   document.body.append(popup);setTimeout(async()=>popup.remove(),10000);
  });
 }catch{}
}
setInterval(sola47PollAnnouncements,12000);
