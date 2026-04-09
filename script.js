// ===== MODELS =====
const MODELS = {
  nvidia:[
    {v:'openai/gpt-oss-120b',l:'GPT-OSS 120B ⚡ (Recommended)'},
    {v:'nvidia/llama-3.3-nemotron-super-49b-v1',l:'Nemotron Super 49B'},
    {v:'nvidia/llama-3.1-nemotron-ultra-253b-v1',l:'Nemotron Ultra 253B'},
    {v:'mistralai/mistral-large-2-instruct',l:'Mistral Large 2 (~123B)'},
    {v:'meta/llama-3.1-405b-instruct',l:'Llama 3.1 405B'},
    {v:'meta/llama-3.3-70b-instruct',l:'Llama 3.3 70B'},
    {v:'qwen/qwen2.5-72b-instruct',l:'Qwen 2.5 72B'}
  ]
};

// ===== STATE =====
const ST = {
  projects:[], folders:[], notes:[], templates:[], 
  activeId:null, activeProjectId:null, openNodes:{},
  persona:null, ai:{provider:'nvidia',model:'openai/gpt-oss-120b'},
  viewType:'dashboard', // dashboard, project, editor
  rsTab:'chat', // chat, toc, info
  chatHistory:{}, saveTimer:null
};
let onbStep=0;

// ===== ONBOARDING =====
function nextStep(){
  if(onbStep===0&&!document.getElementById('p-name').value.trim()){showToast('Masukkan nama dulu','error');return;}
  document.getElementById(`s${onbStep}`).classList.remove('active');
  document.getElementById(`d${onbStep}`).classList.remove('active');
  onbStep++;
  document.getElementById(`s${onbStep}`).classList.add('active');
  document.getElementById(`d${onbStep}`).classList.add('active');
}
function prevStep(){
  document.getElementById(`s${onbStep}`).classList.remove('active');
  document.getElementById(`d${onbStep}`).classList.remove('active');
  onbStep--;
  document.getElementById(`s${onbStep}`).classList.add('active');
  document.getElementById(`d${onbStep}`).classList.add('active');
}
function fillModels(id){
  const sel=document.getElementById(id);
  sel.innerHTML=MODELS.nvidia.map(m=>`<option value="${m.v}">${m.l}</option>`).join('');
}
function finishOnboarding(){
  ST.persona={
    name:document.getElementById('p-name').value.trim(),
    role:document.getElementById('p-role').value.trim(),
    about:document.getElementById('p-about').value.trim(),
    style:document.getElementById('p-style').value,
    lang:document.getElementById('p-lang').value
  };
  ST.ai={provider:'nvidia',model:document.getElementById('p-model').value};
  // No default templates - user starts fresh
  ST.templates = [];
  saveState();
  document.getElementById('onboarding').style.display='none';
  document.getElementById('app').style.display='flex';
  initApp();
}

// ===== INIT =====
function initApp(){
  // Initialize Firebase
  if (typeof initFirebase === 'function') {
    initFirebase();
  }
  
  // Initialize Tiptap editor
  initTiptap();
  
  migrateOldData();
  updatePersonaBadge();
  renderSidebar();
  showDashboard();
  
  // Fill model picker in chat
  fillModels('rs-model-picker');
  const rsm = document.getElementById('rs-model-picker');
  if(rsm && ST.ai && ST.ai.model) rsm.value = ST.ai.model;
  
  // Update auth UI
  if (typeof updateAuthUI === 'function') {
    updateAuthUI();
  }
}

function updateSelectedModel(val){
  ST.ai.model = val;
  saveState();
}

function migrateOldData(){
  // V3 Architecture Hard Reset for Ghost Files
  if(!localStorage.getItem('quill_v3')){
    localStorage.removeItem('quill_state');
    localStorage.setItem('quill_v3','1');
  }
  const data=localStorage.getItem('quill_state');
  if(data){
    const old=JSON.parse(data);
    if(old.folders && !old.projects){
      ST.projects = old.folders.map(f=>({id:f.id, name:f.name, emoji:f.emoji||'📁', color:'#d4a853'}));
    }
  }
  // Ensure default project if none
  if(!ST.projects || !ST.projects.length) {
    ST.projects = [{id:'p-general',name:'General',emoji:'📦',color:'#d4a853'}];
  }
  if(!ST.folders) ST.folders = [];
  if(!ST.openNodes) ST.openNodes = {};
}

function updatePersonaBadge(){
  const p=ST.persona; if(!p) return;
  document.getElementById('p-avatar').textContent=p.name.charAt(0).toUpperCase();
  document.getElementById('p-name-badge').textContent=p.name;
  document.getElementById('p-role-badge').textContent=p.role||'No role';
}

// ===== NAVIGATION & VIEWS =====
function showView(v){
  ST.viewType=v;
  document.querySelectorAll('.view').forEach(el=>el.style.display='none');
  document.getElementById(`${v}-view`).style.display='flex';
  updateBreadcrumbs();
  // Toggle mobile formatting toolbar visibility
  document.body.classList.toggle('editor-active', v === 'editor');
}

function showDashboard(){
  ST.activeProjectId=null;
  ST.activeId=null;
  showView('dashboard');
  renderGlobalDashboard();
  // menu-home hanya ada jika elemen tersebut ada
  const menuHome = document.getElementById('menu-home');
  if(menuHome) menuHome.classList.add('active');
}

function openProject(id){
  ST.activeProjectId=id;
  ST.activeId=null;
  showView('project');
  renderProjectDashboard();
  renderSidebar();
}

