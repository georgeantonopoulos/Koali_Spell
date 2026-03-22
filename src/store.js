import {
  addDoc,
  auth,
  collection,
  createUserWithEmailAndPassword,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  isFirebaseConfigured,
  onAuthStateChanged,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateDoc,
  updateProfile,
  writeBatch
} from './firebase.js';

const CACHE_PREFIX = 'koali_cloud_cache';
const IMPORT_PREFIX = 'koali_imported';

function requireConfigured() {
  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error('Firebase is not configured yet. Update src/firebase-config.js first.');
  }
}

function requireUser() {
  requireConfigured();
  if (!auth.currentUser) {
    throw new Error('You need to sign in first.');
  }
  return auth.currentUser;
}

function nowIso() {
  return new Date().toISOString();
}

function cacheKey(uid, childId, suffix) {
  return [CACHE_PREFIX, uid, childId || 'app', suffix].join(':');
}

function importKey(uid, legacyId) {
  return [IMPORT_PREFIX, uid, legacyId].join(':');
}

function safeReadJson(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function safeWriteJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function safeRemove(key) {
  localStorage.removeItem(key);
}

function userDocRef(uid) {
  return doc(db, 'users', uid);
}

function householdDocRef(householdId) {
  return doc(db, 'households', householdId);
}

function childrenCollection(householdId) {
  return collection(db, 'households', householdId, 'children');
}

function childDocRef(householdId, childId) {
  return doc(db, 'households', householdId, 'children', childId);
}

function wordsCollection(householdId, childId) {
  return collection(db, 'households', householdId, 'children', childId, 'words');
}

function wordDocRef(householdId, childId, wordId) {
  return doc(db, 'households', householdId, 'children', childId, 'words', wordId);
}

function normalizeChildProfile(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    householdId: data.householdId,
    childDisplayName: data.childDisplayName,
    gameTitle: data.gameTitle,
    characterName: data.characterName,
    avatarPresetId: data.avatarPresetId,
    bossPresetId: data.bossPresetId,
    themePresetId: data.themePresetId,
    currencyName: data.currencyName,
    defaultTimesTables: Array.isArray(data.defaultTimesTables) ? data.defaultTimesTables : [],
    mathRoundsMode: data.mathRoundsMode || 'match_words',
    fixedMathRounds: typeof data.fixedMathRounds === 'number' ? data.fixedMathRounds : null,
    totalCoins: typeof data.totalCoins === 'number' ? data.totalCoins : 0,
    starterProfileId: data.starterProfileId || 'koali',
    createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || nowIso(),
    updatedAt: data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || nowIso()
  };
}

async function ensureHouseholdForCurrentUser(displayNameHint) {
  const user = requireUser();
  const householdId = user.uid;
  const userRef = userDocRef(user.uid);
  const householdRef = householdDocRef(householdId);
  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    const displayName = user.displayName || displayNameHint || user.email || 'Koali Family';
    await setDoc(userRef, {
      email: user.email || '',
      displayName: displayName,
      defaultHouseholdId: householdId,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp()
    });
  } else {
    await updateDoc(userRef, {
      lastSeenAt: serverTimestamp()
    });
  }

  const householdSnapshot = await getDoc(householdRef);
  if (!householdSnapshot.exists()) {
    await setDoc(householdRef, {
      ownerUid: user.uid,
      name: (user.displayName || displayNameHint || 'Koali Household') + "'s Household",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  return householdId;
}

function subscribeToSession(callback) {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return function() {};
  }
  return onAuthStateChanged(auth, callback);
}

function getSessionUser() {
  return auth ? auth.currentUser : null;
}

async function signUpWithEmailPassword(email, password, displayName) {
  requireConfigured();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(credential.user, { displayName: displayName });
  }
  const householdId = await ensureHouseholdForCurrentUser(displayName);
  return { user: credential.user, householdId: householdId };
}

async function signInWithEmailPassword(email, password) {
  requireConfigured();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const householdId = await ensureHouseholdForCurrentUser();
  return { user: credential.user, householdId: householdId };
}

async function signOutUser() {
  requireConfigured();
  await signOut(auth);
}

async function listChildProfiles(householdId) {
  requireUser();
  try {
    const snapshot = await getDocs(query(childrenCollection(householdId), orderBy('updatedAt', 'desc')));
    const profiles = snapshot.docs.map(normalizeChildProfile);
    safeWriteJson(cacheKey(auth.currentUser.uid, 'dashboard', 'children'), profiles);
    return profiles;
  } catch (error) {
    return safeReadJson(cacheKey(auth.currentUser.uid, 'dashboard', 'children'), []);
  }
}

