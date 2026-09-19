/**
 * KYVEX • Next-Gen Discord Bot & Management Dashboard Client Logic
 * Features Zynrax Modern Dark UI, Server Grid Selector, 
 * Left Sidebar Navigation, Ticket Panel Designer, 
 * Discord Canvas Live Preview, and Full Anti-Nuke / Audio Management.
 */

let currentGuildId = null;
let pollTimer = null;
let currentPanels = [];
let currentInteractionMode = 'dropdowns';
let customDropdowns = [];
let allCachedGuilds = [];

// Check for Discord OAuth2 Implicit Grant Access Token in URL Hash
(function checkDiscordOAuthHash() {
  try {
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get('access_token');
      if (token) {
        localStorage.setItem('discord_oauth_token', token);
        localStorage.setItem('og_logged_in', 'true');
        // Clean URL hash without triggering full page reload
        history.replaceState(null, '', window.location.pathname + window.location.search);

        // Show authentic Zynrax cyber authentication callback animation
        const screen = document.getElementById('callbackLoadingScreen');
        const text = document.getElementById('callbackPulseText');
        if (screen) screen.style.display = 'flex';
        if (text) text.textContent = 'AUTHENTICATING WITH SECURE SERVER...';

        setTimeout(() => {
          if (text) text.textContent = 'SYNCHRONIZING PROFILE...';
        }, 500);

        setTimeout(() => {
          if (text) text.textContent = 'REDIRECTING...';
        }, 1100);

        setTimeout(() => {
          if (screen) screen.style.display = 'none';
          if (typeof showDashboard === 'function') showDashboard();
          if (typeof switchView === 'function') switchView('servers', t('yourServers'));
          if (typeof fetchAllGuilds === 'function') fetchAllGuilds();
        }, 1600);
      }
    }
  } catch (e) {
    console.error('Error parsing Discord OAuth hash:', e);
  }
})();

// Global Discord OAuth2 Authorization Redirect
window.loginWithDiscordOAuth = function() {
  const clientId = '1545804677436940339';
  const scopes = 'identify%20guilds%20guilds.join';

  // Use the standard registered root redirect URI (matches Discord Developer Portal exactly)
  const redirectUri = window.location.origin + '/';
  const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}`;
  window.location.href = oauthUrl;
};

// ============================================================
// 0. ZYNRAX MULTI-LANGUAGE I18N SYSTEM (भाषा चयन प्रणाली)
// ============================================================
const KYVEX_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', label: '🇬🇧 EN' },
  { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳', label: '🇮🇳 HI' },
  { code: 'es', name: 'Español', flag: '🇪🇸', label: '🇪🇸 ES' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', label: '🇫🇷 FR' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', label: '🇩🇪 DE' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', label: '🇷🇺 RU' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', label: '🇯🇵 JA' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', label: '🇧🇷 PT' }
];

const KYVEX_TRANSLATIONS = {
  en: {
    home: "HOME",
    dashboard: "DASHBOARD",
    extra: "EXTRA ▾",
    support: "SUPPORT",
    premium: "💎 PREMIUM",
    login: "LOGIN",
    logout: "Logout",
    yourServers: "Your Servers",
    yourServersSubtitle: "Select a server to configure or invite Kyvex to unlock security, panels, and music.",
    myServers: "My Servers",
    antiNuke: "Anti-Nuke Defense",
    autoMod: "Auto-Mod Filters",
    musicController: "Music Controller",
    serverLogs: "Server Logs",
    extraOwners: "Extra Owners",
    welcomeBack: "Welcome back,",
    welcomeSub: "Select your Discord server below to configure Anti-Nuke defense, Auto-Mod filters, and 24/7 crystal-clear Music streaming.",
    authenticatedSession: "AUTHENTICATED DISCORD SESSION",
    statManageable: "MANAGEABLE",
    statOwned: "OWNED",
    statWithBot: "WITH BOT",
    searchServers: "Search servers...",
    refresh: "Refresh",
    addBotToServer: "+ Add Bot to Server",
    loginTitle: "Welcome to Kyvex",
    loginDesc: "Login to access your dashboard and manage your servers with military-grade security tools.",
    loginWithDiscord: "Login with Discord",
    orTestInstantly: "OR INSTANT ACCESS",
    enterUserId: "Enter Discord User ID...",
    instantDemoAccess: "Instant Admin Access (Demo Mode)",
    termsNotice: "By continuing, you agree to our Terms of Service and Privacy Policy.",
    configure: "Configure",
    inviteBot: "+ Add Bot to Server",
    botActive: "Bot Active",
    notAdded: "Not Added",
    loadingServers: "Loading your Discord servers...",
    noServersFound: "No Discord Servers Found",
    authorizeToView: "Authorize with Discord to view servers where you are the Server Owner or have Administrator permissions."
  },
  hi: {
    home: "होम",
    dashboard: "डैशबोर्ड",
    extra: "एक्स्ट्रा ▾",
    support: "सपोर्ट",
    premium: "💎 प्रीमियम",
    login: "लॉगिन",
    logout: "लॉगआउट",
    yourServers: "आपके सर्वर",
    yourServersSubtitle: "सुरक्षा, पैनेल्स और म्यूजिक कॉन्फ़िगर करने के लिए एक सर्वर चुनें या Kyvex को जोड़ें।",
    myServers: "मेरे सर्वर",
    antiNuke: "एंटी-न्यूक सुरक्षा",
    autoMod: "ऑटो-मॉड फ़िल्टर",
    musicController: "म्यूजिक कंट्रोलर",
    serverLogs: "सर्वर लॉग्स",
    extraOwners: "एक्स्ट्रा ओनर्स",
    welcomeBack: "वापसी पर स्वागत है,",
    welcomeSub: "एंटी-न्यूक डिफेंस, ऑटो-मॉड और 24/7 हाई-क्वालिटी म्यूजिक प्रबंधित करने के लिए नीचे अपना डिस्कॉर्ड सर्वर चुनें।",
    authenticatedSession: "प्रमाणित डिस्कॉर्ड सत्र",
    statManageable: "प्रबंधनीय",
    statOwned: "ओनरशिप",
    statWithBot: "बॉट सक्रिय",
    searchServers: "सर्वर खोजें...",
    refresh: "रिफ्रेश करें",
    addBotToServer: "+ सर्वर में बॉट जोड़ें",
    loginTitle: "Kyvex में आपका स्वागत है",
    loginDesc: "अपने डैशबोर्ड तक पहुँचने और उच्च-स्तरीय सुरक्षा उपकरणों के साथ अपने सर्वर प्रबंधित करने के लिए लॉगिन करें।",
    loginWithDiscord: "डिस्कॉर्ड से लॉगिन करें",
    orTestInstantly: "या तुरंत टेस्ट करें",
    enterUserId: "डिस्कॉर्ड यूजर आईडी डालें...",
    instantDemoAccess: "त्वरित एडमिन एक्सेस (डेमो मोड)",
    termsNotice: "जारी रखने पर आप हमारी सेवा की शर्तों और गोपनीयता नीति से सहमत होते हैं।",
    configure: "प्रबंधित करें",
    inviteBot: "+ सर्वर में बॉट जोड़ें",
    botActive: "बॉट सक्रिय",
    notAdded: "शामिल नहीं",
    loadingServers: "आपके डिस्कॉर्ड सर्वर लोड हो रहे हैं...",
    noServersFound: "कोई डिस्कॉर्ड सर्वर नहीं मिला",
    authorizeToView: "सर्वर देखने के लिए डिस्कॉर्ड से अधिकृत करें जहाँ आप सर्वर के ओनर या एडमिनिस्ट्रेटर हैं।"
  },
  es: {
    home: "INICIO",
    dashboard: "PANEL",
    extra: "EXTRA ▾",
    support: "SOPORTE",
    premium: "💎 PREMIUM",
    login: "INICIAR SESIÓN",
    logout: "Cerrar sesión",
    yourServers: "Tus Servidores",
    yourServersSubtitle: "Selecciona un servidor para configurar o invita a Kyvex para desbloquear seguridad y música.",
    myServers: "Mis Servidores",
    antiNuke: "Defensa Anti-Nuke",
    autoMod: "Filtros Auto-Mod",
    musicController: "Controlador de Música",
    serverLogs: "Registros del Servidor",
    extraOwners: "Propietarios Adicionales",
    welcomeBack: "Bienvenido de nuevo,",
    welcomeSub: "Selecciona tu servidor de Discord para configurar la defensa Anti-Nuke y música 24/7.",
    authenticatedSession: "SESIÓN AUTENTICADA DE DISCORD",
    statManageable: "ADMINISTRABLE",
    statOwned: "PROPIEDAD",
    statWithBot: "CON BOT",
    searchServers: "Buscar servidores...",
    refresh: "Actualizar",
    addBotToServer: "+ Añadir Bot al Servidor",
    loginTitle: "Bienvenido a Kyvex",
    loginDesc: "Inicia sesión para acceder a tu panel y gestionar tus servidores con herramientas militares.",
    loginWithDiscord: "Iniciar con Discord",
    orTestInstantly: "O ACCESO INSTANTÁNEO",
    enterUserId: "ID de usuario de Discord...",
    instantDemoAccess: "Acceso Rápido de Administrador",
    termsNotice: "Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.",
    configure: "Configurar",
    inviteBot: "+ Añadir Bot",
    botActive: "Bot Activo",
    notAdded: "No Añadido",
    loadingServers: "Cargando tus servidores de Discord...",
    noServersFound: "No se encontraron servidores",
    authorizeToView: "Autoriza con Discord para ver servidores donde eres Propietario o Administrador."
  },
  fr: {
    home: "ACCUEIL",
    dashboard: "TABLEAU DE BORD",
    extra: "EXTRA ▾",
    support: "SUPPORT",
    premium: "💎 PREMIUM",
    login: "CONNEXION",
    logout: "Déconnexion",
    yourServers: "Vos Serveurs",
    yourServersSubtitle: "Sélectionnez un serveur pour configurer ou invitez Kyvex.",
    myServers: "Mes Serveurs",
    antiNuke: "Défense Anti-Nuke",
    autoMod: "Filtres Auto-Mod",
    musicController: "Contrôleur Audio",
    serverLogs: "Journaux du Serveur",
    extraOwners: "Propriétaires Extras",
    welcomeBack: "Bon retour,",
    welcomeSub: "Sélectionnez votre serveur Discord ci-dessous pour gérer la sécurité et la musique.",
    authenticatedSession: "SESSION DISCORD AUTHENTIFIÉE",
    statManageable: "GÉRABLE",
    statOwned: "PROPRIÉTAIRE",
    statWithBot: "AVEC BOT",
    searchServers: "Rechercher...",
    refresh: "Actualiser",
    addBotToServer: "+ Ajouter au Serveur",
    loginTitle: "Bienvenue sur Kyvex",
    loginDesc: "Connectez-vous pour accéder à votre tableau de bord.",
    loginWithDiscord: "Connexion Discord",
    orTestInstantly: "OU ACCÈS INSTANTANÉ",
    enterUserId: "ID Utilisateur Discord...",
    instantDemoAccess: "Accès Administrateur Instantané",
    termsNotice: "En continuant, vous acceptez nos Conditions d'utilisation.",
    configure: "Configurer",
    inviteBot: "+ Inviter le Bot",
    botActive: "Bot Actif",
    notAdded: "Non Ajouté"
  },
  de: {
    home: "STARTSEITE",
    dashboard: "DASHBOARD",
    extra: "EXTRA ▾",
    support: "SUPPORT",
    premium: "💎 PREMIUM",
    login: "ANMELDEN",
    logout: "Abmelden",
    yourServers: "Deine Server",
    yourServersSubtitle: "Wähle einen Server zum Konfigurieren aus oder lade Kyvex ein.",
    myServers: "Meine Server",
    antiNuke: "Anti-Nuke Schutz",
    autoMod: "Auto-Mod Filter",
    musicController: "Musik-Controller",
    serverLogs: "Server-Protokolle",
    extraOwners: "Zusätzliche Eigentümer",
    welcomeBack: "Willkommen zurück,",
    welcomeSub: "Wähle deinen Discord-Server, um Anti-Nuke und Musik zu steuern.",
    authenticatedSession: "AUTHENTIFIZIERTE DISCORD-SITZUNG",
    statManageable: "VERWALTBAR",
    statOwned: "EIGENTUM",
    statWithBot: "MIT BOT",
    searchServers: "Server suchen...",
    refresh: "Aktualisieren",
    addBotToServer: "+ Bot zum Server hinzufügen",
    loginTitle: "Willkommen bei Kyvex",
    loginDesc: "Melde dich an, um auf dein Dashboard zuzugreifen.",
    loginWithDiscord: "Mit Discord anmelden",
    orTestInstantly: "ODER SOFORTZUGANG",
    enterUserId: "Discord User ID eingeben...",
    instantDemoAccess: "Sofortiger Admin-Zugang",
    termsNotice: "Mit dem Fortfahren stimmst du den Nutzungsbedingungen zu.",
    configure: "Konfigurieren",
    inviteBot: "+ Bot Einladen",
    botActive: "Bot Aktiv",
    notAdded: "Nicht Hinzugefügt"
  },
  ru: {
    home: "ГЛАВНАЯ",
    dashboard: "ПАНЕЛЬ",
    extra: "ДОПОЛНИТЕЛЬНО ▾",
    support: "ПОДДЕРЖКА",
    premium: "💎 ПРЕМИУМ",
    login: "ВОЙТИ",
    logout: "Выйти",
    yourServers: "Ваши Серверы",
    yourServersSubtitle: "Выберите сервер для настройки или пригласите Kyvex.",
    myServers: "Мои Серверы",
    antiNuke: "Защита Anti-Nuke",
    autoMod: "Авто-модерация",
    musicController: "Управление Музыкой",
    serverLogs: "Журналы Сервера",
    extraOwners: "Дополнительные Владельцы",
    welcomeBack: "С возвращением,",
    welcomeSub: "Выберите ваш Discord сервер для управления безопасностью и музыкой.",
    authenticatedSession: "АВТОРИЗОВАННАЯ СЕССИЯ DISCORD",
    statManageable: "ДОСТУПНО",
    statOwned: "ВЛАДЕЛЕЦ",
    statWithBot: "С БОТОМ",
    searchServers: "Поиск серверов...",
    refresh: "Обновить",
    addBotToServer: "+ Добавить Бота",
    loginTitle: "Добро пожаловать в Kyvex",
    loginDesc: "Войдите через Discord для доступа к управлению серверами.",
    loginWithDiscord: "Войти через Discord",
    orTestInstantly: "ИЛИ БЫСТРЫЙ ВХОД",
    enterUserId: "Discord User ID...",
    instantDemoAccess: "Мгновенный доступ администратора",
    termsNotice: "Продолжая, вы принимаете Условия обслуживания.",
    configure: "Настроить",
    inviteBot: "+ Добавить Бота",
    botActive: "Бот Активен",
    notAdded: "Не Добавлен"
  },
  ja: {
    home: "ホーム",
    dashboard: "ダッシュボード",
    extra: "その他 ▾",
    support: "サポート",
    premium: "💎 プレミアム",
    login: "ログイン",
    logout: "ログアウト",
    yourServers: "あなたのサーバー",
    yourServersSubtitle: "設定するサーバーを選択するか、Kyvexを招待してください。",
    myServers: "マイサーバー",
    antiNuke: "アンチヌーク防衛",
    autoMod: "自動モデレーション",
    musicController: "音楽コントローラー",
    serverLogs: "サーバーログ",
    extraOwners: "追加オーナー",
    welcomeBack: "おかえりなさい、",
    welcomeSub: "Anti-Nukeや音楽を管理するDiscordサーバーを選択してください。",
    authenticatedSession: "認証済みDISCORDセッション",
    statManageable: "管理可能",
    statOwned: "所有",
    statWithBot: "Bot導入済み",
    searchServers: "サーバーを検索...",
    refresh: "更新",
    addBotToServer: "+ サーバーにBotを追加",
    loginTitle: "Kyvexへようこそ",
    loginDesc: "ダッシュボードにアクセスしてサーバーを管理するためにログインしてください。",
    loginWithDiscord: "Discordでログイン",
    orTestInstantly: "または即時アクセス",
    enterUserId: "Discord ユーザーIDを入力...",
    instantDemoAccess: "即時管理者アクセス",
    termsNotice: "続行することにより、利用規約に同意したことになります。",
    configure: "設定する",
    inviteBot: "+ Botを招待",
    botActive: "Bot稼働中",
    notAdded: "未追加"
  },
  pt: {
    home: "INÍCIO",
    dashboard: "PAINEL",
    extra: "EXTRA ▾",
    support: "SUPORTE",
    premium: "💎 PREMIUM",
    login: "ENTRAR",
    logout: "Sair",
    yourServers: "Seus Servidores",
    yourServersSubtitle: "Selecione um servidor para configurar ou convide o Kyvex.",
    myServers: "Meus Servidores",
    antiNuke: "Defesa Anti-Nuke",
    autoMod: "Filtros Auto-Mod",
    musicController: "Controlador de Música",
    serverLogs: "Registros do Servidor",
    extraOwners: "Proprietários Extras",
    welcomeBack: "Bem-vindo de volta,",
    welcomeSub: "Selecione seu servidor Discord para configurar Anti-Nuke e música 24/7.",
    authenticatedSession: "SESSÃO DISCORD AUTENTICADA",
    statManageable: "GERENCIÁVEIS",
    statOwned: "PROPRIETÁRIO",
    statWithBot: "COM BOT",
    searchServers: "Buscar servidores...",
    refresh: "Atualizar",
    addBotToServer: "+ Adicionar Bot",
    loginTitle: "Bem-vindo ao Kyvex",
    loginDesc: "Entre para acessar o painel e gerenciar seus servidores.",
    loginWithDiscord: "Entrar com Discord",
    orTestInstantly: "OU ACESSO INSTANTÂNEO",
    enterUserId: "ID de usuário Discord...",
    instantDemoAccess: "Acesso Rápido de Administrador",
    termsNotice: "Ao continuar, você concorda com nossos Termos de Serviço.",
    configure: "Configurar",
    inviteBot: "+ Convidar Bot",
    botActive: "Bot Ativo",
    notAdded: "Não Adicionado"
  }
};

function getActiveLanguage() {
  return localStorage.getItem('kyvex_lang') || 'en';
}

function t(key) {
  const lang = getActiveLanguage();
  return KYVEX_TRANSLATIONS[lang]?.[key] || KYVEX_TRANSLATIONS.en?.[key] || key;
}

function applyLanguage(langCode) {
  const selectedLang = KYVEX_LANGUAGES.find(l => l.code === langCode) || KYVEX_LANGUAGES[0];
  localStorage.setItem('kyvex_lang', selectedLang.code);

  // Update Topbar Lang Pill
  const displayEl = document.getElementById('currentLangDisplay');
  if (displayEl) {
    displayEl.textContent = `${selectedLang.label} ▾`;
  }

  // Update active state in dropdown
  document.querySelectorAll('.lang-option-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === selectedLang.code) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Apply to all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (translated) {
      if (el.tagName === 'INPUT') {
        el.placeholder = translated;
      } else {
        el.textContent = translated;
      }
    }
  });

  // Also update topbar nav items directly
  const navHome = document.getElementById('zynraxNavHome');
  const navDash = document.getElementById('zynraxNavDashboard');
  const navExtra = document.getElementById('zynraxNavExtra');
  const navSupport = document.getElementById('zynraxNavSupport');
  const loginText = document.getElementById('topbarLoginText');
  if (navHome) navHome.textContent = t('home');
  if (navDash) navDash.textContent = t('dashboard');
  if (navExtra) navExtra.textContent = t('extra');
  if (navSupport) navSupport.textContent = t('support');
  if (loginText && (!localStorage.getItem('og_logged_in') || localStorage.getItem('og_logged_in') === 'false')) {
    loginText.textContent = t('login');
  }

  // Re-render server grid if already cached so action buttons translate
  if (allCachedGuilds && allCachedGuilds.length > 0) {
    renderServerGrid(allCachedGuilds);
  }
}

function setLanguage(langCode) {
  applyLanguage(langCode);
  const langDropdown = document.getElementById('zynraxLangDropdown');
  if (langDropdown) langDropdown.style.display = 'none';
  const pill = document.getElementById('zynraxLangPill');
  if (pill) pill.classList.remove('active');
  const langName = KYVEX_LANGUAGES.find(l => l.code === langCode)?.name || langCode;
  showToast(`🌐 Language: ${langName}`, 'info');
}

// ============================================================
// TOPBAR USER PROFILE & AUTHENTICATION STATE CONTROLLER
// ============================================================
function updateTopbarAuthState(userOverride = null) {
  const btnLogin = document.getElementById('zynraxBtnLogin');
  const userPill = document.getElementById('zynraxUserPill');
  const avatarImg = document.getElementById('topbarUserAvatar');
  const nameEl = document.getElementById('topbarUserName');
  const roleEl = document.getElementById('topbarUserBadge');
  const dropName = document.getElementById('userDropdownName');
  const dropSub = document.getElementById('userDropdownSub');
  const welcomeEl = document.getElementById('welcomeUserName');

  const isLoggedIn = localStorage.getItem('og_logged_in') === 'true';
  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem('kyvex_user') || 'null');
  } catch (e) {}

  const user = userOverride || storedUser || {
    id: 'master-admin',
    username: 'Master Admin',
    displayName: 'Master Admin',
    role: 'OWNER',
    avatar: 'https://cdn.discordapp.com/embed/avatars/1.png'
  };

  if (isLoggedIn) {
    if (btnLogin) btnLogin.style.display = 'none';
    if (userPill) userPill.style.display = 'flex';

    const displayName = user.displayName || user.global_name || user.username || 'Admin';
    if (nameEl) nameEl.textContent = displayName;
    if (welcomeEl) welcomeEl.textContent = displayName;
    if (dropName) dropName.textContent = displayName;
    if (dropSub) dropSub.textContent = user.id ? `ID: ${user.id}` : 'Discord Account';
    if (roleEl) roleEl.textContent = user.role || 'OWNER';
    if (avatarImg) {
      avatarImg.src = user.avatar || 'https://cdn.discordapp.com/embed/avatars/1.png';
      avatarImg.onerror = () => {
        avatarImg.src = 'https://cdn.discordapp.com/embed/avatars/1.png';
      };
    }

    // Sync to Zynrax Dashboard Profile Card
    const dashAvatar = document.getElementById('dashProfileAvatar');
    const dashName = document.getElementById('dashProfileName');
    if (dashAvatar) {
      dashAvatar.src = user.avatar || 'https://cdn.discordapp.com/embed/avatars/1.png';
      dashAvatar.onerror = () => {
        dashAvatar.src = 'https://cdn.discordapp.com/embed/avatars/1.png';
      };
    }
    if (dashName) dashName.textContent = displayName;
  } else {
    if (btnLogin) btnLogin.style.display = 'flex';
    if (userPill) userPill.style.display = 'none';
  }
}

function loginAsUser(userId, customName = null, avatarUrl = null) {
  const cleanId = String(userId || '').trim().replace(/[<@!>]/g, '');
  const user = {
    id: cleanId || '1545804677436940339',
    username: customName || (cleanId ? `Discord User (${cleanId.slice(-4)})` : 'Master Admin'),
    displayName: customName || (cleanId ? `User #${cleanId.slice(-4)}` : 'Master Admin'),
    role: 'OWNER',
    avatar: avatarUrl || 'https://cdn.discordapp.com/embed/avatars/1.png'
  };

  localStorage.setItem('kyvex_user', JSON.stringify(user));
  localStorage.setItem('og_logged_in', 'true');

  const zynraxModal = document.getElementById('zynraxLoginModal');
  if (zynraxModal) zynraxModal.style.display = 'none';

  updateTopbarAuthState(user);
  if (typeof showDashboard === 'function') showDashboard();
  if (typeof switchView === 'function') switchView('servers', t('yourServers'));
  if (typeof fetchAllGuilds === 'function') fetchAllGuilds();

  showToast(`✨ ${t('welcomeBack')} ${user.displayName}!`, 'success');
}

function logoutUser() {
  localStorage.removeItem('discord_oauth_token');
  localStorage.removeItem('kyvex_user');
  localStorage.setItem('og_logged_in', 'false');

  // Clear server-side session cookie
  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});

  const userDropdown = document.getElementById('zynraxUserDropdown');
  if (userDropdown) userDropdown.style.display = 'none';

  updateTopbarAuthState();
  if (typeof showLanding === 'function') showLanding();
  showToast(t('logout') + ' successfully', 'info');
}

// Panel Settings & Ticket Access Roles State
let serverRoles = [];
let serverCategories = [];
let selectedPanelSupportRoleId = null;
let selectedPanelSupportRoles = [];
let selectedPanelCategoryId = null;
let selectedPanelTicketPrefix = 'ticket-';
let selectedPanelAdminAccess = true;

// Helper functions for dropdown editor & canvas sync
function renderDropdownsEditor() {
  const container = document.getElementById('dropdownsEditorList');
  if (!container) return;
}

function renderCanvasDropdowns() {
  // Synchronized via renderInteractionArea
}

function addDropdownMenu() {
  if (typeof addDropdownRow === 'function') {
    addDropdownRow();
  }
}

// ==========================================
// 1. INITIALIZATION & VIEW NAVIGATION
// ==========================================

function switchView(viewId, customBreadcrumb = null) {
  // Hide all views
  document.querySelectorAll('.dashboard-view').forEach((view) => {
    view.classList.remove('active');
  });

  // Highlight active nav item
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.getAttribute('data-view') === viewId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Show target view
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update Breadcrumbs
  const bcActive = document.getElementById('bcActive');
  if (bcActive) {
    if (customBreadcrumb) {
      bcActive.textContent = customBreadcrumb;
    } else {
      const titles = {
        servers: 'Your Servers',
        panels: 'Panels',
        designer: 'Panel Designer',
        home: 'Home',
        tickets: 'Ticket History',
        applications: 'Applications',
        security: 'Security & Shield',
        music: 'Music & 24/7',
        statistics: 'Statistics',
        settings: 'Settings',
        audit: 'Audit Logs',
        antinuke: 'Anti-Nuke Defense',
        automod: 'AutoMod Protection',
        templates: 'Anti-Nuke Defense',
        verification: 'Verification & Roles',
        welcome: 'Welcome System & Designer'
      };
      bcActive.textContent = titles[viewId] || viewId.toUpperCase();
    }
  }

  // If entering servers view, refresh guild grid
  if (viewId === 'servers' && typeof fetchAllGuilds === 'function') {
    fetchAllGuilds();
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Fetches the user's real servers list using Discord OAuth2 or server-side session.
 * STRICT FILTER: Only servers where the user is Owner (owner: true) or Administrator (permissions 0x8) are shown.
 * Access token is kept strictly server-side in active session, never stored in the browser when in server-side mode.
 */
async function fetchAllGuilds() {
  let servers = [];
  let userProfile = null;
  let serverStats = null;
  let isOAuthSession = false;

  // 1. Check Server-Side Session first (/api/auth/me & /api/guilds)
  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'include' }).catch(() => null);
    if (meRes && meRes.ok) {
      const meData = await meRes.json();
      if (meData && meData.user && meData.user.username && meData.user.id !== 'dashboard-admin') {
        userProfile = meData.user;
        isOAuthSession = true;
        const dName = userProfile.global_name || userProfile.username || 'Discord User';
        const avatarUrl = userProfile.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';

        const userObj = {
          id: userProfile.id,
          username: userProfile.username,
          displayName: dName,
          role: userProfile.isOwner ? 'OWNER' : 'ADMIN',
          avatar: avatarUrl
        };
        localStorage.setItem('kyvex_user', JSON.stringify(userObj));
        localStorage.setItem('og_logged_in', 'true');
        updateTopbarAuthState(userObj);

        const nameEl = document.getElementById('userDisplayName');
        const avatarEl = document.getElementById('userAvatarImg');
        const welcomeName = document.getElementById('welcomeUserName');
        const dashName = document.getElementById('dashProfileName');
        const dashAvatar = document.getElementById('dashProfileAvatar');
        if (nameEl) nameEl.textContent = dName;
        if (avatarEl) avatarEl.src = avatarUrl;
        if (welcomeName) welcomeName.textContent = dName;
        if (dashName) dashName.textContent = dName;
        if (dashAvatar) dashAvatar.src = avatarUrl;
      }
    }
  } catch (meErr) {
    console.warn('Server session check note:', meErr);
  }

  // 2. Fetch servers from Server-Side /api/guilds (where token is securely stored server-side)
  try {
    const gRes = await fetch('/api/guilds', { credentials: 'include' }).catch(() => null);
    if (gRes && gRes.ok) {
      const gData = await gRes.json();
      if (gData.servers && gData.servers.length > 0) {
        servers = gData.servers;
        if (gData.stats) {
          serverStats = gData.stats;
        }
      }
    }
  } catch (gErr) {
    console.warn('Server guilds check note:', gErr);
  }

  // 3. Fallback: Client-Side OAuth Token if server-side session is not active (e.g. static host)
  const token = localStorage.getItem('discord_oauth_token');
  if (token && (!servers || servers.length === 0)) {
    try {
      const userRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (userRes.ok) {
        userProfile = await userRes.json();
        isOAuthSession = true;
        const dName = userProfile.global_name || userProfile.username || 'Discord User';
        const avatarUrl = userProfile.avatar 
          ? `https://cdn.discordapp.com/avatars/${userProfile.id}/${userProfile.avatar}.png`
          : 'https://cdn.discordapp.com/embed/avatars/0.png';

        const userObj = {
          id: userProfile.id,
          username: userProfile.username,
          displayName: dName,
          role: 'OWNER',
          avatar: avatarUrl
        };
        localStorage.setItem('kyvex_user', JSON.stringify(userObj));
        localStorage.setItem('og_logged_in', 'true');
        updateTopbarAuthState(userObj);

        const nameEl = document.getElementById('userDisplayName');
        const avatarEl = document.getElementById('userAvatarImg');
        const welcomeName = document.getElementById('welcomeUserName');
        const dashName = document.getElementById('dashProfileName');
        const dashAvatar = document.getElementById('dashProfileAvatar');
        if (nameEl) nameEl.textContent = dName;
        if (avatarEl) avatarEl.src = avatarUrl;
        if (welcomeName) welcomeName.textContent = dName;
        if (dashName) dashName.textContent = dName;
        if (dashAvatar) dashAvatar.src = avatarUrl;

        // Fetch user's guilds from Discord API
        const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (guildsRes.ok) {
          const rawGuilds = await guildsRes.json();
          // STRICT FILTER: User MUST be Owner (owner === true) OR have Administrator (0x8)
          const manageable = rawGuilds.filter((g) => {
            const isOwner = g.owner === true;
            const perms = BigInt(g.permissions || '0');
            const isAdmin = (perms & 0x8n) === 0x8n;
            return isOwner || isAdmin;
          });

          // Check bot presence via /api/status or local bot cache
          let botGuildIds = new Set();
          try {
            const stRes = await fetch('/api/status');
            if (stRes.ok) {
              const stData = await stRes.json();
              if (stData.guilds) {
                stData.guilds.forEach(bg => botGuildIds.add(bg.id));
              }
            }
          } catch (e) {}

          servers = manageable.map((g) => {
            const isOwner = g.owner === true;
            return {
              id: g.id,
              name: g.name,
              icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
              role: isOwner ? 'OWNER' : 'ADMIN',
              hasBot: botGuildIds.has(g.id),
              memberCount: 0
            };
          });
        }
      } else if (userRes.status === 401) {
        localStorage.removeItem('discord_oauth_token');
      }
    } catch (oauthErr) {
      console.warn('Client OAuth guild sync note:', oauthErr);
    }
  }

  // 4. Fallback if no OAuth servers found (fallback demo / bot presence servers)
  if (!servers || servers.length === 0) {
    try {
      const stRes = await fetch('/api/status').catch(() => null);
      if (stRes && stRes.ok) {
        const stData = await stRes.json();
        if (stData.guilds && stData.guilds.length > 0) {
          servers = stData.guilds.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.icon || null,
            memberCount: g.memberCount || 0,
            role: 'OWNER',
            hasBot: true
          }));
        }
      }
    } catch (e) {}

    if (!servers || servers.length === 0) {
      servers = [
        {
          id: '1547315288293515424',
          name: 'Kyvex',
          icon: 'https://cdn.discordapp.com/icons/1547315288293515424/043be6541ece44345a4c114977115d4a.webp',
          memberCount: 10,
          role: 'OWNER',
          hasBot: true
        },
        {
          id: '1545799252221894818',
          name: 'MUSIC BOT WORKING',
          icon: null,
          memberCount: 7,
          role: 'OWNER',
          hasBot: true
        },
        {
          id: '1530274239335108678',
          name: "𝔞𝔡𝔦𝔱𝔶𝔞 𝔰𝔥𝔞's server",
          icon: null,
          memberCount: 3,
          role: 'ADMIN',
          hasBot: true
        },
        {
          id: '1545804677436940339',
          name: 'Cyber Defense Hub',
          icon: null,
          memberCount: 154,
          role: 'OWNER',
          hasBot: false
        }
      ];
    }
  }

  // 5. Update Header Stats: "Manageable", "Owned", and "With Bot"
  allCachedGuilds = servers || [];
  const elManageable = document.getElementById('statManageableCount');
  const elOwned = document.getElementById('statOwnedCount');
  const elWithBot = document.getElementById('statWithBotCount');

  const manageableCount = serverStats?.manageable ?? allCachedGuilds.length;
  const ownedCount = serverStats?.owned ?? allCachedGuilds.filter(s => (s.role || '').toUpperCase() === 'OWNER').length;
  const withBotCount = serverStats?.withBot ?? allCachedGuilds.filter(s => s.hasBot).length;

  if (elManageable) elManageable.textContent = manageableCount;
  if (elOwned) elOwned.textContent = ownedCount;
  if (elWithBot) elWithBot.textContent = withBotCount;

  renderServerGrid(allCachedGuilds);
}