function updateBreadcrumbs(){
  const breadcrumbsEl = document.getElementById('breadcrumbs');
  
  // Clear all breadcrumbs
  breadcrumbsEl.innerHTML = '';
  
  // Always add Home (clickable)
  const homeItem = document.createElement('span');
  homeItem.className = 'bc-item';
  homeItem.textContent = 'Home';
  homeItem.style.cursor = 'pointer';
  homeItem.onclick = () => showDashboard();
  breadcrumbsEl.appendChild(homeItem);
  
  if(ST.activeProjectId){
    const p=ST.projects.find(x=>x.id===ST.activeProjectId);
    if(p) {
      // Add separator
      const sep1 = document.createElement('span');
      sep1.className = 'bc-sep';
      sep1.textContent = '/';
      breadcrumbsEl.appendChild(sep1);
      
      // Add project (clickable)
      const projItem = document.createElement('span');
      projItem.className = 'bc-item';
      projItem.textContent = p.name;
      projItem.style.cursor = 'pointer';
      projItem.onclick = () => openProject(p.id);
      breadcrumbsEl.appendChild(projItem);
    }
  }

  if(ST.activeId){
    const n=ST.notes.find(x=>x.id===ST.activeId);
    if(n) {
      // Add folder if exists
      if(n.folderId) {
        const folder = ST.folders.find(f => f.id === n.folderId);
        if(folder) {
          // Add separator
          const sep2 = document.createElement('span');
          sep2.className = 'bc-sep';
          sep2.textContent = '/';
          breadcrumbsEl.appendChild(sep2);
          
          // Add folder (clickable - opens project view with folder expanded)
          const folderItem = document.createElement('span');
          folderItem.className = 'bc-item';
          folderItem.textContent = `${folder.emoji || '📁'} ${folder.name}`;
          folderItem.style.cursor = 'pointer';
          folderItem.onclick = () => {
            ST.openNodes[folder.id] = true;
            openProject(n.projectId);
          };
          breadcrumbsEl.appendChild(folderItem);
        }
      }
      
      // Add separator
      const sep3 = document.createElement('span');
      sep3.className = 'bc-sep';
      sep3.textContent = '/';
      breadcrumbsEl.appendChild(sep3);
      
      // Add note (active, not clickable)
      const noteItem = document.createElement('span');
      noteItem.className = 'bc-item active';
      noteItem.textContent = n.title || 'Untitled';
      breadcrumbsEl.appendChild(noteItem);
    }
  }
}

// ===== NOTES CRUD =====
function uid(){return Date.now().toString(36)+Math.random().toString(36).substr(2,5);}

function openNote(id){
  ST.activeId=id;
  const n=ST.notes.find(x=>x.id===id); if(!n) return;
  ST.activeProjectId = n.projectId;
  
  showView('editor');
  document.getElementById('note-title').value=n.title;
  
  // Use Tiptap to set content
  setEditorHTML(n.content || '');
  
  updateMeta(n);
  updateWordCount();
  updateChatCtx();
  updateStatusBar();
  renderSidebar();
}

function deleteNote(id,e){
  if(e){e.stopPropagation();}
  if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}
  if(!confirm('Hapus note ini?')) return;
  ST.notes=ST.notes.filter(n=>n.id!==id);
  if(ST.activeId===id){
    ST.activeId=null;
    showDashboard();
  }
  saveState(); renderSidebar();
  if(ST.viewType === 'dashboard') renderGlobalDashboard();
  if(ST.viewType === 'project') renderProjectDashboard();
  showToast('Note dihapus');
}

function showFolderMenu(id,e){
  e.stopPropagation();
  if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}
  const menu=document.createElement('div');
  menu.className='context-menu';
  menu.style.cssText=`position:fixed;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:4px;z-index:300;box-shadow:0 4px 20px rgba(0,0,0,.5);min-width:160px;`;
  let menuHTML=`<button onclick="deleteFolder('${id}',event)" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;border-radius:5px;text-align:left;">🗑 Hapus Folder</button>`;
  menu.innerHTML=menuHTML;
  document.body.appendChild(menu);
  _noteMenuEl=menu;
  const rect=e.target.getBoundingClientRect();
  const mw=170, mh=menu.offsetHeight||40;
  let left=rect.right-mw, top=rect.bottom+4;
  if(top+mh>window.innerHeight) top=rect.top-mh-4;
  if(left<4) left=4;
  menu.style.left=left+'px'; menu.style.top=top+'px';
  setTimeout(()=>document.addEventListener('click',()=>{if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}},{once:true}),10);
}

function deleteFolder(id,e){
  if(e){e.stopPropagation();}
  if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}
  if(!confirm('Hapus folder ini (semua notes di dalamnya juga akan terhapus)?')) return;
  ST.folders=ST.folders.filter(f=>f.id!==id);
  ST.notes=ST.notes.filter(n=>n.folderId!==id); // delete all notes inside it
  saveState(); renderSidebar();
  if(ST.viewType === 'dashboard') renderGlobalDashboard();
  if(ST.viewType === 'project') renderProjectDashboard();
  showToast('Folder dihapus');
}

function showProjectMenu(id,e){
  e.stopPropagation();
  if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}
  const menu=document.createElement('div');
  menu.className='context-menu';
  menu.style.cssText=`position:fixed;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:4px;z-index:300;box-shadow:0 4px 20px rgba(0,0,0,.5);min-width:160px;`;
  let menuHTML=`<button onclick="deleteProject('${id}',event)" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;border-radius:5px;text-align:left;">🗑 Hapus Project</button>`;
  menu.innerHTML=menuHTML;
  document.body.appendChild(menu);
  _noteMenuEl=menu;
  const rect=e.target.getBoundingClientRect();
  const mw=170, mh=menu.offsetHeight||40;
  let left=rect.right-mw, top=rect.bottom+4;
  if(top+mh>window.innerHeight) top=rect.top-mh-4;
  if(left<4) left=4;
  menu.style.left=left+'px'; menu.style.top=top+'px';
  setTimeout(()=>document.addEventListener('click',()=>{if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}},{once:true}),10);
}

function deleteProject(id,e){
  if(e){e.stopPropagation();}
  if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}
  if(ST.projects.length<=1){showToast('Tidak bisa hapus project terakhir','error');return;}
  if(!confirm('Hapus project ini secara permanen beserta SELURUH isinya?')) return;
  
  ST.projects=ST.projects.filter(p=>p.id!==id);
  ST.folders=ST.folders.filter(f=>f.projectId!==id);
  ST.notes=ST.notes.filter(n=>n.projectId!==id);
  
  if(ST.activeProjectId===id){
    showDashboard();
  } else {
    saveState(); renderSidebar();
    if(ST.viewType === 'dashboard') renderGlobalDashboard();
  }
  showToast('Project dihapus');
}