async function getChildProfile(householdId, childId) {
  requireUser();
  try {
    const snapshot = await getDoc(childDocRef(householdId, childId));
    if (!snapshot.exists()) {
      throw new Error('That child profile could not be found.');
    }
    const profile = normalizeChildProfile(snapshot);
    safeWriteJson(cacheKey(auth.currentUser.uid, childId, 'profile'), profile);
    return profile;
  } catch (error) {
    const cached = safeReadJson(cacheKey(auth.currentUser.uid, childId, 'profile'), null);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function createChildProfile(householdId, input) {
  requireUser();
  const now = serverTimestamp();
  const payload = {
    householdId: householdId,
    childDisplayName: input.childDisplayName,
    gameTitle: input.gameTitle,
    characterName: input.characterName,
    avatarPresetId: input.avatarPresetId,
    bossPresetId: input.bossPresetId,
    themePresetId: input.themePresetId,
    currencyName: input.currencyName,
    defaultTimesTables: input.defaultTimesTables,
    mathRoundsMode: input.mathRoundsMode,
    fixedMathRounds: input.fixedMathRounds,
    totalCoins: input.totalCoins || 0,
    starterProfileId: input.starterProfileId || 'koali',
    createdAt: now,
    updatedAt: now
  };

  const reference = await addDoc(childrenCollection(householdId), payload);
  return reference.id;
}

async function updateChildProfile(householdId, childId, patch) {
  requireUser();
  await updateDoc(childDocRef(householdId, childId), Object.assign({}, patch, {
    updatedAt: serverTimestamp()
  }));
}

async function deleteChildProfile(householdId, childId) {
  requireUser();
  const wordsSnapshot = await getDocs(wordsCollection(householdId, childId));
  const batch = writeBatch(db);

  wordsSnapshot.forEach(function(wordSnapshot) {
    batch.delete(wordSnapshot.ref);
  });

  batch.delete(childDocRef(householdId, childId));
  await batch.commit();

  safeRemove(cacheKey(auth.currentUser.uid, childId, 'profile'));
  safeRemove(cacheKey(auth.currentUser.uid, childId, 'words'));
}

async function loadWords(householdId, childId) {
  requireUser();
  try {
    const snapshot = await getDocs(query(wordsCollection(householdId, childId), orderBy('sortOrder', 'asc')));
    const words = snapshot.docs.map(function(wordSnapshot) {
      const data = wordSnapshot.data();
      return {
        id: wordSnapshot.id,
        word: data.word,
        hint: data.hint,
        emoji: data.emoji,
        sortOrder: data.sortOrder
      };
    });
    safeWriteJson(cacheKey(auth.currentUser.uid, childId, 'words'), words);
    return words;
  } catch (error) {
    return safeReadJson(cacheKey(auth.currentUser.uid, childId, 'words'), []);
  }
}

async function saveWords(householdId, childId, words) {
  requireUser();
  const snapshot = await getDocs(wordsCollection(householdId, childId));
  const existing = {};
  snapshot.forEach(function(wordSnapshot) {
    existing[wordSnapshot.id] = true;
  });

  const batch = writeBatch(db);

  words.forEach(function(word, index) {
    const wordId = word.id || ('word-' + index + '-' + word.word);
    delete existing[wordId];
    batch.set(wordDocRef(householdId, childId, wordId), {
      word: word.word,
      hint: word.hint,
      emoji: word.emoji,
      sortOrder: index,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  Object.keys(existing).forEach(function(wordId) {
    batch.delete(wordDocRef(householdId, childId, wordId));
  });

  await batch.commit();

  const cachedWords = words.map(function(word, index) {
    return {
      id: word.id || ('word-' + index + '-' + word.word),
      word: word.word,
      hint: word.hint,
      emoji: word.emoji,
      sortOrder: index
    };
  });
  safeWriteJson(cacheKey(auth.currentUser.uid, childId, 'words'), cachedWords);
}

async function loadSettings(householdId, childId) {
  return getChildProfile(householdId, childId);
}

async function saveSettings(householdId, childId, settings) {
  await updateChildProfile(householdId, childId, settings);
}

async function incrementTotalCoins(householdId, childId, delta) {
  requireUser();
  await updateDoc(childDocRef(householdId, childId), {
    totalCoins: increment(delta),
    updatedAt: serverTimestamp()
  });

  const cachedProfile = safeReadJson(cacheKey(auth.currentUser.uid, childId, 'profile'), null);
  if (cachedProfile) {
    cachedProfile.totalCoins = (cachedProfile.totalCoins || 0) + delta;
    cachedProfile.updatedAt = nowIso();
    safeWriteJson(cacheKey(auth.currentUser.uid, childId, 'profile'), cachedProfile);
  }
}

function markLegacyProfileImported(uid, legacyId) {
  localStorage.setItem(importKey(uid, legacyId), 'true');
}

function hasImportedLegacyProfile(uid, legacyId) {
  return localStorage.getItem(importKey(uid, legacyId)) === 'true';
}

async function importLocalProfileIfNeeded(options) {
  const user = requireUser();
  if (!options || !Array.isArray(options.legacyProfiles) || options.legacyProfiles.length === 0) {
    return [];
  }
  if (options.existingChildrenCount > 0) {
    return [];
  }

  return options.legacyProfiles.filter(function(profile) {
    return !hasImportedLegacyProfile(user.uid, profile.legacyId);
  });
}

export {
  ensureHouseholdForCurrentUser,
  getChildProfile,
  getSessionUser,
  importLocalProfileIfNeeded,
  incrementTotalCoins,
  isFirebaseConfigured,
  listChildProfiles,
  loadSettings,
  loadWords,
  markLegacyProfileImported,
  saveSettings,
  saveWords,
  signInWithEmailPassword,
  signOutUser,
  signUpWithEmailPassword,
  subscribeToSession,
  createChildProfile,
  updateChildProfile,
  deleteChildProfile
};
