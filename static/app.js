try{themeApply(localStorage.getItem('sola2-theme')||'sunset')}catch{themeApply('sunset')}
const root=document.getElementById('app');
const state={connectionLost:false,noticeOnlyImportant:false,me:null,csrf:'',view:'chats',chatId:null,chatName:'',chatKind:'',timer:null,officialAdmin:false,avatarVersion:Date.now(),unreadNotifications:0,notificationFilter:'all'};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const $=(selector,base=document)=>base.querySelector(selector);
function add(parent,...nodes){nodes.forEach(n=>parent.append(n));return parent}
function button(text,handler,cls='btn'){const n=el('button',cls,text);n.type='button';n.onclick=handler;return n}
function avatar(name,small=false,userId=null){const a=el('div','avatar'+(small?' small':''),(name||'?').slice(0,1).toUpperCase());if(userId){const img=el('img','avatar-image');img.alt=name+'のアイコン';img.loading='lazy';img.src='/api/avatars/'+encodeURIComponent(userId)+'?v='+state.avatarVersion;img.onerror=()=>img.remove();a.append(img)}return a}

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
    try{const started=performance.now();res=await fetch(url,opt);connectionBanner(false);
      const timing=res.headers.get('Server-Timing');const m=timing?.match(/dur=([\d.]+)/);
      if(url.startsWith('/api/')){sola26Metrics.push({path:url.split('?')[0],ms:m?Number(m[1]):Math.round(performance.now()-started)});if(sola26Metrics.length>60)sola26Metrics.shift()}
      if(method==='GET'&&[502,503,504].includes(res.status)&&attempt<2){await new Promise(r=>setTimeout(r,250*(attempt+1)));continue}
      break;
    }catch(e){lastError=e;connectionBanner(true);if(attempt<2&&method==='GET'){await new Promise(r=>setTimeout(r,250*(attempt+1)));continue}throw new Error('通信できなかったよ。再接続してね')}
  }
  if(!res)throw lastError||new Error('通信エラー');
  const json=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json.error||'操作に失敗したよ（'+res.status+'）');
  if(json.csrf)state.csrf=json.csrf;return json;
}
function toast(text){
  let holder=document.getElementById('sola-toast-stack');if(!holder){holder=el('div','sola-toast-stack');holder.id='sola-toast-stack';document.body.append(holder)}
  const item=el('div','sola-toast',text);holder.append(item);setTimeout(()=>{item.classList.add('leaving');setTimeout(()=>item.remove(),280)},3800)
}
function groupAvatar(id,name,small=false){
  const pic=avatar(name||'G',small);if(id){const img=el('img','avatar-image');img.src='/api/group-icons/'+id+'?v='+Date.now();img.alt='グループアイコン';img.onerror=()=>img.remove();pic.append(img)}return pic
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
 const importantKinds=['friend_request','group_request','group_decision','transfer','group_admin'];
 fresh.slice(-4).forEach(n=>{
   if(state.noticeOnlyImportant&&!importantKinds.includes(n.kind))return;
   if(document.visibilityState==='visible')toast('🔔 '+n.text);
   else if('Notification' in window&&Notification.permission==='granted'&&window.isSecureContext){
     try{const note=new Notification('SOLA CHAT',{body:n.text,icon:'/static/sola-icon.png',tag:'sola-notice-'+n.id});note.onclick=()=>{window.focus();navigate('notifications');note.close()}}catch{}
   }
 });
 updateNotificationBadge();
 }catch{}}
function startInAppNotices(){if(noticeStarted)return;noticeStarted=true;setInterval(pollInAppNotices,10000)}
function stopTimer(){if(state.timer){clearInterval(state.timer);state.timer=null}if(state.contextCleanup)state.contextCleanup()}
function navigate(view,replace=false){if(typeof solaQrScannerClose==='function')solaQrScannerClose();stopTimer();state.view=view;state.chatId=null;render();solaSetPath(solaPagePaths[view]||'/chats',replace)}
function copyText(value){navigator.clipboard?.writeText(value).then(()=>toast('リンクをコピーしたよ')).catch(()=>prompt('このリンクをコピーしてね',value))}
function applyBubbleShape(){document.documentElement.dataset.bubbleShape='round'}
function connectionBanner(lost){let b=document.getElementById('sola-connection-banner');if(lost){if(!b){b=el('div','sola-connection-banner','通信が切れているよ。再接続を待ってね…');b.id='sola-connection-banner';document.body.append(b)}}else if(b){b.remove();toast('通信が復旧したよ')}}
window.addEventListener('offline',()=>connectionBanner(true));window.addEventListener('online',()=>{connectionBanner(false);if(state.me){updateNotificationBadge();if(state.chatId)render()}});
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
  }).catch(()=>{});
}
function sola26BackTop(main){
  const btn=button('↑ ページ上部へ',()=>{main.scrollTo({top:0,behavior:'smooth'});window.scrollTo({top:0,behavior:'smooth'})},'sola26-back-top');
  main.append(btn);
}
async function sola26HealthUI(main){
  const box=card(el('h3','','🖥️ サーバー稼働状況'));main.append(box);
  const result=el('p','subtle','読み込み中…');box.append(result);
  const refresh=async()=>{try{const r=await api('/api/sola26/health');result.textContent='DB: '+r.database+' ('+r.backend+') / 応答: '+r.db_ms+'ms'}catch(e){result.textContent=e.message}};
  box.append(button('再計測',refresh,'btn secondary small'));await refresh();
  const note=card(el('h3','','🛠️ メンテナンスのお知らせ'));
  const input=field('メンテナンス予定・空欄で解除');input.maxLength=300;
  const current=await api('/api/sola26/maintenance').catch(()=>({message:''}));input.value=current.message||'';
  note.append(input,button('お知らせを保存',async()=>{try{await api('/api/sola26/maintenance','POST',{message:input.value});toast('保存したよ');sola26ShowMaintenance()}catch(e){toast(e.message)}},'btn small'));main.append(note);
  const metric=card(el('h3','','⏱️ 最近のAPI応答時間'));
  const list=el('div','sola26-metrics');metric.append(list);
  const draw=()=>{list.replaceChildren();sola26Metrics.slice(-20).reverse().forEach(x=>list.append(el('div','subtle',x.path+' · '+x.ms+'ms')));if(!sola26Metrics.length)list.append(sola26Empty('まだ計測データがないよ'))};
  metric.append(button('更新',draw,'btn secondary small'));draw();main.append(metric);
}

