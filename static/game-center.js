// v49 game dialogs (no native browser popups)
function sola49GameDialog(text,confirmMode=false){return new Promise(resolve=>{
 const overlay=document.createElement('div');overlay.className='sola49-game-overlay';
 const panel=document.createElement('div');panel.className='sola49-game-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const title=document.createElement('h2');title.textContent=confirmMode?'確認':'お知らせ';
 const body=document.createElement('p');body.textContent=text;
 const actions=document.createElement('div');actions.className='sola49-game-actions';
 const finish=value=>{document.removeEventListener('keydown',esc);overlay.remove();resolve(value)};
 const esc=e=>{if(e.key==='Escape')finish(false)};document.addEventListener('keydown',esc);
 const make=(label,value)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>finish(value);actions.append(b);return b};
 if(confirmMode)make('キャンセル',false);const ok=make('OK',true);
 panel.append(title,body,actions);overlay.append(panel);document.body.append(overlay);ok.focus();
 overlay.addEventListener('mousedown',e=>{if(e.target===overlay)finish(false)});
})}
const sola49GameConfirm=text=>sola49GameDialog(text,true);
const sola49GameAlert=text=>sola49GameDialog(text,false);
'use strict';
// v34: Six supported games; solo games provide direct ranking access.
const games=[['snake','🐍','スネーク','solo'],['2048','🔢','2048','solo'],['breakout','🧱','ブロック崩し','solo'],['ttt','❌','○×ゲーム','multi'],['connect4','🔴','四目並べ','multi'],['reversi','⚫','リバーシ','multi']];
const $=s=>document.querySelector(s), cards=$('#cards'),play=$('#play'),board=$('#board'),pause=$('#pause'),result=$('#result'),score=$('#score'),hint=$('#hint');
let game=null,loop=null,paused=false,ended=false,cleanup=()=>{},keyHandler=()=>{},finishTimer=null;
function stop(){if(queueWaiting){fetch('/game-api/queue/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>{});queueWaiting=false}if(onlineTimer){clearInterval(onlineTimer);onlineTimer=null}activeMatch=null;if(finishTimer){clearTimeout(finishTimer);finishTimer=null}if(loop){clearInterval(loop);loop=null}cleanup();cleanup=()=>{};keyHandler=()=>{};game=null;paused=false;ended=false;pause.hidden=true;result.hidden=true}
function listing(){stop();play.hidden=true;$('.tabs').hidden=false;setGameTab(document.querySelector('.tabs .active')?.dataset.filter||'all')}
function finish(title,detail){if(ended)return;ended=true;saveBest();if(loop){clearInterval(loop);loop=null}$('#result-title').textContent=title;$('#result-detail').textContent=detail;result.hidden=false;finishTimer=setTimeout(()=>{if(ended&&game)listing()},3500)}
function start(id){if(['ttt','connect4','reversi'].includes(id)){startOnline(id);return}stop();game=id;cards.hidden=true;$('.tabs').hidden=true;play.hidden=false;board.replaceChildren();score.textContent='';hint.textContent='';$('#touch').hidden=true;$('#home').textContent=games.find(g=>g[0]===id)[3]==='solo'?'⌂ ホーム':'⌂ ホーム';$('#game-title').textContent=games.find(g=>g[0]===id)[1]+' '+games.find(g=>g[0]===id)[2];({snake:startSnake,'2048':start2048,breakout:startBreakout,ttt:startTtt,connect4:startConnect4,reversi:startReversi}[id])()}

function showOnlineNotice(id){
  const name=games.find(g=>g[0]===id)?.[2]||'対戦ゲーム';
  stop();game=null;cards.hidden=true;$('.tabs').hidden=true;play.hidden=false;
  board.replaceChildren();$('#touch').hidden=true;score.textContent='';
  $('#home').textContent='← ゲーム選択に戻る';
  $('#game-title').textContent='🌐 '+name;
  hint.textContent='同じ端末での交代対戦は無効にしたよ。';
  const notice=document.createElement('div');notice.className='online-wait';
  const heading=document.createElement('h2');heading.textContent='オンライン対戦専用';
  const desc=document.createElement('p');desc.textContent='オンライン対戦またはユーザー指定対戦で遊べるよ。';
  const back=document.createElement('button');back.textContent='ゲーム選択に戻る';back.onclick=listing;
  notice.append(heading,desc,back);board.append(notice);
}
function saveBest(){if(!game||!['snake','2048','breakout'].includes(game))return;const n=parseInt(score.textContent.replace(/,/g,''),10);if(!Number.isFinite(n))return;try{const k='sola-best-'+game;localStorage.setItem(k,String(Math.max(n,Number(localStorage.getItem(k)||0))))}catch(e){};fetch('/game-api/ranking/score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game,score:n}),credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(d=>{if(d?.personal_best){const banner=document.createElement('div');banner.className='sola31-best';banner.textContent='🏆 NEW RECORD! 自己ベスト更新！';document.body.append(banner);setTimeout(()=>banner.remove(),3500)}}).catch(()=>{})}
function drawCards(filter='all'){
 cards.replaceChildren();
 games.filter(g=>filter==='all'||g[3]===filter).forEach(g=>{
  const c=document.createElement('article');c.className='card';
  const icon=document.createElement('div');icon.className='emoji';icon.textContent=g[1];
  const h=document.createElement('h2');h.textContent=g[2];
  const sub=document.createElement('small');sub.textContent=g[3]==='solo'?'🕹 1人用':'🌐 オンライン対戦';
  c.append(icon,h,sub);
  if(g[3]==='solo'){
   const best=document.createElement('small');
   try{best.textContent='自己ベスト：'+Number(localStorage.getItem('sola-best-'+g[0])||0).toLocaleString()+' pt'}catch(e){best.textContent='自己ベスト：未記録'}
   c.append(best);
  }
  const b=document.createElement('button');b.textContent=g[3]==='solo'?'▶ プレイする':'🌐 オンライン対戦';b.onclick=()=>start(g[0]);c.append(b);cards.append(c);
 });
}
function setGameTab(filter){
 document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
 const ranking=filter==='ranking';
 cards.hidden=ranking;
 if(rankSection)rankSection.hidden=!ranking;
 if(!ranking)drawCards(filter);
 else solaLoadRanking();
}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>setGameTab(b.dataset.filter));
$('#home').onclick=async()=>{if(!game){listing();return}if(['ttt','connect4','reversi'].includes(game)){if(await sola49GameConfirm('対戦を辞退してゲーム選択に戻る？')){if(activeMatch)apiGame('/game-api/forfeit',{id:activeMatch}).finally(listing);else listing()}}else{paused=true;pause.hidden=false}};
$('#resume').onclick=()=>{paused=false;pause.hidden=true};$('#to-list').onclick=listing;$('#result-list').onclick=listing;
document.addEventListener('keydown',e=>{if(!game||paused||ended)return;keyHandler(e)});
function canvas(w,h){let c=document.createElement('canvas');c.width=w;c.height=h;board.append(c);return c.getContext('2d')}
function startSnake(){const ctx=canvas(400,400);board.querySelector('canvas').classList.add('snake-canvas');let snake=[[8,8],[7,8],[6,8]],dir=[1,0],next=dir,food=[12,12],points=0;hint.textContent='矢印キー / WASD / 画面の方向ボタンで操作';$('#touch').hidden=false;function paint(){ctx.fillStyle='#171525';ctx.fillRect(0,0,400,400);ctx.strokeStyle='#ffffff09';ctx.lineWidth=1;for(let n=0;n<=400;n+=20){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n,400);ctx.stroke();ctx.beginPath();ctx.moveTo(0,n);ctx.lineTo(400,n);ctx.stroke()}ctx.fillStyle='#ffb383';ctx.shadowColor='#ff956b';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(food[0]*20+10,food[1]*20+10,8,0,7);ctx.fill();ctx.shadowBlur=0;snake.forEach(([x,y],i)=>{ctx.fillStyle=i?'#80d6af':'#b4f4d3';ctx.beginPath();ctx.roundRect(x*20+1,y*20+1,18,18,5);ctx.fill();if(!i){ctx.fillStyle='#193d34';ctx.beginPath();ctx.arc(x*20+7,y*20+7,2,0,7);ctx.arc(x*20+13,y*20+7,2,0,7);ctx.fill()}});score.textContent=points+' pt'}function change(k){let d={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]}[k];if(d&&(d[0]!==-dir[0]||d[1]!==-dir[1]))next=d}keyHandler=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();change(e.key)};document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>{if(!paused)change(b.dataset.dir)});let sx=0,sy=0;const c=board.querySelector('canvas');c.ontouchstart=e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY};c.ontouchend=e=>{let dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))>20)change(Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp')};loop=setInterval(()=>{if(paused)return;dir=next;let head=[(snake[0][0]+dir[0]+20)%20,(snake[0][1]+dir[1]+20)%20],eat=head[0]===food[0]&&head[1]===food[1];if((eat?snake:snake.slice(0,-1)).some(p=>p[0]===head[0]&&p[1]===head[1])){finish('ゲームオーバー','スネーク：'+points+' pt');return}snake.unshift(head);if(eat){points+=10;let free=[];for(let x=0;x<20;x++)for(let y=0;y<20;y++)if(!snake.some(p=>p[0]===x&&p[1]===y))free.push([x,y]);if(!free.length){finish('クリア！',points+' pt');return}food=free[Math.floor(Math.random()*free.length)]}else snake.pop();paint()},135);paint()}
function start2048(){let a=Array(16).fill(0),points=0;const g=document.createElement('div');g.className='tile-grid';board.append(g);hint.textContent='矢印キー / WASD / スワイプで数字を合体！';$('#touch').hidden=false;function spawn(){let z=a.map((v,i)=>v?null:i).filter(v=>v!==null);if(z.length)a[z[Math.floor(Math.random()*z.length)]]=Math.random()<.9?2:4}function draw(){g.replaceChildren();a.forEach(n=>{let t=document.createElement('div');t.className='tile';t.dataset.n=n;t.textContent=n||'';g.append(t)});score.textContent=points+' pt'}function move(k){if(paused||ended)return;let old=a.join(','),rows=[];for(let j=0;j<4;j++){let idx=[];for(let i=0;i<4;i++)idx.push(k==='ArrowLeft'?j*4+i:k==='ArrowRight'?j*4+3-i:k==='ArrowUp'?i*4+j:(3-i)*4+j);let nums=idx.map(i=>a[i]).filter(Boolean),out=[];for(let i=0;i<nums.length;i++){if(nums[i]===nums[i+1]){out.push(nums[i]*2);points+=nums[i]*2;i++}else out.push(nums[i])}idx.forEach((p,i)=>a[p]=out[i]||0)}if(a.join(',')!==old)spawn();draw();if(a.includes(2048)){finish('2048達成！',points+' pt');return}if(!a.includes(0)){let possible=false;for(let i=0;i<16;i++){if(i%4<3&&a[i]===a[i+1])possible=true;if(i<12&&a[i]===a[i+4])possible=true}if(!possible)finish('ゲームオーバー',points+' pt')}}keyHandler=e=>{let k={w:'ArrowUp',a:'ArrowLeft',s:'ArrowDown',d:'ArrowRight'}[e.key]||e.key;if(k.startsWith('Arrow')){e.preventDefault();move(k)}};document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>move(b.dataset.dir));let sx,sy;g.ontouchstart=e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY};g.ontouchend=e=>{let x=e.changedTouches[0].clientX-sx,y=e.changedTouches[0].clientY-sy;if(Math.max(Math.abs(x),Math.abs(y))>25)move(Math.abs(x)>Math.abs(y)?x>0?'ArrowRight':'ArrowLeft':y>0?'ArrowDown':'ArrowUp')};spawn();spawn();draw()}
function startBreakout(){const ctx=canvas(440,440),c=board.querySelector('canvas');let px=180,bx=220,by=335,vx=3,vy=-3,points=0,lives=3,bricks=[];for(let r=0;r<5;r++)for(let x=0;x<8;x++)bricks.push({x:9+x*54,y:35+r*27,alive:true,r});hint.textContent='マウス・タッチ・← →キーでバーを操作';function draw(){ctx.fillStyle='#181525';ctx.fillRect(0,0,440,440);bricks.forEach(b=>{if(b.alive){ctx.fillStyle=['#f9b58d','#e990a5','#c794db','#9baceb','#89d5c4'][b.r];ctx.fillRect(b.x,b.y,48,20)}});ctx.fillStyle='#ffe1c3';ctx.fillRect(px,402,80,12);ctx.beginPath();ctx.arc(bx,by,8,0,Math.PI*2);ctx.fill();score.textContent=points+' pt · ♥ '+lives}function step(){if(paused)return;bx+=vx;by+=vy;if(bx<8||bx>432)vx=-vx;if(by<8)vy=Math.abs(vy);if(vy>0&&by+8>=402&&by<=415&&bx>=px&&bx<=px+80){vy=-Math.abs(vy);vx=Math.max(-5,Math.min(5,(bx-(px+40))/9))}if(by>448){lives--;if(!lives){finish('ゲームオーバー',points+' pt');return}bx=220;by=335;vx=3;vy=-3}for(const b of bricks){if(b.alive&&bx+8>b.x&&bx-8<b.x+48&&by+8>b.y&&by-8<b.y+20){b.alive=false;vy=-vy;points+=10;break}}if(bricks.every(b=>!b.alive)){finish('全ブロッククリア！',points+' pt');return}draw()}keyHandler=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();px=Math.max(0,Math.min(360,px+(e.key==='ArrowLeft'?-30:30)))}};function pointer(e){let r=c.getBoundingClientRect();px=Math.max(0,Math.min(360,(e.clientX-r.left)*440/r.width-40))}c.addEventListener('pointermove',pointer);cleanup=()=>c.removeEventListener('pointermove',pointer);loop=setInterval(step,16);draw()}
function grid(rows,cols,render,click){let el=document.createElement('div');el.className='board-grid';el.style.gridTemplateColumns=`repeat(${cols},1fr)`;board.append(el);return ()=>{el.replaceChildren();for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){let b=document.createElement('button');b.className='cell';render(b,r,c);b.onclick=()=>{if(!paused&&!ended)click(r,c)};el.append(b)}}}
function startTtt(){let a=Array(9).fill(''),turn='❌';hint.textContent='同じ端末で2人が交代して遊ぶ';const draw=grid(3,3,(b,r,c)=>b.textContent=a[r*3+c],(r,c)=>{let i=r*3+c;if(a[i])return;a[i]=turn;let lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];let win=lines.some(l=>l.every(i=>a[i]===turn));draw();if(win)finish(turn+' の勝ち！','対戦終了');else if(a.every(Boolean))finish('引き分け','対戦終了');else{turn=turn==='❌'?'⭕':'❌';score.textContent=turn+' の番'}});score.textContent=turn+' の番';draw()}
function startConnect4(){let a=Array.from({length:6},()=>Array(7).fill(0)),turn=1;hint.textContent='同じ端末で2人が交代して遊ぶ';const draw=grid(6,7,(b,r,c)=>{b.textContent=a[r][c]?'●':'';b.classList.add(a[r][c]===1?'red':a[r][c]===2?'yellow':'')},(r,c)=>{let y=5;while(y>=0&&a[y][c])y--;if(y<0)return;a[y][c]=turn;let won=false;for(const [dy,dx] of [[0,1],[1,0],[1,1],[1,-1]]){let n=1;for(let sign of [-1,1]){let yy=y+dy*sign,xx=c+dx*sign;while(yy>=0&&yy<6&&xx>=0&&xx<7&&a[yy][xx]===turn){n++;yy+=dy*sign;xx+=dx*sign}}if(n>=4)won=true}draw();if(won)finish((turn===1?'赤':'黄')+'の勝ち！','対戦終了');else if(a.every(row=>row.every(Boolean)))finish('引き分け','対戦終了');else{turn=3-turn;score.textContent=(turn===1?'赤':'黄')+'の番'}});score.textContent='赤の番';draw()}
function startReversi(){let a=Array.from({length:8},()=>Array(8).fill(0));a[3][3]=2;a[3][4]=1;a[4][3]=1;a[4][4]=2;let turn=1;hint.textContent='黒が先手。同じ端末で交代して遊ぶ';function flips(r,c,p){if(a[r][c])return[];let all=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;let y=r+dr,x=c+dc,t=[];while(y>=0&&y<8&&x>=0&&x<8&&a[y][x]===3-p){t.push([y,x]);y+=dr;x+=dc}if(t.length&&y>=0&&y<8&&x>=0&&x<8&&a[y][x]===p)all.push(...t)}return all}function has(p){return a.some((row,r)=>row.some((v,c)=>!v&&flips(r,c,p).length))}const draw=grid(8,8,(b,r,c)=>{if(a[r][c]){b.textContent='●';b.classList.add(a[r][c]===1?'black':'white')}else if(flips(r,c,turn).length)b.textContent='·'},(r,c)=>{let f=flips(r,c,turn);if(!f.length)return;a[r][c]=turn;f.forEach(([y,x])=>a[y][x]=turn);turn=3-turn;if(!has(turn))turn=3-turn;draw();let black=a.flat().filter(x=>x===1).length,white=a.flat().filter(x=>x===2).length;score.textContent=`黒 ${black} : ${white} 白 · ${turn===1?'黒':'白'}の番`;if(!has(1)&&!has(2))finish(black===white?'引き分け':(black>white?'黒':'白')+'の勝ち！',`黒 ${black} : ${white} 白`)});score.textContent='黒の番';draw()}
const questions=[
 ['日本の首都は？',['東京','大阪','京都','福岡'],0],['1時間は何分？',['30分','60分','90分','100分'],1],
 ['太陽系で地球の次に外側の惑星は？',['金星','火星','水星','木星'],1],['三角形の内角の和は？',['90度','180度','270度','360度'],1],
 ['水が凍る温度は？（通常の気圧）',['0℃','10℃','50℃','100℃'],0],['日本で一番高い山は？',['富士山','阿蘇山','六甲山','高尾山'],0],
 ['8 × 7 は？',['54','56','64','48'],1],['光の三原色に含まれる色は？',['黄色','緑','黒','白'],1],
 ['1キロメートルは何メートル？',['100','500','1000','10000'],2],['地球の衛星は？',['太陽','月','火星','金星'],1],
 ['12の半分は？',['4','5','6','8'],2],['日本の国旗の丸の色は？',['青','緑','赤','紫'],2]
];
function startQuiz(){
 let idx=0,points=[0,0],rounds=8,remaining=15,locked=false,questionsUsed=[...questions].sort(()=>Math.random()-.5).slice(0,rounds);
 hint.textContent='同じ端末で2人対戦：各問題は先に押した人が回答！ 15秒以内に答えよう';
 const panel=document.createElement('div');panel.className='quiz-panel';board.append(panel);
 function update(){score.textContent=`P1 ${points[0]}点 / P2 ${points[1]}点 · ${idx+1}/${rounds}問`}
 function next(){if(ended)return;if(idx>=rounds){finish(points[0]===points[1]?'引き分け':`プレイヤー${points[0]>points[1]?1:2}の勝ち！`,`P1 ${points[0]}点 / P2 ${points[1]}点`);return}
  locked=false;remaining=15;panel.replaceChildren();const [q,opts]=questionsUsed[idx];const h=document.createElement('h2');h.className='question';h.textContent=`第${idx+1}問：${q}`;const timer=document.createElement('p');timer.className='quiz-timer';timer.textContent=`残り ${remaining}秒`;panel.append(h,timer);
  const buzz=document.createElement('div');buzz.className='buzz-row';for(let p=0;p<2;p++){const b=document.createElement('button');b.textContent=`🔔 プレイヤー${p+1} が回答`;b.onclick=()=>answer(p);buzz.append(b)}panel.append(buzz);
  const answers=document.createElement('div');answers.className='quiz-answers';panel.append(answers);
  function answer(p){if(locked||paused||ended)return;locked=true;buzz.hidden=true;answers.replaceChildren();const tip=document.createElement('p');tip.textContent=`プレイヤー${p+1}が回答中`;answers.append(tip);opts.forEach((o,i)=>{let b=document.createElement('button');b.className='quiz-choice';b.textContent=o;b.onclick=()=>{if(ended||paused)return;answers.querySelectorAll('button').forEach(x=>x.disabled=true);const correct=i===questionsUsed[idx][2];if(correct)points[p]+=100;tip.textContent=correct?'⭕ 正解！ +100点':'❌ 不正解！ 正解：'+opts[questionsUsed[idx][2]];update();advance()};answers.append(b)})}
  function advance(){if(loop){clearInterval(loop);loop=null}const t=setTimeout(()=>{idx++;next()},1100);cleanup=()=>clearTimeout(t)}
  if(loop)clearInterval(loop);loop=setInterval(()=>{if(paused||ended||locked)return;remaining--;timer.textContent=`残り ${remaining}秒`;if(remaining<=0){locked=true;buzz.hidden=true;timer.textContent='時間切れ！ 正解：'+opts[questionsUsed[idx][2]];advance()}},1000);update();
 }next();
}
function startDrawing(){
 const words=['りんご','ねこ','ひこうき','さかな','くるま','たいよう','うさぎ','いえ','でんしゃ','はな','ゆきだるま','とけい'];
 let round=0,points=[0,0],painter=0,word='',remaining=90,drawing=false,active=false;
 hint.textContent='🎨 同じ端末で2人対戦：交代で絵を描いてお題を当てよう！（全4ラウンド）';
 const wrapper=document.createElement('div');wrapper.className='draw-panel';board.append(wrapper);
 const info=document.createElement('p');info.className='notice';wrapper.append(info);
 const c=document.createElement('canvas');c.width=440;c.height=440;c.className='drawing-canvas';wrapper.append(c);const ctx=c.getContext('2d');
 const actions=document.createElement('div');actions.className='action-row';wrapper.append(actions);
 const guess=document.createElement('div');guess.className='guess-row';wrapper.append(guess);
 function update(){score.textContent=`P1 ${points[0]}点 / P2 ${points[1]}点 · ${round+1}/4ラウンド`}
 function resetCanvas(){ctx.fillStyle='#fffaf4';ctx.fillRect(0,0,440,440)}
 function startRound(){if(round>=4){finish(points[0]===points[1]?'引き分け':`プレイヤー${points[0]>points[1]?1:2}の勝ち！`,`P1 ${points[0]}点 / P2 ${points[1]}点`);return}
  painter=round%2;word=words[Math.floor(Math.random()*words.length)];remaining=90;active=false;resetCanvas();actions.replaceChildren();guess.replaceChildren();update();info.textContent=`第${round+1}ラウンド：プレイヤー${painter+1}が描く番。答える人は画面を見ないでね。`;
  const reveal=document.createElement('button');reveal.textContent='お題を確認して開始';reveal.onclick=async()=>{await sola49GameAlert(`プレイヤー${painter+1}だけ見てね！ お題：${word}`);active=true;reveal.remove();info.textContent=`描く人：P${painter+1} ／ 答える人：P${2-painter} ／ 残り ${remaining}秒`};actions.append(reveal);
  const clear=document.createElement('button');clear.textContent='🧽 キャンバスを消す';clear.onclick=()=>{if(active&&!paused)resetCanvas()};actions.append(clear);
  const skip=document.createElement('button');skip.textContent='スキップ';skip.onclick=async()=>{if(!active||paused)return;if(await sola49GameConfirm('このお題をスキップする？ 得点は入りません。'))endRound(false)};actions.append(skip);
  const input=document.createElement('input');input.placeholder='答えをひらがなで入力';input.maxLength=40;input.setAttribute('aria-label','お題の答え');const submit=document.createElement('button');submit.textContent='回答する';const msg=document.createElement('p');msg.className='notice';guess.append(input,submit,msg);
  function check(){if(!active||paused||ended)return;let value=input.value.trim().replace(/\s/g,'');if(!value)return;if(value===word){points[1-painter]+=100;msg.textContent='🎉 正解！ +100点';endRound(true)}else{msg.textContent='違うよ！ もう一度考えてみよう';input.select()}}
  submit.onclick=check;input.onkeydown=e=>{if(e.key==='Enter')check()};
  if(loop)clearInterval(loop);loop=setInterval(()=>{if(!active||paused||ended)return;remaining--;info.textContent=`描く人：P${painter+1} ／ 答える人：P${2-painter} ／ 残り ${remaining}秒`;if(remaining<=0)endRound(false)},1000);
  function endRound(won){if(!active)return;active=false;clearInterval(loop);loop=null;info.textContent=(won?'正解！':'時間切れ／スキップ')+` お題は「${word}」`;input.disabled=true;submit.disabled=true;update();const t=setTimeout(()=>{round++;startRound()},1800);cleanup=()=>clearTimeout(t)}
 }
 function pos(e){let r=c.getBoundingClientRect();return [(e.clientX-r.left)*440/r.width,(e.clientY-r.top)*440/r.height]}
 c.onpointerdown=e=>{if(!active||paused||ended)return;drawing=true;c.setPointerCapture(e.pointerId);let [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y)};
 c.onpointermove=e=>{if(!drawing||paused||!active||ended)return;let [x,y]=pos(e);ctx.strokeStyle='#382338';ctx.lineWidth=5;ctx.lineJoin='round';ctx.lineCap='round';ctx.lineTo(x,y);ctx.stroke()};
 c.onpointerup=()=>drawing=false;c.onpointercancel=()=>drawing=false;
 startRound();
}
function returnToSolaChat(){stop();let target='/chats';try{const saved=sessionStorage.getItem('sola_game_return');if(saved&&saved.startsWith('/')&&!saved.startsWith('//')&&!saved.startsWith('/games'))target=saved}catch(e){}window.location.assign(target)}
document.querySelectorAll('[data-return-chat]').forEach(b=>b.addEventListener('click',returnToSolaChat));drawCards();


