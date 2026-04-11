// ════════════════════════════════════════
//   CONFIGURACIÓN
// ════════════════════════════════════════
const SUPABASE_URL  = 'https://ltxjmnzqyznuexhrmznt.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_YX3Ivtgp3km23oeW391E2A_AAFRZCEV';
const ADMIN_EMAIL   = 'restaurant@admin.com';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
});

let pedidoActual  = null;  // pedido abierto en modal
let facturaActual = null;  // factura abierta en modal

// ════════════════════════════════════════
//   AUTH — SESIÓN / LOGOUT
// ════════════════════════════════════════
async function logoutAdmin() {
  await db.auth.signOut();
  window.location.href = 'index.html';
}

// ── VERIFICACIÓN DE SESIÓN ADMIN ──────────────────────────────
var _panelActivo = false;

function _abrirPanel(session) {
  if (_panelActivo) return;
  if (!session || !session.user) { window.location.replace('/'); return; }
  var email = session.user.email;
  var role  = (session.user.user_metadata || {}).role;
  if (email !== ADMIN_EMAIL && role !== 'admin') {
    db.auth.signOut();
    window.location.replace('/');
    return;
  }
  _panelActivo = true;
  document.getElementById('cargando').style.display = 'none';
  mostrarPanel();
}

(async function() {
  // 1) Leer tokens del hash de la URL (puestos por auth.js al redirigir)
  var hash   = window.location.hash.substring(1);
  var params = new URLSearchParams(hash);
  var acc    = params.get('access_token');
  var ref    = params.get('refresh_token');

  if (acc && ref) {
    history.replaceState(null, '', window.location.pathname);
    var r1 = await db.auth.setSession({ access_token: acc, refresh_token: ref });
    if (r1.data && r1.data.session) { _abrirPanel(r1.data.session); return; }
  }

  // 2) Sesión guardada en localStorage (si el admin vuelve a la página)
  var r2 = await db.auth.getSession();
  if (r2.data && r2.data.session) { _abrirPanel(r2.data.session); return; }

  // 3) Esperar evento auth como último recurso
  db.auth.onAuthStateChange(function(ev, session) {
    if (session && (ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED')) { _abrirPanel(session); }
    if (ev === 'SIGNED_OUT') { window.location.replace('/'); }
  });

  // 4) Si en 5s no hay sesión → volver al inicio
  setTimeout(function() { if (!_panelActivo) window.location.replace('/'); }, 5000);
})();

function mostrarPanel() {
  document.getElementById('admin-panel').style.display  = 'block';
  inicializarFechas();
  cargarDashboard();
  cargarReservaciones();
  cargarPedidos();
  cargarClientes();
  cargarFacturas();
  agregarItemFactura(); // ítem vacío inicial
}

// ════════════════════════════════════════
//   NAVEGACIÓN
// ════════════════════════════════════════
function irA(seccion) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('activo'));
  document.getElementById('sec-' + seccion).classList.add('activa');
  document.getElementById('nav-' + seccion).classList.add('activo');
}

// ════════════════════════════════════════
//   INICIALIZAR FECHAS
// ════════════════════════════════════════
function inicializarFechas() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('mesa-fecha').value = hoy;
  document.getElementById('dashboard-fecha').textContent =
    'Hoy, ' + new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const anioEl = document.getElementById('rep-anio');
  const anioActual = new Date().getFullYear();
  for (let y = anioActual; y >= anioActual - 3; y--) {
    const op = document.createElement('option');
    op.value = y; op.textContent = y;
    anioEl.appendChild(op);
  }
  document.getElementById('rep-mes').value = new Date().getMonth() + 1;

  cargarMesas();
  cargarReporte();
}

// ════════════════════════════════════════
//   DASHBOARD
// ════════════════════════════════════════
async function cargarDashboard() {
  const hoy = new Date().toISOString().split('T')[0];
  const hoyCadena = new Date().toDateString();

  // Reservas de hoy
  const { data: reservasHoy } = await db.from('reservaciones')
    .select('*').eq('fecha', hoy);

  // Pedidos
  const { data: todosLosPedidos } = await db.from('pedidos')
    .select('*').order('created_at', { ascending: false });
  const pedidosHoy = (todosLosPedidos || []).filter(p => new Date(p.created_at).toDateString() === hoyCadena);
  const ingresosHoy = pedidosHoy.reduce((s, p) => s + Number(p.total || 0), 0);

  // Mesas libres ahora
  const horaActual = new Date().toTimeString().slice(0,5);
  const { data: reservasActivas } = await db.from('reservaciones').select('mesa_id').eq('fecha', hoy);
  const mesasOcupadas = new Set((reservasActivas || []).map(r => r.mesa_id).filter(Boolean));
  const { data: todasMesas } = await db.from('mesas').select('*');
  const mesasLibres = (todasMesas || []).filter(m => !mesasOcupadas.has(m.id)).length;

  // Total clientes (usuarios no admin)
  const { count: totalClientes } = await db.from('pedidos').select('user_id', { count: 'exact', head: true });

  // Facturas del mes
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
  const { data: facturasMes } = await db.from('facturas')
    .select('id').gte('created_at', inicioMes.toISOString());

  document.getElementById('ds-reservas-hoy').textContent   = (reservasHoy || []).length;
  document.getElementById('ds-pedidos-hoy').textContent    = pedidosHoy.length;
  document.getElementById('ds-ingresos-hoy').textContent   = '$' + ingresosHoy.toFixed(0);
  document.getElementById('ds-mesas-libres').textContent   = mesasLibres;
  document.getElementById('ds-total-clientes').textContent = totalClientes || 0;
  document.getElementById('ds-facturas-mes').textContent   = (facturasMes || []).length;

  // Tabla reservas recientes
  const ultimas = (reservasHoy || []).slice(0, 5);
  const tbr = document.getElementById('tb-dash-reservas');
  if (!ultimas.length) {
    tbr.innerHTML = `<tr><td colspan="5"><div class="estado-tabla"><div class="ic">📋</div>Sin reservas hoy</div></td></tr>`;
  } else {
    tbr.innerHTML = ultimas.map(r => {
      const fecha = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short' });
      return `<tr>
        <td><strong>${r.nombre}</strong></td>
        <td style="color:var(--ambar)">${fecha}</td>
        <td>${r.hora}</td>
        <td><span class="personas-badge" style="background:rgba(240,132,26,0.12);border:1px solid rgba(240,132,26,0.25);color:var(--ambar-claro);padding:2px 10px;border-radius:20px;font-size:0.78rem">${r.personas} 👥</span></td>
        <td><span class="badge-estado badge-${r.estado || 'confirmada'}">${r.estado || 'Confirmada'}</span></td>
      </tr>`;
    }).join('');
  }

  // Tabla pedidos recientes
  const ultPedidos = (todosLosPedidos || []).slice(0, 5);
  const tbp = document.getElementById('tb-dash-pedidos');
  if (!ultPedidos.length) {
    tbp.innerHTML = `<tr><td colspan="5"><div class="estado-tabla"><div class="ic">🍽️</div>Sin pedidos aún</div></td></tr>`;
  } else {
    tbp.innerHTML = ultPedidos.map(p => {
      const hora = new Date(p.created_at).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
      const tipo = p.tipo === 'mesa' ? `🍽️ Mesa ${p.numero_mesa || ''}` : '🥡 Para llevar';
      return `<tr>
        <td><strong style="color:var(--ambar)">${p.numero_pedido}</strong></td>
        <td>${p.cliente_nombre}</td>
        <td>${tipo}</td>
        <td style="color:var(--ambar);font-weight:700">$${Number(p.total).toFixed(2)}</td>
        <td style="color:var(--texto-suave)">${hora}</td>
      </tr>`;
    }).join('');
  }
}

