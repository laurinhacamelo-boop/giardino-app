// ═══════════════════════════════════
// GIARDINO APP - Frontend JS
// ═══════════════════════════════════

const API = '';
let TOKEN = localStorage.getItem('g_token');
let ME = null;
let currentTab = 'fichas';

// Data cache
let fichas = [], insumos = [], transformados = [], obsMap = {};
let viewingFicha = null;
let editingId = null;
let currentPhoto = null;

// ── UTILS ─────────────────────────
const BRL = v => v != null ? 'R$ ' + Number(v).toFixed(2).replace('.', ',') : '—';
const PCT = v => v != null ? Number(v).toFixed(1) + '%' : '—';
function norm(s) { return String(s || '').toLowerCase().trim(); }
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 2500);
}
function togglePass(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

const CAT_COLORS = {
  'ENTRADAS':'#7b3f1e','PORÇÕES':'#b85c00','PRINCIPAL':'#1a3a2a',
  'SOBREMESA':'#6b2d8b','PIZZAS':'#b52525','TRANSFORMADOS':'#1a4a6b',
  'CAFÉ':'#5c3310','DRINKS':'#0f6b5c','DOSES':'#8b4a00',
  'SODAS E SUCOS':'#1a6b2a','EXECUTIVO E PF':'#2c3e50','COMBOS':'#5b2d8b',
};

const ALERG = {
  'glúten':{e:'🌾',w:['trigo','farinha','massa','pão','baguete','macarrão','penne','espaguete','nhoque']},
  'lactose':{e:'🥛',w:['leite','queijo','manteiga','creme','iogurte','mussarela','parmesão','gorgonzola','ricota','nata','requeijão','burrata']},
  'ovos':{e:'🥚',w:['ovo','ovos','gema','clara','maionese']},
  'frutos do mar':{e:'🦐',w:['camarão','salmão','tilápia','bacalhau','peixe','marisco','ostra','lula','polvo']},
  'castanhas':{e:'🌰',w:['amendoim','castanha','nozes','amêndoa','avelã','pistache']},
};
function detectAlerg(ins) {
  const text = (ins || []).map(i => i.nome.toLowerCase()).join(' ');
  return Object.entries(ALERG).filter(([,v]) => v.w.some(w => text.includes(w))).map(([n,v]) => ({n, e: v.e}));
}
function getCMVInfo(pct) {
  if (pct == null) return { cls: '', color: '#999', label: '—' };
  if (pct <= 30) return { cls: 'cg', color: '#28a745', label: '✓ OK' };
  if (pct <= 45) return { cls: 'cy', color: '#e6a817', label: '⚠' };
  return { cls: 'cr', color: '#dc3545', label: '✗ Alto' };
}

// ── API FETCH ─────────────────────
async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

// ── AUTH ──────────────────────────
async function checkSetup() {
  const r = await fetch('/api/auth/setup').then(r => r.json());
  if (r.required) {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('setupCard').style.display = 'block';
  }
}
async function doLogin() {
  const btn = document.getElementById('loginBtn');
  btn.textContent = '...'; btn.disabled = true;
  const r = await api('/api/auth/login', 'POST', {
    username: document.getElementById('loginUser').value.trim(),
    password: document.getElementById('loginPass').value
  });
  btn.textContent = 'Entrar'; btn.disabled = false;
  if (r && r.token) {
    TOKEN = r.token; ME = r.user;
    localStorage.setItem('g_token', TOKEN);
    startApp();
  } else {
    document.getElementById('loginErr').textContent = r?.error || 'Erro ao entrar';
  }
}
async function doSetup() {
  const r = await api('/api/auth/setup', 'POST', {
    nome: document.getElementById('setupNome').value.trim(),
    username: document.getElementById('setupUser').value.trim(),
    password: document.getElementById('setupPass').value
  });
  if (r && r.token) {
    TOKEN = r.token; ME = r.user;
    localStorage.setItem('g_token', TOKEN);
    startApp();
  } else {
    document.getElementById('setupErr').textContent = r?.error || 'Erro';
  }
}
function logout() {
  TOKEN = null; ME = null;
  localStorage.removeItem('g_token');
  document.getElementById('loginScreen').classList.add('active');
  document.getElementById('appScreen').classList.remove('active');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginErr').textContent = '';
  checkSetup();
}

// ── APP START ─────────────────────
async function startApp() {
  document.getElementById('loginScreen').classList.remove('active');
  document.getElementById('appScreen').classList.add('active');
  document.getElementById('sidebarUser').textContent = (ME?.nome || ME?.username || '') + (ME?.role === 'admin' ? ' · Admin' : '');
  if (ME?.role === 'admin') document.getElementById('usersNavBtn').style.display = 'flex';
  await loadAll();
  goTab('fichas');
}
async function loadAll() {
  [fichas, insumos, transformados] = await Promise.all([
    api('/api/fichas'), api('/api/insumos'), api('/api/transformados')
  ]);
  fichas = fichas || []; insumos = insumos || []; transformados = transformados || [];
  const obsArr = await api('/api/obs');
  obsMap = {};
  (obsArr || []).forEach(o => { obsMap[o.ficha_id] = o; obsMap[o.fichaId] = o; });
  // Populate category filters
  populateCatFilters();
  // Update badges
  document.getElementById('snav-fichas').textContent = fichas.length;
  document.getElementById('snav-insumos').textContent = insumos.length;
  document.getElementById('snav-transformados').textContent = transformados.length;
}
function populateCatFilters() {
  const cats = [...new Set(fichas.map(f => f.categoria).filter(Boolean))].sort();
  const sel = document.getElementById('cat-fichas');
  sel.innerHTML = '<option value="">Todas</option>' + cats.map(c => `<option>${c}</option>`).join('');
  const icats = [...new Set(insumos.map(i => i.categoria).filter(Boolean))].sort();
  const isel = document.getElementById('cat-ins');
  isel.innerHTML = '<option value="">Todas</option>' + icats.map(c => `<option>${c}</option>`).join('');
}

// ── NAVIGATION ───────────────────
const TAB_TITLES = { fichas: 'Fichas Técnicas', transformados: 'Transformados', insumos: 'Insumos', dashboard: 'Dashboard', users: 'Usuários' };
function goTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.snav, .bnav').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.getElementById('page-' + tab).classList.add('active');
  document.getElementById('topbarTtl').textContent = TAB_TITLES[tab] || tab;
  const canEdit = ME?.role !== 'viewer';
  document.getElementById('topbarAction').style.display = (tab === 'dashboard' || !canEdit) ? 'none' : 'flex';
  closeSidebar();
  if (tab === 'fichas') renderFichas();
  else if (tab === 'transformados') renderTransf();
  else if (tab === 'insumos') renderInsumos();
  else if (tab === 'dashboard') renderDash();
  else if (tab === 'users') renderUsers();
}
function topbarActionFn() {
  if (currentTab === 'fichas') openNewFicha();
  else if (currentTab === 'transformados') openNewTransf();
  else if (currentTab === 'insumos') openNewInsumo();
  else if (currentTab === 'users') openNewUser();
}

