// ================== Datos ==================
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const TAREAS_BASE = [
  '😴 Dormir 4.5 horas',
  '🎮 Jugar',
  '🚿 Bañarme',
  '🐕 Sacar al perro',
  '💼 Trabajar',
  '📚 Estudiar',
  '🏠 Irme a mi casa',
];

const CLAVE = 'rutina-semanal';
const HOY = (new Date().getDay() + 6) % 7; // 0 = lunes ... 6 = domingo
const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cada nota queda un poquito torcida, como pegada a mano
const ROTACIONES = [-2.2, 1.6, -1.1, 2.4, -1.8, 1.1, -2.6];

// Chulito dibujado a mano (SVG)
const CHULITO =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path pathLength="1" d="M5 17 C8 19, 10 22, 12 26 C15 18, 21 10, 29 4"/></svg>';

// Para animar solo lo que se acaba de tocar
let recien = null;
let sellar = null;

// Selección múltiple
let modoSeleccion = false;
const seleccion = new Set();

const nuevoId =() => Math.random().toString(36).slice(2, 10);
const crearSemana = () =>
  DIAS.map(() => TAREAS_BASE.map((texto) => ({ id: nuevoId(), texto, hecha: false })));

function cargar() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE));
    if (datos && Array.isArray(datos.dias) && datos.dias.length === 7) return datos;
  } catch (e) { /* sin datos guardados */ }
  return { dias: crearSemana(), filtro: 'semana', tema: null };
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch (e) { /* almacenamiento no disponible */ }
}

const estado = cargar();

// ================== Elementos ==================
const $ = (id) => document.getElementById(id);
const contenedor = $('tarjetas');

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto != null) nodo.textContent = texto;
  return nodo;
}

// ================== Dibujar ==================
function crearTarea(tarea) {
  const li = el('li', 'tarea' + (tarea.hecha ? ' hecha' : ''));
  li.dataset.id = tarea.id;

  const casilla = el('input', 'casilla');
  casilla.type = 'checkbox';
  casilla.id = 't-' + tarea.id;
  casilla.checked = tarea.hecha;

  const etiqueta = el('label', 'etiqueta');
  etiqueta.htmlFor = casilla.id;
  const check = el('span', 'check');
  check.innerHTML = CHULITO;
  etiqueta.append(check, el('span', 'texto', tarea.texto));
  if (tarea.id === recien) li.classList.add('recien');

  // En modo selección, tocar la tarea la selecciona (no la marca como hecha)
  if (modoSeleccion) {
    casilla.disabled = true;
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    const elegida = seleccion.has(tarea.id);
    li.classList.toggle('seleccionada', elegida);
    li.setAttribute('aria-pressed', elegida);
  }

  const editar = el('button', 'mini editar', '✏️');
  editar.type = 'button';
  editar.setAttribute('aria-label', 'Editar tarea');

  const borrar = el('button', 'mini borrar', '✕');
  borrar.type = 'button';
  borrar.setAttribute('aria-label', 'Borrar tarea');

  li.append(casilla, etiqueta, editar, borrar);
  return li;
}