function fmtTS(iso){
  const d=new Date(iso), now=new Date();
  const days=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
  const time=d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  const day=days[d.getDay()];
  const date=`${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  const diff=Math.floor((now-d)/60000);
  const rel=diff<1?'Baru saja':diff<60?`${diff}m lalu`:diff<1440?`${Math.floor(diff/60)}j lalu`:`${Math.floor(diff/1440)}h lalu`;
  return{time,day,date,rel};
}

function updateMeta(n){
  const ts=fmtTS(n.updatedAt);
  document.getElementById('meta-time').textContent=ts.time;
  document.getElementById('meta-date').textContent=`${ts.day}, ${ts.date}`;
}
function updateWordCount(){
  const txt = getEditorText();
  const w=txt.trim().split(/\s+/).filter(x=>x).length;
  document.getElementById('meta-words').textContent=`${w} kata`;
}

function scheduleAutoSave(){
  clearTimeout(ST.saveTimer);
  document.getElementById('meta-saved').textContent='💾...';
  document.getElementById('meta-saved').style.color='var(--text3)';
  ST.saveTimer=setTimeout(autoSave,800);
}
function autoSave(){
  if(!ST.activeId) return;
  const n=ST.notes.find(x=>x.id===ST.activeId); if(!n) return;
  n.title=document.getElementById('note-title').value;
  
  // Get content from Tiptap
  n.content = getEditorHTML();
  
  n.updatedAt=new Date().toISOString();
  updateMeta(n); saveState(); renderSidebar();
  const ms=document.getElementById('meta-saved');
  ms.textContent='✓ Tersimpan'; ms.style.color='var(--green)';
  setTimeout(()=>{ms.textContent='';},2000);
}

// ===== DASHBOARD RENDERING =====
function renderGlobalDashboard(){
  const el=document.getElementById('projects-grid');
  document.getElementById('stats-projects').textContent=ST.projects.length;
  document.getElementById('stats-docs').textContent=ST.notes.length;
  let totalW=0; ST.notes.forEach(n=>{totalW+=((n.content||'').replace(/<[^>]*>/g,'').trim().split(/\s+/).filter(x=>x).length);});
  document.getElementById('stats-words').textContent=totalW;

  el.innerHTML=ST.projects.map(p=>{
    const pNotes=ST.notes.filter(n=>n.projectId===p.id);
    let pWords=0; pNotes.forEach(n=>{pWords+=((n.content||'').replace(/<[^>]*>/g,'').trim().split(/\s+/).filter(x=>x).length);});
    return `
      <div class="project-card" onclick="openProject('${p.id}')">
        <div class="pc-header" style="background:${p.color||'var(--accent)'}">
          <div class="pc-title">${p.emoji||'📁'} ${escHtml(p.name)}</div>
        </div>
        <div class="pc-body">
          <div class="pc-meta">
            <span>${pNotes.length} docs</span>
            <span>${pWords} words</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderProjectDashboard(){
  const p=ST.projects.find(x=>x.id===ST.activeProjectId); if(!p) return;
  document.getElementById('pv-title').textContent=p.name;
  const pNotes=ST.notes.filter(n=>n.projectId===p.id);
  document.getElementById('pv-files').textContent=pNotes.length;
  let pWords=0; pNotes.forEach(n=>{pWords+=((n.content||'').replace(/<[^>]*>/g,'').trim().split(/\s+/).filter(x=>x).length);});
  document.getElementById('pv-words').textContent=pWords;

  const content=document.getElementById('project-content');
  renderProjectList(p.id);
}

function renderProjectList(projectId){
  const el=document.getElementById('project-content');
  const folders = ST.folders.filter(f => f.projectId === projectId && !f.parentId);
  const notes = ST.notes.filter(n => n.projectId === projectId);
  
  if(!folders.length && !notes.length){
    el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text3)">Belum ada dokumen atau folder.</div>`;
    return;
  }
  
  let html=`<div style="overflow-x:auto;width:100%;"><table class="project-table" style="width:100%;min-width:400px;border-collapse:collapse;margin-top:20px;">
    <thead><tr style="text-align:left;color:var(--text3);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);">
      <th style="padding:10px;">Name</th><th style="padding:10px;">Status</th><th style="padding:10px;">Words</th><th style="padding:10px;text-align:right;">Updated</th>
    </tr></thead><tbody>`;
  
  const renderNoteRow = (n, indent) => {
    const ts=fmtTS(n.updatedAt);
    const words=((n.content||'').replace(/<[^>]*>/g,'').trim().split(/\s+/).filter(x=>x).length);
    return `<tr onclick="openNote('${n.id}')" style="cursor:pointer;border-bottom:1px solid var(--border2);transition:background .2s;">
      <td style="padding:12px 10px;padding-left:${10 + indent}px;">📝 ${escHtml(n.title)||'Untitled'}</td>
      <td style="padding:12px 10px;"><span class="status-badge" style="background:var(--bg3);padding:2px 6px;border-radius:4px;font-size:10px;">${n.status||'No status'}</span></td>
      <td style="padding:12px 10px;font-family:monospace;font-size:11px;">${words}</td>
      <td style="padding:12px 10px;text-align:right;color:var(--text3);font-size:11px;">${ts.rel}</td>
    </tr>`;
  };

  folders.forEach(f => {
    const fNotes = notes.filter(n => n.folderId === f.id);
    const isOpen = ST.openNodes[f.id];
    html += `<tr class="folder-row" onclick="toggleNode('${f.id}'); renderProjectDashboard();" style="cursor:pointer;background:var(--bg2);border-bottom:1px solid var(--border2);">
      <td colspan="4" style="padding:12px 10px;font-weight:600;">
        <span style="display:inline-block;width:20px;text-align:center;">${isOpen ? '▼' : '▶'}</span>
        ${f.emoji||'📁'} ${escHtml(f.name)} <span style="color:var(--text3);font-weight:normal;font-size:12px;margin-left:8px;">(${fNotes.length} notes)</span>
      </td>
    </tr>`;
    if(isOpen) {
      if(fNotes.length === 0) {
        html += `<tr><td colspan="4" style="padding:12px 10px;padding-left:40px;color:var(--text3);font-size:12px;border-bottom:1px solid var(--border2);">Folder kosong</td></tr>`;
      } else {
        fNotes.forEach(n => { html += renderNoteRow(n, 20); });
      }
    }
  });

  notes.filter(n => !n.folderId).forEach(n => { html += renderNoteRow(n, 0); });

  html+=`</tbody></table></div>`;
  el.innerHTML=html;
}

function updateNoteStatus(id, status){
  const n=ST.notes.find(x=>x.id===id); if(!n) return;
  n.status=status;
  n.updatedAt=new Date().toISOString();
  saveState();
  renderProjectDashboard();
  showToast(`Status updated to ${status}`,'success');
}

function toggleNode(id, e){
  if(e) {
    e.stopPropagation();
    e.preventDefault();
  }
  
  const wasOpen = ST.openNodes[id];
  ST.openNodes[id] = !ST.openNodes[id];
  
  console.log('Toggle node:', id, 'Was open:', wasOpen, 'Now open:', ST.openNodes[id]);
  
  renderSidebar();
}