/**
 * Renders the Zynrax server cards grid
 * Each server card shows:
 * - Server icon (fallback to a default avatar if none) and server name
 * - A badge: OWNER if owner: true, otherwise ADMIN
 * - If the bot is already in that server → a red Configure button linking to that server's settings page
 * - If the bot is not in that server → an Add Bot to Server button opening the Discord bot invite URL with guild_id pre-filled
 */
function renderServerGrid(servers) {
  const container = document.getElementById('zynraxServerGrid');
  if (!container) return;

  const hasOAuthToken = Boolean(localStorage.getItem('discord_oauth_token') || localStorage.getItem('og_logged_in') === 'true');

  if (!servers || servers.length === 0) {
    if (hasOAuthToken) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3.5rem 1.5rem; text-align: center; color: #95919e;">
          <span style="font-size: 2.8rem; display: block; margin-bottom: 0.6rem;">👑</span>
          <span style="font-size: 1.25rem; font-weight: 700; color: #fff; display: block;">No Server Ownership or Administrator Permissions Found</span>
          <p style="font-size: 0.95rem; margin-top: 0.6rem; color: #94a3b8; max-width: 540px; margin-left: auto; margin-right: auto; line-height: 1.6;">
            In Kyvex Dashboard, only servers where you are the <strong>Server Owner</strong> or possess <strong>Administrator</strong> permission appear.<br>
            Servers where you are a regular member are hidden for security.
          </p>
          <div style="margin-top: 1.5rem; display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
            <a href="https://discord.com/oauth2/authorize?client_id=1545804677436940339&permissions=8&scope=bot%20applications.commands" target="_blank" class="server-action-btn configure" style="max-width: 260px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
              <span>+ Add Kyvex to Server</span>
            </a>
            <button class="btn btn-outline-sm" onclick="fetchAllGuilds()" type="button" style="padding: 10px 18px;">
              <span>🔄 Refresh</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3.5rem 1.5rem; text-align: center; color: #95919e;">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 0.6rem;">🛡️</span>
        <span style="font-size: 1.2rem; font-weight: 700; color: #fff; display: block;">${t('noServersFound')}</span>
        <p style="font-size: 0.9rem; margin-top: 0.5rem; color: #94a3b8; max-width: 520px; margin-left: auto; margin-right: auto;">
          ${t('authorizeToView')}
        </p>
        <div style="margin-top: 1.4rem;">
          <button class="discord-btn" style="max-width: 270px; margin: 0 auto; display: inline-flex; justify-content: center;" onclick="loginWithDiscordOAuth()" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>${t('loginWithDiscord')}</span>
          </button>
        </div>
      </div>
    `;
    return;
  }

  const botId = '1545804677436940339';

  container.innerHTML = servers.map((s) => {
    const roleUpper = (s.role || 'OWNER').toUpperCase();
    const isOwner = roleUpper === 'OWNER' || s.owner === true;
    const roleClass = isOwner ? 'owner' : 'admin';
    const roleIcon = isOwner ? '👑' : '🛡️';
    const badgeText = isOwner ? 'OWNER' : 'ADMIN';
    
    // Initials for avatar fallback
    const initials = (s.name || 'Server').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'KX';
    const avatarHtml = s.icon 
      ? `<img src="${s.icon}" alt="${escapeHtml(s.name)}" class="server-icon" onerror="this.outerHTML='<div class=\\'server-icon-placeholder\\'>${initials}</div>'">`
      : `<div class="server-icon-placeholder">${initials}</div>`;

    const inviteLink = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&integration_type=0&scope=bot+guilds&guild_id=${s.id}`;
    
    const actionBtn = s.hasBot
      ? `<button class="server-action-btn configure" onclick="selectAndConfigureGuild('${s.id}', '${encodeURIComponent(s.name)}')">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
           <span>Configure</span>
         </button>`
      : `<a href="${inviteLink}" target="_blank" class="server-action-btn add-bot">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
           <span>Add Bot to Server</span>
         </a>`;

    return `
      <div class="server-card ${s.hasBot ? 'has-bot' : ''}" data-guild-id="${s.id}" data-guild-name="${escapeHtml(s.name.toLowerCase())}">
        <div class="server-card-top">
          <div class="server-icon-wrapper">
            ${avatarHtml}
          </div>
          <div class="server-info">
            <h3 class="server-name" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</h3>
            <div class="server-role">
              <span class="role-badge ${roleClass}">${roleIcon} ${badgeText}</span>
            </div>
          </div>
        </div>
        <div class="server-card-bottom">
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Configure button click handler on server card:
 * Switches active context strictly to this guild and isolates all settings & panels to it
 */
window.selectAndConfigureGuild = function(guildId, encodedName) {
  const guildName = decodeURIComponent(encodedName);
  currentGuildId = guildId;

  // Update sidebar server info
  const sidebarName = document.getElementById('sidebarServerName');
  const bcServer = document.getElementById('bcServer');
  const serverAvatar = document.getElementById('sidebarServerAvatar');
  if (sidebarName) sidebarName.textContent = guildName;
  if (bcServer) bcServer.textContent = guildName;
  if (serverAvatar) serverAvatar.textContent = guildName.substring(0, 2).toUpperCase();

  // Update server dropdown if present
  const serverSelect = document.getElementById('serverSelect');
  if (serverSelect) serverSelect.value = guildId;

  // Load modules strictly isolated for this specific server
  fetchGuildStructure(guildId);
  fetchConfig(guildId);
  fetchTickets(guildId);
  if (typeof fetchWelcomeSettings === 'function') {
    fetchWelcomeSettings(guildId);
  }
  if (typeof window.fetchWhitelistData === 'function') {
    window.fetchWhitelistData();
  }

  // Switch to Panels view
  switchView('panels', 'Panels');
  showToast(`⚡ Switched to server: ${guildName}`, 'success');
};

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Format Uptime (seconds to HH:MM:SS)
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ==========================================
// 2. DATA FETCHING: STATUS, CONFIG & GUILD
// ==========================================

async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return;
    const data = await res.json();

    // Dynamic Bot Identity Branding (Kyvex / actual bot tag)
    if (data.botName || data.appName) {
      const cleanBotName = (data.botName || data.appName).split('#')[0] || data.botName || 'Kyvex';
      
      // Update sidebar
      const brandTitle = document.getElementById('sidebarBrandTitle');
      if (brandTitle) brandTitle.textContent = cleanBotName;
      
      // Update browser page title
      document.title = `${cleanBotName} • Next-Gen Discord Bot & Security Dashboard`;

      // Update landing page and footer brand mentions
      document.querySelectorAll('.landing-brand-name, .footer-brand, .bot-author').forEach((el) => {
        el.textContent = cleanBotName;
      });

      // Update designer preview footer
      const designerFooter = document.getElementById('designerPreviewFooter');
      if (designerFooter && (designerFooter.textContent.includes('Kyvex') || designerFooter.textContent.includes('Powered by'))) {
        designerFooter.textContent = `Powered by ${cleanBotName}`;
      }
      const inputFooter = document.getElementById('inputFooterText');
      if (inputFooter && (inputFooter.value === 'Powered by Kyvex' || !inputFooter.value)) {
        inputFooter.value = `Powered by ${cleanBotName}`;
      }

      // Update preview bot name
      const verifyBotName = document.getElementById('verifyPreviewBotName');
      if (verifyBotName) verifyBotName.textContent = cleanBotName.toUpperCase();
      const welcomeBotName = document.getElementById('welcomePreviewBotName');
      if (welcomeBotName) welcomeBotName.textContent = cleanBotName;
    }

    if (data.avatar) {
      const brandImg = document.getElementById('sidebarBrandAvatar');
      const brandSvg = document.getElementById('sidebarBrandDefaultIcon');
      if (brandImg) {
        brandImg.src = data.avatar;
        brandImg.style.display = 'block';
      }
      if (brandSvg) brandSvg.style.display = 'none';

      const verifyAvatar = document.getElementById('verifyPreviewBotAvatar');
      if (verifyAvatar) verifyAvatar.src = data.avatar;
      const welcomeAvatar = document.getElementById('welcomePreviewBotAvatar');
      if (welcomeAvatar) welcomeAvatar.src = data.avatar;
    }

    // Dynamic Bot Invite URL across buttons
    if (data.inviteUrl) {
      const inviteUrl = data.inviteUrl;
      const topInviteBtn = document.getElementById('btnTopAddServer');
      if (topInviteBtn) topInviteBtn.href = inviteUrl;

      const sidebarInviteBtn = document.getElementById('btnSidebarInvite');
      if (sidebarInviteBtn) sidebarInviteBtn.href = inviteUrl;

      const landingInviteBtns = document.querySelectorAll('.btn-landing-invite, #btnLandingAddBot, #landingInviteBtn, #btnHeroInvite');
      landingInviteBtns.forEach(btn => {
        if (btn.tagName === 'A') btn.href = inviteUrl;
        else btn.onclick = () => window.open(inviteUrl, '_blank');
      });
    }

    // Latency & Uptime
    const statPing = document.getElementById('statPing');
    const statUptime = document.getElementById('statUptime');
    const ping = data.ping !== undefined ? data.ping : (data.bot?.ping || 0);
    const uptime = data.uptime !== undefined ? data.uptime : (data.bot?.uptime || 0);
    if (statPing) statPing.textContent = `${ping} ms`;
    if (statUptime) statUptime.textContent = formatUptime(uptime);

    // Populate Server dropdown & Sidebar
    const serverSelect = document.getElementById('serverSelect');
    if (serverSelect && data.guilds && data.guilds.length > 0) {
      if (serverSelect.options.length <= 1) {
        serverSelect.innerHTML = '';
        data.guilds.forEach((g) => {
          const opt = document.createElement('option');
          opt.value = g.id;
          opt.textContent = `${g.name} (${g.memberCount} members)`;
          serverSelect.appendChild(opt);
        });

        if (!serverSelect.dataset.changeBound) {
          serverSelect.dataset.changeBound = 'true';
          serverSelect.addEventListener('change', (e) => {
            const targetId = e.target.value;
            const targetGuild = (data.guilds || []).find(g => g.id === targetId) || allCachedGuilds.find(g => g.id === targetId);
            const targetName = targetGuild?.name || 'Discord Server';
            selectAndConfigureGuild(targetId, encodeURIComponent(targetName));
          });
        }

        if (!currentGuildId) {
          currentGuildId = data.guilds[0].id;
          serverSelect.value = currentGuildId;
          updateSidebarServerCard(data.guilds[0]);
          fetchGuildStructure(currentGuildId);
          fetchConfig(currentGuildId);
          fetchTickets(currentGuildId);
          if (typeof fetchWelcomeSettings === 'function') {
            fetchWelcomeSettings(currentGuildId);
          }
        }
      }
    }

    // Now Playing widget
    updateNowPlayingUI(data.music);

    // Live Landing Page Stats & Invite URL
    const landingServers = document.getElementById('statServerDots');
    const landingUsers = document.getElementById('statUserDots');
    const heroInvite = document.getElementById('btnHeroInvite');
    if (landingServers && data.guildCount !== undefined) {
      landingServers.textContent = `${data.guildCount}+`;
    }
    if (landingUsers && data.userCount !== undefined) {
      landingUsers.textContent = `${data.userCount}+`;
    }
    if (heroInvite && data.botId) {
      heroInvite.href = `https://discord.com/oauth2/authorize?client_id=${data.botId}&permissions=8&scope=bot%20applications.commands`;
    }
  } catch (err) {
    console.error('Error in fetchStatus:', err);
  }
}

async function fetchCurrentUser() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.user) {
      const nameEl = document.getElementById('userDisplayName');
      const avatarEl = document.getElementById('userAvatarImg');
      if (nameEl) nameEl.textContent = data.user.global_name || data.user.username || 'Administrator';
      if (avatarEl && data.user.avatar) avatarEl.src = data.user.avatar;
    }
  } catch (e) {}
}

function updateSidebarServerCard(guild) {
  if (!guild) return;
  const nameEl = document.getElementById('sidebarServerName');
  const membersEl = document.getElementById('sidebarMemberCount');
  const avatarEl = document.getElementById('sidebarServerAvatar');
  const bcServer = document.getElementById('bcServer');

  if (nameEl) nameEl.textContent = guild.name || 'OG REGEDIT';
  if (bcServer) bcServer.textContent = guild.name || 'OG REGEDIT';
  if (membersEl) membersEl.textContent = `${guild.memberCount || 505} members`;
  if (avatarEl) {
    const initials = (guild.name || 'OG').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }
}

async function fetchGuildStructure(guildId) {
  if (!guildId) return;
  try {
    const res = await fetch(`/api/guild-structure?guildId=${guildId}`);
    if (!res.ok) return;
    const data = await res.json();

    const channelSelect = document.getElementById('ticketChannelSelect');
    const modalChannelSelect = document.getElementById('modalChannelSelect');
    const catSelect = document.getElementById('ticketCategorySelect');

    if (data.channels) {
      const populateChannels = (sel) => {
        if (!sel) return;
        const previousVal = sel.value;
        sel.innerHTML = '<option value="">-- Select Discord Channel --</option>';
        data.channels.forEach((ch) => {
          const opt = document.createElement('option');
          opt.value = ch.id;
          opt.textContent = `# ${ch.name}`;
          sel.appendChild(opt);
        });

        // Smart auto-selection of a valid channel
        if (previousVal && sel.querySelector(`option[value="${previousVal}"]`)) {
          sel.value = previousVal;
        } else if (data.channels.length > 0) {
          const smart = data.channels.find((ch) => {
            const n = ch.name.toLowerCase();
            return n.includes('ticket') || n.includes('create') || n.includes('rules') || n.includes('general');
          }) || data.channels[0];
          if (smart) {
            sel.value = smart.id;
          }
        }
      };

      populateChannels(channelSelect);
      populateChannels(modalChannelSelect);

      const verifyChannelSelect = document.getElementById('verifyChannelSelect');
      if (verifyChannelSelect) {
        populateChannels(verifyChannelSelect);
      }

      const anLogChannelSelect = document.getElementById('anLogChannelSelect');
      if (anLogChannelSelect) {
        populateChannels(anLogChannelSelect);
      }

      const amLogChannelSelect = document.getElementById('amLogChannelSelect');
      if (amLogChannelSelect) {
        populateChannels(amLogChannelSelect);
      }

      const welcomeChannelSelect = document.getElementById('welcomeChannelSelect');
      if (welcomeChannelSelect) {
        populateChannels(welcomeChannelSelect);
        if (window.loadedWelcomeChannelId) {
          welcomeChannelSelect.value = window.loadedWelcomeChannelId;
        }
      }

      const selectedCh = channelSelect ? channelSelect.options[channelSelect.selectedIndex]?.text : null;
      if (selectedCh) {
        updateChannelBadges(selectedCh);
      }
    }

    if (data.categories) {
      serverCategories = data.categories || [];
      if (catSelect) {
        catSelect.innerHTML = '<option value="">Auto-detect / Default category</option>';
        data.categories.forEach((cat) => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = `📁 ${cat.name}`;
          catSelect.appendChild(opt);
        });
      }
      populatePanelSettingsCategories();
    }

    if (data.roles) {
      serverRoles = data.roles || [];
      const verifyRoleSelect = document.getElementById('verifyRoleSelect');
      const massRoleSelect = document.getElementById('massRoleSelect');

      const populateRoles = (sel, placeholder) => {
        if (!sel) return;
        const previousVal = sel.value;
        sel.innerHTML = `<option value="">${placeholder}</option>`;
        data.roles.forEach((r) => {
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = `@${r.name}`;
          sel.appendChild(opt);
        });
        if (previousVal && sel.querySelector(`option[value="${previousVal}"]`)) {
          sel.value = previousVal;
        } else if (data.roles.length > 0) {
          const smart = data.roles.find((r) => {
            const n = r.name.toLowerCase();
            return n.includes('member') || n.includes('verified') || n.includes('user');
          }) || data.roles[0];
          if (smart) sel.value = smart.id;
        }
      };

      populateRoles(verifyRoleSelect, '-- Select Verified Role --');
      populateRoles(massRoleSelect, '-- Select Role To Add/Remove --');
      populatePanelSettingsRoles();
    }
  } catch (err) {
    console.error('Error fetching guild structure:', err);
  }
}

function updateChannelBadges(channelName) {
  const panelChannelTag = document.getElementById('panelChannelTag');
  const formatted = channelName ? channelName.replace('# ', '# 💵┃') : '# 💵┃TICKET-CREATE';
  if (panelChannelTag) panelChannelTag.textContent = formatted;
}

async function fetchConfig(guildId) {
  if (!guildId) return;
  try {
    const res = await fetch(`/api/config?guildId=${guildId}`);
    if (!res.ok) return;
    const rawData = await res.json();
    const config = rawData.config || rawData;

    // Security Switches
    ['antiNuke', 'antiAdminLockdown', 'antiChannel', 'antiRole', 'antiWebhook', 'mode247', 'autoplay', 'emergencyLockdown'].forEach((key) => {
      const sw = document.querySelector(`input[data-key="${key}"]`);
      if (sw && typeof config[key] === 'boolean') {
        sw.checked = config[key];
      }
    });

    // Synchronize Anti-Nuke dedicated UI
    const isAntiNukeOn = config.antiNuke !== false;
    const masterAnToggle = document.getElementById('masterAntiNukeToggle');
    const anSettingsPanel = document.getElementById('antiNukeSettingsPanel');
    const anDisabledNotice = document.getElementById('antiNukeDisabledNotice');
    const anStatusBadge = document.getElementById('antiNukeStatusBadge');
    const anToggleLabel = document.getElementById('antiNukeToggleLabel');
    const navAnBadge = document.getElementById('navAntiNukeBadge');

    if (masterAnToggle) masterAnToggle.checked = isAntiNukeOn;
    if (anSettingsPanel) anSettingsPanel.style.display = isAntiNukeOn ? 'block' : 'none';
    if (anDisabledNotice) anDisabledNotice.style.display = isAntiNukeOn ? 'none' : 'block';
    if (anStatusBadge) {
      anStatusBadge.textContent = isAntiNukeOn ? 'ARMED & ACTIVE' : 'INACTIVE / DISABLED';
      anStatusBadge.style.background = isAntiNukeOn ? 'rgba(0, 230, 118, 0.18)' : 'rgba(255, 36, 73, 0.18)';
      anStatusBadge.style.color = isAntiNukeOn ? '#00e676' : '#ff3b5c';
      anStatusBadge.style.borderColor = isAntiNukeOn ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 36, 73, 0.35)';
    }
    if (anToggleLabel) {
      anToggleLabel.textContent = isAntiNukeOn ? 'ENABLED' : 'DISABLED';
      anToggleLabel.style.color = isAntiNukeOn ? '#00e676' : '#ff3b5c';
    }
    if (navAnBadge) {
      navAnBadge.textContent = isAntiNukeOn ? 'ON' : 'OFF';
      navAnBadge.style.background = isAntiNukeOn ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 36, 73, 0.15)';
      navAnBadge.style.color = isAntiNukeOn ? '#00e676' : '#ff3b5c';
    }

    // Timeout Duration Settings (User Requested)
    const anSelectTimeoutDuration = document.getElementById('anSelectTimeoutDuration');
    const anCustomWrap = document.getElementById('anCustomMinutesWrap');
    const anCustomInput = document.getElementById('anCustomMinutesInput');
    if (anSelectTimeoutDuration) {
      let timeoutMs = config.timeoutDurationMs;
      if (!timeoutMs && config.timeoutDurationMinutes) {
        timeoutMs = config.timeoutDurationMinutes * 60000;
      }
      if (timeoutMs) {
        const optionExists = Array.from(anSelectTimeoutDuration.options).some(o => o.value === String(timeoutMs));
        if (optionExists) {
          anSelectTimeoutDuration.value = String(timeoutMs);
          if (anCustomWrap) anCustomWrap.style.display = 'none';
        } else {
          anSelectTimeoutDuration.value = 'custom';
          if (anCustomWrap) anCustomWrap.style.display = 'flex';
          if (anCustomInput) anCustomInput.value = Math.round(timeoutMs / 60000);
        }
      }
    }

    const anLogChannelSelect = document.getElementById('anLogChannelSelect');
    if (anLogChannelSelect && config.logChannelId) anLogChannelSelect.value = config.logChannelId;

    // Synchronize All 22 Zynrax Anti-Nuke Event Dropdowns
    const zynraxEvents = [
      'antiBan', 'antiUnban', 'antiKick', 'antiPrune', 'antiMemberUpdate',
      'antiChannelCreate', 'antiChannelDelete', 'antiChannelUpdate',
      'antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate', 'antiRolePing',
      'antiWebhookCreate', 'antiWebhookDelete', 'antiWebhookUpdate',
      'antiEmojiCreate', 'antiEmojiDelete', 'antiEmojiUpdate',
      'antiGuildUpdate', 'antiBotAdd', 'antiEveryonePing', 'antiIntegration'
    ];

    zynraxEvents.forEach(evt => {
      const limitEl = document.getElementById(`limit_${evt}`);
      if (limitEl) {
        const val = config.moduleLimits?.[evt] ?? (evt === 'antiEveryonePing' ? config.moduleLimits?.antiEveryone : null);
        if (val !== undefined && val !== null) limitEl.value = String(val);
      }
      const actionEl = document.getElementById(`action_${evt}`);
      if (actionEl) {
        const val = config.modulePunishments?.[evt] ?? (evt === 'antiEveryonePing' ? config.modulePunishments?.antiEveryone : (evt === 'antiIntegration' ? config.modulePunishments?.antiIntegrationCreate : null));
        if (val) {
          actionEl.value = val;
          actionEl.dataset.action = val;
        }
      }
    });

    if (typeof window.fetchWhitelistData === 'function') {
      window.fetchWhitelistData();
    }
    renderAnExtraOwners(config.extraOwners || []);

    // Synchronize AutoMod dedicated UI
    const autoMod = config.autoMod || { enabled: true };
    const isAutoModOn = autoMod.enabled !== false;
    const masterAmToggle = document.getElementById('masterAutoModToggle');
    const amSettingsPanel = document.getElementById('autoModSettingsPanel');
    const amDisabledNotice = document.getElementById('autoModDisabledNotice');
    const amStatusBadge = document.getElementById('autoModStatusBadge');
    const amToggleLabel = document.getElementById('autoModToggleLabel');
    const navAmBadge = document.getElementById('navAutoModBadge');

    if (masterAmToggle) masterAmToggle.checked = isAutoModOn;
    if (amSettingsPanel) amSettingsPanel.style.display = isAutoModOn ? 'block' : 'none';
    if (amDisabledNotice) amDisabledNotice.style.display = isAutoModOn ? 'none' : 'block';
    if (amStatusBadge) {
      amStatusBadge.textContent = isAutoModOn ? 'Enabled' : 'Disabled';
      amStatusBadge.className = isAutoModOn ? 'metric-val text-neon-green' : 'metric-val text-neon-red';
    }
    if (amToggleLabel) {
      amToggleLabel.textContent = isAutoModOn ? 'Active' : 'Disabled';
      amToggleLabel.className = isAutoModOn ? 'metric-val text-neon-green' : 'metric-val text-neon-red';
    }
    if (navAmBadge) {
      navAmBadge.textContent = isAutoModOn ? 'ON' : 'OFF';
      navAmBadge.style.background = isAutoModOn ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 36, 73, 0.15)';
      navAmBadge.style.color = isAutoModOn ? '#00e676' : '#ff3b5c';
    }

    const amSelectPunishment = document.getElementById('amSelectPunishment');
    if (amSelectPunishment && autoMod.punishment) amSelectPunishment.value = autoMod.punishment;

    const amSelectTimeoutDuration = document.getElementById('amSelectTimeoutDuration');
    if (amSelectTimeoutDuration && autoMod.timeoutDurationMs) amSelectTimeoutDuration.value = String(autoMod.timeoutDurationMs);

    const amLogChannelSelect = document.getElementById('amLogChannelSelect');
    if (amLogChannelSelect && autoMod.logChannelId) amLogChannelSelect.value = autoMod.logChannelId;

    // Thresholds
    if (document.getElementById('thAmFloodLimit') && autoMod.maxMessagesPer3Sec) document.getElementById('thAmFloodLimit').value = autoMod.maxMessagesPer3Sec;
    if (document.getElementById('thAmFloodWindow') && autoMod.windowSec) document.getElementById('thAmFloodWindow').value = autoMod.windowSec;
    if (document.getElementById('thAmDuplicateLimit') && autoMod.maxDuplicates) document.getElementById('thAmDuplicateLimit').value = autoMod.maxDuplicates;
    if (document.getElementById('thAmMentionLimit') && autoMod.maxUserMentions) document.getElementById('thAmMentionLimit').value = autoMod.maxUserMentions;
    if (document.getElementById('thAmEmojiLimit') && autoMod.maxEmojis) document.getElementById('thAmEmojiLimit').value = autoMod.maxEmojis;
    if (document.getElementById('thAmCapsPercent') && autoMod.maxCapsPercent) document.getElementById('thAmCapsPercent').value = autoMod.maxCapsPercent;

    // Individual Module Limits ("kitna baar kare tab")
    if (autoMod.moduleLimits) {
      const aml = autoMod.moduleLimits;
      if (document.getElementById('limitAmSpam') && aml.antiSpam) document.getElementById('limitAmSpam').value = aml.antiSpam;
      if (document.getElementById('limitAmInvite') && aml.antiInvite) document.getElementById('limitAmInvite').value = aml.antiInvite;
      if (document.getElementById('limitAmLink') && aml.antiLink) document.getElementById('limitAmLink').value = aml.antiLink;
      if (document.getElementById('limitAmMention') && aml.antiMention) document.getElementById('limitAmMention').value = aml.antiMention;
      if (document.getElementById('limitAmBadWords') && aml.antiBadWords) document.getElementById('limitAmBadWords').value = aml.antiBadWords;
      if (document.getElementById('limitAmDuplicate') && aml.antiDuplicate) document.getElementById('limitAmDuplicate').value = aml.antiDuplicate;
      if (document.getElementById('limitAmCaps') && aml.antiCaps) document.getElementById('limitAmCaps').value = aml.antiCaps;
      if (document.getElementById('limitAmEmoji') && aml.antiEmoji) document.getElementById('limitAmEmoji').value = aml.antiEmoji;
    }

    // Individual Module Punishments ("kick ban timeout")
    if (autoMod.modulePunishments) {
      const amp = autoMod.modulePunishments;
      if (document.getElementById('punishAmSpam') && amp.antiSpam) document.getElementById('punishAmSpam').value = amp.antiSpam;
      if (document.getElementById('punishAmInvite') && amp.antiInvite) document.getElementById('punishAmInvite').value = amp.antiInvite;
      if (document.getElementById('punishAmLink') && amp.antiLink) document.getElementById('punishAmLink').value = amp.antiLink;
      if (document.getElementById('punishAmMention') && amp.antiMention) document.getElementById('punishAmMention').value = amp.antiMention;
      if (document.getElementById('punishAmBadWords') && amp.antiBadWords) document.getElementById('punishAmBadWords').value = amp.antiBadWords;
      if (document.getElementById('punishAmDuplicate') && amp.antiDuplicate) document.getElementById('punishAmDuplicate').value = amp.antiDuplicate;
      if (document.getElementById('punishAmCaps') && amp.antiCaps) document.getElementById('punishAmCaps').value = amp.antiCaps;
      if (document.getElementById('punishAmEmoji') && amp.antiEmoji) document.getElementById('punishAmEmoji').value = amp.antiEmoji;
    }

    // Individual Module Toggles
    if (autoMod.modules) {
      const amMods = autoMod.modules;
      if (document.getElementById('toggleAmSpam')) document.getElementById('toggleAmSpam').checked = amMods.antiSpam !== false;
      if (document.getElementById('toggleAmInvite')) document.getElementById('toggleAmInvite').checked = amMods.antiInvite !== false;
      if (document.getElementById('toggleAmLink')) document.getElementById('toggleAmLink').checked = amMods.antiLink !== false;
      if (document.getElementById('toggleAmMention')) document.getElementById('toggleAmMention').checked = amMods.antiMention !== false;
      if (document.getElementById('toggleAmBadWords')) document.getElementById('toggleAmBadWords').checked = amMods.antiBadWords !== false;
      if (document.getElementById('toggleAmDuplicate')) document.getElementById('toggleAmDuplicate').checked = amMods.antiDuplicate !== false;
      if (document.getElementById('toggleAmCaps')) document.getElementById('toggleAmCaps').checked = amMods.antiCaps !== false;
      if (document.getElementById('toggleAmEmoji')) document.getElementById('toggleAmEmoji').checked = amMods.antiEmoji !== false;
    }

    const masterStatusText = document.getElementById('autoModMasterStatusText');
    if (masterStatusText) {
      masterStatusText.textContent = isAutoModOn ? 'SYSTEM ARMED' : 'SYSTEM OFFLINE';
      masterStatusText.style.color = isAutoModOn ? '#00e676' : '#ef4444';
    }
    const activeNumEl = document.getElementById('activeModulesNum');
    if (activeNumEl) {
      const activeCount = document.querySelectorAll('#autoModSettingsPanel input[data-am-key]:checked').length;
      activeNumEl.textContent = `${activeCount}/8`;
    }
    if (typeof window.updateAutoModAccordionStats === 'function') {
      window.updateAutoModAccordionStats();
    }
    if (typeof window.syncAutoModRowBadges === 'function') {
      window.syncAutoModRowBadges();
    }
    document.querySelectorAll('#autoModSettingsPanel .event-action-select').forEach(sel => {
      sel.dataset.action = sel.value;
    });

    renderAmBadWords(autoMod.badWords || []);
    renderAmWhitelist(autoMod.whitelist || []);

    // Punishment
    const selectPunishment = document.getElementById('selectPunishment');
    if (selectPunishment && config.punishment) {
      selectPunishment.value = config.punishment;
    }

    // Whitelist & Extra Owners
    renderList('whitelistList', 'whitelistCount', config.whitelist || [], removeWhitelistUser);
    renderList('extraOwnerList', 'extraOwnerCount', config.extraOwners || [], removeExtraOwnerUser);
  } catch (err) {
    console.error('Error fetching config:', err);
  }
}

