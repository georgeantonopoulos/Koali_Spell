import {
  createChildProfile,
  deleteChildProfile,
  ensureHouseholdForCurrentUser,
  getChildProfile,
  importLocalProfileIfNeeded,
  incrementTotalCoins,
  isFirebaseConfigured,
  listChildProfiles,
  loadWords as loadCloudWords,
  markLegacyProfileImported,
  saveWords as saveCloudWords,
  signInWithEmailPassword,
  signOutUser,
  signUpWithEmailPassword,
  subscribeToSession,
  updateChildProfile
} from './store.js';

// ═══════════════════ DEFAULT DATA ═══════════════════
const DEFAULT_SUBTITLE = 'Spell & Math Time!';

const DEFAULT_WORDS = [
  { word: 'boy', emoji: '👦', hint: 'A young male person' },
  { word: 'two', emoji: '2️⃣', hint: 'The number after one' },
  { word: 'four', emoji: '4️⃣', hint: 'The number after three' },
  { word: 'five', emoji: '5️⃣', hint: 'The number after four' },
  { word: 'torch', emoji: '🔦', hint: 'A light you can carry' },
  { word: 'north', emoji: '🧭', hint: 'The direction at the top of a map' },
  { word: 'launch', emoji: '🚀', hint: 'To send something off or start it' },
  { word: 'haunt', emoji: '👻', hint: 'To visit as a ghost' },
  { word: 'claw', emoji: '🦞', hint: 'A sharp curved nail on an animal' },
  { word: 'lawn', emoji: '🌿', hint: 'An area of cut grass' }
];

const MAYA_DEFAULT_WORDS = [
  { word: 'interest', emoji: '💡', hint: 'A feeling of wanting to know more' },
  { word: 'library', emoji: '📚', hint: 'A place with lots of books' },
  { word: 'remember', emoji: '🧠', hint: 'To recall something from your memory' },
  { word: 'dictionary', emoji: '📖', hint: 'A book that explains word meanings' },
  { word: 'desperate', emoji: '😰', hint: 'Having a great need or urgency' },
  { word: 'miserable', emoji: '😢', hint: 'Very unhappy or uncomfortable' },
  { word: 'jewellery', emoji: '💍', hint: 'Decorative items like rings and necklaces' },
  { word: 'general', emoji: '🎖️', hint: 'Relating to most cases; not specific' },
  { word: 'centre', emoji: '🎯', hint: 'The middle point of something' },
  { word: 'poisonous', emoji: '☠️', hint: 'Harmful or deadly if touched or eaten' }
];

const AVATAR_PRESETS = {
  koali: {
    id: 'koali',
    label: 'Koali the Koala',
    mascot: '🐨',
    heroEmoji: '🐨🌿',
    leafEmojis: ['🍃', '🌿', '🍂', '🌱']
  },
  bigBear: {
    id: 'bigBear',
    label: 'Big Bear',
    mascot: '🐻',
    heroEmoji: '🐻⭐',
    leafEmojis: ['⭐', '🌟', '✨', '🐝']
  },
  tiger: {
    id: 'tiger',
    label: 'Tilly the Tiger',
    mascot: '🐯',
    heroEmoji: '🐯⚡',
    leafEmojis: ['⚡', '✨', '🍃', '🌟']
  }
};

const BOSS_PRESETS = {
  bear: {
    id: 'bear',
    label: 'Bear',
    name: 'BEAR',
    bossClass: 'boss-bear',
    attackMsg: '🔥 Bear attacks!'
  },
  skeleton: {
    id: 'skeleton',
    label: 'Skeleton',
    name: 'SKELETON',
    bossClass: 'boss-skeleton',
    attackMsg: '💀 Skeleton attacks!'
  }
};

const THEME_PRESETS = {
  forest: {
    id: 'forest',
    label: 'Forest Glow',
    bodyGradient: 'linear-gradient(135deg, #0f4c3a 0%, #1a7a5a 30%, #43cea2 60%, #185a9d 100%)',
    bossGradient: 'linear-gradient(135deg, #1a0a0a 0%, #3d1111 30%, #5a1a1a 60%, #2a0505 100%)'
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset Trail',
    bodyGradient: 'linear-gradient(135deg, #4a2c17 0%, #8b5e3c 30%, #d4956a 60%, #c4722a 100%)',
    bossGradient: 'linear-gradient(135deg, #0a0a1a 0%, #111133 30%, #1a1a4a 60%, #050520 100%)'
  },
  aurora: {
    id: 'aurora',
    label: 'Aurora Mist',
    bodyGradient: 'linear-gradient(135deg, #12343b 0%, #246a73 35%, #49beb7 65%, #75e6da 100%)',
    bossGradient: 'linear-gradient(135deg, #22092c 0%, #42104c 40%, #5a1f6b 70%, #2d0a37 100%)'
  }
};

const STARTER_PROFILE_TEMPLATES = {
  koali: {
    starterProfileId: 'koali',
    childDisplayName: 'Christopher',
    gameTitle: "Koali's Adventure",
    characterName: 'Koali',
    avatarPresetId: 'koali',
    bossPresetId: 'bear',
    themePresetId: 'forest',
    currencyName: 'Koali Pounds',
    defaultWords: DEFAULT_WORDS,
    defaultTimesTables: [4, 9],
    mathRoundsMode: 'match_words',
    fixedMathRounds: null
  },
  bear: {
    starterProfileId: 'bear',
    childDisplayName: 'Maya',
    gameTitle: "Big Bear's Adventure",
    characterName: 'Big Bear',
    avatarPresetId: 'bigBear',
    bossPresetId: 'skeleton',
    themePresetId: 'sunset',
    currencyName: 'Bear Coins',
    defaultWords: MAYA_DEFAULT_WORDS,
    defaultTimesTables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    mathRoundsMode: 'fixed',
    fixedMathRounds: 5
  }
};

const LEGACY_PROFILE_MAP = {
  christopher: 'koali',
  maya: 'bear'
};

var currentProfile = null;
var currentUser = null;
var currentHouseholdId = null;
var currentChildId = null;
var currentChildRecord = null;
var currentChildWords = [];
var childProfiles = [];
var legacyImportCandidates = [];
var authMode = 'signup';
var editorMode = 'edit';
var editingChildId = null;
var editorStarterProfileId = 'koali';
var editorWords = [];
var editorTimesTables = [];

function cloneWords(words) {
  return words.map(function(word, index) {
    return {
      id: word.id || ('word-' + index + '-' + word.word),
      word: word.word,
      emoji: word.emoji,
      hint: word.hint,
      sortOrder: typeof word.sortOrder === 'number' ? word.sortOrder : index
    };
  });
}

function getStarterProfileTemplate(starterProfileId) {
  return STARTER_PROFILE_TEMPLATES[starterProfileId] || STARTER_PROFILE_TEMPLATES.koali;
}

function defaultWordsForStarter(starterProfileId) {
  return cloneWords(getStarterProfileTemplate(starterProfileId).defaultWords);
}

function defaultTablesForStarter(starterProfileId) {
  return getStarterProfileTemplate(starterProfileId).defaultTimesTables.slice();
}

function singularizeCurrency(name) {
  if (!name) return 'Coin';
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
  if (name.endsWith('s')) return name.slice(0, -1);
  return name;
}

function createChildPayloadFromStarter(starterProfileId) {
  var starter = getStarterProfileTemplate(starterProfileId);
  return {
    childDisplayName: starter.childDisplayName,
    gameTitle: starter.gameTitle,
    characterName: starter.characterName,
    avatarPresetId: starter.avatarPresetId,
    bossPresetId: starter.bossPresetId,
    themePresetId: starter.themePresetId,
    currencyName: starter.currencyName,
    defaultTimesTables: starter.defaultTimesTables.slice(),
    mathRoundsMode: starter.mathRoundsMode,
    fixedMathRounds: starter.fixedMathRounds,
    totalCoins: 0,
    starterProfileId: starter.starterProfileId
  };
}