function renderTree(projectId, parentId, q) {
  let html = '';
  const folders = ST.folders.filter(f => f.projectId === projectId && (f.parentId || null) === parentId);
  const notes = ST.notes.filter(n => n.projectId === projectId && (n.folderId || null) === parentId);

  folders.forEach(f => {
    const isOpen = ST.openNodes[f.id];
    html += `
      <div class="tree-row" onclick="toggleNode('${f.id}', event)">
        <div style="display:flex;align-items:center;flex:1;min-width:0;">
          <span class="tree-arrow ${isOpen ? 'open' : ''}">▶</span>
          <span class="tree-icon">${f.emoji || '📁'}</span>&nbsp;
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(f.name)}</span>
        </div>
        <div style="display:flex;gap:2px;">
          <button class="note-menu-btn" onclick="newNote('${projectId}','${f.id}'); event.stopPropagation();" title="New Note">+</button>
          <button class="note-menu-btn" onclick="showFolderMenu('${f.id}', event)" title="Opsi Folder">⋯</button>
        </div>
      </div>
      <div class="tree-children ${isOpen ? 'open' : ''}">
        ${isOpen ? renderTree(projectId, f.id, q) : ''}
      </div>
    `;
  });

  notes.forEach(n => {
    if(q && !(n.title||'').toLowerCase().includes(q) && !(n.content||'').toLowerCase().includes(q)) return;
    html += `
      <div class="tree-item sidebar-item ${n.id === ST.activeId ? 'active' : ''}" onclick="openNote('${n.id}')" style="display:flex;align-items:center;justify-content:space-between;">
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;">📝 ${escHtml(n.title)||'Untitled'}</span>
        <button class="note-menu-btn" onclick="showNoteMenu('${n.id}', event)">⋯</button>
      </div>
    `;
  });

  if(!parentId && !folders.length && !notes.length && !q){
    html += `<div style="padding:4px 12px;font-size:11px;color:var(--text3);">Empty project</div>`;
  }

  return html;
}

function renderSidebar(){
  const el = document.getElementById('sidebar-content');
  if(!el) return;
  const q = (document.getElementById('search-input').value||'').toLowerCase();
  
  let html = '';
  ST.projects.forEach(p => {
    const isOpen = ST.openNodes[p.id] || ST.activeProjectId === p.id;
    html += `
      <div class="tree-row ${ST.activeProjectId === p.id && !ST.activeId ? 'active' : ''}">
        <div style="display:flex;align-items:center;flex:1;min-width:0;gap:4px;">
          <span class="tree-arrow ${isOpen ? 'open' : ''}" onclick="toggleNode('${p.id}', event)" title="Toggle expand/collapse">▶</span>
          <span class="tree-icon" onclick="openProject('${p.id}')" style="cursor:pointer;" title="Open project">${p.emoji || '📦'}</span>
          <span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;flex:1;" onclick="openProject('${p.id}')" title="Open project">${escHtml(p.name)}</span>
        </div>
        <div style="display:flex;gap:2px;">
          <button class="note-menu-btn" onclick="openNewFolder('${p.id}', null, event)" title="New Folder">+</button>
          <button class="note-menu-btn" onclick="showProjectMenu('${p.id}', event)" title="Opsi Project">⋯</button>
        </div>
      </div>
      <div class="tree-children ${isOpen ? 'open' : ''}">
        ${isOpen ? renderTree(p.id, null, q) : ''}
      </div>
    `;
  });
  el.innerHTML = html;
}

function renderNoteItem(n){
  const ts=fmtTS(n.updatedAt);
  const prev=(n.content||'').replace(/<[^>]*>/g,'').replace(/\u200B/g,'').trim().substring(0,55);
  const folderDot=n.folderId?(()=>{const f=ST.folders.find(x=>x.id===n.folderId);return f?`<span style="font-size:10px;margin-right:3px;">${f.emoji||'📁'}</span>`:''})():'';
  return`<div class="note-item${n.id===ST.activeId?' active':''}" onclick="openNote('${n.id}')">
    <div class="note-item-title">${folderDot}${escHtml(n.title)||'Untitled'}</div>
    <div class="note-item-preview">${escHtml(prev)||'...'}</div>
    <div class="note-item-meta">${ts.rel}</div>
    <button class="note-item-del" onclick="showNoteMenu('${n.id}',event)" title="Opsi">⋯</button>
  </div>`;
}

