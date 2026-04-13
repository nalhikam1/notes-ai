// PocketBase adapter sudah di-load dari script-pocketbase.js
// window._fb dan window._admin sudah tersedia

/* APP LOGIC */
/* ═══════════════════════════════════════════
           STATE
        ═══════════════════════════════════════════ */
const S = {
  user: null,
  isGuest: false,
  isAdmin: false,
  auditData: [],
  notes: [],
  folders: [],
  active: null,
  sbOpen: true,
  ppOpen: true,
  ctxId: null,
  mediaTab: "image",
  unsub: null,
  saveTO: null,
  savedSel: null,
  savedEdRange: null,
};

const prefs = {
  theme: "dark",
  preset: "matahari",
  fs: 16,
  lh: 1.4,
  hf: "'Playfair Display', serif",
  bf: "'Nunito', sans-serif",
};

// Fungsi sanitasi HTML untuk mencegah XSS
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Sanitasi konten HTML (untuk rich text editor) menggunakan DOMPurify jika tersedia
function sanitizeHTML(html) {
  if (!html) return "";
  if (typeof DOMPurify !== "undefined") {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
    });
  }
  // Fallback: hapus tag berbahaya jika DOMPurify tidak tersedia
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll("script, style, iframe, object, embed, form").forEach((el) => el.remove());
  tmp.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    });
  });
  return tmp.innerHTML;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function fmtD(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return (
    d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }) +
    " " +
    d
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(".", ":")
  );
}
function toast(m, t = 2200) {
  const el = document.getElementById("toast");
  if (!el) {
    alert(m);
    return;
  }
  
  if (window._toastTO) {
    clearTimeout(window._toastTO);
  }
  
  el.textContent = m;
  el.classList.add("on");
  
  window._toastTO = setTimeout(() => {
    el.classList.remove("on");
  }, t);
}

function saveLocal() {
  localStorage.setItem("ikw_notes", JSON.stringify(S.notes));
  localStorage.setItem("ikw_folders", JSON.stringify(S.folders));
  localStorage.setItem("ikw_active", S.active || "");
  localStorage.setItem("ikw_prefs", JSON.stringify(prefs));
}
function loadLocal() {
  try {
    S.notes = JSON.parse(localStorage.getItem("ikw_notes") || "[]");
  } catch {
    S.notes = [];
  }
  try {
    S.folders = JSON.parse(localStorage.getItem("ikw_folders") || "[]");
  } catch {
    S.folders = [];
  }
  S.active = localStorage.getItem("ikw_active") || null;
  try {
    Object.assign(prefs, JSON.parse(localStorage.getItem("ikw_prefs") || "{}"));
  } catch { }
}

let hasUnsaved = false;
let isSyncing = false;
window.addEventListener("beforeunload", (e) => {
  if (hasUnsaved || isSyncing) {
    e.preventDefault();
    e.returnValue = "Beberapa perubahan belum tersimpan ke Cloud. Yakin ingin keluar?";
  }
});

function setSyncDot(s) {
  isSyncing = (s === "spin");
  if (s === "ok") hasUnsaved = false;

  const d = document.getElementById("syncdot");
  if (d) d.className = "sync-dot" + (s === "ok" ? " ok" : s === "spin" ? " spin" : "");

  const st = document.getElementById("st-saved");
  if (st) {
    if (s === "spin") st.textContent = "Menyimpan ke Cloud...";
    else if (s === "ok") st.textContent = "Tersimpan di Cloud";
    else if (hasUnsaved) st.textContent = "Mengetik...";
    else st.textContent = "Offline / Mode Tamu";
  }
}

async function cloudSave(note) {
  if (!S.user || !window._fb) return;
  setSyncDot("spin");
  try {
    await window._fb.saveNote(S.user.uid, note);
    setSyncDot("ok");
  } catch (e) {
    console.error('❌ cloudSave error:', e?.status, e?.message, e?.data);
    setSyncDot("");
  }
}
async function cloudDel(id) {
  if (!S.user || !window._fb) return;
  try {
    await window._fb.deleteNote(S.user.uid, id);
  } catch { }
}
function subscribeCloud() {
  if (!S.user || !window._fb) return;
  if (S.unsub) S.unsub();
  if (S.unsubF) S.unsubF();

  S.unsubF = window._fb.listenFolders(S.user.uid, (cloudFolders) => {
    if (cloudFolders && cloudFolders.length > 0) {
      S.folders = cloudFolders;
      saveLocal();
      renderFolderOpts();
      renderTree();
    }
  });

  S.unsub = window._fb.listenNotes(S.user.uid, (cloudNotes) => {
    // Pisahkan tombstone (catatan yang dihapus di cloud) dari catatan aktif.
    const cloudDeletedIds = new Set();
    cloudNotes.forEach((n) => { if (n._deleted) cloudDeletedIds.add(n.id); });

    const localById = {};
    S.notes.forEach((n) => (localById[n.id] = n));
    const cloudById = {};
    cloudNotes.forEach((n) => { if (!n._deleted) cloudById[n.id] = n; });

    // Dorong catatan lokal ke Firestore jika belum ada di cloud,
    // atau jika versi lokal lebih baru dari versi cloud.
    // Jangan push balik catatan yang sudah dihapus di cloud.
    Object.keys(localById).forEach((id) => {
      const local = localById[id];
      const cloud = cloudById[id];
      if (!local) return;
      if (cloudDeletedIds.has(id)) return; // sudah dihapus di cloud
      if (!cloud || (local.modified || 0) > (cloud.modified || 0)) {
        cloudSave(local);
      }
    });

    const allIds = new Set([
      ...Object.keys(localById),
      ...Object.keys(cloudById),
    ]);
    let activeDeleted = false;
    const merged = [];
    allIds.forEach((id) => {
      // Jika catatan ini dihapus di cloud, hapus dari lokal juga
      if (cloudDeletedIds.has(id)) {
        if (id === S.active) activeDeleted = true;
        return;
      }
      const local = localById[id];
      const cloud = cloudById[id];
      // Jangan timpa catatan yang sedang diedit (hindari cursor lompat)
      if (id === S.active && local) {
        merged.push(local);
        return;
      }
      if (local && cloud) {
        merged.push(
          (cloud.modified || 0) >= (local.modified || 0) ? cloud : local,
        );
      } else {
        merged.push(local || cloud);
      }
    });
    S.notes = merged;
    saveLocal();
    renderTree();
    updateDashboardStats(); // Selalu update angka, bahkan saat editor terbuka

    // Jika catatan yang sedang terbuka dihapus dari device lain, kembali ke dashboard
    if (activeDeleted) {
      S.active = null;
      showEmpty(true);
      showWelcomeIfNeeded();
    } else if (!S.active) {
      showEmpty(true);
    }

    // Open first note if nothing is active
    if (!S.active && S.notes.length > 0) {
      S.active = S.notes[0].id;
      openNote(S.active);
    }

    // Update props panel tanpa reload editor
    if (S.active) {
      const n = S.notes.find((n) => n.id === S.active);
      if (n) {
        document.getElementById("p-title").value = n.title || "";
        updateProps();
      }
    }
    setSyncDot("ok");
  });
}