function render(){
  try{document.documentElement.dataset.theme=localStorage.getItem('sola2-theme')||'sunset'}catch{}
  if(state.me){startInAppNotices();applyBubbleColor();applyBubbleShape();document.body.classList.add('sola-authenticated');sola26ShowMaintenance()}
  stopTimer();root.replaceChildren();if(!state.me){renderAuth();return}
  const shell=el('div','shell'+(state.chatId?' chat-mode':'')),main=el('main','main sola-page-enter');
  if(state.chatId){root.append(add(shell,main));renderChat(main);return}
  const sidebar=el('aside','sidebar'),bottom=el('nav','bottomnav');
  const logo=button('',()=>navigate('chats'),'brand brandbutton');add(logo,brandIcon('mini'),el('span','','SOLA CHAT'));sidebar.append(logo);
  const entries=[['chats','💬','チャット'],['search','🔎','ユーザー検索'],['friends','👥','友だち'],['notifications','🔔','通知'],['profile','⚙️','マイページ']];if(state.officialAdmin)entries.push(['admin','🛡️','管理者']);
  entries.forEach(([v,s,t])=>{
    const item=button('',()=>navigate(v),'nav'+(state.view===v?' active':''));add(item,el('span','',s+'  '+t));
    if(v==='notifications'){const badge=el('span','nav-count');badge.dataset.notificationCount='';badge.textContent=state.unreadNotifications>99?'99+':state.unreadNotifications;badge.hidden=!state.unreadNotifications;item.append(badge)}sidebar.append(item);
    const small=button('',()=>navigate(v),(state.view===v?'active':''));add(small,el('span','symbol',s),el('span','',t));
    if(v==='notifications'){const badge=el('span','mobile-count');badge.dataset.notificationCount='';badge.textContent=state.unreadNotifications>99?'99+':state.unreadNotifications;badge.hidden=!state.unreadNotifications;small.append(badge)}bottom.append(small)
  });
  add(sidebar,el('div','sidebottom subtle','ログイン中：'+state.me.username));add(shell,sidebar,main,bottom);root.append(shell);
  const home=button('',()=>navigate('chats'),'mobilehome');add(home,brandIcon('mini'),el('span','','SOLA CHAT'));main.append(home);
  ({chats:renderChats,join:renderJoinGroup,search:renderSearch,friends:renderFriends,notifications:renderNotifications,profile:renderProfile,admin:renderAdminDashboard}[state.view]||renderChats)(main);sola26BackTop(main)
}
async function updateNotificationBadge(){if(!state.me)return;try{const r=await api('/api/notifications/summary');state.unreadNotifications=r.unread;document.querySelectorAll('[data-notification-count]').forEach(b=>{b.textContent=r.unread>99?'99+':String(r.unread);b.hidden=!r.unread})}catch{}}
function renderAuth(){const outer=el('div','auth'),box=el('div','authcard'),form=el('form','stack'),name=field('ユーザー名'),pass=field('パスワード','password'),err=el('div','error');let register=false;const heading=el('h1','','SOLA CHAT 2.0'),submit=button('ログイン',()=>{}),switcher=button('新規登録はこちら',()=>{},'btn secondary');submit.type='submit';submit.onclick=null;switcher.onclick=()=>{register=!register;submit.textContent=register?'アカウントを作成':'ログイン';switcher.textContent=register?'ログインに戻る':'新規登録はこちら';setError(err,'')};form.onsubmit=async e=>{e.preventDefault();setError(err,'');submit.disabled=true;try{const result=await api(register?'/api/register':'/api/login','POST',{username:name.value,password:pass.value});state.me=result.user;state.officialAdmin=Boolean(result.official_admin);noticeBaseline=null;render();updateNotificationBadge();pollInAppNotices();solaStartRoute()}catch(ex){setError(err,ex.message)}finally{submit.disabled=false}};add(form,name,pass,err,submit,switcher);add(box,brandIcon('auth-logo'),heading,el('p','subtle','夕焼け色のチャットアプリ'),form);outer.append(box);root.append(outer)}
async function renderChats(main){
  add(main,title('チャット',[button('🔑 グループに入る',()=>navigate('join'),'btn secondary small'),button('＋ グループ作成',createGroup,'btn small')]));
  const loading=card(el('div','sola-skeleton'),el('div','sola-skeleton short'),el('div','sola-skeleton'),el('div','sola-skeleton short'));loading.setAttribute('aria-label','チャットを読み込み中');main.append(loading);
  try{
    const [r,d]=await Promise.all([api('/api/chats'),api('/api/groups/official')]);loading.remove();
    const official=d.groups.filter(g=>g.official), joinedOfficial=new Set(r.chats.filter(x=>x.official).map(x=>x.id));
    if(official.length){main.append(el('h3','mutedtitle','📌 公式グループ'));const c=card();official.forEach(g=>{const item=chatRow(g.name,'作成者：'+(g.creator||'運営'),true,()=>joinedOfficial.has(g.id)?openChat(g.id,g.name,'group'):openOrJoin(g.id),true);item.querySelector('.avatar')?.replaceWith(groupAvatar(g.id,g.name));c.append(item)});main.append(c)}
    main.append(el('h3','mutedtitle','チャット一覧（2人・グループ）'));
    const c=card();
    const list=r.chats.filter(x=>!x.official);
    if(!list.length)c.append(sola26Empty('まだチャットがないよ。グループIDを入力して参加するか、友だちを追加しよう！'));
    list.forEach(x=>{
      const row=el('div','chat-list-line');
      const entry=chatRow(x.name,x.kind==='group'?'👥 '+(x.member_count||0)+'人 · '+(x.last_message||'メッセージはまだないよ'):(x.last_message||'メッセージはまだないよ'),false,()=>openChat(x.id,x.name,x.kind),x.kind==='group',x.other_user_id||null);
      if(x.kind==='group')entry.querySelector('.avatar')?.replaceWith(groupAvatar(x.id,x.name));
      if(x.unread){const count=el('span','unread-count',x.unread>99?'99+':x.unread);entry.append(count)}
      const pin=button(x.pinned?'📌':'📍',async()=>{try{await api('/api/chats/'+x.id+'/pin','POST');renderChatsFresh()}catch(e){alert(e.message)}},'pin-button');pin.title=x.pinned?'ピン留めを外す':'ピン留めする';pin.setAttribute('aria-label',pin.title);
      row.append(entry,pin);c.append(row)
    });main.append(c)
    // SOLA CHAT LIST AUTO REFRESH 2500MS
    // Poll silently; rebuild the page only when the list actually changes.
    const chatListSignature=chats=>JSON.stringify(chats.map(x=>[
      x.id,x.kind,x.name,x.last_message,x.unread,x.pinned,x.official,
      x.group_code,x.other_user_id,x.creator?.username
    ]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
    let previousSignature=chatListSignature(r.chats);
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
    const b=button(label,()=>{themeApply(id);main.replaceChildren();renderProfile(main)},'btn secondary small'+(document.documentElement.dataset.theme===id?' chosen-theme':''));controls.append(b)
  });panel.append(controls);main.append(panel)
}
async function copyGroupId(id){
  try{await navigator.clipboard.writeText(String(id));alert('グループIDをコピーしたよ：'+id)}
  catch{prompt('このIDをコピーしてね',String(id))}
}
async function renderGroupManagement(main,id){
  const view=el('div','group-management');main.append(view);
  try{
    const r=await api('/api/groups/'+id+'/members');
    const box=card(el('h3','mutedtitle','グループ管理'));box.classList.add('sola-group-admin-card');
    box.append(el('div','subtle','作成者：'+(r.members.find(x=>x.id===r.chat.creator_id)?.username||'不明')+' · 作成日：'+formatDate(r.chat.created_at)+' · 上限：'+r.chat.max_members+'人'));
    if(r.is_owner)box.append(button('👥 人数上限を変更',async()=>{const n=prompt('グループの最大人数（2〜500人）',r.chat.max_members);if(n===null)return;try{await api('/api/groups/'+id+'/capacity','PATCH',{max_members:n});view.remove();renderGroupManagement(main,id)}catch(e){toast(e.message)}},'btn secondary small'));
    const idBar=el('div','row wrap');
    idBar.append(el('span','group-id','グループID：'+r.chat.group_code),button('📋 IDをコピー',()=>copyGroupId(r.chat.group_code),'btn secondary small'));
    box.append(idBar);
    const qrButton=button('📱 招待QRコード',()=>{const old=$('.sola-qr',box);if(old){old.remove();return}const img=el('img','sola-qr');img.src='/api/qr?kind=group&id='+id;img.alt='グループ招待QRコード';box.append(img)},'btn secondary small');box.append(qrButton);
    box.append(el('div','subtle','参加方式：承認制'),el('p','subtle',r.chat.description||'説明文はまだないよ'));
    if(r.can_manage){const iconPick=field('','file');iconPick.accept='image/png,image/jpeg,image/webp';iconPick.classList.add('hidden-file');iconPick.onchange=async()=>{const f=iconPick.files?.[0];if(!f)return;const fd=new FormData();fd.append('icon',f);try{const response=await fetch('/api/groups/'+id+'/icon',{method:'POST',headers:{'X-CSRF-Token':state.csrf},body:fd});const result=await response.json();if(!response.ok)throw new Error(result.error||'変更できなかったよ');toast('グループアイコンを変更したよ');view.remove();renderGroupManagement(main,id)}catch(e){alert(e.message)}};box.append(iconPick,button('📷 グループアイコンを変更',()=>iconPick.click(),'btn secondary small'))}
    if(r.can_manage){const change=button('📝 グループ説明文を編集',async()=>{const description=prompt('グループ説明文（500文字以内）',r.chat.description||'');if(description===null)return;try{await api('/api/groups/'+id,'PATCH',{description});view.remove();renderGroupManagement(main,id)}catch(e){alert(e.message)}},'btn secondary small');box.append(change)}
    if(r.chat.creator_id!==state.me.id){
      box.append(button('🚪 グループから退出',async()=>{
        if(!confirm('このグループから退出する？ 再参加にはグループIDが必要だよ。'))return;
        try{await api('/api/groups/'+id+'/leave','POST');navigate('chats')}catch(e){alert(e.message)}
      },'btn secondary small'))
    }
    if(r.can_manage){
      const rename=button('✏️ グループ名を変更',async()=>{
        const name=prompt('新しいグループ名',r.chat.name);if(name===null)return;
        try{const updated=await api('/api/groups/'+id,'PATCH',{name});state.chatName=updated.name;render()}catch(e){alert(e.message)}
      },'btn secondary small');box.append(rename);
      box.append(el('h4','sola-group-section-heading','参加申請（'+r.pending.length+'件）'));
      if(!r.pending.length)box.append(el('p','subtle','参加申請はないよ'));
      r.pending.forEach(req=>{const line=el('div','member-line');add(line,el('span','grow',req.username),button('承認',async()=>{if(!confirm(req.username+'の参加申請を承認する？'))return;try{await api('/api/groups/'+id+'/requests/'+req.id+'/approve','POST');view.remove();renderGroupManagement(main,id)}catch(e){alert(e.message)}},'btn small'),button('却下',async()=>{if(!confirm(req.username+'の参加申請を却下する？'))return;try{await api('/api/groups/'+id+'/requests/'+req.id+'/reject','POST');view.remove();renderGroupManagement(main,id)}catch(e){alert(e.message)}},'btn secondary small'));box.append(line)})

    }
    box.append(el('h4','sola-group-section-heading','メンバー（'+r.members.length+'人）'));
    const memberSearch=field('メンバー名で検索');const memberSort=el('select','field sola26-member-sort');[['joined','参加順'],['name','名前順'],['online','オンライン優先'],['role','管理者優先']].forEach(([v,t])=>{const o=el('option','',t);o.value=v;memberSort.append(o)});box.append(memberSearch,memberSort);const memberContainer=el('div','member-search-results');box.append(memberContainer);
    function drawMembers(){memberContainer.replaceChildren();r.members.filter(u=>u.username.toLowerCase().includes(memberSearch.value.trim().toLowerCase())).sort((a,b)=>memberSort.value==='name'?a.username.localeCompare(b.username,'ja'):memberSort.value==='online'?Number(b.online)-Number(a.online):memberSort.value==='role'?Number(b.id===r.chat.creator_id)*2+Number(b.coadmin)-(Number(a.id===r.chat.creator_id)*2+Number(a.coadmin)):0).forEach(u=>{
      const row=el('div','member-line sola-member-card');const pic=avatar(u.username,true,u.id);pic.append(el('span','presence-dot '+(u.online?'is-online':'is-offline')));add(row,pic,el('span','grow',u.username+(u.id===r.chat.creator_id?' 👑':u.coadmin?' 🛡️ 共同管理者':'')+(u.status==='busy'?' · 取り込み中':u.online?' · オンライン':' · オフライン')));
      if(r.is_owner&&u.id!==r.chat.creator_id){row.append(button('👑 管理者を引き継ぐ',async()=>{if(!confirm(u.username+'に管理者を引き継ぐ？ この操作は元に戻せないよ。'))return;try{await api('/api/groups/'+id+'/transfer','POST',{user_id:u.id});view.remove();renderGroupManagement(main,id)}catch(e){alert(e.message)}},'btn secondary small'));row.append(button('退出させる',async()=>{
        if(!confirm(u.username+'をグループから退出させる？（再参加には再び承認が必要）'))return;
        try{await api('/api/groups/'+id+'/members/'+u.id,'DELETE');view.remove();renderGroupManagement(main,id)}catch(e){alert(e.message)}
      },'btn secondary small'))}
      if(r.is_owner&&u.id!==r.chat.creator_id)row.append(button(u.coadmin?'🛡️ 共同管理者を解除':'🛡️ 共同管理者にする',async()=>{if(!confirm(u.username+'の共同管理者権限を'+(u.coadmin?'解除':'付与')+'する？'))return;try{await api('/api/groups/'+id+'/coadmins/'+u.id,u.coadmin?'DELETE':'POST');view.remove();renderGroupManagement(main,id)}catch(e){alert(e.message)}},'btn secondary small'));
      if(r.can_manage&&!r.is_owner&&u.id!==r.chat.creator_id)row.append(button('退出させる',async()=>{if(!confirm('このメンバーを退出させる？'))return;try{await api('/api/groups/'+id+'/members/'+u.id,'DELETE');view.remove();renderGroupManagement(main,id)}catch(e){alert(e.message)}},'btn secondary small'));
      const actions=[...row.children].filter(x=>x.tagName==='BUTTON');if(actions.length){const group=el('div','sola-member-actions');row.append(group);actions.forEach(b=>{if(b.textContent.includes('退出させる'))b.classList.add('sola-danger');group.append(b)})}memberContainer.append(row)
    })}
    memberSearch.oninput=drawMembers;memberSort.onchange=drawMembers;drawMembers();
    const topActions=[...box.children].filter(x=>x.tagName==='BUTTON'&&x.classList.contains('btn'));
    if(topActions.length){const actionGrid=el('div','sola-group-action-grid');box.insertBefore(actionGrid,topActions[0]);topActions.forEach(b=>actionGrid.append(b))}
    // One collapsible history panel. Never append another panel on repeated clicks.

    if(r.is_owner)r.members.filter(u=>u.coadmin).forEach(u=>{const pbutton=button('🔐 '+u.username+'の権限設定',async()=>{const request=confirm('「'+u.username+'」に参加申請の承認権限を与える？');const members=confirm('メンバーの退出操作を許可する？');const announcement=false;try{await api('/api/groups/'+id+'/permissions/'+u.id,'POST',{requests:request,members,announcement});toast('権限を保存したよ')}catch(e){toast(e.message)}},'btn secondary small');box.append(pbutton)});
    const close=button('×',()=>view.remove(),'sola-admin-close');close.setAttribute('aria-label','グループ管理を閉じる');box.prepend(close);
    view.append(box)
  }catch(e){view.append(card(message(e.message)))}
}

function chatRow(name,sub,official,onClick,isGroup=false,userId=null,online=null){const row=button('',onClick,'listitem');const pic=avatar(isGroup?'G':name,false,userId);if(online!==null)pic.append(el('span','presence-dot '+(online?'is-online':'is-offline')));add(row,pic,add(el('div','grow'),add(el('div','row wrap'),el('span','itemtitle',name),...(official?[el('span','pill','公式')]:[])),el('div','preview',sub)),el('span','subtle','›'));return row}
async function openOrJoin(id){try{const r=await api('/api/groups/'+id+'/join','POST');if(r.pending){alert('参加申請を送ったよ！管理者の承認を待ってね。');navigate('chats')}else openChat(id,'','group')}catch(e){alert(e.message)}}
async function openChat(id,name,kind){
  state.chatId=id;state.chatName=name;state.chatKind=kind;render();
  if(kind==='dm'){solaSetPath('/dm/'+id);return}
  if(kind==='group'){
    try{const result=await api('/api/chats');const group=result.chats.find(c=>c.id===id&&c.kind==='group');if(!group?.group_code)throw new Error('グループIDが見つからないよ');if(state.chatId===id)solaSetPath('/room/'+group.group_code)}
    catch(e){if(state.chatId===id)toast('グループURLを取得できなかったよ：'+e.message)}
  }
}
async function renderJoinGroup(main){
  add(main,title('🔑 グループに入る',[button('📷 QRを読み取る',openQrScanner,'btn secondary small'),button('← チャットに戻る',()=>navigate('chats'),'btn secondary small')]));
  const form=el('form','join-form'),idInput=field('グループID（英数字8文字）','text'),find=button('IDで確認',()=>{},'btn');
  idInput.autocomplete='off';idInput.maxLength=8;idInput.style.textTransform='uppercase';
  find.type='submit';find.onclick=null;
  const result=card(message('グループの作成者からIDを教えてもらって入力してね。','subtle'));
  add(form,el('label','label','グループID'),idInput,find);
  main.append(card(el('p','subtle','グループ名では検索できないよ。IDを入力して参加申請し、管理者に承認されると入室できるよ。'),form),result);
  form.onsubmit=async e=>{
    e.preventDefault();result.replaceChildren();
    const id=idInput.value.trim().toUpperCase();
    if(!/^[A-Z0-9]{8}$/.test(id)){result.append(message('グループIDは英数字8文字で入力してね'));return}
    find.disabled=true;
    try{
      const r=await api('/api/groups/by-code/'+encodeURIComponent(id)),g=r.group;
      const heading=el('div','itemtitle',g.name),details=el('p','subtle',`ID: ${g.group_code} ／ 作成者: ${g.creator||'不明'} ／ ${g.members}/${g.max_members}人 ／ 承認制 ／ 作成: ${formatDate(g.created_at)}`);
      result.append(heading,details);if(g.description)result.append(el('p','subtle',g.description));
      if(g.official)result.append(el('span','pill','公式'));
      const enter=button(g.joined?'チャットを開く':g.request_status==='pending'?'申請中':'参加を申請する',async()=>{
        enter.disabled=true;
        try{if(!g.joined){const res=await api('/api/groups/'+g.id+'/join','POST');if(res.pending){alert('参加申請を送ったよ！管理者の承認を待ってね。');navigate('chats');return}}openChat(g.id,g.name,'group')}
        catch(ex){alert(ex.message);enter.disabled=false}
      },'btn');result.append(enter);if(g.request_status==='pending'&&!g.joined)result.append(button('参加申請を取り消す',async()=>{if(!confirm('参加申請を取り消す？'))return;try{await api('/api/groups/'+g.id+'/requests/cancel','POST');toast('申請を取り消したよ');form.requestSubmit()}catch(e){toast(e.message)}},'btn secondary small'))
    }catch(ex){result.append(message(ex.message))}finally{find.disabled=false}
  }
}
function createGroup(){const name=prompt('新しいグループ名を入力してね（参加には管理者の承認が必要）');if(name===null)return;api('/api/groups','POST',{name,official:state.officialAdmin?confirm('SOLA公式グループとして作る？（キャンセルなら通常グループ）'):false}).then(r=>{alert('グループを作成したよ！\nグループID: '+r.group_code+'\nメンバーにこのIDを伝えてね。');openChat(r.id,name,'group')}).catch(e=>alert(e.message))}
function renderSearch(main){add(main,title('ユーザー検索',[button('📷 QRを読み取る',openQrScanner,'btn secondary small')]));const q=field('ユーザー名の一部を入力'),results=card(sola26Empty('名前を入力して検索してね'));main.append(card(q),results);let seq=0;q.oninput=async()=>{const n=++seq;if(!q.value.trim()){results.replaceChildren(sola26Empty('名前を入力して検索してね'));return}try{const r=await api('/api/users?q='+encodeURIComponent(q.value));if(n!==seq)return;results.replaceChildren();if(!r.users.length)results.append(sola26Empty('見つからなかったよ'));r.users.forEach(u=>results.append(chatRow(u.username,(u.online?'🟢 オンライン · ':'⚪ オフライン · ')+(u.bio||'プロフィールを見る'),false,()=>renderUserProfile(main,u.id),false,u.id,u.online)))}catch(e){results.replaceChildren(message(e.message))}}}
async function renderUserProfile(main,id){main.replaceChildren(title('プロフィール',[button('← 戻る',()=>navigate('search'),'btn secondary small')]));const c=card(message('読み込み中…'));main.append(c);try{const r=await api('/api/users/'+id);c.replaceChildren(add(el('div','row'),avatar(r.user.username,false,r.user.id),add(el('div','grow'),el('div','itemtitle',r.user.username),el('div','preview',r.user.bio||'自己紹介なし'))));const actions=el('div','row wrap');c.append(el('p','subtle',r.user.status==='busy'?'🟠 取り込み中':r.user.online?'🟢 オンライン':'⚪ オフライン'));
 if(r.friend){actions.append(button('👥 共通グループ',async()=>{try{const x=await api('/api/friends/'+id+'/common-groups');const names=x.groups.map(g=>g.name);toast(names.length?'共通グループ：'+names.join('、'):'共通グループはないよ')}catch(e){toast(e.message)}},'btn secondary small'));actions.append(button('✏️ ニックネーム',async()=>{const value=prompt('自分の画面だけに表示する名前（空欄で解除）',r.user.nickname||'');if(value===null)return;try{await api('/api/nicknames/'+id,'PUT',{nickname:value});toast('ニックネームを保存したよ');renderUserProfile(main,id)}catch(e){alert(e.message)}},'btn secondary small'))}if(r.blocked){actions.append(message('このユーザーをブロック中'));}else if(r.friend)actions.append(button('💬 チャットを始める',()=>api('/api/dms/'+id,'POST').then(x=>openChat(x.id,r.user.username+'とのチャット','dm')).catch(e=>alert(e.message))));else if(r.incoming)actions.append(message('相手から申請が届いているよ。友だち画面で承認してね'));else if(r.outgoing)actions.append(message('フレンド申請中'));else actions.append(button('＋ フレンド申請',()=>api('/api/friends/request/'+id,'POST').then(()=>renderUserProfile(main,id)).catch(e=>alert(e.message))));actions.append(button(r.blocked?'ブロック解除':'🚫 ブロック',async()=>{if(!confirm(r.blocked?'ブロックを解除する？':'このユーザーをブロックする？'))return;try{await api('/api/users/'+id+'/block','POST');renderUserProfile(main,id)}catch(e){alert(e.message)}},'btn secondary small'));actions.append(button('⚑ 通報',()=>sendReport({user_id:id}),'btn secondary small'));actions.append(button('🔗 プロフィールリンク',()=>copyText(location.origin+'/user/'+r.user.public_code),'btn secondary small'));c.append(actions)}catch(e){c.replaceChildren(message(e.message))}}
async function renderFriends(main){main.replaceChildren();add(main,title('友だち'));const c=card(message('読み込み中…'));main.append(c);try{const r=await api('/api/friends');c.replaceChildren();c.append(el('h3','mutedtitle','届いた申請'));if(!r.requests.length)c.append(message('申請はないよ','subtle'));r.requests.forEach(req=>{const line=el('div','listitem');add(line,avatar(req.username,false,req.user_id),el('div','grow',req.username),button('承認',()=>api('/api/friends/accept/'+req.id,'POST').then(()=>renderFriends(main)).catch(e=>alert(e.message)),'btn small'));c.append(line)});c.append(el('h3','mutedtitle','フレンド一覧'));if(!r.friends.length)c.append(message('ユーザー検索から友だちを追加しよう','subtle'));r.friends.forEach(u=>{const line=el('div','chat-list-line');const entry=chatRow(nickName(u),u.bio||'チャットを開始',false,()=>api('/api/dms/'+u.id,'POST').then(x=>openChat(x.id,nickName(u)+'とのチャット','dm')).catch(e=>alert(e.message)),false,u.id,u.online);const fav=button(u.favorite?'★':'☆',async()=>{try{await api('/api/friends/'+u.id+'/favorite','POST');renderFriends(main)}catch(e){alert(e.message)}},'pin-button');fav.title='お気に入り';line.append(entry,fav);c.append(line)})}catch(e){c.replaceChildren(message(e.message))}}
function renderProfile(main){
  main.classList.add('sola-profile-page');
  main.append(title('マイページ'));
  const layout=el('div','sola-profile-grid');main.append(layout);
  const left=el('div','sola-profile-column'),right=el('div','sola-profile-column');layout.append(left,right);
  const photo=avatar(state.me.username,false,state.me.id);photo.classList.add('avatar-large');
  const picker=field('','file');picker.accept='image/jpeg,image/png,image/webp';picker.classList.add('avatar-picker');
  const status=el('div','subtle sola-profile-status','画像は2MB以下（JPEG・PNG・WebP）');
  const choose=button('📷 アイコン変更',()=>picker.click(),'btn small');
  picker.onchange=async()=>{const file=picker.files?.[0];if(!file)return;if(file.size>2*1024*1024){status.textContent='2MB以下の画像を選んでね';return}
    choose.disabled=true;status.textContent='画像を保存中…';try{const fd=new FormData();fd.append('avatar',file);const response=await fetch('/api/avatar',{method:'POST',headers:{'X-CSRF-Token':state.csrf},body:fd});const data=await response.json();if(!response.ok)throw new Error(data.error||'保存できなかったよ');state.avatarVersion=Date.now();const replacement=avatar(state.me.username,false,state.me.id);replacement.classList.add('avatar-large');photo.replaceWith(replacement);status.textContent='アイコンを変更したよ！'}catch(e){status.textContent=e.message}finally{choose.disabled=false;picker.value=''}};
  const remove=button('元に戻す',async()=>{try{await api('/api/avatar','DELETE');state.avatarVersion=Date.now();main.replaceChildren();renderProfile(main)}catch(e){status.textContent=e.message}},'btn secondary small');
  const bio=el('textarea','field');bio.rows=2;bio.maxLength=200;bio.value=state.me.bio||'';
  const profile=card();profile.classList.add('sola-profile-main');
  const identity=el('div','sola-profile-identity');identity.append(photo,add(el('div','sola-profile-identity-details'),el('div','itemtitle',state.me.username),add(el('div','row wrap'),choose,remove),status));
  profile.append(identity,picker,el('label','label','自己紹介'),bio,button('自己紹介を保存',async()=>{try{await api('/api/profile','POST',{bio:bio.value});state.me.bio=bio.value;toast('自己紹介を保存したよ')}catch(e){alert(e.message)}},'btn small'));left.append(profile);

  const share=card(el('h3','','🔗 プロフィール共有'));
  const link=button('リンクをコピー',()=>copyText(location.origin+'/user/'+state.me.public_code),'btn secondary small');
  const qr=el('img','sola-qr sola-profile-qr-image');qr.src='/api/qr?kind=user&id='+state.me.id;qr.alt='フレンド追加QRコード';
  qr.onerror=()=>{qr.replaceWith(el('p','subtle','QRコードを表示できなかったよ。サーバーと qrcode のインストールを確認してね。'))};
  const qrActions=el('div','sola-qr-actions');
  qrActions.append(link,button('📷 QRを読み取る',openQrScanner,'btn secondary small'));
  share.append(qrActions,qr);right.append(share);

  const appearance=card(el('h3','','🎨 デザイン'));
  const themeLabel=el('div','label','テーマ');const themes=el('div','sola-profile-choice-row');
  [['sunset','🌅 夕焼け'],['pink','🌸 ピンク'],['night','🌙 夜空']].forEach(([id,label])=>{
    const b=button(label,()=>{themeApply(id);main.replaceChildren();renderProfile(main)},'btn secondary small'+(document.documentElement.dataset.theme===id?' chosen-theme':''));themes.append(b)
  });
  const paletteLabel=el('div','label','吹き出しの色');const palette=el('div','sola-profile-colors');
  [['夕焼け','#ffd2d0'],['桃色','#f7bfdd'],['空色','#bedbf5'],['薄紫','#d9c7f6'],['ミント','#bfe7dc']].forEach(([label,color])=>{
    const swatch=button('',()=>{localStorage.setItem('sola2-bubble-'+state.me.id,color);applyBubbleColor();toast('吹き出しの色を変更したよ')},'sola-profile-swatch');swatch.style.background=color;swatch.title=label;swatch.setAttribute('aria-label',label);palette.append(swatch)
  });appearance.append(themeLabel,themes,paletteLabel,palette);right.append(appearance);

  const tools=card(el('h3','','🔔 通知とアカウント'));const toolRow=el('div','sola-profile-tool-row');
  toolRow.append(button('ブラウザ通知を許可',async()=>{if(!('Notification' in window)){toast('このブラウザは通知に対応していないよ');return}if(!window.isSecureContext){toast('通知はHTTPSまたはlocalhostで利用できるよ');return}const p=await Notification.requestPermission();toast(p==='granted'?'通知を許可したよ':'通知は許可されていないよ')},'btn secondary small'));
  toolRow.append(button('ログアウト',async()=>{try{await api('/api/logout','POST');state.me=null;navigate('chats')}catch(e){alert(e.message)}},'btn secondary small'));
  tools.append(toolRow);left.append(tools);
  // SOLA ELEVEN FEATURES 2026: account security controls.
  const security=card(el('h3','','🔐 アカウントの安全設定'));
  const oldPass=field('現在のパスワード','password'),newPass=field('新しいパスワード（8文字以上）','password');
  const changePass=button('パスワードを変更',async()=>{try{await api('/api/account/password','POST',{current_password:oldPass.value,new_password:newPass.value});oldPass.value='';newPass.value='';toast('パスワードを変更したよ')}catch(e){toast(e.message)}},'btn small');
  const historyBox=el('div','sola-login-history');historyBox.hidden=true;
  const historyButton=button('最近のログイン履歴を表示',async()=>{if(!historyBox.hidden){historyBox.hidden=true;return}try{const result=await api('/api/account/login-history');historyBox.replaceChildren();if(!result.history.length)historyBox.append(message('履歴はまだないよ','subtle'));result.history.forEach(h=>historyBox.append(el('div','sola-history-line',h.device+' · '+formatDate(h.created_at))));historyBox.hidden=false}catch(e){toast(e.message)}},'btn secondary small');
  security.append(oldPass,newPass,changePass,historyButton,historyBox);main.append(security);
}
async function renderChat(main){
  const id=state.chatId;
  const back=button('← ホーム',()=>navigate('chats'),'btn secondary small');
  const box=el('div','chatbox'),header=el('div','chatheader'),heading=el('div','itemtitle',state.chatName||'チャット'),messages=el('div','messages');
  const presence=el('div','chat-presence');
  const manage=button('⚙️ グループ管理',()=>{
    if($('.group-management',box)){$('.group-management',box).remove();return}
    renderGroupManagement(box,id)
  },'btn secondary small');
  const replyBanner=el('div','reply-banner');replyBanner.hidden=true;
  const form=el('form','chatcomposer'),input=field('メッセージを入力'),send=button('送信',()=>{});
  const picker=field('','file');picker.type='file';picker.accept='image/jpeg,image/png,image/webp';picker.classList.add('hidden-file');
  const imageButton=button('📷',()=>picker.click(),'btn secondary');imageButton.title='写真を送信';
  const filePicker=field('','file');filePicker.classList.add('hidden-file');filePicker.accept='.pdf,.txt,.csv,.md,.docx,.xlsx,.pptx';
  const fileButton=button('📎',()=>filePicker.click(),'btn secondary');fileButton.title='ファイルを送信';
  send.type='submit';send.onclick=null;
  const logo=button('',()=>navigate('chats'),'chat-home-logo');logo.append(brandIcon('mini'));add(header,back,logo,add(el('div','chat-title-block'),heading,presence));if(state.chatKind==='group'){header.append(button('🔑 ID',async()=>{try{const r=await api('/api/groups/'+id+'/members');copyGroupId(r.chat.group_code)}catch(e){alert(e.message)}},'btn secondary small'),manage)}
  add(form,imageButton,picker,fileButton,filePicker,input,send);
  input.value=readDraft(id);let lastTypingSent=0;
  input.addEventListener('input',()=>{saveDraft(id,input.value);if(state.chatKind==='dm'&&input.value.trim()&&Date.now()-lastTypingSent>2500){lastTypingSent=Date.now();api('/api/chats/'+id+'/typing','POST').catch(()=>{})}});
  const typingBubble=el('div','sola-typing');typingBubble.hidden=true;typingBubble.textContent='●  ●  ●　入力中…';
  add(box,header,messages,typingBubble,replyBanner,form);main.append(box);
  // SOLA ELEVEN FEATURES 2026: scroll position and jump-to-latest.
  const scrollKey='sola-scroll-'+state.me.id+'-'+id;
  let firstChatLoad=true;
  const latestButton=button('↓ 最新へ',()=>{messages.scrollTop=messages.scrollHeight;sessionStorage.removeItem(scrollKey)},'sola-jump-latest');
  box.append(latestButton);
  const updateJump=()=>{const near=messages.scrollHeight-messages.scrollTop-messages.clientHeight<160;latestButton.hidden=near;try{sessionStorage.setItem(scrollKey,near?'bottom':String(messages.scrollTop))}catch{}};
  messages.addEventListener('scroll',updateJump,{passive:true});latestButton.hidden=true;
  // SOLA_AUTO_OLDER_SCROLL_V1: reaching the top fetches the previous 60 messages.
  const olderMessages=new Map();
  let fetchingOlder=false,hasMoreOlder=true;
  const olderLoading=el('div','sola-auto-older-status','以前のメッセージを読み込み中…');
  olderLoading.hidden=true;
  box.insertBefore(olderLoading,messages);
  async function loadOlderOnScroll(){
    if(fetchingOlder||!hasMoreOlder||firstChatLoad||state.chatId!==id||refreshing)return;
    if(messages.scrollTop>140)return;
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
  messages.addEventListener('scroll',()=>{if(messages.scrollTop<=140)loadOlderOnScroll()},{passive:true});
  let replyTarget=null,refreshing=false,lastRenderedSignature=null;
  // Float a reaction independently of the message layout, so bubbles never jump.
  function celebrateReaction(emoji,anchor){
    const r=anchor.getBoundingClientRect();
    const burst=el('span','sola-reaction-burst',emoji);
    burst.style.left=(r.left+r.width/2)+'px';
    burst.style.top=(r.top+r.height/2)+'px';
    document.body.append(burst);
    burst.addEventListener('animationend',()=>burst.remove(),{once:true});
    setTimeout(()=>burst.remove(),1100);
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
  state.contextCleanup=()=>{cancelLongPress();contextAbort.abort();contextMenu.remove();state.contextCleanup=null};
  function clearReply(){replyTarget=null;replyBanner.replaceChildren();replyBanner.hidden=true}
  function selectReply(m){replyTarget=m;replyBanner.hidden=false;replyBanner.replaceChildren(el('span','grow','↩ '+m.username+'：'+(m.body||'📷 写真').slice(0,80)),button('×',clearReply,'btn secondary small'));input.focus()}
  let pendingTextToken=null;
  form.onsubmit=async e=>{
    e.preventDefault();const body=input.value.trim();if(!body||send.disabled)return;
    send.disabled=true;
    try{
      if(!pendingTextToken||pendingTextToken.body!==body)pendingTextToken={body,token:(crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):(Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)))};
      await api('/api/chats/'+id+'/messages','POST',{body,reply_to:replyTarget?.id||null,client_token:pendingTextToken.token});
      pendingTextToken=null;input.value='';saveDraft(id,'');clearReply();await refresh(true);
    }catch(ex){toast(ex.message+'。もう一度送信すると再試行するよ')}finally{send.disabled=false;input.focus()}
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
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('画像を読み込めなかったよ'))};img.src=url;
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
  const sola26CancelUpload=button('送信キャンセル',()=>{sola26ActiveUpload?.abort()},'sola26-upload-cancel');uploadProgress.append(sola26CancelUpload);
  function uploadWithProgress(url,formData){
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();sola26ActiveUpload=xhr;xhr.open('POST',url);xhr.setRequestHeader('X-CSRF-Token',state.csrf);
      xhr.upload.onprogress=e=>{if(e.lengthComputable){progressBar.value=Math.round(e.loaded/e.total*100);progressLabel.textContent='アップロード '+progressBar.value+'%'}};
      xhr.onerror=()=>reject(new Error('通信に失敗したよ'));xhr.onabort=()=>reject(new Error('送信をキャンセルしたよ'));xhr.onloadend=()=>{if(sola26ActiveUpload===xhr)sola26ActiveUpload=null};
      xhr.onload=()=>{let data={};try{data=JSON.parse(xhr.responseText)}catch{}if(xhr.status>=200&&xhr.status<300)resolve(data);else reject(new Error(data.error||'送信できなかったよ'))};
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
    }catch(e){alert(e.message)}finally{uploading=false;imageButton.disabled=false;fileButton.disabled=false;uploadProgress.hidden=true;picker.value='';filePicker.value=''}
  }
  picker.onchange=()=>{const file=picker.files?.[0];if(file)sendAttachment(file,true)};
  filePicker.onchange=()=>{const file=filePicker.files?.[0];if(file)sendAttachment(file,false)};
  const dropHint=el('div','sola-drop-hint','ここに画像・ファイルをドロップして送信');dropHint.hidden=true;box.append(dropHint);
  let dragDepth=0;
  box.addEventListener('dragenter',e=>{if(!e.dataTransfer?.types.includes('Files'))return;e.preventDefault();dragDepth++;dropHint.hidden=false});
  box.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
  box.addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)dropHint.hidden=true});
  box.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;dropHint.hidden=true;const file=e.dataTransfer?.files?.[0];if(!file)return;const isImage=file.type.startsWith('image/');sendAttachment(file,isImage)});
  const galleryButton=button('🖼️ ギャラリー',async()=>{const old=$('.sola-gallery',box);if(old){old.remove();return}const gallery=el('div','sola-gallery');box.append(gallery);try{const r=await api('/api/chats/'+id+'/gallery');gallery.append(add(el('div','row wrap'),el('h3','grow','画像ギャラリー'),button('×',()=>gallery.remove(),'btn secondary small')));const grid=el('div','gallery-grid');if(!r.images.length)grid.append(message('写真はまだないよ','subtle'));r.images.forEach(m=>{const img=el('img','gallery-image');img.src='/api/chat-images/'+m.id;img.alt=m.username+'の写真';img.loading='lazy';img.onclick=()=>window.open(img.src,'_blank','noopener');grid.append(img)});gallery.append(grid)}catch(e){gallery.append(message(e.message))}},'btn secondary small');
  header.append(galleryButton);
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
      if(r.chat.kind==='group'&&!header.contains(manage))header.append(button('🔑 ID',async()=>{try{const r=await api('/api/groups/'+id+'/members');copyGroupId(r.chat.group_code)}catch(e){alert(e.message)}},'btn secondary small'),manage);
      const combined=[...new Map([...olderMessages.values(),...r.messages].map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id);
      if(olderMessages.size===0&&r.messages.length<60)hasMoreOlder=false;
      const messageSignature=JSON.stringify(combined);
      // Polling every four seconds must not rebuild unchanged bubbles or close menus.
      if(messageSignature!==lastRenderedSignature){
      closeContextMenu();
      messages.replaceChildren();let lastId=null;
      for(const m of combined){
        if(m.is_system){const event=el('div','sola26-system',m.username+'が'+m.body);event.dataset.solaMessageId=m.id;messages.append(event);lastId=null;continue}
        const mine=m.user_id===state.me.id;
        const line=el('div','bubbleline'+(mine?' mine':''));line.dataset.solaMessageId=m.id;
        const col=el('div','bubblecol');
        if(r.chat.kind==='group'&&!mine){
          const show=lastId!==m.user_id;const av=show?avatar(m.username,true,m.user_id):el('div','avatar small','');if(!show)av.style.visibility='hidden';line.append(av);
          if(show)col.append(el('div','sender',m.username))
        }
        const bubble=el('div','bubble');
        if(m.deleted_at){bubble.append(el('div','subtle','送信が取り消されました'));col.append(bubble);line.append(col);messages.append(line);lastId=m.user_id;continue}
        if(m.reply_to){const quoted=el('div','quoted sola26-reply-target',`↩ ${m.reply_username||'ユーザー'}：${(m.reply_body||'📷 写真').slice(0,80)}`);quoted.title='返信元へジャンプ';quoted.onclick=async()=>{const target=messages.querySelector('[data-sola-message-id='+m.reply_to+']');if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('sola26-reply-highlight');setTimeout(()=>target.classList.remove('sola26-reply-highlight'),1800)}else toast('上にスクロールして以前のメッセージを読み込んでから試してね')};bubble.append(quoted)}
        if(m.body){bubble.append(el('div','bubbletext',m.body));const preview=sola26LinkPreview(m.body);if(preview)bubble.append(preview)}if(m.edited_at)bubble.append(el('span','edit-mark','（編集済み）'));
        if(m.file_name){const link=el('a','chat-file','📎 '+m.file_name);link.href='/api/chat-files/'+m.id;link.download=m.file_name;link.title='ファイルを保存';bubble.append(link)}
        if(m.has_image){const img=el('img','message-image');img.src='/api/chat-images/'+m.id;img.alt='送信された写真';img.loading='lazy';img.onclick=()=>window.open(img.src,'_blank','noopener');bubble.append(img)}
        // Reaction badges are absolutely overlaid on the bubble edge.
        // They NEVER participate in message width/height calculations.
        const reactionData=(m.reactions||[]).filter(r=>Number(r.count)>0);
        if(reactionData.length){
          const reactions=el('div','sola-reaction-overlay');
          reactions.setAttribute('aria-label','メッセージのリアクション');
          reactionData.forEach(r=>{
            const count=Number(r.count)||0;
            const chip=button(r.emoji+(count>1?' '+count:''),async()=>{
              try{await api('/api/messages/'+m.id+'/reactions','POST',{emoji:r.emoji});await refresh()}catch(e){alert(e.message)}
            },'sola-reaction-overlay-chip'+(r.mine?' mine-reaction':''));
            chip.title=r.emoji+' '+count+'件';
            chip.setAttribute('aria-label',r.emoji+' '+count+'件のリアクション');
            reactions.append(chip);
          });
          bubble.append(reactions);
          bubble.classList.add('sola-bubble-with-reactions');
        }
        col.append(bubble);
        const actions=el('div','message-actions');if(mine){if(!m.has_image)actions.append(button('✏️ 編集',async()=>{const body=prompt('メッセージを編集',m.body);if(body===null)return;try{await api('/api/messages/'+m.id,'PATCH',{body});await refresh()}catch(e){alert(e.message)}},'tiny-action'));actions.append(button('🗑 送信取り消し',async()=>{if(!confirm('このメッセージの送信を取り消す？'))return;try{await api('/api/messages/'+m.id,'DELETE');await refresh()}catch(e){alert(e.message)}},'tiny-action'))}else{actions.append(button('⚑ 通報',()=>sendReport({user_id:m.user_id,message_id:m.id}),'tiny-action'))}actions.append(button('↩ 返信',()=>selectReply(m),'tiny-action'));
        const reactionMenu=el('div','reaction-menu');reactionMenu.hidden=true;
        ['👍','❤️','😂','😮','🎉','🙏'].forEach(emoji=>reactionMenu.append(button(emoji,async()=>{
          celebrateReaction(emoji,bubble);
          try{await api('/api/messages/'+m.id+'/reactions','POST',{emoji});await refresh()}catch(e){alert(e.message)}
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
          longPressTimer=setTimeout(()=>{
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
        line.append(col);messages.append(line);lastId=m.user_id
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
          api('/api/chats/'+id+'/read','POST',{last_id:newest}).catch(()=>{lastReadId=0});
        }
      }
    }catch(e){messages.replaceChildren(message(e.message))}finally{refreshing=false}
  }
  await refresh(true);
  state.timer=setInterval(()=>{if(state.chatId===id&&document.visibilityState==='visible')refresh()},2500)
}

async function sendReport(target){
  const reason=prompt('通報理由を入力してね（5〜500文字）。通報は運営だけが確認するよ。');
  if(reason===null)return;
  try{await api('/api/reports','POST',{...target,reason});alert('通報を送ったよ')}catch(e){alert(e.message)}
}
async function renderNotifications(main){
  const allRead=button('✓ すべて既読',async()=>{try{await api('/api/notifications/read','POST');await updateNotificationBadge();navigate('notifications')}catch(e){alert(e.message)}},'btn secondary small');
  add(main,title('🔔 通知センター',[allRead]));
  const tabs=el('div','notification-tabs'),content=card(message('読み込み中…'));
  const searchBox=field('通知を検索');const important=el('input');important.type='checkbox';important.checked=state.noticeOnlyImportant;
  const importantLabel=el('label','row wrap');importantLabel.append(important,el('span','','重要通知だけ表示'));main.append(card(searchBox,importantLabel),tabs,content);
  try{
    const r=await api('/api/notifications');state.unreadNotifications=r.unread;updateNotificationBadge();
    const options=[['all','すべて'],['unread','未読'],['friend','フレンド'],['group','グループ'],['other','その他']];
    const iconFor=kind=>kind==='friend_request'||kind==='friend_accept'?'👥':kind.startsWith('group')||kind==='transfer'?'👑':kind==='message'?'💬':'🔔';
    const kindMatch=(n,f)=>f==='all'||(f==='unread'?!n.is_read:f==='friend'?n.kind.startsWith('friend'):f==='group'?n.kind.startsWith('group')||n.kind==='transfer':!n.kind.startsWith('friend')&&!n.kind.startsWith('group')&&n.kind!=='transfer');
    const show=()=>{
      tabs.replaceChildren();options.forEach(([key,label])=>tabs.append(button(label+(key==='unread'?' ('+r.notifications.filter(n=>!n.is_read).length+')':''),()=>{state.notificationFilter=key;show()},'filter-chip'+(state.notificationFilter===key?' selected':''))));
      content.replaceChildren();const items=r.notifications.filter(n=>kindMatch(n,state.notificationFilter)&&(!state.noticeOnlyImportant||['friend_request','group_request','group_decision','transfer','group_admin'].includes(n.kind))&&n.text.toLowerCase().includes(searchBox.value.toLowerCase()));
      if(!items.length)content.append(sola26Empty('この種類の通知はまだないよ'));
      items.forEach(n=>{
        const item=el('div','notification-card'+(!n.is_read?' notification-new':''));
        const av=n.actor_id?avatar(n.actor_name||'?',false,n.actor_id):el('div','notification-system',iconFor(n.kind));
        const body=el('div','notification-body'),head=el('div','notification-head');
        add(head,el('span','notification-kind',iconFor(n.kind)+' '+(n.kind.startsWith('friend')?'フレンド':n.kind.startsWith('group')||n.kind==='transfer'?'グループ':'お知らせ')),el('time','notification-time',formatDate(n.created_at)));
        body.append(head,el('div','notification-text',n.text));
        const actions=el('div','notification-actions');
        const mark=async()=>{if(!n.is_read){await api('/api/notifications/'+n.id+'/read','POST');n.is_read=1;state.unreadNotifications=Math.max(0,state.unreadNotifications-1);updateNotificationBadge()}};
        if(n.kind==='friend_request')actions.append(button('フレンド申請を見る',async()=>{try{await mark();navigate('friends')}catch(e){alert(e.message)}},'btn small'));
        else if(n.chat_id)actions.append(button('グループを見る',async()=>{try{await mark();const list=await api('/api/chats');const chat=list.chats.find(c=>c.id===n.chat_id);if(chat)openChat(chat.id,chat.name,chat.kind);else navigate('chats')}catch(e){alert(e.message)}},'btn secondary small'));
        if(n.actor_id&&n.kind!=='friend_request')actions.append(button('プロフィール',async()=>{try{await mark();renderUserProfile(main,n.actor_id)}catch(e){alert(e.message)}},'btn secondary small'));
        if(!n.is_read)actions.append(button('既読にする',async()=>{try{await mark();show()}catch(e){alert(e.message)}},'btn secondary small'));
        body.append(actions);item.append(av,body);content.append(item)
      })
    };searchBox.oninput=show;important.onchange=()=>{state.noticeOnlyImportant=important.checked;show()};show();
    if(state.officialAdmin)main.append(card(button('⚑ 運営への通報一覧',()=>renderAdminReports(main),'btn secondary small')))
  }catch(e){content.replaceChildren(message(e.message))}
}
function formatDate(value){if(!value)return '';const date=new Date(String(value).replace(' ','T')+(String(value).includes('Z')||String(value).includes('+')?'':'Z'));return isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date)}
function renderNotificationsFresh(){navigate('notifications')}
async function renderAdminDashboard(main){
 if(!state.officialAdmin){navigate('chats');return}
 main.replaceChildren(title('🛡️ SOLA CHAT 管理者画面',[button('📋 通報を確認',()=>renderAdminReports(main),'btn secondary small')]));
 const content=card(message('管理情報を読み込み中…'));main.append(content);
 try{
   const data=await api('/api/admin/overview');content.replaceChildren();
   const stats=el('div','sola-admin-stats');
   [['👤 ユーザー',data.counts.users],['👥 グループ',data.counts.groups],['💬 メッセージ',data.counts.messages],['⚑ 通報',data.counts.reports]].forEach(([label,value])=>stats.append(card(el('div','subtle',label),el('strong','sola-admin-number',value))));content.append(stats);
   content.append(el('h3','mutedtitle','最近登録されたユーザー'));
   const search=field('ユーザー名で絞り込み');content.append(search);
   const users=el('div','sola-admin-list');content.append(users);
   function drawUsers(){users.replaceChildren();data.users.filter(u=>u.username.toLowerCase().includes(search.value.toLowerCase())).forEach(u=>{const line=el('div','sola-admin-line');line.append(el('span','grow',u.username+' · '+u.public_code),button('プロフィール',()=>renderUserProfile(main,u.id),'btn secondary small'));users.append(line)});if(!users.children.length)users.append(message('該当するユーザーはいないよ','subtle'))}
   search.oninput=drawUsers;drawUsers();
   content.append(el('h3','mutedtitle','最近作られたグループ'));
   const groups=el('div','sola-admin-list');data.groups.forEach(g=>groups.append(el('div','sola-admin-line',g.name+' · '+g.group_code+' · 作成者：'+(g.owner||'不明'))));if(!data.groups.length)groups.append(message('グループはまだないよ','subtle'));content.append(groups);
   content.append(el('p','subtle','この画面は閲覧専用。ユーザーやグループの削除は行わないよ。'));
 }catch(e){content.replaceChildren(message(e.message))}
}
async function renderAdminReports(main){
  main.replaceChildren(title('運営への通報',[button('← 通知',()=>navigate('notifications'),'btn secondary small')]));
  const filter=el('select','field');[['all','すべて'],['open','未対応'],['reviewing','確認中'],['resolved','対応済み']].forEach(([v,t])=>{const o=el('option','',t);o.value=v;filter.append(o)});
  const query=field('通報理由・ユーザー名で検索');const c=card(message('読み込み中…'));
  main.append(card(filter,query),c);
  try{const r=await api('/api/admin/reports');const show=()=>{c.replaceChildren();const list=r.reports.filter(x=>(filter.value==='all'||(x.status||'open')===filter.value)&&[x.reason,x.target,x.reporter].some(t=>String(t||'').toLowerCase().includes(query.value.toLowerCase())));
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
setInterval(()=>{if(state.me&&document.visibilityState==='visible')updateNotificationBadge()},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.me){solaPresencePing();updateNotificationBadge();if(state.chatId)render()}});

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
      script.onload=()=>resolve(typeof window.jsQR==='function');
      script.onerror=()=>resolve(false);
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
  const closeButton=button('✕ 閉じる',()=>close(),'btn secondary small');
  heading.append(el('h2','','📷 QRコードを読み取る'),closeButton);
  const status=el('p','sola-qr-hint','カメラを使うか、QRコードの画像を選んでね。');
  const video=el('video','sola-qr-video');video.autoplay=true;video.muted=true;video.playsInline=true;video.hidden=true;
  const canvas=document.createElement('canvas');
  const actions=el('div','sola-qr-dialog-actions');
  const cameraButton=button('📹 カメラを起動',()=>startCamera(),'btn small');
  const fileButton=button('🖼️ 画像から読み取る',()=>fileInput.click(),'btn secondary small');
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
const solaPagePaths={chats:'/chats',join:'/join',search:'/search',friends:'/friends',notifications:'/notifications',profile:'/profile',admin:'/admin'};
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
    }else if(state.me){navigate('chats',true);return}
  }
  if(!state.me){render();return}
  const map={ '/':'chats','/home':'chats','/chats':'chats','/search':'search','/friends':'friends','/notifications':'notifications','/profile':'profile','/join':'join','/admin':'admin' };
  if(map[path]){
    const view=map[path];
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
      state.chatId=chat.id;state.chatKind=chat.kind;state.chatName=chat.name;state.view='chats';render();
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
  navigate('chats',true);
}
function solaStartRoute(){
  if(location.hash.match(/^#\/(user|group)\/[A-Za-z0-9]+$/))resolveDeepLink();
  else solaLoadRoute();
}
window.addEventListener('popstate',()=>{if(state.me)solaLoadRoute();else render()});

async function resolveDeepLink(){if(!state.me)return;const m=location.hash.match(/^#\/(user|group)\/([A-Za-z0-9]+)$/);if(!m)return;const kind=m[1],key=m[2];history.replaceState(null,'',location.pathname);if(kind==='user'){try{const profile=await api('/api/public-profiles/'+encodeURIComponent(key));navigate('search');const main=document.querySelector('main');if(main)await renderUserProfile(main,profile.user_id)}catch(e){navigate('search');toast(e.message)}}else if(kind==='group'){navigate('join');const input=document.querySelector('main input');if(input){input.value=key;input.dispatchEvent(new Event('input',{bubbles:true}))}}}
(async()=>{try{const r=await api('/api/me');state.me=r.user;state.csrf=r.csrf;state.officialAdmin=Boolean(r.official_admin);render();if(state.me){updateNotificationBadge();pollInAppNotices();solaStartRoute()}}catch(e){root.replaceChildren(message('起動できなかったよ：'+e.message))}})();

// SOLA26: mobile visual viewport keeps the composer above the virtual keyboard.
if(window.visualViewport){const adjust=()=>{document.documentElement.style.setProperty('--sola26-viewport-height',window.visualViewport.height+'px')};window.visualViewport.addEventListener('resize',adjust);adjust()}
