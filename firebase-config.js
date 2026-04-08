// ===== FIREBASE CONFIGURATION =====
// Firebase will be initialized from environment variables in production
// For local development, create a .env file with your Firebase config

const firebaseConfig = {
  apiKey: "AIzaSyAWrqgWySqqI5EAIElIA4NoB8GstJ8GmqI",
  authDomain: "fnotes9.firebaseapp.com",
  projectId: "fnotes9",
  storageBucket: "fnotes9.firebasestorage.app",
  messagingSenderId: "161381122348",
  appId: "1:161381122348:web:971ae63875ba5f7474ac89",
  measurementId: "G-5MKHFFRFF5"
};

// Initialize Firebase
let auth, db;
let currentUser = null;
let isGuest = false;

function initFirebase() {
  try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Listen for auth state changes
    auth.onAuthStateChanged(onAuthStateChanged);
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // Fallback to localStorage only
    showToast('Cloud sync unavailable, using local storage only', 'error');
  }
}

// ===== AUTH STATE HANDLER =====
function onAuthStateChanged(user) {
  currentUser = user;
  
  if (user) {
    isGuest = user.isAnonymous;
    console.log('User signed in:', isGuest ? 'Guest' : user.email);
    
    // Update UI
    updateAuthUI();
    
    // Sync data from cloud
    if (!isGuest) {
      syncFromCloud();
    }
  } else {
    console.log('User signed out');
    currentUser = null;
    isGuest = false;
    updateAuthUI();
  }
}

// ===== AUTHENTICATION METHODS =====

// Sign in with Google
async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    
    showToast('Signed in as ' + result.user.email, 'success');
    
    // Merge local data with cloud data
    await mergeLocalToCloud();
    
    return result.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    showToast('Sign in failed: ' + error.message, 'error');
    throw error;
  }
}

// Sign in as guest (anonymous)
async function signInAsGuest() {
  try {
    const result = await auth.signInAnonymously();
    showToast('Signed in as Guest', 'success');
    return result.user;
  } catch (error) {
    console.error('Guest sign in error:', error);
    showToast('Guest sign in failed: ' + error.message, 'error');
    throw error;
  }
}

// Sign out
async function signOut() {
  try {
    await auth.signOut();
    showToast('Signed out successfully', 'success');
    
    // Clear local state but keep localStorage as backup
    ST.notes = [];
    ST.projects = [];
    ST.folders = [];
    renderSidebar();
    showDashboard();
  } catch (error) {
    console.error('Sign out error:', error);
    showToast('Sign out failed: ' + error.message, 'error');
  }
}

// Upgrade guest to Google account
async function upgradeGuestAccount() {
  if (!isGuest) {
    showToast('Already signed in with Google', 'error');
    return;
  }
  
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await currentUser.linkWithPopup(provider);
    
    showToast('Account upgraded! Data saved to ' + result.user.email, 'success');
    
    // Save guest data to the new account
    await syncToCloud();
    
    return result.user;
  } catch (error) {
    console.error('Account upgrade error:', error);
    showToast('Upgrade failed: ' + error.message, 'error');
    throw error;
  }
}

// ===== CLOUD SYNC METHODS =====