// Live two-device play: server-validated turns, polling every 1.2 seconds.
let activeMatch=null,onlineTimer=null,onlineBusy=false,onlineLast='',onlineMode='public',queueWaiting=false;
async function apiGame(path,data){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const v=await r.json();if(!r.ok)throw Error(v.error||'通信エラー');return v}
function onlineMessage(msg){hint.textContent=msg}
function startOnline(id){
 stop();game=id;cards.hidden=true;$('.tabs').hidden=true;play.hidden=false;board.replaceChildren();$('#touch').hidden=true;score.textContent='';$('#home').textContent='辞退';$('#game-title').textContent=games.find(g=>g[0]===id)[1]+' '+games.find(g=>g[0]===id)[2];
 const panel=document.createElement('div');panel.className='online-panel';board.append(panel);
 const modes=document.createElement('div');modes.className='match-modes';
 const publicBtn=document.createElement('button');publicBtn.textContent='🌐 オンライン対戦';
 const friendBtn=document.createElement('button');friendBtn.textContent='🎯 ユーザー指定対戦';
 const controls=document.createElement('div');controls.className='match-controls';
 const list=document.createElement('div');list.className='online-invites';
 const input=document.createElement('input');input.placeholder='ユーザー名 または 通常ユーザーID';input.maxLength=50;
 const invite=document.createElement('button');invite.textContent='ユーザーを招待';
 const queueBtn=document.createElement('button');queueBtn.textContent='🔎 対戦相手を探す';
 const cancelBtn=document.createElement('button');cancelBtn.textContent='待機をキャンセル';cancelBtn.hidden=true;
 modes.append(publicBtn,friendBtn);panel.append(modes,controls,list);
 const modeView=mode=>{onlineMode=mode;controls.replaceChildren();publicBtn.classList.toggle('active',mode==='public');friendBtn.classList.toggle('active',mode==='friend');if(mode==='public'){controls.append(queueBtn,cancelBtn);onlineMessage('同じゲームを選んだプレイヤーと自動でマッチングするよ。')}else{controls.append(input,invite);onlineMessage('ユーザー名または通常ユーザーIDで招待できるよ。秘密のSOLA-IDは使わないよ。')}};
 publicBtn.onclick=async()=>{if(queueWaiting){await apiGame('/game-api/queue/cancel',{}).catch(()=>{});queueWaiting=false}modeView('public')};
 friendBtn.onclick=async()=>{if(queueWaiting){await apiGame('/game-api/queue/cancel',{}).catch(()=>{});queueWaiting=false}modeView('friend')};
 queueBtn.onclick=async()=>{try{const v=await apiGame('/game-api/queue/join',{game:id});if(v.status==='matched'){queueWaiting=false;activeMatch=v.match;onlineMessage('対戦相手が見つかったよ！');}else{queueWaiting=true;onlineMessage('対戦相手を探しているよ…');}cancelBtn.hidden=!queueWaiting;queueBtn.disabled=queueWaiting;await pollOnline()}catch(e){onlineMessage(e.message)}};
 cancelBtn.onclick=async()=>{await apiGame('/game-api/queue/cancel',{}).catch(()=>{});queueWaiting=false;queueBtn.disabled=false;cancelBtn.hidden=true;onlineMessage('マッチングをキャンセルしたよ')};
 invite.onclick=async()=>{try{const v=await apiGame('/game-api/invite',{game:id,target:input.value.trim()});activeMatch=v.match;onlineMessage('招待を送ったよ！相手が参加するまで待ってね。');pollOnline()}catch(e){onlineMessage(e.message)}};
 async function pollOnline(){if(onlineBusy||game!==id)return;onlineBusy=true;try{
  await apiGame('/game-api/heartbeat',{});
  if(queueWaiting){const q=await fetch('/game-api/queue/status?game='+encodeURIComponent(id),{cache:'no-store'});if(q.ok){const v=await q.json();if(v.status==='matched'){activeMatch=v.match;queueWaiting=false;queueBtn.disabled=false;cancelBtn.hidden=true;onlineMessage('対戦相手が見つかったよ！')}else if(v.status==='idle'){queueWaiting=false;queueBtn.disabled=false;cancelBtn.hidden=true}}}
  const res=await fetch('/game-api/me',{cache:'no-store'});if(!res.ok){onlineMessage('対戦にはSOLA CHATへのログインが必要だよ');return}
  const data=await res.json();list.replaceChildren();for(const m of data.matches){if(m.game!==id)continue;const item=document.createElement('div');item.className='invite-item';const t=document.createElement('span');t.textContent=m.host+' VS '+m.guest+' · '+(m.status==='pending'?'招待待ち（5分）':m.status==='disconnected'?'再接続待ち':'対戦中');item.append(t);if(m.status==='pending'&&m.me==='guest'){const yes=document.createElement('button');yes.textContent='参加';yes.onclick=async()=>{try{await apiGame('/game-api/respond',{id:m.id,accept:true});activeMatch=m.id;pollOnline()}catch(e){onlineMessage(e.message)}};const no=document.createElement('button');no.textContent='辞退';no.onclick=async()=>{await apiGame('/game-api/respond',{id:m.id,accept:false});pollOnline()};item.append(yes,no)}else{const go=document.createElement('button');go.textContent=m.status==='playing'?'対戦を開く':'確認';go.onclick=()=>{activeMatch=m.id;onlineLast='';pollOnline()};item.append(go)}list.append(item)}
  if(activeMatch){const r=await fetch('/game-api/match/'+encodeURIComponent(activeMatch),{cache:'no-store'});if(r.ok){const m=(await r.json()).match;renderOnline(m,panel)}}
 }catch(e){onlineMessage('通信を確認してね：'+e.message)}finally{onlineBusy=false}}
 modeView('public');pollOnline();onlineTimer=setInterval(pollOnline,1200)
}