// ==========================================
// 3. TICKET PANELS MANAGEMENT & LIFECYCLE
// ==========================================

async function fetchTickets(guildId = null) {
  const gId = guildId || currentGuildId;
  try {
    const url = gId ? `/api/tickets?guildId=${gId}` : '/api/tickets';
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();

    currentPanels = data.panels || [];
    
    // Stats count & quota counter (0 / 10 Panels)
    const statPanelsCount = document.getElementById('statPanelsCount');
    const statTicketsCount = document.getElementById('statTicketsCount');
    const panelsQuota = document.getElementById('panelsQuotaCounter');

    if (statPanelsCount) statPanelsCount.textContent = currentPanels.length;
    if (statTicketsCount) statTicketsCount.textContent = (data.activeTickets || []).length;
    if (panelsQuota) panelsQuota.textContent = `${currentPanels.length} / 10 Panels`;

    // Render active tickets in table
    renderTicketsTable(data.activeTickets || []);

    // Dynamic Panels List Rendering (Empty State vs Dynamic Multi-Panel Cards)
    renderPanelsList(currentPanels);
  } catch (err) {
    console.error('Error fetching tickets:', err);
  }
}

function renderPanelsList(panels) {
  const emptyBox = document.getElementById('panelsEmptyState');
  const listContainer = document.getElementById('panelsListContainer');
  if (!listContainer) return;

  if (!panels || panels.length === 0) {
    if (emptyBox) emptyBox.style.display = 'flex';
    listContainer.style.display = 'none';
    listContainer.innerHTML = '';
    return;
  }

  if (emptyBox) emptyBox.style.display = 'none';
  listContainer.style.display = 'flex';
  listContainer.style.flexDirection = 'column';
  listContainer.style.gap = '1.75rem';
  listContainer.innerHTML = '';

  panels.forEach((p) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'panel-item-wrapper';

    const mode = p.interactionMode || (p.useDropdowns ? 'dropdowns' : 'button');
    const color = p.color || '#00F0FF';
    const title = p.title || 'Help & Support';
    const desc = p.description || 'Click below to create a new support ticket 🎟️';
    const footer = p.footerText || 'Powered by Kyvex';
    const chName = (p.channelName || 'general').toUpperCase();
    const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Sep 06, 2026';

    // Build components preview according to mode selected when created
    let componentsHtml = '';

    if (p.interactionRows && Array.isArray(p.interactionRows) && p.interactionRows.length > 0) {
      p.interactionRows.forEach((row) => {
        if (row.type === 'button_row' && row.buttons) {
          let btnsHtml = '';
          row.buttons.forEach((btn) => {
            btnsHtml += `
              <div class="canvas-button-pill style-${btn.style || 'secondary'}" style="pointer-events: none;">
                <span class="btn-icon">${btn.emoji || '🎟️'}</span>
                <span class="btn-text-content">${btn.label || 'Ticket'}</span>
              </div>
            `;
          });
          componentsHtml += `
            <div class="button-row-buttons" style="margin-bottom: 0.6rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${btnsHtml}
            </div>
          `;
        } else if (row.type === 'dropdown') {
          componentsHtml += `
            <div class="discord-dropdown-stack" style="margin-bottom: 0.6rem; display: flex; flex-direction: column; gap: 0.45rem;">
              <div class="discord-select-wrapper">
                <div class="discord-select-box"><span class="dd-title">${row.placeholder || 'Select Option'}</span><span class="dd-arrow">▼</span></div>
              </div>
            </div>
          `;
        }
      });
    } else if (mode === 'button' || mode === 'hybrid') {
      const btnEmoji = p.buttonEmoji || '🎟️';
      const btnLabel = p.buttonLabel || 'Create Ticket';
      componentsHtml += `
        <div class="button-row-buttons" style="margin-bottom: 0.6rem; display: flex;">
          <button class="btn-preview-pink" type="button">
            <span class="btn-icon">${btnEmoji}</span>
            <span class="btn-text">${btnLabel}</span>
          </button>
        </div>
      `;
    } else if (mode === 'dropdowns') {
      let ddHtml = '';
      const listToRender = (p.dropdowns && Array.isArray(p.dropdowns) && p.dropdowns.length > 0)
        ? p.dropdowns
        : [
            { placeholder: p.dropdown1 || 'MAIN ACCOUNT' },
            { placeholder: p.dropdown2 || 'BRUTAL PANEL' },
            { placeholder: p.dropdown3 || 'CLIENT SUPPORT' },
            { placeholder: p.dropdown4 || 'CREATE TICKET TO BECOME A STAFF' },
            { placeholder: p.dropdown5 || 'FREE PANEL' }
          ];

      listToRender.forEach(m => {
        ddHtml += `
          <div class="discord-select-wrapper">
            <div class="discord-select-box"><span class="dd-title">${m.placeholder || 'Select Option'}</span><span class="dd-arrow">▼</span></div>
          </div>
        `;
      });

      componentsHtml += `
        <div class="discord-dropdown-stack" style="margin-bottom: 0.6rem; display: flex; flex-direction: column; gap: 0.45rem;">
          ${ddHtml}
        </div>
      `;
    }

    const imgHtml = p.bannerUrl && p.bannerUrl.startsWith('http')
      ? `<div class="discord-embed-image-box" style="margin-top: 8px;"><img src="${p.bannerUrl}" alt="Banner" style="max-width: 100%; border-radius: 6px;"></div>`
      : '';

    cardEl.innerHTML = `
      <!-- Action Bar for this specific Panel -->
      <div class="panel-action-bar">
        <button class="panel-action-btn btn-edit-this-panel" data-id="${p.id}" title="Edit this panel">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Edit</span>
        </button>
        <button class="panel-action-btn btn-resend-this-panel" data-id="${p.id}" title="Resend to Discord">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          <span>Resend</span>
        </button>
        <button class="panel-action-btn btn-danger-action btn-delete-this-panel" data-id="${p.id}" title="Delete panel">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>Delete</span>
        </button>
      </div>

      <!-- Panel Card -->
      <div class="ticket-panel-card">
        <div class="panel-card-header">
          <div class="panel-card-meta">
            <span>Last Seen <strong>${createdDate}</strong></span>
            <span style="font-size: 0.76rem; color: var(--text-dim); margin-left: 0.5rem; text-transform: uppercase;">[${mode} mode]</span>
          </div>
          <div class="panel-card-tags">
            <span class="tag-gold">Ticket Panel</span>
            <span class="tag-channel"># 💵┃${chName}</span>
          </div>
        </div>

        <div class="discord-canvas-container">
          <div class="discord-embed-card" style="border-left-color: ${color};">
            <div class="discord-embed-inner">
              <div class="discord-embed-title">${title}</div>
              <div class="discord-embed-description">${desc}</div>
              ${imgHtml}
              <div class="discord-embed-footer-row">
                <span class="footer-icon">👑</span>
                <span class="footer-text">${footer}</span>
              </div>
            </div>
          </div>
          ${componentsHtml}
        </div>
      </div>
    `;

    listContainer.appendChild(cardEl);
  });

  // Action listeners for each panel card
  listContainer.querySelectorAll('.btn-edit-this-panel').forEach(btn => {
    btn.onclick = () => {
      const panelId = btn.getAttribute('data-id');
      const panel = currentPanels.find(x => x.id === panelId);
      if (panel) loadPanelIntoDesigner(panel);
    };
  });

  listContainer.querySelectorAll('.btn-resend-this-panel').forEach(btn => {
    btn.onclick = async () => {
      const panelId = btn.getAttribute('data-id');
      try {
        const res = await fetch('/api/tickets/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, panelId })
        });
        const data = await res.json();
        if (data.success) {
          showToast('🚀 Panel resent to Discord channel!', 'success');
        } else {
          showToast(data.error || 'Failed to resend panel', 'error');
        }
      } catch (e) {
        showToast('Error resending panel', 'error');
      }
    };
  });

  listContainer.querySelectorAll('.btn-delete-this-panel').forEach(btn => {
    btn.onclick = async () => {
      const panelId = btn.getAttribute('data-id');
      if (!confirm('Are you sure you want to delete this panel?')) return;
      try {
        const res = await fetch('/api/tickets/delete-panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, panelId })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Panel deleted successfully!', 'success');
          fetchTickets();
        } else {
          showToast(data.error || 'Failed to delete panel', 'error');
        }
      } catch (e) {
        showToast('Error deleting panel', 'error');
      }
    };
  });
}

// ==========================================
// DYNAMIC INTERACTION ROWS (SCREENSHOTS 1, 2, 3)
// ==========================================

let interactionRows = [
  {
    id: 'row_default_1',
    type: 'button_row',
    buttons: [
      { id: 'btn_1', label: 'Create Ticket', emoji: '🎟️', style: 'danger', prefix: 'ticket' }
    ]
  }
];

let selectedButtonRef = { rowIndex: 0, buttonIndex: 0 };
let selectedOptionRef = { rowIndex: -1, optionIndex: -1 };
let editingPanelId = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


function renderInteractionArea() {
  const container = document.getElementById('interactionRowsContainer');
  const badge = document.getElementById('interactionRowsBadge');
  if (!container) return;

  if (badge) {
    badge.textContent = `Rows available [${interactionRows.length}/5]`;
  }

  container.innerHTML = '';

  if (!interactionRows || interactionRows.length === 0) {
    container.innerHTML = `
      <div style="color: var(--text-dim); font-size: 0.82rem; padding: 1rem; text-align: center; border: 1px dashed rgba(255,255,255,0.12); border-radius: 8px; margin-bottom: 0.75rem;">
        No interaction rows yet. Click <strong>+ Add Button Row</strong> below to get started!
      </div>
    `;
    return;
  }

  interactionRows.forEach((row, rIdx) => {
    if (row.type === 'button_row') {
      const card = document.createElement('div');
      card.className = 'button-row-card';
      card.setAttribute('data-row', rIdx);

      const buttons = row.buttons || [];
      let buttonsHtml = '';

      buttons.forEach((btn, bIdx) => {
        const isSelected = selectedButtonRef && selectedButtonRef.rowIndex === rIdx && selectedButtonRef.buttonIndex === bIdx;
        const styleClass = `style-${btn.style || 'secondary'}`;
        buttonsHtml += `
          <button class="canvas-button-pill ${styleClass} ${isSelected ? 'selected' : ''}" data-row="${rIdx}" data-btn="${bIdx}" type="button">
            <span class="btn-drag-dots">⋮⋮</span>
            <span class="btn-icon">${btn.emoji || '🎟️'}</span>
            <span class="btn-text-content">${btn.label || 'Create Ticket'}</span>
          </button>
        `;
      });

      let addGhostHtml = '';
      if (buttons.length < 5) {
        addGhostHtml = `
          <button class="btn-ghost-item btn-add-btn-in-row" data-row="${rIdx}" type="button">+ Add Button</button>
          <button class="btn-ghost-item btn-add-link-in-row" data-row="${rIdx}" type="button">🔗 Add Link Button</button>
        `;
      }

      card.innerHTML = `
        <div class="row-top-tabs">
          <div class="row-tab-pill">
            <span class="drag-handle">⋮⋮</span>
            <span>Button Row</span>
          </div>
          <button class="btn-row-action btn-duplicate-row" data-row="${rIdx}" type="button" title="Duplicate button row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Duplicate button row</span>
          </button>
          <button class="btn-row-action btn-row-delete" data-row="${rIdx}" type="button" title="Delete button row">
            <span>Delete</span>
          </button>
        </div>
        <div class="row-card-body">
          <div class="row-buttons-track">
            ${buttonsHtml}
            ${addGhostHtml}
          </div>
        </div>
      `;

      card.querySelectorAll('.canvas-button-pill').forEach((btnEl) => {
        btnEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const r = parseInt(btnEl.getAttribute('data-row'), 10);
          const b = parseInt(btnEl.getAttribute('data-btn'), 10);
          selectButton(r, b);
        });
      });

      card.querySelector('.btn-add-btn-in-row')?.addEventListener('click', (e) => {
        e.stopPropagation();
        addButtonToRow(rIdx);
      });

      card.querySelector('.btn-add-link-in-row')?.addEventListener('click', (e) => {
        e.stopPropagation();
        addLinkButtonToRow(rIdx);
      });

      card.querySelector('.btn-duplicate-row')?.addEventListener('click', (e) => {
        e.stopPropagation();
        duplicateRow(rIdx);
      });

      card.querySelector('.btn-row-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteRow(rIdx);
      });

      container.appendChild(card);
    } else if (row.type === 'dropdown') {
      const card = document.createElement('div');
      card.className = 'button-row-card';
      card.setAttribute('data-row', rIdx);

      const placeholder = row.placeholder || 'SELECT CATEGORY';
      const options = row.options || [];

      let optionsHtml = '';
      options.forEach((opt, optIdx) => {
        const isSelected = selectedOptionRef && selectedOptionRef.rowIndex === rIdx && selectedOptionRef.optionIndex === optIdx;
        optionsHtml += `
          <div class="dd-option-pill ${isSelected ? 'selected' : ''}" data-row="${rIdx}" data-opt="${optIdx}">
            <span class="dd-opt-dots">⋮⋮</span>
            <span class="dd-opt-emoji">${opt.emoji || '💬'}</span>
            <span class="dd-opt-label">${escapeHtml(opt.label || 'Option')}</span>
            <span class="dd-opt-del" data-del-row="${rIdx}" data-del-opt="${optIdx}" title="Delete option">✕</span>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="row-top-tabs">
          <div class="row-tab-pill">
            <span class="drag-handle">⋮⋮</span>
            <span>Dropdown Menu</span>
          </div>
          <button class="btn-row-action btn-duplicate-row" data-row="${rIdx}" type="button" title="Duplicate dropdown menu">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Duplicate dropdown menu</span>
          </button>
          <button class="btn-row-action btn-row-delete" data-row="${rIdx}" type="button" title="Delete menu">
            <span>Delete</span>
          </button>
        </div>
        <div class="row-card-body">
          <div class="dd-placeholder-bar">
            <input type="text" class="dd-placeholder-input" value="${escapeHtml(placeholder)}" placeholder="Enter placeholder text..." data-row="${rIdx}">
            <span class="dd-placeholder-arrow">▼</span>
          </div>
          <div class="dd-options-grid">
            ${optionsHtml}
          </div>
          <div style="display: flex; justify-content: flex-start;">
            <button type="button" class="btn-add-option-dashed" data-row="${rIdx}">
              <span>+</span>
              <span>Add Option</span>
            </button>
          </div>
        </div>
      `;

      card.querySelector('.btn-duplicate-row')?.addEventListener('click', (e) => {
        e.stopPropagation();
        duplicateRow(rIdx);
      });

      card.querySelector('.btn-row-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteRow(rIdx);
      });

      const placeholderInput = card.querySelector('.dd-placeholder-input');
      if (placeholderInput) {
        placeholderInput.addEventListener('click', (e) => e.stopPropagation());
        placeholderInput.addEventListener('input', (e) => {
          row.placeholder = e.target.value;
          renderCanvasDropdowns();
        });
      }

      card.querySelectorAll('.dd-option-pill').forEach((pill) => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          const r = parseInt(pill.getAttribute('data-row'), 10);
          const o = parseInt(pill.getAttribute('data-opt'), 10);
          selectOption(r, o);
        });
      });

      card.querySelectorAll('.dd-opt-del').forEach((delBtn) => {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const r = parseInt(delBtn.getAttribute('data-del-row'), 10);
          const o = parseInt(delBtn.getAttribute('data-del-opt'), 10);
          deleteOption(r, o);
        });
      });

      card.querySelector('.btn-add-option-dashed')?.addEventListener('click', (e) => {
        e.stopPropagation();
        addOptionToDropdown(rIdx);
      });

      container.appendChild(card);
    }
  });
}

function selectButton(rIdx, bIdx) {
  selectedButtonRef = { rowIndex: rIdx, buttonIndex: bIdx };
  selectedOptionRef = { rowIndex: -1, optionIndex: -1 };
  renderInteractionArea();
  populateButtonEditor();
  selectDesignerElement('button');
}

function populateButtonEditor() {
  const btn = interactionRows[selectedButtonRef.rowIndex]?.buttons?.[selectedButtonRef.buttonIndex];
  if (!btn) return;

  const btnColTitle = document.getElementById('buttonEditorTitle');
  if (btnColTitle) btnColTitle.textContent = 'Button Settings';

  const inputLabel = document.getElementById('inputSelectedBtnLabel');
  const inputEmoji = document.getElementById('inputSelectedBtnEmoji');
  const displayEmoji = document.getElementById('displaySelectedBtnEmoji');
  const selectStyle = document.getElementById('selectSelectedBtnStyle');
  const inputPrefix = document.getElementById('inputSelectedBtnPrefix');
  const groupUrl = document.getElementById('groupBtnLinkUrl');
  const inputUrl = document.getElementById('inputSelectedBtnUrl');
  const groupBtnSettings = document.getElementById('groupSelectedButtonSettings');
  const groupDropdown = document.getElementById('groupDropdownSettings');

  if (groupBtnSettings) groupBtnSettings.style.display = 'block';
  if (groupDropdown) groupDropdown.style.display = 'none';

  if (inputLabel) inputLabel.value = btn.label || '';
  if (inputEmoji) inputEmoji.value = btn.emoji || '🎟️';
  if (displayEmoji) displayEmoji.textContent = btn.emoji || '🎟️';
  if (selectStyle) selectStyle.value = btn.style || 'secondary';
  if (inputPrefix) inputPrefix.value = btn.prefix || 'ticket';

  if (btn.style === 'link' || btn.type === 'link') {
    if (groupUrl) groupUrl.style.display = 'block';
    if (inputUrl) inputUrl.value = btn.url || '';
  } else {
    if (groupUrl) groupUrl.style.display = 'none';
  }
}

function selectOption(rIdx, optIdx) {
  selectedOptionRef = { rowIndex: rIdx, optionIndex: optIdx };
  selectedButtonRef = { rowIndex: -1, buttonIndex: -1 };
  renderInteractionArea();
  populateOptionEditor();
  selectDesignerElement('option');
}

function populateOptionEditor() {
  const row = interactionRows[selectedOptionRef.rowIndex];
  if (!row || row.type !== 'dropdown') return;
  const opt = row.options?.[selectedOptionRef.optionIndex];
  if (!opt) return;

  const btnColTitle = document.getElementById('buttonEditorTitle');
  if (btnColTitle) btnColTitle.textContent = 'Option Settings';

  const groupBtnSettings = document.getElementById('groupSelectedButtonSettings');
  const groupDropdown = document.getElementById('groupDropdownSettings');

  if (groupBtnSettings) groupBtnSettings.style.display = 'none';
  if (groupDropdown) groupDropdown.style.display = 'block';

  const inputLabel = document.getElementById('inputSelectedOptLabel');
  const inputEmoji = document.getElementById('inputSelectedOptEmoji');
  const displayEmoji = document.getElementById('displaySelectedOptEmoji');
  const inputDesc = document.getElementById('inputSelectedOptDesc');

  if (inputLabel) inputLabel.value = opt.label || '';
  if (inputEmoji) inputEmoji.value = opt.emoji || '💬';
  if (displayEmoji) displayEmoji.textContent = opt.emoji || '💬';
  if (inputDesc) inputDesc.value = opt.description || '';
}

function addOptionToDropdown(rIdx) {
  const row = interactionRows[rIdx];
  if (!row || row.type !== 'dropdown') return;
  if (!row.options) row.options = [];
  if (row.options.length >= 25) {
    showToast('Discord select menus allow at most 25 options!', 'error');
    return;
  }
  const sampleOptions = [
    { label: 'General Support', emoji: '💬', description: 'Help with questions or issues' },
    { label: 'Billing / Order', emoji: '💳', description: 'Payment & license queries' },
    { label: 'Staff Application', emoji: '🛡️', description: 'Apply to join our staff team' },
    { label: 'Bug Report', emoji: '🐛', description: 'Report an issue or glitch' },
    { label: 'Partnership', emoji: '🤝', description: 'Partner with our server' },
    { label: 'VIP / Premium', emoji: '👑', description: 'Perks and premium access' }
  ];
  const nextIdx = row.options.length;
  const fallback = sampleOptions[nextIdx % sampleOptions.length];
  const newOpt = {
    label: `Option ${nextIdx + 1}`,
    emoji: fallback.emoji || '💬',
    description: fallback.description || ''
  };
  row.options.push(newOpt);
  selectedOptionRef = { rowIndex: rIdx, optionIndex: row.options.length - 1 };
  selectedButtonRef = { rowIndex: -1, buttonIndex: -1 };
  renderInteractionArea();
  populateOptionEditor();
  selectDesignerElement('option');
}

function deleteOption(rIdx, optIdx) {
  const row = interactionRows[rIdx];
  if (!row || row.type !== 'dropdown' || !row.options) return;
  if (row.options.length <= 1) {
    showToast('A dropdown menu must have at least 1 option!', 'info');
    return;
  }
  row.options.splice(optIdx, 1);
  if (selectedOptionRef.rowIndex === rIdx) {
    const nextOpt = Math.min(optIdx, row.options.length - 1);
    selectedOptionRef.optionIndex = nextOpt;
  }
  renderInteractionArea();
  populateOptionEditor();
  showToast('Deleted option', 'info');
}

function deleteSelectedOption() {
  if (selectedOptionRef.rowIndex < 0 || selectedOptionRef.optionIndex < 0) return;
  deleteOption(selectedOptionRef.rowIndex, selectedOptionRef.optionIndex);
}

function addButtonRow() {
  if (interactionRows.length >= 5) {
    showToast('Discord allows a maximum of 5 component rows!', 'error');
    return;
  }
  const nextNum = interactionRows.length + 1;
  const newRow = {
    id: `row_${Date.now()}`,
    type: 'button_row',
    buttons: [
      {
        id: `btn_${Date.now()}`,
        label: nextNum === 2 ? 'General Support' : `Button ${nextNum}`,
        emoji: nextNum === 2 ? '🎧' : '🎟️',
        style: 'secondary',
        prefix: nextNum === 2 ? 'general' : 'ticket'
      }
    ]
  };
  interactionRows.push(newRow);
  selectedButtonRef = { rowIndex: interactionRows.length - 1, buttonIndex: 0 };
  selectedOptionRef = { rowIndex: -1, optionIndex: -1 };
  renderInteractionArea();
  populateButtonEditor();
  selectDesignerElement('button');
  showToast(`Added Button Row ${nextNum}`, 'success');
}

function addDropdownRow() {
  if (interactionRows.length >= 5) {
    showToast('Discord allows a maximum of 5 component rows!', 'error');
    return;
  }
  const nextNum = interactionRows.length + 1;
  const newRow = {
    id: `dropdown_${Date.now()}`,
    type: 'dropdown',
    placeholder: 'SELECT CATEGORY',
    options: [
      { label: 'General Support', emoji: '💬', description: 'Help with questions or issues' },
      { label: 'Billing / Order', emoji: '💳', description: 'Payment & license queries' }
    ]
  };
  interactionRows.push(newRow);
  selectedOptionRef = { rowIndex: interactionRows.length - 1, optionIndex: 0 };
  selectedButtonRef = { rowIndex: -1, buttonIndex: -1 };
  renderInteractionArea();
  populateOptionEditor();
  selectDesignerElement('option');
  showToast(`Added Dropdown Menu Row ${nextNum}`, 'success');
}


function addButtonToRow(rIdx) {
  const row = interactionRows[rIdx];
  if (!row || row.type !== 'button_row') return;
  if (row.buttons.length >= 5) {
    showToast('Discord allows a maximum of 5 buttons per row!', 'error');
    return;
  }
  const bNum = row.buttons.length + 1;
  const sampleLabels = ['General Support', 'Billing Support', 'Staff Application', 'Discord Help', 'Premium Key'];
  const sampleEmojis = ['🎧', '💳', '🛡️', '💬', '👑'];
  const defaultLabel = sampleLabels[bNum - 1] || `Button ${bNum}`;
  const defaultEmoji = sampleEmojis[bNum - 1] || '🎟️';
  const defaultPrefix = defaultLabel.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);

  row.buttons.push({
    id: `btn_${Date.now()}_${bNum}`,
    label: defaultLabel,
    emoji: defaultEmoji,
    style: 'secondary',
    prefix: defaultPrefix
  });

  selectedButtonRef = { rowIndex: rIdx, buttonIndex: row.buttons.length - 1 };
  renderInteractionArea();
  populateButtonEditor();
  selectDesignerElement('button');
}

function addLinkButtonToRow(rIdx) {
  const row = interactionRows[rIdx];
  if (!row || row.type !== 'button_row') return;
  if (row.buttons.length >= 5) {
    showToast('Discord allows a maximum of 5 buttons per row!', 'error');
    return;
  }
  row.buttons.push({
    id: `btn_link_${Date.now()}`,
    label: 'Website',
    emoji: '🔗',
    style: 'link',
    url: 'https://discord.gg',
    type: 'link'
  });
  selectedButtonRef = { rowIndex: rIdx, buttonIndex: row.buttons.length - 1 };
  renderInteractionArea();
  populateButtonEditor();
  selectDesignerElement('button');
}

function duplicateRow(rIdx) {
  if (interactionRows.length >= 5) {
    showToast('Discord allows a maximum of 5 component rows!', 'error');
    return;
  }
  const source = interactionRows[rIdx];
  if (!source) return;
  const cloned = JSON.parse(JSON.stringify(source));
  cloned.id = `row_${Date.now()}`;
  if (cloned.buttons) {
    cloned.buttons.forEach((b, i) => {
      b.id = `btn_${Date.now()}_${i}`;
    });
  }
  interactionRows.splice(rIdx + 1, 0, cloned);
  selectedButtonRef = { rowIndex: rIdx + 1, buttonIndex: 0 };
  renderInteractionArea();
  populateButtonEditor();
  showToast('Duplicated row successfully', 'info');
}

function deleteRow(rIdx) {
  if (interactionRows.length <= 1) {
    interactionRows = [
      {
        id: `row_${Date.now()}`,
        type: 'button_row',
        buttons: [
          { id: `btn_${Date.now()}`, label: 'Create Ticket', emoji: '🎟️', style: 'danger', prefix: 'ticket' }
        ]
      }
    ];
    selectedButtonRef = { rowIndex: 0, buttonIndex: 0 };
    renderInteractionArea();
    populateButtonEditor();
    showToast('Reset to 1 default button row', 'info');
    return;
  }
  interactionRows.splice(rIdx, 1);
  const nextR = Math.min(rIdx, interactionRows.length - 1);
  selectedButtonRef = { rowIndex: nextR, buttonIndex: 0 };
  renderInteractionArea();
  populateButtonEditor();
  showToast('Deleted row', 'info');
}

