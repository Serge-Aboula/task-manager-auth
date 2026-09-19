const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const errorBox = document.getElementById('error-message');

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authForm = document.getElementById('auth-form');
const authName = document.getElementById('auth-name');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const togglePasswordBtn = document.getElementById('toggle-password');
const authSubmit = document.getElementById('auth-submit');

const logoutBtn = document.getElementById('logout-btn');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');

let mode = 'login'; // ou 'register'

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function clearError() {
  errorBox.style.display = 'none';
}

// --- Gestion des onglets Connexion / Inscription ---
tabLogin.addEventListener('click', () => {
  mode = 'login';
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  authSubmit.textContent = 'Se connecter';
  authName.style.display = 'none';
  authName.required = false;
  document.getElementById('remember-me-wrapper').style.display = 'flex';
  forgotPasswordLink.style.display = 'block';
  clearError();
});

tabRegister.addEventListener('click', () => {
  mode = 'register';
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  authSubmit.textContent = 'S\'inscrire';
  authName.style.display = 'block';
  authName.required = true;
  document.getElementById('remember-me-wrapper').style.display = 'none';
  forgotPasswordLink.style.display = 'none';
  clearError();
});

// --- Soumission du formulaire d'authentification ---
togglePasswordBtn.addEventListener('click', () => {
  const isPassword = authPassword.type === 'password';
  authPassword.type = isPassword ? 'text' : 'password';
  togglePasswordBtn.textContent = isPassword ? '🙈' : '👁️';
  togglePasswordBtn.setAttribute(
    'aria-label',
    isPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
  );
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const email = authEmail.value.trim();
  const password = authPassword.value;
  const remember = document.getElementById('remember-me').checked;
  const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
  const body = mode === 'register'
    ? { name: authName.value.trim(), email, password }
    : { email, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error);
      return;
    }

    saveSession(data.token, data.name, remember);
    authForm.reset();
    showAppView();
  } catch (err) {
    console.error('Erreur de connexion:', err);
    showError('Erreur de connexion au serveur.');
  }
});

// --- Déconnexion ---
logoutBtn.addEventListener('click', () => {
  clearSession();
  taskList.innerHTML = ''; // vide immédiatement, avant même de changer de vue
  showAuthView();
});

// --- Bascule entre les deux vues ---
function showAppView() {
  taskList.innerHTML = ''; // sécurité supplémentaire : jamais d'anciennes données visibles
  document.getElementById('user-name-display').textContent = getUserName() || '';
  authView.style.display = 'none';
  appView.style.display = 'block';
  fetchTasks();
}

function showAuthView() {
  appView.style.display = 'none';
  authView.style.display = 'block';
}

// --- Requête authentifiée : ajoute automatiquement le header Authorization ---
function authFetch(url, options = {}) {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}

// --- Gestion des tâches (protégées) ---
async function fetchTasks() {
  try {
    clearError();
    const res = await authFetch('/api/tasks');
    if (res.status === 401) {
      // Token invalide/expiré -> retour à l'écran de connexion
      clearSession();
      showAuthView();
      return;
    }
    if (!res.ok) throw new Error();
    const tasks = await res.json();
    renderTasks(tasks);
  } catch (err) {
    showError('Erreur de connexion au serveur.');
  }
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener('change', () => toggleDone(task.id, checkbox.checked));

    const span = document.createElement('span');
    span.textContent = task.text;
    if (task.done) span.style.textDecoration = 'line-through';

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => editTask(task.id, task.text, span));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', () => deleteTask(task.id, task.text));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

function editTask(id, currentText, _span) {
  const newText = prompt('Modifier la tâche :', currentText);
  if (newText === null) return; // annulé
  const trimmed = newText.trim();
  if (!trimmed || trimmed === currentText) return;

  updateTaskText(id, trimmed);
}

async function updateTaskText(id, text) {
  try {
    clearError();
    const res = await authFetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error();
    fetchTasks();
  } catch (err) {
    showError('Impossible de modifier cette tâche.');
  }
}

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const text = taskInput.value.trim();
  if (!text) return;

  try {
    const res = await authFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (res.ok) {
      taskInput.value = '';
      fetchTasks();
    } else {
      const error = await res.json();
      showError(error.error);
    }
  } catch (err) {
    showError('Erreur de connexion au serveur.');
  }
});

