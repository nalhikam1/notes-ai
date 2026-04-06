// ===== MODELS =====
const MODELS = {
  google:[
    {v:'gemini-2.0-flash',l:'Gemini 2.0 Flash (Recommended)'},
    {v:'gemini-1.5-flash',l:'Gemini 1.5 Flash'},
    {v:'gemini-1.5-pro',l:'Gemini 1.5 Pro'}
  ],
  anthropic:[
    {v:'claude-sonnet-4-5',l:'Claude Sonnet 4.5'},
    {v:'claude-3-5-haiku-20241022',l:'Claude 3.5 Haiku'},
    {v:'claude-opus-4-5',l:'Claude Opus 4.5'}
  ],
  groq:[
    {v:'llama-3.3-70b-versatile',l:'Llama 3.3 70B (Recommended)'},
    {v:'llama-3.1-8b-instant',l:'Llama 3.1 8B Fast'},
    {v:'mixtral-8x7b-32768',l:'Mixtral 8x7B'}
  ],
  nvidia:[
    {v:'nvidia/llama-3.3-nemotron-super-49b-v1',l:'Nemotron Super 49B (Recommended)'},
    {v:'nvidia/llama-3.1-nemotron-ultra-253b-v1',l:'Nemotron Ultra 253B'},
    {v:'mistralai/mistral-large-2-instruct',l:'Mistral Large 2 (~123B)'},
    {v:'meta/llama-3.1-405b-instruct',l:'Llama 3.1 405B'},
    {v:'meta/llama-3.3-70b-instruct',l:'Llama 3.3 70B'},
    {v:'qwen/qwen2.5-72b-instruct',l:'Qwen 2.5 72B'}
  ]
};