function switchTab(tab,el){
  ST.tab=tab;
  document.querySelectorAll('.sidebar-tab').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderSidebar();
}
function escHtml(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ===== SIDEBAR MOBILE =====
function toggleSidebar(){
  const s=document.getElementById('sidebar');
  const o=document.getElementById('sidebar-overlay');
  const isMobile = window.innerWidth <= 900;
  if(isMobile) {
    // Mobile: use .show class with transform
    if(s.classList.contains('show')){s.classList.remove('show');o.classList.remove('show');}
    else{s.classList.add('show');o.classList.add('show');}
  } else {
    // Desktop (shouldn't be called but guard)
    if(s.classList.contains('open')){s.classList.remove('open');}
    else{s.classList.add('open');}
  }
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('show','open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

// ===== SIDEBAR SECTIONS =====
const sectionStates = {
  projects: true
};

function toggleSection(sectionId) {
  sectionStates[sectionId] = !sectionStates[sectionId];
  const content = document.getElementById(`section-${sectionId}`);
  const arrow = document.getElementById(`arrow-${sectionId}`);
  
  if (sectionStates[sectionId]) {
    content.classList.remove('collapsed');
    arrow.classList.remove('collapsed');
  } else {
    content.classList.add('collapsed');
    arrow.classList.add('collapsed');
  }
}

// ===== MOBILE TOOLBAR =====
let activeMobileMenu = null;

function toggleMobileMenu(menuId) {
  const menu = document.getElementById(`mobile-menu-${menuId}`);
  
  // Close other menus
  document.querySelectorAll('.mobile-menu').forEach(m => {
    if (m.id !== `mobile-menu-${menuId}`) {
      m.classList.remove('show');
    }
  });
  
  // Toggle current menu
  if (activeMobileMenu === menuId) {
    menu.classList.remove('show');
    activeMobileMenu = null;
  } else {
    menu.classList.add('show');
    activeMobileMenu = menuId;
  }
}

function closeMobileMenu() {
  document.querySelectorAll('.mobile-menu').forEach(m => {
    m.classList.remove('show');
  });
  activeMobileMenu = null;
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.mobile-toolbar') && !e.target.closest('.mobile-menu')) {
    closeMobileMenu();
  }
});

// Mobile toolbar stays sticky at bottom of editor container
// No need for keyboard detection - sticky positioning handles it automatically

// ===== TEMPLATES =====
function saveAsTemplate(){
  if(!ST.activeId){showToast('Buka note dulu','error');return;}
  document.getElementById('tmpl-name').value=document.getElementById('note-title').value||'';
  document.getElementById('tmpl-desc').value='';
  document.getElementById('tmpl-modal').style.display='flex';
}
function confirmSaveTemplate(){
  const name=document.getElementById('tmpl-name').value.trim();
  if(!name){showToast('Nama template kosong','error');return;}
  ST.templates.push({id:uid(),name,desc:document.getElementById('tmpl-desc').value.trim(),content:document.getElementById('editor').innerHTML});
  saveState(); closeTmplModal();
  showToast('Template tersimpan ✓','success');
  if(ST.tab==='templates') renderSidebar();
}
function closeTmplModal(){document.getElementById('tmpl-modal').style.display='none';}
function useTemplate(id){
  const t=ST.templates.find(x=>x.id===id); if(!t) return;
  newNote(t.content);
  showToast(`Template "${t.name}" diterapkan ✓`,'success');
  switchTab('notes',document.querySelector('.sidebar-tab'));
}
function delTemplate(id){
  if(!confirm('Hapus template?')) return;
  ST.templates=ST.templates.filter(x=>x.id!==id);
  saveState(); renderSidebar();
  showToast('Template dihapus');
}

// ===== FOLDER FUNCTIONS =====
let tempPId = null, tempFId = null;
function openNewFolder(projectId = null, parentId = null, e = null){
  if(e) e.stopPropagation();
  tempPId = projectId || ST.activeProjectId || (ST.projects[0] ? ST.projects[0].id : null);
  tempFId = parentId;
  
  const isCreatingFolder = !!tempPId && !!e; // Explicitly passed an event from sidebar plus button
  const isProject = !isCreatingFolder;
  
  document.querySelector('#folder-modal .modal-title').textContent = isProject ? 'New Project' : 'New Folder';
  
  const lbl = document.getElementById('f-name-lbl');
  if(lbl) lbl.textContent = isProject ? 'Project Name' : 'Folder Name';
  
  const btn = document.getElementById('f-submit-btn');
  if(btn) btn.textContent = isProject ? 'Create Project' : 'Create Folder';
  
  const emojiInput = document.getElementById('f-emoji');
  if(emojiInput) {
    emojiInput.placeholder = isProject ? '📦' : '📁';
    emojiInput.value = '';
  }
  
  document.getElementById('f-name').value='';
  document.getElementById('folder-modal').style.display='flex';
  setTimeout(()=>document.getElementById('f-name').focus(),100);
}
function closeFolderModal(){document.getElementById('folder-modal').style.display='none';}

// This function creates either a Project or a Folder based on current context
function saveFolder(){
  const name=document.getElementById('f-name').value.trim();
  if(!name){showToast('Name is empty','error');return;}
  const isProject = document.querySelector('#folder-modal .modal-title').textContent === 'New Project';
  const defaultEmoji = isProject ? '📦' : '📁';
  const emoji = document.getElementById('f-emoji').value.trim() || defaultEmoji;
  
  // If tempPId is somehow forcing a folder via recursion
  if(tempPId && document.querySelector('#folder-modal .modal-title').textContent !== 'New Project') {
    ST.folders.push({id:uid(), name, emoji, projectId:tempPId, parentId:tempFId});
    ST.openNodes[tempFId || tempPId] = true;
    showToast(`Folder "${name}" created ✓`,'success');
  } else {
    // Top level project
    ST.projects.push({id:uid(), name, emoji, color:'#d4a853'});
    showToast(`Project "${name}" created ✓`,'success');
  }
  saveState(); closeFolderModal(); renderSidebar();
  if (ST.viewType === 'dashboard') {
    renderGlobalDashboard();
  }
}

function newNote(projectId = null, folderId = null){
  const projId = projectId || ST.activeProjectId || (ST.projects[0] ? ST.projects[0].id : 'p-general');
  const n={
    id:uid(), title:'', content:'', 
    projectId:projId, folderId:folderId, // Assign to correct folder if provided
    status:'To Do',
    createdAt:new Date().toISOString(), 
    updatedAt:new Date().toISOString()
  };
  ST.notes.unshift(n);
  ST.openNodes[projId] = true;
  saveState();
  openNote(n.id);
}

// ===== NOTE OPTIONS MENU (⋯) =====
let _noteMenuEl=null;
function showNoteMenu(id,e){
  e.stopPropagation();
  if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}
  const menu=document.createElement('div');
  menu.style.cssText=`position:fixed;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:4px;z-index:300;box-shadow:0 4px 20px rgba(0,0,0,.5);min-width:160px;`;
  const note=ST.notes.find(x=>x.id===id);
  const inFolder=note&&note.folderId;
  let menuHTML=`<button onclick="deleteNote('${id}',event)" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;border-radius:5px;text-align:left;">🗑 Hapus note</button>`;
  if(ST.folders.length){
    menuHTML=`<button onclick="openMoveModal('${id}')" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;background:none;border:none;color:var(--text);cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;border-radius:5px;text-align:left;">📁 Pindah ke folder</button>`+menuHTML;
    if(inFolder) menuHTML=`<button onclick="removeFromFolder('${id}')" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;background:none;border:none;color:var(--text2);cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;border-radius:5px;text-align:left;">✕ Keluarkan dari folder</button>`+menuHTML;
  }
  menu.innerHTML=menuHTML;
  document.body.appendChild(menu);
  _noteMenuEl=menu;
  // Position near button
  const rect=e.target.getBoundingClientRect();
  const mw=170, mh=menu.offsetHeight||90;
  let left=rect.right-mw, top=rect.bottom+4;
  if(top+mh>window.innerHeight) top=rect.top-mh-4;
  if(left<4) left=4;
  menu.style.left=left+'px'; menu.style.top=top+'px';
  setTimeout(()=>document.addEventListener('click',()=>{menu.remove();_noteMenuEl=null;},{once:true}),10);
}
function openMoveModal(noteId){
  if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}
  const body=document.getElementById('move-modal-body');
  body.innerHTML=ST.folders.map(f=>`
    <button onclick="moveNoteToFolder('${noteId}','${f.id}')" style="display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;background:none;border:none;border-bottom:1px solid var(--border);color:var(--text);cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;text-align:left;">
      <span style="font-size:18px">${f.emoji||'📁'}</span>${escHtml(f.name)}
    </button>`).join('');
  document.getElementById('move-modal').style.display='flex';
}
function moveNoteToFolder(noteId,folderId){
  const n=ST.notes.find(x=>x.id===noteId); if(!n) return;
  n.folderId=folderId;
  ST.openNodes[folderId]=true; // auto-open destination folder
  saveState(); renderSidebar();
  document.getElementById('move-modal').style.display='none';
  const f=ST.folders.find(x=>x.id===folderId);
  showToast(`Dipindah ke "${f?.name}" ✓`,'success');
}
function removeFromFolder(noteId){
  if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}
  const n=ST.notes.find(x=>x.id===noteId); if(!n) return;
  delete n.folderId;
  saveState(); renderSidebar();
  showToast('Dikeluarkan dari folder');
}

