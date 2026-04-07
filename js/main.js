// =============================================
//   LA CUEVA LATINA — JavaScript Principal
// =============================================

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
    // Ya estaba en el carrito → aumentar cantidad
    carrito[nombrePlato].cantidad++;
  } else {
    // Plato nuevo → agregar con cantidad 1
    carrito[nombrePlato] = { plato, cantidad: 1 };
  }

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
function manejarReservacion(e) {
  e.preventDefault(); // evita que recargue la página

  const nombre   = document.getElementById('nombre').value;
  const fecha    = document.getElementById('fecha').value;
  const hora     = document.getElementById('hora').value;
  const personas = document.getElementById('personas').value;

  // Formatear la fecha para mostrarla bonito
  const fechaFormateada = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Reemplazar el formulario por un mensaje de confirmación
  const form = document.getElementById('form-reservacion');

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

  // 3. Inicializar el carrito vacío
  actualizarCarrito();

  // 4. Botón del carrito en el navbar
  document.getElementById('btn-carrito').addEventListener('click', abrirCarrito);

  // 5. Botón de cerrar carrito
  document.getElementById('cerrar-carrito').addEventListener('click', cerrarCarrito);

  // 6. Formulario de reservaciones
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
