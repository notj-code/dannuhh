// Simple front-end app to manage word list and flashcards
// This app supports an "offline/local" mode where no backend is required.
const API = '';
let token = localStorage.getItem('dannuhh_token');
let username = localStorage.getItem('dannuhh_user');
let offlineMode = false; // true when the backend isn't available

const elements = {
  wordInput: document.getElementById('wordInput'),
  translateButton: document.getElementById('translateButton'),
  targetLang: document.getElementById('targetLang'),
  addNotice: document.getElementById('addNotice'),
  listWrap: document.getElementById('listWrap'),
  generateBtn: document.getElementById('generateBtn'),
  listTitle: document.getElementById('listTitle'),
  cardsPanel: document.getElementById('cardsPanel'),
  cardContainer: document.getElementById('cardContainer'),
  showFavoritesOnly: document.getElementById('showFavoritesOnly'),
  flipAll: document.getElementById('flipAll'),
  backToEditor: document.getElementById('backToEditor'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  usernameDisplay: document.getElementById('usernameDisplay'),
  authModal: document.getElementById('authModal'),
  authTitle: document.getElementById('authTitle'),
  authUsername: document.getElementById('authUsername'),
  authPassword: document.getElementById('authPassword'),
  authSubmit: document.getElementById('authSubmit'),
  toggleAuthMode: document.getElementById('toggleAuthMode'),
  closeAuthModal: document.getElementById('closeAuthModal'),
  authMsg: document.getElementById('authMsg')
};

let draftList = [];
let showingCards = null; // array of words
let flipDefaultBack = false;
let authMode = 'login';

function setAuthUI(){
  if (token && username){
    elements.usernameDisplay.textContent = username;
    elements.loginBtn.style.display = 'none';
    elements.logoutBtn.style.display = 'inline-block';
  } else {
    elements.usernameDisplay.textContent = '';
    elements.loginBtn.style.display = 'inline-block';
    elements.logoutBtn.style.display = 'none';
  }
}
setAuthUI();

// show server status indicator
const serverStatusEl = document.getElementById('serverStatus');
function setServerStatus(online){
  if (!serverStatusEl) return;
  serverStatusEl.textContent = online ? 'server: online' : 'server: offline (local mode)';
  serverStatusEl.style.color = online ? '#86efac' : '#ffd166';
}

// helpers
async function postJSON(url, body){
  try{
    const res = await fetch(url,{ method:'POST', headers: { 'Content-Type':'application/json', ...(token?{ Authorization: 'Bearer '+token }: {}) }, body: JSON.stringify(body)});
    return await res.json();
  }catch(err){
    offlineMode = true; setServerStatus(false);
    return { error: 'offline' };
  }
}
async function getJSON(url){
  try{ const res = await fetch(url, { headers: { ...(token?{ Authorization: 'Bearer '+token }: {}) } }); return await res.json(); }
  catch(err){ offlineMode = true; setServerStatus(false); return { error: 'offline' }; }
}

// quick server availability check on startup
async function checkServer(){
  try{
    const res = await fetch('/api/words/translate', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text: 'ping', target: 'ko' }) });
    if (!res.ok) throw new Error('no');
    await res.json();
    offlineMode = false; setServerStatus(true);
  }catch(e){ offlineMode = true; setServerStatus(false); }
}
checkServer();

// tiny offline translator fallback
function translateOffline(text, target){
  if (!text) return '';
  const t = text.trim().toLowerCase();
  const dict = {
    'apple':'사과','book':'책','sun':'태양','moon':'달','cat':'고양이','dog':'개','water':'물','house':'집','car':'차','hello':'안녕하세요'
  };
  if (dict[t] && target === 'ko') return dict[t];
  if (target === 'ko') return text + ' (번역)';
  return text + ' (translated)';
}

// add a word (term) -> auto translate
async function addTerm(term){
  term = term.trim(); if (!term) return;
  // call translate (server) — fall back to an offline translator if server isn't available
  let meaning = '';
  if (!offlineMode){
    const res = await postJSON('/api/words/translate', { text: term, target: elements.targetLang.value });
    if (res && res.translated) meaning = res.translated;
    if (res && res.error) { /* server busy / offline */ offlineMode = true; setServerStatus(false); }
  }
  if (!meaning) meaning = translateOffline(term, elements.targetLang.value);
  draftList.push({ term, meaning, favorite: false });
  renderList();
}

function renderList(){
  elements.listWrap.innerHTML = '';
  draftList.forEach((w, idx)=>{
    const row = document.createElement('div'); row.className = 'list-item';
    const term = document.createElement('div'); term.textContent = w.term; term.style.width='130px'; term.style.fontWeight='700';
    const meaningInput = document.createElement('input'); meaningInput.value = w.meaning || '';
    meaningInput.addEventListener('input', e=>{ draftList[idx].meaning = e.target.value; });
    const fav = document.createElement('button'); fav.textContent = w.favorite ? '★' : '☆'; fav.title = '모르는 단어로 표시'; fav.addEventListener('click', ()=>{ draftList[idx].favorite = !draftList[idx].favorite; renderList(); });
    const del = document.createElement('button'); del.textContent = '삭제'; del.addEventListener('click', ()=>{ draftList.splice(idx,1); renderList(); });
    row.appendChild(term); row.appendChild(meaningInput); row.appendChild(fav); row.appendChild(del);
    elements.listWrap.appendChild(row);
  });
}

