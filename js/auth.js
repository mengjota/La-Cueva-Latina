// =============================================
//   LA CUEVA LATINA — Autenticación
// =============================================

// Escucha cambios de sesión en tiempo real
// (login, logout, refresh de token)
db.auth.onAuthStateChange((_event, session) => {
  const user = session?.user ?? null;
  actualizarNavUsuario(user);
});

// ── ABRIR / CERRAR MODAL ───────────────────
function abrirLoginModal(tabInicial = 'entrar') {
  document.getElementById('auth-overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
  cambiarTabAuth(tabInicial);
  limpiarErrorAuth();
}

function cerrarLoginModal() {
  document.getElementById('auth-overlay').classList.remove('visible');
  document.body.style.overflow = '';
  limpiarErrorAuth();
}

function limpiarErrorAuth() {
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-success').textContent = '';
}

function cambiarTabAuth(tab) {
  const esEntrar = tab === 'entrar';
  document.getElementById('auth-tab-entrar').classList.toggle('activo', esEntrar);
  document.getElementById('auth-tab-registrar').classList.toggle('activo', !esEntrar);
  document.getElementById('auth-form-entrar').classList.toggle('oculto', !esEntrar);
  document.getElementById('auth-form-registrar').classList.toggle('oculto', esEntrar);
  limpiarErrorAuth();
}

// ── INICIAR SESIÓN ─────────────────────────
async function iniciarSesion() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('btn-login');
  const errorEl  = document.getElementById('auth-error');

  if (!email || !password) {
    errorEl.textContent = 'Por favor completa todos los campos.';
    return;
  }

  btn.textContent = 'Entrando...';
  btn.disabled = true;

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  btn.textContent = 'Entrar';
  btn.disabled = false;

  if (error) {
    errorEl.textContent = error.message.includes('Invalid')
      ? 'Email o contraseña incorrectos.'
      : 'Error al iniciar sesión. Inténtalo de nuevo.';
    return;
  }

  // Éxito
  cerrarLoginModal();
  mostrarBienvenida(data.user);
}

// ── REGISTRARSE ────────────────────────────
async function registrarse() {
  const nombre   = document.getElementById('reg-nombre').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const password2= document.getElementById('reg-password2').value;
  const btn      = document.getElementById('btn-registrar');
  const errorEl  = document.getElementById('auth-error');

  if (!nombre || !email || !password) {
    errorEl.textContent = 'Por favor completa todos los campos.';
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }
  if (password !== password2) {
    errorEl.textContent = 'Las contraseñas no coinciden.';
    return;
  }

  btn.textContent = 'Creando cuenta...';
  btn.disabled = true;

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { data: { nombre } }
  });

  btn.textContent = 'Crear Cuenta';
  btn.disabled = false;

  if (error) {
    errorEl.textContent = error.message.includes('already')
      ? 'Este email ya tiene una cuenta. Inicia sesión.'
      : 'Error al registrarse. Inténtalo de nuevo.';
    return;
  }

  // Si no requiere confirmación de email, loguea automáticamente
  if (data.session) {
    cerrarLoginModal();
    mostrarBienvenida(data.user);
  } else {
    document.getElementById('auth-success').textContent =
      '¡Cuenta creada! Revisa tu email para confirmar.';
  }
}

// ── CERRAR SESIÓN ──────────────────────────
async function cerrarSesion() {
  await db.auth.signOut();
  window.location.href = 'index.html';
}

// ── ACTUALIZAR NAVBAR ──────────────────────
function actualizarNavUsuario(user) {
  const el = document.getElementById('nav-usuario');
  if (!el) return;

  if (user) {
    const nombre  = user.user_metadata?.nombre || user.email.split('@')[0];
    const inicial = nombre.charAt(0).toUpperCase();
    el.innerHTML = `
      <a href="perfil.html" class="nav-avatar" title="Mi perfil — ${nombre}">
        <span class="nav-avatar-inicial">${inicial}</span>
      </a>
    `;
  } else {
    el.innerHTML = `
      <button class="btn-nav-login" onclick="abrirLoginModal()">
        Iniciar Sesión
      </button>
    `;
  }
}

// ── BIENVENIDA (toast) ─────────────────────
function mostrarBienvenida(user) {
  const nombre = user.user_metadata?.nombre || user.email.split('@')[0];
  const toast  = document.createElement('div');
  toast.className = 'toast-bienvenida';
  toast.innerHTML = `
    <div class="toast-icono">🔥</div>
    <div>
      <div class="toast-titulo">¡Bienvenido, ${nombre}!</div>
      <div class="toast-sub">La cueva te espera</div>
    </div>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarLoginModal();
});