// ── SIDEBAR ───────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ── MODALS ───────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ════════════════════════════════════
// FICHAS
// ════════════════════════════════════
function renderFichas() {
  const srch = norm(document.getElementById('srch-fichas').value);
  const cat = document.getElementById('cat-fichas').value;
  const sort = document.getElementById('sort-fichas').value;
  let arr = fichas.filter(f => {
    const cOk = !cat || f.categoria === cat;
    const sOk = !srch || norm(f.produto).includes(srch) || (f.insumos || []).some(i => norm(i.nome).includes(srch));
    return cOk && sOk;
  }).sort((a, b) => {
    if (sort === 'nome') return norm(a.produto).localeCompare(norm(b.produto));
    if (sort === 'cmv_a') return (a.cmv_loja_pct || 999) - (b.cmv_loja_pct || 999);
    if (sort === 'cmv_d') return (b.cmv_loja_pct || 0) - (a.cmv_loja_pct || 0);
    if (sort === 'margem_d') return (b.margem_loja || 0) - (a.margem_loja || 0);
    return 0;
  });
  document.getElementById('cnt-fichas').textContent = `${arr.length} de ${fichas.length} fichas`;
  const grid = document.getElementById('fichas-grid');
  if (!arr.length) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔍</div>Nenhuma ficha encontrada</div>'; return; }
  grid.innerHTML = arr.map(f => renderCard(f)).join('');
}

function renderCard(f) {
  const cor = CAT_COLORS[f.categoria] || '#1a3a2a';
  const obs = obsMap[f.id] || obsMap[f._id] || {};
  const hp = obs.photo;
  const alerg = detectAlerg(f.insumos);
  const cmv = getCMVInfo(f.cmv_loja_pct);
  return `<div class="card" onclick="viewFicha('${f._id || f.id}')">
    <div class="card-hdr" style="background:${cor}">
      <span class="cat-badge">${f.categoria}</span>
      <span class="card-name">${f.produto}</span>
      ${f.cmv_loja_pct != null ? `<div class="cmv-dot" style="background:${cmv.color}"></div>` : ''}
    </div>
    <div class="card-photo">
      ${hp ? `<img src="${hp}" alt="${f.produto}">` : `<div class="photo-ph-sm">📸</div>`}
    </div>
    <div class="card-body">
      ${f.preco_loja || f.cmv_loja_pct != null ? `<div class="fin-mini">
        ${f.preco_loja ? `<div class="fin-item"><div class="fi-lbl">Preço</div><div class="fi-val">${BRL(f.preco_loja)}</div></div>` : ''}
        ${f.cmv_loja_pct != null ? `<div class="fin-item"><div class="fi-lbl">CMV</div><div class="fi-val" style="color:${cmv.color}">${PCT(f.cmv_loja_pct)}</div></div>` : ''}
        ${f.margem_loja ? `<div class="fin-item"><div class="fi-lbl">Margem</div><div class="fi-val green">${BRL(f.margem_loja)}</div></div>` : ''}
      </div>` : ''}
    </div>
    <div class="card-foot">
      <div>
        <div class="cost-lbl">Custo/porção</div>
        <div class="cost-val" style="color:${cor}">${BRL(f.custo_porcao)}</div>
      </div>
      ${f.cmv_loja_pct != null ? `<span class="cmv-pill ${cmv.cls}">${PCT(f.cmv_loja_pct)}</span>` : ''}
    </div>
  </div>`;
}