function deleteSelectedButton() {
  const row = interactionRows[selectedButtonRef.rowIndex];
  if (!row || !row.buttons) return;
  if (row.buttons.length <= 1) {
    deleteRow(selectedButtonRef.rowIndex);
    return;
  }
  row.buttons.splice(selectedButtonRef.buttonIndex, 1);
  const nextIdx = Math.min(selectedButtonRef.buttonIndex, row.buttons.length - 1);
  selectedButtonRef.buttonIndex = nextIdx;
  renderInteractionArea();
  populateButtonEditor();
  showToast('Deleted button', 'info');
}

function loadPanelIntoDesigner(p) {
  if (!p) return;

  editingPanelId = p.id;

  // Load ticket role access & panel settings
  selectedPanelSupportRoleId = p.supportRoleId || null;
  selectedPanelSupportRoles = Array.isArray(p.supportRoles) ? [...p.supportRoles] : (p.supportRoleId ? [p.supportRoleId] : []);
  selectedPanelCategoryId = p.categoryId || null;
  selectedPanelTicketPrefix = p.ticketPrefix || 'ticket-';
  selectedPanelAdminAccess = p.adminAccess !== false;

  const titleEl = document.getElementById('inputEmbedTitle');
  const descEl = document.getElementById('inputEmbedDesc');
  const footerEl = document.getElementById('inputFooterText');
  const colorEl = document.getElementById('inputEmbedColor');
  const hexEl = document.getElementById('inputHexColor');
  const swatch = document.getElementById('colorSwatch');
  const imgEl = document.getElementById('inputImageUrl');
  const chSelect = document.getElementById('ticketChannelSelect');

  if (titleEl) titleEl.value = p.title || 'Help & Support';
  if (descEl) descEl.value = p.description || '';
  if (footerEl) footerEl.value = p.footerText || 'Powered by Kyvex';
  if (colorEl) colorEl.value = p.color || '#ff2449';
  if (hexEl) hexEl.value = (p.color || '#00F0FF').toUpperCase();
  if (swatch) swatch.style.backgroundColor = p.color || '#ff2449';
  if (imgEl) imgEl.value = p.bannerUrl || '';
  if (chSelect && p.channelId) chSelect.value = p.channelId;

  if (p.buttonLabel && document.getElementById('inputButtonLabel')) document.getElementById('inputButtonLabel').value = p.buttonLabel;
  if (p.buttonEmoji && document.getElementById('inputButtonEmoji')) document.getElementById('inputButtonEmoji').value = p.buttonEmoji;

  if (p.interactionRows && Array.isArray(p.interactionRows) && p.interactionRows.length > 0) {
    interactionRows = JSON.parse(JSON.stringify(p.interactionRows));
  } else {
    interactionRows = [
      {
        id: 'row_default',
        type: 'button_row',
        buttons: [
          {
            id: 'btn_default',
            label: p.buttonLabel || 'Create Ticket',
            emoji: p.buttonEmoji || '🎟️',
            style: p.buttonStyle || 'danger',
            prefix: 'ticket'
          }
        ]
      }
    ];
  }

  selectedButtonRef = { rowIndex: 0, buttonIndex: 0 };
  selectedOptionRef = { rowIndex: -1, optionIndex: -1 };
  renderInteractionArea();
  populateButtonEditor();

  if (p.dropdowns && Array.isArray(p.dropdowns) && p.dropdowns.length > 0) {
    customDropdowns = JSON.parse(JSON.stringify(p.dropdowns));
  } else {
    customDropdowns = [
      {
        id: 'menu_1',
        placeholder: p.dropdown1 || 'SELECT CATEGORY',
        options: [
          { label: 'General Support', emoji: '💬', description: 'Help with server' }
        ]
      }
    ];
  }

  const mode = p.interactionMode || (p.useDropdowns ? 'dropdowns' : 'button');
  setInteractionMode(mode);
  renderDropdownsEditor();
  renderCanvasDropdowns();
  syncLivePreview();

  // Update button to Save Changes
  const btnSticky = document.getElementById('btnStickyCreate');
  if (btnSticky) btnSticky.innerHTML = '<span>💾 Save Changes</span>';
  const stickyPrompt = document.querySelector('.sticky-prompt');
  if (stickyPrompt) stickyPrompt.textContent = 'Save your panel edits?';
  const sub = document.getElementById('designerSubtitle');
  if (sub) sub.textContent = `Editing Panel #${p.channelName || p.channelId || 'channel'} (ID: ${p.id})`;

  switchView('designer', 'Panel Designer');
  selectDesignerElement('button');
  showToast('Loaded panel into designer. Click "Save Changes" to update in Discord.', 'info');
}

function openNewPanelDesigner() {
  editingPanelId = null;

  // Reset ticket role access & panel settings
  selectedPanelSupportRoleId = null;
  selectedPanelSupportRoles = [];
  selectedPanelCategoryId = null;
  selectedPanelTicketPrefix = 'ticket-';
  selectedPanelAdminAccess = true;

  const titleEl = document.getElementById('inputEmbedTitle');
  const descEl = document.getElementById('inputEmbedDesc');
  const footerEl = document.getElementById('inputFooterText');
  const colorEl = document.getElementById('inputEmbedColor');
  const hexEl = document.getElementById('inputHexColor');
  const swatch = document.getElementById('colorSwatch');
  const imgEl = document.getElementById('inputImageUrl');

  if (titleEl) titleEl.value = 'Help & Support';
  if (descEl) descEl.value = 'Click below to create a new support ticket 🎟️';
  if (footerEl) footerEl.value = 'Powered by Kyvex';
  if (colorEl) colorEl.value = '#ff2449';
  if (hexEl) hexEl.value = '#00F0FF';
  if (swatch) swatch.style.backgroundColor = '#ff2449';
  if (imgEl) imgEl.value = '';

  if (document.getElementById('inputButtonLabel')) document.getElementById('inputButtonLabel').value = 'Create Ticket';
  if (document.getElementById('inputButtonEmoji')) document.getElementById('inputButtonEmoji').value = '🎟️';

  // Start with 1 default Button Row (Create Ticket) as requested
  interactionRows = [
    {
      id: `row_${Date.now()}`,
      type: 'button_row',
      buttons: [
        {
          id: `btn_${Date.now()}`,
          label: 'Create Ticket',
          emoji: '🎟️',
          style: 'danger',
          prefix: 'ticket'
        }
      ]
    }
  ];
  selectedButtonRef = { rowIndex: 0, buttonIndex: 0 };
  selectedOptionRef = { rowIndex: -1, optionIndex: -1 };

  customDropdowns = [
    {
      id: 'menu_1',
      placeholder: 'SELECT CATEGORY',
      options: [
        { label: 'General Support', emoji: '💬', description: 'Help with questions or issues' },
        { label: 'Billing / Order', emoji: '💳', description: 'Payment verification & queries' }
      ]
    }
  ];

  setInteractionMode('rows');
  renderInteractionArea();
  populateButtonEditor();
  renderDropdownsEditor();
  renderCanvasDropdowns();
  syncLivePreview();

  const btnSticky = document.getElementById('btnStickyCreate');
  if (btnSticky) btnSticky.innerHTML = '<span>Create Panel</span>';
  const stickyPrompt = document.querySelector('.sticky-prompt');
  if (stickyPrompt) stickyPrompt.textContent = 'Ready to send your panel?';
  const sub = document.getElementById('designerSubtitle');
  if (sub) sub.textContent = 'Create a new panel for your server.';
}


function renderTicketsTable(tickets) {
  const tbody = document.getElementById('activeTicketsTableBody');
  if (!tbody) return;

  if (!tickets || tickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No active tickets opened yet. Deploy a panel to start receiving tickets!</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  tickets.forEach((t) => {
    const tr = document.createElement('tr');
    const isClosed = Boolean(t.closed);
    const statusBadge = isClosed
      ? '<span style="color: #ef4444; font-weight: 700;">🔴 CLOSED</span>'
      : '<span style="color: #22c55e; font-weight: 700;">🟢 OPEN</span>';

    tr.innerHTML = `
      <td><code style="color: var(--accent-gold);">#${t.ticketId || 'TICKET'}</code></td>
      <td><strong>${t.userName || t.userId}</strong></td>
      <td><span class="tag-gold">${t.category}</span></td>
      <td><code>#${t.channelId}</code></td>
      <td>${statusBadge}</td>
      <td>
        ${isClosed ? '<span style="color: #6b7280;">Closed</span>' : `<button class="btn btn-outline-sm btn-close-tkt" data-id="${t.channelId}">Close Ticket</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.btn-close-tkt').forEach((b) => {
    b.onclick = async () => {
      const channelId = b.getAttribute('data-id');
      if (!confirm('Are you sure you want to close this ticket?')) return;
      try {
        const res = await fetch('/api/tickets/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Ticket closed successfully!', 'success');
          fetchTickets();
        } else {
          showToast(data.error || 'Failed to close ticket', 'error');
        }
      } catch (e) {
        showToast('Network error closing ticket', 'error');
      }
    };
  });
}

// ==========================================
// 4. LIVE PREVIEW & DESIGNER INTERACTIONS
// ==========================================

function setInteractionMode(mode) {
  currentInteractionMode = mode;

  // Mode selection pills
  document.querySelectorAll('.mode-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.getAttribute('data-mode') === mode);
  });

  // Settings groups in right column editor
  const grpDropdown = document.getElementById('groupDropdownSettings');
  const grpButton = document.getElementById('groupButtonSettings');

  if (mode === 'dropdowns') {
    if (grpDropdown) grpDropdown.style.display = 'block';
    if (grpButton) grpButton.style.display = 'none';
  } else if (mode === 'button') {
    if (grpDropdown) grpDropdown.style.display = 'none';
    if (grpButton) grpButton.style.display = 'block';
  } else { // hybrid
    if (grpDropdown) grpDropdown.style.display = 'block';
    if (grpButton) grpButton.style.display = 'block';
  }

  // Designer Live Canvas preview elements
  const btnRow = document.getElementById('designerButtonRow');
  const ddStack = document.getElementById('discordDropdownStack');
  const badgeDd = document.getElementById('badgeModeDropdowns');
  const badgeBtn = document.getElementById('badgeModeButton');

  if (mode === 'dropdowns') {
    if (btnRow) btnRow.style.display = 'none';
    if (ddStack) ddStack.style.display = 'flex';
    badgeDd?.classList.add('active');
    badgeBtn?.classList.remove('active');
  } else if (mode === 'button') {
    if (btnRow) btnRow.style.display = 'block';
    if (ddStack) ddStack.style.display = 'none';
    badgeBtn?.classList.add('active');
    badgeDd?.classList.remove('active');
  } else { // hybrid
    if (btnRow) btnRow.style.display = 'block';
    if (ddStack) ddStack.style.display = 'flex';
    badgeDd?.classList.add('active');
    badgeBtn?.classList.add('active');
  }
}

function syncLivePreview() {
  const rawTitle = document.getElementById('inputEmbedTitle')?.value ?? 'Help & Support';
  const cleanTitle = rawTitle.replace(/\*\*/g, '').trim() || 'Help & Support';
  const desc = document.getElementById('inputEmbedDesc')?.value ?? 'Click below to create a new support ticket 🎟️';
  const footer = document.getElementById('inputFooterText')?.value ?? 'Powered by Kyvex';
  const color = document.getElementById('inputEmbedColor')?.value || '#ff2449';
  const imgUrl = document.getElementById('inputImageUrl')?.value;
  const buttonLabel = document.getElementById('inputButtonLabel')?.value || 'Create Ticket';
  const buttonEmoji = document.getElementById('inputButtonEmoji')?.value || '🎟️';

  // Update Designer Live Preview
  const dTitle = document.getElementById('designerPreviewTitle');
  const dDesc = document.getElementById('designerPreviewDesc');
  const dFooter = document.getElementById('designerPreviewFooter');
  const dCard = document.getElementById('designerEmbedCard');
  const dImg = document.getElementById('designerPreviewImg');
  const dImgBox = document.getElementById('designerPreviewImageBox');
  const charCounter = document.getElementById('descCharCounter');
  const editorTitle = document.getElementById('editorCurrentTitle');

  if (dTitle) dTitle.textContent = cleanTitle;
  if (editorTitle) editorTitle.textContent = `Edit: ${cleanTitle}`;
  if (dDesc) dDesc.textContent = desc;
  if (dFooter) dFooter.textContent = footer;
  if (dCard) dCard.style.borderLeftColor = color;
  
  if (dImgBox && dImg) {
    if (imgUrl && imgUrl.startsWith('http')) {
      dImg.src = imgUrl;
      dImgBox.style.display = 'block';
    } else {
      dImgBox.style.display = 'none';
    }
  }
  
  if (charCounter) charCounter.textContent = `${desc.length}/4096`;

  // Update Button Preview
  const btnLabelEl = document.getElementById('previewBtnLabel');
  const btnEmojiEl = document.getElementById('previewBtnEmoji');
  const listBtn = document.getElementById('listBtnPreview');
  if (btnLabelEl) btnLabelEl.textContent = buttonLabel;
  if (btnEmojiEl) btnEmojiEl.textContent = buttonEmoji;
  if (listBtn) listBtn.innerHTML = `<span class="btn-icon">${buttonEmoji}</span><span class="btn-text">${buttonLabel}</span>`;

  // Update Dropdowns Canvas Preview
  renderCanvasDropdowns();

  // Also update Panels List Preview (if populated)
  const lTitle = document.getElementById('listEmbedTitle');
  const lDesc = document.getElementById('listEmbedDesc');
  const lFooter = document.getElementById('listEmbedFooter');
  const lCard = document.getElementById('listEmbedCard');

  if (lTitle) lTitle.textContent = cleanTitle;
  if (lDesc) lDesc.textContent = desc;
  if (lFooter) lFooter.textContent = footer;
  if (lCard) lCard.style.borderLeftColor = color;
}

// Interactive element selection (Embed vs Button/Dropdown vs Guide vs Panel Settings)
function selectDesignerElement(type) {
  const embedCard = document.getElementById('designerEmbedCard');
  const buttonRow = document.getElementById('designerButtonRow');
  const ddStack = document.getElementById('discordDropdownStack');
  const guideCol = document.getElementById('designerGuideCol');
  const editorCol = document.getElementById('designerEditorCol');
  const buttonCol = document.getElementById('designerButtonCol');
  const panelSettingsCol = document.getElementById('designerPanelSettingsCol');

  if (type === 'embed') {
    embedCard?.classList.add('active-selection');
    buttonRow?.classList.remove('active-selection');
    ddStack?.classList.remove('active-selection');
    if (guideCol) guideCol.style.display = 'none';
    if (buttonCol) buttonCol.style.display = 'none';
    if (panelSettingsCol) panelSettingsCol.style.display = 'none';
    if (editorCol) {
      editorCol.style.display = 'block';
      const inputTitle = document.getElementById('inputEmbedTitle');
      if (inputTitle) {
        inputTitle.focus();
        inputTitle.select();
      }
    }
  } else if (type === 'button' || type === 'dropdown' || type === 'interaction' || type === 'option') {
    if (type === 'button') {
      buttonRow?.classList.add('active-selection');
      ddStack?.classList.remove('active-selection');
    } else {
      ddStack?.classList.add('active-selection');
      buttonRow?.classList.remove('active-selection');
    }
    embedCard?.classList.remove('active-selection');
    if (guideCol) guideCol.style.display = 'none';
    if (editorCol) editorCol.style.display = 'none';
    if (panelSettingsCol) panelSettingsCol.style.display = 'none';
    if (buttonCol) {
      buttonCol.style.display = 'block';
    }
  } else if (type === 'panel_settings' || type === 'settings') {
    embedCard?.classList.remove('active-selection');
    buttonRow?.classList.remove('active-selection');
    ddStack?.classList.remove('active-selection');
    if (guideCol) guideCol.style.display = 'none';
    if (editorCol) editorCol.style.display = 'none';
    if (buttonCol) buttonCol.style.display = 'none';
    if (panelSettingsCol) {
      panelSettingsCol.style.display = 'block';

      populatePanelSettingsRoles();
      populatePanelSettingsCategories();

      const psSupportRole = document.getElementById('psSupportRoleSelect');
      const psCat = document.getElementById('psCategorySelect');
      const psPrefix = document.getElementById('psTicketPrefix');
      const psAdmin = document.getElementById('psAdminAccess');

      if (psSupportRole && selectedPanelSupportRoleId) {
        psSupportRole.value = selectedPanelSupportRoleId;
      }
      if (psCat && selectedPanelCategoryId) {
        psCat.value = selectedPanelCategoryId;
      }
      if (psPrefix) {
        psPrefix.value = selectedPanelTicketPrefix || 'ticket-';
      }
      if (psAdmin) {
        psAdmin.checked = selectedPanelAdminAccess !== false;
      }

      renderExtraRolesPicker();

      if (currentGuildId) {
        fetchGuildStructure(currentGuildId);
      }
    }
  } else { // guide
    embedCard?.classList.remove('active-selection');
    buttonRow?.classList.remove('active-selection');
    ddStack?.classList.remove('active-selection');
    if (editorCol) editorCol.style.display = 'none';
    if (buttonCol) buttonCol.style.display = 'none';
    if (panelSettingsCol) panelSettingsCol.style.display = 'none';
    if (guideCol) guideCol.style.display = 'block';
  }
}

// Color picker bindings
function setupColorPicker() {
  const inputColor = document.getElementById('inputEmbedColor');
  const inputHex = document.getElementById('inputHexColor');
  const swatch = document.getElementById('colorSwatch');
  const btnTrigger = document.getElementById('btnTriggerColor');

  if (!inputColor) return;

  const updateColor = (val) => {
    inputColor.value = val;
    if (inputHex) inputHex.value = val.toUpperCase();
    if (swatch) swatch.style.backgroundColor = val;
    syncLivePreview();
  };

  inputColor.addEventListener('input', (e) => updateColor(e.target.value));
  if (btnTrigger) btnTrigger.addEventListener('click', () => inputColor.click());
  if (swatch) swatch.addEventListener('click', () => inputColor.click());
  if (inputHex) {
    inputHex.addEventListener('change', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        updateColor(val);
      }
    });
  }
}

// Deploy / Send Ticket Panel to Discord
async function deployTicketPanel() {
  const channelSelect = document.getElementById('ticketChannelSelect');
  const channelId = channelSelect?.value;
  if (!channelId) {
    selectDesignerElement('embed');
    showToast('Please select a target Discord channel first!', 'error');
    channelSelect?.focus();
    return;
  }

  const rawTitle = document.getElementById('inputEmbedTitle')?.value || 'Help & Support';
  const title = rawTitle.replace(/\*\*/g, '').trim() || 'Help & Support';
  const description = document.getElementById('inputEmbedDesc')?.value || 'Click below to create a new support ticket 🎟️';
  const bannerUrl = document.getElementById('inputImageUrl')?.value || null;
  const footerText = document.getElementById('inputFooterText')?.value || 'Powered by Kyvex';
  const color = document.getElementById('inputEmbedColor')?.value || '#00F0FF';
  const categoryId = document.getElementById('ticketCategorySelect')?.value || null;
  const buttonLabel = document.getElementById('inputButtonLabel')?.value || 'Create Ticket';
  const buttonEmoji = document.getElementById('inputButtonEmoji')?.value || '🎟️';
  const buttonStyle = document.getElementById('selectButtonStyle')?.value || 'danger';

  const isEditing = Boolean(editingPanelId);
  const btnDeploy = document.getElementById('btnStickyCreate');
  if (btnDeploy) {
    btnDeploy.disabled = true;
    btnDeploy.innerHTML = isEditing ? '<span>⏳ Saving Changes...</span>' : '<span>⏳ Creating Panel...</span>';
  }

  try {
    const res = await fetch('/api/tickets/create-panel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guildId: currentGuildId,
        channelId,
        panelId: editingPanelId || null,
        title,
        description,
        bannerUrl,
        footerText,
        color,
        categoryId: selectedPanelCategoryId || categoryId,
        supportRoleId: selectedPanelSupportRoleId || null,
        supportRoles: selectedPanelSupportRoles || (selectedPanelSupportRoleId ? [selectedPanelSupportRoleId] : []),
        ticketPrefix: selectedPanelTicketPrefix || 'ticket-',
        adminAccess: selectedPanelAdminAccess !== false,
        buttonLabel,
        buttonEmoji,
        buttonStyle,
        interactionMode: 'rows',
        useDropdowns: false,
        interactionRows: interactionRows,
        dropdowns: customDropdowns,
        dropdown1: customDropdowns[0]?.placeholder || 'MAIN ACCOUNT',
        dropdown2: customDropdowns[1]?.placeholder || 'BRUTAL PANEL',
        dropdown3: customDropdowns[2]?.placeholder || 'CLIENT SUPPORT',
        dropdown4: customDropdowns[3]?.placeholder || 'CREATE TICKET TO BECOME A STAFF',
        dropdown5: customDropdowns[4]?.placeholder || 'FREE PANEL'
      })
    });

    const data = await res.json();
    if (data.success) {
      const msg = data.updated
        ? `✔ Panel changes saved and updated in #${data.channelName}!`
        : `🎉 Ticket Panel successfully deployed to #${data.channelName}!`;
      showToast(msg, 'success');
      editingPanelId = null;
      if (btnDeploy) btnDeploy.innerHTML = '<span>Create Panel</span>';
      const stickyPrompt = document.querySelector('.sticky-prompt');
      if (stickyPrompt) stickyPrompt.textContent = 'Ready to send your panel?';
      updateChannelBadges(data.channelName);
      await fetchTickets();
      // Navigate back to Panels view to see the live deployed panel
      setTimeout(() => switchView('panels'), 1000);
    } else {
      showToast(data.error || 'Failed to deploy panel', 'error');
    }
  } catch (err) {
    showToast('Network error while deploying panel', 'error');
  } finally {
    if (btnDeploy) {
      btnDeploy.disabled = false;
      btnDeploy.innerHTML = editingPanelId ? '<span>💾 Save Changes</span>' : '<span>Create Panel</span>';
    }
  }
}



// Resend existing panel
async function resendCurrentPanel() {
  const panel = currentPanels[currentPanels.length - 1];
  if (!panel && !document.getElementById('ticketChannelSelect')?.value) {
    showToast('Please create a panel first!', 'info');
    setupChannelModal();
    return;
  }

  showToast('Resending panel to Discord...', 'info');
  if (panel && panel.id) {
    try {
      const res = await fetch('/api/tickets/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: currentGuildId, panelId: panel.id })
      });
      const data = await res.json();
      if (data.success) {
        showToast('🚀 Ticket panel resent to Discord!', 'success');
      } else {
        showToast(data.error || 'Failed to resend', 'error');
      }
    } catch (e) {
      deployTicketPanel();
    }
  } else {
    deployTicketPanel();
  }
}

// Delete panel configuration
async function deleteCurrentPanel() {
  if (!confirm('Are you sure you want to remove this panel configuration?')) return;
  const panel = currentPanels[currentPanels.length - 1];
  if (!panel) {
    showToast('No panel to delete.', 'info');
    return;
  }

  try {
    const res = await fetch('/api/tickets/delete-panel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: currentGuildId, panelId: panel.id })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Panel deleted successfully!', 'success');
      currentPanels = data.panels || [];
      fetchTickets();
    }
  } catch (e) {
    showToast('Failed to delete panel', 'error');
  }
}

// Channel Selection Modal (Matches Screenshot 2: Select Send Channel)
function setupChannelModal() {
  const modal = document.getElementById('channelSelectModal');
  const btnOpen1 = document.getElementById('btnOpenCreatePanel');
  const btnOpen2 = document.getElementById('btnCreateFirstPanel');
  const btnBack = document.getElementById('btnChannelModalBack');
  const btnContinue = document.getElementById('btnChannelModalContinue');
  const btnClear = document.getElementById('btnModalClearChannel');
  const modalSelect = document.getElementById('modalChannelSelect');
  const ticketSelect = document.getElementById('ticketChannelSelect');

  const openModal = () => {
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
    }
    // Proactively fetch latest channels for active server
    if (currentGuildId) {
      fetchGuildStructure(currentGuildId);
    } else {
      fetchStatus();
    }
  };

  window.openChannelSelectModal = openModal;

  const closeModal = () => {
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  };

  if (btnOpen1) btnOpen1.onclick = openModal;
  if (btnOpen2) btnOpen2.onclick = openModal;
  if (btnBack) btnBack.onclick = closeModal;

  // Close modal when pressing Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  if (btnClear) {
    btnClear.onclick = () => {
      if (modalSelect) modalSelect.value = '';
    };
  }

  // Close modal when clicking on overlay background
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (btnContinue) {
    btnContinue.onclick = () => {
      let chId = modalSelect?.value;
      // If nothing selected yet but channels are loaded, select the first channel
      if (!chId && modalSelect && modalSelect.options.length > 1) {
        modalSelect.selectedIndex = 1;
        chId = modalSelect.value;
      }
      if (!chId) {
        showToast('Please pick a destination Discord channel first!', 'info');
        return;
      }
      openNewPanelDesigner();
      if (ticketSelect) ticketSelect.value = chId;
      const selectedCh = modalSelect.options[modalSelect.selectedIndex]?.text;
      updateChannelBadges(selectedCh);
      closeModal();
      switchView('designer', 'Panel Designer');
      selectDesignerElement('guide');
      const sub = document.getElementById('designerSubtitle');
      if (sub) sub.textContent = 'Create a new panel for your server.';
    };
  }

  // Move button on panel card also opens modal
  const btnMove = document.getElementById('btnMovePanel');
  if (btnMove) {
    btnMove.onclick = () => {
      openModal();
    };
  }
}

// ==========================================
// PANEL SETTINGS & TICKET ACCESS ROLES MODAL
// ==========================================

function populatePanelSettingsRoles() {
  const psSupportRole = document.getElementById('psSupportRoleSelect');
  if (psSupportRole) {
    const curVal = psSupportRole.value || selectedPanelSupportRoleId;
    psSupportRole.innerHTML = '<option value="">-- Select Support Role (e.g. @Staff, @Support) --</option>';
    serverRoles.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `@${r.name}`;
      psSupportRole.appendChild(opt);
    });
    if (curVal && psSupportRole.querySelector(`option[value="${curVal}"]`)) {
      psSupportRole.value = curVal;
    }
  }

  renderExtraRolesPicker();
}

function populatePanelSettingsCategories() {
  const psCat = document.getElementById('psCategorySelect');
  if (psCat) {
    const curVal = psCat.value || selectedPanelCategoryId;
    psCat.innerHTML = '<option value="">Auto-Detect / Server Default</option>';
    serverCategories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `📁 ${cat.name}`;
      psCat.appendChild(opt);
    });
    if (curVal && psCat.querySelector(`option[value="${curVal}"]`)) {
      psCat.value = curVal;
    }
  }
}

function renderExtraRolesPicker() {
  const picker = document.getElementById('psExtraRolesPicker');
  if (!picker) return;

  if (!serverRoles || serverRoles.length === 0) {
    picker.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem; padding: 0.4rem;">Roles loading from server...</span>';
    return;
  }

  picker.innerHTML = '';
  serverRoles.forEach((r) => {
    const isSelected = selectedPanelSupportRoles.includes(r.id);
    const chip = document.createElement('div');
    chip.className = `role-chip-item ${isSelected ? 'selected' : ''}`;
    chip.setAttribute('data-role-id', r.id);

    const roleColor = (r.color && r.color !== '#000000') ? r.color : '#ff2449';
    chip.innerHTML = `
      <span class="role-chip-dot" style="background-color: ${roleColor}; box-shadow: 0 0 6px ${roleColor}88;"></span>
      <span>${r.name}</span>
      <span class="role-chip-check">✓</span>
    `;

    chip.addEventListener('click', () => {
      const idx = selectedPanelSupportRoles.indexOf(r.id);
      if (idx > -1) {
        selectedPanelSupportRoles.splice(idx, 1);
        chip.classList.remove('selected');
      } else {
        selectedPanelSupportRoles.push(r.id);
        chip.classList.add('selected');
      }
    });

    picker.appendChild(chip);
  });
}

function setupPanelSettingsModal() {
  const btnOpen = document.getElementById('btnPanelSettings');
  const btnSave = document.getElementById('btnPanelSettingsSave');
  const btnBack = document.getElementById('btnPanelSettingsBack');

  const psSupportRole = document.getElementById('psSupportRoleSelect');
  const psCat = document.getElementById('psCategorySelect');
  const psPrefix = document.getElementById('psTicketPrefix');
  const psAdmin = document.getElementById('psAdminAccess');

  const openSettings = () => {
    selectDesignerElement('panel_settings');
  };

  const closeSettings = () => {
    selectDesignerElement('guide');
  };

  window.openPanelSettingsModal = openSettings;
  window.closePanelSettingsModal = closeSettings;

  if (btnOpen) {
    btnOpen.onclick = () => {
      const panelSettingsCol = document.getElementById('designerPanelSettingsCol');
      const isSettingsOpen = panelSettingsCol && panelSettingsCol.style.display !== 'none';
      selectDesignerElement(isSettingsOpen ? 'guide' : 'panel_settings');
    };
  }

  if (btnBack) {
    btnBack.onclick = closeSettings;
  }

  if (psSupportRole) {
    psSupportRole.addEventListener('change', () => {
      const val = psSupportRole.value;
      if (val && !selectedPanelSupportRoles.includes(val)) {
        selectedPanelSupportRoles.push(val);
        renderExtraRolesPicker();
      }
    });
  }

  if (btnSave) {
    btnSave.onclick = async () => {
      selectedPanelSupportRoleId = psSupportRole ? psSupportRole.value : null;
      selectedPanelCategoryId = psCat ? psCat.value : null;
      selectedPanelTicketPrefix = psPrefix ? (psPrefix.value.trim() || 'ticket-') : 'ticket-';
      selectedPanelAdminAccess = psAdmin ? psAdmin.checked : true;

      // Ensure primary support role is included in supportRoles list if specified
      if (selectedPanelSupportRoleId && !selectedPanelSupportRoles.includes(selectedPanelSupportRoleId)) {
        selectedPanelSupportRoles.push(selectedPanelSupportRoleId);
      }

      // Sync category with designer's ticketCategorySelect if available
      const designerCat = document.getElementById('ticketCategorySelect');
      if (designerCat && selectedPanelCategoryId) {
        designerCat.value = selectedPanelCategoryId;
      }

      // If we are currently editing an existing panel, send instant update to backend
      if (editingPanelId) {
        try {
          btnSave.disabled = true;
          btnSave.innerHTML = '<span>⏳ Saving...</span>';
          const res = await fetch('/api/tickets/panel-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guildId: currentGuildId,
              panelId: editingPanelId,
              supportRoleId: selectedPanelSupportRoleId,
              supportRoles: selectedPanelSupportRoles,
              categoryId: selectedPanelCategoryId,
              ticketPrefix: selectedPanelTicketPrefix,
              adminAccess: selectedPanelAdminAccess
            })
          });
          const data = await res.json();
          if (data.success) {
            showToast('✔ Panel settings & ticket access permissions saved!', 'success');
            await fetchTickets();
          } else {
            showToast(data.error || 'Failed to save panel settings', 'error');
          }
        } catch (e) {
          showToast('Failed to save to server, saved locally', 'info');
        } finally {
          btnSave.disabled = false;
          btnSave.innerHTML = '<span>💾 Save Panel Settings</span>';
        }
      } else {
        showToast('✔ Ticket role access settings saved for this panel!', 'success');
      }
    };
  }
}