// Helper loading state untuk tombol auth
function setBtnLoading(btn, loading, originalText) {
  if (!btn) return;
  const wrap = document.querySelector(".auth-wrap");
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="loader"></span> ${originalText || "Memproses..."}`;
    btn.classList.add("loading");
    btn.disabled = true;
    if (wrap) wrap.classList.add("loading-container");
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.classList.remove("loading");
    btn.disabled = false;
    if (wrap) wrap.classList.remove("loading-container");
  }
}


// Enter key untuk submit login/register — hanya pada input auth
document.querySelectorAll(".auth-in").forEach((inp) => {
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const isRegisterTab = document.querySelector('.auth-tab[data-tab="register"]').classList.contains("active");
      if (isRegisterTab) {
        document.getElementById("btn-email-signup")?.click();
      } else {
        document.getElementById("btn-email-signin")?.click();
      }
    }
  });
});

const _btnGuest = document.getElementById("btn-guest");
if (_btnGuest) {
  _btnGuest.onclick = () => {
    enterGuest();
  };
}

// Tab switching for auth
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    if (tabName === 'login') {
      document.getElementById('login-form').style.display = 'flex';
      document.getElementById('register-form').style.display = 'none';
    } else {
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('register-form').style.display = 'flex';
    }
  });
});

// Toggle password visibility - login
const _btnTogglePass = document.getElementById("btn-toggle-pass");
if (_btnTogglePass) {
  _btnTogglePass.onclick = () => {
    const inp = document.getElementById("auth-pass");
    const svg = _btnTogglePass.querySelector('svg');
    if (inp.type === "password") {
      inp.type = "text";
      svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      inp.type = "password";
      svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  };
}

// Toggle password visibility - register pass
const _btnToggleRegPass = document.getElementById("btn-toggle-reg-pass");
if (_btnToggleRegPass) {
  _btnToggleRegPass.onclick = () => {
    const inp = document.getElementById("reg-pass");
    const svg = _btnToggleRegPass.querySelector('svg');
    if (inp.type === "password") {
      inp.type = "text";
      svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      inp.type = "password";
      svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  };
}

// Toggle password visibility - register confirm
const _btnToggleRegConfirm = document.getElementById("btn-toggle-reg-confirm");
if (_btnToggleRegConfirm) {
  _btnToggleRegConfirm.onclick = () => {
    const inp = document.getElementById("reg-pass-confirm");
    const svg = _btnToggleRegConfirm.querySelector('svg');
    if (inp.type === "password") {
      inp.type = "text";
      svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      inp.type = "password";
      svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  };
}

// Enter key handling
document.querySelectorAll('.auth-in').forEach(inp => {
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const isRegisterTab = document.querySelector('.auth-tab[data-tab="register"]').classList.contains('active');
      if (isRegisterTab) {
        document.getElementById("btn-email-signup").click();
      } else {
        document.getElementById("btn-email-signin").click();
      }
    }
  });
});

// Autentikasi Email / Kata Sandi
const _btnGoogleSignIn = document.getElementById("btn-google-signin");

if (_btnGoogleSignIn) {
  _btnGoogleSignIn.onclick = async () => {
    if (!window._pbReady) { 
      toast("Backend belum dikonfigurasi", 3000); 
      return; 
    }
    
    setBtnLoading(_btnGoogleSignIn, true, "Mengalihkan ke Google...");
    
    try {
      const user = await window._fb.signInGoogle();
      if (user) {
        enterUser(user);
        toast("Selamat datang, " + (user.displayName || user.email) + "!", 3000);
      }
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user') {
        toast("Login Google dibatalkan", 3000);
      } else if (e.code === 'auth/oauth-failed') {
        toast("Login Google gagal. Cek konfigurasi OAuth.", 5000);
      } else {
        toast("Gagal login dengan Google: " + (e.message || 'Error'), 4000);
      }
    } finally {
      setBtnLoading(_btnGoogleSignIn, false);
    }
  };
}

// Handle OAuth redirect callback and auth state on page load
window.addEventListener("load", () => {
  if (window._pbReady && window._pb) {
    // Cek apakah user sudah authenticated (misal dari OAuth redirect)
    if (window._pb.authStore && window._pb.authStore.isValid && window._pb.authStore.model) {
      // User sudah login dari redirect, langsung masuk ke app
      const model = window._pb.authStore.model;
      const user = {
        uid: model.id,
        email: model.email,
        displayName: model.name || model.email,
        emailVerified: model.verified,
        photoURL: model.avatarUrl || null
      };
      enterUser(user);
      toast("Selamat datang, " + (user.displayName || user.email) + "!", 3000);
      return;
    }

    // Listen untuk perubahan auth state di masa depan
    if (window._fb) {
      window._fb.onAuth((u) => {
        if (u && document.getElementById("auth").style.display !== "none") {
          enterUser(u);
          toast("Selamat datang, " + (u.displayName || u.email) + "!", 3000);
        }
      });
    }
  }
});

const _btnSignIn = document.getElementById("btn-email-signin");

if (_btnSignIn) {
  _btnSignIn.onclick = async () => {
    if (!window._pbReady) { 
      toast("Backend belum dikonfigurasi", 3000); 
      return; 
    }
    
    const email = document.getElementById("auth-email").value.trim();
    const pass = document.getElementById("auth-pass").value;
    
    if (!email || !pass) {
      toast("Isi email dan kata sandi terlebih dahulu!", 3000); 
      return; 
    }
    
    setBtnLoading(_btnSignIn, true, "Masuk...");
    
    try {
      const user = await window._fb.signIn(email, pass);
      if (!user.displayName) user.displayName = email;
      enterUser(user);
      toast("Selamat datang, " + (user.displayName || email) + "!", 3000);
    } catch (e) {
      toast("Email atau kata sandi salah!", 4000);
    } finally {
      setBtnLoading(_btnSignIn, false);
    }
  };
}

const _btnSignUp = document.getElementById("btn-email-signup");

if (_btnSignUp) {
  _btnSignUp.onclick = async () => {
    if (!window._pbReady) { 
      toast("Backend belum dikonfigurasi", 4000); 
      return; 
    }
    
    const email = document.getElementById("reg-email").value.trim();
    const pass = document.getElementById("reg-pass").value;
    const passConfirm = document.getElementById("reg-pass-confirm").value;
    
    if (!email || !pass) {
      toast("Isi email dan kata sandi terlebih dahulu!", 3000); 
      return; 
    }
    
    if (pass.length < 8) {
      toast("Kata sandi minimal 8 karakter!", 3000);
      return;
    }
    
    if (pass !== passConfirm) {
      toast("Kata sandi tidak sama!", 3000);
      return;
    }
    
    setBtnLoading(_btnSignUp, true, "Mendaftar...");
    
    try {
      const user = await window._fb.signUp(email, pass);
      if (!user.displayName) user.displayName = email;
      enterUser(user);
      toast("Akun berhasil dibuat! Selamat datang, " + email + "!", 4000);
    } catch (e) {
      toast("Email sudah terdaftar atau data tidak valid!", 4000);
    } finally {
      setBtnLoading(_btnSignUp, false);
    }
  };
}


document.getElementById("btn-signout").onclick = async () => {
  if (!S.isGuest && window._fb) await window._fb.signOut();
  S.user = null;
  S.isGuest = false;
  S.isAdmin = false;
  S.auditData = [];
  if (S.unsub) S.unsub();
  S.notes = [];
  S.folders = [];
  S.active = null;
  const adminSec = document.getElementById("admin-section");
  if (adminSec) adminSec.style.display = "none";
  document.getElementById("app").classList.remove("on");
  document.getElementById("auth").style.display = "flex";
};

function enterGuest() {
  S.isGuest = true;
  S.user = null;
  loadLocal();
  // Load guest name from localStorage
  const guestName = localStorage.getItem('guestName') || 'Guest';
  showApp(guestName, null);
  setSyncDot("");
  const banner = document.getElementById("guest-banner");
  if (banner) banner.classList.add("on");
}

document.getElementById('guest-banner-close').addEventListener('click', () => {
  document.getElementById('guest-banner').classList.remove('on');
});

document.getElementById('guest-banner-login').addEventListener('click', (e) => {
  e.preventDefault();
  // Close banner and trigger sign out to show auth screen
  document.getElementById('guest-banner').classList.remove('on');
  document.getElementById('btn-signout').click();
});

async function enterUser(u) {
  S.user = u;
  S.isGuest = false;
  loadLocal();
  const banner = document.getElementById("guest-banner");
  if (banner) banner.classList.remove("on");
  if (window._fb && S.folders.length > 0) {
    await window._fb.saveFolders(u.uid, S.folders);
    saveLocal();
  }
  // Load custom profile (displayName) from PocketBase
  const profile = await window._fb.getProfile(u.uid);
  // Merge into the in‑memory user object
  S.user.displayName = profile.displayName || u.displayName || u.email;

  // Show UI immediately, then load cloud data
  showApp(S.user.displayName || S.user.email, u.photoURL);
  
  // Subscribe to cloud — this will populate S.notes and S.folders
  // and call showEmpty(true) to update dashboard counts
  subscribeCloud();
  setSyncDot("ok");

  // Cek status admin
  if (window._admin) {
    S.isAdmin = window._admin.checkAdmin(u);
    const adminSec = document.getElementById("admin-section");
    if (adminSec) adminSec.style.display = S.isAdmin ? "" : "none";
    if (S.isAdmin) toast("Mode Admin aktif");
  }
}
function showApp(name, avatarUrl) {
  document.getElementById("auth").style.display = "none";
  document.getElementById("app").classList.add("on");
  document.getElementById("ed").dataset.placeholder = "Mulai Menulis, Ketik / untuk perintah, coba /templates";
  const av = document.getElementById("av");
  av.innerHTML = avatarUrl
    ? `<img src="${avatarUrl}" alt="">`
    : (name || "G").charAt(0).toUpperCase();
  // Show stored guest name if no custom display name
  const guestStored = (!S.user && localStorage.getItem('guestName')) ? localStorage.getItem('guestName') : null;
  document.getElementById("uname").textContent = name || guestStored || "Guest";
  const editBtn = document.getElementById('btn-edit-profile');
  if (editBtn) editBtn.style.display = 'inline-block';

  // Pastikan sidebar terbuka di desktop
  if (window.innerWidth > 900) {
    S.sbOpen = true;
    S.ppOpen = true;
    document.getElementById("sb").classList.remove("off");
    document.getElementById("pp").classList.remove("off");
  }

  applyPrefs();
  renderFolderOpts();
  renderTree();

  // Jika tidak ada catatan DAN belum subscribe ke cloud, tampilkan layar kosong
  // Setelah cloud data datang, subscribeCloud callback akan update dashboard
  if ((!S.notes || S.notes.length === 0) && !window._fb) {
    showEmpty(true);
    return;
  }

  // Jika ada catatan, buka yang pertama
  if (S.notes && S.notes.length > 0) {
    if (!S.active) S.active = S.notes[0].id;
    const n = S.notes.find((n) => n.id === S.active);
    if (n) {
      openNote(n.id);
      return;
    }
  }
  
  // Cloud user: show dashboard with current data (will update when cloud data arrives)
  showEmpty(true);
  showWelcomeIfNeeded();
}

// -----------------------------------------------------
// Show welcome overlay (once per session)
function showWelcomeIfNeeded() {
  if (sessionStorage.getItem('welcomeSeen')) return;
  const name = S.user?.displayName || S.user?.email || 'Tamu';
  const msgEl = document.getElementById('welcome-msg');
  if (msgEl) msgEl.textContent = `Hai ${name}, selamat datang di Jurnal Persaudaraan Matahari!`;
  openModal('modal-welcome');
  sessionStorage.setItem('welcomeSeen', '1');
}

// Close button for welcome modal
document.getElementById('welcome-close').addEventListener('click', () => closeModal('modal-welcome'));
// Edit profile button – open modal
document.getElementById('btn-edit-profile').addEventListener('click', async () => {
  if (S.user) {
    // Logged‑in user – fetch from PocketBase
    const profile = await window._fb.getProfile(S.user.uid);
    document.getElementById('profile-name').value = profile.displayName || '';
    openModal('modal-profile');
  } else {
    // Guest / admin without auth – use local storage
    const guestName = localStorage.getItem('guestName') || '';
    document.getElementById('profile-name').value = guestName;
    openModal('modal-profile');
  }
});
// Save profile changes
document.getElementById('profile-save').addEventListener('click', async () => {
  const name = document.getElementById('profile-name').value.trim();
  if (S.user) {
    // Update profile di PocketBase
    try {
      await window._fb.updateProfile(S.user.uid, { displayName: name });
      S.user.displayName = name; // update in‑memory
    } catch (e) {
      // Failed to update profile
      toast("Gagal memperbarui profil di server");
    }
  } else {
    // Store guest name locally
    localStorage.setItem('guestName', name);
  }
  document.getElementById('uname').textContent = name || (S.user ? S.user.email : 'Guest');
  closeModal('modal-profile');
  toast('Profil diperbarui');
});

// Enter di input profil → simpan
document.getElementById('profile-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('profile-save').click();
  }
});


function applyPrefs() {
  setTheme(prefs.theme, true);
  setPreset(prefs.preset || "matahari", true);
  applyEditorFS(prefs.fs, true);
  applyEditorLH(prefs.lh, true);
  applyHeadingFont(prefs.hf, true);
  if (prefs.bf) applyBodyFont(prefs.bf, true);
  document.getElementById("set-fs").value = prefs.fs;
  document.getElementById("set-fs-val").value = prefs.fs + "px";
  document.getElementById("set-lh").value = prefs.lh;
  document.getElementById("set-lh-val").value = prefs.lh;
  document.getElementById("set-hf").value = prefs.hf;
  const bfEl = document.getElementById("set-bf");
  if (bfEl && prefs.bf) bfEl.value = prefs.bf;
}
function setTheme(t, silent = false) {
  prefs.theme = t;
  const resolved =
    t === "auto"
      ? matchMedia("(prefers-color-scheme:light)").matches
        ? "light"
        : "dark"
      : t;
  document.documentElement.setAttribute("data-theme", resolved);
  document
    .querySelectorAll(".topt")
    .forEach((el) => el.classList.toggle("on", el.dataset.th === t));
  if (!silent) {
    saveLocal();
    toast("Theme: " + t);
  }
}
function setPreset(p, silent = false) {
  prefs.preset = p;
  document.documentElement.setAttribute("data-preset", p);
  document.querySelectorAll(".acopt").forEach((el) => {
    el.classList.toggle("on", el.dataset.preset === p);
  });
  if (!silent) {
    saveLocal();
    toast("Tema: " + p.charAt(0).toUpperCase() + p.slice(1));
  }
}
function applyEditorFS(v, silent = false) {
  prefs.fs = parseFloat(v);
  document.getElementById("ed").style.setProperty("--editor-fs", v + "px");
  document.getElementById("set-fs-val").value = v + "px";
  document.getElementById("set-fs").value = v;
  if (!silent) saveLocal();
}
function applyEditorLH(v, silent = false) {
  prefs.lh = parseFloat(v);
  document.getElementById("ed").style.setProperty("--editor-lh", v);
  document.getElementById("set-lh-val").value = v;
  document.getElementById("set-lh").value = v;
  if (!silent) saveLocal();
}
function applyHeadingFont(v, silent = false) {
  prefs.hf = v;
  const style = document.createElement("style");
  style.id = "hf-override";
  document.getElementById("hf-override")?.remove();
  style.textContent = `#ed h1,#ed h2,#ed h3,#ed h4,#ed h5,#ed h6{font-family:${v}!important}`;
  document.head.appendChild(style);
  const hfEl = document.getElementById("set-hf");
  if (hfEl) hfEl.value = v;
  if (!silent) saveLocal();
}

function applyBodyFont(v, silent = false) {
  prefs.bf = v;
  document.documentElement.style.setProperty("--fbody", v);
  document.documentElement.style.setProperty("--fui", v);
  const btEl = document.getElementById("set-bf");
  if (btEl) btEl.value = v;
  if (!silent) saveLocal();
}

document.getElementById("btn-settings").onclick = () => {
  document.getElementById("settings").classList.add("on");
  document.getElementById("set-overlay").classList.add("on");
  // Pastikan admin section selalu tampil jika user adalah admin
  const adminSec = document.getElementById("admin-section");
  if (adminSec) adminSec.style.display = S.isAdmin ? "" : "none";
};
function closeSettings() {
  document.getElementById("settings").classList.remove("on");
  document.getElementById("set-overlay").classList.remove("on");
}
document.getElementById("set-overlay").onclick = closeSettings;
document.getElementById("btn-close-settings").onclick = closeSettings;