// ── VIEW FICHA (read-only) ─────────
function viewFicha(id) {
  const f = fichas.find(x => x._id === id || String(x.id) === String(id));
  if (!f) return;
  viewingFicha = f;
  const cor = CAT_COLORS[f.categoria] || '#1a3a2a';
  const obs = obsMap[f.id] || obsMap[f._id] || {};
  const hp = obs.photo;
  const obsText = obs.obs || '';
  const alerg = detectAlerg(f.insumos);
  const cmv = getCMVInfo(f.cmv_loja_pct);
  const rend = f.rendimento && f.rendimento !== '-' ? `Rend. ${f.rendimento}${f.unidade && f.unidade !== 'None' ? ' ' + f.unidade : ''}` : null;

  document.getElementById('view-hdr').style.background = cor;
  document.getElementById('view-ttl').textContent = f.produto;

  const insumoRows = (f.insumos || []).map(i => `<tr>
    <td>${i.nome}</td>
    <td>${i.qtd}</td>
    <td>${i.unid}</td>
    <td>${i.med_caseira || ''}</td>
  </tr>`).join('');

  const prepSteps = (f.modo_preparo || []).map((p, i) => `
    <div class="step-row">
      <div class="step-n">${i+1}</div>
      <div>${p}</div>
    </div>`).join('');

  document.getElementById('view-body').innerHTML = `
    ${hp ? `<div class="view-photo"><img src="${hp}" alt="${f.produto}"></div>` : ''}
    <div class="view-hero">
      <div class="view-hero-name">${f.produto}</div>
      <div class="view-chips">
        <span class="view-chip" style="background:${cor};color:#fff">${f.categoria}</span>
        ${f.num_porcoes && f.num_porcoes !== '-' ? `<span class="view-chip">${f.num_porcoes} porção(ões)</span>` : ''}
        ${rend ? `<span class="view-chip">${rend}</span>` : ''}
        ${alerg.map(a => `<span class="view-chip">${a.e} ${a.n}</span>`).join('')}
      </div>
      ${f.preco_loja || f.custo_porcao || f.cmv_loja_pct != null ? `<div class="view-fin">
        ${f.preco_loja ? `<div class="view-fin-item"><div class="vfi-lbl">Preço Loja</div><div class="vfi-val">${BRL(f.preco_loja)}</div></div>` : ''}
        ${f.custo_porcao ? `<div class="view-fin-item"><div class="vfi-lbl">Custo</div><div class="vfi-val">${BRL(f.custo_porcao)}</div></div>` : ''}
        ${f.margem_loja ? `<div class="view-fin-item"><div class="vfi-lbl">Margem Contrib.</div><div class="vfi-val green">${BRL(f.margem_loja)}</div></div>` : ''}
        ${f.cmv_loja_pct != null ? `<div class="view-fin-item"><div class="vfi-lbl">CMV Loja</div><div class="vfi-val" style="color:${cmv.color}">${PCT(f.cmv_loja_pct)}</div></div>` : ''}
        ${f.preco_ifood ? `<div class="view-fin-item"><div class="vfi-lbl">Preço iFood</div><div class="vfi-val">${BRL(f.preco_ifood)}</div></div>` : ''}
        ${f.margem_ifood ? `<div class="view-fin-item"><div class="vfi-lbl">Margem iFood</div><div class="vfi-val green">${BRL(f.margem_ifood)}</div></div>` : ''}
      </div>` : ''}
      ${(f.insumos || []).length > 0 ? `<div class="view-section">
        <div class="view-sec-ttl">🧂 Ingredientes</div>
        <table class="ins-tbl">
          <thead><tr><th>Insumo</th><th>Qtd</th><th>Unid</th><th>Med.</th></tr></thead>
          <tbody>${insumoRows}</tbody>
        </table>
      </div>` : ''}
      ${(f.mise_en_place || []).length > 0 ? `<div class="view-section">
        <div class="view-sec-ttl">⚙️ Mise en Place</div>
        <div class="alerg-row">${f.mise_en_place.map(m => `<span class="alerg-tag">${m}</span>`).join('')}</div>
      </div>` : ''}
      ${(f.modo_preparo || []).length > 0 ? `<div class="view-section">
        <div class="view-sec-ttl">👨‍🍳 Modo de Preparo</div>
        ${prepSteps}
      </div>` : ''}
      ${obsText ? `<div class="view-section">
        <div class="view-sec-ttl">📝 Observações</div>
        <div style="font-size:13px;color:#444;background:#fafaf8;border-radius:7px;padding:10px;border:1px solid #e0d8c8;">${obsText}</div>
      </div>` : ''}
      ${ME?.role !== 'viewer' ? `<div style="display:flex;gap:8px;margin-top:14px;">
        <button class="btn-primary flex1" onclick="openEditFicha('${f._id || f.id}')">✏️ Editar</button>
        <button class="btn-primary" style="background:#dc3545;" onclick="deleteFicha('${f._id || f.id}')">🗑</button>
      </div>` : ''}
    </div>`;
  openModal('ov-view');
}

// ── NEW / EDIT FICHA ──────────────
function openNewFicha() {
  editingId = null; currentPhoto = null;
  clearFichaForm();
  document.getElementById('ficha-modal-ttl').textContent = 'Nova Ficha';
  document.getElementById('ficha-modal-hdr').style.background = '#1a3a2a';
  addIngRow(); addIngRow(); addIngRow();
  addPrepRow(); addPrepRow();
  openModal('ov-ficha');
}
function openEditFicha(id) {
  const f = fichas.find(x => x._id === id || String(x.id) === String(id));
  if (!f) return;
  editingId = f._id || f.id;
  clearFichaForm();
  const cor = CAT_COLORS[f.categoria] || '#1a3a2a';
  document.getElementById('ficha-modal-hdr').style.background = cor;
  document.getElementById('ficha-modal-ttl').textContent = 'Editar Ficha';
  document.getElementById('ff-nome').value = f.produto || '';
  document.getElementById('ff-cat').value = f.categoria || '';
  document.getElementById('ff-porcoes').value = f.num_porcoes || '1';
  document.getElementById('ff-rend').value = f.rendimento || '';
  document.getElementById('ff-unid').value = (f.unidade && f.unidade !== 'None') ? f.unidade : '';
  document.getElementById('ff-preco').value = f.preco_loja || '';
  document.getElementById('ff-preco-if').value = f.preco_ifood || '';
  const obs = obsMap[f.id] || obsMap[f._id] || {};
  document.getElementById('ff-obs').value = obs.obs || '';
  if (obs.photo) {
    currentPhoto = obs.photo;
    document.getElementById('photo-preview').src = obs.photo;
    document.getElementById('photo-preview').style.display = 'block';
    document.getElementById('photo-placeholder').style.display = 'none';
  }
  (f.insumos || []).forEach(i => addIngRow(i.nome, i.qtd, i.unid));
  if (!(f.insumos || []).length) { addIngRow(); addIngRow(); }
  (f.modo_preparo || []).forEach(p => addPrepRow(p));
  if (!(f.modo_preparo || []).length) addPrepRow();
  calcCustoFicha();
  closeModal('ov-view');
  openModal('ov-ficha');
}
function clearFichaForm() {
  ['ff-nome','ff-cat','ff-porcoes','ff-rend','ff-unid','ff-preco','ff-preco-if','ff-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.tagName === 'SELECT' ? '' : '';
  });
  document.getElementById('ff-porcoes').value = '1';
  document.getElementById('ing-rows').innerHTML = '';
  document.getElementById('prep-rows').innerHTML = '';
  document.getElementById('custo-preview').style.display = 'none';
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-placeholder').style.display = 'flex';
  currentPhoto = null;
}

function addIngRow(nome='', qtd='', unid='') {
  const container = document.getElementById('ing-rows');
  const idx = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'ing-row';
  div.innerHTML = `
    <div class="autocomplete-wrap">
      <input placeholder="Insumo / Transformado..." value="${nome}" data-custo="" oninput="calcCustoFicha()">
    </div>
    <input type="number" step="0.01" placeholder="Qtd" value="${qtd}" oninput="calcCustoFicha()">
    <input placeholder="Unid" value="${unid}">
    <button class="rm-btn" onclick="this.closest('.ing-row').remove();calcCustoFicha()">✕</button>`;
  const nameInp = div.querySelector('input');
  buildAC(nameInp, (m) => {
    const inputs = div.querySelectorAll('input');
    if (!inputs[2].value) inputs[2].value = m.unid || '';
    nameInp.dataset.custo = m.custo_unit || '';
    calcCustoFicha();
  });
  container.appendChild(div);
}