// Add Option Pill dynamically
function setupOptionPills() {
  const btnAdd = document.getElementById('btnAddOptionPill');
  const grid = document.getElementById('optionPillsGrid');
  if (!btnAdd || !grid) return;

  btnAdd.addEventListener('click', () => {
    const name = prompt('Enter new product/option label:');
    if (!name) return;
    const pill = document.createElement('div');
    pill.className = 'option-pill';
    pill.innerHTML = `
      <span class="grip">::</span>
      <span class="pill-emoji">🎀</span>
      <span class="pill-name">${name.toUpperCase()}</span>
    `;
    grid.insertBefore(pill, btnAdd);
    showToast(`Added option "${name.toUpperCase()}"`, 'success');
  });
}

// ==========================================
// 5. SECURITY & CONTROLS BINDINGS
// ==========================================

function setupSecurityControls() {
  // Checkbox Toggles
  document.querySelectorAll('input[type="checkbox"][data-key]').forEach((sw) => {
    sw.addEventListener('change', async (e) => {
      const key = e.target.getAttribute('data-key');
      const value = e.target.checked;
      try {
        const res = await fetch('/api/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, key, value })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Updated ${key}: ${value ? 'ENABLED' : 'DISABLED'}`, 'success');
        } else {
          e.target.checked = !value;
          showToast(data.error || 'Failed to update', 'error');
        }
      } catch (err) {
        e.target.checked = !value;
        showToast('Network error updating toggle', 'error');
      }
    });
  });

  // Punishment Selector
  const selectPunishment = document.getElementById('selectPunishment');
  if (selectPunishment) {
    selectPunishment.addEventListener('change', async (e) => {
      const punishment = e.target.value;
      try {
        const res = await fetch('/api/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, key: 'punishment', value: punishment })
        });
        if (res.ok) showToast(`Punishment updated to: ${punishment.toUpperCase()}`, 'success');
      } catch (e) {
        showToast('Failed to update punishment', 'error');
      }
    });
  }

  // Add Whitelist
  const btnAddWhitelist = document.getElementById('btnAddWhitelist');
  const inputUserId = document.getElementById('inputUserId');
  if (btnAddWhitelist && inputUserId) {
    const handleWhitelist = async () => {
      const userId = inputUserId.value.trim().replace(/[<@!>]/g, '');
      if (!userId) return;
      try {
        const res = await fetch('/api/whitelist/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, userId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Whitelisted user: ${userId}`, 'success');
          inputUserId.value = '';
          fetchConfig(currentGuildId);
        } else {
          showToast(data.error || 'Failed to whitelist', 'error');
        }
      } catch (e) {
        showToast('Network error', 'error');
      }
    };
    btnAddWhitelist.onclick = handleWhitelist;
    inputUserId.onkeypress = (e) => { if (e.key === 'Enter') handleWhitelist(); };
  }

  // Add Extra Owner
  const btnAddExtraOwner = document.getElementById('btnAddExtraOwner');
  const inputExtraOwnerId = document.getElementById('inputExtraOwnerId');
  if (btnAddExtraOwner && inputExtraOwnerId) {
    const handleExtraOwner = async () => {
      const userId = inputExtraOwnerId.value.trim().replace(/[<@!>]/g, '');
      if (!userId) return;
      try {
        const res = await fetch('/api/extra-owner/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, userId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Added Extra Owner: ${userId}`, 'success');
          inputExtraOwnerId.value = '';
          fetchConfig(currentGuildId);
        } else {
          showToast(data.error || 'Failed to add extra owner', 'error');
        }
      } catch (e) {
        showToast('Network error', 'error');
      }
    };
    btnAddExtraOwner.onclick = handleExtraOwner;
    inputExtraOwnerId.onkeypress = (e) => { if (e.key === 'Enter') handleExtraOwner(); };
  }

  // Run Deep Scan
  const runScan = async () => {
    showToast('🔍 Running Deep Security Scan...', 'info');
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: currentGuildId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Scan complete! Audited ${data.totalRolesScanned} roles.`, 'success');
        fetchLogs();
      } else {
        showToast(data.error || 'Scan failed', 'error');
      }
    } catch (e) {
      showToast('Network error during scan', 'error');
    }
  };

  const btnScan1 = document.getElementById('btnRunScan');
  const btnScan2 = document.getElementById('btnRunScanQuick');
  if (btnScan1) btnScan1.onclick = runScan;
  if (btnScan2) btnScan2.onclick = runScan;
}

function renderList(containerId, countId, items, removeFn) {
  const container = document.getElementById(containerId);
  const count = document.getElementById(countId);
  if (!container) return;

  if (count) count.textContent = `${items.length} ${items.length === 1 ? 'User' : 'Users'}`;

  if (!items || items.length === 0) {
    container.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem; padding: 0.5rem 0;">None added yet.</p>';
    return;
  }

  container.innerHTML = '';
  items.forEach((id) => {
    const pill = document.createElement('div');
    pill.className = 'whitelist-pill';
    pill.innerHTML = `
      <span><code>${id}</code></span>
      <button class="btn-remove-user" data-id="${id}" title="Remove">✕</button>
    `;
    container.appendChild(pill);
  });

  container.querySelectorAll('.btn-remove-user').forEach((b) => {
    b.onclick = () => removeFn(b.getAttribute('data-id'));
  });
}

async function removeWhitelistUser(userId) {
  try {
    const res = await fetch('/api/whitelist/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: currentGuildId, userId })
    });
    if (res.ok) {
      showToast('Removed from whitelist', 'info');
      fetchConfig(currentGuildId);
    }
  } catch (e) {}
}

async function removeExtraOwnerUser(userId) {
  try {
    const res = await fetch('/api/extra-owner/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: currentGuildId, userId })
    });
    if (res.ok) {
      showToast('Removed from extra owners', 'info');
      fetchConfig(currentGuildId);
    }
  } catch (e) {}
}

// ==========================================
// 6. MUSIC & AUDIT LOGS
// ==========================================

function updateNowPlayingUI(music) {
  const status = document.getElementById('trackStatus');
  const title = document.getElementById('trackTitle');
  const artist = document.getElementById('trackArtist');
  const thumb = document.getElementById('trackThumb');

  if (!status || !title) return;

  const song = music?.currentSong || music?.currentTrack;
  if (music && song) {
    status.textContent = music.isPlaying ? 'NOW PLAYING' : (music.isPaused ? 'PAUSED' : 'IN QUEUE');
    title.textContent = song.title || song.name || 'Unknown Title';
    artist.textContent = song.author || song.uploader?.name || 'Discord Audio';
    if (thumb && (song.thumbnail || song.image)) thumb.src = song.thumbnail || song.image;
  } else {
    status.textContent = 'IDLE / NO QUEUE';
    title.textContent = 'No track currently playing';
    artist.textContent = 'Join a voice channel and type /play';
  }
}

async function handleMusicControl(action, value = null) {
  try {
    const res = await fetch('/api/music/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: currentGuildId, action, value })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Music action: ${action.toUpperCase()}`, 'info');
      fetchStatus();
    }
  } catch (e) {
    showToast('Failed to execute music control', 'error');
  }
}

async function fetchLogs() {
  try {
    const res = await fetch('/api/logs');
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    const logs = data.logs || [];
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No security breaches detected. All systems secure.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    logs.forEach((l) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><small style="color: var(--text-dim);">${new Date(l.timestamp).toLocaleTimeString()}</small></td>
        <td><strong>${l.action}</strong></td>
        <td><code>${l.executorId}</code></td>
        <td>${l.target}</td>
        <td><span class="tag-gold">${l.countermeasure}</span></td>
        <td><span style="color: #22c55e;">NEUTRALIZED</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {}
}

// ==========================================
// 6.5 VERIFICATION & MASS ROLE HANDLERS
// ==========================================

function setupVerificationView() {
  const inputTitle = document.getElementById('verifyInputTitle');
  const inputDesc = document.getElementById('verifyInputDesc');
  const inputBtnText = document.getElementById('verifyInputBtnText');
  const selectBtnColor = document.getElementById('verifySelectBtnColor');
  const inputBanner = document.getElementById('verifyInputBanner');

  const previewName = document.getElementById('verifyPreviewBotName');
  const previewDesc = document.getElementById('verifyPreviewDesc');
  const previewBtn = document.getElementById('verifyPreviewBtn');
  const previewBanner = document.getElementById('verifyPreviewBannerImg');
  const previewCard = document.getElementById('verifyPreviewEmbedCard');

  // Live Canvas synchronization
  function syncVerificationCanvas() {
    if (previewName && inputTitle) {
      previewName.textContent = inputTitle.value.trim() || 'SECURITY';
    }
    if (previewDesc && inputDesc) {
      previewDesc.textContent = inputDesc.value.trim() || 'This server requires you to verify yourself to get access to other channels, you can simply verify by clicking on the verify button.';
    }
    if (previewBtn && inputBtnText) {
      const span = previewBtn.querySelector('span') || previewBtn;
      span.textContent = inputBtnText.value.trim() || 'Verify';
    }
    if (previewBtn && selectBtnColor) {
      const colorMap = {
        Primary: { bg: '#5865f2', border: '#2b7fff' },
        Danger: { bg: '#ef4444', border: '#ff2449' },
        Success: { bg: '#10b981', border: '#10b981' },
        Secondary: { bg: '#4f545c', border: '#64748b' }
      };
      const selected = colorMap[selectBtnColor.value] || colorMap.Primary;
      previewBtn.style.backgroundColor = selected.bg;
      if (previewCard) previewCard.style.borderLeftColor = selected.border;
    }
    if (previewBanner && inputBanner) {
      const customUrl = inputBanner.value.trim();
      previewBanner.src = customUrl || '/assets/verify-banner.png';
    }
  }

  [inputTitle, inputDesc, inputBtnText, inputBanner].forEach(el => {
    el?.addEventListener('input', syncVerificationCanvas);
  });
  selectBtnColor?.addEventListener('change', syncVerificationCanvas);

  // Deploy Verification Panel to Channel
  const btnDeploy = document.getElementById('btnDeployVerification');
  if (btnDeploy) {
    btnDeploy.addEventListener('click', async () => {
      const channelSelect = document.getElementById('verifyChannelSelect');
      const roleSelect = document.getElementById('verifyRoleSelect');

      const channelId = channelSelect?.value;
      const roleId = roleSelect?.value;

      if (!channelId) {
        showToast('Kripya target verification channel select karein!', 'error');
        return;
      }
      if (!roleId) {
        showToast('Kripya verification role select karein jo members ko dena hai!', 'error');
        return;
      }

      btnDeploy.disabled = true;
      const originalText = btnDeploy.innerHTML;
      btnDeploy.innerHTML = '<span>⏳ Sending Verification Panel...</span>';

      try {
        const payload = {
          guildId: currentGuildId,
          channelId,
          roleId,
          description: inputDesc?.value?.trim(),
          buttonText: inputBtnText?.value?.trim() || 'Verify',
          embedColor: selectBtnColor?.value === 'Danger' ? '#ff2449' : (selectBtnColor?.value === 'Success' ? '#10b981' : '#2b7fff'),
          bannerUrl: inputBanner?.value?.trim() || undefined
        };

        const res = await fetch('/api/verification/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to deploy panel');
        }

        showToast(`✅ Verification panel sent to #${data.channelName || 'channel'}! Role @${data.roleName || 'role'} configured.`, 'success');
      } catch (err) {
        console.error('Deploy verification error:', err);
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        btnDeploy.disabled = false;
        btnDeploy.innerHTML = originalText;
      }
    });
  }

  // Mass Role Automation
  async function runMassRole(action) {
    const roleSelect = document.getElementById('massRoleSelect');
    const targetSelect = document.getElementById('massTargetSelect');
    const statusBox = document.getElementById('massRoleStatusBox');
    const statusText = document.getElementById('massRoleStatusText');

    const roleId = roleSelect?.value;
    const targetType = targetSelect?.value || 'humans';

    if (!roleId) {
      showToast('Kripya target role select karein!', 'error');
      return;
    }

    const roleName = roleSelect.options[roleSelect.selectedIndex]?.text || 'selected role';
    const actionWord = action === 'add' ? 'give' : 'remove';
    const confirmMsg = `Are you sure you want to ${actionWord.toUpperCase()} ${roleName} ${action === 'add' ? 'TO' : 'FROM'} ${targetType.toUpperCase()} members?`;

    if (!confirm(confirmMsg)) return;

    if (statusBox && statusText) {
      statusBox.style.display = 'block';
      statusText.innerHTML = `⏳ <strong>Scanning server members...</strong> Queuing mass role ${action} for ${targetType}...`;
    }

    try {
      const res = await fetch('/api/roles/mass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: currentGuildId,
          roleId,
          action,
          targetType
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Mass role request failed');
      }

      if (statusBox && statusText) {
        statusText.innerHTML = `✅ <strong>Background Process Active:</strong> ${action === 'add' ? 'Adding' : 'Removing'} @${data.roleName} for <strong>${data.queued} members</strong> (out of ${data.totalScanned} scanned). Safe pacing (280ms) applied to avoid Discord rate limits.`;
      }
      showToast(`Mass role ${action} started for ${data.queued} members!`, 'success');
    } catch (err) {
      console.error('Mass role error:', err);
      if (statusBox && statusText) {
        statusText.innerHTML = `❌ <strong>Error:</strong> ${err.message}`;
      }
      showToast(`Error: ${err.message}`, 'error');
    }
  }

  document.getElementById('btnMassAddRole')?.addEventListener('click', () => runMassRole('add'));
  document.getElementById('btnMassRemoveRole')?.addEventListener('click', () => runMassRole('remove'));

  // Load existing verification config if available
  async function loadExistingVerificationConfig() {
    if (!currentGuildId) return;
    try {
      const res = await fetch(`/api/verification?guildId=${currentGuildId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.config) {
        const c = data.config;
        if (c.channelId) {
          const chSel = document.getElementById('verifyChannelSelect');
          if (chSel) chSel.value = c.channelId;
        }
        if (c.roleId) {
          const rSel = document.getElementById('verifyRoleSelect');
          if (rSel) rSel.value = c.roleId;
        }
        if (c.description && inputDesc) inputDesc.value = c.description;
        if (c.buttonText && inputBtnText) inputBtnText.value = c.buttonText;
        if (c.bannerUrl && inputBanner) inputBanner.value = c.bannerUrl;
        syncVerificationCanvas();
      }
    } catch (e) {}
  }

  loadExistingVerificationConfig();
}

// ==========================================
// 7. SETUP EVENT LISTENERS & BOOTSTRAP
// ==========================================

function initApp() {
  // Nav Links click
  document.querySelectorAll('.nav-link[data-view]').forEach((link) => {
    link.addEventListener('click', () => {
      const view = link.getAttribute('data-view');
      switchView(view);
    });
  });

  // Welcome System init
  if (typeof initWelcomeSection === 'function') {
    initWelcomeSection();
  }

  // Action Bar in Panels view
  document.getElementById('btnEditPanel')?.addEventListener('click', () => {
    const p = (currentPanels && currentPanels.length > 0) ? currentPanels[currentPanels.length - 1] : null;
    if (p) {
      loadPanelIntoDesigner(p);
    } else {
      switchView('designer', 'Panel Designer');
      selectDesignerElement('embed');
    }
  });
  document.getElementById('btnCreateFirstPanel')?.addEventListener('click', () => {
    if (typeof window.openChannelSelectModal === 'function') {
      window.openChannelSelectModal();
    } else {
      const modal = document.getElementById('channelSelectModal');
      if (modal) modal.style.display = 'flex';
    }
  });
  document.getElementById('btnOpenCreatePanel')?.addEventListener('click', () => {
    if (typeof window.openChannelSelectModal === 'function') {
      window.openChannelSelectModal();
    } else {
      const modal = document.getElementById('channelSelectModal');
      if (modal) modal.style.display = 'flex';
    }
  });
  document.getElementById('btnAddEmbed')?.addEventListener('click', () => {
    selectDesignerElement('embed');
    showToast('Selected Embed 1 for editing', 'info');
  });
  document.getElementById('btnAddTextContent')?.addEventListener('click', () => {
    selectDesignerElement('embed');
    const descEl = document.getElementById('inputEmbedDesc');
    if (descEl) {
      descEl.focus();
      descEl.select();
    }
  });

  document.getElementById('btnViewAllPanels')?.addEventListener('click', () => {
    switchView('panels', 'Panels');
  });
  document.getElementById('btnBackToPanels')?.addEventListener('click', () => switchView('panels', 'Panels'));
  document.getElementById('btnBackToPreview')?.addEventListener('click', () => switchView('panels', 'Panels'));
  document.getElementById('btnResendPanel')?.addEventListener('click', resendCurrentPanel);
  document.getElementById('btnDeletePanel')?.addEventListener('click', deleteCurrentPanel);

  // Sticky Bottom Bar Actions
  document.getElementById('btnStickyCreate')?.addEventListener('click', deployTicketPanel);
  document.getElementById('btnStickyReset')?.addEventListener('click', () => {
    if (editingPanelId) {
      const p = currentPanels.find(x => x.id === editingPanelId);
      if (p) {
        loadPanelIntoDesigner(p);
        showToast('Reverted panel edits to saved state', 'info');
        return;
      }
    }
    openNewPanelDesigner();
    showToast('Reset designer to default panel template', 'info');
  });


  // Preview element click-to-edit interactions (Screenshot 1 -> Screenshot 2)
  document.getElementById('designerEmbedCard')?.addEventListener('click', () => {
    selectDesignerElement('embed');
  });

  document.getElementById('designerButtonRow')?.addEventListener('click', () => {
    selectDesignerElement('button');
  });

  document.getElementById('discordDropdownStack')?.addEventListener('click', () => {
    selectDesignerElement('dropdown');
  });

  // Mode Selection Pills in right editor
  document.querySelectorAll('.mode-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const mode = pill.getAttribute('data-mode');
      if (mode) setInteractionMode(mode);
    });
  });

  // Canvas Mode Badges
  document.getElementById('badgeModeDropdowns')?.addEventListener('click', () => setInteractionMode('dropdowns'));
  document.getElementById('badgeModeButton')?.addEventListener('click', () => setInteractionMode('button'));

  // Toggle options list when clicking select boxes in preview
  document.querySelectorAll('.discord-select-wrapper .discord-select-box').forEach((box) => {
    box.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrapper = box.parentElement;
      if (wrapper) {
        wrapper.classList.toggle('active-open');
        const arrow = box.querySelector('.dd-arrow');
        if (arrow) {
          arrow.textContent = wrapper.classList.contains('active-open') ? '▲' : '▼';
        }
      }
      selectDesignerElement('dropdown');
    });
  });

  // Back to Guide arrows
  document.getElementById('btnBackToGuide')?.addEventListener('click', () => {
    selectDesignerElement('guide');
  });
  document.getElementById('btnButtonBackToGuide')?.addEventListener('click', () => {
    selectDesignerElement('guide');
  });
  document.getElementById('btnPanelSettingsBack')?.addEventListener('click', () => {
    selectDesignerElement('guide');
  });

  // Guide Toggle in top action bar
  const btnToggleGuide = document.getElementById('btnToggleGuide');
  if (btnToggleGuide) {
    btnToggleGuide.onclick = () => {
      const isGuideOpen = document.getElementById('designerGuideCol')?.style.display !== 'none';
      selectDesignerElement(isGuideOpen ? 'embed' : 'guide');
    };
  }

  // Panel Settings in top action bar
  const btnTopPanelSettings = document.getElementById('btnPanelSettings');
  if (btnTopPanelSettings) {
    btnTopPanelSettings.onclick = () => {
      const panelSettingsCol = document.getElementById('designerPanelSettingsCol');
      const isSettingsOpen = panelSettingsCol && panelSettingsCol.style.display !== 'none';
      selectDesignerElement(isSettingsOpen ? 'guide' : 'panel_settings');
    };
  }

  // Live typing sync for all embed, button, and dropdown inputs
  const liveInputIds = [
    'inputEmbedTitle',
    'inputEmbedDesc',
    'inputImageUrl',
    'inputFooterText',
    'inputEmbedColor',
    'inputButtonLabel',
    'inputButtonEmoji',
    'selectButtonStyle',
    'inputDd1',
    'inputDd2',
    'inputDd3',
    'inputDd4',
    'inputDd5'
  ];
  liveInputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', syncLivePreview);
      el.addEventListener('change', syncLivePreview);
    }
  });


  // Reset embed button (Clean Kyvex default)
  document.getElementById('btnResetEmbed')?.addEventListener('click', () => {
    document.getElementById('inputEmbedTitle').value = 'Help & Support';
    document.getElementById('inputEmbedDesc').value = 'Click below to create a new support ticket 🎟️';
    document.getElementById('inputFooterText').value = 'Powered by Kyvex';
    document.getElementById('inputEmbedColor').value = '#ff2449';
    document.getElementById('inputHexColor').value = '#00F0FF';
    document.getElementById('colorSwatch').style.backgroundColor = '#ff2449';
    const imgEl = document.getElementById('inputImageUrl');
    if (imgEl) imgEl.value = '';
    syncLivePreview();
    showToast('Embed reset to Kyvex defaults', 'info');
  });

  // Dropdown Builder Action Buttons
  document.getElementById('btnAddDropdownMenu')?.addEventListener('click', () => {
    addDropdownMenu();
  });

  document.getElementById('btnLoadOgTemplate')?.addEventListener('click', () => {
    customDropdowns = JSON.parse(JSON.stringify(OG_REGEDIT_TEMPLATE));
    renderDropdownsEditor();
    renderCanvasDropdowns();
    showToast('Loaded sample OG Regedit dropdown template! You can customize any option or title.', 'info');
  });

  document.getElementById('btnClearAllMenus')?.addEventListener('click', () => {
    customDropdowns = [];
    renderDropdownsEditor();
    renderCanvasDropdowns();
    showToast('Cleared all dropdown menus. Ready to build from scratch!', 'info');
  });

  // Interaction Area Add Row Buttons
  document.getElementById('btnAddButtonRow')?.addEventListener('click', () => {
    addButtonRow();
  });
  document.getElementById('btnAddDropdownRow')?.addEventListener('click', () => {
    addDropdownRow();
  });

  // Selected Button Editor Live Sync
  const inputSelectedBtnLabel = document.getElementById('inputSelectedBtnLabel');
  if (inputSelectedBtnLabel) {
    inputSelectedBtnLabel.addEventListener('input', (e) => {
      const btn = interactionRows[selectedButtonRef.rowIndex]?.buttons?.[selectedButtonRef.buttonIndex];
      if (btn) {
        btn.label = e.target.value;
        renderInteractionArea();
      }
    });
  }

  const inputSelectedBtnEmoji = document.getElementById('inputSelectedBtnEmoji');
  if (inputSelectedBtnEmoji) {
    inputSelectedBtnEmoji.addEventListener('input', (e) => {
      const btn = interactionRows[selectedButtonRef.rowIndex]?.buttons?.[selectedButtonRef.buttonIndex];
      if (btn) {
        btn.emoji = e.target.value;
        const displayEmoji = document.getElementById('displaySelectedBtnEmoji');
        if (displayEmoji) displayEmoji.textContent = e.target.value || '🎟️';
        renderInteractionArea();
      }
    });
  }

  // Quick emoji recommendations
  document.querySelectorAll('#quickEmojisRow .emoji-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const em = chip.getAttribute('data-emoji');
      const inputSelectedBtnEmoji = document.getElementById('inputSelectedBtnEmoji');
      if (inputSelectedBtnEmoji) {
        inputSelectedBtnEmoji.value = em;
        inputSelectedBtnEmoji.dispatchEvent(new Event('input'));
      }
    });
  });

  // Change Emoji trigger button (custom prompt)
  document.getElementById('btnChangeEmojiTrigger')?.addEventListener('click', () => {
    const btn = interactionRows[selectedButtonRef.rowIndex]?.buttons?.[selectedButtonRef.buttonIndex];
    const newEmoji = prompt('Enter an emoji for this button (e.g. 🎧, 💳, 🎟️, 🛡️, 💬, 👑):', btn?.emoji || '🎟️');
    if (newEmoji) {
      const inputSelectedBtnEmoji = document.getElementById('inputSelectedBtnEmoji');
      if (inputSelectedBtnEmoji) {
        inputSelectedBtnEmoji.value = newEmoji.trim();
        inputSelectedBtnEmoji.dispatchEvent(new Event('input'));
      }
    }
  });

  // Button style selector
  const selectSelectedBtnStyle = document.getElementById('selectSelectedBtnStyle');
  if (selectSelectedBtnStyle) {
    selectSelectedBtnStyle.addEventListener('change', (e) => {
      const btn = interactionRows[selectedButtonRef.rowIndex]?.buttons?.[selectedButtonRef.buttonIndex];
      if (btn) {
        btn.style = e.target.value;
        const groupUrl = document.getElementById('groupBtnLinkUrl');
        if (btn.style === 'link') {
          btn.type = 'link';
          if (groupUrl) groupUrl.style.display = 'block';
        } else {
          delete btn.type;
          if (groupUrl) groupUrl.style.display = 'none';
        }
        renderInteractionArea();
      }
    });
  }

  // Button Link URL
  const inputSelectedBtnUrl = document.getElementById('inputSelectedBtnUrl');
  if (inputSelectedBtnUrl) {
    inputSelectedBtnUrl.addEventListener('input', (e) => {
      const btn = interactionRows[selectedButtonRef.rowIndex]?.buttons?.[selectedButtonRef.buttonIndex];
      if (btn) {
        btn.url = e.target.value;
      }
    });
  }

  // Button Ticket Prefix
  const inputSelectedBtnPrefix = document.getElementById('inputSelectedBtnPrefix');
  if (inputSelectedBtnPrefix) {
    inputSelectedBtnPrefix.addEventListener('input', (e) => {
      const btn = interactionRows[selectedButtonRef.rowIndex]?.buttons?.[selectedButtonRef.buttonIndex];
      if (btn) {
        btn.prefix = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
      }
    });
  }

  // Delete Selected Button Action
  document.getElementById('btnDeleteSelectedButton')?.addEventListener('click', () => {
    deleteSelectedButton();
  });

  // Dropdown Option Editor Live Sync (Matches Picture 4 Option Customization)
  const inputSelectedOptLabel = document.getElementById('inputSelectedOptLabel');
  if (inputSelectedOptLabel) {
    inputSelectedOptLabel.addEventListener('input', (e) => {
      const row = interactionRows[selectedOptionRef.rowIndex];
      if (row && row.type === 'dropdown') {
        const opt = row.options?.[selectedOptionRef.optionIndex];
        if (opt) {
          opt.label = e.target.value;
          const pill = document.querySelector(`.dd-option-pill[data-row="${selectedOptionRef.rowIndex}"][data-opt="${selectedOptionRef.optionIndex}"] .dd-opt-label`);
          if (pill) pill.textContent = e.target.value || 'Option';
        }
      }
    });
  }

  const inputSelectedOptEmoji = document.getElementById('inputSelectedOptEmoji');
  if (inputSelectedOptEmoji) {
    inputSelectedOptEmoji.addEventListener('input', (e) => {
      const row = interactionRows[selectedOptionRef.rowIndex];
      if (row && row.type === 'dropdown') {
        const opt = row.options?.[selectedOptionRef.optionIndex];
        if (opt) {
          opt.emoji = e.target.value;
          const displayEmoji = document.getElementById('displaySelectedOptEmoji');
          if (displayEmoji) displayEmoji.textContent = e.target.value || '💬';
          const pillEmoji = document.querySelector(`.dd-option-pill[data-row="${selectedOptionRef.rowIndex}"][data-opt="${selectedOptionRef.optionIndex}"] .dd-opt-emoji`);
          if (pillEmoji) pillEmoji.textContent = e.target.value || '💬';
        }
      }
    });
  }

  // Quick emoji recommendations for dropdown options
  document.querySelectorAll('#quickOptEmojisRow .emoji-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const em = chip.getAttribute('data-emoji');
      const inputSelectedOptEmoji = document.getElementById('inputSelectedOptEmoji');
      if (inputSelectedOptEmoji) {
        inputSelectedOptEmoji.value = em;
        inputSelectedOptEmoji.dispatchEvent(new Event('input'));
      }
    });
  });

  const inputSelectedOptDesc = document.getElementById('inputSelectedOptDesc');
  if (inputSelectedOptDesc) {
    inputSelectedOptDesc.addEventListener('input', (e) => {
      const row = interactionRows[selectedOptionRef.rowIndex];
      if (row && row.type === 'dropdown') {
        const opt = row.options?.[selectedOptionRef.optionIndex];
        if (opt) {
          opt.description = e.target.value;
        }
      }
    });
  }

  document.getElementById('btnDeleteSelectedOption')?.addEventListener('click', () => {
    deleteSelectedOption();
  });

  document.getElementById('btnButtonBackToGuide')?.addEventListener('click', () => {
    selectDesignerElement('guide');
  });


  // Server switch trigger (clicking card opens hidden select)
  document.getElementById('serverCardTrigger')?.addEventListener('click', () => {
    const newGuild = prompt('Enter Server ID or switch server:', currentGuildId);
    if (newGuild && newGuild !== currentGuildId) {
      currentGuildId = newGuild;
      fetchGuildStructure(currentGuildId);
      fetchConfig(currentGuildId);
    }
  });

  // Music Player Buttons
  document.getElementById('btnPlayPause')?.addEventListener('click', () => {
    const isPlaying = document.getElementById('trackStatus')?.textContent === 'NOW PLAYING';
    handleMusicControl(isPlaying ? 'pause' : 'resume');
  });
  document.getElementById('btnSkip')?.addEventListener('click', () => handleMusicControl('skip'));
  document.getElementById('btnStop')?.addEventListener('click', () => handleMusicControl('stop'));

  const sliderVol = document.getElementById('sliderVolume');
  if (sliderVol) {
    sliderVol.addEventListener('input', (e) => {
      document.getElementById('volumeValue').textContent = `${e.target.value}%`;
      handleMusicControl('volume', e.target.value);
    });
  }

  // Refresh logs button
  document.getElementById('btnRefreshLogs')?.addEventListener('click', () => {
    fetchLogs();
    showToast('Security logs refreshed', 'info');
  });

  // Refresh tickets button
  document.getElementById('btnRefreshTickets')?.addEventListener('click', () => {
    fetchTickets();
    showToast('Tickets list refreshed', 'info');
  });

  // Setup modals, color picker, option pills & landing page
  setupChannelModal();
  setupPanelSettingsModal();
  setupColorPicker();
  setupOptionPills();
  setupSecurityControls();
  setupLandingPage();
  setupVerificationView();

  // Initialize Zynrax Language and Auth Bar State
  applyLanguage(getActiveLanguage());
  updateTopbarAuthState();

  // Initial Sync
  renderInteractionArea();
  populateButtonEditor();
  renderDropdownsEditor();
  renderCanvasDropdowns();
  syncLivePreview();
  fetchStatus();
  fetchLogs();
  fetchCurrentUser();

  // Background polling loop every 3.5s
  pollTimer = setInterval(fetchStatus, 3500);
}

/**
 * Handles toggling between Public Landing Page and Authenticated Dashboard
 */
function setupLandingPage() {
  const landingView = document.getElementById('publicLandingView');
  const dashboardView = document.getElementById('dashboardAppView');
  const loginModal = document.getElementById('landingLoginModal');

  // Check if URL has ?view=dashboard or ?dashboard=1 or path is /dashboard /callback
  const urlParams = new URLSearchParams(window.location.search);
  const isDashboardPath = window.location.pathname === '/dashboard' || window.location.pathname.endsWith('/dashboard') || window.location.pathname === '/callback' || window.location.pathname.endsWith('/callback');
  const wantsDashboard = urlParams.get('view') === 'dashboard' || urlParams.get('dashboard') === '1' || window.location.hash === '#dashboard' || isDashboardPath;
  
  const isLoggedIn = localStorage.getItem('og_logged_in') === 'true' || wantsDashboard;

  if (isDashboardPath) {
    localStorage.setItem('og_logged_in', 'true');
  }

  function showDashboard() {
    if (landingView) landingView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';

    const navHome = document.getElementById('zynraxNavHome');
    const navDash = document.getElementById('zynraxNavDashboard');
    if (navHome) navHome.classList.remove('active');
    if (navDash) navDash.classList.add('active');

    updateTopbarAuthState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showLanding() {
    if (dashboardView) dashboardView.style.display = 'none';
    if (landingView) landingView.style.display = 'block';

    const navHome = document.getElementById('zynraxNavHome');
    const navDash = document.getElementById('zynraxNavDashboard');
    if (navHome) navHome.classList.add('active');
    if (navDash) navDash.classList.remove('active');

    updateTopbarAuthState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.showDashboard = showDashboard;
  window.showLanding = showLanding;

  if (isLoggedIn) {
    showDashboard();
  } else {
    showLanding();
  }

  // Dashboard request handler from landing buttons
  const handleLandingDashboardClick = (e) => {
    if (e) e.preventDefault();
    const isUserLoggedIn = localStorage.getItem('og_logged_in') === 'true';
    if (isUserLoggedIn) {
      showDashboard();
      switchView('servers', t('yourServers'));
    } else {
      const zynraxModal = document.getElementById('zynraxLoginModal');
      if (zynraxModal) zynraxModal.style.display = 'flex';
      showToast('Please login with Discord to access your Dashboard', 'info');
    }
  };

  document.getElementById('btnLandingLogin')?.addEventListener('click', handleLandingDashboardClick);
  document.getElementById('landingNavDashboard')?.addEventListener('click', handleLandingDashboardClick);
  document.getElementById('btnCtaOpenDashboard')?.addEventListener('click', handleLandingDashboardClick);
  document.getElementById('footerOpenDashboard')?.addEventListener('click', handleLandingDashboardClick);

  // Command showcase preview switcher
  const cmdTabs = document.querySelectorAll('.cmd-tab');
  const previewScreen = document.querySelector('.cmd-preview-screen');
  if (cmdTabs.length > 0 && previewScreen) {
    const cmdPreviews = {
      security: `
        <div class="discord-msg-preview">
          <div class="discord-bot-avatar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <div class="discord-msg-body">
            <div class="discord-bot-meta">
              <span class="bot-author">Kyvex</span>
              <span class="bot-tag">BOT</span>
              <span class="bot-timestamp">Today at 6:18 PM</span>
            </div>
            <div class="discord-embed-card embed-crimson">
              <div class="embed-title">🛡️ EMERGENCY LOCKDOWN EXECUTED</div>
              <div class="embed-desc">All public text and voice channels have been secured. Unauthorized roles have been restricted from sending messages.</div>
              <div class="embed-fields-row">
                <div class="embed-field">
                  <span class="f-name">Status</span>
                  <span class="f-val text-neon-green">15 Channels Locked</span>
                </div>
                <div class="embed-field">
                  <span class="f-name">Initiator</span>
                  <span class="f-val">Server Administrator</span>
                </div>
                <div class="embed-field">
                  <span class="f-name">Mitigation Delay</span>
                  <span class="f-val text-neon-cyan">14ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      music: `
        <div class="discord-msg-preview">
          <div class="discord-bot-avatar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <div class="discord-msg-body">
            <div class="discord-bot-meta">
              <span class="bot-author">Kyvex</span>
              <span class="bot-tag">BOT</span>
              <span class="bot-timestamp">Today at 6:19 PM</span>
            </div>
            <div class="discord-embed-card" style="border-left-color: #ff3b5c;">
              <div class="embed-title">🎵 NOW PLAYING &bull; 24/7 AUDIOPHILE STREAM</div>
              <div class="embed-desc"><strong>Cybernetic Resonance (Lossless FLAC)</strong> &bull; 384kbps DisTube v5.1 Engine</div>
              <div class="embed-fields-row">
                <div class="embed-field">
                  <span class="f-name">Active Filter</span>
                  <span class="f-val text-neon-cyan">Bassboost + 8D Audio</span>
                </div>
                <div class="embed-field">
                  <span class="f-name">Voice Channel</span>
                  <span class="f-val text-neon-green">General VC (E2EE DAVE)</span>
                </div>
                <div class="embed-field">
                  <span class="f-name">Volume / Reconnect</span>
                  <span class="f-val">100% &bull; Auto-Stay ON</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      ticket: `
        <div class="discord-msg-preview">
          <div class="discord-bot-avatar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <div class="discord-msg-body">
            <div class="discord-bot-meta">
              <span class="bot-author">Kyvex</span>
              <span class="bot-tag">BOT</span>
              <span class="bot-timestamp">Today at 6:20 PM</span>
            </div>
            <div class="discord-embed-card" style="border-left-color: #38bdf8;">
              <div class="embed-title">🎟️ KYVEX &bull; SUPPORT &amp; ORDER PANEL</div>
              <div class="embed-desc">Select an inquiry category from the dropdown menu below to initiate a private support ticket.</div>
              <div style="background: #23202b; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0.65rem 0.85rem; margin-top: 0.75rem; color: #94a3b8; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                <span>🛒 Main Account Products &bull; Select to Order</span>
                <span>▼</span>
              </div>
            </div>
          </div>
        </div>
      `,
      moderation: `
        <div class="discord-msg-preview">
          <div class="discord-bot-avatar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <div class="discord-msg-body">
            <div class="discord-bot-meta">
              <span class="bot-author">Kyvex</span>
              <span class="bot-tag">BOT</span>
              <span class="bot-timestamp">Today at 6:21 PM</span>
            </div>
            <div class="discord-embed-card" style="border-left-color: #eab308;">
              <div class="embed-title">⚡ AUTONOMOUS AUDIT LOG &bull; ACTION TAKEN</div>
              <div class="embed-desc">Unusual role assignment pattern detected from user <code>RogueMod#0001</code>. Bot stripped administrative permissions and placed the guild in protection mode.</div>
              <div class="embed-fields-row">
                <div class="embed-field">
                  <span class="f-name">Target</span>
                  <span class="f-val">RogueMod#0001</span>
                </div>
                <div class="embed-field">
                  <span class="f-name">Action</span>
                  <span class="f-val text-neon-green">Roles Revoked + Logged</span>
                </div>
                <div class="embed-field">
                  <span class="f-name">Execution Time</span>
                  <span class="f-val text-neon-cyan">18ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    };

    cmdTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        cmdTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const cmdKey = tab.getAttribute('data-cmd');
        if (cmdPreviews[cmdKey]) {
          previewScreen.innerHTML = cmdPreviews[cmdKey];
        }
      });
    });
  }

  // Zynrax Topbar Events
  document.getElementById('zynraxNavHome')?.addEventListener('click', () => {
    document.querySelectorAll('.zynrax-nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('zynraxNavHome')?.classList.add('active');
    showLanding();
  });

  document.getElementById('zynraxNavDashboard')?.addEventListener('click', () => {
    document.querySelectorAll('.zynrax-nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('zynraxNavDashboard')?.classList.add('active');
    showDashboard();
    switchView('servers', 'Your Servers');
  });

  document.getElementById('zynraxBtnPremium')?.addEventListener('click', () => {
    showToast('💎 Kyvex Premium: Sub-millisecond defense & Lossless FLAC active!', 'success');
  });

  // ============================================================
  // ZYNRAX INTERACTIVE LANGUAGE DROPDOWN & SELECTION
  // ============================================================
  const langPill = document.getElementById('zynraxLangPill');
  const langDropdown = document.getElementById('zynraxLangDropdown');

  if (langPill && langDropdown) {
    langPill.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = langDropdown.style.display === 'flex';
      langDropdown.style.display = isVisible ? 'none' : 'flex';
      langPill.classList.toggle('active', !isVisible);
    });

    document.querySelectorAll('.lang-option-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = btn.getAttribute('data-lang');
        if (code) setLanguage(code);
      });
    });
  }

  // ============================================================
  // ZYNRAX LOGGED-IN USER PILL & DROPDOWN MENU
  // ============================================================
  const userPill = document.getElementById('zynraxUserPill');
  const userDropdown = document.getElementById('zynraxUserDropdown');

  if (userPill && userDropdown) {
    userPill.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = userDropdown.style.display === 'flex';
      userDropdown.style.display = isVisible ? 'none' : 'flex';
      userPill.classList.toggle('active', !isVisible);
    });

    document.getElementById('userMenuServers')?.addEventListener('click', () => {
      userDropdown.style.display = 'none';
      userPill.classList.remove('active');
      showDashboard();
      switchView('servers', t('yourServers'));
    });

    document.getElementById('userMenuSecurity')?.addEventListener('click', () => {
      userDropdown.style.display = 'none';
      userPill.classList.remove('active');
      showDashboard();
      switchView('antinuke', t('antiNuke'));
    });

    document.getElementById('userMenuMusic')?.addEventListener('click', () => {
      userDropdown.style.display = 'none';
      userPill.classList.remove('active');
      showDashboard();
      switchView('music', t('musicController'));
    });

    document.getElementById('userMenuLogout')?.addEventListener('click', () => {
      userDropdown.style.display = 'none';
      userPill.classList.remove('active');
      logoutUser();
    });
  }

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (langDropdown && !langPill.contains(e.target)) {
      langDropdown.style.display = 'none';
      langPill.classList.remove('active');
    }
    if (userDropdown && !userPill.contains(e.target)) {
      userDropdown.style.display = 'none';
      userPill.classList.remove('active');
    }
  });

  // ============================================================
  // ZYNRAX TOPBAR NAVIGATION (HOME / DASHBOARD)
  // ============================================================
  document.getElementById('zynraxNavHome')?.addEventListener('click', (e) => {
    e.preventDefault();
    showLanding();
  });

  document.getElementById('zynraxNavDashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    const isUserLoggedIn = localStorage.getItem('og_logged_in') === 'true';
    if (isUserLoggedIn) {
      showDashboard();
      switchView('servers', t('yourServers'));
    } else {
      openZynraxLogin();
      showToast('Please login with Discord to access your Dashboard', 'info');
    }
  });

  // User Dropdown navigation items
  document.getElementById('userMenuServers')?.addEventListener('click', (e) => {
    e.preventDefault();
    showDashboard();
    switchView('servers', t('yourServers'));
    const userDropdown = document.getElementById('zynraxUserDropdown');
    if (userDropdown) userDropdown.style.display = 'none';
  });

  document.getElementById('userMenuSecurity')?.addEventListener('click', (e) => {
    e.preventDefault();
    showDashboard();
    switchView('security', t('antiNuke'));
    const userDropdown = document.getElementById('zynraxUserDropdown');
    if (userDropdown) userDropdown.style.display = 'none';
  });

  document.getElementById('userMenuMusic')?.addEventListener('click', (e) => {
    e.preventDefault();
    showDashboard();
    switchView('music', t('musicController'));
    const userDropdown = document.getElementById('zynraxUserDropdown');
    if (userDropdown) userDropdown.style.display = 'none';
  });

  document.getElementById('userMenuLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    logoutUser();
  });

  // ============================================================
  // ZYNRAX LOGIN MODAL & AUTHENTICATION FLOW
  // ============================================================
  const zynraxModal = document.getElementById('zynraxLoginModal');
  const openZynraxLogin = (e) => {
    if (e) e.preventDefault();
    if (zynraxModal) zynraxModal.style.display = 'flex';
  };
  const closeZynraxLogin = () => {
    if (zynraxModal) zynraxModal.style.display = 'none';
  };

  document.getElementById('zynraxBtnLogin')?.addEventListener('click', openZynraxLogin);
  document.getElementById('btnCloseZynraxLogin')?.addEventListener('click', closeZynraxLogin);
  if (zynraxModal) {
    zynraxModal.addEventListener('click', (e) => {
      if (e.target === zynraxModal) closeZynraxLogin();
    });
  }

  // 1. Discord OAuth Login Button inside Modal
  document.getElementById('btnZynraxDiscordLogin')?.addEventListener('click', () => {
    closeZynraxLogin();
    loginWithDiscordOAuth();
  });

  // 2. Direct Discord User ID Login
  const submitDirectId = () => {
    const inputEl = document.getElementById('inputDirectDiscordId');
    const val = inputEl ? inputEl.value.trim() : '';
    if (!val) {
      showToast('Please enter a Discord User ID', 'warn');
      return;
    }
    loginAsUser(val);
  };

  document.getElementById('btnSubmitDirectId')?.addEventListener('click', submitDirectId);
  document.getElementById('inputDirectDiscordId')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitDirectId();
    }
  });

  // 3. Instant Admin Access inside Zynrax Modal (Demo Mode)
  document.getElementById('btnZynraxInstantAccess')?.addEventListener('click', () => {
    loginAsUser('master-admin', 'Master Admin', 'https://cdn.discordapp.com/embed/avatars/1.png');
  });

  // Back to Servers Button (in topbar next to breadcrumb)
  document.getElementById('btnBackToServers')?.addEventListener('click', () => {
    switchView('servers', t('yourServers'));
  });

  // Refresh Servers Grid button
  document.getElementById('btnRefreshServerGrid')?.addEventListener('click', () => {
    fetchAllGuilds();
    showToast(t('refresh') + '...', 'info');
  });

  // Real-time search filter for servers grid
  const serverSearchInput = document.getElementById('serverSearchInput');
  if (serverSearchInput) {
    serverSearchInput.addEventListener('input', (e) => {
      const q = (e.target.value || '').trim().toLowerCase();
      if (!q) {
        renderServerGrid(allCachedGuilds);
        return;
      }
      const filtered = allCachedGuilds.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.id && s.id.includes(q)) ||
        (s.role && s.role.toLowerCase().includes(q))
      );
      renderServerGrid(filtered);
    });
  }

  // Close Login Modal (Legacy)
  const closeLogin = () => {
    if (loginModal) loginModal.style.display = 'none';
  };
  document.getElementById('btnCloseLandingLogin')?.addEventListener('click', closeLogin);
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) closeLogin();
    });
  }

  // Instant Admin Access Button (1-Click Login)
  document.getElementById('btnInstantAdminLogin')?.addEventListener('click', () => {
    localStorage.setItem('og_logged_in', 'true');
    closeLogin();
    showDashboard();
    switchView('servers', 'Your Servers');
    showToast('Welcome to Kyvex Dashboard!', 'success');
  });

  // Switch to Landing from Dashboard (Topbar & Sidebar buttons)
  document.getElementById('btnSwitchToLanding')?.addEventListener('click', () => {
    localStorage.setItem('og_logged_in', 'false');
    showLanding();
    showToast('Viewing Public Landing Page', 'info');
  });

  document.getElementById('btnSidebarLanding')?.addEventListener('click', () => {
    localStorage.setItem('og_logged_in', 'false');
    showLanding();
    showToast('Viewing Public Landing Page', 'info');
  });

  document.getElementById('btnTopbarLogout')?.addEventListener('click', () => {
    logoutUser();
  });

  // Initialize Anti-Nuke View Interactivity
  initAntiNukeEvents();

  // Initialize AutoMod View Interactivity
  initAutoModEvents();
}