// ===== STATE =====
const ST = {
  notes:[], templates:[], folders:[], activeId:null,
  persona:null, ai:{provider:'google',apiKey:'',model:'gemini-2.0-flash'},
  tab:'notes', chatHistory:{}, saveTimer:null,
  openFolders:{} // track which folders are expanded
};
let onbStep=0, onbProvider='google';

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
function pickProvider(p,el){
  onbProvider=p;
  document.querySelectorAll('#s2 .provider-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  fillModels('p-model',p);
}
function fillModels(id,p){
  const sel=document.getElementById(id);
  sel.innerHTML=MODELS[p].map(m=>`<option value="${m.v}">${m.l}</option>`).join('');
}
function finishOnboarding(){
  const key=document.getElementById('p-apikey').value.trim();
  if(!key){showToast('Masukkan API key','error');return;}
  ST.persona={
    name:document.getElementById('p-name').value.trim(),
    role:document.getElementById('p-role').value.trim(),
    about:document.getElementById('p-about').value.trim(),
    style:document.getElementById('p-style').value,
    lang:document.getElementById('p-lang').value
  };
  ST.ai={provider:onbProvider,apiKey:key,model:document.getElementById('p-model').value};
  // Default templates
  ST.templates=[
    {id:uid(),name:'Meeting Notes',desc:'Catatan rapat',content:'<h2>Meeting Notes</h2><p><strong>Tanggal:</strong> &nbsp;</p><p><strong>Peserta:</strong> &nbsp;</p><hr><h3>Agenda</h3><ul><li>Item 1</li></ul><h3>Diskusi</h3><p>Tulis hasil diskusi di sini...</p><h3>Action Items</h3><ul><li>Action item 1</li></ul>'},
    {id:uid(),name:'Weekly Review',desc:'Review mingguan',content:'<h2>Weekly Review</h2><p><strong>Minggu:</strong> &nbsp;</p><h3>Selesai minggu ini</h3><ul><li>Item 1</li></ul><h3>Masih berjalan</h3><ul><li>Item 1</li></ul><h3>Target minggu depan</h3><ul><li>Target 1</li></ul>'},
    {id:uid(),name:'Idea Dump',desc:'Brainstorming bebas',content:'<h2>Idea Dump</h2><p><strong>Topik:</strong> &nbsp;</p><hr><h3>Raw Ideas</h3><ul><li>Ide 1</li></ul><h3>Paling menarik</h3><p>Tulis ide terbaik di sini...</p>'},
    {id:uid(),name:'Daily Journal',desc:'Jurnal harian',content:'<h2>Daily Journal</h2><p><strong>Mood:</strong> 😊</p><hr><h3>Hari ini</h3><p>Ceritakan harimu...</p><h3>Hal yang disyukuri</h3><ul><li>Syukur 1</li></ul><h3>Yang dipelajari</h3><p>Tulis di sini...</p>'}
  ];
  saveState();
  document.getElementById('onboarding').style.display='none';
  document.getElementById('app').style.display='flex';
  initApp();
}

// ===== INIT =====
function initApp(){
  updatePersonaBadge();
  renderSidebar();
  if(ST.notes.length===0) newNote();
}
function updatePersonaBadge(){
  const p=ST.persona; if(!p) return;
  document.getElementById('p-avatar').textContent=p.name.charAt(0).toUpperCase();
  document.getElementById('p-name-badge').textContent=p.name;
  document.getElementById('p-role-badge').textContent=p.role||'No role';
}

// ===== NOTES CRUD =====
function uid(){return Date.now().toString(36)+Math.random().toString(36).substr(2,5);}

function newNote(content=''){
  const n={id:uid(),title:'',content,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  ST.notes.unshift(n);
  saveState();
  openNote(n.id);
  renderSidebar();
  closeSidebar(); // auto close sidebar on mobile after creating note
}

function openNote(id){
  ST.activeId=id;
  const n=ST.notes.find(x=>x.id===id); if(!n) return;
  document.getElementById('empty-state').style.display='none';
  const ev=document.getElementById('editor-view');
  ev.style.display='flex';
  document.getElementById('note-title').value=n.title;
  document.getElementById('editor').innerHTML=n.content;
  reattachChecklistListeners();
  updateMeta(n);
  updateWordCount();
  updateChatCtx();
  renderSidebar();
  closeSidebar();
}

function deleteNote(id,e){
  if(e){e.stopPropagation();}
  if(_noteMenuEl){_noteMenuEl.remove();_noteMenuEl=null;}
  if(!confirm('Hapus note ini?')) return;
  ST.notes=ST.notes.filter(n=>n.id!==id);
  if(ST.activeId===id){
    ST.activeId=null;
    document.getElementById('editor-view').style.display='none';
    document.getElementById('empty-state').style.display='flex';
  }
  saveState(); renderSidebar();
  showToast('Note dihapus');
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
  const txt=(document.getElementById('editor').innerText||'').replace(/\u200B/g,'');
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
  // Clone editor to clean before saving
  const edClone=document.getElementById('editor').cloneNode(true);
  // Strip contenteditable attrs and zero-width spaces from check spans
  edClone.querySelectorAll('.ql-check-text').forEach(s=>{
    s.removeAttribute('contenteditable');
    s.textContent=s.textContent.replace(/\u200B/g,'');
  });
  n.content=edClone.innerHTML;
  n.updatedAt=new Date().toISOString();
  updateMeta(n); saveState(); renderSidebar();
  const ms=document.getElementById('meta-saved');
  ms.textContent='✓ Tersimpan'; ms.style.color='var(--green)';
  setTimeout(()=>{ms.textContent='';},2000);
}

function renderSidebar(){
  const el=document.getElementById('sidebar-content');
  if(ST.tab==='notes'){
    const q=(document.getElementById('search-input').value||'').toLowerCase();
    let notes=ST.notes;
    if(q) notes=notes.filter(n=>n.title.toLowerCase().includes(q)||n.content.replace(/<[^>]*>/g,'').toLowerCase().includes(q));
    if(!notes.length){el.innerHTML=`<div style="text-align:center;padding:32px 12px;color:var(--text3);font-size:12px;">${q?'Tidak ditemukan':'Belum ada notes'}</div>`;return;}

    let html='';
    if(!q && ST.folders.length){
      // Render folders first
      ST.folders.forEach(f=>{
        const folderNotes=notes.filter(n=>n.folderId===f.id);
        const isOpen=ST.openFolders[f.id];
        html+=`<div class="folder-item${isOpen?' open':''}" onclick="toggleFolder('${f.id}')">
          <span class="folder-icon-arrow">▶</span>
          <span class="folder-emoji">${f.emoji||'📁'}</span>
          <span class="folder-name">${escHtml(f.name)}</span>
          <span class="folder-count">${folderNotes.length}</span>
          <button class="folder-del" onclick="deleteFolder('${f.id}',event)" title="Hapus folder">🗑</button>
        </div>`;
        if(isOpen){
          html+=`<div class="folder-notes${isOpen?' open':''}">`;
          if(folderNotes.length){
            html+=folderNotes.map(n=>renderNoteItem(n)).join('');
          } else {
            html+=`<div style="padding:8px 10px;font-size:11px;color:var(--text3);">Folder kosong</div>`;
          }
          html+=`</div>`;
        }
      });
      // Ungrouped notes
      const ungrouped=notes.filter(n=>!n.folderId);
      if(ungrouped.length){
        if(ST.folders.length) html+=`<div class="ungrouped-label">Lainnya</div>`;
        html+=ungrouped.map(n=>renderNoteItem(n)).join('');
      }
    } else {
      html=notes.map(n=>renderNoteItem(n)).join('');
    }
    el.innerHTML=html;
  } else {
    // Templates tab
    if(!ST.templates.length){
      el.innerHTML=`<div style="text-align:center;padding:32px 12px;color:var(--text3);font-size:12px;">Belum ada template.<br><br>Simpan note aktif sebagai template<br>lewat tombol 📋 di toolbar.</div>`;
      return;
    }
    el.innerHTML=ST.templates.map(t=>`
      <div class="template-item">
        <div class="template-info">
          <div class="template-name">${escHtml(t.name)}</div>
          <div class="template-desc">${escHtml(t.desc||'Tidak ada deskripsi')}</div>
        </div>
        <div class="template-actions">
          <button class="tmpl-use-btn" onclick="useTemplate('${t.id}')">Pakai</button>
          <button class="tmpl-del-btn" onclick="delTemplate('${t.id}')" title="Hapus">🗑</button>
        </div>
      </div>`).join('');
  }
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
  if(s.classList.contains('open')){s.classList.remove('open');o.classList.remove('show');}
  else{s.classList.add('open');o.classList.add('show');}
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

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
function openNewFolder(){
  document.getElementById('folder-name-input').value='';
  document.getElementById('folder-emoji-input').value='';
  document.getElementById('folder-modal').style.display='flex';
  setTimeout(()=>document.getElementById('folder-name-input').focus(),100);
}
function closeFolderModal(){document.getElementById('folder-modal').style.display='none';}
function confirmNewFolder(){
  const name=document.getElementById('folder-name-input').value.trim();
  if(!name){showToast('Nama folder kosong','error');return;}
  const emoji=document.getElementById('folder-emoji-input').value.trim()||'📁';
  ST.folders.push({id:uid(),name,emoji});
  saveState(); closeFolderModal(); renderSidebar();
  showToast(`Folder "${name}" dibuat ✓`,'success');
}
function toggleFolder(id){
  ST.openFolders[id]=!ST.openFolders[id];
  renderSidebar();
}
function deleteFolder(id,e){
  e.stopPropagation();
  const f=ST.folders.find(x=>x.id===id);
  if(!confirm(`Hapus folder "${f?.name}"?\nNotes di dalamnya tidak akan ikut terhapus.`)) return;
  // Unassign notes from this folder
  ST.notes.forEach(n=>{if(n.folderId===id) delete n.folderId;});
  ST.folders=ST.folders.filter(x=>x.id!==id);
  delete ST.openFolders[id];
  saveState(); renderSidebar();
  showToast('Folder dihapus');
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
  ST.openFolders[folderId]=true; // auto-open destination folder
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

// ===== EDITOR - CORE =====
function fmt(cmd){document.getElementById('editor').focus();document.execCommand(cmd,false,null);}
function fmtBlock(tag){document.getElementById('editor').focus();document.execCommand('formatBlock',false,tag);}

// ===== CHECKLIST =====
function insertChecklist(){
  const editor=document.getElementById('editor');
  editor.focus();
  const item=createCheckItem('');
  const sel=window.getSelection();
  if(sel.rangeCount){
    const range=sel.getRangeAt(0);
    let node=range.startContainer;
    while(node&&node!==editor&&!['P','DIV','H1','H2','H3','LI','BLOCKQUOTE'].includes(node.nodeName)){
      node=node.parentNode;
    }
    if(node&&node!==editor) node.after(item);
    else { range.deleteContents(); range.insertNode(item); }
  } else {
    editor.appendChild(item);
  }
  // setTimeout for mobile - let DOM settle before focusing
  setTimeout(()=>focusCheckText(item), 20);
  scheduleAutoSave();
}

function focusCheckText(item){
  const span=item.querySelector('.ql-check-text');
  if(!span) return;
  span.focus();
  try{
    const r=document.createRange();
    const node=span.childNodes.length?span.childNodes[0]:span;
    r.setStart(node,0); r.collapse(true);
    const sel=window.getSelection();
    sel.removeAllRanges(); sel.addRange(r);
  }catch(ex){}
}

function createCheckItem(text, checked){
  const div=document.createElement('div');
  div.className='ql-check'+(checked?' done':'');
  div.setAttribute('data-check','1');
  if(checked) div.setAttribute('data-checked','1');
  const box=document.createElement('span');
  box.className='ql-check-box';
  box.setAttribute('contenteditable','false');
  box.addEventListener('click',function(e){
    e.preventDefault(); e.stopPropagation();
    const done=div.classList.toggle('done');
    if(done) div.setAttribute('data-checked','1');
    else div.removeAttribute('data-checked');
    scheduleAutoSave();
  });
  const span=document.createElement('span');
  span.className='ql-check-text';
  span.contentEditable='true';
  // Use zero-width space so mobile browser treats it as focusable text node
  span.textContent=text||'\u200B';
  // Tap on row → focus text span
  div.addEventListener('click',function(e){
    if(e.target===div){ span.focus(); }
  });
  div.appendChild(box);
  div.appendChild(span);
  return div;
}

// Re-attach click listeners to checklist items after loading from storage
function reattachChecklistListeners(){
  document.querySelectorAll('#editor .ql-check').forEach(div=>{
    if(div.getAttribute('data-checked')==='1') div.classList.add('done');
    let box=div.querySelector('.ql-check-box');
    if(!box){
      // Legacy: had <input type=checkbox>, replace with custom box
      const oldCb=div.querySelector('input[type=checkbox]');
      box=document.createElement('span');
      box.className='ql-check-box';
      box.setAttribute('contenteditable','false');
      if(oldCb){
        if(oldCb.checked){ div.classList.add('done'); div.setAttribute('data-checked','1'); }
        oldCb.replaceWith(box);
      } else { div.prepend(box); }
    }
    // Re-attach by replacing (clears old listeners)
    const newBox=box.cloneNode(true);
    box.replaceWith(newBox);
    newBox.addEventListener('click',function(e){
      e.preventDefault(); e.stopPropagation();
      const done=div.classList.toggle('done');
      if(done) div.setAttribute('data-checked','1');
      else div.removeAttribute('data-checked');
      scheduleAutoSave();
    });
    // Ensure text span is editable & has focusable content
    let span=div.querySelector('.ql-check-text');
    if(!span){
      span=document.createElement('span');
      span.className='ql-check-text';
      div.appendChild(span);
    }
    span.contentEditable='true';
    if(!span.textContent) span.textContent='\u200B';
    // Tap on row → focus span
    div.onclick=function(e){ if(e.target===div) span.focus(); };
  });
}

// KEY HANDLER
function onEditorKey(e){
  const editor=document.getElementById('editor');
  const sel=window.getSelection();
  if(!sel.rangeCount) return;
  const range=sel.getRangeAt(0);

  // Find if cursor is in a checklist item
  let node=range.startContainer;
  let checkDiv=null;
  while(node&&node!==editor){
    if(node.classList&&node.classList.contains('ql-check')){checkDiv=node;break;}
    node=node.parentNode;
  }

  // Find if cursor is in a list item (for Tab indent)
  let inList=false;
  let listNode=range.startContainer;
  while(listNode&&listNode!==editor){
    if(listNode.nodeName==='LI'){inList=true;break;}
    listNode=listNode.parentNode;
  }

  if(checkDiv){
    if(e.key==='Enter'){
      e.preventDefault();
      const textSpan=checkDiv.querySelector('.ql-check-text');
      const text=textSpan?(textSpan.textContent.replace(/\u200B/g,'')):'';
      if(!text.trim()){
        // Second enter on empty item → exit to paragraph
        const p=document.createElement('p'); p.innerHTML='<br>';
        checkDiv.after(p); checkDiv.remove();
        setTimeout(()=>{
          try{
            const r=document.createRange(); r.setStart(p,0); r.collapse(true);
            const s=window.getSelection(); s.removeAllRanges(); s.addRange(r);
            p.focus();
          }catch(ex){}
        },0);
      } else {
        // Has text → make new checklist item
        const newItem=createCheckItem('');
        checkDiv.after(newItem);
        setTimeout(()=>focusCheckText(newItem), 20);
      }
      scheduleAutoSave(); return;
    }
    if(e.key==='Backspace'){
      const textSpan=checkDiv.querySelector('.ql-check-text');
      if(textSpan&&!textSpan.textContent.replace(/\u200B/g,'')){
        e.preventDefault();
        const prev=checkDiv.previousElementSibling;
        const p=document.createElement('p'); p.innerHTML='<br>';
        checkDiv.before(p); checkDiv.remove();
        setTimeout(()=>{
          try{
            const r=document.createRange(); r.setStart(p,0); r.collapse(true);
            const s=window.getSelection(); s.removeAllRanges(); s.addRange(r);
          }catch(ex){}
        },0);
        scheduleAutoSave(); return;
      }
    }
    if(e.key==='Tab'){
      e.preventDefault();
      return;
    }
  }

  // Tab: indent/outdent list items
  if(e.key==='Tab'&&inList){
    e.preventDefault();
    if(e.shiftKey) document.execCommand('outdent',false,null);
    else document.execCommand('indent',false,null);
    return;
  }

  // Tab outside list/checklist: insert spaces
  if(e.key==='Tab'&&!inList&&!checkDiv){
    e.preventDefault();
    document.execCommand('insertHTML',false,'&nbsp;&nbsp;&nbsp;&nbsp;');
    return;
  }

  // Default Enter: ensure <p> not <div>
  if(e.key==='Enter'&&!e.shiftKey&&!checkDiv){
    setTimeout(()=>{
      const sel2=window.getSelection();
      if(sel2.rangeCount){
        const n=sel2.getRangeAt(0).startContainer;
        let block=n.nodeType===3?n.parentNode:n;
        while(block&&block!==editor&&block.parentNode!==editor) block=block.parentNode;
        if(block&&block.nodeName==='DIV'&&block!==editor){
          const p=document.createElement('p');
          p.innerHTML=block.innerHTML||'<br>';
          block.replaceWith(p);
          const r2=document.createRange(); r2.setStart(p,0); r2.collapse(true);
          sel2.removeAllRanges(); sel2.addRange(r2);
        }
      }
    },0);
  }
}

function onEditorInput(){
  scheduleAutoSave();
  updateWordCount();
}

// ===== LIST INDENT / OUTDENT =====
function listIndent(){
  document.getElementById('editor').focus();
  document.execCommand('indent',false,null);
}
function listOutdent(){
  document.getElementById('editor').focus();
  document.execCommand('outdent',false,null);
}

// ===== TABLE with toolbar =====
function insertTable(){
  const editor=document.getElementById('editor');
  editor.focus();
  const wrap=document.createElement('div');
  wrap.className='table-wrap'; wrap.style.position='relative';
  wrap.innerHTML=`<table contenteditable="false">
    <thead><tr><th contenteditable="true">Kolom 1</th><th contenteditable="true">Kolom 2</th><th contenteditable="true">Kolom 3</th></tr></thead>
    <tbody>
      <tr><td contenteditable="true">Data</td><td contenteditable="true">Data</td><td contenteditable="true">Data</td></tr>
      <tr><td contenteditable="true">Data</td><td contenteditable="true">Data</td><td contenteditable="true">Data</td></tr>
    </tbody>
  </table>`;
  const sel=window.getSelection();
  if(sel.rangeCount){
    const range=sel.getRangeAt(0);
    let node=range.startContainer;
    while(node&&node!==editor&&node.parentNode!==editor){node=node.parentNode;}
    if(node&&node!==editor) node.after(wrap);
    else editor.appendChild(wrap);
  } else { editor.appendChild(wrap); }
  // Show toolbar on cell focus
  wrap.addEventListener('focusin',e=>{
    if(e.target.tagName==='TD'||e.target.tagName==='TH') showTableToolbar(wrap,e.target);
  });
  wrap.addEventListener('focusout',e=>{
    setTimeout(()=>{
      if(!wrap.contains(document.activeElement)) hideTableToolbar();
    },150);
  });
  scheduleAutoSave();
}

let tableToolbarEl=null;
function showTableToolbar(wrap,cell){
  hideTableToolbar();
  const tb=document.createElement('div');
  tb.className='table-toolbar';
  tb.innerHTML=`
    <button onclick="tableAddRow(event)">+ Baris</button>
    <button onclick="tableAddCol(event)">+ Kolom</button>
    <div class="t-sep"></div>
    <button class="danger" onclick="tableDelRow(event)">- Baris</button>
    <button class="danger" onclick="tableDelCol(event)">- Kolom</button>
    <div class="t-sep"></div>
    <button class="danger" onclick="tableDelete(event)">🗑 Hapus Tabel</button>`;
  tb.style.cssText='position:fixed;top:0;left:0;'; // temp
  document.body.appendChild(tb);
  // Position
  const wr=wrap.getBoundingClientRect();
  const tbr=tb.getBoundingClientRect();
  const top=Math.max(4,wr.top-tbr.height-6);
  const left=Math.min(wr.left, window.innerWidth-tbr.width-8);
  tb.style.cssText=`position:fixed;top:${top}px;left:${left}px;z-index:200;`;
  tb.dataset.wrap=wrap.dataset.id||(wrap.dataset.id=uid());
  tableToolbarEl=tb;
  window._activeTableWrap=wrap;
}
function hideTableToolbar(){
  if(tableToolbarEl){tableToolbarEl.remove();tableToolbarEl=null;}
}
function getActiveTable(){return window._activeTableWrap;}
function tableAddRow(e){
  e.preventDefault(); e.stopPropagation();
  const w=getActiveTable(); if(!w) return;
  const tbody=w.querySelector('tbody'); if(!tbody) return;
  const lastRow=tbody.lastElementChild;
  const cols=lastRow?lastRow.querySelectorAll('td').length:3;
  const tr=document.createElement('tr');
  for(let i=0;i<cols;i++){const td=document.createElement('td');td.contentEditable='true';td.textContent='';tr.appendChild(td);}
  tbody.appendChild(tr);
  scheduleAutoSave();
}
function tableAddCol(e){
  e.preventDefault(); e.stopPropagation();
  const w=getActiveTable(); if(!w) return;
  const rows=w.querySelectorAll('tr');
  rows.forEach((row,i)=>{
    const cell=i===0?document.createElement('th'):document.createElement('td');
    cell.contentEditable='true'; cell.textContent=i===0?'Kolom':'';
    row.appendChild(cell);
  });
  scheduleAutoSave();
}
function tableDelRow(e){
  e.preventDefault(); e.stopPropagation();
  const w=getActiveTable(); if(!w) return;
  const tbody=w.querySelector('tbody'); if(!tbody) return;
  const rows=tbody.querySelectorAll('tr');
  if(rows.length>1) rows[rows.length-1].remove();
  else showToast('Minimal 1 baris','error');
  scheduleAutoSave();
}
function tableDelCol(e){
  e.preventDefault(); e.stopPropagation();
  const w=getActiveTable(); if(!w) return;
  const rows=w.querySelectorAll('tr');
  const cols=rows[0]?rows[0].querySelectorAll('th,td').length:0;
  if(cols<=1){showToast('Minimal 1 kolom','error');return;}
  rows.forEach(r=>{const cells=r.querySelectorAll('th,td');if(cells.length)cells[cells.length-1].remove();});
  scheduleAutoSave();
}
function tableDelete(e){
  e.preventDefault(); e.stopPropagation();
  const w=getActiveTable(); if(!w) return;
  w.remove(); hideTableToolbar();
  scheduleAutoSave();
}

// ===== OTHER INSERTS =====
function insertCode(){
  const editor=document.getElementById('editor');
  editor.focus();
  const sel=window.getSelection();
  const selected=sel.toString();
  const pre=document.createElement('pre');
  const code=document.createElement('code');
  code.textContent=selected||'kode di sini';
  pre.appendChild(code);
  if(sel.rangeCount){
    const range=sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(pre);
  } else { editor.appendChild(pre); }
  scheduleAutoSave();
}
function insertHR(){
  document.getElementById('editor').focus();
  document.execCommand('insertHTML',false,'<hr><p><br></p>');
  scheduleAutoSave();
}

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
    // Position the menu right below the button using fixed positioning
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
function openMobileAI(){document.getElementById('ai-sheet').classList.add('open');}
function closeMobileAI(){document.getElementById('ai-sheet').classList.remove('open');}
function openMobileChat(){
  const sheet=document.getElementById('chat-sheet');
  sheet.classList.add('open');
  updateChatCtx();
  // Sync messages from desktop chat history
  renderMobileChatHistory();
}
function closeMobileChat(){document.getElementById('chat-sheet').classList.remove('open');}

function renderMobileChatHistory(){
  if(!ST.activeId) return;
  const hist=ST.chatHistory[ST.activeId]||[];
  const msgsEl=document.getElementById('chat-messages-m');
  msgsEl.innerHTML='';
  if(!hist.length){
    msgsEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px;">Belum ada chat untuk note ini.</div>';
    return;
  }
  hist.forEach(m=>{
    const div=document.createElement('div');
    div.className=`chat-msg ${m.role==='user'?'user':'ai'}`;
    const content=m.role==='assistant'?marked.parse(m.content):escHtml(m.content).replace(/\n/g,'<br>');
    div.innerHTML=`<div class="chat-bubble">${content}</div>`;
    msgsEl.appendChild(div);
  });
  msgsEl.scrollTop=msgsEl.scrollHeight;
}

// ===== SYSTEM PROMPT =====
function buildSysPrompt(){
  const p=ST.persona;
  const styles={casual:'santai dan friendly',professional:'profesional dan formal',concise:'singkat dan to the point',detailed:'detail dan komprehensif',creative:'kreatif dan eksploratif'};
  const langs={id:'Bahasa Indonesia',en:'English',mixed:'mix Bahasa Indonesia dan English'};
  return `Kamu adalah asisten notes cerdas untuk ${p.name}, seorang ${p.role||'pengguna'}.${p.about?`\nTentang mereka: ${p.about}`:''}
Gaya komunikasi: ${styles[p.style]||'natural'}. Gunakan ${langs[p.lang]||'Bahasa Indonesia'}.
Selalu format output dengan markdown yang rapi. Tulis konten yang langsung berguna dan berkualitas tinggi.`;
}

// ===== AI API CALL (via Vercel proxy - fix CORS) =====
async function callAI(messages){
  const{provider,apiKey,model}=ST.ai;
  if(!apiKey) throw new Error('API Key belum diset. Buka Settings ⚙');
  const system=buildSysPrompt();

  const resp=await fetch('/api/ai',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({provider,apiKey,model,messages,system})
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
  const content=document.getElementById('editor').innerText;
  const prompts={
    write:`Tulis konten yang komprehensif untuk note berjudul: "${title}". Format dengan markdown yang rapi.`,
    continue:`Lanjutkan tulisan ini secara natural:\n\n${content}`,
    improve:`Perbaiki tulisan ini dari segi kejelasan dan struktur (pertahankan ide utama):\n\n${content}`,
    summarize:`Buat ringkasan terstruktur dalam bullet points:\n\n${content}`,
    expand:`Elaborasi dengan lebih banyak detail dan contoh:\n\n${content}`,
    bullets:`Konversi menjadi bullet points ringkas:\n\n${content}`,
    table:`Konversi menjadi tabel markdown yang informatif:\n\n${content}`
  };
  const labels={write:'AI menulis...',continue:'AI melanjutkan...',improve:'AI memperbaiki...',summarize:'AI meringkas...',expand:'AI mengembangkan...',bullets:'Mengonversi...',table:'Membuat tabel...'};
  document.getElementById('ai-ltxt').textContent=labels[action];
  document.getElementById('ai-overlay').classList.add('show');
  try{
    const result=await callAI([{role:'user',content:prompts[action]}]);
    const html=marked.parse(result);
    const editor=document.getElementById('editor');
    if(['write','summarize','bullets','table'].includes(action)){
      editor.innerHTML=html;
    } else {
      editor.innerHTML+=html;
    }
    reattachChecklistListeners();
    autoSave();
    showToast('AI selesai ✓','success');
  }catch(err){
    showToast('Error: '+err.message,'error');
  }finally{
    document.getElementById('ai-overlay').classList.remove('show');
  }
}

// ===== DESKTOP CHAT =====
let chatOpen=false;
function toggleChat(){
  chatOpen=!chatOpen;
  document.getElementById('chat-panel').classList.toggle('hidden',!chatOpen);
  updateChatCtx();
}
function updateChatCtx(){
  const note=ST.notes.find(n=>n.id===ST.activeId);
  const txt=note?(note.title||'Untitled'):'Pilih note dulu';
  document.getElementById('chat-ctx-txt').textContent=txt;
  const m=document.getElementById('chat-ctx-txt-m');
  if(m) m.textContent=txt;
}
function onChatKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}}
function onChatKeyM(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatM();}}

async function sendChatCore(msg,msgsEl,inputEl,sendBtn){
  if(!msg) return;
  if(!ST.activeId){showToast('Buka note dulu','error');return;}
  const noteId=ST.activeId;
  if(!ST.chatHistory[noteId]) ST.chatHistory[noteId]=[];
  ST.chatHistory[noteId].push({role:'user',content:msg});
  appendChatMsg(msgsEl,'user',msg);
  inputEl.value=''; inputEl.style.height='auto';
  sendBtn.disabled=true;
  const typing=appendTyping(msgsEl);
  const note=ST.notes.find(n=>n.id===noteId);
  const ctx=`Konteks note aktif:\nJudul: "${note?.title||'Untitled'}"\nIsi:\n${(note?.content||'').replace(/<[^>]*>/g,'').substring(0,2000)}\n---\n`;
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
    sendBtn.disabled=false;
  }
}

function sendChat(){
  const inp=document.getElementById('chat-input');
  const btn=document.getElementById('chat-send-btn');
  const msgs=document.getElementById('chat-messages');
  const emp=document.getElementById('chat-empty');
  if(emp) emp.remove();
  sendChatCore(inp.value.trim(),msgs,inp,btn);
}
function sendChatM(){
  const inp=document.getElementById('chat-input-m');
  const btn=document.getElementById('chat-send-btn-m');
  const msgs=document.getElementById('chat-messages-m');
  sendChatCore(inp.value.trim(),msgs,inp,btn);
}

function appendChatMsg(container,role,content){
  const div=document.createElement('div');
  div.className=`chat-msg ${role}`;
  const ts=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  const rendered=role==='ai'?marked.parse(content):escHtml(content).replace(/\n/g,'<br>');
  div.innerHTML=`<div class="chat-bubble">${rendered}</div><div class="chat-time">${ts}</div>`;
  container.appendChild(div);
  container.scrollTop=container.scrollHeight;
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

// ===== SETTINGS =====
function openSettings(){
  if(!ST.persona) return;
  const p=ST.persona;
  document.getElementById('s-name').value=p.name||'';
  document.getElementById('s-role').value=p.role||'';
  document.getElementById('s-about').value=p.about||'';
  document.getElementById('s-style').value=p.style||'casual';
  document.getElementById('s-lang').value=p.lang||'id';
  document.getElementById('s-apikey').value=ST.ai.apiKey||'';
  document.querySelectorAll('[id^="sp-"]').forEach(b=>b.classList.remove('active'));
  document.getElementById(`sp-${ST.ai.provider}`)?.classList.add('active');
  fillModels('s-model',ST.ai.provider);
  document.getElementById('s-model').value=ST.ai.model;
  document.getElementById('settings-modal').style.display='flex';
}
function settingProvider(p){
  ST.ai.provider=p;
  document.querySelectorAll('[id^="sp-"]').forEach(b=>b.classList.remove('active'));
  document.getElementById(`sp-${p}`)?.classList.add('active');
  fillModels('s-model',p);
}
function saveSettings(){
  ST.persona={...ST.persona,
    name:document.getElementById('s-name').value,
    role:document.getElementById('s-role').value,
    about:document.getElementById('s-about').value,
    style:document.getElementById('s-style').value,
    lang:document.getElementById('s-lang').value
  };
  ST.ai.apiKey=document.getElementById('s-apikey').value;
  ST.ai.model=document.getElementById('s-model').value;
  saveState(); updatePersonaBadge(); closeSettings();
  showToast('Settings tersimpan ✓','success');
}
function closeSettings(){document.getElementById('settings-modal').style.display='none';}

// ===== STORAGE =====
function saveState(){
  localStorage.setItem('quill2',JSON.stringify({notes:ST.notes,templates:ST.templates,folders:ST.folders,persona:ST.persona,ai:ST.ai}));
}
function loadState(){
  try{
    const d=JSON.parse(localStorage.getItem('quill2')||localStorage.getItem('quill_state')||'{}');
    if(d.persona){
      ST.notes=d.notes||[]; ST.templates=d.templates||[];
      ST.folders=d.folders||[];
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

// ===== BOOT =====
fillModels('p-model','google');
if(loadState()){
  document.getElementById('onboarding').style.display='none';
  document.getElementById('app').style.display='flex';
  initApp();
}

// Close table toolbar when clicking outside
document.addEventListener('click',e=>{
  if(tableToolbarEl&&!tableToolbarEl.contains(e.target)&&!e.target.closest('table')){
    hideTableToolbar();
  }
});