function renderOnline(m,panel){let area=panel.querySelector('.online-board');if(!area){area=document.createElement('div');area.className='online-board';panel.append(area)}const sig=JSON.stringify([m.id,m.board,m.turn,m.status,m.winner,m.disconnect_remaining]);if(sig===onlineLast)return;onlineLast=sig;area.replaceChildren();const info=document.createElement('p');const myTurn=(m.turn===window.onlineMyId);info.textContent=m.host+' VS '+m.guest+' · '+(m.status==='pending'?'参加待ち':m.status==='finished'?(m.winner?'勝敗確定':'引き分け'):m.status==='disconnected'?'再接続待ち（最大2分）':'対戦中');area.append(info);
 const grid=document.createElement('div');grid.className='online-grid '+m.game;grid.style.gridTemplateColumns='repeat('+(m.game==='ttt'?3:m.game==='connect4'?7:8)+',1fr)';area.append(grid);
 m.board.forEach((v,i)=>{const cell=document.createElement('button');cell.className='online-cell';cell.textContent=v===1?'●':v===2?'○':'';cell.dataset.p=v;cell.disabled=m.status!=='playing'||!window.onlineMyId||m.turn!==window.onlineMyId||!!v;cell.onclick=async()=>{try{await apiGame('/game-api/move',{id:m.id,cell:i});onlineLast=''}catch(e){onlineMessage(e.message)}};grid.append(cell)});
 if(m.status==='finished'){onlineMessage(m.winner?(m.winner===window.onlineMyId?'勝利！':'対戦終了。相手の勝利だよ'):'引き分け！')}else if(m.status==='disconnected'){onlineMessage('相手の再接続を待機中：残り'+Math.ceil((m.disconnect_remaining||0)/60)+'分（最大2分）')}else if(m.status==='playing'){onlineMessage(m.turn===window.onlineMyId?'あなたの番だよ':'相手の番を待ってね')}else onlineMessage('招待への返事を待っているよ');
}
(async()=>{try{const r=await fetch('/game-api/identity',{cache:'no-store'});if(r.ok)window.onlineMyId=(await r.json()).id}catch(e){}})();