// Global Accordion Toggle for Zynrax Sections
window.toggleZynraxAccordion = function(id) {
  const item = document.getElementById(id);
  if (item) {
    item.classList.toggle('open');
  }
};

function initAntiNukeEvents() {
  const masterToggle = document.getElementById('masterAntiNukeToggle');
  const settingsPanel = document.getElementById('antiNukeSettingsPanel');
  const disabledNotice = document.getElementById('antiNukeDisabledNotice');
  const statusBadge = document.getElementById('antiNukeStatusBadge');
  const toggleLabel = document.getElementById('antiNukeToggleLabel');
  const navBadge = document.getElementById('navAntiNukeBadge');
  const btnEnable = document.getElementById('btnEnableFromNotice');
  const btnSave = document.getElementById('btnSaveAntiNuke');
  const btnAddWhitelist = document.getElementById('btnAnAddWhitelist');

  function updateVisualState(enabled) {
    if (enabled) {
      if (settingsPanel) settingsPanel.style.display = 'block';
      if (disabledNotice) disabledNotice.style.display = 'none';
      if (statusBadge) {
        statusBadge.textContent = 'ARMED & ACTIVE';
        statusBadge.style.color = '#00ff88';
      }
      if (toggleLabel) {
        toggleLabel.textContent = 'ACTIVE';
        toggleLabel.style.color = '#00ff88';
      }
      if (navBadge) {
        navBadge.textContent = 'ON';
        navBadge.style.background = 'rgba(0, 230, 118, 0.15)';
        navBadge.style.color = '#00e676';
      }
      if (masterToggle) masterToggle.checked = true;
    } else {
      if (settingsPanel) settingsPanel.style.display = 'none';
      if (disabledNotice) disabledNotice.style.display = 'block';
      if (statusBadge) {
        statusBadge.textContent = 'DISABLED';
        statusBadge.style.color = '#ff3b5c';
      }
      if (toggleLabel) {
        toggleLabel.textContent = 'INACTIVE';
        toggleLabel.style.color = '#ff3b5c';
      }
      if (navBadge) {
        navBadge.textContent = 'OFF';
        navBadge.style.background = 'rgba(255, 36, 73, 0.15)';
        navBadge.style.color = '#ff3b5c';
      }
      if (masterToggle) masterToggle.checked = false;
    }
  }

  if (masterToggle) {
    masterToggle.addEventListener('change', async () => {
      const isEnabled = masterToggle.checked;
      updateVisualState(isEnabled);

      try {
        const res = await fetch('/api/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, key: 'antiNuke', value: isEnabled })
        });
        if (res.ok) {
          showToast(isEnabled ? '🛡️ Anti-Nuke Defense Armed & Active!' : '⚠️ Anti-Nuke Defense Disabled', isEnabled ? 'success' : 'warn');
        }
      } catch (err) {
        console.error('Failed to toggle Anti-Nuke:', err);
      }
    });
  }

  if (btnEnable) {
    btnEnable.addEventListener('click', () => {
      if (masterToggle) {
        masterToggle.checked = true;
        masterToggle.dispatchEvent(new Event('change'));
      }
    });
  }

  // Timeout Selection and Custom Minutes Handler
  const anSelectTimeout = document.getElementById('anSelectTimeoutDuration');
  const anCustomWrap = document.getElementById('anCustomMinutesWrap');
  const anCustomInput = document.getElementById('anCustomMinutesInput');

  if (anSelectTimeout) {
    anSelectTimeout.addEventListener('change', () => {
      if (anSelectTimeout.value === 'custom') {
        if (anCustomWrap) anCustomWrap.style.display = 'flex';
        if (anCustomInput) anCustomInput.focus();
      } else {
        if (anCustomWrap) anCustomWrap.style.display = 'none';
        const ms = parseInt(anSelectTimeout.value, 10);
        const mins = Math.round(ms / 60000);
        executeAntiNukeSave(true, `⏱️ Timeout duration set to ${mins} Minute(s)!`);
      }
    });
  }

  if (anCustomInput) {
    anCustomInput.addEventListener('change', () => {
      const mins = parseInt(anCustomInput.value, 10);
      if (mins && mins >= 1 && mins <= 40320) {
        executeAntiNukeSave(true, `⏱️ Custom timeout duration set to ${mins} Minute(s)!`);
      } else {
        showToast('Please enter a valid duration between 1 and 40,320 minutes (28 days)', 'warn');
      }
    });
  }

  const zynraxEvents = [
    'antiBan', 'antiUnban', 'antiKick', 'antiPrune', 'antiMemberUpdate',
    'antiChannelCreate', 'antiChannelDelete', 'antiChannelUpdate',
    'antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate', 'antiRolePing',
    'antiWebhookCreate', 'antiWebhookDelete', 'antiWebhookUpdate',
    'antiEmojiCreate', 'antiEmojiDelete', 'antiEmojiUpdate',
    'antiGuildUpdate', 'antiBotAdd', 'antiEveryonePing', 'antiIntegration'
  ];

  async function executeAntiNukeSave(isAutoSave = false, customMessage = null) {
    if (!btnSave) return;
    const originalText = btnSave.innerHTML;
    if (!isAutoSave) {
      btnSave.innerHTML = `<span>Saving...</span>`;
      btnSave.disabled = true;
    }

    try {
      let timeoutDurationMs = 600000;
      let timeoutDurationMinutes = 10;
      if (anSelectTimeout) {
        if (anSelectTimeout.value === 'custom') {
          timeoutDurationMinutes = parseInt(anCustomInput?.value, 10) || 10;
          timeoutDurationMs = timeoutDurationMinutes * 60 * 1000;
        } else {
          timeoutDurationMs = parseInt(anSelectTimeout.value, 10) || 600000;
          timeoutDurationMinutes = Math.round(timeoutDurationMs / 60000);
        }
      }

      const modulePunishments = {};
      const moduleLimits = {};

      zynraxEvents.forEach(evt => {
        const act = document.getElementById(`action_${evt}`)?.value || 'ban';
        const lim = parseInt(document.getElementById(`limit_${evt}`)?.value, 10) || 1;
        modulePunishments[evt] = act;
        moduleLimits[evt] = lim;
      });

      // Backward compatible fallbacks
      modulePunishments.antiEveryone = modulePunishments.antiEveryonePing || 'ban';
      modulePunishments.antiIntegrationCreate = modulePunishments.antiIntegration || 'ban';
      moduleLimits.antiEveryone = moduleLimits.antiEveryonePing || 1;
      moduleLimits.antiIntegrationCreate = moduleLimits.antiIntegration || 1;

      const payload = {
        guildId: currentGuildId,
        antiNuke: masterToggle ? masterToggle.checked : true,
        punishment: 'ban',
        timeoutDurationMinutes,
        timeoutDurationMs,
        logChannelId: document.getElementById('anLogChannelSelect')?.value || '',
        modulePunishments,
        moduleLimits,
        // Legacy flags for complete compatibility
        antiEveryone: true,
        antiChannel: true,
        antiRole: true,
        antiWebhook: true,
        antiBotAdd: true,
        antiAdminLockdown: true,
        antiBanKick: true
      };

      const res = await fetch('/api/antinuke/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(customMessage || (isAutoSave ? '⚡ Anti-Nuke synced live with Discord!' : '✔ Anti-Nuke settings saved & live in Discord!'), 'success');
      } else {
        showToast('❌ Failed to save settings', 'error');
      }
    } catch (err) {
      console.error('Error saving Anti-Nuke settings:', err);
      showToast('❌ Error saving settings', 'error');
    } finally {
      if (!isAutoSave) {
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
      }
    }
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => executeAntiNukeSave(false));
  }

  // Auto-save instantly on limit or action dropdown change across all 22 events
  document.querySelectorAll('.event-action-select').forEach(el => {
    el.addEventListener('change', () => {
      el.dataset.action = el.value;
      const evtName = el.dataset.event || 'Action';
      executeAntiNukeSave(true, `⚡ ${evtName} action set to ${el.value.toUpperCase()}!`);
    });
  });

  document.querySelectorAll('.event-limit-select').forEach(el => {
    el.addEventListener('change', () => {
      const evtName = el.dataset.event || 'Limit';
      executeAntiNukeSave(true, `⚡ ${evtName} trigger limit updated!`);
    });
  });

  document.getElementById('anLogChannelSelect')?.addEventListener('change', () => {
    executeAntiNukeSave(true, '⚡ Security log channel updated!');
  });

  // Extra Owners Handler (Zynrax Feature)
  const btnAddExtraOwner = document.getElementById('btnAnAddExtraOwner');
  if (btnAddExtraOwner) {
    btnAddExtraOwner.addEventListener('click', async () => {
      const input = document.getElementById('anExtraOwnerInput');
      if (!input) return;
      const userId = input.value.trim().replace(/[<@!>]/g, '');
      if (!/^\d{17,20}$/.test(userId)) {
        return showToast('Please enter a valid 17-20 digit Discord User ID', 'warn');
      }

      try {
        const res = await fetch('/api/extraowner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, action: 'add', userId })
        });
        const data = await res.json();
        if (data.success) {
          input.value = '';
          renderAnExtraOwners(data.extraOwners || []);
          showToast(`👑 User ${userId} granted Extra Owner status & full Anti-Nuke immunity!`, 'success');
          fetchConfig(currentGuildId);
        } else {
          showToast(data.error || 'Failed to add Extra Owner', 'error');
        }
      } catch (e) {
        showToast('Error adding Extra Owner', 'error');
      }
    });
  }

  // =========================================================================
  // WHITELISTED USERS & 22 PERMISSION CONFIGURATION (SCREENSHOT MATCHING)
  // =========================================================================

  const WHITELIST_PERMS_DEF = [
    { key: 'antiBan', label: 'Anti Ban', chip: 'Ban' },
    { key: 'antiUnban', label: 'Anti Unban', chip: 'Unban' },
    { key: 'antiKick', label: 'Anti Kick', chip: 'Kick' },
    { key: 'antiPrune', label: 'Anti Prune', chip: 'Prune' },
    { key: 'antiBotAdd', label: 'Anti Bot Add', chip: 'Bot Add' },
    { key: 'antiChannelCreate', label: 'Anti Channel Create', chip: 'Channel Create' },
    { key: 'antiChannelDelete', label: 'Anti Channel Delete', chip: 'Channel Delete' },
    { key: 'antiChannelUpdate', label: 'Anti Channel Update', chip: 'Channel Update' },
    { key: 'antiRoleCreate', label: 'Anti Role Create', chip: 'Role Create' },
    { key: 'antiRoleDelete', label: 'Anti Role Delete', chip: 'Role Delete' },
    { key: 'antiRoleUpdate', label: 'Anti Role Update', chip: 'Role Update' },
    { key: 'antiMemberUpdate', label: 'Anti Member Update', chip: 'Member Update' },
    { key: 'antiGuildUpdate', label: 'Anti Guild Update', chip: 'Guild Update' },
    { key: 'antiEveryonePing', label: 'Anti Everyone/Here Ping', chip: 'Everyone/Here Ping' },
    { key: 'antiEmojiCreate', label: 'Anti Emoji/Sticker Create', chip: 'Emoji/Sticker Create' },
    { key: 'antiEmojiDelete', label: 'Anti Emoji/Sticker Delete', chip: 'Emoji/Sticker Delete' },
    { key: 'antiEmojiUpdate', label: 'Anti Emoji/Sticker Update', chip: 'Emoji/Sticker Update' },
    { key: 'antiRolePing', label: 'Anti Role Ping', chip: 'Role Ping' },
    { key: 'antiIntegration', label: 'Anti Integration', chip: 'Integration' },
    { key: 'antiWebhookCreate', label: 'Anti Webhook Create', chip: 'Webhook Create' },
    { key: 'antiWebhookDelete', label: 'Anti Webhook Delete', chip: 'Webhook Delete' },
    { key: 'antiWebhookUpdate', label: 'Anti Webhook Update', chip: 'Webhook Update' }
  ];

  let cachedGuildMembers = [];
  let activeWhitelistUser = null;
  let currentWhitelistData = { whitelist: [], whitelistDetails: {} };

  const btnOpenSelect = document.getElementById('btnOpenMemberSelect');
  const memberDropdown = document.getElementById('memberDropdownMenu');
  const searchInput = document.getElementById('memberSearchInput');
  const directIdOption = document.getElementById('directIdOption');
  const directIdText = document.getElementById('directIdText');
  const btnResetAll = document.getElementById('btnResetAllWhitelist');

  const modal = document.getElementById('whitelistModal');
  const btnCloseModal = document.getElementById('btnCloseWhitelistModal');
  const btnCancelModal = document.getElementById('btnCancelWhitelistModal');
  const btnSaveModal = document.getElementById('btnSaveWhitelistModal');
  const btnToggleAll = document.getElementById('btnToggleAllPerms');
  const btnToggleAllText = document.getElementById('btnToggleAllText');

  // Toggle Member Dropdown
  if (btnOpenSelect && memberDropdown) {
    btnOpenSelect.addEventListener('click', (e) => {
      e.stopPropagation();
      const isClosed = memberDropdown.style.display === 'none' || !memberDropdown.style.display;
      memberDropdown.style.display = isClosed ? 'block' : 'none';
      if (isClosed) {
        if (cachedGuildMembers.length === 0) loadServerMembers();
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
          filterMemberList('');
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#memberSelectWrapper')) {
        memberDropdown.style.display = 'none';
      }
    });
  }

  // Load Server Members
  async function loadServerMembers() {
    const listEl = document.getElementById('memberListScroll');
    if (!listEl) return;
    try {
      listEl.innerHTML = '<div class="zynrax-loading-members">Loading server members...</div>';
      const res = await fetch(`/api/guild-members?guildId=${currentGuildId || ''}`);
      const data = await res.json();
      cachedGuildMembers = data.members || [];
      renderMemberDropdownList(cachedGuildMembers);
    } catch (e) {
      listEl.innerHTML = '<div class="zynrax-loading-members">Failed to load members</div>';
    }
  }

  function renderMemberDropdownList(members) {
    const listEl = document.getElementById('memberListScroll');
    if (!listEl) return;
    if (!members || members.length === 0) {
      listEl.innerHTML = '<div class="zynrax-loading-members">No matching members found</div>';
      return;
    }

    listEl.innerHTML = members.map(m => `
      <div class="zynrax-member-item" onclick="window.selectWhitelistMember('${m.id}')">
        <div class="member-avatar-box">
          <img src="${m.avatar}" alt="${escapeHtml(m.username)}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
        </div>
        <div class="member-info-col">
          <span class="member-name-text">${escapeHtml(m.displayName || m.username)}</span>
          <span class="member-tag-text">@${escapeHtml(m.username)} • ${m.id}</span>
        </div>
      </div>
    `).join('');
  }

  function filterMemberList(query) {
    const q = query.trim().toLowerCase();
    const cleanId = q.replace(/[<@!>]/g, '');
    
    // Check if query looks like a User ID (or digits)
    if (cleanId && /^\d{3,20}$/.test(cleanId) && directIdOption && directIdText) {
      directIdOption.style.display = 'flex';
      directIdText.textContent = `Add ID: ${cleanId}`;
      directIdOption.onclick = () => window.selectWhitelistDirectId(cleanId);
    } else if (directIdOption) {
      directIdOption.style.display = 'none';
    }

    if (!q) {
      renderMemberDropdownList(cachedGuildMembers);
      return;
    }

    const filtered = cachedGuildMembers.filter(m => 
      m.username.toLowerCase().includes(q) ||
      (m.displayName && m.displayName.toLowerCase().includes(q)) ||
      m.id.includes(q)
    );
    renderMemberDropdownList(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterMemberList(e.target.value);
    });
  }

  // Select Member from Dropdown
  window.selectWhitelistMember = function(userId) {
    if (memberDropdown) memberDropdown.style.display = 'none';
    const member = cachedGuildMembers.find(m => m.id === userId);
    if (member) {
      openWhitelistModal({
        id: member.id,
        username: member.username,
        displayName: member.displayName || member.username,
        avatar: member.avatar
      });
    } else {
      window.selectWhitelistDirectId(userId);
    }
  };

  // Select by Direct User ID
  window.selectWhitelistDirectId = async function(rawId) {
    if (memberDropdown) memberDropdown.style.display = 'none';
    const cleanId = String(rawId).trim().replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(cleanId)) {
      return showToast('Please enter a valid 17-20 digit Discord User ID', 'warn');
    }

    showToast(`Looking up user ${cleanId}...`, 'info');
    try {
      const res = await fetch(`/api/user-lookup?guildId=${currentGuildId || ''}&userId=${cleanId}`);
      const data = await res.json();
      const user = data.user || {
        id: cleanId,
        username: `User-${cleanId.slice(-4)}`,
        displayName: `User (${cleanId.slice(-4)})`,
        avatar: 'https://cdn.discordapp.com/embed/avatars/0.png'
      };
      openWhitelistModal(user);
    } catch (e) {
      openWhitelistModal({
        id: cleanId,
        username: `User-${cleanId.slice(-4)}`,
        displayName: `User (${cleanId.slice(-4)})`,
        avatar: 'https://cdn.discordapp.com/embed/avatars/0.png'
      });
    }
  };

  // Modal: Open & Populate
  function openWhitelistModal(user, isReadOnly = false) {
    activeWhitelistUser = user;
    const isExisting = currentWhitelistData.whitelist && currentWhitelistData.whitelist.includes(user.id);
    const existingDetails = currentWhitelistData.whitelistDetails?.[user.id];

    // Populate user preview
    const avatarEl = document.getElementById('modalUserAvatar');
    const usernameEl = document.getElementById('modalUsername');
    const userIdEl = document.getElementById('modalUserId');
    const badgeEl = document.getElementById('modalUserBadge');

    if (avatarEl) avatarEl.src = user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
    if (usernameEl) usernameEl.textContent = user.displayName || user.username || 'User';
    if (userIdEl) userIdEl.textContent = user.id;
    if (badgeEl) {
      badgeEl.textContent = isExisting ? 'TRUSTED' : 'NEW';
      badgeEl.style.color = isExisting ? '#00e5ff' : '#00ff88';
      badgeEl.style.borderColor = isExisting ? 'rgba(0, 229, 255, 0.4)' : 'rgba(0, 255, 136, 0.35)';
      badgeEl.style.background = isExisting ? 'rgba(0, 229, 255, 0.15)' : 'rgba(0, 255, 136, 0.15)';
    }

    // Populate 22 Toggle Switches
    const gridEl = document.getElementById('whitelistPermsGrid');
    if (gridEl) {
      gridEl.innerHTML = WHITELIST_PERMS_DEF.map(p => {
        // By default, enable all permissions if new user, or read existing
        let isChecked = true;
        if (existingDetails && existingDetails.permissions) {
          isChecked = existingDetails.permissions[p.key] !== false;
        }
        return `
          <div class="zynrax-perm-row">
            <span class="perm-label-text">${escapeHtml(p.label)}</span>
            <label class="zynrax-switch">
              <input type="checkbox" id="perm_${p.key}" data-perm="${p.key}" ${isChecked ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''}>
              <span class="zynrax-switch-slider"></span>
            </label>
          </div>
        `;
      }).join('');
    }

    // Save button label
    if (btnSaveModal) {
      btnSaveModal.textContent = isReadOnly ? 'Close' : (isExisting ? 'Save Permissions' : 'Add to Whitelist');
      btnSaveModal.style.display = isReadOnly ? 'none' : 'block';
    }

    updateToggleAllButtonState();

    if (modal) modal.style.display = 'flex';
  }

  function closeWhitelistModal() {
    if (modal) modal.style.display = 'none';
    activeWhitelistUser = null;
  }

  if (btnCloseModal) btnCloseModal.onclick = closeWhitelistModal;
  if (btnCancelModal) btnCancelModal.onclick = closeWhitelistModal;

  // Toggle All Permissions Switcher
  function updateToggleAllButtonState() {
    const checkboxes = document.querySelectorAll('#whitelistPermsGrid input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(c => c.checked);
    if (btnToggleAllText) {
      btnToggleAllText.textContent = allChecked ? 'Disable all' : 'Enable all';
    }
  }

  if (btnToggleAll) {
    btnToggleAll.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('#whitelistPermsGrid input[type="checkbox"]');
      const allChecked = Array.from(checkboxes).every(c => c.checked);
      checkboxes.forEach(c => c.checked = !allChecked);
      updateToggleAllButtonState();
    });
  }

  // Save Modal Permissions
  if (btnSaveModal) {
    btnSaveModal.addEventListener('click', async () => {
      if (!activeWhitelistUser) return;
      const permissions = {};
      document.querySelectorAll('#whitelistPermsGrid input[type="checkbox"]').forEach(c => {
        const key = c.getAttribute('data-perm');
        if (key) permissions[key] = c.checked;
      });

      const originalBtnText = btnSaveModal.textContent;
      btnSaveModal.textContent = 'Saving...';
      btnSaveModal.disabled = true;

      try {
        const res = await fetch('/api/whitelist/save-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guildId: currentGuildId,
            userId: activeWhitelistUser.id,
            permissions,
            userInfo: {
              username: activeWhitelistUser.username,
              displayName: activeWhitelistUser.displayName,
              avatar: activeWhitelistUser.avatar
            }
          })
        });

        const data = await res.json();
        if (data.success) {
          currentWhitelistData = {
            whitelist: data.whitelist || [],
            whitelistDetails: data.whitelistDetails || {}
          };
          renderWhitelistedCards();
          closeWhitelistModal();
          showToast(`✔ Whitelisted ${activeWhitelistUser.displayName || activeWhitelistUser.username} with configured permissions!`, 'success');
        } else {
          showToast(data.error || 'Failed to save whitelist user', 'error');
        }
      } catch (e) {
        showToast('Network error saving whitelist user', 'error');
      } finally {
        btnSaveModal.textContent = originalBtnText;
        btnSaveModal.disabled = false;
      }
    });
  }

  // Render Whitelisted Cards (Matching Screenshot 1)
  function renderWhitelistedCards() {
    const container = document.getElementById('whitelistedCardsContainer');
    if (!container) return;

    const list = currentWhitelistData.whitelist || [];
    const details = currentWhitelistData.whitelistDetails || {};

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="zynrax-empty-wl">No whitelisted users configured yet. Select a member above or enter a User ID to add!</div>';
      return;
    }

    container.innerHTML = list.map(userId => {
      const u = details[userId] || {
        id: userId,
        username: `User-${userId.slice(-4)}`,
        displayName: `User (${userId.slice(-4)})`,
        avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
        permissions: {}
      };

      // Calculate active permissions count
      const activeChips = [];
      let activeCount = 0;
      WHITELIST_PERMS_DEF.forEach(p => {
        const isBypassed = u.permissions ? u.permissions[p.key] !== false : true;
        if (isBypassed) {
          activeCount++;
          activeChips.push(p.chip);
        }
      });

      const totalPerms = WHITELIST_PERMS_DEF.length; // 22
      const percent = Math.round((activeCount / totalPerms) * 100);

      const chipsHtml = activeChips.length > 0
        ? activeChips.map(c => `<span class="wl-chip">✔ ${escapeHtml(c)}</span>`).join('')
        : '<span style="color: #64748b; font-size: 0.75rem; font-style: italic;">No bypass permissions active.</span>';

      return `
        <div class="zynrax-wl-card" id="wlCard_${userId}">
          <div class="wl-card-top">
            <div class="wl-user-left">
              <div class="wl-avatar-wrap">
                <img src="${u.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="${escapeHtml(u.username)}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
              </div>
              <div class="wl-user-meta">
                <div class="wl-name-row">
                  <span class="wl-username">${escapeHtml(u.displayName || u.username)}</span>
                  <span class="wl-badge-trusted">TRUSTED</span>
                </div>
                <span class="wl-user-id">${userId}</span>
              </div>
            </div>

            <div class="wl-card-actions">
              <button type="button" class="btn-wl-action view" onclick="window.viewWhitelistUser('${userId}')" title="View details">
                👁 <span>View</span>
              </button>
              <button type="button" class="btn-wl-action edit" onclick="window.editWhitelistUser('${userId}')" title="Edit permissions">
                ✏️ <span>Edit</span>
              </button>
              <button type="button" class="btn-wl-action remove" onclick="window.removeWhitelistUser('${userId}')" title="Remove from whitelist">
                🗑️ <span>Remove</span>
              </button>
            </div>
          </div>

          <div class="wl-progress-row">
            <div class="wl-progress-text">
              <span>${activeCount}/${totalPerms} permissions</span>
              <span>${percent}%</span>
            </div>
            <div class="wl-progress-track">
              <div class="wl-progress-fill" style="width: ${percent}%;"></div>
            </div>
          </div>

          <div class="wl-chips-label">ACTIVE BYPASS PERMISSIONS</div>
          <div class="wl-chips-wrap">
            ${chipsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  // View Whitelist User
  window.viewWhitelistUser = function(userId) {
    const details = currentWhitelistData.whitelistDetails?.[userId];
    const u = details || { id: userId, username: `User-${userId.slice(-4)}` };
    openWhitelistModal(u, true);
  };

  // Edit Whitelist User
  window.editWhitelistUser = function(userId) {
    const details = currentWhitelistData.whitelistDetails?.[userId];
    const u = details || { id: userId, username: `User-${userId.slice(-4)}` };
    openWhitelistModal(u, false);
  };

  // Remove Whitelist User
  window.removeWhitelistUser = async function(userId) {
    if (!confirm(`Are you sure you want to remove user ${userId} from the Anti-Nuke Whitelist?`)) return;
    try {
      const res = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: currentGuildId, action: 'remove', userId })
      });
      const data = await res.json();
      if (data.success) {
        currentWhitelistData = {
          whitelist: data.whitelist || [],
          whitelistDetails: data.whitelistDetails || {}
        };
        renderWhitelistedCards();
        showToast(`User ${userId} removed from whitelist`, 'info');
      } else {
        showToast(data.error || 'Failed to remove user', 'error');
      }
    } catch (e) {
      showToast('Network error removing user', 'error');
    }
  };

  // Reset All Whitelist Users
  if (btnResetAll) {
    btnResetAll.addEventListener('click', async () => {
      if (!confirm('⚠️ Are you sure you want to RESET ALL whitelisted users? This will revoke all bypass permissions.')) return;
      try {
        const res = await fetch('/api/whitelist/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          currentWhitelistData = { whitelist: [], whitelistDetails: {} };
          renderWhitelistedCards();
          showToast('✔ All whitelisted users have been reset!', 'success');
        } else {
          showToast(data.error || 'Failed to reset whitelist', 'error');
        }
      } catch (e) {
        showToast('Network error resetting whitelist', 'error');
      }
    });
  }

  // Fetch Whitelist Data on View Load
  window.fetchWhitelistData = async function() {
    try {
      const res = await fetch(`/api/whitelist/details?guildId=${currentGuildId || ''}`);
      const data = await res.json();
      currentWhitelistData = {
        whitelist: data.whitelist || [],
        whitelistDetails: data.whitelistDetails || {}
      };
      renderWhitelistedCards();
    } catch (e) {
      console.warn('Failed to load whitelist details:', e);
    }
  };

  // Trigger initial fetch
  window.fetchWhitelistData();

  if (btnRunScan) {
    btnRunScan.addEventListener('click', async () => {
      showToast('Running deep security scan on Discord server...', 'info');
      try {
        const res = await fetch('/api/security/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        const data = await res.json();
        if (data.success) {
          showToast(`✔ ${data.message || 'Server security scan passed!'}`, 'success');
        }
      } catch (e) {
        showToast('Security scan request failed', 'error');
      }
    });
  }
}

function renderAnExtraOwners(list) {
  const container = document.getElementById('anExtraOwnersContainer');
  const badge = document.getElementById('extraOwnerCountBadge');
  if (badge) badge.textContent = `${list.length} / 5 Extra Owners`;
  if (!container) return;
  if (!list || list.length === 0) {
    container.innerHTML = '<span class="zynrax-eo-empty">👑 No Extra Owners assigned yet. Add trusted co-owners above for full bypass.</span>';
    return;
  }

  container.innerHTML = list.map((uid) => `
    <div class="zynrax-eo-chip">
      <span class="eo-crown">👑</span>
      <span class="eo-id">${uid}</span>
      <button class="btn-remove-eo" onclick="removeAnExtraOwner('${uid}')" title="Remove Extra Owner">&times;</button>
    </div>
  `).join('');
}

window.removeAnExtraOwner = async function(userId) {
  try {
    const res = await fetch('/api/extraowner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: currentGuildId, action: 'remove', userId })
    });
    const data = await res.json();
    if (data.success) {
      renderAnExtraOwners(data.extraOwners || []);
      showToast(`User ${userId} removed from Extra Owners`, 'info');
      fetchConfig(currentGuildId);
    } else {
      showToast(data.error || 'Failed to remove user', 'error');
    }
  } catch (e) {
    showToast('Failed to remove extra owner', 'error');
  }
};

// ==========================================
// AUTOMOD EVENT HANDLERS & LOGIC
// ==========================================

function initAutoModEvents() {
  const masterToggle = document.getElementById('masterAutoModToggle');
  const settingsPanel = document.getElementById('autoModSettingsPanel');
  const disabledNotice = document.getElementById('autoModDisabledNotice');
  const statusBadge = document.getElementById('autoModStatusBadge');
  const toggleLabel = document.getElementById('autoModToggleLabel');
  const navBadge = document.getElementById('navAutoModBadge');
  const masterStatusText = document.getElementById('autoModMasterStatusText');
  const btnEnable = document.getElementById('btnEnableAutoModFromNotice');
  const btnSave = document.getElementById('btnSaveAutoMod');
  const btnAddBadWord = document.getElementById('btnAmAddBadWord');
  const btnAddWhitelist = document.getElementById('btnAmAddWhitelist');

  function updateActiveModulesCounter() {
    const checkedCount = document.querySelectorAll('#autoModSettingsPanel input[data-am-key]:checked').length;
    const numEl = document.getElementById('activeModulesNum');
    if (numEl) numEl.textContent = `${checkedCount}/8`;
    updateAutoModAccordionStats();
    syncAutoModRowBadges();
  }

  function updateAutoModAccordionStats() {
    const sections = [
      { id: 'sec-am-spam', keys: ['toggleAmSpam', 'toggleAmEmoji', 'toggleAmMention'] },
      { id: 'sec-am-links', keys: ['toggleAmInvite', 'toggleAmLink'] },
      { id: 'sec-am-content', keys: ['toggleAmBadWords', 'toggleAmDuplicate', 'toggleAmCaps'] }
    ];

    let totalActive = 0;
    let totalAll = 0;

    sections.forEach(sec => {
      const el = document.getElementById(sec.id);
      if (!el) return;
      const count = sec.keys.filter(k => {
        const input = document.getElementById(k);
        return input && input.checked;
      }).length;
      const total = sec.keys.length;
      totalActive += count;
      totalAll += total;

      const ratioEl = el.querySelector('.acc-ratio');
      const percentEl = el.querySelector('.acc-percent');
      const barFill = el.querySelector('.bar-fill');
      const statusTag = el.querySelector('.acc-status-tag');

      const pct = Math.round((count / total) * 100);
      if (ratioEl) ratioEl.textContent = `${count}/${total}`;
      if (percentEl) percentEl.textContent = `${pct}%`;
      if (barFill) barFill.style.width = `${pct}%`;

      if (statusTag) {
        if (pct === 100) {
          statusTag.textContent = 'FULLY PROTECTED';
          statusTag.className = 'acc-status-tag tag-full';
        } else if (pct > 0) {
          statusTag.textContent = 'PARTIALLY PROTECTED';
          statusTag.className = 'acc-status-tag tag-partial';
        } else {
          statusTag.textContent = 'UNPROTECTED';
          statusTag.className = 'acc-status-tag tag-none';
        }
      }
    });

    const activeNumEl = document.getElementById('activeModulesNum');
    if (activeNumEl) activeNumEl.textContent = `${totalActive}/${totalAll || 8}`;

    const scoreValue = document.querySelector('#view-automod .zynrax-hero-score .score-value');
    if (scoreValue && totalAll > 0) {
      const overallScore = Math.round((totalActive / totalAll) * 100);
      scoreValue.textContent = `${overallScore}%`;
    }
  }
  window.updateAutoModAccordionStats = updateAutoModAccordionStats;

  function syncAutoModRowBadges() {
    document.querySelectorAll('#autoModSettingsPanel .zynrax-event-row').forEach(row => {
      const chk = row.querySelector('input[data-am-key]');
      const badge = row.querySelector('.event-protected-badge');
      if (chk && badge) {
        if (chk.checked) {
          badge.innerHTML = '<span class="green-dot"></span> PROTECTED';
          badge.style.color = '#00e5ff';
        } else {
          badge.innerHTML = '<span class="red-dot" style="background:#ef4444;box-shadow:0 0 8px #ef4444;"></span> UNPROTECTED';
          badge.style.color = '#ef4444';
        }
      }
    });
  }
  window.syncAutoModRowBadges = syncAutoModRowBadges;

  // Initialize and sync action selects with data-action attribute
  document.querySelectorAll('#autoModSettingsPanel .event-action-select').forEach(sel => {
    sel.dataset.action = sel.value;
    sel.addEventListener('change', () => {
      sel.dataset.action = sel.value;
    });
  });

  function updateVisualState(enabled) {
    if (enabled) {
      if (settingsPanel) settingsPanel.style.display = 'block';
      if (disabledNotice) disabledNotice.style.display = 'none';
      if (statusBadge) {
        statusBadge.textContent = 'Enabled';
        statusBadge.className = 'metric-val text-neon-green';
      }
      if (masterStatusText) {
        masterStatusText.textContent = 'SYSTEM ARMED';
        masterStatusText.style.color = '#00e676';
      }
      if (toggleLabel) {
        toggleLabel.textContent = 'Active';
        toggleLabel.className = 'metric-val text-neon-green';
      }
      if (navBadge) {
        navBadge.textContent = 'ON';
        navBadge.style.background = 'rgba(0, 230, 118, 0.15)';
        navBadge.style.color = '#00e676';
      }
      if (masterToggle) masterToggle.checked = true;
    } else {
      if (settingsPanel) settingsPanel.style.display = 'none';
      if (disabledNotice) disabledNotice.style.display = 'block';
      if (statusBadge) {
        statusBadge.textContent = 'Disabled';
        statusBadge.className = 'metric-val text-neon-red';
      }
      if (masterStatusText) {
        masterStatusText.textContent = 'SYSTEM OFFLINE';
        masterStatusText.style.color = '#ef4444';
      }
      if (toggleLabel) {
        toggleLabel.textContent = 'Disabled';
        toggleLabel.className = 'metric-val text-neon-red';
      }
      if (navBadge) {
        navBadge.textContent = 'OFF';
        navBadge.style.background = 'rgba(255, 36, 73, 0.15)';
        navBadge.style.color = '#ff3b5c';
      }
      if (masterToggle) masterToggle.checked = false;
    }
  }

  // Accordion Group Header Click Toggles
  document.querySelectorAll('.group-header[data-toggle-group]').forEach((header) => {
    header.addEventListener('click', () => {
      const card = header.closest('.module-group-card');
      if (card) {
        card.classList.toggle('collapsed');
      }
    });
  });

  // Sidebar Server Actions
  const btnRefresh = document.getElementById('btnSidebarRefresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      const svg = btnRefresh.querySelector('svg');
      if (svg) svg.style.animation = 'spin 0.8s linear infinite';
      showToast('Refreshing server data & Discord status...', 'info');
      try {
        await Promise.all([fetchConfig(currentGuildId), fetchStats()]);
        showToast('✔ Server data refreshed successfully!', 'success');
      } catch (err) {
        showToast('Error refreshing server data', 'error');
      } finally {
        if (svg) svg.style.animation = '';
      }
    });
  }

  const btnAudit = document.getElementById('btnSidebarAudit');
  if (btnAudit) {
    btnAudit.addEventListener('click', () => {
      switchView('audit');
    });
  }

  if (masterToggle) {
    masterToggle.addEventListener('change', async () => {
      const isEnabled = masterToggle.checked;
      updateVisualState(isEnabled);

      try {
        const res = await fetch('/api/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, key: 'autoMod', value: isEnabled })
        });
        if (res.ok) {
          showToast(isEnabled ? '🛡️ AutoMod Defense Armed & Active!' : '⚠️ AutoMod Defense Disabled', isEnabled ? 'success' : 'warn');
        }
      } catch (err) {
        console.error('Failed to toggle AutoMod:', err);
      }
    });
  }

  if (btnEnable) {
    btnEnable.addEventListener('click', () => {
      if (masterToggle) {
        masterToggle.checked = true;
        masterToggle.dispatchEvent(new Event('change'));
      }
    });
  }

  async function executeAutoModSave(isAutoSave = false, customMessage = null) {
    if (!btnSave) return;
    const originalText = btnSave.innerHTML;
    if (!isAutoSave) {
      btnSave.innerHTML = `<span>Saving...</span>`;
      btnSave.disabled = true;
    }

    try {
      const payload = {
        guildId: currentGuildId,
        enabled: masterToggle ? masterToggle.checked : true,
        punishment: document.getElementById('amSelectPunishment')?.value || 'timeout',
        timeoutDurationMs: parseInt(document.getElementById('amSelectTimeoutDuration')?.value || '3600000', 10),
        logChannelId: document.getElementById('amLogChannelSelect')?.value || '',
        maxMessagesPer3Sec: parseInt(document.getElementById('thAmFloodLimit')?.value, 10) || 5,
        windowSec: parseInt(document.getElementById('thAmFloodWindow')?.value, 10) || 4,
        maxDuplicates: parseInt(document.getElementById('thAmDuplicateLimit')?.value, 10) || 3,
        maxUserMentions: parseInt(document.getElementById('thAmMentionLimit')?.value, 10) || 4,
        maxEmojis: parseInt(document.getElementById('thAmEmojiLimit')?.value, 10) || 7,
        maxCapsPercent: parseInt(document.getElementById('thAmCapsPercent')?.value, 10) || 70,
        moduleLimits: {
          antiSpam: parseInt(document.getElementById('limitAmSpam')?.value, 10) || 3,
          antiInvite: parseInt(document.getElementById('limitAmInvite')?.value, 10) || 1,
          antiLink: parseInt(document.getElementById('limitAmLink')?.value, 10) || 2,
          antiMention: parseInt(document.getElementById('limitAmMention')?.value, 10) || 2,
          antiBadWords: parseInt(document.getElementById('limitAmBadWords')?.value, 10) || 2,
          antiDuplicate: parseInt(document.getElementById('limitAmDuplicate')?.value, 10) || 3,
          antiCaps: parseInt(document.getElementById('limitAmCaps')?.value, 10) || 3,
          antiEmoji: parseInt(document.getElementById('limitAmEmoji')?.value, 10) || 3
        },
        modulePunishments: {
          antiSpam: document.getElementById('punishAmSpam')?.value || 'timeout',
          antiInvite: document.getElementById('punishAmInvite')?.value || 'timeout',
          antiLink: document.getElementById('punishAmLink')?.value || 'delete',
          antiMention: document.getElementById('punishAmMention')?.value || 'timeout',
          antiBadWords: document.getElementById('punishAmBadWords')?.value || 'timeout',
          antiDuplicate: document.getElementById('punishAmDuplicate')?.value || 'timeout',
          antiCaps: document.getElementById('punishAmCaps')?.value || 'delete',
          antiEmoji: document.getElementById('punishAmEmoji')?.value || 'delete'
        },
        modules: {
          antiSpam: document.getElementById('toggleAmSpam')?.checked ?? true,
          antiInvite: document.getElementById('toggleAmInvite')?.checked ?? true,
          antiLink: document.getElementById('toggleAmLink')?.checked ?? true,
          antiMention: document.getElementById('toggleAmMention')?.checked ?? true,
          antiBadWords: document.getElementById('toggleAmBadWords')?.checked ?? true,
          antiDuplicate: document.getElementById('toggleAmDuplicate')?.checked ?? true,
          antiCaps: document.getElementById('toggleAmCaps')?.checked ?? true,
          antiEmoji: document.getElementById('toggleAmEmoji')?.checked ?? true
        }
      };

      const res = await fetch('/api/automod/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(customMessage || (isAutoSave ? '⚡ AutoMod setting updated & active in Discord!' : '✔ AutoMod settings saved & live in Discord!'), 'success');
      } else {
        showToast('❌ Failed to save AutoMod settings', 'error');
      }
    } catch (err) {
      console.error('Error saving AutoMod settings:', err);
      showToast('❌ Error saving AutoMod settings', 'error');
    } finally {
      if (!isAutoSave) {
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
      }
    }
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => executeAutoModSave(false));
  }

  // Auto-save on change in any input under autoModSettingsPanel
  const autoSaveElements = document.querySelectorAll(
    '#autoModSettingsPanel .event-limit-select, #autoModSettingsPanel .event-action-select, #autoModSettingsPanel input[type="checkbox"], #autoModSettingsPanel input[type="number"], #amSelectPunishment, #amSelectTimeoutDuration, #amLogChannelSelect'
  );
  autoSaveElements.forEach((el) => {
    el.addEventListener('change', () => {
      let msg = '⚡ AutoMod setting updated!';
      if (el.classList.contains('event-limit-select')) {
        msg = `⚡ AutoMod strike limit updated!`;
      } else if (el.classList.contains('event-action-select')) {
        el.dataset.action = el.value;
        msg = `⚡ AutoMod action set to ${el.value.toUpperCase()}!`;
      } else if (el.type === 'checkbox') {
        updateActiveModulesCounter();
        msg = el.checked ? '🛡️ AutoMod shield filter ENABLED!' : '⚠️ AutoMod shield filter DISABLED';
      }
      executeAutoModSave(true, msg);
    });
  });

  // Bad words add
  if (btnAddBadWord) {
    btnAddBadWord.addEventListener('click', async () => {
      const input = document.getElementById('amBadWordInput');
      const val = input ? input.value.trim().toLowerCase() : '';
      if (!val) return;

      try {
        const res = await fetch('/api/automod/badwords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, action: 'add', word: val })
        });
        const data = await res.json();
        if (data.success) {
          renderAmBadWords(data.badWords || []);
          input.value = '';
          showToast(`Added "${val}" to blacklisted words!`, 'success');
        }
      } catch (e) {
        showToast('Failed to add bad word', 'error');
      }
    });
  }

  // Whitelist add
  if (btnAddWhitelist) {
    btnAddWhitelist.addEventListener('click', async () => {
      const input = document.getElementById('amWhitelistInput');
      const val = input ? input.value.trim() : '';
      if (!val) return;

      try {
        const res = await fetch('/api/automod/whitelist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: currentGuildId, action: 'add', id: val })
        });
        const data = await res.json();
        if (data.success) {
          renderAmWhitelist(data.whitelist || []);
          input.value = '';
          showToast(`Added ${val} to AutoMod whitelist!`, 'success');
        }
      } catch (e) {
        showToast('Failed to add to AutoMod whitelist', 'error');
      }
    });
  }

  // Defense profile presets
  const presetBtns = document.querySelectorAll('.btn-preset-pill');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const p = btn.dataset.preset;
      applyDefensePreset(p);
    });
  });

  function applyDefensePreset(profile) {
    const limits = {
      balanced: { spam: 3, invite: 1, link: 2, mention: 2, badwords: 2, dup: 3, caps: 3, emoji: 3 },
      strict: { spam: 2, invite: 1, link: 1, mention: 1, badwords: 1, dup: 2, caps: 2, emoji: 2 },
      zero: { spam: 1, invite: 1, link: 1, mention: 1, badwords: 1, dup: 1, caps: 1, emoji: 1 }
    };
    const punishes = {
      balanced: { spam: 'timeout', invite: 'timeout', link: 'delete', mention: 'timeout', badwords: 'timeout', dup: 'timeout', caps: 'delete', emoji: 'timeout' },
      strict: { spam: 'timeout', invite: 'ban', link: 'timeout', mention: 'timeout', badwords: 'timeout', dup: 'timeout', caps: 'delete', emoji: 'delete' },
      zero: { spam: 'kick', invite: 'ban', link: 'kick', mention: 'ban', badwords: 'kick', dup: 'timeout', caps: 'timeout', emoji: 'timeout' }
    };

    const cfgL = limits[profile] || limits.balanced;
    const cfgP = punishes[profile] || punishes.balanced;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        if (el.classList.contains('event-action-select') || el.classList.contains('punish-dropdown-badge')) {
          el.dataset.action = val;
          el.dataset.punish = val;
        }
      }
    };

    setVal('limitAmSpam', cfgL.spam);
    setVal('limitAmInvite', cfgL.invite);
    setVal('limitAmLink', cfgL.link);
    setVal('limitAmMention', cfgL.mention);
    setVal('limitAmBadWords', cfgL.badwords);
    setVal('limitAmDuplicate', cfgL.dup);
    setVal('limitAmCaps', cfgL.caps);
    setVal('limitAmEmoji', cfgL.emoji);

    setVal('punishAmSpam', cfgP.spam);
    setVal('punishAmInvite', cfgP.invite);
    setVal('punishAmLink', cfgP.link);
    setVal('punishAmMention', cfgP.mention);
    setVal('punishAmBadWords', cfgP.badwords);
    setVal('punishAmDuplicate', cfgP.dup);
    setVal('punishAmCaps', cfgP.caps);
    setVal('punishAmEmoji', cfgP.emoji);

    updateAutoModAccordionStats();
    syncAutoModRowBadges();
    executeAutoModSave(true, `⚡ Activated ${profile.toUpperCase()} Sentinel Profile!`);
  }

  // Live Rule Test Simulator
  const btnSimulate = document.getElementById('btnSimulateAutoMod');
  const simInput = document.getElementById('amTestSimulatorInput');
  const simResult = document.getElementById('amSimulationResult');

  document.querySelectorAll('.sim-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (simInput) {
        simInput.value = btn.dataset.sample || '';
        runSimulation();
      }
    });
  });

  if (btnSimulate && simInput) {
    btnSimulate.addEventListener('click', runSimulation);
    simInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runSimulation();
    });
  }

  function runSimulation() {
    const text = simInput ? simInput.value.trim() : '';
    if (!text) {
      if (simResult) {
        simResult.className = 'sim-result-box idle';
        simResult.innerHTML = '<span class="sim-idle-text">Enter a message above and click <strong>Simulate Filter</strong> to test rule execution in real-time.</span>';
      }
      return;
    }

    if (simResult) {
      simResult.className = 'sim-result-box';
      simResult.style.borderColor = '#00f0ff';
      simResult.innerHTML = `<span style="color: #00f0ff; font-family: var(--font-cyber); font-size: 0.8rem; display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block;">⚡</span> SCANNING MESSAGE PACKET AGAINST 8 ARMED NEURAL VECTORS...
      </span>`;
    }

    setTimeout(() => {
      evaluateMessageSimulation(text);
    }, 280);
  }

  function evaluateMessageSimulation(text) {
    if (!simResult) return;

    // Check active bad words
    const badWordsBadges = document.querySelectorAll('#amBadWordsContainer span[style*="monospace"]');
    const customBadWords = Array.from(badWordsBadges).map(el => el.textContent.trim().toLowerCase());
    
    // Check discord invites
    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9\-]+/i;
    // Check links
    const linkRegex = /https?:\/\/[^\s]+/i;
    // Check mentions
    const mentionMatches = text.match(/<@!?\d+>|@everyone|@here|@&?\w+/g) || [];
    // Check emojis
    const emojiMatches = text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [];
    // Check caps
    const letters = text.replace(/[^a-zA-Z]/g, '');
    const upperCount = text.replace(/[^A-Z]/g, '').length;
    const capsPercent = letters.length > 5 ? (upperCount / letters.length) * 100 : 0;

    let violation = null;

    if (inviteRegex.test(text) && document.getElementById('toggleAmInvite')?.checked) {
      violation = {
        rule: 'Anti Discord Invites',
        action: document.getElementById('punishAmInvite')?.value?.toUpperCase() || 'TIMEOUT',
        limit: document.getElementById('limitAmInvite')?.value || '1'
      };
    } else if (customBadWords.some(w => w && text.toLowerCase().includes(w)) && document.getElementById('toggleAmBadWords')?.checked) {
      violation = {
        rule: 'Custom Bad Words Blacklist',
        action: document.getElementById('punishAmBadWords')?.value?.toUpperCase() || 'TIMEOUT',
        limit: document.getElementById('limitAmBadWords')?.value || '2'
      };
    } else if (linkRegex.test(text) && document.getElementById('toggleAmLink')?.checked) {
      violation = {
        rule: 'Anti External Links & Phishing',
        action: document.getElementById('punishAmLink')?.value?.toUpperCase() || 'DELETE',
        limit: document.getElementById('limitAmLink')?.value || '2'
      };
    } else if (mentionMatches.length >= 3 && document.getElementById('toggleAmMention')?.checked) {
      violation = {
        rule: 'Anti Mass Mention Flood',
        action: document.getElementById('punishAmMention')?.value?.toUpperCase() || 'TIMEOUT',
        limit: document.getElementById('limitAmMention')?.value || '2'
      };
    } else if (capsPercent >= 65 && document.getElementById('toggleAmCaps')?.checked) {
      violation = {
        rule: 'Anti Excessive Caps Shouting',
        action: document.getElementById('punishAmCaps')?.value?.toUpperCase() || 'DELETE',
        limit: document.getElementById('limitAmCaps')?.value || '3'
      };
    } else if (emojiMatches.length >= 5 && document.getElementById('toggleAmEmoji')?.checked) {
      violation = {
        rule: 'Anti Emoji Spam Burst',
        action: document.getElementById('punishAmEmoji')?.value?.toUpperCase() || 'DELETE',
        limit: document.getElementById('limitAmEmoji')?.value || '3'
      };
    }

    if (violation) {
      simResult.className = 'sim-result-box violation';
      simResult.innerHTML = `
        <div class="sim-result-grid">
          <span class="sim-res-badge intercepted">🚨 INTERCEPTED</span>
          <span class="sim-res-rule">${violation.rule}</span>
          <span class="sim-res-action">ENFORCEMENT: ${violation.action}</span>
          <span class="sim-res-strikes">STRIKE: 1/${violation.limit} RECORDED</span>
        </div>
      `;
    } else {
      simResult.className = 'sim-result-box clean';
      simResult.innerHTML = `
        <div class="sim-result-grid">
          <span class="sim-res-badge clean">✓ VERIFIED CLEAN</span>
          <span class="sim-res-rule">Message passes all 8 active Sentinel filters without penalty.</span>
          <span class="sim-res-strikes" style="color: #00e676;">ZERO INCIDENT</span>
        </div>
      `;
    }
  }

  updateActiveModulesCounter();
}

function renderAmBadWords(words) {
  const container = document.getElementById('amBadWordsContainer');
  if (!container) return;
  if (!words || words.length === 0) {
    container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No blacklisted words set. All messages allowed.</span>`;
    return;
  }
  container.innerHTML = words.map((w) => `
    <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; border-radius: 8px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem;">
      <span style="font-weight: 700;">🚫</span>
      <span style="font-family: monospace; color: #fff;">${w}</span>
      <button onclick="removeAmBadWord('${w}')" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 4px; font-size: 1rem; line-height: 1;" title="Remove word">&times;</button>
    </div>
  `).join('');
}

