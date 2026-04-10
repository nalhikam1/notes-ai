// ═══════════════════════════════════════════════════════════════════════
// firebase-adapter.js
// Firebase Adapter — implementasi window._fb dan window._admin
// untuk Jurnal Persaudaraan Matahari
// ═══════════════════════════════════════════════════════════════════════
//
// CARA SETUP:
// ──────────────────────────────────────────────────────────────
// 1. Buat project di https://console.firebase.google.com/
// 2. Aktifkan Authentication → Sign-in method:
//      ✔ Google
//      ✔ Email/Password
// 3. Aktifkan Firestore Database (mode Production)
// 4. Buka Project Settings → General → Your apps → Add app (Web)
// 5. Salin nilai konfigurasi ke blok FIREBASE_CONFIG di bawah
// 6. Isi ADMIN_UIDS dengan UID akun Firebase yang boleh akses admin panel
//
// FIRESTORE SECURITY RULES (salin ke Firebase Console → Firestore → Rules):
// ──────────────────────────────────────────────────────────────
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     // Data per-user
//     match /users/{uid} {
//       allow read, write: if request.auth != null && request.auth.uid == uid;
//     }
//     match /users/{uid}/notes/{noteId} {
//       allow read, write: if request.auth != null && request.auth.uid == uid;
//     }
//     // Profil publik (bisa dibaca semua user terautentikasi, ditulis oleh pemilik)
//     match /profiles/{uid} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null && request.auth.uid == uid;
//     }
//     // Admin: akses collectionGroup notes (tambahkan index di Firebase Console)
//     match /{path=**}/notes/{noteId} {
//       allow read: if request.auth != null && request.auth.uid in
//         ['GANTI_DENGAN_UID_ADMIN_1', 'GANTI_DENGAN_UID_ADMIN_2'];
//     }
//   }
// }
// ──────────────────────────────────────────────────────────────

// ▼▼▼ ISI KONFIGURASI FIREBASE DI SINI ▼▼▼
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAWrqgWySqqI5EAIElIA4NoB8GstJ8GmqI",
  authDomain: "fnotes9.firebaseapp.com",
  projectId: "fnotes9",
  storageBucket: "fnotes9.firebasestorage.app",
  messagingSenderId: "161381122348",
  appId: "1:161381122348:web:971ae63875ba5f7474ac89",
  measurementId: "G-5MKHFFRFF5"
};

// ▼▼▼ ISI UID AKUN ADMIN DI SINI ▼▼▼
// Lihat UID di Firebase Console → Authentication → Users
const ADMIN_UIDS = [
    "eny8yvXnfAat5CVBMgHkfkACijG2"
  // "uid-akun-admin-pertama",
  // "uid-akun-admin-kedua",
];
// ▲▲▲ SELESAI KONFIGURASI ▲▲▲

// ═══════════════════════════════════════════════════════════════════════
// Inisialisasi Firebase
// ═══════════════════════════════════════════════════════════════════════

try {
  firebase.initializeApp(FIREBASE_CONFIG);
} catch (e) {
  // App sudah diinisialisasi (hot-reload)
  if (!/already exists/.test(e.message)) throw e;
}

const _auth = firebase.auth();
const _db   = firebase.firestore();

// Aktifkan persistensi offline (opsional, baik untuk PWA)
_db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

// ═══════════════════════════════════════════════════════════════════════
// Helper internal
// ═══════════════════════════════════════════════════════════════════════