// Save data to cloud
async function syncToCloud() {
  if (!currentUser || isGuest) {
    console.log('Skipping cloud sync (guest or not signed in)');
    return;
  }
  
  try {
    const userId = currentUser.uid;
    const data = {
      notes: ST.notes,
      projects: ST.projects,
      folders: ST.folders,
      templates: ST.templates,
      persona: ST.persona,
      ai: ST.ai,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(userId).set(data, { merge: true });
    
    console.log('Data synced to cloud');
    updateSyncStatus('synced');
  } catch (error) {
    console.error('Cloud sync error:', error);
    updateSyncStatus('error');
    throw error;
  }
}

// Load data from cloud
async function syncFromCloud() {
  if (!currentUser || isGuest) {
    console.log('Skipping cloud sync (guest or not signed in)');
    return;
  }
  
  try {
    const userId = currentUser.uid;
    const doc = await db.collection('users').doc(userId).get();
    
    if (doc.exists) {
      const data = doc.data();
      
      // Merge cloud data with local data
      ST.notes = data.notes || ST.notes;
      ST.projects = data.projects || ST.projects;
      ST.folders = data.folders || ST.folders;
      ST.templates = data.templates || ST.templates;
      ST.persona = data.persona || ST.persona;
      ST.ai = data.ai || ST.ai;
      
      // Save to localStorage as backup
      saveState();
      
      // Update UI
      renderSidebar();
      if (ST.viewType === 'dashboard') renderGlobalDashboard();
      
      console.log('Data loaded from cloud');
      showToast('Data synced from cloud', 'success');
    } else {
      console.log('No cloud data found, using local data');
      // Upload local data to cloud
      await syncToCloud();
    }
  } catch (error) {
    console.error('Cloud load error:', error);
    showToast('Failed to load cloud data', 'error');
  }
}

// Merge local data to cloud (when signing in)
async function mergeLocalToCloud() {
  if (!currentUser || isGuest) return;
  
  try {
    const userId = currentUser.uid;
    const doc = await db.collection('users').doc(userId).get();
    
    if (doc.exists) {
      const cloudData = doc.data();
      
      // Smart merge: combine local and cloud data
      const mergedNotes = [...(cloudData.notes || [])];
      const mergedProjects = [...(cloudData.projects || [])];
      const mergedFolders = [...(cloudData.folders || [])];
      
      // Add local notes that don't exist in cloud
      ST.notes.forEach(localNote => {
        const exists = mergedNotes.find(n => n.id === localNote.id);
        if (!exists) {
          mergedNotes.push(localNote);
        }
      });
      
      // Add local projects that don't exist in cloud
      ST.projects.forEach(localProject => {
        const exists = mergedProjects.find(p => p.id === localProject.id);
        if (!exists) {
          mergedProjects.push(localProject);
        }
      });
      
      // Add local folders that don't exist in cloud
      ST.folders.forEach(localFolder => {
        const exists = mergedFolders.find(f => f.id === localFolder.id);
        if (!exists) {
          mergedFolders.push(localFolder);
        }
      });
      
      // Update state
      ST.notes = mergedNotes;
      ST.projects = mergedProjects;
      ST.folders = mergedFolders;
      
      // Save merged data to cloud
      await syncToCloud();
      
      // Update UI
      renderSidebar();
      if (ST.viewType === 'dashboard') renderGlobalDashboard();
      
      showToast('Local data merged with cloud', 'success');
    } else {
      // No cloud data, just upload local data
      await syncToCloud();
    }
  } catch (error) {
    console.error('Merge error:', error);
    showToast('Failed to merge data', 'error');
  }
}

// Auto-sync on changes (debounced)
let syncTimer = null;
function scheduleCloudSync() {
  if (!currentUser || isGuest) return;
  
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncToCloud().catch(err => console.error('Auto-sync failed:', err));
  }, 3000); // Sync after 3 seconds of inactivity
}

// ===== UI HELPERS =====

function updateAuthUI() {
  const authSection = document.getElementById('auth-section');
  if (!authSection) return;
  
  if (currentUser) {
    if (isGuest) {
      authSection.innerHTML = `
        <div class="auth-info">
          <span>👤 Guest Mode</span>
          <button class="btn-secondary" onclick="upgradeGuestAccount()" style="padding:6px 12px;font-size:11px;">Upgrade to Google</button>
          <button class="btn-secondary" onclick="signOut()" style="padding:6px 12px;font-size:11px;">Sign Out</button>
        </div>
      `;
    } else {
      authSection.innerHTML = `
        <div class="auth-info">
          <img src="${currentUser.photoURL || 'https://via.placeholder.com/32'}" alt="Avatar" style="width:24px;height:24px;border-radius:50%;margin-right:8px;">
          <span style="font-size:11px;">${currentUser.email}</span>
          <button class="btn-secondary" onclick="signOut()" style="padding:6px 12px;font-size:11px;margin-left:8px;">Sign Out</button>
        </div>
      `;
    }
  } else {
    authSection.innerHTML = `
      <div class="auth-buttons">
        <button class="btn-primary" onclick="signInWithGoogle()" style="padding:8px 16px;font-size:12px;">
          <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right:6px;"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign in with Google
        </button>
        <button class="btn-secondary" onclick="signInAsGuest()" style="padding:8px 16px;font-size:12px;margin-top:8px;">
          Continue as Guest
        </button>
      </div>
    `;
  }
}

function updateSyncStatus(status) {
  const syncStatus = document.getElementById('sb-save-status');
  if (!syncStatus) return;
  
  if (status === 'syncing') {
    syncStatus.textContent = '☁️ Syncing...';
    syncStatus.style.color = 'var(--text3)';
  } else if (status === 'synced') {
    syncStatus.textContent = '☁️ Synced';
    syncStatus.style.color = 'var(--green)';
  } else if (status === 'error') {
    syncStatus.textContent = '☁️ Sync Error';
    syncStatus.style.color = 'var(--red)';
  } else {
    syncStatus.textContent = 'Local Only';
    syncStatus.style.color = 'var(--text3)';
  }
}