// enter handler for input
elements.wordInput.addEventListener('keydown', async (e)=>{
  if (e.key === 'Enter'){
    const val = e.target.value.trim();
    if (!val) return;
    await addTerm(val);
    e.target.value = '';
  }
});

elements.translateButton.addEventListener('click', async ()=>{
  const v = elements.wordInput.value.trim(); if (!v) return;
  if (!offlineMode){
    const res = await postJSON('/api/words/translate', { text: v, target: elements.targetLang.value });
    if (res && res.translated){ elements.wordInput.value = res.translated; return; }
    if (res && res.error) { offlineMode = true; setServerStatus(false); }
  }
  // fallback
  elements.wordInput.value = translateOffline(v, elements.targetLang.value);
});

// generate flashcards -> save to server
elements.generateBtn.addEventListener('click', async ()=>{
  if (!draftList.length) return alert('추가된 단어가 없습니다.');
  const payload = { listTitle: elements.listTitle.value || 'My list', words: draftList };

  if (!offlineMode){
    const res = await postJSON('/api/words/add', payload);
    if (res && res.saved){ showingCards = res.doc.words; showCardsView(showingCards, res.doc._id); return; }
    // fall through to local save
    offlineMode = true; setServerStatus(false);
  }

  // offline/local mode: save into localStorage lists
  const localLists = JSON.parse(localStorage.getItem('dannuhh_local_lists' )|| '[]');
  const id = 'local-'+Date.now();
  const doc = { _id: id, owner: username||null, listTitle: payload.listTitle, words: payload.words.map(w=>({term:w.term, meaning:w.meaning, favorite:!!w.favorite})), createdAt: Date.now() };
  localLists.unshift(doc);
  localStorage.setItem('dannuhh_local_lists', JSON.stringify(localLists));
  showingCards = doc.words; showCardsView(showingCards, doc._id);
});

function showCardsView(words, listId){
  elements.cardsPanel.style.display = 'block';
  document.querySelector('main').scrollTo({ top: 0, behavior: 'smooth' });
  elements.cardContainer.innerHTML = '';
  words.forEach((w, idx)=>{
    const card = buildCard(w, idx, listId);
    elements.cardContainer.appendChild(card);
  });
  document.querySelector('#cardsPanel').scrollIntoView({behavior:'smooth'});
}

function buildCard(word, idx, listId){
  const wrap = document.createElement('div'); wrap.className = 'card'; wrap.dataset.index = idx;
  const inner = document.createElement('div'); inner.className = 'card-inner';
  const front = document.createElement('div'); front.className = 'card-face front'; front.innerHTML = `<div><strong>${escapeHtml(word.term)}</strong></div>`;
  const back = document.createElement('div'); back.className = 'card-face back'; back.innerHTML = `<div>${escapeHtml(word.meaning || '(no meaning)')}</div>`;
  inner.appendChild(front); inner.appendChild(back); wrap.appendChild(inner);

  wrap.addEventListener('click', ()=> wrap.classList.toggle('flipped'));
  // swipe behavior
  let sx=0; wrap.addEventListener('touchstart', (ev)=>{ sx = ev.touches[0].clientX; });
  wrap.addEventListener('touchend', (ev)=>{ const dx = ev.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40){
    // simple swipe: remove first card and push to end
    if (dx < 0) { // left
      if (wrap.parentNode.firstChild === wrap){ wrap.parentNode.appendChild(wrap); }
    } else { // right
      if (wrap.parentNode.lastChild === wrap){ wrap.parentNode.insertBefore(wrap, wrap.parentNode.firstChild); }
    }
  }});

  const toolbar = document.createElement('div'); toolbar.style.position='relative'; toolbar.style.top='8px';
  const fav = document.createElement('button'); fav.textContent = word.favorite ? '★' : '☆'; fav.addEventListener('click', async ()=>{
    // toggle favorite (server if available, otherwise update local lists)
    word.favorite = !word.favorite; fav.textContent = word.favorite ? '★' : '☆';
    if (!offlineMode && listId && String(listId).indexOf('local-') === -1){
      try{ const res = await postJSON(`/api/words/${listId}/toggle-favorite`, { index: idx }); if (res && res.ok) fav.textContent = res.favorite ? '★' : '☆'; }catch(e){ console.error(e); offlineMode = true; setServerStatus(false); }
    }
    // if local list, persist
    if (String(listId||'').startsWith('local-')){
      try{
        const localLists = JSON.parse(localStorage.getItem('dannuhh_local_lists')||'[]');
        const target = localLists.find(l=>l._id === listId);
        if (target && target.words && target.words[idx]){ target.words[idx].favorite = word.favorite; localStorage.setItem('dannuhh_local_lists', JSON.stringify(localLists)); }
      }catch(e){ /* ignore */ }
    }
  });
  toolbar.appendChild(fav);
  wrap.appendChild(toolbar);

  return wrap;
}