function crearTarjeta(i) {
  const tareas = estado.dias[i];
  const hechas = tareas.filter((t) => t.hecha).length;
  const completa = tareas.length > 0 && hechas === tareas.length;
  const pct = tareas.length ? Math.round((hechas / tareas.length) * 100) : 0;

  const tarjeta = el('article', 'tarjeta');
  tarjeta.dataset.dia = i;
  tarjeta.style.setProperty('--i', i);
  tarjeta.style.setProperty('--rot', ROTACIONES[i] + 'deg');
  if (i === sellar) tarjeta.classList.add('sellar');
  if (i === HOY) tarjeta.classList.add('hoy');
  if (completa) tarjeta.classList.add('completa');

  // Cabecera
  const cabeza = el('div', 'tarjeta__cabeza');
  const titulo = el('h2', null, DIAS[i]);
  if (i === HOY) titulo.append(el('span', 'insignia', 'Hoy'));
  cabeza.append(titulo, el('span', 'contador', `${hechas}/${tareas.length}`));

  // Barra de progreso
  const barra = el('div', 'barra');
  const relleno = el('span');
  relleno.style.width = pct + '%';
  barra.append(relleno);

  tarjeta.append(cabeza, barra);
  if (completa) tarjeta.append(el('span', 'sello', '¡Hecho!'));

  // Lista de tareas
  const visibles = estado.filtro === 'pendientes' ? tareas.filter((t) => !t.hecha) : tareas;

  // Botón para seleccionar todas las tareas del día
  if (modoSeleccion && visibles.length) {
    const todas = visibles.every((t) => seleccion.has(t.id));
    const btn = el('button', 'sel-todas', todas ? 'Quitar selección' : 'Seleccionar todas');
    btn.type = 'button';
    tarjeta.append(btn);
  }
  if (visibles.length) {
    const lista = el('ul', 'lista');
    visibles.forEach((t) => lista.append(crearTarea(t)));
    tarjeta.append(lista);
  } else {
    tarjeta.append(el('p', 'vacio', tareas.length ? 'Nada pendiente 🙌' : 'Sin tareas todavía'));
  }

  // Formulario para agregar (no se muestra en modo selección)
  if (modoSeleccion) return tarjeta;
  const form = el('form', 'agregar');
  const input = el('input');
  input.placeholder = 'Nueva tarea…';
  input.maxLength = 60;
  input.setAttribute('aria-label', `Nueva tarea para el ${DIAS[i]}`);
  const boton = el('button', null, '+');
  boton.type = 'submit';
  boton.setAttribute('aria-label', 'Agregar tarea');
  form.append(input, boton);
  tarjeta.append(form);

  return tarjeta;
}

function actualizarResumen() {
  const todas = estado.dias.flat();
  const hechas = todas.filter((t) => t.hecha).length;
  const pct = todas.length ? Math.round((hechas / todas.length) * 100) : 0;

  $('hechas').textContent = hechas;
  $('total').textContent = todas.length;
  $('porcentaje').textContent = pct + '%';
  $('anillo').style.setProperty('--p', pct);

  let mensaje = '¡Arranquemos la semana! 🚀';
  if (pct === 100) mensaje = '¡Semana perfecta! 🏆';
  else if (pct >= 75) mensaje = '¡Ya casi lo logras! 🔥';
  else if (pct >= 40) mensaje = 'Vas muy bien, sigue así 💪';
  else if (pct > 0) mensaje = 'Buen comienzo, paso a paso ✨';
  $('mensaje').textContent = mensaje;
}

function render() {
  contenedor.innerHTML = '';
  DIAS.forEach((_, i) => {
    if (estado.filtro === 'hoy' && i !== HOY) return;
    contenedor.append(crearTarjeta(i));
  });

  document.querySelectorAll('.filtro').forEach((b) => {
    b.classList.toggle('activo', b.dataset.filtro === estado.filtro);
  });

  actualizarResumen();
  guardar();
  recien = null;
  sellar = null;
}

// ================== Confeti ==================
function confeti(tarjeta) {
  if (sinMovimiento || !tarjeta) return;
  const colores = ['#f57f30', '#e8476b', '#22a06b', '#ffc53d', '#6c8cff'];
  for (let k = 0; k < 30; k++) {
    const p = el('span', 'confeti');
    p.style.background = colores[k % colores.length];
    p.style.setProperty('--x', (Math.random() * 2 - 1) * 150 + 'px');
    p.style.setProperty('--y', -(Math.random() * 140 + 40) + 'px');
    p.style.setProperty('--r', Math.random() * 720 + 'deg');
    p.addEventListener('animationend', () => p.remove());
    tarjeta.append(p);
  }
}

// ================== Acciones ==================
const datosDe = (nodo) => {
  const dia = Number(nodo.closest('.tarjeta').dataset.dia);
  const li = nodo.closest('.tarea');
  const tarea = li ? estado.dias[dia].find((t) => t.id === li.dataset.id) : null;
  return { dia, li, tarea };
};