function addPrepRow(txt='') {
  const container = document.getElementById('prep-rows');
  const num = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'prep-row';
  div.innerHTML = `<div class="prep-num">${num}</div>
    <input placeholder="Passo ${num}..." value="${txt}">
    <button class="rm-btn" onclick="this.closest('.prep-row').remove();renumberPrep()">✕</button>`;
  container.appendChild(div);
}
function renumberPrep() {
  document.querySelectorAll('.prep-row').forEach((r, i) => {
    r.querySelector('.prep-num').textContent = i + 1;
    r.querySelector('input').placeholder = `Passo ${i+1}...`;
  });
}

function calcCustoFicha() {
  const rows = document.getElementById('ing-rows').querySelectorAll('.ing-row');
  let total = 0;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const qtd = parseFloat(inputs[1].value) || 0;
    const c = parseFloat(inputs[0].dataset.custo) || 0;
    if (c > 0 && qtd > 0) total += qtd * c;
  });
  const preco = parseFloat(document.getElementById('ff-preco').value) || 0;
  const prev = document.getElementById('custo-preview');
  if (total > 0 || preco > 0) {
    prev.style.display = 'flex';
    document.getElementById('cp-custo').textContent = total > 0 ? BRL(total) : '—';
    document.getElementById('cp-preco').textContent = preco > 0 ? BRL(preco) : '—';
    const margem = preco > 0 && total > 0 ? preco - total : null;
    const cmvPct = preco > 0 && total > 0 ? (total / preco * 100) : null;
    document.getElementById('cp-margem').textContent = margem != null ? BRL(margem) : '—';
    const cmvEl = document.getElementById('cp-cmv');
    cmvEl.textContent = cmvPct != null ? PCT(cmvPct) : '—';
    cmvEl.className = 'cp-val ' + (cmvPct != null ? (cmvPct <= 30 ? 'green' : cmvPct <= 45 ? 'yellow' : 'red') : '');
  } else prev.style.display = 'none';
}

async function saveFicha() {
  const nome = document.getElementById('ff-nome').value.trim();
  const cat = document.getElementById('ff-cat').value;
  if (!nome || !cat) { toast('Preencha nome e categoria', 'error'); return; }
  const rows = document.getElementById('ing-rows').querySelectorAll('.ing-row');
  const ingredientes = []; let custoTotal = 0;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const n = inputs[0].value.trim();
    const q = inputs[1].value.trim();
    const u = inputs[2].value.trim();
    const c = parseFloat(inputs[0].dataset.custo) || 0;
    if (n && q) { ingredientes.push({ nome: n, qtd: q, unid: u || 'un', med_caseira: '' }); if (c > 0) custoTotal += c * (parseFloat(q) || 0); }
  });
  const prepInputs = document.querySelectorAll('.prep-row input');
  const preparo = [...prepInputs].map(i => i.value.trim()).filter(Boolean);
  const preco = parseFloat(document.getElementById('ff-preco').value) || null;
  const precoIf = parseFloat(document.getElementById('ff-preco-if').value) || null;
  const cmvPct = preco && custoTotal ? Math.round(custoTotal / preco * 1000) / 10 : null;
  const margem = preco && custoTotal ? Math.round((preco - custoTotal) * 100) / 100 : null;
  const payload = {
    produto: nome, categoria: cat,
    rendimento: document.getElementById('ff-rend').value || '1',
    unidade: document.getElementById('ff-unid').value || '',
    num_porcoes: document.getElementById('ff-porcoes').value || '1',
    custo_porcao: custoTotal ? Math.round(custoTotal * 100) / 100 : null,
    preco_loja: preco, preco_ifood: precoIf,
    cmv_loja_pct: cmvPct, margem_loja: margem,
    insumos: ingredientes, modo_preparo: preparo, mise_en_place: []
  };
  let result;
  if (editingId) {
    await api(`/api/fichas?id=${editingId}`, 'PUT', payload);
    result = { _id: editingId, ...payload };
  } else {
    result = await api('/api/fichas', 'POST', payload);
  }
  // Save obs and photo
  const obsText = document.getElementById('ff-obs').value;
  if (obsText || currentPhoto) {
    const fichaId = result?._id || editingId;
    await api('/api/obs', 'POST', { ficha_id: fichaId, obs: obsText, photo: currentPhoto || '' });
  }
  toast('Ficha salva! ✅', 'success');
  closeModal('ov-ficha');
  await loadAll();
  renderFichas();
}

async function deleteFicha(id) {
  if (!confirm('Remover esta ficha?')) return;
  await api(`/api/fichas?id=${id}`, 'DELETE');
  toast('Ficha removida', '');
  closeModal('ov-view');
  await loadAll();
  renderFichas();
}

function handlePhotoUpload(event) {
  const file = event.target.files[0]; if (!file) return;
  const img = new Image(); const reader = new FileReader();
  reader.onload = e => {
    img.onload = () => {
      const c = document.createElement('canvas'); const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) { if (w > h) { h = h*MAX/w; w = MAX; } else { w = w*MAX/h; h = MAX; } }
      c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
      currentPhoto = c.toDataURL('image/jpeg', 0.82);
      document.getElementById('photo-preview').src = currentPhoto;
      document.getElementById('photo-preview').style.display = 'block';
      document.getElementById('photo-placeholder').style.display = 'none';
    }; img.src = e.target.result;
  }; reader.readAsDataURL(file);
}