// ===== EDITOR EVENTS (called by Tiptap onUpdate) =====
// Note: most editor handling is done by Tiptap natively.
// These are utility helpers called from tiptap-setup.js onUpdate callback.
function onEditorInput() {
  scheduleAutoSave();
  updateWordCount();
  updateStatusBar();
  if(ST.rsTab === 'toc') {
    // Only update directly if TOC is active to save resources
    clearTimeout(window._tocTimer);
    window._tocTimer = setTimeout(updateTOC, 1000);
  }
}

// ===== INSERT HELPERS — delegate to Tiptap =====
function insertChecklist() { if(typeof tiptapTaskList==='function') tiptapTaskList(); }
function insertTable()     { if(typeof tiptapInsertTable==='function') tiptapInsertTable(); }
function insertCode()      { if(typeof tiptapCodeBlock==='function') tiptapCodeBlock(); }
function insertHR()        { if(typeof tiptapHR==='function') tiptapHR(); }
function listIndent()      { try{ editor&&editor.chain().focus().sinkListItem('listItem').run(); }catch(e){} }
function listOutdent()     { try{ editor&&editor.chain().focus().liftListItem('listItem').run(); }catch(e){} }


// ===== AI DROPDOWN (desktop) =====
function toggleAIMenu(e){
  if(e) e.stopPropagation();
  const menu=document.getElementById('ai-menu');
  const btn=document.querySelector('.ai-btn');
  if(!menu||!btn) return;
  
  const isShown=menu.classList.contains('show');
  
  if(isShown){
    menu.classList.remove('show');
  } else {
    // Position using fixed positioning to avoid overflow issues
    const rect=btn.getBoundingClientRect();
    menu.style.top=(rect.bottom+6)+'px';
    menu.style.right=(window.innerWidth-rect.right)+'px';
    menu.style.left='auto';
    
    menu.classList.add('show');
    setTimeout(()=>{
      const closeMenu=(evt)=>{
        if(!menu.contains(evt.target)){
          menu.classList.remove('show');
          document.removeEventListener('click',closeMenu);
        }
      };
      document.addEventListener('click',closeMenu);
    },10);
  }
}

function closeAIMenu(){
  const menu=document.getElementById('ai-menu');
  if(menu) menu.classList.remove('show');
}

// ===== MOBILE SHEETS =====
function openMobileAI(){
  const sheet=document.getElementById('ai-sheet');
  if(sheet) sheet.classList.add('open');
}
function closeMobileAI(){
  const sheet=document.getElementById('ai-sheet');
  if(sheet) sheet.classList.remove('open');
}
function openMobileChat(){
  // On mobile, toggle the right sidebar (same as desktop chat)
  toggleChat();
}
function closeMobileChat(){
  const rs=document.getElementById('right-sidebar');
  if(rs && !rs.classList.contains('hidden')) rs.classList.add('hidden');
}

function renderMobileChatHistory(){
  // Mobile chat uses same #chat-messages element via toggleChat
  updateChatHistory();
}

// ===== SYSTEM PROMPT =====
function buildSysPrompt(){
  const p=ST.persona;
  const styles={casual:'santai dan friendly',professional:'profesional dan formal',concise:'singkat dan to the point',detailed:'detail dan komprehensif',creative:'kreatif dan eksploratif'};
  const langs={id:'Bahasa Indonesia',en:'English',mixed:'mix Bahasa Indonesia dan English'};
  return `Kamu adalah asisten notes cerdas untuk ${p.name}, seorang ${p.role||'pengguna'}.${p.about?`\nTentang mereka: ${p.about}`:''}
Gaya komunikasi: ${styles[p.style]||'natural'}. Gunakan ${langs[p.lang]||'Bahasa Indonesia'}.

PENTING - Aturan Formatting:
1. Tulis konten yang PADAT dan LANGSUNG ke inti
2. JANGAN gunakan spasi berlebihan atau line break ganda
3. Gunakan markdown yang BERSIH dan MINIMAL
4. Untuk list: langsung tulis item tanpa spasi ekstra
5. Untuk paragraf: pisahkan dengan 1 line break saja
6. HINDARI formatting yang berlebihan
7. Tulis konten yang berkualitas tinggi dan langsung berguna`;
}

// ===== AI API CALL (via Vercel API) =====
async function callAI(messages){
  const{model}=ST.ai;
  const system=buildSysPrompt();

  const resp=await fetch('/api/ai',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,messages,system})
  });
  const data=await resp.json();
  if(!resp.ok) throw new Error(data?.error||`HTTP ${resp.status}`);
  return data.text;
}

// ===== AI ACTIONS =====
async function aiAction(action){
  closeAIMenu();
  if(!ST.activeId){showToast('Buka note dulu','error');return;}
  const title=document.getElementById('note-title').value;
  const content = getEditorText(); // Use Tiptap getText
  
  const prompts={
    write:`Tulis konten yang komprehensif untuk note berjudul: "${title}". Format dengan markdown yang rapi dan PADAT tanpa spasi berlebihan.`,
    continue:`Lanjutkan tulisan ini secara natural dan PADAT:\n\n${content}`,
    improve:`Perbaiki tulisan ini dari segi kejelasan dan struktur (pertahankan ide utama). Buat lebih PADAT dan EFISIEN:\n\n${content}`,
    summarize:`Buat ringkasan PADAT dalam bullet points SINGKAT:\n\n${content}`,
    expand:`Elaborasi dengan lebih banyak detail dan contoh, tapi tetap PADAT:\n\n${content}`,
    bullets:`Konversi menjadi bullet points RINGKAS dan PADAT:\n\n${content}`,
    table:`Konversi menjadi tabel markdown yang INFORMATIF dan PADAT:\n\n${content}`
  };
  const labels={write:'AI menulis...',continue:'AI melanjutkan...',improve:'AI memperbaiki...',summarize:'AI meringkas...',expand:'AI mengembangkan...',bullets:'Mengonversi...',table:'Membuat tabel...'};
  document.getElementById('ai-ltxt').textContent=labels[action];
  document.getElementById('ai-overlay').classList.add('show');
  try{
    const result=await callAI([{role:'user',content:prompts[action]}]);
    
    // Clean the markdown result before parsing
    const cleanedResult = result
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/\s+$/gm, '')        // Remove trailing spaces
      .replace(/^\s+/gm, '')        // Remove leading spaces
      .trim();
    
    const html=marked.parse(cleanedResult);
    
    // Use Tiptap functions to insert content
    if(['write','summarize','bullets','table'].includes(action)){
      replaceWithAIContent(html);
    } else {
      appendAIContent(html);
    }
    
    autoSave();
    showToast('AI selesai ✓','success');
  }catch(err){
    showToast('Error: '+err.message,'error');
  }finally{
    document.getElementById('ai-overlay').classList.remove('show');
  }
}