// v29: on-demand leaderboards with explicit refresh.
const rankSection=document.getElementById('sola-rankings');
const rankGame=document.getElementById('sola-rank-game');
const rankRefresh=document.getElementById('sola-rank-refresh');
const rankBody=document.getElementById('sola-rank-body');
function showSoloRanking(id){if(!rankSection)return;rankGame.value=id;setGameTab('ranking')}
async function solaLoadRanking(){
 if(!rankSection)return;rankRefresh.disabled=true;rankBody.textContent='ランキングを更新中…';
 try{const res=await fetch('/game-api/ranking?game='+encodeURIComponent(rankGame.value)+'&period='+document.getElementById('sola-rank-period').value+'&scope='+document.getElementById('sola-rank-scope').value,{cache:'no-store',credentials:'same-origin'});
  if(!res.ok)throw Error(res.status===401?'チャットへのログインが必要だよ':'ランキングを取得できなかったよ');
  const data=await res.json();rankBody.replaceChildren();
  const mine=document.createElement('p');mine.className='rank-me';mine.textContent='自分の順位：'+(data.my_rank?data.my_rank+'位':'未ランクイン')+' / '+Number(data.my_score).toLocaleString()+(['snake','2048','breakout'].includes(rankGame.value)?' pt':' 勝');rankBody.append(mine);
  if(!data.entries.length){const p=document.createElement('p');p.textContent='まだ記録がないよ。ゲームをプレイしてみよう！';rankBody.append(p)}
  data.entries.forEach((r,i)=>{const row=document.createElement('div');row.className='rank-entry'+(r.me?' mine':'');const pos=document.createElement('strong');pos.textContent=r.rank+'位';const name=document.createElement('span');name.textContent=r.username;const points=document.createElement('b');points.textContent=Number(r.score).toLocaleString()+( ['snake','2048','breakout'].includes(rankGame.value)?' pt':' 勝');row.append(pos,name,points);rankBody.append(row)});
 }catch(e){rankBody.textContent=e.message}finally{rankRefresh.disabled=false}
}
rankRefresh?.addEventListener('click',solaLoadRanking);rankGame?.addEventListener('change',solaLoadRanking);document.getElementById('sola-rank-period')?.addEventListener('change',solaLoadRanking);document.getElementById('sola-rank-scope')?.addEventListener('change',solaLoadRanking);setGameTab('all');
