import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { getDatabase, ref, get, set, update, remove, onValue, onDisconnect, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js';

const $ = id => document.getElementById(id);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db, uid = null, roomCode = null, roomData = null, unsubRoom = null;
let isHost = false, phase = 'lobby', keys = new Set(), moveTouch = new Set();
let me = { x: 480, y: 270, hp: 100, kills: 0, alive: true, name: 'Player' };
let enemies = [], bullets = [], lastWrite = 0, lastHostTick = 0, enemyCounter = 0;
const canvas = $('arena'), ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

function message(text, error=false) { $('lobbyMessage').textContent = text; $('lobbyMessage').style.color = error ? '#ff719e' : ''; }
function roomMessage(text) { $('roomMessage').textContent = text; }
function setConnected(ok, text) { $('connectionDot').classList.toggle('online', ok); $('connectionText').textContent = text; }
function roomPath(path='') { return `rooms/${roomCode}${path ? '/' + path : ''}`; }
function safeName() { return ($('playerName').value.trim() || 'Player').slice(0,16); }
function code6() { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let out=''; for(let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)]; return out; }
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

async function init() {
  if (!firebaseConfig.databaseURL || firebaseConfig.databaseURL.includes('PASTE_')) {
    setConnected(false, '設定が必要');
    message('firebase-config.js にRealtime DatabaseのURLを設定してください。', true);
    return;
  }
  try {
    db = getDatabase(app);
    const result = await signInAnonymously(auth);
    uid = result.user.uid;
    setConnected(true, 'Firebase接続済み');
    message('接続しました。部屋を作成するか、コードで参加してください。');
  } catch (e) {
    console.error(e); setConnected(false, '接続エラー');
    message('接続に失敗しました。匿名認証・Realtime Database・ルールを確認してください。', true);
  }
}

async function createRoom() {
  if (!db || !uid) return message('先にFirebaseの設定を確認してください。', true);
  $('createBtn').disabled = true;
  try {
    let created = false;
    for(let i=0;i<8;i++) {
      const code = code6();
      const result = await runTransaction(ref(db, `rooms/${code}`), old => old === null ? {
        hostId: uid, phase: 'waiting', createdAt: Date.now(),
        players: { [uid]: makePlayer() },
        game: { startedAt: 0, enemies: {}, bullets: {}, updatedAt: Date.now() }
      } : undefined);
      if (result.committed) { roomCode = code; created = true; break; }
    }
    if (!created) throw new Error('部屋コードを作成できませんでした。');
    await onDisconnect(ref(db, roomPath(`players/${uid}`))).remove();
    enterRoom();
  } catch(e) { console.error(e); message(errorText(e), true); }
  finally { $('createBtn').disabled = false; }
}

function makePlayer() {
  return { id: uid, name: safeName(), x: 100 + Math.random()*(W-200), y: 100 + Math.random()*(H-200), hp: 100, kills: 0, alive: true, connected: true, updatedAt: Date.now() };
}

async function joinRoom() {
  if (!db || !uid) return message('先にFirebaseの設定を確認してください。', true);
  const code = $('roomCode').value.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return message('部屋コードは6文字で入力してください。', true);
  $('joinBtn').disabled = true;
  try {
    const rr = ref(db, `rooms/${code}`), snap = await get(rr);
    if (!snap.exists()) throw new Error('部屋が見つかりません。');
    const data = snap.val(), players = data.players || {};
    if (data.phase !== 'waiting') throw new Error('この部屋では現在参加できません。');
    if (Object.keys(players).length >= 6) throw new Error('部屋が満員です（最大6人）。');
    await set(ref(db, `rooms/${code}/players/${uid}`), makePlayer());
    roomCode = code;
    await onDisconnect(ref(db, roomPath(`players/${uid}`))).remove();
    enterRoom();
  } catch(e) { console.error(e); message(errorText(e), true); }
  finally { $('joinBtn').disabled = false; }
}