async function toggleDone(id, done) {
  try {
    await authFetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done })
    });
    fetchTasks();
  } catch (err) {
    showError('Impossible de mettre à jour cette tâche.');
  }
}

async function deleteTask(id, text) {
  const confirmed = confirm(`Supprimer la tâche "${text}" ? Cette action est irréversible.`);
  if (!confirmed) return;

  try {
    clearError();
    await authFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    fetchTasks();
  } catch (err) {
    showError('Impossible de supprimer cette tâche.');
  }
}

document.getElementById('edit-name-btn').addEventListener('click', async () => {
  const currentName = getUserName() || '';
  const newName = prompt('Modifier ton nom :', currentName);
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!trimmed || trimmed === currentName) return;

  try {
    clearError();
    const res = await authFetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed })
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error);
      return;
    }

    const storageUsed = localStorage.getItem('token') ? localStorage : sessionStorage;
    storageUsed.setItem('userName', data.name);
    document.getElementById('user-name-display').textContent = data.name;
  } catch (err) {
    showError('Erreur de connexion au serveur.');
  }
});

const forgotView = document.getElementById('forgot-view');
const resetView = document.getElementById('reset-view');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const backToLoginBtn = document.getElementById('back-to-login-btn');
const forgotForm = document.getElementById('forgot-form');
const forgotEmail = document.getElementById('forgot-email');
const forgotResult = document.getElementById('forgot-result');
const resetForm = document.getElementById('reset-form');
const resetNewPassword = document.getElementById('reset-new-password');

function hideAllViews() {
  authView.style.display = 'none';
  appView.style.display = 'none';
  forgotView.style.display = 'none';
  resetView.style.display = 'none';
}

forgotPasswordLink.addEventListener('click', () => {
  hideAllViews();
  forgotView.style.display = 'block';
  forgotResult.style.display = 'none';
  clearError();
});

backToLoginBtn.addEventListener('click', () => {
  hideAllViews();
  showAuthView();
});

forgotForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail.value.trim() })
    });
    const data = await res.json();

    forgotResult.textContent = data.devResetLink
      ? `${data.message} Lien (mode démo) : ${data.devResetLink}`
      : data.message;
    forgotResult.style.display = 'block';
    forgotForm.reset();
  } catch (err) {
    showError('Erreur de connexion au serveur.');
  }
});

resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const params = new URLSearchParams(window.location.search);
  const token = params.get('resetToken');

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: resetNewPassword.value })
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error);
      return;
    }

    alert('Mot de passe réinitialisé ! Tu peux maintenant te connecter.');
    window.history.replaceState({}, '', '/'); // nettoie l'URL du token
    hideAllViews();
    showAuthView();
  } catch (err) {
    showError('Erreur de connexion au serveur.');
  }
});

function saveSession(token, name, remember) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('token', token);
  storage.setItem('userName', name);
}

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function getUserName() {
  return localStorage.getItem('userName') || sessionStorage.getItem('userName');
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userName');
}

const toggleResetPasswordBtn = document.getElementById('toggle-reset-password');

toggleResetPasswordBtn.addEventListener('click', () => {
  const isPassword = resetNewPassword.type === 'password';
  resetNewPassword.type = isPassword ? 'text' : 'password';
  toggleResetPasswordBtn.textContent = isPassword ? '🙈' : '👁️';
});

document.getElementById('back-to-login-from-reset-btn').addEventListener('click', () => {
  window.history.replaceState({}, '', '/');
  hideAllViews();
  showAuthView();
});

// --- Point d'entrée : vérifie s'il y a un token de reset dans l'URL ---
// --- Si un token existe déjà, tenter d'aller direct à l'app ---
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('resetToken')) {
  hideAllViews();
  resetView.style.display = 'block';
} else if (getToken()) {
  showAppView();
} else {
  showAuthView();
}