const tarjetaDe = (dia) => contenedor.querySelector(`.tarjeta[data-dia="${dia}"]`);

// Marcar / desmarcar
contenedor.addEventListener('change', (e) => {
  if (!e.target.classList.contains('casilla')) return;
  const { dia, tarea } = datosDe(e.target);
  tarea.hecha = e.target.checked;
  recien = tarea.id;
  const terminoElDia = tarea.hecha && estado.dias[dia].every((t) => t.hecha);
  if (terminoElDia) sellar = dia;
  render();
  if (terminoElDia) confeti(tarjetaDe(dia));

  // Mantener el foco en la misma casilla (si sigue visible)
  const casilla = $('t-' + tarea.id);
  if (casilla) casilla.focus();
});

// ================== Borrar (una o varias) con opción de deshacer ==================
let copiaDeshacer = null;
let temporizadorAviso;

function borrarTareas(ids) {
  copiaDeshacer = JSON.parse(JSON.stringify(estado.dias));
  let borradas = 0;
  estado.dias = estado.dias.map((tareas) =>
    tareas.filter((t) => {
      if (ids.has(t.id)) { borradas++; return false; }
      return true;
    })
  );
  render();
  avisar(borradas === 1 ? 'Se borró 1 tarea' : `Se borraron ${borradas} tareas`);
}

function avisar(texto) {
  $('avisoTexto').textContent = texto;
  $('aviso').hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => ($('aviso').hidden = true), 6000);
}

$('deshacer').addEventListener('click', () => {
  if (!copiaDeshacer) return;
  estado.dias = copiaDeshacer;
  copiaDeshacer = null;
  $('aviso').hidden = true;
  render();
});

// ================== Modo selección ==================
function actualizarBarraSeleccion() {
  const n = seleccion.size;
  $('cuentaSeleccion').textContent = n === 1 ? '1 seleccionada' : `${n} seleccionadas`;
  $('borrarSeleccion').disabled = n === 0;
}

function cambiarModoSeleccion(activo) {
  modoSeleccion = activo;
  seleccion.clear();
  document.body.classList.toggle('modo-seleccion', activo);
  $('barraSeleccion').hidden = !activo;
  $('seleccionar').classList.toggle('activo', activo);
  $('seleccionar').textContent = activo ? '✕ Salir' : '☑ Seleccionar';
  render();
  actualizarBarraSeleccion();
}

function alternarSeleccion(li) {
  const id = li.dataset.id;
  if (seleccion.has(id)) seleccion.delete(id);
  else seleccion.add(id);
  const elegida = seleccion.has(id);
  li.classList.toggle('seleccionada', elegida);
  li.setAttribute('aria-pressed', elegida);
  actualizarBarraSeleccion();
  // actualizar el texto del botón "Seleccionar todas" de esa tarjeta
  const tarjeta = li.closest('.tarjeta');
  const btn = tarjeta.querySelector('.sel-todas');
  const ids = [...tarjeta.querySelectorAll('.tarea')].map((n) => n.dataset.id);
  if (btn) btn.textContent = ids.every((x) => seleccion.has(x)) ? 'Quitar selección' : 'Seleccionar todas';
}

$('seleccionar').addEventListener('click', () => cambiarModoSeleccion(!modoSeleccion));
$('cancelarSeleccion').addEventListener('click', () => cambiarModoSeleccion(false));

$('borrarSeleccion').addEventListener('click', () => {
  if (!seleccion.size) return;
  const ids = new Set(seleccion);
  cambiarModoSeleccion(false);
  borrarTareas(ids);
});

$('selHechas').addEventListener('click', () => {
  if (estado.filtro === 'pendientes') estado.filtro = 'semana';
  estado.dias.forEach((tareas, i) => {
    if (estado.filtro === 'hoy' && i !== HOY) return;
    tareas.forEach((t) => t.hecha && seleccion.add(t.id));
  });
  render();
  actualizarBarraSeleccion();
});