function safeParseJson(rawValue, fallbackValue) {
  try {
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function deriveStarterProfileIdFromEditor() {
  var avatarValue = document.getElementById('avatarPresetSelect').value;
  var bossValue = document.getElementById('bossPresetSelect').value;
  return avatarValue === 'bigBear' || bossValue === 'skeleton' ? 'bear' : 'koali';
}

function buildRuntimeProfile(childProfile, words) {
  var avatar = AVATAR_PRESETS[childProfile.avatarPresetId] || AVATAR_PRESETS.koali;
  var boss = BOSS_PRESETS[childProfile.bossPresetId] || BOSS_PRESETS.bear;
  var theme = THEME_PRESETS[childProfile.themePresetId] || THEME_PRESETS.forest;
  var mascotName = childProfile.characterName || avatar.label;
  var bossName = boss.label.toLowerCase();
  var currencyName = childProfile.currencyName || 'Koali Pounds';

  return {
    id: childProfile.id,
    name: childProfile.childDisplayName,
    gameName: childProfile.gameTitle,
    subtitle: DEFAULT_SUBTITLE,
    mascot: avatar.mascot,
    mascotName: mascotName,
    heroEmoji: avatar.heroEmoji,
    bodyGradient: theme.bodyGradient,
    bossGradient: theme.bossGradient,
    bossName: boss.name,
    bossClass: boss.bossClass,
    bossAttackMsg: boss.attackMsg,
    bossDefeatMsg: '🎉 YOU DEFEATED THE ' + boss.name + '!',
    bossLoseMsg: '💔 The ' + bossName + ' wins this time...',
    currencyName: currencyName,
    currencySingular: singularizeCurrency(currencyName),
    defaultWords: cloneWords(words && words.length ? words : defaultWordsForStarter(childProfile.starterProfileId)),
    defaultTables: (childProfile.defaultTimesTables || []).slice(),
    victoryBossMsg: 'You spelled the words, did the math, AND defeated the ' + bossName + '! ' + mascotName + ' is SO proud!',
    victoryNoBossMsg: 'You completed all the challenges! ' + mascotName + ' is proud!',
    leafEmojis: avatar.leafEmojis,
    mathRounds: childProfile.mathRoundsMode === 'fixed' ? childProfile.fixedMathRounds : null
  };
}

function setBanner(elementId, message, isError) {
  var element = document.getElementById(elementId);
  if (!element) return;
  if (!message) {
    element.style.display = 'none';
    element.textContent = '';
    return;
  }
  element.style.display = 'block';
  element.textContent = message;
  element.style.background = isError ? 'rgba(192, 57, 43, 0.28)' : 'rgba(39, 174, 96, 0.22)';
  element.style.borderColor = isError ? 'rgba(192, 57, 43, 0.45)' : 'rgba(39, 174, 96, 0.4)';
}

function populatePresetSelects() {
  fillSelect('avatarPresetSelect', Object.keys(AVATAR_PRESETS).map(function(id) {
    return { value: id, label: AVATAR_PRESETS[id].label + ' ' + AVATAR_PRESETS[id].mascot };
  }));
  fillSelect('bossPresetSelect', Object.keys(BOSS_PRESETS).map(function(id) {
    return { value: id, label: BOSS_PRESETS[id].label };
  }));
  fillSelect('themePresetSelect', Object.keys(THEME_PRESETS).map(function(id) {
    return { value: id, label: THEME_PRESETS[id].label };
  }));
}

function fillSelect(elementId, options) {
  var select = document.getElementById(elementId);
  if (!select) return;
  select.textContent = '';
  options.forEach(function(optionData) {
    var option = document.createElement('option');
    option.value = optionData.value;
    option.textContent = optionData.label;
    select.appendChild(option);
  });
}

function toggleFixedMathRoundsVisibility() {
  var mode = document.getElementById('mathRoundsModeSelect').value;
  document.getElementById('fixedMathRoundsWrap').style.display = mode === 'fixed' ? 'grid' : 'none';
}

function loadWords() {
  if (currentChildWords.length > 0) {
    return cloneWords(currentChildWords);
  }
  if (currentChildRecord) {
    return defaultWordsForStarter(currentChildRecord.starterProfileId);
  }
  return defaultWordsForStarter('koali');
}

function saveWords(words) {
  currentChildWords = cloneWords(words);
}

function loadTimesTables() {
  if (currentChildRecord && Array.isArray(currentChildRecord.defaultTimesTables) && currentChildRecord.defaultTimesTables.length > 0) {
    return currentChildRecord.defaultTimesTables.slice();
  }
  return defaultTablesForStarter(currentChildRecord ? currentChildRecord.starterProfileId : 'koali');
}

function saveTimesTables(tables) {
  if (currentChildRecord) {
    currentChildRecord.defaultTimesTables = tables.slice();
  }
}

function loadTotalPounds() {
  return currentChildRecord ? parseInt(currentChildRecord.totalCoins || 0, 10) : 0;
}

function saveTotalPounds(total) {
  if (currentChildRecord) {
    currentChildRecord.totalCoins = total;
  }
}

// ═══════════════════ GAME STATE ═══════════════════
var activeWords = [];
var activeTimesTables = [];
var TOTAL_ROUNDS = 0;
var roundSchedule = [];

var gamePhase = 'start'; // 'start' | 'playing' | 'boss' | 'victory'
var currentRoundCount = 0;
var currentSpellingIndex = 0;

var score = 0;
var streak = 0;
var maxStreak = 0;
var hintsLeft = 3;
var correctAnswers = 0;
var totalQuestions = 0;

// Boss state
var bossHp = 100;
var playerHeartsCount = 3;
var bossTimerInterval = null;
var bossTimerTimeout = null;
var currentBossAnswer = null;
var bossRoundsPlayed = 0;
var bossHeartsLost = 0;

// Spelling state
var currentMathAnswer = 0;
var slotContents = [];
var shuffledLetters = [];
var draggedLetter = null;
var draggedLetterIndex = null;
var touchDragElement = null;
var touchSourceIndex = null;

// ═══════════════════ INIT ═══════════════════
var AudioContextClass = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContextClass();

function init() {
  populatePresetSelects();
  document.getElementById('mathRoundsModeSelect').addEventListener('change', toggleFixedMathRoundsVisibility);
  updateAuthButtonCopy();
  createLeaves();

  if (!isFirebaseConfigured) {
    document.getElementById('firebaseSetupNotice').style.display = 'block';
    document.getElementById('authSubmitBtn').disabled = true;
    document.getElementById('authToggleBtn').disabled = true;
    return;
  }

  subscribeToSession(function(user) {
    handleSessionChange(user).catch(function(error) {
      setBanner('authMessage', error.message || 'Something went wrong while starting the app.', true);
    });
  });
}

async function handleSessionChange(user) {
  currentUser = user;

  if (!user) {
    currentHouseholdId = null;
    currentChildId = null;
    currentChildRecord = null;
    currentChildWords = [];
    currentProfile = null;
    childProfiles = [];
    legacyImportCandidates = [];
    showAuthSection();
    return;
  }

  currentHouseholdId = await ensureHouseholdForCurrentUser();
  await refreshDashboard();
}

function showAuthSection() {
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('profileStartContent').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'none';
  document.body.classList.remove('boss-mode');
  document.body.style.background = THEME_PRESETS.forest.bodyGradient;
  updateAuthButtonCopy();
}

function showDashboardSection() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  document.getElementById('profileStartContent').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'none';
}

function updateAuthButtonCopy() {
  var submit = document.getElementById('authSubmitBtn');
  var toggle = document.getElementById('authToggleBtn');
  var displayName = document.getElementById('displayNameInput');

  if (authMode === 'signup') {
    submit.textContent = 'Create Account';
    toggle.textContent = 'Already have an account?';
    displayName.style.display = 'block';
  } else {
    submit.textContent = 'Sign In';
    toggle.textContent = 'Need to create an account?';
    displayName.style.display = 'none';
  }
}

async function submitAuthForm() {
  var email = document.getElementById('emailInput').value.trim();
  var password = document.getElementById('passwordInput').value.trim();
  var displayName = document.getElementById('displayNameInput').value.trim();

  if (!email || !password || (authMode === 'signup' && !displayName)) {
    setBanner('authMessage', 'Please fill in every required field.', true);
    return;
  }

  try {
    setBanner('authMessage', authMode === 'signup' ? 'Creating your household...' : 'Signing you in...', false);
    if (authMode === 'signup') {
      await signUpWithEmailPassword(email, password, displayName);
    } else {
      await signInWithEmailPassword(email, password);
    }
    setBanner('authMessage', '');
  } catch (error) {
    setBanner('authMessage', error.message || 'Could not complete sign in.', true);
  }
}

function toggleAuthMode() {
  authMode = authMode === 'signup' ? 'signin' : 'signup';
  updateAuthButtonCopy();
  setBanner('authMessage', '');
}

async function signOutCurrentUser() {
  await signOutUser();
}

function collectLegacyProfiles() {
  var lastProfile = localStorage.getItem('lastProfile');
  return Object.keys(LEGACY_PROFILE_MAP).map(function(legacyId) {
    var starterProfileId = LEGACY_PROFILE_MAP[legacyId];
    var starter = getStarterProfileTemplate(starterProfileId);
    var storagePrefix = starterProfileId === 'koali' ? 'koali' : 'bear';
    var wordsRaw = localStorage.getItem(storagePrefix + '_customWords');
    var tablesRaw = localStorage.getItem(storagePrefix + '_timesTables');
    var totalCoinsRaw = localStorage.getItem(storagePrefix + '_totalPounds');
    var hasLocalData = Boolean(wordsRaw || tablesRaw || totalCoinsRaw || lastProfile === legacyId);

    if (!hasLocalData) {
      return null;
    }

    var words = wordsRaw ? cloneWords(safeParseJson(wordsRaw, defaultWordsForStarter(starterProfileId))) : defaultWordsForStarter(starterProfileId);
    var tables = tablesRaw ? safeParseJson(tablesRaw, defaultTablesForStarter(starterProfileId)) : defaultTablesForStarter(starterProfileId);
    var totalCoins = totalCoinsRaw ? parseInt(totalCoinsRaw, 10) : 0;

    return {
      legacyId: legacyId,
      childInput: {
        childDisplayName: starter.childDisplayName,
        gameTitle: starter.gameTitle,
        characterName: starter.characterName,
        avatarPresetId: starter.avatarPresetId,
        bossPresetId: starter.bossPresetId,
        themePresetId: starter.themePresetId,
        currencyName: starter.currencyName,
        defaultTimesTables: Array.isArray(tables) ? tables : defaultTablesForStarter(starterProfileId),
        mathRoundsMode: starter.mathRoundsMode,
        fixedMathRounds: starter.fixedMathRounds,
        totalCoins: isNaN(totalCoins) ? 0 : totalCoins,
        starterProfileId: starterProfileId
      },
      words: Array.isArray(words) && words.length > 0 ? cloneWords(words) : defaultWordsForStarter(starterProfileId)
    };
  }).filter(Boolean);
}

async function refreshDashboard() {
  childProfiles = await listChildProfiles(currentHouseholdId);
  legacyImportCandidates = await importLocalProfileIfNeeded({
    existingChildrenCount: childProfiles.length,
    legacyProfiles: collectLegacyProfiles()
  });
  renderDashboard();
  showDashboardSection();
}

function renderDashboard() {
  document.getElementById('dashboardTitle').textContent = (currentUser.displayName || 'Your') + ' Household';
  document.getElementById('dashboardSubtitle').textContent = 'Choose a child profile to play, edit, or add a brand new adventure.';
  document.getElementById('dashboardEmptyState').style.display = childProfiles.length === 0 ? 'block' : 'none';

  renderImportCards();
  renderChildCards();
}

function renderImportCards() {
  var panel = document.getElementById('importPanel');
  var container = document.getElementById('importCards');
  container.textContent = '';

  if (!legacyImportCandidates.length) {
    panel.style.display = 'none';
    return;
  }

  legacyImportCandidates.forEach(function(candidate) {
    var avatar = AVATAR_PRESETS[candidate.childInput.avatarPresetId] || AVATAR_PRESETS.koali;
    var card = document.createElement('div');
    card.className = 'child-card';

    var hero = document.createElement('div');
    hero.className = 'child-card-hero';
    hero.innerHTML = '<div class="child-card-avatar">' + avatar.mascot + '</div><div><h3>' + candidate.childInput.childDisplayName + '</h3><div class="profile-chip">Import from this browser</div></div>';
    card.appendChild(hero);

    var body = document.createElement('p');
    body.textContent = candidate.words.length + ' spelling words, ' + candidate.childInput.defaultTimesTables.length + ' times tables, ' + candidate.childInput.totalCoins + ' saved coins.';
    card.appendChild(body);

    var button = document.createElement('button');
    button.className = 'btn-settings-start';
    button.textContent = 'Import Profile';
    button.onclick = function() {
      importLegacyProfile(candidate.legacyId);
    };
    card.appendChild(button);
    container.appendChild(card);
  });

  panel.style.display = 'block';
}

function renderChildCards() {
  var grid = document.getElementById('childProfilesGrid');
  grid.textContent = '';

  childProfiles.forEach(function(child) {
    var avatar = AVATAR_PRESETS[child.avatarPresetId] || AVATAR_PRESETS.koali;
    var card = document.createElement('div');
    card.className = 'child-card';

    var hero = document.createElement('div');
    hero.className = 'child-card-hero';
    hero.innerHTML = '<div class="child-card-avatar">' + avatar.mascot + '</div><div><h3>' + child.childDisplayName + '</h3><div class="profile-chip">' + child.characterName + '</div></div>';
    card.appendChild(hero);

    var description = document.createElement('p');
    description.textContent = child.gameTitle;
    card.appendChild(description);

    var stats = document.createElement('div');
    stats.className = 'child-card-stats';
    stats.innerHTML = '<div class="child-card-stat">🪙 ' + (child.totalCoins || 0) + '</div><div class="child-card-stat">🔢 ' + (child.defaultTimesTables || []).join(', ') + '</div>';
    card.appendChild(stats);

    var actions = document.createElement('div');
    actions.className = 'child-card-actions';

    var playBtn = document.createElement('button');
    playBtn.className = 'btn-start';
    playBtn.textContent = 'Play';
    playBtn.onclick = function() {
      selectChildProfile(child.id);
    };
    actions.appendChild(playBtn);

    var editBtn = document.createElement('button');
    editBtn.className = 'btn-settings-start';
    editBtn.textContent = 'Edit';
    editBtn.onclick = function() {
      openSettings('edit', child.id);
    };
    actions.appendChild(editBtn);

    card.appendChild(actions);
    grid.appendChild(card);
  });
}

async function importLegacyProfile(legacyId) {
  var candidate = legacyImportCandidates.find(function(item) {
    return item.legacyId === legacyId;
  });
  if (!candidate) return;

  try {
    setBanner('cloudStatusBanner', 'Importing ' + candidate.childInput.childDisplayName + '...', false);
    var childId = await createChildProfile(currentHouseholdId, candidate.childInput);
    await saveCloudWords(currentHouseholdId, childId, candidate.words);
    markLegacyProfileImported(currentUser.uid, legacyId);
    await refreshDashboard();
    await selectChildProfile(childId);
    setBanner('cloudStatusBanner', 'Imported ' + candidate.childInput.childDisplayName + ' successfully.', false);
  } catch (error) {
    setBanner('cloudStatusBanner', error.message || 'Could not import that legacy profile.', true);
  }
}

async function selectChildProfile(childId) {
  try {
    setBanner('cloudStatusBanner', '');
    currentChildRecord = await getChildProfile(currentHouseholdId, childId);
    currentChildWords = await loadCloudWords(currentHouseholdId, childId);
    if (!currentChildWords.length) {
      currentChildWords = defaultWordsForStarter(currentChildRecord.starterProfileId);
    }
    currentChildId = childId;
    currentProfile = buildRuntimeProfile(currentChildRecord, currentChildWords);
    applyTheme();
    updateStartScreen();
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('profileStartContent').style.display = 'block';
    playSound('pop');
  } catch (error) {
    setBanner('cloudStatusBanner', error.message || 'Could not load that child profile.', true);
  }
}

function returnToDashboard() {
  document.getElementById('profileStartContent').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  document.body.style.background = currentProfile ? currentProfile.bodyGradient : THEME_PRESETS.forest.bodyGradient;
  playSound('pop');
}

function applyTheme() {
  var p = currentProfile;
  // Page title
  document.title = p.mascot + ' ' + p.gameName;
  // Body background
  document.body.style.background = p.bodyGradient;
  // Start screen
  document.getElementById('startMascot').textContent = p.mascot;
  document.getElementById('startTitle').textContent = p.gameName;
  // Game header
  document.getElementById('mascot').textContent = p.mascot;
  var headerH1 = document.querySelector('.header h1');
  if (headerH1) headerH1.textContent = p.gameName;
  var headerP = document.querySelector('.header p');
  if (headerP) headerP.textContent = p.subtitle;
  // Victory overlay
  var hugEl = document.querySelector('.koala-hug');
  if (hugEl) hugEl.textContent = p.heroEmoji;
  var poundsTitle = document.querySelector('.pounds-title');
  if (poundsTitle) poundsTitle.textContent = p.currencyName + ' Earned:';
  // Boss arena
  var bossLabel = document.getElementById('bossHpLabel');
  if (bossLabel) bossLabel.textContent = p.bossName;
  var bossEl = document.getElementById('bossCharacter');
  if (bossEl) bossEl.className = p.bossClass + ' idle';
  // Recreate leaves
  var leavesContainer = document.getElementById('leaves');
  leavesContainer.textContent = '';
  createLeaves();
}

function updateStartScreen() {
  if (!currentProfile) return;
  var total = loadTotalPounds();
  var label = total !== 1 ? currentProfile.currencyName : currentProfile.currencySingular;
  document.getElementById('startPounds').textContent = '🪙 ' + total + ' ' + label;
  document.getElementById('currentChildPill').textContent = 'Playing as ' + currentProfile.name;
}

function startGame() {
  if (!currentProfile) return;
  activeWords = loadWords();
  activeTimesTables = loadTimesTables();
  var numMath = currentProfile.mathRounds !== null ? currentProfile.mathRounds : activeWords.length;
  var numSpelling = activeWords.length;
  TOTAL_ROUNDS = numSpelling + numMath;

  // Build round schedule: interleave spelling and math evenly
  roundSchedule = [];
  if (numMath === numSpelling) {
    // Equal: alternate spelling, math, spelling, math...
    for (var i = 0; i < numSpelling; i++) {
      roundSchedule.push('spelling', 'math');
    }
  } else {
    // Fewer math: spread math rounds evenly among spelling rounds
    var mathInterval = numMath > 0 ? Math.floor(TOTAL_ROUNDS / numMath) : TOTAL_ROUNDS + 1;
    var mathPlaced = 0;
    for (var i = 0; i < TOTAL_ROUNDS; i++) {
      if (mathPlaced < numMath && i > 0 && i % mathInterval === mathInterval - 1) {
        roundSchedule.push('math');
        mathPlaced++;
      } else {
        roundSchedule.push('spelling');
      }
    }
    // If we haven't placed all math rounds, append them
    while (mathPlaced < numMath) {
      // Find a spelling slot from the end and replace
      for (var j = roundSchedule.length - 1; j >= 0; j--) {
        if (roundSchedule[j] === 'spelling' && mathPlaced < numMath) {
          roundSchedule[j] = 'math';
          mathPlaced++;
          break;
        }
      }
    }
  }

  gamePhase = 'playing';
  currentRoundCount = 0;
  currentSpellingIndex = 0;
  score = 0;
  streak = 0;
  maxStreak = 0;
  hintsLeft = 3;
  correctAnswers = 0;
  totalQuestions = 0;

  document.getElementById('hints').textContent = '3';
  document.getElementById('totalPoundsDisplay').textContent = loadTotalPounds();

  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'flex';
  document.getElementById('bossCard').classList.remove('show');
  document.getElementById('spellingCard').style.display = 'flex';
  document.getElementById('mathCard').style.display = 'none';

  document.body.classList.remove('boss-mode');
  document.body.style.background = currentProfile.bodyGradient;
  playSound('pop');
  loadChallenge();
}

function goToStartScreen() {
  document.getElementById('victoryOverlay').classList.remove('show');
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('startScreen').style.display = 'flex';
  document.body.classList.remove('boss-mode');
  document.body.style.background = currentProfile ? currentProfile.bodyGradient : THEME_PRESETS.forest.bodyGradient;
  gamePhase = 'start';
  if (currentProfile) {
    updateStartScreen();
  } else {
    showDashboardSection();
  }
}

// ═══════════════════ LEAVES ═══════════════════
function createLeaves() {
  var container = document.getElementById('leaves');
  var leafTypes = currentProfile ? currentProfile.leafEmojis : ['🍃', '🌿', '🍂', '🌱'];
  for (var i = 0; i < 20; i++) {
    var leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.textContent = leafTypes[Math.floor(Math.random() * leafTypes.length)];
    leaf.style.left = Math.random() * 100 + '%';
    leaf.style.top = Math.random() * 100 + '%';
    leaf.style.animationDuration = (Math.random() * 10 + 10) + 's';
    leaf.style.animationDelay = (Math.random() * 5) + 's';
    leaf.style.fontSize = (Math.random() * 20 + 20) + 'px';
    container.appendChild(leaf);
  }
}

// ═══════════════════ MASCOT ═══════════════════
function koaliCheer() {
  var mascot = document.getElementById('mascot');
  mascot.classList.remove('cheer');
  void mascot.offsetWidth;
  mascot.classList.add('cheer');
}

// ═══════════════════ GAME FLOW ═══════════════════
function loadChallenge() {
  if (currentRoundCount >= TOTAL_ROUNDS) {
    startBossBattle();
    return;
  }
  updateProgress();

  var btnCheck = document.getElementById('btnCheck');
  if (btnCheck) btnCheck.classList.remove('pulse');

  if (roundSchedule[currentRoundCount] === 'spelling') {
    document.getElementById('spellingCard').style.display = 'flex';
    document.getElementById('mathCard').style.display = 'none';
    loadSpellingRound();
  } else {
    document.getElementById('spellingCard').style.display = 'none';
    document.getElementById('mathCard').style.display = 'flex';
    loadMathRound();
  }
}

function nextRound() {
  currentRoundCount++;
  setTimeout(loadChallenge, 1500);
}

function skipRound() {
  streak = 0;
  updateStreakUI();
  playSound('pop');
  if (currentRoundCount % 2 === 0) {
    currentSpellingIndex = (currentSpellingIndex + 1) % activeWords.length;
  }
  totalQuestions++;
  currentRoundCount++;
  loadChallenge();
}

function updateProgress() {
  var pct = (currentRoundCount / TOTAL_ROUNDS) * 100;
  var bar = document.getElementById('progressBar');
  bar.style.width = pct + '%';
  bar.textContent = currentRoundCount + ' / ' + TOTAL_ROUNDS;
  document.getElementById('score').textContent = score;
  updateStreakUI();
}

function updateStreakUI() {
  document.getElementById('streak').textContent = streak;
  var flames = streak >= 2 ? '\uD83C\uDF3F'.repeat(Math.min(streak, 5)) : '';
  document.getElementById('spellingStreakDisplay').textContent = flames;
  document.getElementById('mathStreakDisplay').textContent = flames;

  if (streak === 3 || streak === 5) {
    var activeCard = document.getElementById('spellingCard');
    if (activeCard.style.display !== 'none') {
      createSparkles(activeCard);
    } else {
      createSparkles(document.getElementById('mathCard'));
    }
  }
}

// ═══════════════════ MATH ═══════════════════
function loadMathRound() {
  document.getElementById('mathCounter').textContent = 'Round ' + (currentRoundCount + 1) + ' of ' + TOTAL_ROUNDS + ' (Math)';
  document.getElementById('mathFeedback').textContent = '';
  document.getElementById('mathFeedback').className = 'feedback';

  var base = activeTimesTables[Math.floor(Math.random() * activeTimesTables.length)];
  var multiplier = Math.floor(Math.random() * 12) + 1;
  currentMathAnswer = base * multiplier;

  document.getElementById('mathEquation').textContent = base + ' \u00D7 ' + multiplier + ' = ?';

  var options = [currentMathAnswer];
  while(options.length < 4) {
    var wrongAnswer;
    var errorType = Math.floor(Math.random() * 3);
    if (errorType === 0) wrongAnswer = currentMathAnswer + base;
    else if (errorType === 1) wrongAnswer = Math.max(0, currentMathAnswer - base);
    else wrongAnswer = currentMathAnswer + (Math.random() > 0.5 ? 2 : -2);
    if (options.indexOf(wrongAnswer) === -1 && wrongAnswer >= 0) options.push(wrongAnswer);
  }
  options = shuffleArray(options);

  var optionsContainer = document.getElementById('mathOptions');
  optionsContainer.textContent = '';
  options.forEach(function(opt) {
    var btn = document.createElement('button');
    btn.className = 'btn math-btn';
    btn.textContent = opt;
    btn.onclick = function() { checkMathAnswer(opt, btn); };
    optionsContainer.appendChild(btn);
  });

  var card = document.getElementById('mathCard');
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = 'cardIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
}

function checkMathAnswer(selectedAnswer, btnElement) {
  var allBtns = document.querySelectorAll('.math-btn');
  for (var i = 0; i < allBtns.length; i++) allBtns[i].disabled = true;
  totalQuestions++;
  if (selectedAnswer === currentMathAnswer) {
    btnElement.classList.add('correct');
    streak++;
    if (streak > maxStreak) maxStreak = streak;
    correctAnswers++;
    var bonus = Math.max(0, (streak - 1) * 5);
    var points = 10 + bonus;
    score += points;
    document.getElementById('mathFeedback').textContent = '\uD83C\uDF89 Correct! +' + points;
    document.getElementById('mathFeedback').className = 'feedback correct';
    playSound('correct');
    koaliCheer();
    createSparkles(document.getElementById('mathCard'));
    nextRound();
  } else {
    btnElement.classList.add('incorrect');
    streak = 0;
    document.getElementById('mathFeedback').textContent = '\u274C Oops!';
    document.getElementById('mathFeedback').className = 'feedback incorrect';
    playSound('wrong');
    for (var j = 0; j < allBtns.length; j++) {
      if (parseInt(allBtns[j].textContent) === currentMathAnswer) allBtns[j].classList.add('correct');
    }
    nextRound();
  }
  updateProgress();
}

// ═══════════════════ SPELLING ═══════════════════
function loadSpellingRound() {
  var wordData = activeWords[currentSpellingIndex % activeWords.length];
  var word = wordData.word.toLowerCase();
  document.getElementById('spellingCounter').textContent = 'Round ' + (currentRoundCount + 1) + ' of ' + TOTAL_ROUNDS + ' (Spelling)';
  document.getElementById('wordImage').textContent = wordData.emoji;
  document.getElementById('wordHint').textContent = wordData.hint;
  document.getElementById('spellingFeedback').textContent = '';
  document.getElementById('spellingFeedback').className = 'feedback';

  var slotsContainer = document.getElementById('slotsContainer');
  slotsContainer.textContent = '';
  slotContents = new Array(word.length).fill(null);

  for (var i = 0; i < word.length; i++) {
    var slot = document.createElement('div');
    slot.className = 'letter-slot';
    slot.dataset.index = i;
    slot.addEventListener('dragover', handleDragOver);
    slot.addEventListener('dragenter', handleDragEnter);
    slot.addEventListener('dragleave', handleDragLeave);
    slot.addEventListener('drop', handleDrop);
    slot.addEventListener('click', (function(idx) { return function() { removeFromSlot(idx); }; })(i));
    slot.addEventListener('touchend', handleSlotTouchEnd);
    slotsContainer.appendChild(slot);
  }

  var extras = generateExtraLetters(word);
  var allLetters = word.split('').concat(extras);
  shuffledLetters = shuffleArray(allLetters);
  renderLetterPool();

  var card = document.getElementById('spellingCard');
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = 'cardIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

  document.getElementById('btnCheck').classList.remove('pulse');
}

function checkWord() {
  var targetWord = activeWords[currentSpellingIndex % activeWords.length].word.toLowerCase();
  var slots = document.querySelectorAll('.letter-slot');
  var userWord = '';
  var isComplete = true;

  slotContents.forEach(function(idx) {
    if (idx === null) isComplete = false;
    else userWord += shuffledLetters[idx];
  });

  if (!isComplete) {
    document.getElementById('spellingFeedback').textContent = '\uD83E\uDD14 Fill in all letters!';
    document.getElementById('spellingFeedback').className = 'feedback incorrect';
    return;
  }

  totalQuestions++;
  if (userWord.toLowerCase() === targetWord) {
    streak++;
    if (streak > maxStreak) maxStreak = streak;
    correctAnswers++;
    var bonus = Math.max(0, (streak - 1) * 5);
    var points = 10 + bonus;
    score += points;
    slots.forEach(function(slot, i) { setTimeout(function() { slot.classList.add('correct'); }, i * 100); });
    document.getElementById('spellingFeedback').textContent = '\uD83C\uDF89 Correct! +' + points;
    document.getElementById('spellingFeedback').className = 'feedback correct';
    playSound('correct');
    koaliCheer();
    createSparkles(document.getElementById('spellingCard'));
    updateProgress();
    currentSpellingIndex++;
    nextRound();
  } else {
    streak = 0;
    updateProgress();
    slots.forEach(function(slot, i) {
      var letterIdx = slotContents[i];
      if (letterIdx !== null) {
        if (shuffledLetters[letterIdx].toLowerCase() === targetWord[i]) slot.classList.add('correct');
        else slot.classList.add('incorrect');
      }
    });
    document.getElementById('spellingFeedback').textContent = '\u274C Oops!';
    document.getElementById('spellingFeedback').className = 'feedback incorrect';
    playSound('wrong');
    setTimeout(function() { slots.forEach(function(slot) { slot.classList.remove('incorrect'); }); }, 1200);
  }
}

// ═══════════════════ SPELLING HELPERS ═══════════════════
function shuffleArray(arr) {
  var shuffled = arr.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

function generateExtraLetters(word) {
  var alphabet = 'abcdefghijklmnopqrstuvwxyz';
  var extras = [];
  var numExtras = Math.max(2, Math.floor(word.length / 2));
  var wordLetters = {};
  word.toLowerCase().split('').forEach(function(l) { wordLetters[l] = true; });
  while (extras.length < numExtras) {
    var randomLetter = alphabet[Math.floor(Math.random() * 26)];
    if (!wordLetters[randomLetter] || Math.random() > 0.8) extras.push(randomLetter);
  }
  return extras;
}

function renderLetterPool() {
  var pool = document.getElementById('lettersPool');
  pool.textContent = '';
  shuffledLetters.forEach(function(letter, index) {
    var el = document.createElement('div');
    el.className = 'draggable-letter';
    el.textContent = letter.toUpperCase();
    el.draggable = true;
    el.dataset.index = index;
    el.dataset.letter = letter;
    if (slotContents.indexOf(index) !== -1) el.classList.add('used');

    el.addEventListener('click', (function(idx, ltr) {
      return function() { handleLetterTap(idx, ltr); };
    })(index, letter));
    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragend', handleDragEnd);
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    pool.appendChild(el);
  });

  // Pulse check button when all slots are filled
  var allFilled = slotContents.every(function(s) { return s !== null; });
  var btnCheck = document.getElementById('btnCheck');
  if (allFilled && slotContents.length > 0) btnCheck.classList.add('pulse');
  else btnCheck.classList.remove('pulse');
}

// ═══════════════════ TAP TO PLACE ═══════════════════
function handleLetterTap(letterIndex, letter) {
  // If this letter is already placed in a slot, remove it
  var existingSlot = slotContents.indexOf(letterIndex);
  if (existingSlot !== -1) {
    removeFromSlot(existingSlot);
    return;
  }
  // Find the first empty slot
  var emptySlot = -1;
  for (var i = 0; i < slotContents.length; i++) {
    if (slotContents[i] === null) { emptySlot = i; break; }
  }
  if (emptySlot === -1) return; // All slots full
  slotContents[emptySlot] = letterIndex;
  var slotEl = document.querySelectorAll('.letter-slot')[emptySlot];
  slotEl.textContent = letter.toUpperCase();
  slotEl.classList.add('filled');
  slotEl.classList.remove('correct', 'incorrect');
  renderLetterPool();
  playSound('place');
}

// ═══════════════════ DRAG & DROP ═══════════════════
function handleDragStart(e) {
  draggedLetter = e.target.dataset.letter;
  draggedLetterIndex = parseInt(e.target.dataset.index);
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  playSound('pop');
}
function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  var allSlots = document.querySelectorAll('.letter-slot');
  for (var i = 0; i < allSlots.length; i++) allSlots[i].classList.remove('drag-over');
}
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function handleDragEnter(e) {
  e.preventDefault();
  var slot = e.target.closest('.letter-slot');
  if (slot) slot.classList.add('drag-over');
}
function handleDragLeave(e) {
  var slot = e.target.closest('.letter-slot');
  if (slot) slot.classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  var slot = e.target.closest('.letter-slot');
  if (!slot) return;
  slot.classList.remove('drag-over');
  var slotIndex = parseInt(slot.dataset.index);
  slotContents[slotIndex] = draggedLetterIndex;
  slot.textContent = draggedLetter.toUpperCase();
  slot.classList.add('filled');
  slot.classList.remove('correct', 'incorrect');
  renderLetterPool();
  playSound('place');
}

// ═══════════════════ TOUCH DRAG ═══════════════════
function handleTouchStart(e) {
  var target = e.target.closest('.draggable-letter');
  if (!target || target.classList.contains('used')) return;
  e.preventDefault();
  touchSourceIndex = parseInt(target.dataset.index);
  touchDragElement = target.cloneNode(true);
  touchDragElement.className = 'draggable-letter touch-letter';
  document.body.appendChild(touchDragElement);
  moveTouchElement(e.touches[0]);
  target.classList.add('dragging');
  playSound('pop');
}
function handleTouchMove(e) {
  if (!touchDragElement) return;
  e.preventDefault();
  var touch = e.touches[0];
  moveTouchElement(touch);
  var target = document.elementFromPoint(touch.clientX, touch.clientY);
  var slot = target ? target.closest('.letter-slot') : null;
  var allSlots = document.querySelectorAll('.letter-slot');
  for (var i = 0; i < allSlots.length; i++) allSlots[i].classList.remove('drag-over');
  if (slot) slot.classList.add('drag-over');
}
function handleTouchEnd(e) {
  if (!touchDragElement) return;
  var touch = e.changedTouches[0];
  var target = document.elementFromPoint(touch.clientX, touch.clientY);
  var slot = target ? target.closest('.letter-slot') : null;
  if (slot) {
    var slotIndex = parseInt(slot.dataset.index);
    slotContents[slotIndex] = touchSourceIndex;
    slot.textContent = shuffledLetters[touchSourceIndex].toUpperCase();
    slot.classList.add('filled');
    slot.classList.remove('correct', 'incorrect');
    renderLetterPool();
    playSound('place');
  }
  document.body.removeChild(touchDragElement);
  touchDragElement = null;
  touchSourceIndex = null;
  var allLetters = document.querySelectorAll('.draggable-letter');
  for (var i = 0; i < allLetters.length; i++) allLetters[i].classList.remove('dragging');
  var allSlots = document.querySelectorAll('.letter-slot');
  for (var j = 0; j < allSlots.length; j++) allSlots[j].classList.remove('drag-over');
}
function moveTouchElement(touch) {
  touchDragElement.style.left = (touch.clientX - 20) + 'px';
  touchDragElement.style.top = (touch.clientY - 25) + 'px';
}
function handleSlotTouchEnd(e) {
  var slot = e.target.closest('.letter-slot');
  if (slot) removeFromSlot(parseInt(slot.dataset.index));
}
function removeFromSlot(slotIndex) {
  if (slotContents[slotIndex] !== null) {
    slotContents[slotIndex] = null;
    var slot = document.querySelectorAll('.letter-slot')[slotIndex];
    slot.textContent = '';
    slot.classList.remove('filled', 'correct', 'incorrect');
    renderLetterPool();
    playSound('pop');
  }
}
function clearSlots() {
  slotContents.fill(null);
  var allSlots = document.querySelectorAll('.letter-slot');
  for (var i = 0; i < allSlots.length; i++) {
    allSlots[i].textContent = '';
    allSlots[i].classList.remove('filled', 'correct', 'incorrect');
  }
  renderLetterPool();
  document.getElementById('spellingFeedback').textContent = '';
  playSound('pop');
}
function useHint() {
  if (hintsLeft <= 0) {
    document.getElementById('spellingFeedback').textContent = 'No hints left!';
    document.getElementById('spellingFeedback').className = 'feedback incorrect';
    return;
  }
  var word = activeWords[currentSpellingIndex % activeWords.length].word.toLowerCase();
  var slots = document.querySelectorAll('.letter-slot');
  for (var i = 0; i < word.length; i++) {
    var currentSlotContent = slotContents[i];
    var currentLetter = currentSlotContent !== null ? shuffledLetters[currentSlotContent].toLowerCase() : null;
    if (currentLetter !== word[i]) {
      var poolIndexToUse = -1;
      for (var k = 0; k < shuffledLetters.length; k++) {
        if (shuffledLetters[k].toLowerCase() === word[i] && slotContents.indexOf(k) === -1) {
          poolIndexToUse = k;
          break;
        }
      }
      if (poolIndexToUse !== -1) {
        slotContents[i] = poolIndexToUse;
        slots[i].textContent = word[i].toUpperCase();
        slots[i].classList.add('filled', 'correct');
        renderLetterPool();
        hintsLeft--;
        document.getElementById('hints').textContent = hintsLeft;
        document.getElementById('spellingFeedback').textContent = 'Hint used!';
        document.getElementById('spellingFeedback').className = 'feedback correct';
        playSound('hint');
        return;
      }
    }
  }
}

// ═══════════════════ BOSS BATTLE ═══════════════════
function startBossBattle() {
  gamePhase = 'boss';
  bossHp = 100;
  playerHeartsCount = 3;
  bossRoundsPlayed = 0;
  bossHeartsLost = 0;

  document.body.classList.add('boss-mode');
  document.body.style.background = currentProfile.bossGradient;
  document.getElementById('spellingCard').style.display = 'none';
  document.getElementById('mathCard').style.display = 'none';
  document.getElementById('bossCard').classList.add('show');

  // Update progress bar
  var bar = document.getElementById('progressBar');
  bar.style.width = '100%';
  bar.textContent = '\u2694\uFE0F BOSS';

  // Reset boss HP bar
  document.getElementById('bossHpBar').style.width = '100%';

  // Reset hearts
  var heartsEl = document.getElementById('playerHearts');
  heartsEl.textContent = '';
  for (var i = 0; i < 3; i++) {
    var span = document.createElement('span');
    span.className = 'heart';
    span.textContent = '\u2764\uFE0F';
    heartsEl.appendChild(span);
  }

  // Boss character animation
  var bear = document.getElementById('bossCharacter');
  bear.className = currentProfile.bossClass;
  bear.offsetHeight;
  bear.classList.add('idle');

  document.getElementById('bossTimerFill').style.width = '100%';
  document.getElementById('bossFeedback').textContent = '';

  playSound('bossAppear');

  // Restore question area structure (may have been replaced by "Try Again")
  var qArea = document.getElementById('bossQuestionArea');
  qArea.textContent = '';
  var qContent = document.createElement('div');
  qContent.id = 'bossQuestionContent';
  qArea.appendChild(qContent);
  var qOptions = document.createElement('div');
  qOptions.className = 'boss-options';
  qOptions.id = 'bossOptions';
  qArea.appendChild(qOptions);

  // Dramatic intro then start
  qArea.style.opacity = '0';
  setTimeout(function() {
    qArea.style.opacity = '1';
    loadBossQuestion();
  }, 1500);
}

function loadBossQuestion() {
  if (bossHp <= 0 || playerHeartsCount <= 0) return;

  currentBossAnswer = null;
  document.getElementById('bossFeedback').textContent = '';
  document.getElementById('bossFeedback').className = 'feedback';

  var isMath = Math.random() > 0.4;

  if (isMath) {
    loadBossMathQuestion();
  } else {
    loadBossSpellingQuestion();
  }

  startBossTimer();
}

function loadBossMathQuestion() {
  var base = activeTimesTables[Math.floor(Math.random() * activeTimesTables.length)];
  var multiplier = Math.floor(Math.random() * 12) + 1;
  var answer = base * multiplier;
  currentBossAnswer = answer;

  var contentEl = document.getElementById('bossQuestionContent');
  contentEl.textContent = '';
  var eqDiv = document.createElement('div');
  eqDiv.className = 'boss-math-equation';
  eqDiv.textContent = base + ' \u00D7 ' + multiplier + ' = ?';
  contentEl.appendChild(eqDiv);

  var options = [answer];
  while(options.length < 4) {
    var wrong;
    var t = Math.floor(Math.random() * 3);
    if (t === 0) wrong = answer + base;
    else if (t === 1) wrong = Math.max(0, answer - base);
    else wrong = answer + (Math.random() > 0.5 ? 2 : -2);
    if (options.indexOf(wrong) === -1 && wrong >= 0) options.push(wrong);
  }
  options = shuffleArray(options);

  var optionsEl = document.getElementById('bossOptions');
  optionsEl.textContent = '';
  options.forEach(function(opt) {
    var btn = document.createElement('button');
    btn.className = 'boss-option-btn';
    btn.textContent = opt;
    btn.onclick = function() { handleBossAnswer(opt === answer, btn); };
    optionsEl.appendChild(btn);
  });
}

function loadBossSpellingQuestion() {
  var wordData = activeWords[Math.floor(Math.random() * activeWords.length)];
  var word = wordData.word.toLowerCase();

  var contentEl = document.getElementById('bossQuestionContent');
  contentEl.textContent = '';
  var emojiDiv = document.createElement('div');
  emojiDiv.className = 'boss-spelling-emoji';
  emojiDiv.textContent = wordData.emoji;
  contentEl.appendChild(emojiDiv);
  var hintDiv = document.createElement('div');
  hintDiv.className = 'boss-spelling-hint';
  hintDiv.textContent = wordData.hint;
  contentEl.appendChild(hintDiv);

  // Create 4 options: correct word + 3 wrong
  var options = [word];
  var allWords = activeWords.map(function(w) { return w.word.toLowerCase(); });
  var otherWords = allWords.filter(function(w) { return w !== word; });
  var shuffledOthers = shuffleArray(otherWords);

  for (var i = 0; i < Math.min(3, shuffledOthers.length); i++) {
    options.push(shuffledOthers[i]);
  }
  while (options.length < 4) {
    options.push(shuffleArray(word.split('')).join(''));
  }
  options = shuffleArray(options);
  currentBossAnswer = word;

  var optionsEl = document.getElementById('bossOptions');
  optionsEl.textContent = '';
  options.forEach(function(opt) {
    var btn = document.createElement('button');
    btn.className = 'boss-option-btn';
    btn.textContent = opt.toUpperCase();
    btn.onclick = function() { handleBossAnswer(opt === word, btn); };
    optionsEl.appendChild(btn);
  });
}

function startBossTimer() {
  clearInterval(bossTimerInterval);
  clearTimeout(bossTimerTimeout);

  var timerFill = document.getElementById('bossTimerFill');
  var timeLeft = 100;
  timerFill.style.width = '100%';

  bossTimerInterval = setInterval(function() {
    timeLeft -= 1;
    timerFill.style.width = timeLeft + '%';
    if (timeLeft <= 0) {
      clearInterval(bossTimerInterval);
    }
  }, 100);

  bossTimerTimeout = setTimeout(function() {
    clearInterval(bossTimerInterval);
    handleBossAnswer(false, null);
  }, 10000);
}

function handleBossAnswer(isCorrect, btnElement) {
  clearInterval(bossTimerInterval);
  clearTimeout(bossTimerTimeout);

  var allBtns = document.querySelectorAll('.boss-option-btn');
  for (var i = 0; i < allBtns.length; i++) allBtns[i].disabled = true;
  bossRoundsPlayed++;
  totalQuestions++;

  if (isCorrect) {
    if (btnElement) btnElement.classList.add('correct');
    correctAnswers++;
    streak++;
    if (streak > maxStreak) maxStreak = streak;
    var bonus = Math.max(0, (streak - 1) * 5);
    score += 10 + bonus;
    document.getElementById('score').textContent = score;

    // Damage boss
    bossHp -= 20;
    document.getElementById('bossHpBar').style.width = Math.max(0, bossHp) + '%';

    // Bear hit animation
    var bear = document.getElementById('bossCharacter');
    bear.classList.remove('idle', 'hit');
    bear.offsetHeight;
    bear.classList.add('hit');
    setTimeout(function() { bear.classList.remove('hit'); bear.classList.add('idle'); }, 500);

    document.getElementById('bossFeedback').textContent = '\uD83D\uDCA5 Direct hit!';
    document.getElementById('bossFeedback').className = 'feedback correct';
    playSound('bossHit');

    if (bossHp <= 0) {
      setTimeout(bossDefeated, 800);
      return;
    }
  } else {
    if (btnElement) btnElement.classList.add('incorrect');
    streak = 0;
    bossHeartsLost++;
    playerHeartsCount--;

    // Show correct answer
    for (var j = 0; j < allBtns.length; j++) {
      var val = allBtns[j].textContent;
      if (typeof currentBossAnswer === 'number' && parseInt(val) === currentBossAnswer) allBtns[j].classList.add('correct');
      else if (typeof currentBossAnswer === 'string' && val.toLowerCase() === currentBossAnswer) allBtns[j].classList.add('correct');
    }

    // Bear attack animation
    var bear2 = document.getElementById('bossCharacter');
    bear2.classList.remove('idle', 'attack');
    bear2.offsetHeight;
    bear2.classList.add('attack');
    setTimeout(function() { bear2.classList.remove('attack'); bear2.classList.add('idle'); }, 600);

    // Screen shake
    var arena = document.getElementById('bossArena');
    arena.classList.add('screen-shake');
    setTimeout(function() { arena.classList.remove('screen-shake'); }, 400);

    // Lose heart
    var hearts = document.querySelectorAll('#playerHearts .heart');
    var heartToLose = hearts[playerHeartsCount]; // Already decremented
    if (heartToLose) {
      heartToLose.classList.add('breaking');
      setTimeout(function() { heartToLose.classList.add('lost'); }, 500);
    }

    document.getElementById('bossFeedback').textContent = currentProfile.bossAttackMsg;
    document.getElementById('bossFeedback').className = 'feedback incorrect';
    playSound('bossAttack');

    if (playerHeartsCount <= 0) {
      setTimeout(bossPlayerLost, 1000);
      return;
    }
  }

  updateStreakUI();
  setTimeout(loadBossQuestion, 1500);
}

function bossDefeated() {
  var bear = document.getElementById('bossCharacter');
  bear.classList.remove('idle', 'hit');
  bear.classList.add('defeated');
  playSound('bossDefeat');
  createSparkles(document.getElementById('bossArena'));

  document.getElementById('bossFeedback').textContent = currentProfile.bossDefeatMsg;
  document.getElementById('bossFeedback').className = 'feedback correct';
  document.getElementById('bossFeedback').style.fontSize = '1.4em';

  setTimeout(function() {
    document.getElementById('bossFeedback').style.fontSize = '';
    showVictory(true);
  }, 2500);
}

function bossPlayerLost() {
  document.getElementById('bossFeedback').textContent = currentProfile.bossLoseMsg;
  document.getElementById('bossFeedback').className = 'feedback incorrect';

  var qArea = document.getElementById('bossQuestionArea');
  qArea.textContent = '';
  var wrapper = document.createElement('div');
  wrapper.style.textAlign = 'center';
  wrapper.style.padding = '20px';
  var msg = document.createElement('p');
  msg.style.fontFamily = "'Fredoka One', cursive";
  msg.style.fontSize = '1.3em';
  msg.style.color = '#2c3e50';
  msg.style.marginBottom = '15px';
  msg.textContent = "Don't give up!";
  wrapper.appendChild(msg);
  var retryBtn = document.createElement('button');
  retryBtn.className = 'btn btn-play';
  retryBtn.style.display = 'inline-flex';
  retryBtn.textContent = '\uD83D\uDD04 Try Again!';
  retryBtn.onclick = startBossBattle;
  wrapper.appendChild(retryBtn);
  qArea.appendChild(wrapper);
}

// ═══════════════════ VICTORY & KOALI POUNDS ═══════════════════
function calculateKoaliPounds(bossBeaten) {
  var pounds = 0;

  // 1 pound: Completed the game (beat boss)
  if (bossBeaten) pounds++;

  // 1 pound: Accuracy >= 70%
  var accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  if (accuracy >= 0.7) pounds++;

  // 1 pound: Accuracy >= 90%
  if (accuracy >= 0.9) pounds++;

  // 1 pound: Max streak >= 5
  if (maxStreak >= 5) pounds++;

  // 1 pound: Beat boss without losing a heart
  if (bossBeaten && bossHeartsLost === 0) pounds++;

  return Math.min(5, pounds);
}

function showVictory(bossBeaten) {
  gamePhase = 'victory';
  document.body.classList.remove('boss-mode');
  document.body.style.background = currentProfile.bodyGradient;
  document.getElementById('bossCard').classList.remove('show');

  var earnedPounds = calculateKoaliPounds(bossBeaten);
  var currentTotal = loadTotalPounds();
  var newTotal = currentTotal + earnedPounds;
  saveTotalPounds(newTotal);
  if (currentChildRecord) {
    incrementTotalCoins(currentHouseholdId, currentChildId, earnedPounds).catch(function(error) {
      setBanner('cloudStatusBanner', error.message || 'Cloud coin sync failed. Open the profile again to retry.', true);
    });
  }

  document.getElementById('finalScore').textContent = score;

  if (bossBeaten) {
    document.getElementById('victoryTitle').textContent = 'AMAZING!';
    document.getElementById('victoryMessage').textContent = currentProfile.victoryBossMsg;
  } else {
    document.getElementById('victoryTitle').textContent = 'WELL DONE!';
    document.getElementById('victoryMessage').textContent = currentProfile.victoryNoBossMsg;
  }

  // Render pound coins
  var coinsEl = document.getElementById('poundsCoins');
  coinsEl.textContent = '';
  for (var i = 0; i < 5; i++) {
    var coin = document.createElement('div');
    coin.className = 'pound-coin' + (i >= earnedPounds ? ' empty' : '');
    coin.textContent = '\u00A3';
    coinsEl.appendChild(coin);

    // Staggered reveal
    (function(coinEl, idx, earned) {
      if (idx < earned) {
        setTimeout(function() { coinEl.classList.add('show'); playSound('coin'); }, 500 + idx * 400);
      } else {
        setTimeout(function() { coinEl.classList.add('show'); }, 500 + idx * 400);
      }
    })(coin, i, earnedPounds);
  }

  document.getElementById('poundsTotal').textContent = 'Lifetime Total: ' + newTotal + ' ' + currentProfile.currencyName + ' 🪙';

  document.getElementById('victoryOverlay').classList.add('show');
  createConfetti();
  playSound('victory');
}

// ═══════════════════ EFFECTS ═══════════════════
function createConfetti() {
  var colors = ['#f1c40f', '#e67e22', '#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#1abc9c'];
  for (var i = 0; i < 60; i++) {
    (function(idx) {
      setTimeout(function() {
        var conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.width = (Math.random() * 10 + 5) + 'px';
        conf.style.height = (Math.random() * 10 + 5) + 'px';
        conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        conf.style.animationDuration = (Math.random() * 3 + 2) + 's';
        document.body.appendChild(conf);
        setTimeout(function() { conf.remove(); }, 5000);
      }, idx * 30);
    })(i);
  }
}

function createSparkles(container) {
  for (var i = 0; i < 10; i++) {
    var s = document.createElement('div');
    s.textContent = '\u2728';
    s.style.position = 'absolute';
    s.style.left = (Math.random() * 80 + 10) + '%';
    s.style.top = (Math.random() * 80 + 10) + '%';
    s.style.fontSize = '24px';
    s.style.transition = 'all 1s ease';
    s.style.pointerEvents = 'none';
    container.appendChild(s);
    (function(el) {
      setTimeout(function() { el.style.transform = 'translateY(-50px) scale(0)'; el.style.opacity = '0'; }, 50);
      setTimeout(function() { el.remove(); }, 1000);
    })(s);
  }
}

// ═══════════════════ SETTINGS ═══════════════════
async function openSettings(mode, childId) {
  editorMode = mode || 'edit';
  editingChildId = childId || currentChildId;
  setBanner('settingsMessage', '');

  var profileData;
  if (editorMode === 'create') {
    profileData = createChildPayloadFromStarter('koali');
    editingChildId = null;
    editorStarterProfileId = profileData.starterProfileId;
    editorWords = defaultWordsForStarter(editorStarterProfileId);
    editorTimesTables = defaultTablesForStarter(editorStarterProfileId);
  } else {
    if (!editingChildId) {
      setBanner('cloudStatusBanner', 'Choose a child profile before editing settings.', true);
      return;
    }
    profileData = await getChildProfile(currentHouseholdId, editingChildId);
    editorStarterProfileId = profileData.starterProfileId || 'koali';
    editorWords = await loadCloudWords(currentHouseholdId, editingChildId);
    if (!editorWords.length) {
      editorWords = defaultWordsForStarter(editorStarterProfileId);
    }
    editorTimesTables = (profileData.defaultTimesTables || []).slice();
  }

  fillEditorFields(profileData);
  renderWordEditor(editorWords);
  renderTimesTableGrid(editorTimesTables);
  document.getElementById('settingsTitle').textContent = editorMode === 'create' ? '✨ Create Child Profile' : '⚙️ Edit Child Profile';
  document.getElementById('deleteProfileBtn').style.display = editorMode === 'edit' ? 'inline-flex' : 'none';
  document.getElementById('settingsOverlay').classList.add('show');
  toggleFixedMathRoundsVisibility();
  playSound('pop');
}

function fillEditorFields(profileData) {
  document.getElementById('childDisplayNameInput').value = profileData.childDisplayName || '';
  document.getElementById('gameTitleInput').value = profileData.gameTitle || '';
  document.getElementById('characterNameInput').value = profileData.characterName || '';
  document.getElementById('currencyNameInput').value = profileData.currencyName || '';
  document.getElementById('avatarPresetSelect').value = profileData.avatarPresetId || 'koali';
  document.getElementById('bossPresetSelect').value = profileData.bossPresetId || 'bear';
  document.getElementById('themePresetSelect').value = profileData.themePresetId || 'forest';
  document.getElementById('mathRoundsModeSelect').value = profileData.mathRoundsMode || 'match_words';
  document.getElementById('fixedMathRoundsInput').value = profileData.fixedMathRounds || 5;
}

function collectWordsFromEditor() {
  var rows = document.querySelectorAll('.word-row');
  var words = [];
  for (var i = 0; i < rows.length; i++) {
    var emoji = rows[i].querySelector('.emoji-input').value.trim() || '\u2753';
    var word = rows[i].querySelector('.word-input').value.trim().toLowerCase();
    var hint = rows[i].querySelector('.hint-input').value.trim() || 'Spell this word!';
    if (word.length > 0) {
      words.push({
        id: rows[i].dataset.wordId || ('word-' + i + '-' + word),
        word: word,
        emoji: emoji,
        hint: hint,
        sortOrder: i
      });
    }
  }
  return words;
}

function collectTablesFromEditor() {
  var activeTables = [];
  var toggles = document.querySelectorAll('.tt-toggle.active');
  for (var i = 0; i < toggles.length; i++) {
    activeTables.push(parseInt(toggles[i].dataset.table, 10));
  }
  return activeTables;
}

async function closeSettings() {
  var words = collectWordsFromEditor();
  var activeTables = collectTablesFromEditor();
  var childDisplayName = document.getElementById('childDisplayNameInput').value.trim();
  var gameTitle = document.getElementById('gameTitleInput').value.trim();
  var characterName = document.getElementById('characterNameInput').value.trim();
  var currencyName = document.getElementById('currencyNameInput').value.trim();
  var avatarPresetId = document.getElementById('avatarPresetSelect').value;
  var bossPresetId = document.getElementById('bossPresetSelect').value;
  var themePresetId = document.getElementById('themePresetSelect').value;
  var mathRoundsMode = document.getElementById('mathRoundsModeSelect').value;
  var fixedMathRounds = parseInt(document.getElementById('fixedMathRoundsInput').value, 10);

  if (!childDisplayName || !gameTitle || !characterName || !currencyName) {
    setBanner('settingsMessage', 'Please complete every profile detail before saving.', true);
    return;
  }
  if (words.length === 0) {
    setBanner('settingsMessage', 'You need at least one spelling word.', true);
    return;
  }
  if (activeTables.length === 0) {
    setBanner('settingsMessage', 'Choose at least one times table.', true);
    return;
  }
  if (mathRoundsMode === 'fixed' && (!fixedMathRounds || fixedMathRounds < 1)) {
    setBanner('settingsMessage', 'Choose a valid fixed number of math rounds.', true);
    return;
  }

  var starterProfileId = deriveStarterProfileIdFromEditor();
  var payload = {
    childDisplayName: childDisplayName,
    gameTitle: gameTitle,
    characterName: characterName,
    avatarPresetId: avatarPresetId,
    bossPresetId: bossPresetId,
    themePresetId: themePresetId,
    currencyName: currencyName,
    defaultTimesTables: activeTables.slice(),
    mathRoundsMode: mathRoundsMode,
    fixedMathRounds: mathRoundsMode === 'fixed' ? fixedMathRounds : null,
    starterProfileId: starterProfileId
  };

  try {
    setBanner('settingsMessage', editorMode === 'create' ? 'Creating profile...' : 'Saving profile...', false);
    if (editorMode === 'create') {
      editingChildId = await createChildProfile(currentHouseholdId, Object.assign({}, payload, {
        totalCoins: 0
      }));
    } else {
      await updateChildProfile(currentHouseholdId, editingChildId, payload);
    }

    await saveCloudWords(currentHouseholdId, editingChildId, words);
    await refreshDashboard();
    await selectChildProfile(editingChildId);

    saveWords(words);
    saveTimesTables(activeTables);
    activeWords = cloneWords(words);
    activeTimesTables = activeTables.slice();

    document.getElementById('settingsOverlay').classList.remove('show');
    setBanner('settingsMessage', '');
    playSound('correct');
  } catch (error) {
    setBanner('settingsMessage', error.message || 'Could not save this child profile.', true);
  }
}

function cancelSettings() {
  document.getElementById('settingsOverlay').classList.remove('show');
  setBanner('settingsMessage', '');
}

async function deleteCurrentChild() {
  if (editorMode !== 'edit' || !editingChildId) return;
  if (!window.confirm('Delete this child profile and all of its saved words?')) return;

  try {
    await deleteChildProfile(currentHouseholdId, editingChildId);
    document.getElementById('settingsOverlay').classList.remove('show');
    if (currentChildId === editingChildId) {
      currentChildId = null;
      currentChildRecord = null;
      currentChildWords = [];
      currentProfile = null;
    }
    await refreshDashboard();
    playSound('pop');
  } catch (error) {
    setBanner('settingsMessage', error.message || 'Could not delete that child profile.', true);
  }
}

function renderWordEditor(wordsOverride) {
  var container = document.getElementById('wordListEditor');
  var words = wordsOverride || editorWords;
  container.textContent = '';
  words.forEach(function(w) {
    container.appendChild(createWordRow(w.emoji, w.word, w.hint, w.id));
  });
}

function createWordRow(emoji, word, hint, wordId) {
  var row = document.createElement('div');
  row.className = 'word-row';
  row.dataset.wordId = wordId || '';

  var emojiInput = document.createElement('input');
  emojiInput.type = 'text';
  emojiInput.className = 'emoji-input';
  emojiInput.value = emoji;
  emojiInput.placeholder = '\uD83C\uDFAE';
  emojiInput.maxLength = 4;

  var wordInput = document.createElement('input');
  wordInput.type = 'text';
  wordInput.className = 'word-input';
  wordInput.value = word;
  wordInput.placeholder = 'word';

  var hintInput = document.createElement('input');
  hintInput.type = 'text';
  hintInput.className = 'hint-input';
  hintInput.value = hint;
  hintInput.placeholder = 'Hint for the word';

  var deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete-word';
  deleteBtn.textContent = '\u2715';
  deleteBtn.onclick = function() { row.remove(); };

  row.appendChild(emojiInput);
  row.appendChild(wordInput);
  row.appendChild(hintInput);
  row.appendChild(deleteBtn);

  return row;
}

function addWordRow() {
  var container = document.getElementById('wordListEditor');
  container.appendChild(createWordRow('\u2753', '', ''));
  if (container.lastElementChild) {
    container.lastElementChild.scrollIntoView({ behavior: 'smooth' });
  }
  playSound('pop');
}

function resetWordsToDefault() {
  editorStarterProfileId = deriveStarterProfileIdFromEditor();
  editorWords = defaultWordsForStarter(editorStarterProfileId);
  renderWordEditor(editorWords);
  playSound('pop');
}

function renderTimesTableGrid(activeOverride) {
  var grid = document.getElementById('timesTableGrid');
  var active = activeOverride || editorTimesTables;
  grid.textContent = '';
  for (var i = 2; i <= 12; i++) {
    var btn = document.createElement('button');
    btn.className = 'tt-toggle' + (active.indexOf(i) !== -1 ? ' active' : '');
    btn.textContent = '\u00D7' + i;
    btn.dataset.table = i;
    (function(b) {
      b.onclick = function() {
        b.classList.toggle('active');
        playSound('pop');
      };
    })(btn);
    grid.appendChild(btn);
  }
}

// ═══════════════════ SOUNDS ═══════════════════
function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  var now = audioCtx.currentTime;
  var osc, gain, osc2, gain2;

  if (type === 'pop') {
    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'place') {
    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(300, now);
    gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'correct') {
    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(659.25, now + 0.1); osc.frequency.setValueAtTime(783.99, now + 0.2);
    gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.start(now); osc.stop(now + 0.4);
  } else if (type === 'wrong') {
    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(150, now + 0.3);
    gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now); osc.stop(now + 0.3);
  } else if (type === 'hint') {
    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now); osc.frequency.setValueAtTime(800, now + 0.15);
    gain.gain.setValueAtTime(0.08, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now); osc.stop(now + 0.3);
  } else if (type === 'victory') {
    [523, 659, 784, 1046].forEach(function(freq, i) {
      var o = audioCtx.createOscillator(); var g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.05, now + i*0.1); g.gain.exponentialRampToValueAtTime(0.001, now + i*0.1 + 0.4);
      o.start(now + i*0.1); o.stop(now + i*0.1 + 0.4);
    });
  } else if (type === 'coin') {
    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now); osc.frequency.setValueAtTime(1600, now + 0.05); osc.frequency.setValueAtTime(2000, now + 0.1);
    gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now); osc.stop(now + 0.25);
  } else if (type === 'bossAppear') {
    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 1.5);
    gain.gain.setValueAtTime(0.08, now); gain.gain.linearRampToValueAtTime(0, now + 1.5);
    osc.start(now); osc.stop(now + 1.5);
    osc2 = audioCtx.createOscillator();
    gain2 = audioCtx.createGain();
    osc2.connect(gain2); gain2.connect(audioCtx.destination);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(55, now);
    gain2.gain.setValueAtTime(0.04, now); gain2.gain.linearRampToValueAtTime(0, now + 1.2);
    osc2.start(now); osc2.stop(now + 1.2);
  } else if (type === 'bossHit') {
    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.start(now); osc.stop(now + 0.2);
    osc2 = audioCtx.createOscillator();
    gain2 = audioCtx.createGain();
    osc2.connect(gain2); gain2.connect(audioCtx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(800, now); osc2.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    gain2.gain.setValueAtTime(0.08, now); gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc2.start(now); osc2.stop(now + 0.15);
  } else if (type === 'bossAttack') {
    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
    gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.start(now); osc.stop(now + 0.4);
  } else if (type === 'bossDefeat') {
    [262, 330, 392, 523, 659, 784].forEach(function(freq, i) {
      var o = audioCtx.createOscillator(); var g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, now + i*0.12); g.gain.exponentialRampToValueAtTime(0.001, now + i*0.12 + 0.5);
      o.start(now + i*0.12); o.stop(now + i*0.12 + 0.5);
    });
  }
}

// ═══════════════════ START ═══════════════════
window.submitAuthForm = submitAuthForm;
window.toggleAuthMode = toggleAuthMode;
window.signOutCurrentUser = signOutCurrentUser;
window.openSettings = openSettings;
window.startGame = startGame;
window.returnToDashboard = returnToDashboard;
window.koaliCheer = koaliCheer;
window.useHint = useHint;
window.clearSlots = clearSlots;
window.checkWord = checkWord;
window.skipRound = skipRound;
window.addWordRow = addWordRow;
window.resetWordsToDefault = resetWordsToDefault;
window.closeSettings = closeSettings;
window.cancelSettings = cancelSettings;
window.deleteCurrentChild = deleteCurrentChild;
window.goToStartScreen = goToStartScreen;

init();