// ════════════════════════════════════════
//   MESAS
// ════════════════════════════════════════
async function cargarMesas() {
  const fecha = document.getElementById('mesa-fecha').value;
  const hora  = document.getElementById('mesa-hora').value;
  const grid  = document.getElementById('mesas-grid');

  if (!fecha) return;

  grid.innerHTML = `<div style="color:var(--texto-suave);grid-column:1/-1;text-align:center;padding:40px">⏳ Cargando...</div>`;

  const [mesasRes, reservasRes] = await Promise.all([
    db.from('mesas').select('*').order('numero'),
    db.from('reservaciones').select('*').eq('fecha', fecha)
  ]);

  const mesas    = mesasRes.data || [];
  const reservas = reservasRes.data || [];

  // Determinar mesas ocupadas: reserva dentro de ventana de 2 horas
  const [hH, hM] = hora.split(':').map(Number);
  const horaMin  = hH * 60 + hM;

  const mesasOcupadas = {};
  reservas.forEach(r => {
    const [rH, rM] = r.hora.split(':').map(Number);
    const rMin = rH * 60 + rM;
    if (Math.abs(rMin - horaMin) < 120 && r.mesa_id) {
      mesasOcupadas[r.mesa_id] = r;
    }
  });

  if (!mesas.length) {
    grid.innerHTML = `<div style="color:var(--texto-suave);grid-column:1/-1;text-align:center;padding:40px">No hay mesas configuradas</div>`;
    return;
  }

  grid.innerHTML = mesas.map(m => {
    const reserva = mesasOcupadas[m.id];
    const ocupada = !!reserva;
    const dataM   = encodeURIComponent(JSON.stringify({ ...m, reserva: reserva || null, ocupada }));
    return `<div class="mesa-card ${ocupada ? 'ocupada' : 'libre'}" style="cursor:pointer" onclick="abrirModalMesa(decodeURIComponent('${dataM}'))">
      <div class="mesa-numero">${m.numero}</div>
      <div class="mesa-zona">${m.zona}</div>
      <div class="mesa-capacidad">👥 ${m.capacidad} personas</div>
      <div class="mesa-estado-label">${ocupada ? 'OCUPADA' : 'LIBRE'}</div>
      ${ocupada ? `<div class="mesa-reserva-info">${reserva.nombre}<br>${reserva.hora}</div>` : ''}
    </div>`;
  }).join('');
}

// ════════════════════════════════════════
//   RESERVACIONES
// ════════════════════════════════════════
async function cargarReservaciones() {
  const tbody = document.getElementById('tb-reservaciones');
  tbody.innerHTML = `<tr><td colspan="8"><div class="estado-tabla"><div class="ic">⏳</div>Cargando...</div></td></tr>`;

  const { data, error } = await db.from('reservaciones')
    .select('*').order('fecha', { ascending: false }).order('hora');

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="estado-tabla"><div class="ic">❌</div>Error al cargar</div></td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="estado-tabla"><div class="ic">📋</div>No hay reservaciones</div></td></tr>`;
    return;
  }

  const hoy = new Date().toISOString().split('T')[0];
  tbody.innerHTML = data.map(r => {
    const fecha  = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' });
    const estado = r.estado || 'confirmada';
    const esHoy  = r.fecha === hoy;
    return `<tr style="cursor:pointer;${esHoy ? 'background:rgba(240,132,26,0.04)' : ''}" onclick='verReservacion(${JSON.stringify(r).replace(/'/g,"&#39;")})'>
      <td><strong>${r.nombre}</strong>${esHoy ? ' <span style="color:var(--ambar);font-size:0.68rem">● HOY</span>' : ''}</td>
      <td>${r.telefono || '—'}</td>
      <td style="color:var(--ambar);font-weight:700">${fecha}</td>
      <td>${r.hora}</td>
      <td style="text-align:center">${r.personas}</td>
      <td>${r.mesa_id ? 'Mesa ' + r.mesa_id : '<span style="color:var(--texto-suave)">Sin asignar</span>'}</td>
      <td><span class="badge-estado badge-${estado}">${estado}</span></td>
      <td onclick="event.stopPropagation()" style="display:flex;gap:6px">
        <button class="btn-accion btn-verde" onclick="cambiarEstadoReserva(${r.id},'confirmada')">✓</button>
        <button class="btn-accion btn-rojo"  onclick="borrarReserva(${r.id},'${r.nombre}')">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