function escapeHtml(unsafe) { return (unsafe||'').replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]; }); }

// Show/hide editor and cards
elements.backToEditor.addEventListener('click', ()=>{ elements.cardsPanel.style.display='none'; elements.cardContainer.innerHTML=''; });

// flip all -> make all cards flipped
elements.flipAll.addEventListener('click', ()=>{
  flipDefaultBack = !flipDefaultBack;
  document.querySelectorAll('.card').forEach(c=>{ if (flipDefaultBack) c.classList.add('flipped'); else c.classList.remove('flipped'); });
});

// favorites filtering
elements.showFavoritesOnly.addEventListener('change', ()=>{
  const showFav = elements.showFavoritesOnly.checked;
  document.querySelectorAll('.card').forEach((c)=>{
    if (!showFav) c.style.display = 'block'; else {
      const idx = Number(c.dataset.index);
      const w = showingCards[idx];
      c.style.display = (w && w.favorite) ? 'block' : 'none';
    }
  });
});

// AUTH UI
elements.loginBtn.addEventListener('click', ()=>{ authMode='login'; elements.authTitle.textContent='로그인'; elements.authModal.style.display='flex'; elements.authMsg.textContent=''; });
elements.logoutBtn.addEventListener('click', ()=>{ token=null; username=null; localStorage.removeItem('dannuhh_token'); localStorage.removeItem('dannuhh_user'); setAuthUI(); });

elements.closeAuthModal.addEventListener('click', ()=>{ elements.authModal.style.display='none'; });

elements.toggleAuthMode.addEventListener('click', ()=>{ authMode = (authMode==='login')? 'register' : 'login'; elements.authTitle.textContent = authMode==='login'? '로그인': '회원가입'; elements.authMsg.textContent=''; });

elements.authSubmit.addEventListener('click', async ()=>{
  const user = elements.authUsername.value.trim();
  const pass = elements.authPassword.value;
  if (!user || !pass) { elements.authMsg.textContent = '모두 입력하세요.'; return; }
  // if offline, use the local user store
  if (offlineMode){
    const users = JSON.parse(localStorage.getItem('dannuhh_local_users')|| '{}');
    if (authMode === 'register'){
      if (users[user]) { elements.authMsg.textContent = '이미 등록된 사용자입니다.'; return; }
      users[user] = pass; localStorage.setItem('dannuhh_local_users', JSON.stringify(users));
      // immediate login after register
      token = 'local-'+Date.now(); username = user; localStorage.setItem('dannuhh_token', token); localStorage.setItem('dannuhh_user', username);
      setAuthUI(); elements.authModal.style.display='none'; elements.authPassword.value=''; elements.authUsername.value='';
      return;
    }
    // login mode
    if (!users[user] || users[user] !== pass){ elements.authMsg.textContent = '로그인 정보가 올바르지 않습니다.'; return; }
    token = 'local-'+Date.now(); username = user; localStorage.setItem('dannuhh_token', token); localStorage.setItem('dannuhh_user', username);
    setAuthUI(); elements.authModal.style.display='none'; elements.authPassword.value=''; elements.authUsername.value='';
    return;
  }

  // online path (normal server auth)
  try{
    const url = authMode==='login' ? '/api/auth/login' : '/api/auth/register';
    const res = await postJSON(url, { username: user, password: pass });
    if (res && res.token){
      token = res.token; username = res.user && res.user.username ? res.user.username : user;
      localStorage.setItem('dannuhh_token', token); localStorage.setItem('dannuhh_user', username);
      setAuthUI(); elements.authModal.style.display='none'; elements.authPassword.value=''; elements.authUsername.value='';
    } else if (res && res.error){ elements.authMsg.textContent = res.error; }
    else { elements.authMsg.textContent = '서버 오류'; }
  }catch(err){ console.error(err); elements.authMsg.textContent = '네트워크 오류'; }
});

setAuthUI();

// small demo: load last created sets
async function loadMyLists(){
  try{
    if (!offlineMode){
      const res = await getJSON('/api/words');
      if (res && res.docs && res.docs.length){
        const first = res.docs[0]; draftList = first.words.map(w=>({term:w.term, meaning: w.meaning, favorite: w.favorite}));
        elements.listTitle.value = first.listTitle || '';
        renderList();
        return;
      }
    }
    // fallback — load local lists if available
    const localLists = JSON.parse(localStorage.getItem('dannuhh_local_lists') || '[]');
    if (localLists && localLists.length){
      const first = localLists[0]; draftList = first.words.map(w=>({term:w.term, meaning:w.meaning, favorite: w.favorite}));
      elements.listTitle.value = first.listTitle || '';
      renderList();
    }
  }catch(e){ /* ignore */ }
}
loadMyLists();

// small utility to prefill some words for quick testing
if (!localStorage.getItem('demoPopulated')){
  draftList = [{term:'apple', meaning:'사과'}, {term:'book', meaning:'책'}]; renderList(); localStorage.setItem('demoPopulated','1');
}
