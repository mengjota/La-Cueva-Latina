// =============================================
//   LA CUEVA LATINA — JavaScript Principal
// =============================================

// ── CONEXIÓN CON SUPABASE ───────────────────
const SUPABASE_URL  = 'https://ltxjmnzqyznuexhrmznt.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_YX3Ivtgp3km23oeW391E2A_AAFRZCEV';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── DATOS DEL MENÚ ─────────────────────────
// Aquí defines los platos. Cada plato tiene:
// emoji (imagen), nombre, descripción y precio
const platos = [
  {
    emoji: '🥩',
    nombre: 'Chuletón a la Brasa',
    descripcion: 'Corte premium de res a las brasas, servido con chimichurri de la casa.',
    precio: 28.90
  },
  {
    emoji: '🫕',
    nombre: 'Sancocho Criollo',
    descripcion: 'Caldo tradicional con pollo, yuca, plátano y maíz. Receta de la abuela.',
    precio: 16.50
  },
  {
    emoji: '🍗',
    nombre: 'Pollo en Salsa Criolla',
    descripcion: 'Muslos de pollo marinados en especias latinas con arroz con coco.',
    precio: 18.90
  },
  {
    emoji: '🦐',
    nombre: 'Camarones al Ajillo',
    descripcion: 'Camarones jumbo salteados en mantequilla, ajo y toque de limón.',
    precio: 24.50
  },
  {
    emoji: '🌮',
    nombre: 'Tacos de Lechón',
    descripcion: 'Tres tacos de lechón confitado con pico de gallo y crema agria.',
    precio: 14.90
  },
  {
    emoji: '🍛',
    nombre: 'Arroz con Mariscos',
    descripcion: 'Arroz caldoso con mejillones, camarones, pulpo y sofrito especial.',
    precio: 22.00
  },
  {
    emoji: '🥗',
    nombre: 'Ensalada de la Cueva',
    descripcion: 'Mix de lechugas, aguacate, mango, tomate cherry y vinagreta de maracuyá.',
    precio: 11.50
  },
  {
    emoji: '🍮',
    nombre: 'Flan de la Casa',
    descripcion: 'Flan artesanal con caramelo oscuro y crema batida. Receta secreta.',
    precio: 7.90
  }
];

// ── CARRITO ────────────────────────────────
// El carrito es un objeto donde guardamos
// qué platos ha agregado el usuario y cuántos

let carrito = {}; // { nombre: { plato, cantidad } }

// ── PERSISTENCIA DEL CARRITO ───────────────
// Guarda el carrito en localStorage para que
// no se pierda al recargar o iniciar sesión

function guardarCarritoLocal() {
  localStorage.setItem('carrito_lacueva', JSON.stringify(carrito));
}

function cargarCarritoLocal() {
  try {
    const guardado = localStorage.getItem('carrito_lacueva');
    if (guardado) carrito = JSON.parse(guardado);
  } catch (_) {
    carrito = {};
  }
}

// ── PARTÍCULAS DE BRASAS ───────────────────
// Crea pequeños puntos de luz que suben como
// brasas flotando en el hero

function crearBrasas() {
  const contenedor = document.getElementById('particulas-hero');
  if (!contenedor) return;

  // Crear una brasa nueva cada cierto tiempo
  setInterval(() => {
    const brasa = document.createElement('div');
    brasa.classList.add('brasa');

    // Tamaño aleatorio entre 2px y 6px
    const tamanio = Math.random() * 4 + 2;
    brasa.style.width  = tamanio + 'px';
    brasa.style.height = tamanio + 'px';

    // Posición horizontal aleatoria
    brasa.style.left = Math.random() * 100 + '%';

    // Duración aleatoria (más lento = más dramático)
    const duracion = Math.random() * 4 + 4; // entre 4 y 8 segundos
    brasa.style.animationDuration = duracion + 's';

    // Deriva horizontal (se mueve un poco de lado al subir)
    const deriva1 = (Math.random() - 0.5) * 80 + 'px';
    const deriva2 = (Math.random() - 0.5) * 120 + 'px';
    brasa.style.setProperty('--drift', deriva1);
    brasa.style.setProperty('--drift2', deriva2);

    // Color: naranja, ámbar o dorado aleatorio
    const colores = [
      'rgba(232, 82, 26, 0.9)',
      'rgba(240, 132, 26, 0.9)',
      'rgba(255, 154, 60, 0.8)',
      'rgba(201, 168, 76, 0.7)'
    ];
    const color = colores[Math.floor(Math.random() * colores.length)];
    brasa.style.background = color;
    brasa.style.boxShadow  = `0 0 ${tamanio * 2}px ${color}`;

    contenedor.appendChild(brasa);

    // Eliminar la brasa cuando termina la animación
    setTimeout(() => brasa.remove(), duracion * 1000);

  }, 300); // crear una brasa cada 300ms
}