async function cambiarEstadoReserva(id, estado) {
  await db.from('reservaciones').update({ estado }).eq('id', id);
  cargarReservaciones();
}

async function borrarReserva(id, nombre) {
  if (!confirm(`¿Eliminar la reservación de "${nombre}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await db.from('reservaciones').delete().eq('id', id);
  if (error) { alert('Error al eliminar: ' + error.message); return; }
  cargarReservaciones();
  cargarMesas();
}

let reservacionActual = null;

function verReservacion(r) {
  reservacionActual = r;
  const fecha   = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const creado  = new Date(r.created_at).toLocaleString('es-ES');
  const estado  = r.estado || 'confirmada';

  document.getElementById('modal-reservacion-contenido').innerHTML = `
    <div class="modal-fila"><span>Nombre</span><span><strong>${r.nombre}</strong></span></div>
    <div class="modal-fila"><span>Teléfono</span><span>${r.telefono || '—'}</span></div>
    <div class="modal-fila"><span>Fecha</span><span style="color:var(--ambar);font-weight:700">${fecha}</span></div>
    <div class="modal-fila"><span>Hora</span><span>${r.hora}</span></div>
    <div class="modal-fila"><span>Personas</span><span>${r.personas} 👥</span></div>
    <div class="modal-fila"><span>Mesa asignada</span><span>${r.mesa_id ? 'Mesa ' + r.mesa_id : 'Sin asignar'}</span></div>
    <div class="modal-fila"><span>Mensaje</span><span style="color:var(--texto-suave)">${r.mensaje || '—'}</span></div>
    <div class="modal-fila"><span>Estado</span><span class="badge-estado badge-${estado}">${estado}</span></div>
    <div class="modal-fila"><span>Registrado</span><span style="color:var(--texto-suave);font-size:0.82rem">${creado}</span></div>
  `;
  abrirModal('modal-reservacion');
}

async function eliminarReservacion() {
  if (!reservacionActual) return;
  if (!confirm(`¿Eliminar la reservación de ${reservacionActual.nombre}? Esta acción no se puede deshacer.`)) return;

  const { error } = await db.from('reservaciones').delete().eq('id', reservacionActual.id);
  if (error) { alert('Error al eliminar: ' + error.message); return; }

  cerrarModal('modal-reservacion');
  cargarReservaciones();
}

// ════════════════════════════════════════
//   PEDIDOS
// ════════════════════════════════════════
async function cargarPedidos() {
  const tbody = document.getElementById('tb-pedidos');
  tbody.innerHTML = `<tr><td colspan="8"><div class="estado-tabla"><div class="ic">⏳</div>Cargando...</div></td></tr>`;

  const { data, error } = await db.from('pedidos')
    .select('*').order('created_at', { ascending: false });

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="estado-tabla"><div class="ic">❌</div>Error al cargar</div></td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="estado-tabla"><div class="ic">🍽️</div>No hay pedidos todavía</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(p => {
    const hora  = new Date(p.created_at).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
    const items = Array.isArray(p.items) ? p.items.map(i => `${i.emoji||''} ${i.nombre} x${i.cantidad}`).join(', ') : '—';
    const tipo  = p.tipo === 'mesa' ? `🍽️ Mesa ${p.numero_mesa || ''}` : '🥡 Para llevar';
    return `<tr style="cursor:pointer" onclick="verPedido(${JSON.stringify(p).replace(/"/g,'&quot;')})">
      <td><strong style="color:var(--ambar)">${p.numero_pedido}</strong></td>
      <td>${p.cliente_nombre}<br><span style="color:var(--texto-suave);font-size:0.78rem">${p.cliente_telefono||''}</span></td>
      <td>${tipo}</td>
      <td style="font-size:0.8rem;color:var(--texto-suave);max-width:200px">${items}</td>
      <td style="color:var(--ambar);font-weight:700">$${Number(p.total).toFixed(2)}</td>
      <td style="font-size:0.82rem;color:var(--texto-suave)">${p.notas||'—'}</td>
      <td style="color:var(--texto-suave)">${hora}</td>
    </tr>`;
  }).join('');
}

function verPedido(p) {
  pedidoActual = p;
  const items = Array.isArray(p.items)
    ? p.items.map(i => `<div class="modal-fila"><span>${i.emoji||''} ${i.nombre} x${i.cantidad}</span><span>$${(i.precio*i.cantidad).toFixed(2)}</span></div>`).join('')
    : '';
  const hora = new Date(p.created_at).toLocaleString('es-ES');

  document.getElementById('modal-pedido-contenido').innerHTML = `
    <div class="modal-fila"><span>Número</span><span style="color:var(--ambar);font-weight:700">${p.numero_pedido}</span></div>
    <div class="modal-fila"><span>Cliente</span><span>${p.cliente_nombre}</span></div>
    <div class="modal-fila"><span>Teléfono</span><span>${p.cliente_telefono||'—'}</span></div>
    <div class="modal-fila"><span>Tipo</span><span>${p.tipo === 'mesa' ? '🍽️ Mesa ' + (p.numero_mesa||'') : '🥡 Para llevar'}</span></div>
    <div class="modal-fila"><span>Fecha/Hora</span><span>${hora}</span></div>
    <div style="margin:16px 0 8px;font-size:0.72rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--texto-suave)">Items</div>
    ${items}
    <div class="modal-fila grande" style="font-size:1.1rem;font-weight:700;color:var(--ambar);border-top:1px solid rgba(240,132,26,0.2);margin-top:10px;padding-top:14px">
      <span>TOTAL</span><span>$${Number(p.total).toFixed(2)}</span>
    </div>
    ${p.notas ? `<div class="modal-fila"><span>Notas</span><span style="color:var(--texto-suave)">${p.notas}</span></div>` : ''}
  `;
  abrirModal('modal-pedido');
}

function generarFacturaDesdePedido() {
  if (!pedidoActual) return;
  cerrarModal('modal-pedido');
  irA('facturacion');

  document.getElementById('fac-cliente').value  = pedidoActual.cliente_nombre;
  document.getElementById('fac-telefono').value = pedidoActual.cliente_telefono || '';

  // Limpiar items y rellenar desde el pedido
  document.getElementById('items-container').innerHTML = '';
  if (Array.isArray(pedidoActual.items)) {
    pedidoActual.items.forEach(i => {
      agregarItemFactura(i.nombre + (i.emoji ? ' ' + i.emoji : ''), i.cantidad, i.precio);
    });
  }
  calcularTotales();
}

// ════════════════════════════════════════
//   CLIENTES
// ════════════════════════════════════════
async function cargarClientes() {
  const grid = document.getElementById('clientes-grid');

  const { data: pedidos } = await db.from('pedidos').select('user_id,cliente_nombre,cliente_telefono,cliente_email,total,created_at');
  const { data: reservas } = await db.from('reservaciones').select('user_id,nombre,user_email,created_at');

  // Agrupar por user_id o por nombre si no hay user_id
  const mapaClientes = {};

  (pedidos || []).forEach(p => {
    const key = p.user_id || ('anon_' + p.cliente_nombre);
    if (!mapaClientes[key]) {
      mapaClientes[key] = { nombre: p.cliente_nombre, telefono: p.cliente_telefono, email: p.cliente_email || null, user_id: p.user_id || null, pedidos: 0, gasto: 0, reservas: 0 };
    }
    mapaClientes[key].pedidos++;
    mapaClientes[key].gasto += Number(p.total || 0);
  });

  (reservas || []).forEach(r => {
    const key = r.user_id || ('anon_res_' + r.nombre);
    if (!mapaClientes[key]) {
      mapaClientes[key] = { nombre: r.nombre, telefono: '', email: r.user_email || null, user_id: r.user_id || null, pedidos: 0, gasto: 0, reservas: 0 };
    }
    // Si aún no tiene email, intentar tomarlo de la reservación
    if (!mapaClientes[key].email && r.user_email) mapaClientes[key].email = r.user_email;
    mapaClientes[key].reservas++;
  });

  const lista = Object.values(mapaClientes);

  document.getElementById('cl-total').textContent  = lista.length;
  document.getElementById('cl-activos').textContent = lista.filter(c => c.pedidos > 0).length;

  if (!lista.length) {
    grid.innerHTML = `<div style="color:var(--texto-suave);grid-column:1/-1;text-align:center;padding:40px"><div style="font-size:2rem;margin-bottom:14px">👥</div>No hay clientes registrados</div>`;
    return;
  }

  grid.innerHTML = lista.map(c => {
    const inicial = (c.nombre || '?').charAt(0).toUpperCase();
    const dataAttr = encodeURIComponent(JSON.stringify(c));
    return `<div class="cliente-card" style="cursor:pointer" onclick="verCliente(decodeURIComponent('${dataAttr}'))">
      <div class="cliente-avatar">${inicial}</div>
      <div class="cliente-nombre">${c.nombre}</div>
      <div class="cliente-email">${c.telefono || 'Sin teléfono'}</div>
      <div class="cliente-stats">
        <div class="cliente-stat">
          <div class="cliente-stat-num">${c.pedidos}</div>
          <div class="cliente-stat-lbl">Pedidos</div>
        </div>
        <div class="cliente-stat">
          <div class="cliente-stat-num">$${c.gasto.toFixed(0)}</div>
          <div class="cliente-stat-lbl">Gasto</div>
        </div>
        <div class="cliente-stat">
          <div class="cliente-stat-num">${c.reservas}</div>
          <div class="cliente-stat-lbl">Reservas</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════