// ── PRINT ─────────────────────────
function printCurrentFicha() {
  if (!viewingFicha) return;
  const f = viewingFicha;
  const cor = CAT_COLORS[f.categoria] || '#1a3a2a';
  const obs = obsMap[f.id] || obsMap[f._id] || {};
  const hp = obs.photo; const obsText = obs.obs || '';
  const cmv = getCMVInfo(f.cmv_loja_pct);
  const rend = f.rendimento && f.rendimento !== '-' ? `Rend. ${f.rendimento}${f.unidade && f.unidade !== 'None' ? ' ' + f.unidade : ''}` : '';
  const insumoRows = (f.insumos || []).map(i => `<tr>
    <td style="padding:3px 5px;border-bottom:1px solid #f0ece4;font-size:11px;">${i.nome}</td>
    <td style="padding:3px 5px;border-bottom:1px solid #f0ece4;font-size:11px;text-align:center;font-weight:700;color:#2e5e42;">${i.qtd}</td>
    <td style="padding:3px 5px;border-bottom:1px solid #f0ece4;font-size:11px;text-align:center;color:#666;">${i.unid}</td>
    <td style="padding:3px 5px;border-bottom:1px solid #f0ece4;font-size:10px;color:#999;font-style:italic;">${i.med_caseira}</td>
  </tr>`).join('');
  const prepSteps = (f.modo_preparo || []).map((p, i) => `
    <div style="display:flex;gap:6px;align-items:flex-start;padding:4px 0;font-size:11px;line-height:1.4;border-bottom:1px dashed #e8e0d0;">
      <span style="background:${cor};color:#f9f5ec;border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;">${i+1}</span>
      <span>${p}</span></div>`).join('');
  const page = `<div class="print-page" style="font-family:sans-serif;width:190mm;">
    <div style="background:${cor};color:#f9f5ec;padding:10px 14px;border-radius:7px 7px 0 0;display:flex;align-items:center;">
      <div><div style="font-size:8px;letter-spacing:.22em;text-transform:uppercase;opacity:.6;">Giardino · 2026</div>
      <div style="font-size:9px;opacity:.7;margin-top:1px;">${f.categoria}</div></div>
      <div style="flex:1;"></div>
      ${f.cmv_loja_pct != null ? `<div style="background:rgba(255,255,255,.15);padding:4px 9px;border-radius:5px;text-align:center;margin-right:8px;"><div style="font-size:7px;opacity:.7;text-transform:uppercase;">CMV</div><div style="font-size:14px;font-weight:700;color:${cmv.color};">${PCT(f.cmv_loja_pct)}</div></div>` : ''}
      ${f.preco_loja ? `<div style="background:rgba(255,255,255,.15);padding:4px 9px;border-radius:5px;text-align:center;"><div style="font-size:7px;opacity:.7;text-transform:uppercase;">Preço</div><div style="font-size:14px;font-weight:700;">${BRL(f.preco_loja)}</div></div>` : ''}
    </div>
    <div style="background:#fff;padding:8px 14px;border-left:4px solid ${cor};border-right:4px solid ${cor};">
      <div style="font-size:22px;font-weight:700;color:#111;">${f.produto}</div>
      <div style="font-size:10px;color:#666;margin-top:2px;">${[f.num_porcoes && f.num_porcoes !== '-' ? `Porções: ${f.num_porcoes}` : '', rend].filter(Boolean).join(' · ')}</div>
    </div>
    <div style="background:#fff;border-left:4px solid ${cor};border-right:4px solid ${cor};padding:10px 14px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div>
        ${(f.insumos||[]).length ? `<div style="font-size:8px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#c9a227;margin-bottom:5px;border-bottom:1px solid #e0d8c8;padding-bottom:2px;">Ingredientes</div>
        <table style="width:100%;border-collapse:collapse;"><thead><tr style="color:#888;"><th style="text-align:left;padding:2px 5px;border-bottom:2px solid ${cor};font-size:8px;">INSUMO</th><th style="padding:2px;border-bottom:2px solid ${cor};font-size:8px;text-align:center;">QTD</th><th style="padding:2px;border-bottom:2px solid ${cor};font-size:8px;text-align:center;">UN</th><th style="padding:2px;border-bottom:2px solid ${cor};font-size:8px;">MED.</th></tr></thead><tbody>${insumoRows}</tbody></table>` : ''}
        ${f.preco_loja || f.custo_porcao ? `<div style="margin-top:10px;background:#f9f5ec;border-radius:5px;padding:7px 9px;border:1px solid #e0d8c8;font-size:11px;">
          ${f.preco_loja ? `<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:#666;">Preço</span><strong>${BRL(f.preco_loja)}</strong></div>` : ''}
          ${f.custo_porcao ? `<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:#666;">Custo</span><strong>${BRL(f.custo_porcao)}</strong></div>` : ''}
          ${f.margem_loja ? `<div style="display:flex;justify-content:space-between;padding:2px 0;"><span style="color:#666;">Margem</span><strong style="color:#28a745;">${BRL(f.margem_loja)}</strong></div>` : ''}
        </div>` : ''}
        ${obsText ? `<div style="margin-top:8px;font-size:11px;background:#fdfaf4;border:1px solid #e0d8c8;border-radius:4px;padding:5px 8px;color:#444;">${obsText}</div>` : ''}
      </div>
      <div>
        <div style="border:2px ${hp ? 'solid #d6cbb8' : 'dashed #d6cbb8'};border-radius:7px;height:145px;overflow:hidden;margin-bottom:10px;display:flex;align-items:center;justify-content:center;background:#f9f5ec;">
          ${hp ? `<img src="${hp}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="text-align:center;color:#ccc;font-size:28px;">📷</div>`}
        </div>
        ${(f.modo_preparo||[]).length ? `<div style="font-size:8px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#c9a227;margin-bottom:5px;border-bottom:1px solid #e0d8c8;padding-bottom:2px;">Modo de Preparo</div>${prepSteps}` : ''}
      </div>
    </div>
    <div style="background:${cor};color:rgba(255,255,255,.5);padding:4px 14px;border-radius:0 0 7px 7px;font-size:8px;display:flex;justify-content:space-between;">
      <span>GIARDINO</span><span>${f.categoria}</span><span>FICHA TÉCNICA – USO INTERNO</span>
    </div>
  </div>`;
  document.getElementById('printArea').innerHTML = page;
  document.getElementById('printArea').style.display = 'block';
  window.print();
  document.getElementById('printArea').style.display = 'none';
}

// ════════════════════════════════════
// TRANSFORMADOS
// ════════════════════════════════════
function renderTransf() {
  const srch = norm(document.getElementById('srch-transf').value);
  let arr = transformados.filter(t => !srch || norm(t.produto).includes(srch));
  document.getElementById('cnt-transf').textContent = `${arr.length} transformado(s)`;
  document.getElementById('snav-transformados').textContent = transformados.length;
  const container = document.getElementById('transf-list');
  if (!arr.length) { container.innerHTML = '<div class="empty"><div class="empty-icon">⚗️</div>Nenhum transformado</div>'; return; }
  container.innerHTML = arr.map(t => {
    const custUnit = t.custo_unit_calc || (t.custo_porcao && t.rendimento ? t.custo_porcao / parseFloat(t.rendimento) : null);
    return `<div class="list-item">
      <div class="li-hdr" style="background:#1a4a6b">
        <span class="li-nome">${t.produto}</span>
        ${t._custom || !t._seeded ? '<span class="li-badge">NOVO</span>' : ''}
      </div>
      <div class="li-body">
        <div class="li-stat"><div class="ls-lbl">Rendimento</div><div class="ls-val">${t.rendimento || '—'} ${t.unidade || ''}</div></div>
        <div class="li-stat"><div class="ls-lbl">Custo Total</div><div class="ls-val">${BRL(t.custo_porcao)}</div></div>
        <div class="li-stat"><div class="ls-lbl">Custo/Unid</div><div class="ls-val">${custUnit ? BRL(custUnit) : '—'}</div></div>
        <div class="li-stat"><div class="ls-lbl">Insumos</div><div class="ls-val">${(t.insumos || []).length}</div></div>
      </div>
      ${ME?.role !== 'viewer' ? `<div class="li-actions">
        <button class="act-btn del" onclick="deleteTransf('${t._id}')">🗑 Remover</button>
      </div>` : ''}
    </div>`;
  }).join('');
}

function openNewTransf() {
  document.getElementById('tf-nome').value = '';
  document.getElementById('tf-rend').value = '';
  document.getElementById('tf-unid').value = 'kg';
  document.getElementById('tf-obs').value = '';
  document.getElementById('transf-ing-rows').innerHTML = '';
  document.getElementById('transf-preview').style.display = 'none';
  addTransfRow(); addTransfRow(); addTransfRow();
  openModal('ov-transf');
}

function addTransfRow(nome='', qtd='', unid='') {
  const container = document.getElementById('transf-ing-rows');
  const div = document.createElement('div');
  div.className = 'ing-row';
  div.innerHTML = `
    <div class="autocomplete-wrap">
      <input placeholder="Insumo..." value="${nome}" data-custo="" oninput="calcTransfCusto()">
    </div>
    <input type="number" step="0.01" placeholder="Qtd" value="${qtd}" oninput="calcTransfCusto()">
    <input placeholder="Unid" value="${unid}">
    <button class="rm-btn" onclick="this.closest('.ing-row').remove();calcTransfCusto()">✕</button>`;
  const nameInp = div.querySelector('input');
  buildAC(nameInp, (m) => {
    const inputs = div.querySelectorAll('input');
    if (!inputs[2].value) inputs[2].value = m.unid || '';
    nameInp.dataset.custo = m.custo_unit || '';
    calcTransfCusto();
  });
  container.appendChild(div);
}

function calcTransfCusto() {
  const rows = document.getElementById('transf-ing-rows').querySelectorAll('.ing-row');
  let total = 0;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const qtd = parseFloat(inputs[1].value) || 0;
    const c = parseFloat(inputs[0].dataset.custo) || 0;
    if (c > 0 && qtd > 0) total += qtd * c;
  });
  const rend = parseFloat(document.getElementById('tf-rend').value) || 0;
  const unid = document.getElementById('tf-unid').value || 'un';
  const prev = document.getElementById('transf-preview');
  if (total > 0) {
    prev.style.display = 'flex';
    document.getElementById('tcp-total').textContent = BRL(total);
    document.getElementById('tcp-unit').textContent = rend ? BRL(total / rend) + '/' + unid : '—';
  } else prev.style.display = 'none';
}

async function saveTransf() {
  const nome = document.getElementById('tf-nome').value.trim();
  if (!nome) { toast('Preencha o nome', 'error'); return; }
  const rows = document.getElementById('transf-ing-rows').querySelectorAll('.ing-row');
  const ingredientes = []; let custoTotal = 0;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const n = inputs[0].value.trim(); const q = inputs[1].value.trim(); const u = inputs[2].value.trim();
    const c = parseFloat(inputs[0].dataset.custo) || 0;
    if (n && q) { ingredientes.push({ nome: n, qtd: q, unid: u || 'un', med_caseira: '' }); if (c > 0) custoTotal += c * (parseFloat(q) || 0); }
  });
  const rend = parseFloat(document.getElementById('tf-rend').value) || 1;
  const unid = document.getElementById('tf-unid').value || 'kg';
  const payload = {
    produto: nome, categoria: 'TRANSFORMADOS',
    rendimento: String(rend), unidade: unid,
    custo_porcao: custoTotal ? Math.round(custoTotal * 100) / 100 : null,
    custo_unit_calc: custoTotal ? Math.round(custoTotal / rend * 10000) / 10000 : null,
    insumos: ingredientes,
    modo_preparo: document.getElementById('tf-obs').value ? [document.getElementById('tf-obs').value] : [],
    mise_en_place: [], num_porcoes: '1'
  };
  await api('/api/transformados', 'POST', payload);
  toast(`Transformado "${nome}" salvo! ✅`, 'success');
  closeModal('ov-transf');
  await loadAll();
  renderTransf();
}

async function deleteTransf(id) {
  if (!confirm('Remover?')) return;
  await api(`/api/transformados?id=${id}`, 'DELETE');
  toast('Removido', '');
  await loadAll(); renderTransf();
}

// ════════════════════════════════════
// INSUMOS
// ════════════════════════════════════
function renderInsumos() {
  const srch = norm(document.getElementById('srch-ins').value);
  const cat = document.getElementById('cat-ins').value;
  let arr = insumos.filter(i => {
    const cOk = !cat || i.categoria === cat;
    const sOk = !srch || norm(i.nome).includes(srch) || norm(i.categoria).includes(srch);
    return cOk && sOk;
  }).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
  document.getElementById('cnt-ins').textContent = `${arr.length} de ${insumos.length} insumos`;
  document.getElementById('snav-insumos').textContent = insumos.length;
  const container = document.getElementById('ins-list');
  if (!arr.length) { container.innerHTML = '<div class="empty"><div class="empty-icon">🧂</div>Nenhum insumo encontrado</div>'; return; }
  container.innerHTML = arr.map(ins => `<div class="list-item">
    <div class="li-hdr" style="background:#2c3e50">
      <span class="li-nome">${ins.nome}</span>
      ${ins.categoria ? `<span class="li-badge">${ins.categoria}</span>` : ''}
    </div>
    <div class="li-body">
      <div class="li-stat"><div class="ls-lbl">Unidade</div><div class="ls-val">${ins.unid || '—'}</div></div>
      <div class="li-stat"><div class="ls-lbl">Preço Compra</div><div class="ls-val">${BRL(ins.valor_bruto)}</div></div>
      <div class="li-stat"><div class="ls-lbl">Rendimento</div><div class="ls-val">${ins.rend || '—'}</div></div>
      <div class="li-stat"><div class="ls-lbl">Custo/Unid</div><div class="ls-val" style="color:#2e5e42">${BRL(ins.valor_unit)}</div></div>
      ${ins.fornecedor1 ? `<div class="li-stat"><div class="ls-lbl">Fornecedor</div><div class="ls-val" style="font-size:11px">${ins.fornecedor1}</div></div>` : ''}
    </div>
    ${ME?.role !== 'viewer' ? `<div class="li-actions">
      <button class="act-btn" onclick="editInsumo('${ins._id}')">✏️ Editar</button>
      ${ins._custom || !ins._seeded ? `<button class="act-btn del" onclick="deleteInsumo('${ins._id}')">🗑</button>` : ''}
    </div>` : ''}
  </div>`).join('');
}

let editingInsId = null;
function openNewInsumo() {
  editingInsId = null;
  document.getElementById('ins-modal-ttl').textContent = 'Novo Insumo';
  ['if-nome','if-forn1','if-forn2'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('if-preco').value = '';
  document.getElementById('if-qtd').value = '1';
  document.getElementById('if-rend').value = '0.9';
  document.getElementById('if-cat').value = '';
  document.getElementById('if-unid').value = 'KG';
  document.getElementById('ins-preview').style.display = 'none';
  openModal('ov-ins');
}
function editInsumo(id) {
  const ins = insumos.find(i => i._id === id);
  if (!ins) return;
  editingInsId = id;
  document.getElementById('ins-modal-ttl').textContent = 'Editar Insumo';
  document.getElementById('if-nome').value = ins.nome || '';
  document.getElementById('if-cat').value = ins.categoria || '';
  document.getElementById('if-unid').value = ins.unid || 'KG';
  document.getElementById('if-preco').value = ins.valor_bruto || '';
  document.getElementById('if-qtd').value = ins.qtd_bruta || '1';
  document.getElementById('if-rend').value = ins.rend || '0.9';
  document.getElementById('if-forn1').value = ins.fornecedor1 || '';
  document.getElementById('if-forn2').value = ins.fornecedor2 || '';
  calcInsUnit();
  openModal('ov-ins');
}
function calcInsUnit() {
  const preco = parseFloat(document.getElementById('if-preco').value) || 0;
  const qtd = parseFloat(document.getElementById('if-qtd').value) || 1;
  const rend = parseFloat(document.getElementById('if-rend').value) || 1;
  const unit = preco > 0 ? preco / (qtd * rend) : 0;
  const prev = document.getElementById('ins-preview');
  if (unit > 0) { prev.style.display = 'flex'; document.getElementById('ip-unit').textContent = BRL(unit) + ' / ' + (document.getElementById('if-unid').value || 'un'); }
  else prev.style.display = 'none';
}
async function saveInsumo() {
  const nome = document.getElementById('if-nome').value.trim();
  if (!nome) { toast('Preencha o nome', 'error'); return; }
  const preco = parseFloat(document.getElementById('if-preco').value) || 0;
  const qtd = parseFloat(document.getElementById('if-qtd').value) || 1;
  const rend = parseFloat(document.getElementById('if-rend').value) || 1;
  const payload = {
    nome, categoria: document.getElementById('if-cat').value,
    unid: document.getElementById('if-unid').value,
    qtd_bruta: qtd, qtd_liq: qtd * rend, rend,
    valor_bruto: preco || null,
    valor_unit: preco ? Math.round(preco / (qtd * rend) * 10000) / 10000 : null,
    fornecedor1: document.getElementById('if-forn1').value,
    fornecedor2: document.getElementById('if-forn2').value,
  };
  if (editingInsId) await api(`/api/insumos?id=${editingInsId}`, 'PUT', payload);
  else await api('/api/insumos', 'POST', payload);
  toast('Insumo salvo! ✅', 'success');
  closeModal('ov-ins');
  await loadAll(); renderInsumos();
}
async function deleteInsumo(id) {
  if (!confirm('Remover?')) return;
  await api(`/api/insumos?id=${id}`, 'DELETE');
  toast('Removido', '');
  await loadAll(); renderInsumos();
}

// ════════════════════════════════════
// AUTOCOMPLETE
// ════════════════════════════════════
function getIngredientBank() {
  const ins = insumos.map(i => ({ nome: i.nome, tipo: 'insumo', unid: i.unid, custo_unit: i.valor_unit, cat: i.categoria }));
  const transf = transformados.filter(t => t.custo_unit_calc || t.custo_porcao).map(t => ({
    nome: t.produto, tipo: 'transformado', unid: t.unidade || 'kg',
    custo_unit: t.custo_unit_calc || t.custo_porcao, cat: 'Transformado'
  }));
  return [...ins, ...transf];
}

function buildAC(inputEl, onSelect) {
  let acDiv = null;
  inputEl.addEventListener('input', () => {
    const q = norm(inputEl.value);
    if (acDiv) { acDiv.remove(); acDiv = null; }
    if (q.length < 1) return;
    const bank = getIngredientBank();
    const matches = bank.filter(b => norm(b.nome).includes(q)).slice(0, 10);
    if (!matches.length) return;
    acDiv = document.createElement('div'); acDiv.className = 'ac-list';
    matches.forEach(m => {
      const el = document.createElement('div'); el.className = 'ac-item';
      el.innerHTML = `<span>${m.nome}<small class="ac-cat" style="margin-left:5px;">${m.cat || ''}</small></span><span class="ac-val">${m.custo_unit ? BRL(m.custo_unit) : ''} /${m.unid || ''}</span>`;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); inputEl.value = m.nome; if (acDiv) { acDiv.remove(); acDiv = null; } onSelect(m); });
      el.addEventListener('click', () => { inputEl.value = m.nome; if (acDiv) { acDiv.remove(); acDiv = null; } onSelect(m); });
      acDiv.appendChild(el);
    });
    inputEl.parentNode.style.position = 'relative';
    inputEl.parentNode.appendChild(acDiv);
  });
  document.addEventListener('click', e => { if (acDiv && !inputEl.parentNode.contains(e.target)) { acDiv.remove(); acDiv = null; } });
}

// ════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════
function renderDash() {
  const hasFin = fichas.filter(f => f.cmv_loja_pct != null);
  const hasCusto = fichas.filter(f => f.custo_porcao);
  const avgCusto = hasCusto.length ? hasCusto.reduce((a, b) => a + b.custo_porcao, 0) / hasCusto.length : 0;
  const avgCMV = hasFin.length ? hasFin.reduce((a, b) => a + b.cmv_loja_pct, 0) / hasFin.length : 0;
  const verde = hasFin.filter(f => f.cmv_loja_pct <= 30).length;
  const amarelo = hasFin.filter(f => f.cmv_loja_pct > 30 && f.cmv_loja_pct <= 45).length;
  const vermelho = hasFin.filter(f => f.cmv_loja_pct > 45).length;
  const topMargem = [...fichas].filter(f => f.margem_loja > 0).sort((a, b) => b.margem_loja - a.margem_loja).slice(0, 8);
  const piorCMV = [...hasFin].sort((a, b) => b.cmv_loja_pct - a.cmv_loja_pct).slice(0, 8);
  const cats = [...new Set(hasFin.map(f => f.categoria))];
  const catCMV = cats.map(cat => {
    const items = hasFin.filter(f => f.categoria === cat);
    return { cat, avg: items.reduce((a, b) => a + b.cmv_loja_pct, 0) / items.length };
  }).sort((a, b) => a.avg - b.avg);
  const maxCMV = Math.max(...catCMV.map(d => d.avg), 1);
  const maxM = topMargem[0]?.margem_loja || 1;
  const maxCMVi = piorCMV[0]?.cmv_loja_pct || 1;

  document.getElementById('dash-content').innerHTML = `
  <div class="kpis">
    <div class="kpi"><div class="kpi-v">${fichas.length}</div><div class="kpi-l">Fichas</div></div>
    <div class="kpi"><div class="kpi-v">${transformados.length}</div><div class="kpi-l">Transformados</div></div>
    <div class="kpi"><div class="kpi-v">${insumos.length}</div><div class="kpi-l">Insumos</div></div>
    <div class="kpi"><div class="kpi-v">${BRL(avgCusto)}</div><div class="kpi-l">Custo Médio</div></div>
    <div class="kpi"><div class="kpi-v">${PCT(avgCMV)}</div><div class="kpi-l">CMV Médio</div></div>
    <div class="kpi kgreen"><div class="kpi-v">${verde}</div><div class="kpi-l">🟢 CMV OK</div></div>
    <div class="kpi kyellow"><div class="kpi-v">${amarelo}</div><div class="kpi-l">🟡 Atenção</div></div>
    <div class="kpi kred"><div class="kpi-v">${vermelho}</div><div class="kpi-l">🔴 Alto CMV</div></div>
  </div>
  <div class="chart-box">
    <div class="chart-ttl">CMV por Categoria</div>
    ${catCMV.map(d => { const ci = getCMVInfo(d.avg); return `<div class="bar-row">
      <div class="bar-lbl">${d.cat}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(d.avg/maxCMV*100).toFixed(1)}%;background:${ci.color};"></div></div>
      <div class="bar-val" style="color:${ci.color}">${PCT(d.avg)}</div>
    </div>`; }).join('')}
  </div>
  <div class="chart-box">
    <div class="chart-ttl">Top 8 – Maior Margem</div>
    ${topMargem.map(f => `<div class="bar-row">
      <div class="bar-lbl" title="${f.produto}">${f.produto}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(f.margem_loja/maxM*100).toFixed(1)}%;background:${CAT_COLORS[f.categoria]||'#1a3a2a'};"></div></div>
      <div class="bar-val">${BRL(f.margem_loja)}</div>
    </div>`).join('')}
  </div>
  <div class="chart-box">
    <div class="chart-ttl">⚠ Top 8 – Maior CMV</div>
    ${piorCMV.map(f => { const ci = getCMVInfo(f.cmv_loja_pct); return `<div class="bar-row">
      <div class="bar-lbl" title="${f.produto}">${f.produto}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(f.cmv_loja_pct/maxCMVi*100).toFixed(1)}%;background:${ci.color};"></div></div>
      <div class="bar-val" style="color:${ci.color}">${PCT(f.cmv_loja_pct)}</div>
    </div>`; }).join('')}
  </div>`;
}

// ════════════════════════════════════
// USERS
// ════════════════════════════════════
async function renderUsers() {
  const users = await api('/api/users') || [];
  document.getElementById('users-list').innerHTML = users.map(u => `
    <div class="user-item">
      <div class="user-avatar">${(u.nome || u.username || '?')[0].toUpperCase()}</div>
      <div class="user-info">
        <div class="user-nome">${u.nome || u.username}</div>
        <div class="user-role">@${u.username} · <span class="role-badge role-${u.role}">${u.role}</span></div>
      </div>
      ${u._id !== ME?.id ? `<button class="act-btn del" onclick="deleteUser('${u._id}')">🗑</button>` : ''}
    </div>`).join('');
}
function openNewUser() {
  ['uf-nome','uf-user','uf-pass'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('uf-role').value = 'viewer';
  openModal('ov-user');
}
async function saveUser() {
  const username = document.getElementById('uf-user').value.trim();
  const password = document.getElementById('uf-pass').value;
  if (!username || !password) { toast('Preencha usuário e senha', 'error'); return; }
  if (password.length < 6) { toast('Senha mínimo 6 caracteres', 'error'); return; }
  const r = await api('/api/users', 'POST', {
    nome: document.getElementById('uf-nome').value,
    username, password,
    role: document.getElementById('uf-role').value
  });
  if (r?.username) { toast('Usuário criado! ✅', 'success'); closeModal('ov-user'); renderUsers(); }
  else toast(r?.error || 'Erro', 'error');
}
async function deleteUser(id) {
  if (!confirm('Remover usuário?')) return;
  await api(`/api/users?id=${id}`, 'DELETE');
  toast('Removido', ''); renderUsers();
}

// ════════════════════════════════════
// INIT
// ════════════════════════════════════
async function init() {
  await checkSetup();
  if (TOKEN) {
    const me = await api('/api/auth/me');
    if (me && !me.error) { ME = me; startApp(); return; }
    localStorage.removeItem('g_token'); TOKEN = null;
  }
  document.getElementById('loginScreen').classList.add('active');
}
// Enter key on login
document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
init();