function errorText(e) {
  const m = String(e?.message || e);
  if (m.includes('PERMISSION_DENIED') || m.includes('permission')) return 'FirebaseのRealtime Databaseルールで拒否されました。READMEの設定を確認してください。';
  if (m.includes('network') || m.includes('offline')) return '通信に失敗しました。インターネット接続を確認してください。';
  return m;
}

function enterRoom() {
  isHost = false; phase = 'waiting';
  hide('lobby'); show('roomPanel'); hide('gamePanel');
  $('roomCodeLabel').textContent = roomCode;
  if (unsubRoom) unsubRoom();
  unsubRoom = onValue(ref(db, roomPath()), snap => {
    if (!snap.exists()) { roomMessage('部屋が削除されました。'); return; }
    roomData = snap.val(); isHost = roomData.hostId === uid; phase = roomData.phase || 'waiting';
    renderRoom();
    if (phase === 'playing' || phase === 'over') {
      hide('roomPanel'); show('gamePanel');
      if (phase === 'playing') { $('backLobbyBtn').classList.add('hidden'); $('gameTitle').textContent='生き残れ'; }
      else { $('backLobbyBtn').classList.remove('hidden'); $('gameTitle').textContent='GAME OVER'; }
    } else { show('roomPanel'); hide('gamePanel'); }
    if (roomData.game?.enemies) enemies = Object.values(roomData.game.enemies);
  }, e => { console.error(e); roomMessage(errorText(e)); });
  roomMessage('参加者を同期しています…');
}

function renderRoom() {
  const players = Object.values(roomData?.players || {});
  $('playersList').innerHTML = '';
  for (const p of players) {
    const card = document.createElement('div'); card.className='player-card';
    const avatar=document.createElement('div'); avatar.className='player-avatar'; avatar.textContent=(p.name||'?').slice(0,1).toUpperCase();
    const info=document.createElement('div'); const name=document.createElement('strong'); name.textContent=p.name||'Player';
    const sub=document.createElement('small'); sub.textContent=p.id===roomData.hostId?'HOST':(p.id===uid?'YOU':'PLAYER');
    info.append(name,sub); card.append(avatar,info); $('playersList').append(card);
  }
  $('startBtn').disabled = !isHost || players.length < 2 || players.length > 6 || roomData.phase !== 'waiting';
  if (!isHost) roomMessage('ホストがゲームを開始するのを待っています。');
  else roomMessage(players.length < 2 ? 'もう1人以上参加すると開始できます。' : `${players.length}/6人 — 開始できます。`);
}

async function startGame() {
  if (!isHost || !roomCode) return;
  try {
    const result = await runTransaction(ref(db, roomPath()), data => {
      if (!data || data.hostId !== uid || data.phase !== 'waiting') return;
      const count = Object.keys(data.players || {}).length;
      if (count < 2 || count > 6) return;
      data.phase='playing'; data.game={ startedAt:Date.now(), enemies:{}, bullets:{}, updatedAt:Date.now() };
      for (const p of Object.values(data.players)) { p.hp=100; p.kills=0; p.alive=true; p.x=100+Math.random()*(W-200); p.y=100+Math.random()*(H-200); }
      return data;
    });
    if (!result.committed) roomMessage('開始できません。2〜6人でホストが操作してください。');
  } catch(e) { roomMessage(errorText(e)); }
}

async function leaveRoom() {
  if (unsubRoom) { unsubRoom(); unsubRoom=null; }
  if (db && roomCode && uid) {
    try {
      const snap=await get(ref(db,roomPath()));
      if (snap.exists()) {
        const data=snap.val();
        await remove(ref(db,roomPath(`players/${uid}`)));
        const remaining=Object.keys(data.players||{}).filter(id=>id!==uid);
        if (data.hostId===uid) {
          if (remaining.length) await update(ref(db,roomPath()),{hostId:remaining[0]});
          else await remove(ref(db,roomPath()));
        }
      }
    } catch(e) { console.warn(e); }
  }
  roomCode=null; roomData=null; phase='lobby'; isHost=false;
  hide('roomPanel'); hide('gamePanel'); show('lobby');
  message('部屋から退出しました。');
}