//   MESA MODAL
// ════════════════════════════════════════
let mesaActual = null;

async function abrirModalMesa(jsonStr) {
  const m = JSON.parse(jsonStr);
  mesaActual = m;

  document.getElementById('modal-mesa-titulo').textContent = `Mesa ${m.numero} — ${m.zona}`;

  // Info de la mesa
  let infoHtml = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div style="background:rgba(45,16,8,0.5);border-radius:7px;padding:14px;text-align:center">
        <div style="font-size:1.6rem;font-weight:700;color:var(--ambar)">${m.numero}</div>
        <div style="font-size:0.65rem;color:var(--texto-suave);text-transform:uppercase;letter-spacing:1px">Mesa</div>
      </div>
      <div style="background:rgba(45,16,8,0.5);border-radius:7px;padding:14px;text-align:center">
        <div style="font-size:1.3rem;font-weight:700;color:var(--ambar)">👥 ${m.capacidad}</div>
        <div style="font-size:0.65rem;color:var(--texto-suave);text-transform:uppercase;letter-spacing:1px">Personas</div>
      </div>
      <div style="background:rgba(45,16,8,0.5);border-radius:7px;padding:14px;text-align:center">
        <div style="font-size:1rem;font-weight:700;color:${m.ocupada ? 'var(--rojo)' : '#2ecc71'}">${m.ocupada ? 'OCUPADA' : 'LIBRE'}</div>
        <div style="font-size:0.65rem;color:var(--texto-suave);text-transform:uppercase;letter-spacing:1px">Estado</div>
      </div>
    </div>`;

  if (m.ocupada && m.reserva) {
    infoHtml += `
      <div style="background:rgba(231,76,60,0.06);border:1px solid rgba(231,76,60,0.2);border-radius:7px;padding:16px;margin-bottom:4px">
        <div style="font-size:0.68rem;letter-spacing:2px;text-transform:uppercase;color:#e74c3c;margin-bottom:10px">Reserva Activa</div>
        <div style="display:flex;justify-content:space-between;font-size:0.88rem">
          <span><strong>${m.reserva.nombre}</strong></span>
          <span style="color:var(--ambar)">${m.reserva.hora}</span>
        </div>
        <div style="color:var(--texto-suave);font-size:0.82rem;margin-top:4px">${m.reserva.telefono || ''} · ${m.reserva.personas} personas</div>
      </div>`;
  }

  // Cargar reservaciones futuras de esta mesa
  const hoy = new Date().toISOString().split('T')[0];
  const { data: reservasFuturas } = await db.from('reservaciones')
    .select('*').eq('mesa_id', m.id).gte('fecha', hoy)
    .order('fecha').order('hora');

  const listaFuturas = (reservasFuturas || []);
  let futuraHtml = '';
  if (listaFuturas.length) {
    futuraHtml = `
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(240,132,26,0.1)">
        <div style="font-size:0.68rem;letter-spacing:2px;text-transform:uppercase;color:var(--texto-suave);margin-bottom:10px">Próximas Reservaciones</div>
        ${listaFuturas.map(r => {
          const fecha = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' });
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:rgba(45,16,8,0.5);border-radius:6px;margin-bottom:6px;font-size:0.85rem">
            <div>
              <strong>${r.nombre}</strong>
              <span style="color:var(--texto-suave);font-size:0.78rem;margin-left:8px">${r.personas} 👥</span>
            </div>
            <div style="text-align:right">
              <span style="color:var(--ambar);font-weight:700">${fecha}</span>
              <span style="color:var(--texto-suave);margin-left:8px">${r.hora}</span>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  document.getElementById('modal-mesa-contenido').innerHTML = infoHtml + futuraHtml;

  // Prellenar fecha con la del filtro activo
  const fechaFiltro = document.getElementById('mesa-fecha').value;
  document.getElementById('mr-fecha').value = fechaFiltro || hoy;
  document.getElementById('mr-nombre').value  = '';
  document.getElementById('mr-mensaje').value = '';
  document.getElementById('mr-error').textContent = '';

  abrirModal('modal-mesa');
}

async function guardarReservaMesa() {
  const nombre   = document.getElementById('mr-nombre').value.trim();
  const fecha    = document.getElementById('mr-fecha').value;
  const hora     = document.getElementById('mr-hora').value;
  const personas = document.getElementById('mr-personas').value;
  const mensaje  = document.getElementById('mr-mensaje').value.trim();
  const errEl    = document.getElementById('mr-error');

  if (!nombre || !fecha) { errEl.textContent = 'Nombre y fecha son obligatorios.'; return; }

  errEl.textContent = '';

  const { error } = await db.from('reservaciones').insert({
    nombre, fecha, hora, personas: parseInt(personas),
    mensaje: mensaje || null, mesa_id: mesaActual.id, estado: 'confirmada'
  });

  if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return; }

  cerrarModal('modal-mesa');
  cargarMesas();
  cargarReservaciones();
}

// ════════════════════════════════════════
//   CLIENTE MODAL
// ════════════════════════════════════════
let clienteActual = null;

async function verCliente(jsonStr) {
  const c = JSON.parse(jsonStr);
  clienteActual = c;

  document.getElementById('modal-cliente-titulo').textContent = c.nombre;

  // Cargar historial de pedidos de este cliente
  const { data: pedidosCliente } = await db.from('pedidos')
    .select('*')
    .eq('cliente_nombre', c.nombre)
    .order('created_at', { ascending: false });

  const { data: reservasCliente } = await db.from('reservaciones')
    .select('*')
    .eq('nombre', c.nombre)
    .order('fecha', { ascending: false });

  const pedidos  = pedidosCliente  || [];
  const reservas = reservasCliente || [];
  const ticketPromedio = pedidos.length ? (c.gasto / pedidos.length).toFixed(2) : '0.00';
  const ultimaVisita   = pedidos.length
    ? new Date(pedidos[0].created_at).toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })
    : '—';

  const historialPedidos = pedidos.slice(0, 5).map(p => {
    const hora  = new Date(p.created_at).toLocaleDateString('es-ES', { day:'numeric', month:'short' });
    const items = Array.isArray(p.items) ? p.items.map(i => `${i.emoji||''} ${i.nombre} x${i.cantidad}`).join(', ') : '—';
    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid rgba(240,132,26,0.06);font-size:0.85rem">
      <div>
        <span style="color:var(--ambar);font-weight:700">${p.numero_pedido}</span>
        <span style="color:var(--texto-suave);margin-left:10px;font-size:0.78rem">${hora}</span>
        <div style="color:var(--texto-suave);font-size:0.78rem;margin-top:3px">${items}</div>
      </div>
      <span style="color:var(--ambar);font-weight:700;white-space:nowrap">$${Number(p.total).toFixed(2)}</span>
    </div>`;
  }).join('') || '<div style="color:var(--texto-suave);font-size:0.85rem;padding:12px 0">Sin pedidos</div>';

  const historialReservas = reservas.slice(0, 3).map(r => {
    const fecha = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' });
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(240,132,26,0.06);font-size:0.85rem">
      <span>${fecha} — ${r.hora}</span>
      <span style="color:var(--texto-suave)">${r.personas} personas</span>
    </div>`;
  }).join('') || '<div style="color:var(--texto-suave);font-size:0.85rem;padding:8px 0">Sin reservaciones</div>';

  document.getElementById('modal-cliente-contenido').innerHTML = `
    <!-- Cabecera cliente -->
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid rgba(240,132,26,0.12)">
      <div style="width:58px;height:58px;background:linear-gradient(135deg,var(--fuego),var(--ambar));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:white;flex-shrink:0">
        ${c.nombre.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:1.2rem;color:var(--crema)">${c.nombre}</div>
        <div style="color:var(--texto-suave);font-size:0.82rem;margin-top:2px">${c.telefono || 'Sin teléfono registrado'}</div>
        <div style="color:var(--ambar);font-size:0.8rem;margin-top:3px">✉ ${c.email || 'Sin email registrado'}</div>
      </div>
    </div>

    <!-- Stats rápidos -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px">
      <div style="background:rgba(45,16,8,0.5);border-radius:7px;padding:14px;text-align:center">
        <div style="font-size:1.4rem;font-weight:700;color:var(--ambar)">${pedidos.length}</div>
        <div style="font-size:0.65rem;color:var(--texto-suave);letter-spacing:1px;text-transform:uppercase">Pedidos</div>
      </div>
      <div style="background:rgba(45,16,8,0.5);border-radius:7px;padding:14px;text-align:center">
        <div style="font-size:1.4rem;font-weight:700;color:var(--ambar)">$${c.gasto.toFixed(0)}</div>
        <div style="font-size:0.65rem;color:var(--texto-suave);letter-spacing:1px;text-transform:uppercase">Gasto Total</div>
      </div>
      <div style="background:rgba(45,16,8,0.5);border-radius:7px;padding:14px;text-align:center">
        <div style="font-size:1.4rem;font-weight:700;color:var(--ambar)">$${ticketPromedio}</div>
        <div style="font-size:0.65rem;color:var(--texto-suave);letter-spacing:1px;text-transform:uppercase">Ticket Medio</div>
      </div>
      <div style="background:rgba(45,16,8,0.5);border-radius:7px;padding:14px;text-align:center">
        <div style="font-size:1.4rem;font-weight:700;color:var(--ambar)">${reservas.length}</div>
        <div style="font-size:0.65rem;color:var(--texto-suave);letter-spacing:1px;text-transform:uppercase">Reservas</div>
      </div>
    </div>

    <div class="modal-fila"><span>Última visita</span><span style="color:var(--ambar)">${ultimaVisita}</span></div>

    <!-- Historial pedidos -->
    <div style="margin:20px 0 8px;font-size:0.72rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--texto-suave)">Últimos pedidos</div>
    ${historialPedidos}

    <!-- Historial reservas -->
    <div style="margin:20px 0 8px;font-size:0.72rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--texto-suave)">Últimas reservaciones</div>
    ${historialReservas}
  `;

  abrirModal('modal-cliente');
}