function _mapUser(fbUser) {
  if (!fbUser) return null;
  return {
    uid:           fbUser.uid,
    email:         fbUser.email || '',
    displayName:   fbUser.displayName || fbUser.email || 'Pengguna',
    emailVerified: fbUser.emailVerified,
    photoURL:      fbUser.photoURL || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// window._fb — Adapter publik yang digunakan oleh script.js
// ═══════════════════════════════════════════════════════════════════════

window._fb = {

  // ── Auth ──────────────────────────────────────────────────────────

  /** Login Google via popup */
  async signInGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    const result = await _auth.signInWithPopup(provider);
    return _mapUser(result.user);
  },

  /** Login email + kata sandi */
  async signIn(email, pass) {
    const cred = await _auth.signInWithEmailAndPassword(email, pass);
    return _mapUser(cred.user);
  },

  /** Daftar akun baru dengan email + kata sandi */
  async signUp(email, pass) {
    const cred = await _auth.createUserWithEmailAndPassword(email, pass);
    return _mapUser(cred.user);
  },

  /** Logout */
  async signOut() {
    await _auth.signOut();
  },

  /** Dengarkan perubahan status login (dipanggil saat page load) */
  onAuth(callback) {
    _auth.onAuthStateChanged((fbUser) => {
      callback(fbUser ? _mapUser(fbUser) : null);
    });
  },

  /** Kirim email reset kata sandi */
  async sendPasswordReset(email) {
    await _auth.sendPasswordResetEmail(email);
  },

  // ── Firestore: Catatan ────────────────────────────────────────────

  /**
   * Simpan / update satu catatan.
   * Struktur: users/{uid}/notes/{noteId}
   */
  async saveNote(uid, note) {
    if (!uid || !note?.id) return;
    const ref = _db.collection('users').doc(uid).collection('notes').doc(note.id);
    const userEmail = _auth.currentUser?.email || note._userEmail || '';
    await ref.set({ ...note, _uid: uid, _userEmail: userEmail }, { merge: true });
  },

  /** Hapus satu catatan */
  async deleteNote(uid, noteId) {
    if (!uid || !noteId) return;
    const ref = _db.collection('users').doc(uid).collection('notes').doc(noteId);
    await ref.delete();
  },

  /** Real-time listener semua catatan pengguna */
  listenNotes(uid, callback) {
    const ref = _db.collection('users').doc(uid).collection('notes');
    return ref.onSnapshot((snap) => {
      const notes = snap.docs.map((d) => d.data());
      callback(notes);
    }, (err) => {
      console.error('listenNotes error:', err);
    });
  },

  // ── Firestore: Folder ─────────────────────────────────────────────

  /**
   * Simpan array folder ke dokumen users/{uid}.
   * Disimpan sebagai field 'folders' di dokumen utama user.
   */
  async saveFolders(uid, folders) {
    if (!uid) return;
    await _db.collection('users').doc(uid).set({ folders }, { merge: true });
  },

  /** Real-time listener folder pengguna */
  listenFolders(uid, callback) {
    const ref = _db.collection('users').doc(uid);
    return ref.onSnapshot((snap) => {
      const data = snap.data();
      callback(data?.folders || []);
    }, (err) => {
      console.error('listenFolders error:', err);
    });
  },

  // ── Firestore: Profil ─────────────────────────────────────────────

  /** Ambil profil pengguna dari koleksi profiles/{uid} */
  async getProfile(uid) {
    if (!uid) return {};
    try {
      const snap = await _db.collection('profiles').doc(uid).get();
      return snap.exists ? snap.data() : {};
    } catch {
      return {};
    }
  },

  /**
   * Perbarui profil pengguna.
   * Menyimpan ke profiles/{uid} DAN memperbarui displayName di Firebase Auth.
   */
  async updateProfile(uid, data) {
    if (!uid) return;
    await _db.collection('profiles').doc(uid).set(data, { merge: true });
    if (data.displayName && _auth.currentUser) {
      await _auth.currentUser.updateProfile({ displayName: data.displayName });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════
// window._admin — Modul Admin (hanya aktif jika UID ada di ADMIN_UIDS)
// ═══════════════════════════════════════════════════════════════════════

window._admin = {

  /** Kembalikan true jika user adalah admin */
  checkAdmin(user) {
    if (!user?.uid) return false;
    return ADMIN_UIDS.includes(user.uid);
  },

  /**
   * Muat semua catatan dari seluruh pengguna (admin panel).
   * Membutuhkan Firestore collectionGroup index dan rules yang sesuai.
   */
  async loadAllNotes() {
    const snap = await _db.collectionGroup('notes').get();
    const notes = snap.docs.map((d) => d.data());

    // Kumpulkan UID unik supaya bisa fetch profil + folder sekaligus
    const uids = [...new Set(notes.map((n) => n._uid).filter(Boolean))];

    const profileMap = {};
    await Promise.all(uids.map(async (uid) => {
      try {
        const [pSnap, uSnap] = await Promise.all([
          _db.collection('profiles').doc(uid).get(),
          _db.collection('users').doc(uid).get(),
        ]);
        profileMap[uid] = {
          displayName: pSnap.exists ? (pSnap.data().displayName || uid) : uid,
          folders:     uSnap.exists ? (uSnap.data().folders || []) : [],
        };
      } catch {
        profileMap[uid] = { displayName: uid, folders: [] };
      }
    }));

    // Tambahkan metadata tampilan ke setiap catatan
    notes.forEach((n) => {
      const prof = profileMap[n._uid] || {};
      n._userName   = prof.displayName || n._uid || 'Unknown';
      n._userEmail  = n._userEmail || '';
      const folder  = (prof.folders || []).find((f) => f.id === n.folder);
      n._folderName = folder ? folder.name : (n.folder ? n.folder : '—');
    });

    // Urutkan dari catatan terbaru
    notes.sort((a, b) => (b.modified || 0) - (a.modified || 0));

    return notes;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Kompatibilitas mundur dengan script.js (menggantikan PocketBase flags)
// ═══════════════════════════════════════════════════════════════════════

// Tandai backend sudah siap — digunakan script.js untuk mengaktifkan tombol auth
window._pbReady = true;

// Stub _pb agar kondisi "if (window._pbReady && window._pb)" di script.js terpenuhi,
// tetapi authStore.isValid = false supaya Firebase onAuth() yang menangani sesi.
window._pb = {
  authStore: {
    isValid: false,
    model:   null,
  },
};

console.log('%c✅ Firebase Adapter siap', 'color: #4CAF50; font-weight: bold;');