// ===== ASSISTANT CHAT LOGIC =====
function toggleChat(){
  const rs=document.getElementById('right-sidebar');
  if(!rs) return;
  const isMobile = window.innerWidth <= 900;
  if(isMobile){
    // Mobile: use .show + transform system (hidden stays for display fallback)
    const isShown = rs.classList.contains('show');
    if(isShown){
      rs.classList.remove('show');
    } else {
      rs.classList.add('show');
      updateChatHistory();
      if(ST.rsTab==='toc') updateTOC();
    }
    // Overlay for mobile
    const overlay = document.getElementById('sidebar-overlay');
    if(overlay) overlay.classList.toggle('show', rs.classList.contains('show'));
  } else {
    // Desktop: use .hidden = display:none
    rs.classList.toggle('hidden');
    if(!rs.classList.contains('hidden')){
      updateChatHistory();
      if(ST.rsTab==='toc') updateTOC();
    }
  }
}

function updateChatCtx(){
  // No-op for now, as we have a better title in the sidebar
}

async function sendChat(){
  const inp=document.getElementById('chat-input');
  if(!inp || !inp.value.trim()) return;
  if(!ST.activeId){showToast('Buka note dulu','error');return;}
  
  const msg=inp.value.trim();
  const noteId=ST.activeId;
  const msgsEl=document.getElementById('chat-messages');
  const btn=document.querySelector('.chat-send');
  
  if(!ST.chatHistory[noteId]) ST.chatHistory[noteId]=[];
  ST.chatHistory[noteId].push({role:'user',content:msg});
  
  appendChatMsg(msgsEl,'user',msg);
  inp.value=''; inp.style.height='auto';
  if(btn) btn.disabled=true;
  
  const typing=appendTyping(msgsEl);
  const note=ST.notes.find(n=>n.id===noteId);
  const liveText = document.getElementById('editor').innerText || '';
  const ctx=`Konteks note aktif:\nJudul: "${note?.title||'Untitled'}"\nIsi:\n${liveText.substring(0,3000)}\n---\n`;
  const hist=ST.chatHistory[noteId];
  const apiMsgs=hist.length===1
    ?[{role:'user',content:ctx+msg}]
    :[{role:'user',content:ctx+hist[0].content},...hist.slice(1)];
    
  try{
    const res=await callAI(apiMsgs);
    typing.remove();
    ST.chatHistory[noteId].push({role:'assistant',content:res});
    appendChatMsg(msgsEl,'ai',res);
  }catch(err){
    typing.remove();
    appendChatMsg(msgsEl,'ai','⚠️ '+err.message);
  }finally{
    if(btn) btn.disabled=false;
  }
}

function updateChatHistory(){
  const msgs=document.getElementById('chat-messages');
  if(!msgs) return;
  const hist=ST.chatHistory[ST.activeId] || [];
  msgs.innerHTML = hist.length === 0 ? '<div id="chat-empty">Hi 👋. Buka note lalu tanya AI.<br>AI membaca isi note aktifmu.</div>' : '';
  hist.forEach(m=>appendChatMsg(msgs, m.role, m.content));
}

function appendChatMsg(container,role,content){
  const div=document.createElement('div');
  div.className=`chat-msg ${role}`;
  const ts=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  let rendered='';
  if(role==='ai'){
    // Clean the content before parsing
    const cleanedContent = content
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/\s+$/gm, '')        // Remove trailing spaces
      .trim();
    
    // Parse markdown
    rendered = marked.parse(cleanedContent);
    
    // Additional HTML cleaning
    const temp = document.createElement('div');
    temp.innerHTML = rendered;
    
    // Remove empty paragraphs
    temp.querySelectorAll('p').forEach(p => {
      if (!p.textContent.trim()) {
        p.remove();
      }
    });
    
    // Clean list items
    temp.querySelectorAll('li').forEach(li => {
      li.innerHTML = li.innerHTML.replace(/\s+/g, ' ').trim();
    });
    
    rendered = temp.innerHTML;
  } else {
    rendered=escHtml(content).replace(/\n/g,'<br>');
  }
  div.innerHTML=`<div class="chat-bubble">${rendered}</div><div class="chat-time">${ts}</div>`;
  container.appendChild(div);
  if(role!=='ai'){
    container.scrollTop=container.scrollHeight;
  }
  return div;
}

function appendTyping(container){
  const div=document.createElement('div');
  div.className='chat-msg ai';
  div.innerHTML='<div class="chat-typing"><div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div></div>';
  container.appendChild(div);
  container.scrollTop=container.scrollHeight;
  return div;
}

function autoResizeChat(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px';}
function clearChat(){if(ST.activeId){ST.chatHistory[ST.activeId]=[];updateChatHistory();}}

// ===== SETTINGS =====
function openSettings(){
  if(!ST.persona) return;
  const p=ST.persona;
  document.getElementById('s-name').value=p.name||'';
  document.getElementById('s-role').value=p.role||'';
  document.getElementById('s-about').value=p.about||'';
  document.getElementById('s-style').value=p.style||'casual';
  document.getElementById('s-lang').value=p.lang||'id';
  fillModels('s-model');
  document.getElementById('s-model').value=ST.ai.model;
  document.getElementById('settings-modal').style.display='flex';
}
function saveSettings(){
  ST.persona={...ST.persona,
    name:document.getElementById('s-name').value,
    role:document.getElementById('s-role').value,
    about:document.getElementById('s-about').value,
    style:document.getElementById('s-style').value,
    lang:document.getElementById('s-lang').value
  };
  ST.ai.model=document.getElementById('s-model').value;
  
  const rsm = document.getElementById('rs-model-picker');
  if(rsm) {
    fillModels('rs-model-picker');
    rsm.value = ST.ai.model;
  }

  saveState(); updatePersonaBadge(); closeSettings();
  showToast('Settings tersimpan ✓','success');
}
function closeSettings(){document.getElementById('settings-modal').style.display='none';}

// ===== STORAGE =====
function saveState(){
  localStorage.setItem('quill2',JSON.stringify({notes:ST.notes,templates:ST.templates,folders:ST.folders,projects:ST.projects,persona:ST.persona,ai:ST.ai}));
  
  // Trigger cloud sync if available
  if (typeof scheduleCloudSync === 'function') {
    scheduleCloudSync();
  }
}
function loadState(){
  try{
    const d=JSON.parse(localStorage.getItem('quill2')||localStorage.getItem('quill_state')||'{}');
    if(d.persona){
      ST.notes=d.notes||[]; ST.templates=d.templates||[];
      ST.folders=d.folders||[];
      ST.projects=d.projects||[];
      ST.persona=d.persona; ST.ai=d.ai||ST.ai;
      return true;
    }
  }catch(e){}
  return false;
}

// ===== TOAST =====
function showToast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`show ${type}`;
  clearTimeout(window._tt);
  window._tt=setTimeout(()=>{t.className='';},3000);
}