function irAFacturacionCliente() {
  if (!clienteActual) return;
  cerrarModal('modal-cliente');
  irA('facturacion');
  document.getElementById('fac-cliente').value  = clienteActual.nombre;
  document.getElementById('fac-telefono').value = clienteActual.telefono || '';
}

async function eliminarCliente() {
  if (!clienteActual) return;
  const nombre = clienteActual.nombre;
  if (!confirm(`¿Eliminar a "${nombre}" del sistema?\n\nSe borrarán todos sus pedidos y reservaciones. Esta acción no se puede deshacer.`)) return;

  // Borrar pedidos del cliente
  await db.from('pedidos').delete().eq('cliente_nombre', nombre);

  // Borrar reservaciones del cliente
  await db.from('reservaciones').delete().eq('nombre', nombre);

  // Si tiene user_id, borrar también por ese campo
  if (clienteActual.user_id) {
    await db.from('pedidos').delete().eq('user_id', clienteActual.user_id);
    await db.from('reservaciones').delete().eq('user_id', clienteActual.user_id);
  }

  cerrarModal('modal-cliente');
  clienteActual = null;
  cargarClientes();
  alert(`✅ Cliente "${nombre}" eliminado del sistema.`);
}

// ════════════════════════════════════════
//   FACTURACIÓN
// ════════════════════════════════════════
function agregarItemFactura(desc = '', cant = 1, precio = 0) {
  const div = document.createElement('div');
  div.className = 'item-fila';
  div.innerHTML = `
    <input type="text"   placeholder="Descripción del ítem" value="${desc}"   oninput="calcularTotales()" />
    <input type="number" placeholder="Cant."                value="${cant}"   min="1" step="1"     oninput="calcularTotales()" />
    <input type="number" placeholder="Precio"               value="${precio}" min="0" step="0.01"  oninput="calcularTotales()" />
    <button class="btn-quitar-item" onclick="this.parentElement.remove();calcularTotales()">✕</button>
  `;
  document.getElementById('items-container').appendChild(div);
  calcularTotales();
}