function exportMD() {
  const n = S.notes.find((n) => n.id === S.active);
  if (!n) {
    toast("No note open");
    return;
  }
  const ed = document.getElementById("ed");
  let md = "# " + n.title + "\n\n";
  md += htmlToMD(ed.innerHTML);
  const a = Object.assign(document.createElement("a"), {
    href: "data:text/markdown;charset=utf-8," + encodeURIComponent(md),
    download: (n.title || "note") + ".md",
  });
  a.click();
  toast("Exported as Markdown");
}
function exportHTML() {
  const n = S.notes.find((n) => n.id === S.active);
  if (!n) {
    toast("No note open");
    return;
  }
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${n.title}</title><style>body{max-width:740px;margin:60px auto;font-family:Georgia,serif;font-size:17px;line-height:1.8;color:#1a1a1a}</style></head><body><h1>${n.title}</h1>${n.content || ""}</body></html>`;
  const a = Object.assign(document.createElement("a"), {
    href: "data:text/html;charset=utf-8," + encodeURIComponent(content),
    download: (n.title || "note") + ".html",
  });
  a.click();
  toast("Exported as HTML");
}
function exportPDF() {
  const n = S.notes.find((n) => n.id === S.active);
  if (!n) {
    toast("No note open");
    return;
  }
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet">
  <style>
    body{max-width:800px;margin:0 auto;font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.85;color:#1a1914;padding:0 1rem}
    h1,h2,h3,h4,h5,h6{font-family:'Playfair Display',serif;line-height:1.2;margin:1.2em 0 .4em;color:#1a1914}
    h1{font-size:2.4em;font-weight:900}h2{font-size:1.8em}h3{font-size:1.4em}
    p{margin-bottom:.6em}blockquote{border-left:3px solid #d4a84b;padding:10px 0 10px 18px;margin:16px 0;color:#6b675e;font-style:italic}
    code{font-family:monospace;font-size:.85em;background:#f0ece4;border-radius:3px;padding:1px 5px}
    pre{background:#f0ece4;border-radius:6px;padding:16px;overflow-x:auto}
    img{max-width:100%;border-radius:6px}
    table{width:100%;border-collapse:collapse}
    th,td{padding:8px 12px;border:1px solid #dedad0;text-align:left}
    th{background:#f0ece4;font-weight:600}
    @media print{body{margin:0;padding:0 0.5cm} .yt-wrap, .audio-wrap{display:none}}
  </style></head>
  <body><h1 style="margin-top:0">${n.title}</h1>${n.content || ""}
  <script>window.onload=()=>window.print()<\/script></body></html>`;
  const win = window.open("", "_blank");
  win.document.write(content);
  win.document.close();
  toast("Membuka print dialog…");
}

function htmlToMD(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  function walk(node, ctx) {
    if (node.nodeType === 3) return node.textContent;

    const t = node.tagName?.toLowerCase();
    if (!t) return "";

    if (t === "div" && node.classList) {
      if (node.classList.contains("yt-wrap")) {
        const ytid = node.dataset.ytid;
        return "\nhttps://www.youtube.com/watch?v=" + ytid + "\n";
      }
      if (node.classList.contains("audio-wrap")) {
        const audio = node.querySelector("audio");
        const src = audio ? audio.src : "";
        const displaySrc = src.startsWith("data:") ? "[base64-audio]" : src;
        const labelEl = node.querySelector(".audio-label");
        const label = labelEl ? labelEl.textContent : "Audio";
        return "\n[audio: " + label + "](" + displaySrc + ")\n";
      }
      if (node.classList.contains("tbl-ctrl-wrap")) {
        const tbl = node.querySelector("table");
        return tbl ? walk(tbl, ctx) : "";
      }
    }

    const inner = () =>
      Array.from(node.childNodes)
        .map((c) => walk(c, ctx))
        .join("");

    switch (t) {
      case "h1":
        return "\n# " + inner() + "\n";
      case "h2":
        return "\n## " + inner() + "\n";
      case "h3":
        return "\n### " + inner() + "\n";
      case "h4":
        return "\n#### " + inner() + "\n";
      case "h5":
        return "\n##### " + inner() + "\n";
      case "h6":
        return "\n###### " + inner() + "\n";
      case "strong":
      case "b":
        return "**" + inner() + "**";
      case "em":
      case "i":
        return "_" + inner() + "_";
      case "u":
        return inner();
      case "s":
        return "~~" + inner() + "~~";
      case "p":
        return "\n" + inner() + "\n";
      case "br":
        return "\n";
      case "blockquote":
        return "\n> " + inner().trim().split("\n").join("\n> ") + "\n";
      case "code":
        return ctx === "pre" ? inner() : "`" + inner() + "`";
      case "pre": {
        const codeEl = node.querySelector("code");
        const codeText = codeEl ? codeEl.textContent : node.textContent;
        return "\n```\n" + codeText + "\n```\n";
      }
      case "ul":
        return (
          "\n" +
          Array.from(node.querySelectorAll(":scope > li"))
            .map(
              (li) =>
                "- " +
                Array.from(li.childNodes)
                  .map((c) => walk(c, "li"))
                  .join("")
                  .trim(),
            )
            .join("\n") +
          "\n"
        );
      case "ol":
        return (
          "\n" +
          Array.from(node.querySelectorAll(":scope > li"))
            .map(
              (li, i) =>
                i +
                1 +
                ". " +
                Array.from(li.childNodes)
                  .map((c) => walk(c, "li"))
                  .join("")
                  .trim(),
            )
            .join("\n") +
          "\n"
        );
      case "li":
        return inner();
      case "input": {
        if (node.type === "checkbox") return node.checked ? "[x] " : "[ ] ";
        return "";
      }
      case "a": {
        if (node.classList.contains("backlink-pill")) return node.textContent;
        const href = node.getAttribute("href") || "";
        return "[" + inner() + "](" + href + ")";
      }
      case "img": {
        const src = node.src || "";
        const alt = node.alt || "image";
        const displaySrc = src.startsWith("data:") ? "[base64-image]" : src;
        return "![" + alt + "](" + displaySrc + ")";
      }
      case "hr":
        return "\n---\n";
      case "table": {
        const rows = Array.from(node.querySelectorAll("tr"));
        if (!rows.length) return "";
        const md = rows
          .map((row, i) => {
            const cells = Array.from(row.querySelectorAll("th,td")).map((c) =>
              c.innerText.trim(),
            );
            const line = "| " + cells.join(" | ") + " |";
            if (i === 0)
              return line + "\n|" + cells.map(() => " --- |").join("");
            return line;
          })
          .join("\n");
        return "\n" + md + "\n";
      }
      case "div":
      case "span":
        return inner();
      default:
        return inner();
    }
  }

  let md = "";
  tmp.childNodes.forEach((n) => (md += walk(n, "")));
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

async function resetAllData() {
  if (!confirm("Hapus SEMUA catatan dan folder? Tindakan ini tidak bisa dibatalkan.")) return;
  // Hapus dari PocketBase jika login
  if (S.user && window._fb) {
    toast("Menghapus data dari Cloud...");
    for (const n of S.notes) {
      try { await window._fb.deleteNote(S.user.uid, n.id); } catch {}
    }
    try { await window._fb.saveFolders(S.user.uid, []); } catch {}
  }
  S.notes = [];
  S.folders = [];
  S.active = null;
  S.auditData = [];
  localStorage.removeItem("ikw_notes");
  localStorage.removeItem("ikw_folders");
  renderTree();
  showEmpty(true);
  toast("Semua data berhasil dihapus");
}

// State simpan folder ID untuk catatan baru
let _pendingNoteFolderId = null;

/* SIDEBAR ACTIONS */
let _inlineType = "note"; // "note" or "folder"

const btnNew = document.getElementById("btn-new");
const btnFolder = document.getElementById("btn-folder");
const btnTpl = document.getElementById("btn-tpl");
const btnDashboard = document.getElementById("btn-dashboard");
const inlineCreate = document.getElementById("sb-inline-create");
const inlineInput = document.getElementById("sb-inline-input");
const inlineSave = document.getElementById("sb-inline-save");
const inlineCancel = document.getElementById("sb-inline-cancel");

function showInlineCreate(type) {
  _inlineType = type;
  inlineCreate.classList.add("on");
  inlineInput.placeholder = type === "note" ? "Judul catatan baru..." : "Nama folder baru...";
  inlineInput.value = "";
  setTimeout(() => inlineInput.focus(), 50);
}

function hideInlineCreate() {
  inlineCreate.classList.remove("on");
  inlineInput.value = "";
}

btnFolder?.addEventListener("click", () => showInlineCreate("folder"));
btnTpl?.addEventListener("click", () => {
  _pendingNoteFolderId = null;
  renderTemplates();
  const hint = document.getElementById('tpl-folder-hint');
  if (hint) hint.style.display = 'none';
  document.getElementById("modal-tpl").classList.add("on");
});
btnDashboard?.addEventListener("click", () => {
  goToDashboard();
});

inlineCancel?.addEventListener("click", hideInlineCreate);

inlineSave?.addEventListener("click", () => {
  const val = inlineInput.value.trim();
  if (!val) {
    toast("Nama tidak boleh kosong");
    inlineInput.focus();
    return;
  }
  if (_inlineType === "note") {
    _buildNote(val, "", _pendingNoteFolderId);
    _pendingNoteFolderId = null;
  } else {
    const folder = { id: genId(), name: val };
    S.folders.push(folder);
    saveLocal();
    if (window._fb && S.user) window._fb.saveFolders(S.user.uid, S.folders).then(saveLocal);
    renderFolderOpts();
    renderTree();
    toast("Folder dibuat");
  }
  hideInlineCreate();
});

inlineInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") inlineSave.click();
  if (e.key === "Escape") hideInlineCreate();
});

function createNote(folderId = null, templateObj = null) {
  if (templateObj) {
    _buildNote(templateObj.name || "Untitled", templateObj.content || "", folderId);
    return;
  }
  
  // Buka sidebar jika tertutup (untuk mobile)
  const sidebar = document.getElementById("sb");
  if (sidebar && sidebar.classList.contains("off")) {
    sidebar.classList.remove("off");
  }
  
  showInlineCreate("note");
  _pendingNoteFolderId = folderId;
}

function createNoteQuick() {
  _buildNote("Tanpa Judul", "", null);
}

function _buildNote(title, content, folderId) {
  const note = {
    id: genId(),
    title: title.trim() || "Tanpa Judul",
    content: content || "",
    folder: folderId || null,
    tags: [],
    status: "",
    created: Date.now(),
    modified: Date.now(),
  };
  S.notes.unshift(note);
  saveLocal();
  if (S.user) cloudSave(note);
  renderTree();
  openNote(note.id);
  setTimeout(() => {
    const ed = document.getElementById("ed");
    ed.focus();
    const r = document.createRange();
    r.selectNodeContents(ed);
    r.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    updatePlaceholderVisibility(); // Check placeholder on new note
  }, 50);
  toast("Catatan dibuat");
}

// Handler tombol "Buat Catatan" di modal
document.getElementById("mn-ok").onclick = () => {
  const title = document.getElementById("mn-title-in").value.trim();
  if (!title) {
    toast("Isi judul terlebih dahulu");
    document.getElementById("mn-title-in").focus();
    return;
  }
  closeModal("modal-new-note");
  _buildNote(title, "", _pendingNoteFolderId);
  _pendingNoteFolderId = null;
};

// Handler Enter di input judul
document.getElementById("mn-title-in").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("mn-ok").click();
  }
  if (e.key === "Escape") {
    closeModal("modal-new-note");
  }
});

async function deleteNote(id) {
  if (!confirm("Hapus catatan ini?")) return;
  S.notes = S.notes.filter((n) => n.id !== id);
  if (S.user) await cloudDel(id);
  S.auditData = S.auditData.filter((n) => n.id !== id);
  saveLocal();
  if (S.active === id) {
    S.active = null;
    showEmpty(true);
    showWelcomeIfNeeded();
  }
  renderTree();
  toast("Catatan dihapus");
}

function duplicateNote(id) {
  const src = S.notes.find((n) => n.id === id);
  if (!src) return;
  const copy = {
    ...src,
    id: genId(),
    title: src.title + " (copy)",
    created: Date.now(),
    modified: Date.now(),
  };
  S.notes.unshift(copy);
  saveLocal();
  if (S.user) cloudSave(copy);
  renderTree();
  openNote(copy.id);
  toast("Duplicated");
}

function renameNote(id) {
  const n = S.notes.find((n) => n.id === id);
  if (!n) return;
  const name = prompt("Rename:", n.title);
  if (name === null) return;
  n.title = name.trim() || "Untitled";
  n.modified = Date.now();
  saveLocal();
  if (S.user) cloudSave(n);
  renderTree();
  updateProps();
  toast("Renamed");
}

function openNote(id) {
  const n = S.notes.find((n) => n.id === id);
  if (!n) return;
  if (S.active && S.active !== id) {
    const cur = S.notes.find((n) => n.id === S.active);
    if (cur) {
      cur.content = document.getElementById("ed").innerHTML;
      saveLocal();
      if (S.user) cloudSave(cur);
    }
  }
  S.active = id;
  showEmpty(false);
  loadNote(n);
  renderTree();
  updateProps();
  document.getElementById("bc").innerHTML =
    (n.folder
      ? `<span>${escapeHTML(getFolderName(n.folder))}</span><span class="bc-sep">›</span>`
      : "") + `<span>${escapeHTML(n.title)}</span>`;
}

function loadNote(n) {
  const ed = document.getElementById("ed");
  ed.innerHTML = sanitizeHTML(n.content || "");
  updatePlaceholderVisibility(); // Check placeholder on note load
  wrapTables();
  updateWC();
  ensureTrailingParagraph();
  updateTOC();
  ed.querySelectorAll(".yt-wrap[data-ytid]").forEach((wrap) => {
    wrap.setAttribute("contenteditable", "false"); // Paksa attribute keamanan
    let thumb = wrap.querySelector(".yt-thumb-wrap");
    if (!wrap.querySelector("iframe") && !thumb) {
      const id = wrap.dataset.ytid;
      if (!id) return;
      wrap.innerHTML = `<div class="yt-thumb-wrap">
        <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="YouTube" onerror="this.style.opacity=0">
        <div class="yt-play-btn"><svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div>
      </div>`;
      thumb = wrap.querySelector(".yt-thumb-wrap");
    }
    if (thumb && !thumb.dataset.ready) {
      thumb.addEventListener("click", () => loadYTPlayer(wrap));
      thumb.dataset.ready = "true";
    }
  });
}

function getFolderName(id) {
  return S.folders.find((f) => f.id === id)?.name || "";
}

document.getElementById("ed").addEventListener("input", () => {
  if (!S.active) return;
  updatePlaceholderVisibility(); // Check placeholder on input
  const n = S.notes.find((n) => n.id === S.active);
  if (!n) return;
  ensureTrailingParagraph();
  updateTOC();
  n.content = document.getElementById("ed").innerHTML;
  n.modified = Date.now();
  updateWC();
  updateProps();

  hasUnsaved = true;
  const st = document.getElementById("st-saved");
  if (st && S.user) st.textContent = "Belum tersimpan...";

  clearTimeout(S.saveTO);
  S.saveTO = setTimeout(() => {
    saveLocal();
    if (S.user) cloudSave(n);
    document.getElementById("st-saved").textContent =
      "Saved " + new Date().toLocaleTimeString();
  }, 700);
  checkSlash();
  processBacklinks();
});

function ensureTrailingParagraph() {
  const ed = document.getElementById("ed");
  if (!ed) return;
  const last = ed.lastElementChild;
  const isOk = last && last.tagName === "P" && !last.querySelector("img, audio, iframe, table, .yt-wrap");
  if (!isOk) {
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    ed.appendChild(p);
  }
}

function updateWC() {
  const t = document.getElementById("ed").innerText || "";
  const w = t.trim() ? t.trim().split(/\s+/).length : 0;
  document.getElementById("st-words").textContent = w + " words";
  document.getElementById("st-chars").textContent = t.length + " chars";
  const el = document.getElementById("p-wc");
  if (el) el.textContent = w + " words · " + t.length + " chars";
}

function updateTOC() {
  const ed = document.getElementById("ed");
  const tocEl = document.getElementById("p-toc");
  if (!ed || !tocEl) return;
  const headers = ed.querySelectorAll("h1, h2, h3, h4, h5, h6");
  if (headers.length === 0) {
    tocEl.innerHTML = "—";
    return;
  }
  let html = '<div style="display:flex;flex-direction:column;gap:6px;padding-bottom:12px;">';
  headers.forEach((h, i) => {
    if (!h.id) h.id = "h-" + Math.random().toString(36).substring(2, 9);
    const level = parseInt(h.tagName.substring(1)) - 1;
    const pad = level * 10 + "px";
    html += `<div style="padding-left:${pad}; cursor:pointer;" class="toc-item" onclick="document.getElementById('${h.id}').scrollIntoView({behavior:'smooth', block:'start'})">${escapeHTML(h.textContent || "Untitled")}</div>`;
  });
  html += '</div>';
  tocEl.innerHTML = html;
}

function processBacklinks() {
  clearTimeout(processBacklinks._t);
  processBacklinks._t = setTimeout(() => {
    const ed = document.getElementById("ed");
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (
          n.parentNode.closest(".backlink-pill,.yt-wrap,.audio-wrap,pre,code")
        )
          return NodeFilter.FILTER_REJECT;
        return /\[\[[^\]]+\]\]/.test(n.textContent)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const targets = [];
    while (walker.nextNode()) targets.push(walker.currentNode);
    targets.forEach((textNode) => {
      const frag = document.createDocumentFragment();
      const parts = textNode.textContent.split(/(\[\[[^\]]+\]\])/);
      let changed = false;
      parts.forEach((part) => {
        const m = part.match(/^\[\[([^\]]+)\]\]$/);
        if (m) {
          changed = true;
          const title = m[1];
          const note = S.notes.find(
            (n) => n.title.toLowerCase() === title.toLowerCase(),
          );
          const a = document.createElement("a");
          a.className = "backlink-pill";
          a.href = "#";
          a.dataset.note = note ? note.id : "";
          a.textContent = "[[" + title + "]]";
          a.addEventListener("click", (e) => {
            e.preventDefault();
            if (a.dataset.note) openNote(a.dataset.note);
          });
          frag.appendChild(a);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      });
      if (changed) textNode.parentNode.replaceChild(frag, textNode);
    });
    updateBacklinksPanel();
  }, 1500);
}

function updateBacklinksPanel() {
  if (!S.active) return;
  const inbound = S.notes.filter(
    (n) =>
      n.id !== S.active &&
      n.content &&
      n.content.includes('data-note="' + S.active + '"'),
  );
  const sec = document.getElementById("pp-bl-sec");
  const list = document.getElementById("pp-bl");
  if (inbound.length) {
    sec.style.display = "";
    list.innerHTML = inbound
      .map(
        (n) => `<div class="bl-item" onclick="openNote('${n.id}')">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      ${escapeHTML(n.title)}
    </div>`,
      )
      .join("");
  } else {
    sec.style.display = "none";
  }
}

function wrapTables() {
  const ed = document.getElementById("ed");
  ed.querySelectorAll("table").forEach((tbl) => {
    let wrap = tbl.closest(".tbl-ctrl-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "tbl-ctrl-wrap";
      wrap.setAttribute("contenteditable", "false");
      tbl.parentNode.insertBefore(wrap, tbl);
      wrap.appendChild(tbl);
      tbl.setAttribute("contenteditable", "true");

      const addRow = document.createElement("button");
      addRow.className = "tbl-row-add";
      addRow.innerHTML = "+ Add Row";

      const addCol = document.createElement("button");
      addCol.className = "tbl-col-add";
      addCol.innerHTML = "+ Col";

      wrap.appendChild(addRow);
      wrap.appendChild(addCol);
    }

    const btnRow = wrap.querySelector(".tbl-row-add");
    const btnCol = wrap.querySelector(".tbl-col-add");

    if (btnRow && !btnRow.dataset.ready) {
      btnRow.addEventListener("click", () => {
        const lastRow = tbl.querySelector("tbody tr:last-child");
        if (!lastRow) return;
        const newRow = lastRow.cloneNode(true);
        newRow
          .querySelectorAll("td, th")
          .forEach((td) => (td.textContent = ""));
        tbl.querySelector("tbody").appendChild(newRow);
        toast("Row added");
      });
      btnRow.dataset.ready = "true";
    }

    if (btnCol && !btnCol.dataset.ready) {
      btnCol.addEventListener("click", () => {
        tbl.querySelectorAll("tr").forEach((row) => {
          const isHead = row.closest("thead") !== null;
          const cell = document.createElement(isHead ? "th" : "td");
          row.appendChild(cell);
        });
        toast("Column added");
      });
      btnCol.dataset.ready = "true";
    }
  });
}

let slashNode = null,
  slashOff = 0,
  _slashDismissed = false;

function checkSlash() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const r = sel.getRangeAt(0);
  const txt = r.startContainer.textContent || "";
  const before = txt.slice(0, r.startOffset);
  const si = before.lastIndexOf("/");
  if (si === -1 || before.slice(si).includes(" ")) {
    hideSlash();
    _slashDismissed = false;
    return;
  }
  if (_slashDismissed) return;
  const q = before.slice(si + 1).toLowerCase();
  slashNode = r.startContainer;
  slashOff = si;
  const rect = r.getBoundingClientRect();
  showSlash(rect, q);
}

function showSlash(rect, q) {
  const menu = document.getElementById("slash");
  let any = false;
  let first = true;

  menu.querySelectorAll(".si").forEach((el) => {
    el.classList.remove("foc");
    const show =
      !q ||
      el.querySelector(".si-lbl").textContent.toLowerCase().includes(q) ||
      el.dataset.t.includes(q);
    el.style.display = show ? "flex" : "none";
    if (show) {
      any = true;
      if (first) {
        el.classList.add("foc");
        first = false;
      }
    }
  });

  if (!any) {
    hideSlash();
    return;
  }

  // Mobile-friendly positioning
  const isMobile = window.innerWidth <= 768;
  const menuHeight = 280; // Approximate menu height
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  
  // Position horizontally (same for mobile and desktop)
  menu.style.left = Math.min(rect.left || 50, window.innerWidth - 220) + "px";
  
  // Position vertically - above cursor on mobile if keyboard is likely open
  if (isMobile && spaceBelow < menuHeight && spaceAbove > menuHeight) {
    // Position above cursor
    menu.style.top = (rect.top - menuHeight - 8) + "px";
    menu.style.bottom = "auto";
  } else {
    // Position below cursor (default)
    menu.style.top = (rect.bottom || 50) + 4 + "px";
    menu.style.bottom = "auto";
  }
  
  menu.classList.add("on");
}
function hideSlash() {
  document.getElementById("slash").classList.remove("on");
  slashNode = null;
  _slashDismissed = true;
}

document
  .getElementById("slash")
  .querySelectorAll(".si")
  .forEach((el) => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      applySlash(el.dataset.t);
    });
  });

function applySlash(t) {
  if (slashNode) {
    const sel = window.getSelection();
    const endOff = sel.rangeCount
      ? sel.getRangeAt(0).startOffset
      : slashNode.textContent.length;
    const r = document.createRange();
    r.setStart(slashNode, slashOff);
    r.setEnd(slashNode, Math.min(endOff, slashNode.textContent.length));

    sel.removeAllRanges();
    sel.addRange(r);
    document.execCommand("delete", false, null);
  }
  hideSlash();

  const cmds = {
    h1: () => document.execCommand("formatBlock", false, "H1"),
    h2: () => document.execCommand("formatBlock", false, "H2"),
    h3: () => document.execCommand("formatBlock", false, "H3"),
    h4: () => document.execCommand("formatBlock", false, "H4"),
    p: () => document.execCommand("formatBlock", false, "P"),
    quote: () => document.execCommand("formatBlock", false, "BLOCKQUOTE"),
    code: () => insertCode(),
    ul: () => document.execCommand("insertUnorderedList"),
    ol: () => document.execCommand("insertOrderedList"),
    task: () =>
      insertHTML('<ul><li><input type="checkbox"> Checklist</li></ul>'),
    table: () => insertTable(),
    hr: () => document.execCommand("insertHorizontalRule"),
    templates: () => openTemplatesModal(),
    image: () => openMediaModal("image"),
    youtube: () => openMediaModal("youtube"),
    audio: () => openMediaModal("audio"),
    backlink: () => openBLModal(),
  };

  if (cmds[t]) cmds[t]();
}

function insertHTML(html) {
  document.execCommand("insertHTML", false, html);
}
function insertCode() {
  document.execCommand(
    "insertHTML",
    false,
    "<pre><code>Enter code here</code></pre><p><br></p>",
  );
  toast("Code block inserted");
}
function insertTable() {
  insertHTML(
    "<table><thead><tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr></thead><tbody><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></tbody></table><p><br></p>",
  );
  setTimeout(wrapTables, 50);
}

document.querySelectorAll(".tbb[data-cmd]").forEach((b) => {
  b.addEventListener("mousedown", (e) => {
    e.preventDefault();
    document.execCommand(b.dataset.cmd);
    updateTBState();
  });
});
document.getElementById("tb-hd").addEventListener("change", (e) => {
  const val = e.target.value;
  document.execCommand("formatBlock", false, val || "p");
  document.getElementById("ed").focus();
  // Jangan reset — updateTBState akan menyinkronkan nilainya
  updateTBState();
});
document.getElementById("btn-quote").addEventListener("mousedown", (e) => {
  e.preventDefault();
  const sel = window.getSelection();
  let inQuote = false;
  if (sel.rangeCount > 0 && sel.focusNode) {
    const node = sel.focusNode;
    inQuote = (node.nodeType === 3 ? node.parentNode : node).closest(
      "blockquote",
    );
  }
  if (inQuote) {
    document.execCommand("formatBlock", false, "p");
  } else {
    document.execCommand("formatBlock", false, "blockquote");
  }
});
document.getElementById("btn-code").addEventListener("mousedown", (e) => {
  e.preventDefault();
  insertCode();
});
document.getElementById("btn-hr").addEventListener("mousedown", (e) => {
  e.preventDefault();
  document.execCommand("insertHorizontalRule");
});
document.getElementById("btn-link").addEventListener("mousedown", (e) => {
  e.preventDefault();
  const url = prompt("URL:", "https://");
  if (url) {
    document.execCommand("createLink", false, url);
    toast("Link inserted");
  }
});
document.getElementById("btn-table").addEventListener("mousedown", (e) => {
  e.preventDefault();
  insertTable();
});
document.getElementById("btn-task").addEventListener("mousedown", (e) => {
  e.preventDefault();
  
  // Simpel: selalu insert HTML baru
  const html = '<ul><li><input type="checkbox" contenteditable="false">\u00A0</li></ul>';
  document.execCommand("insertHTML", false, html);
  
  // Fokus ke editor
  setTimeout(() => {
    document.getElementById("ed").focus();
  }, 10);
});
document.getElementById("btn-media").addEventListener("mousedown", (e) => {
  e.preventDefault();
  openMediaModal("image");
});
document.getElementById("btn-backlink").addEventListener("mousedown", (e) => {
  e.preventDefault();
  openBLModal();
});

function updateTBState() {
  [
    "bold",
    "italic",
    "underline",
    "strikeThrough",
    "justifyLeft",
    "justifyCenter",
    "justifyRight",
    "justifyFull",
    "insertUnorderedList",
    "insertOrderedList",
  ].forEach((cmd) => {
    const btn = document.querySelector(`.tbb[data-cmd="${cmd}"]`);
    if (btn) btn.classList.toggle("on", document.queryCommandState(cmd));
  });
  // Sinkronkan select heading sesuai blok aktif
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const el = sel.focusNode ? (sel.focusNode.nodeType === 3 ? sel.focusNode.parentNode : sel.focusNode) : null;
    const block = el ? el.closest("h1,h2,h3,h4,h5,h6") : null;
    const sel2 = document.getElementById("tb-hd");
    if (sel2) sel2.value = block ? block.tagName.toLowerCase() : "";
  }
}
document.getElementById("ed").addEventListener("keyup", updateTBState);
document.getElementById("ed").addEventListener("mouseup", updateTBState);

document.getElementById("ed").addEventListener("click", (e) => {
  // Tangani klik pada backlink
  const pill = e.target.closest(".backlink-pill");
  if (pill) {
    e.preventDefault();
    const noteId = pill.dataset.note;
    if (noteId) openNote(noteId);
    else toast("Catatan tidak ditemukan");
    return;
  }
  // Tangani klik pada hyperlink biasa
  const a = e.target.closest("a");
  if (a && a.href) {
    e.preventDefault();
    window.open(a.href, "_blank");
  }
});

let savedSel = null;
function saveSel() {
  const s = window.getSelection();
  if (s.rangeCount) {
    const r = s.getRangeAt(0);
    if (document.getElementById("ed").contains(r.commonAncestorContainer)) {
      savedSel = r.cloneRange();
    }
  }
}
function restSel() {
  if (!savedSel) return false;
  try {
    document.getElementById("ed").focus();
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(savedSel);
    return true;
  } catch {
    return false;
  }
}

function applyHighlight(color) {
  if (!restSel()) return;
  const ed = document.getElementById("ed");
  ed.focus();
  if (color === "transparent" || !color) {
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("hiliteColor", false, "transparent");
    document.execCommand("backColor", false, "transparent");
    document.execCommand("styleWithCSS", false, false);
    return;
  }
  document.execCommand("styleWithCSS", false, true);
  const success = document.execCommand("hiliteColor", false, color);
  if (!success) document.execCommand("backColor", false, color);
  document.execCommand("styleWithCSS", false, false);
}

function placePopup(popup, triggerEl) {
  const r = triggerEl.getBoundingClientRect();
  const pw = popup.offsetWidth || 140;
  let left = r.left;
  let top = r.bottom + 4;
  if (left + pw > window.innerWidth) left = window.innerWidth - pw - 8;
  if (left < 0) left = 8;
  popup.style.left = left + "px";
  popup.style.top = top + "px";
}

document.getElementById("btn-tc").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  const p = document.getElementById("cpop-t");
  p.classList.toggle("on");
  if (p.classList.contains("on")) placePopup(p, e.currentTarget);
  document.getElementById("cpop-h").classList.remove("on");
});

document.getElementById("btn-hl").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  const p = document.getElementById("cpop-h");
  p.classList.toggle("on");
  if (p.classList.contains("on")) placePopup(p, e.currentTarget);
  document.getElementById("cpop-t").classList.remove("on");
});

document.querySelectorAll("#cpop-t .cp-sw").forEach((sw) => {
  sw.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (!restSel()) {
      toast("Pilih teks terlebih dahulu");
      return;
    }
    document.getElementById("ed").focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("foreColor", false, sw.dataset.c);
    document.execCommand("styleWithCSS", false, false);
    document.getElementById("tc-bar").style.background = sw.dataset.c;
    document.getElementById("cpop-t").classList.remove("on");
  });
});
document.querySelectorAll("#cpop-h .cp-sw").forEach((sw) => {
  sw.addEventListener("mousedown", (e) => {
    e.preventDefault();
    applyHighlight(sw.dataset.c);
    document.getElementById("cpop-h").classList.remove("on");
  });
});
document.getElementById("cp-t-in").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (!restSel()) {
      toast("Pilih teks terlebih dahulu");
      return;
    }
    document.getElementById("ed").focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("foreColor", false, e.target.value);
    document.execCommand("styleWithCSS", false, false);
    document.getElementById("cpop-t").classList.remove("on");
  }
});
document.getElementById("cp-h-in").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    applyHighlight(e.target.value);
    document.getElementById("cpop-h").classList.remove("on");
  }
});

document
  .getElementById("ed")
  .addEventListener("mousedown", () => setTimeout(saveSel, 10));
document.getElementById("ed").addEventListener("mouseup", saveSel);
document.getElementById("ed").addEventListener("keyup", saveSel);

// Custom Heading Menu for Mobile (Bug #13 fix)
document.getElementById("btn-heading-mobile")?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  const menu = document.getElementById("heading-menu");
  const isOpen = menu.classList.contains("on");
  
  // Close other popups
  document.getElementById("cpop-t").classList.remove("on");
  document.getElementById("cpop-h").classList.remove("on");
  
  if (isOpen) {
    menu.classList.remove("on");
  } else {
    // Position menu above button to avoid keyboard
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 280;
    menu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 220)) + "px";
    menu.style.top = (rect.top - menuHeight - 8) + "px";
    menu.classList.add("on");
  }
});

// Handle heading menu item clicks
document.querySelectorAll("#heading-menu .si[data-h]").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const heading = item.dataset.h || "p";
    document.getElementById("ed").focus();
    document.execCommand("formatBlock", false, heading || "p");
    document.getElementById("heading-menu").classList.remove("on");
    updateHeadingLabel();
    updateTBState();
  });
});

// Update heading label based on current selection
function updateHeadingLabel() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  
  const el = sel.focusNode ? (sel.focusNode.nodeType === 3 ? sel.focusNode.parentNode : sel.focusNode) : null;
  const block = el ? el.closest("h1,h2,h3,h4,h5,h6") : null;
  const label = document.getElementById("heading-label");
  
  if (label) {
    if (block) {
      label.textContent = block.tagName.toUpperCase();
    } else {
      label.textContent = "Paragraph";
    }
  }
}

// Update heading label on editor interaction
document.getElementById("ed").addEventListener("keyup", updateHeadingLabel);
document.getElementById("ed").addEventListener("mouseup", updateHeadingLabel);

// Close heading menu when clicking outside
document.addEventListener("click", (e) => {
  const menu = document.getElementById("heading-menu");
  const btn = document.getElementById("btn-heading-mobile");
  if (menu && !menu.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
    menu.classList.remove("on");
  }
});

function openMediaModal(tab) {
  S.savedEdRange = savedSel;
  switchMediaTab(tab);
  document.getElementById("modal-media").classList.add("on");
}

function openTemplatesModal() {
  // When opened from slash menu, inherit the active note's folder
  const activeNote = S.notes.find(n => n.id === S.active);
  _pendingNoteFolderId = activeNote?.folder || null;
  renderTemplates();
  const hint = document.getElementById('tpl-folder-hint');
  if (hint) {
    if (_pendingNoteFolderId) {
      const folder = S.folders.find(f => f.id === _pendingNoteFolderId);
      hint.textContent = '📁 Akan disimpan ke: ' + (folder ? folder.name : _pendingNoteFolderId);
      hint.style.display = '';
    } else {
      hint.style.display = 'none';
    }
  }
  document.getElementById("modal-tpl").classList.add("on");
}

function switchMediaTab(t) {
  S.mediaTab = t;
  document
    .querySelectorAll(".mtab[data-mt]")
    .forEach((el) => el.classList.toggle("on", el.dataset.mt === t));
  ["image", "youtube", "audio"].forEach(
    (k) =>
    (document.getElementById("mt-" + k).style.display =
      k === t ? "" : "none"),
  );
}

// Use server-side signed upload endpoint (Vercel) instead of unsigned preset
const UPLOAD_ENDPOINT = "/api/upload";

async function uploadToCloudinary(file) {
  // Accept File object or data URL string
  let payload;
  if (file instanceof File) {
    payload = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  } else if (typeof file === "string") {
    payload = file;
  } else {
    toast("File tidak valid untuk diunggah");
    return null;
  }

  toast("Mengunggah media ke Catatan ini..", 9999);
  try {
    const res = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: payload, filename: file.name || "upload" }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || data?.message || "Upload gagal");
    toast("Selesai mengunggah!");

    let url = data.secure_url || data.url || data.secureUrl;
    if (!url) throw new Error("Response upload tidak berisi URL");

    // Optimasi otomatis Cloudinary
    if (url.includes("/image/upload/")) {
      url = url.replace("/image/upload/", "/image/upload/c_limit,w_1200,q_auto,f_auto/");
    } else if (url.includes("/video/upload/")) {
      url = url.replace("/video/upload/", "/video/upload/q_auto,f_auto/");
    }

    return url;
  } catch (err) {
    let msg = "";
    if (!err) msg = "Unknown error";
    else if (typeof err === "string") msg = err;
    else if (err.message) msg = err.message;
    else {
      try {
        msg = JSON.stringify(err);
      } catch (e) {
        msg = String(err);
      }
    }
    console.error('uploadToCloudinary error:', err);
    toast("Upload Gagal: " + msg);
    return null;
  }
}

// PERBAIKAN POSISI KURSOR MEDIA
document.getElementById("m-insert").addEventListener("click", async () => {
  const t = S.mediaTab;
  const pId = "p-" + genId(); // ID unik untuk baris baru

  if (t === "image") {
    const file = document.getElementById("m-img-file").files[0];
    const url = document.getElementById("m-img-url").value.trim();
    if (file) {
      const urlCl = await uploadToCloudinary(file);
      if (!urlCl) return; // fail
      restSel();
      insertHTML(
        `<img src="${urlCl}" alt="${file.name}" loading="lazy"><p id="${pId}"><br></p>`,
      );
    } else if (url) {
      restSel();
      insertHTML(`<img src="${url}" alt="image" loading="lazy"><p id="${pId}"><br></p>`);
    } else {
      toast("Pilih file atau masukkan URL");
      return;
    }
    forceCursorToNewParagraph(pId);
  } else if (t === "youtube") {
    const raw = document.getElementById("m-yt-url").value.trim();
    const ytId = extractYTId(raw);
    if (!ytId) {
      toast("URL YouTube tidak valid");
      return;
    }
    restSel();

    const wrap = document.createElement("div");
    wrap.className = "yt-wrap";
    wrap.dataset.ytid = ytId;
    wrap.setAttribute("contenteditable", "false");

    const thumb = document.createElement("div");
    thumb.className = "yt-thumb-wrap";

    const img = document.createElement("img");
    img.src = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    img.alt = "YouTube";
    img.setAttribute("loading", "lazy");
    img.onerror = function () {
      this.style.opacity = "0";
    };

    const playBtn = document.createElement("div");
    playBtn.className = "yt-play-btn";
    playBtn.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>';

    thumb.appendChild(img);
    thumb.appendChild(playBtn);
    thumb.addEventListener("click", () => loadYTPlayer(wrap));
    wrap.appendChild(thumb);

    const phId = "yt-ph-" + genId();
    document.execCommand(
      "insertHTML",
      false,
      `<span id="${phId}"></span><p id="${pId}"><br></p>`,
    );
    const ph = document.getElementById(phId);
    if (ph) {
      ph.parentNode.insertBefore(wrap, ph);
      ph.remove();
    } else {
      document.getElementById("ed").appendChild(wrap);
    }

    forceCursorToNewParagraph(pId);
  } else if (t === "audio") {
    const file = document.getElementById("m-audio-file").files[0];
    const url = document.getElementById("m-audio-url").value.trim();
    const label =
      document.getElementById("m-audio-label").value || file?.name || "Audio";
    if (file) {
      const urlCl = await uploadToCloudinary(file);
      if (!urlCl) return;
      restSel();
      insertHTML(
        `<div class="audio-wrap" contenteditable="false"><div class="audio-label">${label}</div><audio controls src="${urlCl}"></audio></div><p id="${pId}"><br></p>`,
      );
      forceCursorToNewParagraph(pId);
    } else if (url) {
      restSel();
      insertHTML(
        `<div class="audio-wrap" contenteditable="false"><div class="audio-label">${label}</div><audio controls src="${url}"></audio></div><p id="${pId}"><br></p>`,
      );
      forceCursorToNewParagraph(pId);
    } else {
      toast("Pilih file audio atau masukkan URL");
      return;
    }
  }
  closeModal("modal-media");
  setTimeout(wrapTables, 100);
  document.getElementById("m-img-url").value = "";
  document.getElementById("m-yt-url").value = "";
  document.getElementById("m-audio-url").value = "";
  document.getElementById("m-audio-label").value = "";
  document.getElementById("m-img-file").value = "";
  document.getElementById("m-audio-file").value = "";
});

function forceCursorToNewParagraph(pId) {
  setTimeout(() => {
    const p = document.getElementById(pId);
    if (p) {
      p.removeAttribute("id");
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(p);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      document.getElementById("ed").focus();
    }
  }, 10);
}

function loadYTPlayer(wrap) {
  const id = wrap.dataset.ytid;
  if (!id) return;
  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  iframe.setAttribute(
    "allow",
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
  );
  iframe.setAttribute("allowfullscreen", "true");
  iframe.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;border:none;border-radius:var(--r2)";
  wrap.appendChild(iframe);
}

function extractYTId(url) {
  url = url.trim();
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}



function openBLModal() {
  saveSel();
  document.getElementById("bl-search").value = "";
  filterBLNotes();
  document.getElementById("modal-bl").classList.add("on");
}

function filterBLNotes() {
  const q = document.getElementById("bl-search").value.toLowerCase();
  const list = document.getElementById("bl-list");
  const notes = S.notes.filter(
    (n) => n.id !== S.active && (!q || n.title.toLowerCase().includes(q)),
  );
  list.innerHTML =
    notes
      .map(
        (n) => `
    <div class="sr-i bl-note-item" data-bl-id="${escapeHTML(n.id)}">
      <div class="sr-t">${escapeHTML(n.title)}</div>
    </div>
  `,
      )
      .join("") ||
    '<div style="padding:10px;font-size:12px;color:var(--tx3)">Catatan tidak ditemukan</div>';
  // Gunakan event delegation untuk keamanan (hindari inline onclick dengan konten user)
  list.querySelectorAll(".bl-note-item").forEach((el) => {
    el.addEventListener("click", () => {
      const noteId = el.dataset.blId;
      const note = S.notes.find((n) => n.id === noteId);
      if (note) insertBL(note.id, note.title);
    });
  });
}

function insertBL(id, title) {
  restSel();
  insertHTML(
    `<a class="backlink-pill" data-note="${id}" onclick="openNote('${id}')" href="#">[[${title}]]</a>&nbsp;`,
  );
  closeModal("modal-bl");
  toast("Backlink inserted");
}
function renderTemplates(filter) {
  const list = document.getElementById("tpl-list");
  const q = (filter || "").toLowerCase();
  const allTpl = getAllTemplates();

  // Pasangkan setiap template dengan index-nya di allTpl
  const filtered = allTpl.reduce((acc, t, i) => {
    if (
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      (t.tags || "").toLowerCase().includes(q)
    ) {
      acc.push({ t, i });
    }
    return acc;
  }, []);

  if (filtered.length === 0) {
    list.innerHTML =
      '<div style="padding:20px;text-align:center;color:var(--tx3);font-style:italic;">Template tidak ditemukan</div>';
    return;
  }

  const customs = filtered.filter(({ t }) => t.custom);
  const builtins = filtered.filter(({ t }) => !t.custom);

  let html = "";

  if (customs.length > 0) {
    html += '<div class="tpl-section-lbl">Template Saya</div>';
    html += customs
      .map(
        ({ t, i }) => `
      <div class="tpl-item tpl-custom" onclick="useTemplate(${i})">
        <div class="tpl-item-body">
          <div class="tpl-name">${escapeHTML(t.name)}</div>
          <div class="tpl-desc">${escapeHTML(t.desc)}</div>
        </div>
        <button class="tpl-del-btn" onclick="event.stopPropagation();delCustomTpl('${escapeHTML(t.id)}')" title="Hapus template ini">✕</button>
      </div>`
      )
      .join("");
  }

  if (builtins.length > 0) {
    if (customs.length > 0) {
      html += '<div class="tpl-section-lbl">Template Bawaan</div>';
    }
    html += builtins
      .map(
        ({ t, i }) => `
      <div class="tpl-item" onclick="useTemplate(${i})">
        <div class="tpl-name">${escapeHTML(t.name)}</div>
        <div class="tpl-desc">${escapeHTML(t.desc)}</div>
      </div>`
      )
      .join("");
  }

  list.innerHTML = html;
}

function filterTemplates() {
  renderTemplates(document.getElementById("tpl-search").value);
}

// Handler Enter di search template
document.getElementById("tpl-search")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const firstItem = document.querySelector("#tpl-list .tpl-item");
    if (firstItem) firstItem.click();
  }
  if (e.key === "Escape") {
    closeModal("modal-tpl");
  }
});

function useTemplate(i) {
  closeModal("modal-tpl");
  const folderId = _pendingNoteFolderId;
  _pendingNoteFolderId = null;
  createNote(folderId, getAllTemplates()[i]);
}

/** Hapus template custom dari modal, lalu re-render. */
function delCustomTpl(id) {
  if (!confirm("Hapus template ini?")) return;
  deleteCustomTemplate(id);
  filterTemplates();
  toast("Template dihapus");
}

/** Simpan catatan yang sedang terbuka sebagai template custom. */
function saveActiveNoteAsTemplate() {
  const n = S.notes.find((n) => n.id === S.active);
  if (!n) {
    toast("Tidak ada catatan yang terbuka");
    return;
  }
  saveNoteAsTemplate(n);
  toast('"' + (n.title || "Catatan") + '" disimpan sebagai template!');
}

function openTemplateForFolder(folderId) {
  _pendingNoteFolderId = folderId;
  renderTemplates();
  const hint = document.getElementById('tpl-folder-hint');
  if (hint) {
    if (folderId) {
      const folder = S.folders.find(f => f.id === folderId);
      hint.textContent = '📁 Akan disimpan ke: ' + (folder ? folder.name : folderId);
      hint.style.display = '';
    } else {
      hint.style.display = 'none';
    }
  }
  document.getElementById('modal-tpl').classList.add('on');
}

document.getElementById("mf-ok").addEventListener("click", () => {
  const name = document.getElementById("mf-in").value.trim();
  if (!name) return;
  S.folders.push({ id: genId(), name });
  saveLocal();
  if (window._fb && S.user) window._fb.saveFolders(S.user.uid, S.folders).then(saveLocal);
  renderFolderOpts();
  renderTree();
  closeModal("modal-folder");
  toast("Folder created");
});

function renderFolderOpts() {
  const sel = document.getElementById("p-folder");
  sel.innerHTML =
    '<option value="">No folder</option>' +
    S.folders.map((f) => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join("");
}

function renderTree() {
  const tree = document.getElementById("tree");
  const q = (document.getElementById("search").value || "").toLowerCase();

  function noteHTML(n) {
    const on = S.active === n.id;
    const safeTitle = escapeHTML(n.title || "Untitled");
    return `<div class="ni${on ? " on" : ""}" data-id="${n.id}" onclick="openNote('${n.id}')" oncontextmenu="showCtx(event,'${n.id}')" title="Buka: ${safeTitle}">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span class="ni-title">${safeTitle}</span>
      ${n.status === "todo" ? '<span style="width:6px;height:6px;border-radius:50%;background:#c96e6e;flex-shrink:0"></span>' : n.status === "inprogress" ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--ac);flex-shrink:0"></span>' : n.status === "done" ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--ac2);flex-shrink:0"></span>' : ""}
      <button class="ni-del" onclick="event.stopPropagation();deleteNote('${n.id}')" title="Hapus Catatan">✕</button>
    </div>`;
  }

  let html = "";
  const ungrouped = S.notes.filter(
    (n) =>
      !n.folder &&
      (!q ||
        n.title.toLowerCase().includes(q) ||
        (n.content || "").toLowerCase().includes(q) ||
        (n.tags || []).some((t) => t.includes(q))),
  );
  if (ungrouped.length) {
    html += `<div style="padding:4px 7px 2px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--tx3);margin-top:4px">Notes</div>`;
    ungrouped.forEach((n) => (html += noteHTML(n)));
  }
  S.folders.forEach((f) => {
    const fn = S.notes.filter(
      (n) =>
        n.folder === f.id &&
        (!q ||
          n.title.toLowerCase().includes(q) ||
          (n.content || "").toLowerCase().includes(q)),
    );
    html += `<div>
      <div class="folder-hd" onclick="toggleFolder('${f.id}')" oncontextmenu="showFolderCtx(event, '${f.id}')">
        <span class="ftog o" id="ft-${f.id}">▶</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span style="flex:1">${escapeHTML(f.name)}</span>
        <span style="font-size:9px;color:var(--tx3)">${fn.length}</span>
        <div class="folder-acts">
   <button class="ib folder-act-btn" title="Catatan Baru" onclick="event.stopPropagation();createNote('${f.id}')">
     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
   </button>
   <button class="ib folder-act-btn" title="Dari Template" onclick="event.stopPropagation();openTemplateForFolder('${f.id}')">
     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>
   </button>
   <button class="ib folder-act-btn" title="Opsi Folder" onclick="showFolderCtx(event, '${f.id}')">
     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
   </button>
 </div>
      </div>
      <div class="folder-notes" id="fn-${f.id}">${fn.map(noteHTML).join("")}${fn.length === 0 ? '<div style="padding:3px 8px;font-size:11px;color:var(--tx3);font-style:italic">Empty</div>' : ""}</div>
    </div>`;
  });
  if (!S.notes.length)
    html =
      '<div style="padding:14px;text-align:center;font-size:12px;color:var(--tx3);font-style:italic">No notes yet</div>';
  tree.innerHTML = html;
}

function toggleFolder(id) {
  document.getElementById("fn-" + id)?.classList.toggle("h");
  document.getElementById("ft-" + id)?.classList.toggle("o");
}

document.getElementById("search").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  renderTree();
  const sr = document.getElementById("sr");
  if (!q) {
    sr.classList.remove("on");
    return;
  }
  const res = S.notes
    .filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.content || "")
          .replace(/<[^>]*>/g, "")
          .toLowerCase()
          .includes(q) ||
        (n.tags || []).some((t) => t.includes(q)),
    )
    .slice(0, 8);
  if (!res.length) {
    sr.innerHTML =
      '<div style="padding:10px 12px;font-size:12px;color:var(--tx3)">No results</div>';
    sr.classList.add("on");
    return;
  }
  const ex = (c, q) => {
    const t = c.replace(/<[^>]*>/g, "").slice(0, 200);
    const i = t.toLowerCase().indexOf(q);
    if (i < 0) return escapeHTML(t.slice(0, 60)) + "…";
    return escapeHTML(
      (i > 20 ? "…" : "") +
      t.slice(Math.max(0, i - 15), i + q.length + 40) +
      "…"
    );
  };
  sr.innerHTML = res
    .map(
      (
        n,
      ) => {
      const safeTitle = escapeHTML(n.title);
      const highlightedTitle = safeTitle.replace(new RegExp(escapeHTML(q), "gi"), (m) => `<span class="hl">${m}</span>`);
      return `<div class="sr-i" onclick="openNote('${n.id}');document.getElementById('sr').classList.remove('on');document.getElementById('search').value=''">
    <div class="sr-t">${highlightedTitle}</div>
    <div class="sr-p">${ex(n.content || "", q)}</div>
  </div>`;
    })
    .join("");
  sr.classList.add("on");
});

function showFolderCtx(e, id) {
  e.preventDefault();
  e.stopPropagation();
  S.fctxId = id;
  const m = document.getElementById("fctx");
  m.style.left = Math.min(e.clientX, window.innerWidth - 140) + "px";
  m.style.top = Math.min(e.clientY, window.innerHeight - 80) + "px";
  m.classList.add("on");
}

document.getElementById("fctx-new").onclick = () => {
  document.getElementById("fctx").classList.remove("on");
  createNote(S.fctxId);
};

document.getElementById("fctx-tpl").onclick = () => {
  document.getElementById("fctx").classList.remove("on");
  openTemplateForFolder(S.fctxId);
};

document.getElementById("fctx-ren").onclick = () => {
  const f = S.folders.find((x) => x.id === S.fctxId);
  if (!f) return;
  document.getElementById("fctx").classList.remove("on");
  openRenameFolderModal(f);
};

function openRenameFolderModal(folder) {
  const input = document.getElementById("rename-folder-in");
  const modal = document.getElementById("modal-rename-folder");
  const label = document.getElementById("rename-folder-label");
  if (!input || !modal) {
    // Fallback to prompt if modal not found
    const name = prompt("Rename folder:", folder.name);
    if (name && name.trim()) {
      folder.name = name.trim();
      saveLocal();
      if (window._fb && S.user) window._fb.saveFolders(S.user.uid, S.folders).then(saveLocal);
      renderFolderOpts();
      renderTree();
    }
    return;
  }
  if (label) label.textContent = 'Rename: ' + escapeHTML(folder.name);
  input.value = folder.name;
  modal.dataset.folderId = folder.id;
  modal.classList.add("on");
  setTimeout(() => { input.focus(); input.select(); }, 60);
}

document.getElementById("rename-folder-ok")?.addEventListener("click", () => {
  const modal = document.getElementById("modal-rename-folder");
  const input = document.getElementById("rename-folder-in");
  const folderId = modal?.dataset.folderId;
  const newName = input?.value.trim();
  if (!newName) { toast("Nama tidak boleh kosong"); input?.focus(); return; }
  const folder = S.folders.find(f => f.id === folderId);
  if (folder) {
    folder.name = newName;
    saveLocal();
    if (window._fb && S.user) window._fb.saveFolders(S.user.uid, S.folders).then(saveLocal);
    renderFolderOpts();
    renderTree();
    toast("Folder diubah");
  }
  closeModal("modal-rename-folder");
});

document.getElementById("rename-folder-in")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); document.getElementById("rename-folder-ok")?.click(); }
  if (e.key === "Escape") closeModal("modal-rename-folder");
});

document.getElementById("fctx-del").onclick = () => {
  if (!confirm("Hapus folder ini? \n\nSemua catatan di dalamnya akan dipindah ke daftar utama (Unsorted)."))
    return;
  S.folders = S.folders.filter((x) => x.id !== S.fctxId);
  S.notes.forEach((n) => {
    if (n.folder === S.fctxId) n.folder = null;
    if (S.user) cloudSave(n);
  });
  saveLocal();
  if (window._fb && S.user) window._fb.saveFolders(S.user.uid, S.folders).then(saveLocal);
  renderFolderOpts();
  renderTree();
  updateProps();
  toast("Folder dihapus (Catatan dipindah)");
  document.getElementById("fctx").classList.remove("on");
};

document.getElementById("fctx-del-all").onclick = async () => {
  if (!confirm("Hapus folder ini SEKALIGUS seluruh catatan di dalamnya?\n\nTindakan ini PERMANEN dan tidak dapat dibatalkan."))
    return;

  // Hapus catatan di dalam folder dari PocketBase
  const toDel = S.notes.filter(n => n.folder === S.fctxId);
  for (const n of toDel) {
    if (S.user) await cloudDel(n.id);
  }
  S.notes = S.notes.filter(n => n.folder !== S.fctxId);
  S.auditData = S.auditData.filter(n => n.folder !== S.fctxId);

  // Hapus folder
  S.folders = S.folders.filter((x) => x.id !== S.fctxId);

  saveLocal();
  if (window._fb && S.user) window._fb.saveFolders(S.user.uid, S.folders).then(saveLocal);
  renderFolderOpts();
  renderTree();
  showEmpty(true);
  toast("Folder dan seluruh isinya dihapus");
  document.getElementById("fctx").classList.remove("on");
};

function showCtx(e, id) {
  e.preventDefault();
  S.ctxId = id;
  const m = document.getElementById("ctx");
  m.style.left = Math.min(e.clientX, window.innerWidth - 180) + "px";
  m.style.top = Math.min(e.clientY, window.innerHeight - 160) + "px";
  m.classList.add("on");
}
document.getElementById("ctx-ren").onclick = () => {
  renameNote(S.ctxId);
  document.getElementById("ctx").classList.remove("on");
};
document.getElementById("ctx-dup").onclick = () => {
  duplicateNote(S.ctxId);
  document.getElementById("ctx").classList.remove("on");
};
document.getElementById("ctx-del").onclick = () => {
  deleteNote(S.ctxId);
  document.getElementById("ctx").classList.remove("on");
};
document.getElementById("ctx-mov").onclick = () => {
  const n = S.notes.find((n) => n.id === S.ctxId);
  if (!n) return;
  document.getElementById("ctx").classList.remove("on");
  const modal = document.getElementById("modal-move");
  const sel = document.getElementById("move-list");
  const moveBtn = document.getElementById("move-ok");
  const note = S.notes.find((n) => n.id === S.ctxId);
  if (!modal || !sel || !moveBtn || !note) return;
  sel.innerHTML =
    '<option value="">No folder</option>' +
    S.folders.map(
      (f) => `<option value="${f.id}"${note && note.folder === f.id ? " selected" : ""}>${escapeHTML(f.name)}</option>`,
    ).join("");
  moveBtn.onclick = () => {
    const nextFolder = sel.value || null;
    const target = S.notes.find((item) => item.id === S.ctxId);
    if (!target) return;
    target.folder = nextFolder;
    target.modified = Date.now();
    saveLocal();
    if (S.user) cloudSave(target);
    renderTree();
    updateProps();
    closeModal("modal-move");
    toast("Moved");
  };
  modal.classList.add("on");
};

document.getElementById("p-title").addEventListener("input", (e) => {
  if (!S.active) return;
  const n = S.notes.find((n) => n.id === S.active);
  if (!n) return;
  n.title = e.target.value;
  n.modified = Date.now();
  
  // Update title di tree tanpa full re-render
  const noteEl = document.querySelector(`.ni[data-id="${S.active}"] .ni-title`);
  if (noteEl) {
    noteEl.textContent = e.target.value || "Untitled";
  }

  hasUnsaved = true;
  const st = document.getElementById("st-saved");
  if (st && S.user) st.textContent = "Belum tersimpan...";

  clearTimeout(S.titleTO);
  S.titleTO = setTimeout(() => {
    saveLocal();
    if (S.user) cloudSave(n);
  }, 1000);
});

function updateProps() {
  const n = S.notes.find((n) => n.id === S.active);
  if (!n) return;
  document.getElementById("p-title").value = n.title || "";
  document.getElementById("p-folder").value = n.folder || "";
  document.getElementById("p-created").textContent = fmtD(n.created);
  document.getElementById("p-modified").textContent = fmtD(n.modified);
  updateWC();
  renderTags(n);
  updateBacklinksPanel();
}

document.getElementById("p-folder").addEventListener("change", (e) => {
  const n = S.notes.find((n) => n.id === S.active);
  if (!n) return;
  n.folder = e.target.value || null;
  n.modified = Date.now();
  saveLocal();
  if (S.user) cloudSave(n);
  renderTree();
  toast("Dipindahkan");
});

function renderTags(n) {
  const container = document.getElementById("p-tags");
  container.innerHTML = (n.tags || [])
    .map(
      (t) => `
    <div class="tag" data-tag="${escapeHTML(t)}">${escapeHTML(t)}<span class="tag-x">✕</span></div>
  `,
    )
    .join("");
  container.querySelectorAll(".tag-x").forEach((el) => {
    el.addEventListener("click", () => {
      const tag = el.closest(".tag")?.dataset.tag;
      if (tag) removeTag(tag);
    });
  });
}
document.getElementById("btn-add-tag").onclick = addTag;
document.getElementById("p-tag-in").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTag();
});

function addTag() {
  const inp = document.getElementById("p-tag-in");
  const tag = inp.value.trim().replace(/\s+/g, "-");
  if (!tag) return;
  const n = S.notes.find((n) => n.id === S.active);
  if (!n) return;
  if (!n.tags) n.tags = [];
  if (!n.tags.includes(tag)) {
    n.tags.push(tag);
    saveLocal();
    if (S.user) cloudSave(n);
    renderTags(n);
  }
  inp.value = "";
}

function removeTag(tag) {
  const n = S.notes.find((n) => n.id === S.active);
  if (!n) return;
  n.tags = (n.tags || []).filter((t) => t !== tag);
  saveLocal();
  if (S.user) cloudSave(n);
  renderTags(n);
}

document.getElementById("btn-tsb").onclick = () => {
  S.sbOpen = !S.sbOpen;
  document.getElementById("sb").classList.toggle("off", !S.sbOpen);
};

// Tombol toggle sidebar di dalam sidebar header (mobile)
const btnTsbSidebar = document.getElementById("btn-tsb-sidebar");
if (btnTsbSidebar) {
  btnTsbSidebar.onclick = () => {
    S.sbOpen = false;
    document.getElementById("sb").classList.add("off");
  };
}

document.getElementById("btn-pp").onclick = () => {
  S.ppOpen = !S.ppOpen;
  document.getElementById("pp").classList.toggle("off", !S.ppOpen);
};
document.getElementById("btn-cpp").onclick = () => {
  S.ppOpen = false;
  document.getElementById("pp").classList.add("off");
};
document.getElementById("btn-new").onclick = () => createNote();

function goToDashboard() {
  S.active = null;
  document.getElementById("search").value = "";
  renderTree();
  showEmpty(true);
}

function updateDashboardStats() {
  document.getElementById("dash-notes").textContent = S.notes.length;
  document.getElementById("dash-folders").textContent = S.folders.length;
  let wc = 0;
  S.notes.forEach(n => {
    const text = (n.content || "").replace(/<[^>]*>/gm, " ").trim();
    wc += text ? text.split(/\s+/).length : 0;
  });
  document.getElementById("dash-words").textContent = wc.toLocaleString("id-ID");
}

function showEmpty(v) {
  document.getElementById("ew").style.display = v ? "none" : "";
  document.getElementById("es").style.display = v ? "flex" : "none";
  document.getElementById("ea-toc").style.display = v ? "none" : ""; // Hide TOC in dashboard
  document.getElementById("tb").style.opacity = v ? ".4" : "";
  document.getElementById("tb").style.pointerEvents = v ? "none" : "";
  updatePlaceholderVisibility(); // Check placeholder when showing empty

  if (v) {
    updateDashboardStats();
    document.getElementById("pp").classList.add("off");
  }
}

function openModal(id) {
  document.getElementById(id).classList.add("on");
}

function resetPassword() {
  const emailVal = document.getElementById("auth-email").value;
  const email = emailVal ? emailVal.trim() : "";
  if (!email) {
    toast("Masukkan email terlebih dahulu di kolom input untuk reset sandi.");
    return;
  }
  if (!window._fb) { 
    toast("Backend belum dikonfigurasi."); 
    return; 
  }
  
  window._fb.sendPasswordReset(email)
    .then(() => toast("Email reset sandi telah dikirim ke " + email))
    .catch(e => toast("Gagal: " + (e.message || 'Error'), 4000));
}

const _btnResetPass = document.getElementById("btn-reset-pass");
if (_btnResetPass) {
  _btnResetPass.onclick = (e) => {
    e.preventDefault();
    resetPassword();
  };
}

function closeModal(id) {
  document.getElementById(id).classList.remove("on");
}

function updatePlaceholderVisibility() {
  const ed = document.getElementById("ed");
  const content = ed.innerHTML.trim();
  if (content === "" || content === "<p><br></p>") {
    ed.classList.add("is-empty");
  } else {
    ed.classList.remove("is-empty");
  }
}

function closeGuestBanner() {
  const banner = document.getElementById("guest-banner");
  if (banner) banner.classList.remove("on");
}

// Helper functions for nested list and checklist fixes
function cleanupNestedListSpacing(li) {
  // Hapus inline styles dari li
  if (li.style.marginLeft) li.style.marginLeft = '';
  if (li.style.paddingLeft) li.style.paddingLeft = '';
  
  // Hapus empty ul/ol siblings
  const parent = li.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    siblings.forEach(sibling => {
      if ((sibling.tagName === 'UL' || sibling.tagName === 'OL') && sibling.children.length === 0) {
        sibling.remove();
      }
    });
  }
  
  // Hapus blockquote wrapper jika ada dan kosong
  const blockquote = li.closest('blockquote');
  if (blockquote && blockquote.children.length === 1 && blockquote.firstElementChild && 
      (blockquote.firstElementChild.tagName === 'UL' || blockquote.firstElementChild.tagName === 'OL')) {
    blockquote.replaceWith(blockquote.firstElementChild);
  }
}

function indentChecklist(li) {
  const prevLi = li.previousElementSibling;
  
  if (prevLi) {
    // Cari atau buat nested ul di prevLi
    let nestedUl = prevLi.querySelector(':scope > ul');
    if (!nestedUl) {
      nestedUl = document.createElement('ul');
      prevLi.appendChild(nestedUl);
    }
    nestedUl.appendChild(li);
  } else {
    // Tidak ada prevLi, tidak bisa indent
    return;
  }
  
  // Restore cursor position
  const sel = window.getSelection();
  const range = document.createRange();
  const textNode = li.childNodes[1]; // Text node after checkbox
  if (textNode && textNode.nodeType === 3) {
    range.setStart(textNode, textNode.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function outdentChecklist(li) {
  const parentUl = li.parentElement;
  const grandparentLi = parentUl.parentElement.closest('li');
  
  if (grandparentLi) {
    // Ada parent li, pindahkan setelah grandparentLi
    const grandparentUl = grandparentLi.parentElement;
    grandparentUl.insertBefore(li, grandparentLi.nextSibling);
    
    // Hapus parentUl jika kosong
    if (parentUl.children.length === 0) {
      parentUl.remove();
    }
  }
  // Jika tidak ada grandparentLi, sudah di level teratas, tidak perlu outdent
  
  // Restore cursor position
  const sel = window.getSelection();
  const range = document.createRange();
  const textNode = li.childNodes[1]; // Text node after checkbox
  if (textNode && textNode.nodeType === 3) {
    range.setStart(textNode, textNode.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

document.querySelectorAll(".modal-bg").forEach((m) => {
  m.addEventListener("click", (e) => {
    if (e.target === m) m.classList.remove("on");
  });
});
document.getElementById("mf-in").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("mf-ok").click();
  if (e.key === "Escape") closeModal("modal-folder");
});
document.getElementById("ed").addEventListener("click", (e) => {
  document.querySelectorAll("#ed img.selected").forEach((img) => img.classList.remove("selected"));
  if (e.target.tagName === "IMG") {
    e.target.classList.add("selected");
    const src = e.target.src;

    document.getElementById("lb-img").src = src;

    let dlUrl = src;
    if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
      dlUrl = src.replace("/upload/", "/upload/fl_attachment/");
    }
    document.getElementById("lb-dl").href = dlUrl;

    document.getElementById("modal-lightbox").classList.add("on");
  }
});

document.getElementById("ed").addEventListener("keydown", (e) => {
  // Jika gambar dipilih, Backspace atau Delete akan menghapusnya
  if (e.key === "Backspace" || e.key === "Delete") {
    const selectedImg = document.querySelector("#ed img.selected");
    if (selectedImg) {
      e.preventDefault();
      selectedImg.remove();
      ensureTrailingParagraph();
      return;
    }
  }

  // Hapus seleksi outline jika pengguna mengetik
  if (e.key !== "Shift" && e.key !== "Control" && e.key !== "Alt" && e.key !== "Meta") {
    document.querySelectorAll("#ed img.selected").forEach((img) => img.classList.remove("selected"));
  }

  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key.toLowerCase() === "a") {
    e.preventDefault();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.getElementById("ed"));
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }

  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const node = sel.focusNode;

  // Tab / Shift+Tab: indent / outdent item list (nested lists)
  if (e.key === "Tab") {
    const li = node && (node.nodeType === 3 ? node.parentNode : node).closest("li");
    if (li) {
      e.preventDefault();
      const checkbox = li.querySelector('input[type="checkbox"]');
      
      if (checkbox) {
        // Checklist: manual DOM manipulation
        if (e.shiftKey) {
          outdentChecklist(li);
        } else {
          indentChecklist(li);
        }
      } else {
        // Regular list: use execCommand (preserve existing behavior)
        if (e.shiftKey) {
          document.execCommand("outdent");
          cleanupNestedListSpacing(li);
        } else {
          document.execCommand("indent");
        }
      }
      return;
    }
  }

  // Checklist: Enter untuk buat item baru atau keluar
  if (e.key === "Enter" && !e.shiftKey) {
    const li = node && (node.nodeType === 3 ? node.parentNode : node).closest("li");
    const checkbox = li && li.querySelector('input[type="checkbox"]');
    
    if (checkbox) {
      e.preventDefault();
      
      // Ambil text content tanpa checkbox
      const liClone = li.cloneNode(true);
      const cb = liClone.querySelector('input[type="checkbox"]');
      if (cb) cb.remove();
      const textContent = liClone.textContent.trim();
      
      if (textContent === "") {
        // Keluar dari checklist jika kosong
        const ul = li.closest("ul");
        
        // Check if this is the only item in the list
        if (ul && ul.children.length === 1) {
          // Replace entire ul with paragraph
          const p = document.createElement("p");
          p.innerHTML = "<br>";
          ul.replaceWith(p);
          
          // Move cursor ke paragraph
          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        } else {
          // Has other items: remove this li and exit to paragraph after ul
          const p = document.createElement("p");
          p.innerHTML = "<br>";
          
          // Find the topmost ul (in case of nested)
          let topUl = ul;
          while (topUl.parentElement && topUl.parentElement.closest('ul')) {
            topUl = topUl.parentElement.closest('ul');
          }
          
          // Remove the empty li
          li.remove();
          
          // Insert paragraph after the topmost ul
          if (topUl && topUl.parentNode) {
            topUl.parentNode.insertBefore(p, topUl.nextSibling);
          }
          
          // Move cursor ke paragraph
          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
        return;
      }
      
      // Buat li baru dengan checkbox
      const newLi = document.createElement("li");
      const newCb = document.createElement("input");
      newCb.type = "checkbox";
      newCb.contentEditable = "false";
      newLi.appendChild(newCb);
      newLi.appendChild(document.createTextNode("\u00A0"));
      
      li.after(newLi);
      
      // Move cursor ke li baru
      const newRange = document.createRange();
      const textNode = newLi.childNodes[1];
      newRange.setStart(textNode, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      return;
    }
  }
  
  // Checklist: Backspace di awal untuk convert ke paragraph
  if (e.key === "Backspace") {
    const li = node && (node.nodeType === 3 ? node.parentNode : node).closest("li");
    const checkbox = li && li.querySelector('input[type="checkbox"]');
    
    if (checkbox) {
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      
      const currentNode = range.startContainer;
      
      // Check if right after checkbox
      const isAfterCheckbox = currentNode.nodeType === 3 && 
                             currentNode.previousSibling && 
                             currentNode.previousSibling.type === 'checkbox' &&
                             range.startOffset === 0;
      
      if (isAfterCheckbox) {
        e.preventDefault();
        
        // Get text content
        const liClone = li.cloneNode(true);
        const cb = liClone.querySelector('input[type="checkbox"]');
        if (cb) cb.remove();
        const textContent = liClone.textContent.trim();
        
        // Create paragraph
        const p = document.createElement("p");
        if (textContent === "") {
          p.innerHTML = "<br>";
        } else {
          p.textContent = textContent;
        }
        
        // Get the ul
        const ul = li.closest("ul");
        
        // Check if this is the only item
        if (ul && ul.children.length === 1) {
          // Replace entire ul with paragraph
          ul.replaceWith(p);
        } else {
          // Has other items: find topmost ul and insert paragraph after it
          let topUl = ul;
          while (topUl.parentElement && topUl.parentElement.closest('ul')) {
            topUl = topUl.parentElement.closest('ul');
          }
          
          // Remove the li
          li.remove();
          
          // Insert paragraph after topmost ul
          if (topUl && topUl.parentNode) {
            topUl.parentNode.insertBefore(p, topUl.nextSibling);
          }
        }
        
        // Move cursor ke paragraph
        const newRange = document.createRange();
        if (p.firstChild && p.firstChild.nodeType === 3) {
          newRange.setStart(p.firstChild, 0);
        } else {
          newRange.setStart(p, 0);
        }
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        
        return;
      }
    }
  }

  // Blockquote handlers
  const bq = node && (node.nodeType === 3 ? node.parentNode : node).closest("blockquote");

  if (bq) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const bqText = bq.textContent.trim();
      if (bqText === "") {
        document.execCommand("formatBlock", false, "p");
      } else {
        document.execCommand("insertParagraph", false);
        document.execCommand("formatBlock", false, "p");
      }
    } else if (e.key === "Backspace") {
      const range = sel.getRangeAt(0);
      if (range.startOffset === 0 && range.collapsed) {
        const textNode = node.nodeType === 3 ? node : node.firstChild;
        const isAtStart = !textNode || textNode === bq.firstChild || 
                         (textNode.previousSibling === null && range.startOffset === 0);
        
        if (isAtStart) {
          e.preventDefault();
          document.execCommand("formatBlock", false, "p");
        }
      }
    }
  }
});

document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === "n" && !e.shiftKey) {
    e.preventDefault();
    createNote();
  }
  if (ctrl && e.shiftKey && e.key.toLowerCase() === "c") {
    e.preventDefault();
    document.getElementById("btn-task").click();
  }
  if (ctrl && e.shiftKey && e.key === "N") {
    e.preventDefault();
    document.getElementById("btn-tpl").click();
  }
  if (ctrl && e.key === "\\") {
    e.preventDefault();
    document.getElementById("btn-tsb").click();
  }
  if (e.key === "Escape") {
    document.getElementById("slash").classList.remove("on");
    document.getElementById("ctx").classList.remove("on");
    document.getElementById("cpop-t").classList.remove("on");
    document.getElementById("cpop-h").classList.remove("on");
    closeSettings();
  }

  const slash = document.getElementById("slash");
  if (slash.classList.contains("on")) {
    const items = [...slash.querySelectorAll('.si:not([style*="none"])')];
    const foc = slash.querySelector(".si.foc");
    const idx = foc ? items.indexOf(foc) : -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      foc?.classList.remove("foc");
      items[Math.min(idx + 1, items.length - 1)]?.classList.add("foc");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      foc?.classList.remove("foc");
      items[Math.max(idx - 1, 0)]?.classList.add("foc");
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (foc) {
        applySlash(foc.dataset.t);
      } else if (items.length > 0) {
        applySlash(items[0].dataset.t);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      hideSlash();
    }
  }
});

document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".fpanel") &&
    !e.target.closest("#btn-tc") &&
    !e.target.closest("#btn-hl")
  ) {
    document.getElementById("cpop-t").classList.remove("on");
    document.getElementById("cpop-h").classList.remove("on");
  }
  if (!e.target.closest("#ctx") && !e.target.closest(".ni"))
    document.getElementById("ctx").classList.remove("on");
  if (!e.target.closest("#fctx") && !e.target.closest(".folder-hd")) {
    const fctx = document.getElementById("fctx");
    if (fctx) fctx.classList.remove("on");
  }
  if (!e.target.closest("#slash") && !e.target.closest("#ed")) hideSlash();
  if (!e.target.closest("#sr") && !e.target.closest("#search"))
    document.getElementById("sr").classList.remove("on");
});

document.getElementById("ed").addEventListener("change", (e) => {
  if (e.target.tagName === "INPUT" && e.target.type === "checkbox") {
    if (e.target.checked) e.target.setAttribute("checked", "checked");
    else e.target.removeAttribute("checked");

    // Simpan state segera
    const n = S.notes.find((n) => n.id === S.active);
    if (n) {
      n.content = document.getElementById("ed").innerHTML;
      n.modified = Date.now();
      saveLocal();
      if (S.user) cloudSave(n);
    }
  }
});

document.getElementById("ed").addEventListener("click", (e) => {
  // Tambah Baris Tabel
  if (e.target.closest(".tbl-row-add")) {
    const tbl = e.target.closest(".tbl-ctrl-wrap").querySelector("table");
    const lastRow = tbl.querySelector("tbody tr:last-child");
    if (!lastRow) return;
    const newRow = lastRow.cloneNode(true);
    newRow.querySelectorAll("td, th").forEach((td) => (td.textContent = ""));
    tbl.querySelector("tbody").appendChild(newRow);
    toast("Row added");

    const n = S.notes.find((n) => n.id === S.active);
    if (n) {
      n.content = document.getElementById("ed").innerHTML;
      saveLocal();
    }
    return;
  }
  // Tambah Kolom Tabel
  if (e.target.closest(".tbl-col-add")) {
    const tbl = e.target.closest(".tbl-ctrl-wrap").querySelector("table");
    tbl.querySelectorAll("tr").forEach((row) => {
      const isHead = row.closest("thead") !== null;
      row.appendChild(document.createElement(isHead ? "th" : "td"));
    });
    toast("Column added");

    const n = S.notes.find((n) => n.id === S.active);
    if (n) {
      n.content = document.getElementById("ed").innerHTML;
      saveLocal();
    }
    return;
  }
  // Thumbnail YouTube
  const thumb = e.target.closest(".yt-thumb-wrap");
  if (thumb) {
    loadYTPlayer(thumb.closest(".yt-wrap"));
  }
});

// Inisialisasi khusus perangkat mobile
if (window.innerWidth <= 900) {
  const sb = document.getElementById("sb");
  const pp = document.getElementById("pp");
  if (sb) { sb.classList.add("off"); S.sbOpen = false; }
  if (pp) { pp.classList.add("off"); S.ppOpen = false; }
}

// Klik di luar untuk menutup sidebar overlay di mobile
document.addEventListener("click", (e) => {
  if (window.innerWidth <= 900) {
    const sb = document.getElementById("sb");
    const pp = document.getElementById("pp");
    const btnTsb = document.getElementById("btn-tsb");
    const btnPp = document.getElementById("btn-pp");

    // Tutup sidebar
    if (S.sbOpen && sb && !sb.contains(e.target) && btnTsb && !btnTsb.contains(e.target)) {
      sb.classList.add("off");
      S.sbOpen = false;
    }
    // Tutup panel properti
    if (S.ppOpen && pp && !pp.contains(e.target) && btnPp && !btnPp.contains(e.target)) {
      pp.classList.add("off");
      S.ppOpen = false;
    }
  }
});

/* ═══════════════════════════════════════════
   ADMIN AUDIT PANEL
   ═══════════════════════════════════════════ */

async function openAuditPanel() {
  closeSettings();
  const modal = document.getElementById("modal-audit");
  modal.classList.add("on");
  // Reset search
  const searchEl = document.getElementById("audit-search");
  if (searchEl) searchEl.value = "";
  // Reset stats
  const statsEl = document.getElementById("audit-stats");
  if (statsEl) statsEl.style.display = "none";
  await loadAuditData();
}

async function loadAuditData() {
  const loading = document.getElementById("audit-loading");
  const tableWrap = document.getElementById("audit-table-wrap");
  const errorEl = document.getElementById("audit-error");
  loading.style.display = "";
  tableWrap.style.display = "none";
  if (errorEl) errorEl.style.display = "none";

  if (!window._admin) {
    loading.style.display = "none";
    if (errorEl) {
      errorEl.style.display = "";
      errorEl.querySelector(".audit-error-msg").textContent = "Modul admin tidak tersedia.";
    }
    return;
  }

  try {
    S.auditData = await window._admin.loadAllNotes();
    loading.style.display = "none";
    tableWrap.style.display = "";
    renderAuditTable(S.auditData);
    updateAuditStats(S.auditData);
    if (S.auditData.length > 0) {
      toast("Dimuat: " + S.auditData.length + " catatan dari semua pengguna", 3000);
    }
  } catch (e) {
    loading.style.display = "none";
    console.error("loadAuditData error:", e);
    if (errorEl) {
      errorEl.style.display = "";
      let msg = e.message || "Terjadi kesalahan saat memuat data.";
      if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
        msg = "Akses ditolak. Pastikan Firestore Rules untuk collectionGroup sudah diatur dan UID admin sudah benar.";
      } else if (msg.includes("index") || msg.includes("INDEX")) {
        msg = "Index Firestore belum dibuat. Buka link di konsol browser untuk membuat index collectionGroup.";
      }
      errorEl.querySelector(".audit-error-msg").textContent = msg;
    }
  }
}

function updateAuditStats(notes) {
  const statsEl = document.getElementById("audit-stats");
  if (!statsEl) return;

  const uniqueUsers = new Set(notes.map((n) => n._uid).filter(Boolean)).size;
  const uniqueFolders = new Set(notes.map((n) => n._folderName).filter((f) => f && f !== "—")).size;
  const totalWords = notes.reduce((acc, n) => {
    const plain = (n.content || "").replace(/<[^>]*>/g, "").trim();
    return acc + (plain ? plain.split(/\s+/).length : 0);
  }, 0);

  document.getElementById("stat-total").textContent = notes.length;
  document.getElementById("stat-users").textContent = uniqueUsers;
  document.getElementById("stat-folders").textContent = uniqueFolders;
  document.getElementById("stat-words").textContent = totalWords.toLocaleString("id-ID");
  statsEl.style.display = "";
}

function renderAuditTable(notes) {
  const body = document.getElementById("audit-body");
  const countEl = document.getElementById("audit-count");
  countEl.textContent = notes.length + " catatan";

  if (notes.length === 0) {
    body.innerHTML = `<tr><td colspan="8" class="audit-empty">
      <div class="audit-empty-icon">📭</div>
      <div>Tidak ada catatan ditemukan</div>
      <div class="audit-empty-sub">Pastikan Firestore Rules mengizinkan akses collectionGroup untuk admin</div>
    </td></tr>`;
    return;
  }

  body.innerHTML = notes.map((n, i) => {
    const plainText = (n.content || "").replace(/<[^>]*>/g, "").trim();
    const wordCount = plainText ? plainText.split(/\s+/).length : 0;
    const tags = (n.tags || []).map((t) => `<span class="audit-tag">${escapeHTML(t)}</span>`).join("") || '<span style="color:var(--tx3)">—</span>';
    return `<tr class="audit-row" onclick="showAuditDetail(this)" data-title="${escapeHTML(n.title || '')}" data-content="${encodeURIComponent(n.content || '')}">
      <td class="audit-num">${i + 1}</td>
      <td><span class="audit-user">${escapeHTML(n._userName || n._uid)}</span></td>
      <td class="audit-email">${escapeHTML(n._userEmail || '—')}</td>
      <td class="audit-note-title">${escapeHTML(n.title || 'Tanpa Judul')}</td>
      <td>${escapeHTML(n._folderName || '—')}</td>
      <td class="audit-tags-cell">${tags}</td>
      <td class="audit-date">${fmtD(n.modified)}</td>
      <td class="audit-words">${wordCount}</td>
    </tr>`;
  }).join("");
}

function filterAuditData() {
  const q = document.getElementById("audit-search").value.toLowerCase();
  if (!q) {
    renderAuditTable(S.auditData);
    return;
  }
  const filtered = S.auditData.filter((n) => {
    const plainText = (n.content || "").replace(/<[^>]*>/g, "").toLowerCase();
    return (
      (n.title || "").toLowerCase().includes(q) ||
      plainText.includes(q) ||
      (n._userName || "").toLowerCase().includes(q) ||
      (n._userEmail || "").toLowerCase().includes(q) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });
  renderAuditTable(filtered);
}

function showAuditDetail(row) {
  const title = row.dataset.title || "Tanpa Judul";
  const encoded = row.dataset.content || "";
  const content = decodeURIComponent(encoded);
  const modal = document.getElementById("modal-audit-detail");
  document.getElementById("audit-detail-title").textContent = title;
  const detailEl = document.getElementById("audit-detail-content");
  detailEl.innerHTML = sanitizeHTML(content) || '<em style="color: var(--tx3);">Konten kosong</em>';
  
  // Add task-list classes for better styling support
  detailEl.querySelectorAll('ul').forEach(ul => {
    if (ul.querySelector('input[type="checkbox"]')) {
      ul.classList.add('task-list');
      ul.querySelectorAll('li').forEach(li => {
        if (li.querySelector('input[type="checkbox"]')) {
          li.classList.add('task-list-item');
        }
      });
    }
  });

  // Replace YouTube embed with simple linked thumbnail
  detailEl.querySelectorAll('.yt-wrap').forEach(wrap => {
    const id = wrap.dataset.ytid;
    if (!id) return;
    const img = wrap.querySelector('img');
    const thumbSrc = img ? img.src : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const link = document.createElement('a');
    link.href = `https://www.youtube.com/watch?v=${id}`;
    link.target = "_blank";
    link.rel = "noopener";
    const thumbImg = document.createElement('img');
    thumbImg.src = thumbSrc;
    thumbImg.alt = "YouTube thumbnail";
    thumbImg.style.width = "100%";
    thumbImg.style.height = "auto";
    link.appendChild(thumbImg);
    wrap.parentNode.replaceChild(link, wrap);
  });
  modal.classList.add("on");
}

function closeAuditDetail() {
  document.getElementById("modal-audit-detail").classList.remove("on");
}

function exportAuditCSV() {
  if (!S.auditData.length) {
    toast("Tidak ada data untuk diekspor");
    return;
  }
  const headers = ["Pengguna", "Email", "UID", "Judul", "Folder", "Tags", "Konten (Plain Text)", "Dibuat", "Dimodifikasi"];
  const rows = S.auditData.map((n) => {
    const plainText = (n.content || "").replace(/<[^>]*>/g, "").replace(/\n/g, " ").trim();
    return [
      n._userName || "",
      n._userEmail || "",
      n._uid || "",
      n.title || "",
      n.folder || "",
      (n.tags || []).join("; "),
      plainText.substring(0, 500),
      fmtD(n.created),
      fmtD(n.modified),
    ].map((v) => '"' + String(v).replace(/"/g, '""') + '"');
  });
  const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: "data:text/csv;charset=utf-8," + encodeURIComponent(csv),
    download: "audit-jurnal-" + new Date().toISOString().slice(0, 10) + ".csv",
  });
  a.click();
  toast("CSV berhasil diekspor");
}

function exportAuditJSON() {
  if (!S.auditData.length) {
    toast("Tidak ada data untuk diekspor");
    return;
  }
  const data = S.auditData.map((n) => ({
    pengguna: n._userName || n._uid,
    email: n._userEmail || "",
    uid: n._uid || "",
    judul: n.title || "",
    folder: n.folder || "",
    tags: n.tags || [],
    konten: (n.content || "").replace(/<[^>]*>/g, "").trim(),
    dibuat: fmtD(n.created),
    dimodifikasi: fmtD(n.modified),
  }));
  const json = JSON.stringify(data, null, 2);
  const a = Object.assign(document.createElement("a"), {
    href: "data:application/json;charset=utf-8," + encodeURIComponent(json),
    download: "audit-jurnal-" + new Date().toISOString().slice(0, 10) + ".json",
  });
  a.click();
  toast("JSON berhasil diekspor");
}

// Export the currently opened audit note as Markdown
function exportAuditNoteMD() {
  const title = document.getElementById('audit-detail-title').textContent.trim() || 'note';
  const html = document.getElementById('audit-detail-content').innerHTML;
  const md = '# ' + title + '\n\n' + htmlToMD(html);
  const a = Object.assign(document.createElement('a'), {
    href: 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md),
    download: title + '.md',
  });
  a.click();
  toast('Exported as Markdown');
}

// Export the currently opened audit note as PDF (print‑to‑PDF)
function exportAuditNotePDF() {
  const title = document.getElementById('audit-detail-title').textContent.trim() || 'note';
  const html = document.getElementById('audit-detail-content').innerHTML;
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet">
  <style>
    body{font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.85;color:var(--tx);max-width:740px;margin:auto;padding:24px;}
    h1{font-family:'Playfair Display',serif;}
    img,video,iframe,table{max-width:100%;height:auto;}
    table{border-collapse:collapse;}
    th,td{border:1px solid #ddd;padding:8px;}
  </style></head><body>
    <h1>${title}</h1>${html}
    <script>window.onload=()=>window.print();<\/script>
  </body></html>`;
  const win = window.open('', '_blank');
  win.document.write(content);
  win.document.close();
  toast('Opening print dialog…');
}