// ===== PWA =====
(function setupPWA(){
  const m={name:'Quill - AI Notes',short_name:'Quill',start_url:'/',display:'standalone',background_color:'#0f0f0f',theme_color:'#0f0f0f'};
  const blob=new Blob([JSON.stringify(m)],{type:'application/json'});
  document.getElementById('manifest-link').href=URL.createObjectURL(blob);
})();

function setRSTab(tab, el){
  ST.rsTab=tab;
  document.querySelectorAll('.rs-tab').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  document.querySelectorAll('.rs-view').forEach(v=>v.style.display='none');
  const tabEl = document.getElementById(`rs-${tab}`);
  if(tabEl) tabEl.style.display='flex';
  if(tab==='toc') updateTOC();
}

function quickAi(action){
  const prompts = {
    review: "Review doc ini dan berikan saran perbaikan.",
    analyze: "Analisa struktur dan logika dari doc ini.",
    streamline: "Buat kalimat di doc ini lebih efektif dan profesional."
  };
  document.getElementById('chat-input').value = prompts[action];
  sendChat();
}

function updateStatusBar(){
  const n=ST.notes.find(x=>x.id===ST.activeId);
  const p=ST.projects.find(x=>x.id===(n?n.projectId:ST.activeProjectId));
  document.getElementById('sb-proj-info').textContent = `Project: ${p?p.name:'General'}`;
  const txt = getEditorText();
  const w=txt.trim().split(/\s+/).filter(x=>x).length;
  const c=txt.length;
  document.getElementById('sb-count').textContent = `${w} words · ${c} characters`;
}

function updateTOC(){
  const ed=document.getElementById('editor');
  if(!ed) return;
  const heads=ed.querySelectorAll('h1, h2, h3');
  const el=document.getElementById('toc-content');
  if(!el) return; // toc-content element doesn't exist in current layout
  if(!heads.length){el.innerHTML='<p style="padding:16px;color:var(--text3);font-size:12px;">No headings found.</p>';return;}
  
  el.innerHTML = Array.from(heads).map((h,i)=>{
    h.id = h.id || `h-${i}`;
    return `<div class="toc-item" style="padding:6px 16px;font-size:12px;cursor:pointer;color:var(--text2);margin-left:${(parseInt(h.tagName[1])-1)*12}px;" onclick="document.getElementById('${h.id}').scrollIntoView({behavior:'smooth'})">${h.textContent}</div>`;
  }).join('');
}

// ===== RESET DATA =====
function resetAllData(){
  if(confirm("Yakin ingin menghapus SEMUA data (Notes, Project, Settings)? Langkah ini tidak dapat dibatalkan!")) {
    localStorage.clear();
    location.reload();
  }
}

// ===== EXPORT & IMPORT =====
function exportData(){
  const data = localStorage.getItem('quill2') || localStorage.getItem('quill_state');
  if(!data){ showToast('Tidak ada data untuk diexport','error'); return; }
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quill-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data berhasil diexport','success');
}

function importData(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const imported = JSON.parse(e.target.result);
      if(!imported.notes && !imported.folders && !imported.projects){
        showToast('File JSON tidak valid','error'); return;
      }
      
      let mergedP = 0, mergedF = 0, mergedN = 0;

      if(imported.projects){
        imported.projects.forEach(ip => {
          const expectedTitle = ip.name.trim().toLowerCase();
          const existing = ST.projects.find(p => p.name.trim().toLowerCase() === expectedTitle);
          if(existing){
            ip.newId = existing.id;
            mergedP++;
          } else {
            ip.newId = ip.id;
            ST.projects.push(ip);
          }
        });
      }

      if(imported.folders){
        imported.folders.forEach(ifol => {
          const origProj = imported.projects ? imported.projects.find(p => p.id === ifol.projectId) : null;
          ifol.projectId = origProj ? origProj.newId : ifol.projectId;

          const expectedName = ifol.name.trim().toLowerCase();
          const existing = ST.folders.find(f => f.name.trim().toLowerCase() === expectedName && f.projectId === ifol.projectId && f.parentId === ifol.parentId);
          if(existing){
            ifol.newId = existing.id;
            mergedF++;
          } else {
            ifol.newId = ifol.id;
            ST.folders.push(ifol);
          }
        });
      }

      if(imported.notes){
        imported.notes.forEach(inote => {
          const origProj = imported.projects ? imported.projects.find(p => p.id === inote.projectId) : null;
          inote.projectId = origProj ? origProj.newId : inote.projectId;

          const origFol = imported.folders ? imported.folders.find(f => f.id === inote.folderId) : null;
          inote.folderId = origFol ? origFol.newId : inote.folderId;

          const expectedTitle = (inote.title||'Untitled').trim().toLowerCase();
          const existing = ST.notes.find(n => (n.title||'Untitled').trim().toLowerCase() === expectedTitle && n.projectId === inote.projectId && n.folderId === inote.folderId);
          if(existing && expectedTitle !== 'untitled'){
            mergedN++; // skip duplicate with same name
          } else {
            ST.notes.push(inote);
          }
        });
      }

      saveState();
      alert(`Import Berhasil! Menggabungkan ${mergedP} Project, ${mergedF} Folder, ${mergedN} Note yang duplikat.`);
      location.reload();
      
    } catch(err){
      showToast('Gagal memproses file','error');
      console.error(err);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ===== BOOT =====
fillModels('p-model');
if(loadState()){
  document.getElementById('onboarding').style.display='none';
  document.getElementById('app').style.display='flex';
  initApp();
}

// Close open dropdowns/menus when clicking outside
document.addEventListener('click', e => {
  // Close toolbar dropdowns (Tiptap menus)
  if (typeof closeToolbarDropdown === 'function') {
    const openMenus = document.querySelectorAll('.tb-menu.show, .ai-menu.show');
    openMenus.forEach(m => {
      if (!m.contains(e.target) && !e.target.closest('[onclick*="toggleToolbarDropdown"]')) {
        m.classList.remove('show');
      }
    });
  }
});