function calcularTotales() {
  let subtotal = 0;
  document.querySelectorAll('#items-container .item-fila').forEach(fila => {
    const inputs = fila.querySelectorAll('input');
    const cant   = parseFloat(inputs[1].value) || 0;
    const precio = parseFloat(inputs[2].value) || 0;
    subtotal += cant * precio;
  });

  const pct = parseFloat(document.getElementById('fac-iva').value) || 0;
  const iva  = subtotal * pct / 100;
  const total = subtotal + iva;

  document.getElementById('tot-subtotal').textContent = '$' + subtotal.toFixed(2);
  document.getElementById('tot-iva').textContent      = '$' + iva.toFixed(2);
  document.getElementById('tot-total').textContent    = '$' + total.toFixed(2);
  document.getElementById('tot-pct').textContent      = pct;
}

async function guardarFactura() {
  const cliente = document.getElementById('fac-cliente').value.trim();
  if (!cliente) { alert('Escribe el nombre del cliente.'); return; }

  const items = [];
  let subtotal = 0;

  document.querySelectorAll('#items-container .item-fila').forEach(fila => {
    const inputs = fila.querySelectorAll('input');
    const desc   = inputs[0].value.trim();
    const cant   = parseFloat(inputs[1].value) || 0;
    const precio = parseFloat(inputs[2].value) || 0;
    if (desc && cant && precio) {
      items.push({ descripcion: desc, cantidad: cant, precio_unit: precio, subtotal: cant * precio });
      subtotal += cant * precio;
    }
  });

  if (!items.length) { alert('Agrega al menos un ítem con descripción y precio.'); return; }

  const pct    = parseFloat(document.getElementById('fac-iva').value) || 0;
  const iva    = subtotal * pct / 100;
  const total  = subtotal + iva;
  const num    = 'FAC-' + Date.now().toString().slice(-6);

  const { data: { user } } = await db.auth.getUser();

  const { error } = await db.from('facturas').insert({
    numero_factura:   num,
    cliente_nombre:   cliente,
    cliente_email:    document.getElementById('fac-email').value.trim() || null,
    cliente_telefono: document.getElementById('fac-telefono').value.trim() || null,
    user_id:          user?.id || null,
    items,
    subtotal,
    impuesto_pct:    pct,
    impuesto_monto:  iva,
    total,
    metodo_pago:     document.getElementById('fac-pago').value,
    notas:           document.getElementById('fac-notas').value.trim() || null,
    estado:          'pendiente'
  });

  if (error) { alert('Error al guardar: ' + error.message); return; }

  // Limpiar formulario
  ['fac-cliente','fac-email','fac-telefono','fac-notas'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('items-container').innerHTML = '';
  document.getElementById('fac-iva').value = 12;
  agregarItemFactura();
  calcularTotales();

  cargarFacturas();
  alert('✅ Factura ' + num + ' guardada correctamente.');
}

async function cargarFacturas() {
  const tbody = document.getElementById('tb-facturas');
  tbody.innerHTML = `<tr><td colspan="7"><div class="estado-tabla"><div class="ic">⏳</div>Cargando...</div></td></tr>`;

  const { data, error } = await db.from('facturas')
    .select('*').order('created_at', { ascending: false });

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="estado-tabla"><div class="ic">❌</div>Error al cargar</div></td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="estado-tabla"><div class="ic">🧾</div>No hay facturas todavía</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(f => {
    const fecha  = new Date(f.created_at).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
    const estado = f.estado || 'pendiente';
    return `<tr>
      <td><strong style="color:var(--ambar)">${f.numero_factura}</strong></td>
      <td>${f.cliente_nombre}</td>
      <td style="color:var(--texto-suave)">${fecha}</td>
      <td style="color:var(--ambar);font-weight:700">$${Number(f.total).toFixed(2)}</td>
      <td style="text-transform:capitalize">${f.metodo_pago || '—'}</td>
      <td><span class="badge-estado badge-${estado === 'pagada' ? 'pagada' : 'pendiente'}">${estado}</span></td>
      <td style="display:flex;gap:6px">
        <button class="btn-accion btn-ver"  onclick="verFactura(${JSON.stringify(f).replace(/"/g,'&quot;')})">Ver</button>
        <button class="btn-accion btn-azul" onclick="imprimirFacturaDirecta(${JSON.stringify(f).replace(/"/g,'&quot;')})">🖨</button>
      </td>
    </tr>`;
  }).join('');
}

function verFactura(f) {
  facturaActual = f;
  document.getElementById('modal-fac-num').textContent = f.numero_factura;

  const items = Array.isArray(f.items)
    ? f.items.map(i => `<div class="modal-fila"><span>${i.descripcion} x${i.cantidad}</span><span>$${Number(i.subtotal).toFixed(2)}</span></div>`).join('')
    : '';

  document.getElementById('modal-factura-contenido').innerHTML = `
    <div class="modal-fila"><span>Cliente</span><span><strong>${f.cliente_nombre}</strong></span></div>
    <div class="modal-fila"><span>Email</span><span>${f.cliente_email||'—'}</span></div>
    <div class="modal-fila"><span>Teléfono</span><span>${f.cliente_telefono||'—'}</span></div>
    <div class="modal-fila"><span>Fecha</span><span>${new Date(f.created_at).toLocaleString('es-ES')}</span></div>
    <div class="modal-fila"><span>Método de pago</span><span style="text-transform:capitalize">${f.metodo_pago||'—'}</span></div>
    <div style="margin:16px 0 8px;font-size:0.72rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--texto-suave)">Items</div>
    ${items}
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(240,132,26,0.15)">
      <div class="modal-fila"><span>Subtotal</span><span>$${Number(f.subtotal).toFixed(2)}</span></div>
      <div class="modal-fila"><span>IVA (${f.impuesto_pct}%)</span><span>$${Number(f.impuesto_monto).toFixed(2)}</span></div>
      <div class="modal-fila" style="font-size:1.1rem;font-weight:700;color:var(--ambar)"><span>TOTAL</span><span>$${Number(f.total).toFixed(2)}</span></div>
    </div>
    ${f.notas ? `<div class="modal-fila"><span>Notas</span><span style="color:var(--texto-suave)">${f.notas}</span></div>` : ''}
    <div class="modal-fila"><span>Estado</span><span class="badge-estado badge-${f.estado === 'pagada' ? 'pagada' : 'pendiente'}">${f.estado||'pendiente'}</span></div>
  `;
  abrirModal('modal-factura');
}

async function marcarFacturaPagada() {
  if (!facturaActual) return;
  await db.from('facturas').update({ estado: 'pagada', pagada_at: new Date().toISOString() }).eq('id', facturaActual.id);
  cerrarModal('modal-factura');
  cargarFacturas();
}

function previsualizarFactura() {
  const cliente = document.getElementById('fac-cliente').value.trim() || 'Cliente';
  const items = [];
  let subtotal = 0;
  document.querySelectorAll('#items-container .item-fila').forEach(fila => {
    const inputs = fila.querySelectorAll('input');
    const desc   = inputs[0].value.trim();
    const cant   = parseFloat(inputs[1].value) || 0;
    const precio = parseFloat(inputs[2].value) || 0;
    if (desc) { items.push({ descripcion: desc, cantidad: cant, precio_unit: precio, subtotal: cant * precio }); subtotal += cant * precio; }
  });
  const pct   = parseFloat(document.getElementById('fac-iva').value) || 0;
  const iva   = subtotal * pct / 100;
  const total = subtotal + iva;
  const num   = 'PREV-' + Date.now().toString().slice(-4);
  construirPrintArea({ numero_factura: num, cliente_nombre: cliente, items, subtotal, impuesto_pct: pct, impuesto_monto: iva, total, created_at: new Date().toISOString(), metodo_pago: document.getElementById('fac-pago').value });
  window.print();
}

function imprimirFactura() {
  if (!facturaActual) return;
  construirPrintArea(facturaActual);
  cerrarModal('modal-factura');
  setTimeout(() => window.print(), 200);
}

function imprimirFacturaDirecta(f) {
  construirPrintArea(f);
  setTimeout(() => window.print(), 200);
}

function construirPrintArea(f) {
  const items = Array.isArray(f.items)
    ? f.items.map(i => `<tr><td>${i.descripcion}</td><td style="text-align:center">${i.cantidad}</td><td style="text-align:right">$${Number(i.precio_unit||0).toFixed(2)}</td><td style="text-align:right">$${Number(i.subtotal).toFixed(2)}</td></tr>`).join('')
    : '';

  document.getElementById('print-area').innerHTML = `
    <div class="print-logo">La Cueva Latina</div>
    <div class="print-sub">Restaurante · Factura</div>
    <div class="print-info">
      <div><strong>Factura:</strong> ${f.numero_factura}<br><strong>Fecha:</strong> ${new Date(f.created_at).toLocaleDateString('es-ES')}<br><strong>Pago:</strong> ${f.metodo_pago||'—'}</div>
      <div><strong>Cliente:</strong> ${f.cliente_nombre}<br>${f.cliente_email||''}<br>${f.cliente_telefono||''}</div>
    </div>
    <table class="print-tabla">
      <thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">P. Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${items}</tbody>
    </table>
    <div class="print-totales">
      <div class="print-total-line"><span>Subtotal</span><span>$${Number(f.subtotal).toFixed(2)}</span></div>
      <div class="print-total-line"><span>IVA (${f.impuesto_pct}%)</span><span>$${Number(f.impuesto_monto).toFixed(2)}</span></div>
      <div class="print-total-line print-total-final"><span>TOTAL</span><span>$${Number(f.total).toFixed(2)}</span></div>
    </div>
    <div class="print-firma">
      <div>Firma del cliente</div>
      <div>Firma del cajero</div>
    </div>
  `;
}

// ════════════════════════════════════════
//   REPORTES
// ════════════════════════════════════════
async function cargarReporte() {
  const mes  = parseInt(document.getElementById('rep-mes').value);
  const anio = parseInt(document.getElementById('rep-anio').value) || new Date().getFullYear();

  const inicio = new Date(anio, mes - 1, 1).toISOString();
  const fin    = new Date(anio, mes, 0, 23, 59, 59).toISOString();

  const [resRes, pedRes, facRes] = await Promise.all([
    db.from('reservaciones').select('*').gte('created_at', inicio).lte('created_at', fin),
    db.from('pedidos').select('*').gte('created_at', inicio).lte('created_at', fin),
    db.from('facturas').select('*').gte('created_at', inicio).lte('created_at', fin)
  ]);

  const reservas = resRes.data || [];
  const pedidos  = pedRes.data || [];
  const facturas = facRes.data || [];

  const ingresos = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);

  document.getElementById('rep-reservas').textContent = reservas.length;
  document.getElementById('rep-pedidos').textContent  = pedidos.length;
  document.getElementById('rep-ingresos').textContent = '$' + ingresos.toFixed(0);
  document.getElementById('rep-facturas').textContent = facturas.length;

  // Gráfica por semanas
  const semanas = [0, 0, 0, 0, 0];
  pedidos.forEach(p => {
    const dia = new Date(p.created_at).getDate();
    const sem = Math.min(Math.floor((dia - 1) / 7), 4);
    semanas[sem] += Number(p.total || 0);
  });
  const maxSem = Math.max(...semanas, 1);
  document.getElementById('grafica-semanas').innerHTML = semanas.map((v, i) => `
    <div class="barra-col">
      <div class="barra-val">${v > 0 ? '$' + v.toFixed(0) : ''}</div>
      <div class="barra" style="height:${(v / maxSem * 100)}%"></div>
      <div class="barra-lbl">Sem ${i + 1}</div>
    </div>
  `).join('');

  // Gráfica por día de la semana
  const diasNombres = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const diasCount   = [0, 0, 0, 0, 0, 0, 0];
  reservas.forEach(r => {
    if (r.fecha) {
      const d = new Date(r.fecha + 'T12:00:00').getDay();
      diasCount[d]++;
    }
  });
  const maxDia = Math.max(...diasCount, 1);
  document.getElementById('grafica-dias').innerHTML = diasNombres.map((nombre, i) => `
    <div class="barra-col">
      <div class="barra-val">${diasCount[i] > 0 ? diasCount[i] : ''}</div>
      <div class="barra" style="height:${(diasCount[i] / maxDia * 100)}%"></div>
      <div class="barra-lbl">${nombre}</div>
    </div>
  `).join('');
}

function imprimirReporte() {
  window.print();
}

// ════════════════════════════════════════
//   MODALES
// ════════════════════════════════════════
function abrirModal(id)  { document.getElementById(id).classList.add('visible'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('visible'); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    cerrarModal('modal-pedido');
    cerrarModal('modal-factura');
  }
});