// ── GENERAR TARJETAS DEL MENÚ ──────────────
// Crea el HTML de cada plato y lo inserta en la página

function renderizarMenu() {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;

  grid.innerHTML = platos.map(plato => `
    <div class="plato-card">
      <div class="plato-imagen">${plato.emoji}</div>
      <div class="plato-info">
        <div class="plato-nombre">${plato.nombre}</div>
        <div class="plato-descripcion">${plato.descripcion}</div>
        <div class="plato-footer">
          <span class="plato-precio">$${plato.precio.toFixed(2)}</span>
          <button class="btn-agregar" onclick="agregarAlCarrito('${plato.nombre}')">
            + Agregar
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── AGREGAR AL CARRITO ─────────────────────
// Cuando el usuario hace clic en "Agregar"

function agregarAlCarrito(nombrePlato) {
  const plato = platos.find(p => p.nombre === nombrePlato);
  if (!plato) return;

  if (carrito[nombrePlato]) {
    carrito[nombrePlato].cantidad++;
  } else {
    carrito[nombrePlato] = { plato, cantidad: 1 };
  }

  guardarCarritoLocal();
  actualizarCarrito();
  animarContador();
}

// ── CAMBIAR CANTIDAD EN EL CARRITO ─────────
function cambiarCantidad(nombrePlato, cambio) {
  if (!carrito[nombrePlato]) return;

  carrito[nombrePlato].cantidad += cambio;

  // Si llega a 0, eliminar del carrito
  if (carrito[nombrePlato].cantidad <= 0) {
    delete carrito[nombrePlato];
  }

  guardarCarritoLocal();
  actualizarCarrito();
}

// ── ACTUALIZAR LO QUE SE VE EN EL CARRITO ──
// Recalcula todo y redibuja el panel del carrito

function actualizarCarrito() {
  const contenedor = document.getElementById('carrito-items');
  const totalEl    = document.getElementById('carrito-total');
  const contadorEl = document.getElementById('carrito-contador');

  const items = Object.values(carrito);

  // Si está vacío
  if (items.length === 0) {
    contenedor.innerHTML = `
      <div style="text-align:center; color: var(--texto-suave); padding: 40px 0; font-size: 0.9rem; letter-spacing: 1px;">
        Tu pedido está vacío
      </div>`;
    totalEl.textContent = '$0.00';
    contadorEl.textContent = '0';
    return;
  }

  // Generar los items del carrito
  contenedor.innerHTML = items.map(({ plato, cantidad }) => `
    <div class="carrito-item">
      <div class="carrito-item-nombre">${plato.emoji} ${plato.nombre}</div>
      <div class="carrito-item-controles">
        <button onclick="cambiarCantidad('${plato.nombre}', -1)">−</button>
        <span style="color: var(--crema); font-weight: 700;">${cantidad}</span>
        <button onclick="cambiarCantidad('${plato.nombre}', +1)">+</button>
      </div>
      <div class="carrito-item-precio">$${(plato.precio * cantidad).toFixed(2)}</div>
    </div>
  `).join('');

  // Calcular total
  const total = items.reduce((sum, { plato, cantidad }) => sum + plato.precio * cantidad, 0);
  totalEl.textContent = '$' + total.toFixed(2);

  // Actualizar contador del navbar
  const totalItems = items.reduce((sum, { cantidad }) => sum + cantidad, 0);
  contadorEl.textContent = totalItems;
}

// ── ANIMACIÓN DEL CONTADOR ─────────────────
// El contador rebota cuando agregas un plato

function animarContador() {
  const contador = document.getElementById('carrito-contador');
  contador.style.transform = 'scale(1.5)';
  setTimeout(() => { contador.style.transform = 'scale(1)'; }, 200);
}

// ── ABRIR / CERRAR PANEL DEL CARRITO ───────
function abrirCarrito() {
  document.getElementById('carrito-panel').classList.add('abierto');
}

function cerrarCarrito() {
  document.getElementById('carrito-panel').classList.remove('abierto');
}

// ── FORMULARIO DE RESERVACIONES ─────────────
async function manejarReservacion(e) {
  e.preventDefault();

  const nombre    = document.getElementById('nombre').value;
  const telefono  = document.getElementById('telefono').value;
  const fechaEl   = document.getElementById('fecha');
  const fecha     = fechaEl.dataset.isoDate || '';
  const hora      = document.getElementById('hora').value;
  const personas = document.getElementById('personas').value;
  const mensaje  = document.getElementById('mensaje').value;
  const btn      = e.target.querySelector('.btn-reservar');

  // Mostrar estado de carga en el botón
  btn.textContent = 'Guardando...';
  btn.disabled = true;

  // Guardar en Supabase (con user_id si está logueado)
  const { data: { user } } = await db.auth.getUser();
  const { error } = await db.from('reservaciones').insert({
    nombre, telefono, fecha, hora, personas, mensaje,
    user_id:    user?.id    || null,
    user_email: user?.email || null
  });

  const form = document.getElementById('form-reservacion');

  if (error) {
    btn.textContent = 'Confirmar Reservación';
    btn.disabled = false;
    alert('Hubo un error al guardar la reservación. Inténtalo de nuevo.');
    return;
  }

  // Éxito — mostrar confirmación
  const fechaFormateada = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  form.style.opacity = '0';
  form.style.transition = 'opacity 0.4s ease';

  setTimeout(() => {
    form.innerHTML = `
      <div class="mensaje-confirmacion" style="grid-column: 1/-1;">
        <div style="font-size: 3rem; margin-bottom: 20px;">🕯️</div>
        <h3>¡Reservación Confirmada!</h3>
        <p style="margin-top: 16px;">
          <strong style="color: var(--crema);">${nombre}</strong>, te esperamos el
          <strong style="color: var(--ambar);">${fechaFormateada}</strong> a las
          <strong style="color: var(--ambar);">${hora}</strong>
          para <strong style="color: var(--crema);">${personas} persona${personas > 1 ? 's' : ''}</strong>.
        </p>
        <p style="margin-top: 12px; font-size: 0.9rem;">
          Recibirás una confirmación pronto. ¡Gracias por elegirnos!
        </p>
        <button class="btn btn-primario" style="margin-top: 28px;"
          onclick="location.reload()">
          Nueva Reservación
        </button>
      </div>
    `;
    form.style.opacity = '1';
  }, 400);
}

// ── CHECKOUT ───────────────────────────────
let tipoPedido = 'mesa'; // 'mesa' o 'llevar'

function abrirCheckout() {
  const items = Object.values(carrito);
  if (items.length === 0) return;

  // Rellenar resumen
  const contenedor = document.getElementById('checkout-items');
  contenedor.innerHTML = items.map(({ plato, cantidad }, i) => `
    <div class="checkout-item" style="animation-delay: ${i * 0.08}s">
      <div class="checkout-item-emoji">${plato.emoji}</div>
      <div class="checkout-item-info">
        <div class="checkout-item-nombre">${plato.nombre}</div>
        <div class="checkout-item-cantidad">x${cantidad}</div>
      </div>
      <div class="checkout-item-precio">$${(plato.precio * cantidad).toFixed(2)}</div>
    </div>
  `).join('');

  const total = items.reduce((s, { plato, cantidad }) => s + plato.precio * cantidad, 0);
  document.getElementById('checkout-subtotal').textContent    = '$' + total.toFixed(2);
  document.getElementById('checkout-total-final').textContent = '$' + total.toFixed(2);

  // Resetear al paso 1
  document.getElementById('checkout-paso-1').classList.remove('oculto');
  document.getElementById('checkout-paso-2').classList.add('oculto');
  document.getElementById('checkout-error').textContent = '';
  seleccionarTipo('mesa');

  // Mostrar overlay
  cerrarCarrito();
  requestAnimationFrame(() => {
    document.getElementById('checkout-overlay').classList.add('visible');
    document.body.style.overflow = 'hidden';
  });
}

function cerrarCheckout() {
  document.getElementById('checkout-overlay').classList.remove('visible');
  document.body.style.overflow = '';
}

function seleccionarTipo(tipo) {
  tipoPedido = tipo;
  document.getElementById('tipo-mesa').classList.toggle('activo', tipo === 'mesa');
  document.getElementById('tipo-llevar').classList.toggle('activo', tipo === 'llevar');
  document.getElementById('campo-mesa').style.display = tipo === 'mesa' ? 'flex' : 'none';
}

async function confirmarPedido() {
  const nombre   = document.getElementById('co-nombre').value.trim();
  const telefono = document.getElementById('co-telefono').value.trim();
  const mesa     = document.getElementById('co-mesa').value.trim();
  const notas    = document.getElementById('co-notas').value.trim();
  const errorEl  = document.getElementById('checkout-error');
  const btn      = document.querySelector('.checkout-btn-confirmar');

  if (!nombre) {
    errorEl.textContent = 'Por favor escribe tu nombre.';
    document.getElementById('co-nombre').focus();
    return;
  }
  if (tipoPedido === 'mesa' && !mesa) {
    errorEl.textContent = 'Indica el número de tu mesa.';
    document.getElementById('co-mesa').focus();
    return;
  }

  errorEl.textContent = '';
  btn.textContent = 'Enviando pedido...';
  btn.disabled = true;

  // Generar número de pedido
  const numeroPedido = 'LCL-' + Math.floor(1000 + Math.random() * 9000);

  // Preparar items para guardar
  const items = Object.values(carrito).map(({ plato, cantidad }) => ({
    nombre: plato.nombre,
    emoji: plato.emoji,
    precio: plato.precio,
    cantidad
  }));
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  // Obtener usuario actual (si está logueado)
  const { data: { user } } = await db.auth.getUser();

  // Guardar en Supabase
  const { error } = await db.from('pedidos').insert({
    numero_pedido:    numeroPedido,
    cliente_nombre:   nombre,
    cliente_telefono: telefono || null,
    tipo:             tipoPedido,
    numero_mesa:      tipoPedido === 'mesa' ? mesa : null,
    items:            items,
    total:            total,
    notas:            notas || null,
    user_id:          user?.id || null,
    cliente_email:    user?.email || null
  });

  btn.textContent = 'Confirmar Pedido';
  btn.disabled = false;

  if (error) {
    errorEl.textContent = 'Error al enviar el pedido. Inténtalo de nuevo.';
    return;
  }

  // Mostrar pantalla de éxito
  document.getElementById('checkout-paso-1').classList.add('oculto');
  document.getElementById('checkout-paso-2').classList.remove('oculto');
  document.getElementById('exito-numero').textContent = numeroPedido;
  document.getElementById('exito-mensaje').textContent =
    tipoPedido === 'mesa'
      ? `${nombre}, tu pedido está en camino a la mesa ${mesa}. ¡Que lo disfrutes!`
      : `${nombre}, tu pedido para llevar estará listo en breve. Te avisamos al ${telefono || 'completarlo'}.`;

  // Lanzar brasas de celebración
  lanzarBrasasExito();

  // Vaciar carrito (local y localStorage)
  carrito = {};
  localStorage.removeItem('carrito_lacueva');
  actualizarCarrito();
}

function lanzarBrasasExito() {
  const contenedor = document.getElementById('exito-brasas');
  contenedor.innerHTML = '';
  for (let i = 0; i < 25; i++) {
    setTimeout(() => {
      const b = document.createElement('div');
      b.classList.add('brasa');
      const size = Math.random() * 5 + 2;
      b.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        bottom:0;
        animation-duration:${Math.random() * 3 + 2}s;
        background:${['rgba(232,82,26,0.9)','rgba(240,132,26,0.9)','rgba(255,154,60,0.8)'][Math.floor(Math.random()*3)]};
        box-shadow:0 0 ${size*2}px currentColor;
        --drift:${(Math.random()-0.5)*100}px;
        --drift2:${(Math.random()-0.5)*150}px;
      `;
      contenedor.appendChild(b);
      setTimeout(() => b.remove(), 5000);
    }, i * 80);
  }
}