function updateLocalMove(dt) {
  if (!me.alive || phase!=='playing') return;
  let dx=0,dy=0;
  if(keys.has('w')||keys.has('arrowup')||moveTouch.has('up'))dy--;
  if(keys.has('s')||keys.has('arrowdown')||moveTouch.has('down'))dy++;
  if(keys.has('a')||keys.has('arrowleft')||moveTouch.has('left'))dx--;
  if(keys.has('d')||keys.has('arrowright')||moveTouch.has('right'))dx++;
  if(dx||dy){const len=Math.hypot(dx,dy)||1;me.x=Math.max(18,Math.min(W-18,me.x+dx/len*220*dt));me.y=Math.max(18,Math.min(H-18,me.y+dy/len*220*dt));}
}

function drawGrid() {
  ctx.fillStyle='#070b14';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(80,246,229,.08)';ctx.lineWidth=1;
  for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const g=ctx.createRadialGradient(W/2,H/2,40,W/2,H/2,450);g.addColorStop(0,'rgba(27,60,85,.14)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function drawPlayer(p, self=false) {
  if (!p || p.alive===false) return;
  ctx.save();ctx.shadowBlur=18;ctx.shadowColor=self?'#50f6e5':'#ff4d9d';ctx.fillStyle=self?'#50f6e5':'#ff4d9d';ctx.beginPath();ctx.arc(p.x,p.y,10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle='#f5ffff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,14,0,Math.PI*2);ctx.stroke();
  ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#eef4ff';ctx.fillText(p.name||'Player',p.x,p.y-22);
  ctx.fillStyle='#263249';ctx.fillRect(p.x-17,p.y+17,34,4);ctx.fillStyle=p.hp>35?'#50f6e5':'#ff4d9d';ctx.fillRect(p.x-17,p.y+17,34*Math.max(0,p.hp||0)/100,4);ctx.restore();
}
function drawEnemy(e) { ctx.save();ctx.shadowBlur=15;ctx.shadowColor='#ff4d9d';ctx.fillStyle='#ff4d9d';ctx.beginPath();ctx.moveTo(e.x,e.y-11);ctx.lineTo(e.x+10,e.y);ctx.lineTo(e.x,e.y+11);ctx.lineTo(e.x-10,e.y);ctx.closePath();ctx.fill();ctx.restore(); }
function renderGame() {
  drawGrid();
  for(const e of enemies)drawEnemy(e);
  const players=Object.values(roomData?.players||{});
  for(const p of players)drawPlayer(p,p.id===uid);
  ctx.fillStyle='rgba(7,10,18,.8)';ctx.fillRect(12,12,190,38);ctx.fillStyle='#50f6e5';ctx.font='12px Orbitron, sans-serif';ctx.fillText(`ROOM ${roomCode||'------'}`,24,36);
  const self=roomData?.players?.[uid];
  $('aliveCount').textContent=players.filter(p=>p.alive!==false).length;
  $('killCount').textContent=self?.kills??me.kills;$('hpCount').textContent=Math.max(0,self?.hp??me.hp);
  if(self){me={...me,...self};}
  if(phase==='over'){$('gameMessage').textContent=roomData?.winnerId===uid?'あなたの勝利！':'ゲーム終了。ロビーに戻れます。';}
  else if(me.alive===false)$('gameMessage').textContent='脱落しました。ほかのプレイヤーの戦いを見守りましょう。';
  else $('gameMessage').textContent='WASD / 矢印キーで移動。最も近い敵へ自動攻撃します。';
}

async function writeMyState() {
  if(!db||!roomCode||!uid||phase!=='playing')return;
  try { await update(ref(db,roomPath(`players/${uid}`)),{x:Math.round(me.x),y:Math.round(me.y),hp:me.hp,kills:me.kills,alive:me.alive,updatedAt:Date.now()}); } catch(e){console.warn('player sync',e);}
}
async function hostTick(now,dt) {
  if(!isHost||!roomCode||phase!=='playing'||now-lastHostTick<130)return;
  lastHostTick=now;
  const players=Object.values(roomData?.players||{}).filter(p=>p.alive!==false);
  if(players.length<=1 && Object.keys(roomData?.players||{}).length>1){
    const winner=players[0]?.id||null;
    try{await update(ref(db,roomPath()),{phase:'over',winnerId:winner,finishedAt:Date.now()});}catch(e){console.warn(e);}return;
  }
  if(enemies.length<Math.min(30,4+Math.floor((now-(roomData.game?.startedAt||now))/12000)) && Math.random()<.08){
    const edge=Math.floor(Math.random()*4);let x,y;
    if(edge===0){x=0;y=Math.random()*H;}else if(edge===1){x=W;y=Math.random()*H;}else if(edge===2){x=Math.random()*W;y=0;}else{x=Math.random()*W;y=H;}
    enemies.push({id:`e${Date.now()}_${enemyCounter++}`,x,y,hp:1});
  }
  for(const e of enemies){
    let target=null,best=Infinity;
    for(const p of players){const d=Math.hypot(p.x-e.x,p.y-e.y);if(d<best){best=d;target=p;}}
    if(target){const d=Math.max(1,best);e.x+=(target.x-e.x)/d*58*.13;e.y+=(target.y-e.y)/d*58*.13;}
  }
  // Host owns enemy simulation and publishes a compact snapshot.
  const enemyObject={};for(const e of enemies.slice(0,35))enemyObject[e.id]={x:Math.round(e.x),y:Math.round(e.y),hp:1};
  try{await update(ref(db,roomPath('game')),{enemies:enemyObject,updatedAt:Date.now()});}catch(e){console.warn('enemy sync',e);}
}
let lastFrame=performance.now();
function frame(now) {
  const dt=Math.min(.04,(now-lastFrame)/1000);lastFrame=now;
  if(phase==='playing'){
    updateLocalMove(dt);
    const nowMs=Date.now();
    if(nowMs-lastWrite>150){lastWrite=nowMs;writeMyState();}
    hostTick(now,dt);
    // Each client performs local auto-fire and collision. Host's shared enemy state remains authoritative for movement.
    if(me.alive){
      let target=null,best=190;
      for(const e of enemies){const d=Math.hypot(e.x-me.x,e.y-me.y);if(d<best){best=d;target=e;}}
      if(target && nowMs-(me.lastShot||0)>550){me.lastShot=nowMs;bullets.push({x:me.x,y:me.y,tx:target.x,ty:target.y,life:1});me.kills+=0;}
      for(const b of bullets){b.x+=(b.tx-b.x)*.18;b.y+=(b.ty-b.y)*.18;b.life-=dt;}
      bullets=bullets.filter(b=>b.life>0);
      for(const e of enemies){if(Math.hypot(e.x-me.x,e.y-me.y)<18 && nowMs-(me.lastHit||0)>850){me.lastHit=nowMs;me.hp=Math.max(0,me.hp-12);if(me.hp===0)me.alive=false;}}
    }
  }
  renderGame();requestAnimationFrame(frame);
}

$('createBtn').addEventListener('click',createRoom);
$('joinBtn').addEventListener('click',joinRoom);
$('startBtn').addEventListener('click',startGame);
$('leaveBtn').addEventListener('click',leaveRoom);
$('backLobbyBtn').addEventListener('click',leaveRoom);
$('roomCode').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'').slice(0,6);});
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.querySelectorAll('[data-dir]').forEach(btn=>{
  const dir=btn.dataset.dir;
  const down=e=>{e.preventDefault();moveTouch.add(dir);};
  const up=e=>{e.preventDefault();moveTouch.delete(dir);};
  btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up);
});

init();requestAnimationFrame(frame);