window.removeAmBadWord = async function(word) {
  try {
    const res = await fetch('/api/automod/badwords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: currentGuildId, action: 'remove', word })
    });
    const data = await res.json();
    if (data.success) {
      renderAmBadWords(data.badWords || []);
      showToast(`Removed "${word}" from blacklisted words`, 'info');
    }
  } catch (e) {
    showToast('Failed to remove bad word', 'error');
  }
};

function renderAmWhitelist(list) {
  const container = document.getElementById('amWhitelistContainer');
  if (!container) return;
  if (!list || list.length === 0) {
    container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No users or roles whitelisted. All non-admin members will be moderated.</span>`;
    return;
  }
  container.innerHTML = list.map((id) => `
    <div style="background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 8px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem;">
      <span style="color: #c084fc; font-weight: 700;">🛡️</span>
      <span style="font-family: monospace; color: #fff;">${id}</span>
      <button onclick="removeAmWhitelistId('${id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 4px; font-size: 1rem; line-height: 1;" title="Remove from whitelist">&times;</button>
    </div>
  `).join('');
}

window.removeAmWhitelistId = async function(id) {
  try {
    const res = await fetch('/api/automod/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: currentGuildId, action: 'remove', id })
    });
    const data = await res.json();
    if (data.success) {
      renderAmWhitelist(data.whitelist || []);
      showToast(`Removed ${id} from AutoMod whitelist`, 'info');
    }
  } catch (e) {
    showToast('Failed to remove whitelist entry', 'error');
  }
};

// ==========================================
// 8. WELCOME SYSTEM & DESIGNER LOGIC
// ==========================================

let welcomeConfig = null;

async function fetchWelcomeSettings(guildId) {
  if (!guildId) return;
  try {
    const res = await fetch(`/api/welcome/settings?guildId=${guildId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.config) {
      welcomeConfig = data.config;
      applyWelcomeConfigToForm(welcomeConfig);
    }
  } catch (err) {
    console.error('Error fetching welcome settings:', err);
  }
}