// Teclado en modo selección: Enter/Espacio selecciona, Escape sale
contenedor.addEventListener('keydown', (e) => {
  if (!modoSeleccion || !e.target.classList.contains('tarea')) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    alternarSeleccion(e.target);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modoSeleccion) cambiarModoSeleccion(false);
});

// Clics en las tarjetas: seleccionar, editar y borrar
contenedor.addEventListener('click', (e) => {
  if (modoSeleccion) {
    const todas = e.target.closest('.sel-todas');
    if (todas) {
      const ids = [...todas.closest('.tarjeta').querySelectorAll('.tarea')].map((n) => n.dataset.id);
      const yaTodas = ids.every((x) => seleccion.has(x));
      ids.forEach((x) => (yaTodas ? seleccion.delete(x) : seleccion.add(x)));
      render();
      actualizarBarraSeleccion();
      return;
    }
    const li = e.target.closest('.tarea');
    if (li) {
      e.preventDefault();
      alternarSeleccion(li);
    }
    return;
  }

  const boton = e.target.closest('.mini');
  if (!boton) return;
  const { li, tarea } = datosDe(boton);

  if (boton.classList.contains('borrar')) {
    borrarTareas(new Set([tarea.id]));
    return;
  }

  // Cambiar el texto por un campo editable
  const editor = el('input', 'editor');
  editor.value = tarea.texto;
  editor.maxLength = 60;
  li.querySelector('.etiqueta').replaceWith(editor);
  editor.focus();
  editor.select();

  let terminado = false;
  const terminar = (guardarCambios) => {
    if (terminado) return;
    terminado = true;
    const texto = editor.value.trim();
    if (guardarCambios && texto) tarea.texto = texto;
    render();
  };
  editor.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); terminar(true); }
    if (ev.key === 'Escape') terminar(false);
  });
  editor.addEventListener('blur', () => terminar(true));
});

// Agregar
contenedor.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const texto = input.value.trim();
  if (!texto) return input.focus();

  const { dia } = datosDe(e.target);
  estado.dias[dia].push({ id: nuevoId(), texto, hecha: false });
  render();
  tarjetaDe(dia).querySelector('.agregar input').focus();
});

// Filtros
$('filtros').addEventListener('click', (e) => {
  const boton = e.target.closest('.filtro');
  if (!boton) return;
  estado.filtro = boton.dataset.filtro;
  render();
});

// Reiniciar semana (pide un segundo clic para confirmar)
const btnReiniciar = $('reiniciar');
let temporizador;
btnReiniciar.addEventListener('click', () => {
  if (!btnReiniciar.classList.contains('confirmar')) {
    btnReiniciar.classList.add('confirmar');
    btnReiniciar.textContent = '¿Seguro? Clic otra vez';
    temporizador = setTimeout(() => {
      btnReiniciar.classList.remove('confirmar');
      btnReiniciar.textContent = 'Reiniciar semana';
    }, 3000);
    return;
  }
  clearTimeout(temporizador);
  btnReiniciar.classList.remove('confirmar');
  btnReiniciar.textContent = 'Reiniciar semana';
  estado.dias.forEach((tareas) => tareas.forEach((t) => (t.hecha = false)));
  render();
});

// Tema claro / oscuro
function aplicarTema() {
  const oscuro = estado.tema
    ? estado.tema === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
  $('tema').textContent = oscuro ? '☀️' : '🌙';
}

$('tema').addEventListener('click', () => {
  estado.tema = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  aplicarTema();
  guardar();
});

// ================== Inicio ==================
$('fecha').textContent = new Date().toLocaleDateString('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long',
});

if (!['semana', 'hoy', 'pendientes'].includes(estado.filtro)) estado.filtro = 'semana';
aplicarTema();
contenedor.classList.add('animar');
render();
setTimeout(() => contenedor.classList.remove('animar'), 1200);