// ── NAVBAR: OCULTAR AL HACER SCROLL ────────
// La navbar se vuelve más opaca al bajar la página

function manejarScroll() {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.style.background = 'rgba(14, 6, 2, 0.98)';
    navbar.style.boxShadow  = '0 4px 40px rgba(232, 82, 26, 0.2)';
  } else {
    navbar.style.background = 'rgba(14, 6, 2, 0.95)';
    navbar.style.boxShadow  = '0 4px 30px rgba(232, 82, 26, 0.15)';
  }
}

// ── INICIALIZAR TODO ────────────────────────
// Esto se ejecuta cuando la página termina de cargar

document.addEventListener('DOMContentLoaded', () => {

  // 1. Crear las brasas flotantes del hero
  crearBrasas();

  // 2. Generar las tarjetas del menú
  renderizarMenu();

  // 3. Cargar carrito guardado (no se pierde al recargar)
  cargarCarritoLocal();
  actualizarCarrito();

  // 4. Botón del carrito en el navbar
  document.getElementById('btn-carrito').addEventListener('click', abrirCarrito);

  // 5. Botón de cerrar carrito
  document.getElementById('cerrar-carrito').addEventListener('click', cerrarCarrito);

  // 5b. Botón realizar pedido → abrir checkout
  document.getElementById('btn-realizar-pedido').addEventListener('click', abrirCheckout);

  // 5c. Botón cerrar checkout
  document.getElementById('checkout-cerrar').addEventListener('click', cerrarCheckout);

  // 5d. Cerrar checkout con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarCheckout();
  });

  // 6. Calendario Flatpickr en el campo de fecha
  flatpickr('#fecha', {
    locale: 'es',
    dateFormat: 'd/m/Y',          // cómo se muestra al usuario
    altInput: false,
    minDate: 'today',             // no permite fechas pasadas
    disableMobile: true,          // usa siempre el calendario custom
    disable: [                    // desactivar lunes (día de cierre)
      function(date) { return date.getDay() === 1; }
    ],
    onChange: function(selectedDates, _dateStr, instance) {
      // guardar en formato YYYY-MM-DD para Supabase
      if (selectedDates[0]) {
        instance.element.dataset.isoDate = selectedDates[0].toISOString().split('T')[0];
      }
    }
  });

  // 7. Formulario de reservaciones
  document.getElementById('form-reservacion').addEventListener('submit', manejarReservacion);

  // 7. Scroll de la navbar
  window.addEventListener('scroll', manejarScroll);

  // 8. Cerrar carrito al hacer clic fuera de él
  document.addEventListener('click', (e) => {
    const panel  = document.getElementById('carrito-panel');
    const boton  = document.getElementById('btn-carrito');
    const abierto = panel.classList.contains('abierto');

    if (abierto && !panel.contains(e.target) && !boton.contains(e.target)) {
      cerrarCarrito();
    }
  });

});