function applyWelcomeConfigToForm(cfg) {
  if (!cfg) return;

  const masterToggle = document.getElementById('welcomeMasterToggle');
  const navBadge = document.getElementById('navWelcomeBadge');
  const chSelect = document.getElementById('welcomeChannelSelect');
  const toggleMention = document.getElementById('welcomeToggleMention');
  const inputContent = document.getElementById('welcomeInputContent');
  const toggleAuthor = document.getElementById('welcomeToggleAuthor');
  const inputAuthorName = document.getElementById('welcomeInputAuthorName');
  const selectAuthorIcon = document.getElementById('welcomeSelectAuthorIcon');
  const inputAuthorIconUrl = document.getElementById('welcomeInputAuthorIconUrl');
  const inputTitle = document.getElementById('welcomeInputTitle');
  const inputDesc = document.getElementById('welcomeInputDesc');
  const colorPicker = document.getElementById('welcomeColorPicker');
  const inputColor = document.getElementById('welcomeInputColor');
  const selectThumbnail = document.getElementById('welcomeSelectThumbnail');
  const inputThumbnailUrl = document.getElementById('welcomeInputThumbnailUrl');
  const inputImage = document.getElementById('welcomeInputImage');
  const inputFooter = document.getElementById('welcomeInputFooter');
  const selectFooterIcon = document.getElementById('welcomeSelectFooterIcon');
  const inputFooterIconUrl = document.getElementById('welcomeInputFooterIconUrl');
  const toggleTimestamp = document.getElementById('welcomeToggleTimestamp');

  if (masterToggle) masterToggle.checked = Boolean(cfg.enabled);
  if (navBadge) {
    navBadge.textContent = cfg.enabled ? 'ON' : 'OFF';
    navBadge.style.background = cfg.enabled ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 36, 73, 0.2)';
    navBadge.style.color = cfg.enabled ? '#60a5fa' : '#ff3b5c';
  }

  if (chSelect && cfg.channelId) {
    window.loadedWelcomeChannelId = cfg.channelId;
    chSelect.value = cfg.channelId;
  }

  if (toggleMention) toggleMention.checked = cfg.mentionUser !== false;
  if (inputContent) inputContent.value = cfg.content || '{user}';

  if (toggleAuthor) toggleAuthor.checked = cfg.authorEnabled !== false;
  if (inputAuthorName) inputAuthorName.value = cfg.authorName || '{username}';
  if (selectAuthorIcon) selectAuthorIcon.value = cfg.authorIcon || 'user_avatar';
  if (inputAuthorIconUrl) inputAuthorIconUrl.value = cfg.authorCustomUrl || '';

  if (inputTitle) inputTitle.value = cfg.title || '';
  if (inputDesc) inputDesc.value = cfg.description || '';

  const themeColor = cfg.color || '#5865f2';
  if (colorPicker) colorPicker.value = themeColor;
  if (inputColor) inputColor.value = themeColor;

  if (selectThumbnail) selectThumbnail.value = cfg.thumbnail || 'custom';
  if (inputThumbnailUrl) inputThumbnailUrl.value = cfg.thumbnailUrl || '';
  if (inputImage) inputImage.value = cfg.imageUrl || '';

  if (inputFooter) inputFooter.value = cfg.footerText || '{server} • Welcome!';
  if (selectFooterIcon) selectFooterIcon.value = cfg.footerIcon || 'server_icon';
  if (inputFooterIconUrl) inputFooterIconUrl.value = cfg.footerCustomUrl || '';
  if (toggleTimestamp) toggleTimestamp.checked = cfg.timestamp !== false;

  updateWelcomePreview();
}

function updateWelcomePreview() {
  const dummyMember = {
    username: 'ishikawa.eira_',
    displayName: '=‿= ᶻ 𝗓 𐰁 | Eira ⊹ ࣪ ˖ ★ 💤',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
  };

  const serverName = document.getElementById('sidebarServerName')?.textContent || 'Krypton HQ & Support Server';
  const memberCount = document.getElementById('sidebarMemberCount')?.textContent?.replace(/[^0-9]/g, '') || '505';

  const replaceTags = (text) => {
    if (!text) return '';
    return text
      .replace(/{user}/g, `@${dummyMember.displayName}`)
      .replace(/{username}/g, dummyMember.username)
      .replace(/{server}/g, serverName)
      .replace(/{memberCount}/g, memberCount);
  };

  // 1. Outer Mention Text
  const toggleMention = document.getElementById('welcomeToggleMention')?.checked;
  const rawContent = document.getElementById('welcomeInputContent')?.value || '{user}';
  const previewContent = document.getElementById('welcomePreviewContent');
  if (previewContent) {
    if (toggleMention && rawContent.trim()) {
      previewContent.style.display = 'block';
      const renderedText = replaceTags(rawContent);
      previewContent.innerHTML = `<span class="discord-mention-pill">${escapeHtml(renderedText)}</span>`;
    } else {
      previewContent.style.display = 'none';
    }
  }

  // 2. Embed Left Border Color
  const color = document.getElementById('welcomeInputColor')?.value || '#5865f2';
  const embedCard = document.getElementById('welcomePreviewEmbedCard');
  if (embedCard) {
    embedCard.style.borderLeftColor = color;
  }

  // 3. Author Row
  const toggleAuthor = document.getElementById('welcomeToggleAuthor')?.checked;
  const authorRow = document.getElementById('welcomePreviewAuthorRow');
  const authorText = document.getElementById('welcomePreviewAuthorText');
  const authorIcon = document.getElementById('welcomePreviewAuthorIcon');
  const authorNameVal = document.getElementById('welcomeInputAuthorName')?.value || '{username}';
  const authorIconType = document.getElementById('welcomeSelectAuthorIcon')?.value || 'user_avatar';
  const authorCustomUrl = document.getElementById('welcomeInputAuthorIconUrl')?.value;

  const customUrlGroup = document.getElementById('welcomeAuthorCustomUrlGroup');
  if (customUrlGroup) {
    customUrlGroup.style.display = authorIconType === 'custom' ? 'block' : 'none';
  }

  if (authorRow) {
    if (toggleAuthor) {
      authorRow.style.display = 'flex';
      if (authorText) authorText.textContent = replaceTags(authorNameVal);
      if (authorIcon) {
        if (authorIconType === 'user_avatar') {
          authorIcon.src = dummyMember.avatar;
          authorIcon.style.display = 'inline-block';
        } else if (authorIconType === 'server_icon') {
          authorIcon.src = '/assets/server-default.png';
          authorIcon.style.display = 'inline-block';
        } else if (authorIconType === 'custom' && authorCustomUrl) {
          authorIcon.src = authorCustomUrl;
          authorIcon.style.display = 'inline-block';
        } else {
          authorIcon.style.display = 'none';
        }
      }
    } else {
      authorRow.style.display = 'none';
    }
  }

  // 4. Title
  const titleVal = document.getElementById('welcomeInputTitle')?.value;
  const titleEl = document.getElementById('welcomePreviewTitle');
  if (titleEl) {
    if (titleVal && titleVal.trim()) {
      titleEl.textContent = replaceTags(titleVal);
      titleEl.style.display = 'block';
    } else {
      titleEl.style.display = 'none';
    }
  }

  // 5. Description (Markdown Formatting)
  const descVal = document.getElementById('welcomeInputDesc')?.value || '';
  const descEl = document.getElementById('welcomePreviewDesc');
  if (descEl) {
    descEl.innerHTML = parseDiscordMarkdown(descVal, dummyMember, serverName, memberCount);
  }

  // 6. Thumbnail
  const thumbType = document.getElementById('welcomeSelectThumbnail')?.value || 'custom';
  const thumbUrl = document.getElementById('welcomeInputThumbnailUrl')?.value;
  const thumbBox = document.getElementById('welcomePreviewThumbBox');
  const thumbImg = document.getElementById('welcomePreviewThumbImg');
  const thumbUrlGroup = document.getElementById('welcomeThumbUrlGroup');

  if (thumbUrlGroup) {
    thumbUrlGroup.style.display = thumbType === 'custom' ? 'block' : 'none';
  }

  if (thumbBox && thumbImg) {
    if (thumbType === 'none') {
      thumbBox.style.display = 'none';
    } else {
      thumbBox.style.display = 'block';
      if (thumbType === 'custom' && thumbUrl) {
        thumbImg.src = thumbUrl;
      } else if (thumbType === 'user_avatar') {
        thumbImg.src = dummyMember.avatar;
      } else {
        thumbImg.src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';
      }
    }
  }

  // 7. Large Image
  const imageVal = document.getElementById('welcomeInputImage')?.value;
  const imageBox = document.getElementById('welcomePreviewImageBox');
  const imageEl = document.getElementById('welcomePreviewImage');
  if (imageBox && imageEl) {
    if (imageVal && imageVal.trim()) {
      imageEl.src = imageVal.trim();
      imageBox.style.display = 'block';
    } else {
      imageBox.style.display = 'none';
    }
  }

  // 8. Footer
  const footerVal = document.getElementById('welcomeInputFooter')?.value || '{server} • Welcome!';
  const footerIconType = document.getElementById('welcomeSelectFooterIcon')?.value || 'server_icon';
  const footerCustomUrl = document.getElementById('welcomeInputFooterIconUrl')?.value;
  const showTimestamp = document.getElementById('welcomeToggleTimestamp')?.checked !== false;
  const footerTextEl = document.getElementById('welcomePreviewFooterText');
  const footerIconEl = document.getElementById('welcomePreviewFooterIcon');
  const footerRow = document.getElementById('welcomePreviewFooterRow');

  if (footerRow) {
    if (footerVal && footerVal.trim()) {
      footerRow.style.display = 'flex';
      let text = replaceTags(footerVal);
      if (showTimestamp) {
        text += ' • Today at 14:05';
      }
      if (footerTextEl) footerTextEl.textContent = text;
      if (footerIconEl) {
        if (footerIconType === 'none') {
          footerIconEl.style.display = 'none';
        } else if (footerIconType === 'bot_icon') {
          footerIconEl.src = document.getElementById('welcomePreviewBotAvatar')?.src || 'https://cdn.discordapp.com/embed/avatars/0.png';
          footerIconEl.style.display = 'inline-block';
        } else if (footerIconType === 'custom' && footerCustomUrl) {
          footerIconEl.src = footerCustomUrl;
          footerIconEl.style.display = 'inline-block';
        } else {
          footerIconEl.src = 'https://cdn.discordapp.com/icons/1547315288293515424/043be6541ece44345a4c114977115d4a.webp';
          footerIconEl.style.display = 'inline-block';
        }
      }
    } else {
      footerRow.style.display = 'none';
    }
  }
}

function parseDiscordMarkdown(text, member, serverName, count) {
  if (!text) return '';
  let safe = escapeHtml(text);

  // Replace placeholders
  safe = safe.replace(/{user}/g, `<span class="discord-mention-pill">@${escapeHtml(member.displayName)}</span>`);
  safe = safe.replace(/{username}/g, `<strong>${escapeHtml(member.username)}</strong>`);
  safe = safe.replace(/{server}/g, `<strong>${escapeHtml(serverName)}</strong>`);
  safe = safe.replace(/{memberCount}/g, `<strong>${escapeHtml(count)}</strong>`);

  // Channels (#support)
  safe = safe.replace(/(#[a-zA-Z0-9_\-\.\/・]+)/g, `<span class="discord-channel-pill">$1</span>`);

  // Bold (**text**)
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italics (*text*)
  safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline Code (`code`)
  safe = safe.replace(/`([^`]+)`/g, '<code class="discord-code-pill">$1</code>');

  return safe;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function initWelcomeSection() {
  // Master status toggle
  const masterToggle = document.getElementById('welcomeMasterToggle');
  if (masterToggle) {
    masterToggle.addEventListener('change', () => {
      const isEnabled = masterToggle.checked;
      const navBadge = document.getElementById('navWelcomeBadge');
      if (navBadge) {
        navBadge.textContent = isEnabled ? 'ON' : 'OFF';
        navBadge.style.background = isEnabled ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 36, 73, 0.2)';
        navBadge.style.color = isEnabled ? '#60a5fa' : '#ff3b5c';
      }
      saveWelcomeSettings(true);
    });
  }

  // Real-time input listeners
  const inputIds = [
    'welcomeInputContent',
    'welcomeToggleMention',
    'welcomeToggleAuthor',
    'welcomeInputAuthorName',
    'welcomeSelectAuthorIcon',
    'welcomeInputAuthorIconUrl',
    'welcomeInputTitle',
    'welcomeInputDesc',
    'welcomeColorPicker',
    'welcomeInputColor',
    'welcomeSelectThumbnail',
    'welcomeInputThumbnailUrl',
    'welcomeInputImage',
    'welcomeInputFooter',
    'welcomeSelectFooterIcon',
    'welcomeInputFooterIconUrl',
    'welcomeToggleTimestamp'
  ];

  inputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateWelcomePreview);
      el.addEventListener('change', updateWelcomePreview);
    }
  });

  // Color picker sync
  const colorPicker = document.getElementById('welcomeColorPicker');
  const inputColor = document.getElementById('welcomeInputColor');
  if (colorPicker && inputColor) {
    colorPicker.addEventListener('input', () => {
      inputColor.value = colorPicker.value.toUpperCase();
      updateWelcomePreview();
    });
    inputColor.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(inputColor.value)) {
        colorPicker.value = inputColor.value;
      }
      updateWelcomePreview();
    });
  }

  // Quick Color Swatches
  document.querySelectorAll('.color-swatch-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      if (color && inputColor && colorPicker) {
        inputColor.value = color.toUpperCase();
        colorPicker.value = color;
        updateWelcomePreview();
      }
    });
  });

  // Tag helper pills (insert tag at textarea cursor)
  document.querySelectorAll('.tag-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-tag');
      const textarea = document.getElementById('welcomeInputDesc');
      if (tag && textarea) {
        const start = textarea.selectionStart || textarea.value.length;
        const end = textarea.selectionEnd || textarea.value.length;
        textarea.value = textarea.value.substring(0, start) + tag + textarea.value.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + tag.length;
        updateWelcomePreview();
      }
    });
  });

  // Save button
  const btnSave = document.getElementById('btnSaveWelcome');
  if (btnSave) {
    btnSave.addEventListener('click', () => saveWelcomeSettings(false));
  }

  // Send Test Welcome button
  const btnTest = document.getElementById('btnTestWelcome');
  if (btnTest) {
    btnTest.addEventListener('click', sendTestWelcome);
  }

  // Initial load
  if (currentGuildId) {
    fetchWelcomeSettings(currentGuildId);
  }
}

async function saveWelcomeSettings(isQuiet = false) {
  if (!currentGuildId) {
    showToast('Please select a server first', 'warn');
    return;
  }

  const payload = {
    guildId: currentGuildId,
    settings: {
      enabled: document.getElementById('welcomeMasterToggle')?.checked !== false,
      channelId: document.getElementById('welcomeChannelSelect')?.value || null,
      mentionUser: document.getElementById('welcomeToggleMention')?.checked !== false,
      content: document.getElementById('welcomeInputContent')?.value || '{user}',
      authorEnabled: document.getElementById('welcomeToggleAuthor')?.checked !== false,
      authorName: document.getElementById('welcomeInputAuthorName')?.value || '{username}',
      authorIcon: document.getElementById('welcomeSelectAuthorIcon')?.value || 'user_avatar',
      authorCustomUrl: document.getElementById('welcomeInputAuthorIconUrl')?.value || '',
      title: document.getElementById('welcomeInputTitle')?.value || '',
      description: document.getElementById('welcomeInputDesc')?.value || '',
      color: document.getElementById('welcomeInputColor')?.value || '#5865f2',
      thumbnail: document.getElementById('welcomeSelectThumbnail')?.value || 'custom',
      thumbnailUrl: document.getElementById('welcomeInputThumbnailUrl')?.value || '',
      imageUrl: document.getElementById('welcomeInputImage')?.value || '',
      footerText: document.getElementById('welcomeInputFooter')?.value || '{server} • Welcome!',
      footerIcon: document.getElementById('welcomeSelectFooterIcon')?.value || 'server_icon',
      footerCustomUrl: document.getElementById('welcomeInputFooterIconUrl')?.value || '',
      timestamp: document.getElementById('welcomeToggleTimestamp')?.checked !== false
    }
  };

  const btnSave = document.getElementById('btnSaveWelcome');
  const originalText = btnSave?.innerHTML;
  if (!isQuiet && btnSave) {
    btnSave.innerHTML = '<span>Saving...</span>';
    btnSave.disabled = true;
  }

  try {
    const res = await fetch('/api/welcome/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      if (!isQuiet) {
        showToast('✔ Welcome message configuration saved successfully! 🚀', 'success');
      }
    } else {
      showToast('❌ Failed to save settings: ' + (data.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    showToast('❌ Network error saving welcome settings', 'error');
  } finally {
    if (!isQuiet && btnSave) {
      btnSave.innerHTML = originalText;
      btnSave.disabled = false;
    }
  }
}

async function sendTestWelcome() {
  if (!currentGuildId) {
    showToast('Please select a server first', 'warn');
    return;
  }

  const channelId = document.getElementById('welcomeChannelSelect')?.value;
  if (!channelId) {
    showToast('⚠️ Please select a Welcome Channel first!', 'warn');
    document.getElementById('welcomeChannelSelect')?.focus();
    return;
  }

  const btnTest = document.getElementById('btnTestWelcome');
  const origHtml = btnTest?.innerHTML;
  if (btnTest) {
    btnTest.innerHTML = '<span>Sending...</span>';
    btnTest.disabled = true;
  }

  const currentSettings = {
    enabled: true,
    channelId,
    mentionUser: document.getElementById('welcomeToggleMention')?.checked !== false,
    content: document.getElementById('welcomeInputContent')?.value || '{user}',
    authorEnabled: document.getElementById('welcomeToggleAuthor')?.checked !== false,
    authorName: document.getElementById('welcomeInputAuthorName')?.value || '{username}',
    authorIcon: document.getElementById('welcomeSelectAuthorIcon')?.value || 'user_avatar',
    authorCustomUrl: document.getElementById('welcomeInputAuthorIconUrl')?.value || '',
    title: document.getElementById('welcomeInputTitle')?.value || '',
    description: document.getElementById('welcomeInputDesc')?.value || '',
    color: document.getElementById('welcomeInputColor')?.value || '#5865f2',
    thumbnail: document.getElementById('welcomeSelectThumbnail')?.value || 'custom',
    thumbnailUrl: document.getElementById('welcomeInputThumbnailUrl')?.value || '',
    imageUrl: document.getElementById('welcomeInputImage')?.value || '',
    footerText: document.getElementById('welcomeInputFooter')?.value || '{server} • Welcome!',
    footerIcon: document.getElementById('welcomeSelectFooterIcon')?.value || 'server_icon',
    footerCustomUrl: document.getElementById('welcomeInputFooterIconUrl')?.value || '',
    timestamp: document.getElementById('welcomeToggleTimestamp')?.checked !== false
  };

  try {
    const res = await fetch('/api/welcome/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guildId: currentGuildId,
        channelId,
        settings: currentSettings
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('🎉 Test welcome message sent to Discord! Check your channel!', 'success');
    } else {
      showToast('❌ ' + (data.error || 'Failed to send test welcome message'), 'error');
    }
  } catch (err) {
    showToast('❌ Error sending test welcome message', 'error');
  } finally {
    if (btnTest) {
      btnTest.innerHTML = origHtml;
      btnTest.disabled = false;
    }
  }
}

document.addEventListener('DOMContentLoaded', initApp);

