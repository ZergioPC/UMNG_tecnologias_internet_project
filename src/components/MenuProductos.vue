<script setup>
import { computed, ref } from 'vue';
import { CATEGORIAS, PRODUCTOS } from '../data/productos.js';
import ModalDetalle from './ModalDetalle.vue';

const categoriaActiva = ref('todos');
const busqueda = ref('');
const modalAbierto = ref(false);
const productoSeleccionado = ref(null);

const conteoPorCategoria = computed(() => {
  const conteos = { todos: PRODUCTOS.length };
  CATEGORIAS.forEach((cat) => {
    if (cat.id !== 'todos') {
      conteos[cat.id] = PRODUCTOS.filter((p) => p.categoria === cat.id).length;
    }
  });
  return conteos;
});

const productosFiltrados = computed(() => {
  const query = busqueda.value.trim().toLowerCase();

  return PRODUCTOS.filter((producto) => {
    const coincideCategoria =
      categoriaActiva.value === 'todos' ||
      producto.categoria === categoriaActiva.value;

    if (!coincideCategoria) return false;

    if (!query) return true;

    const nombre = producto.nombre.toLowerCase();
    const desc = producto.descripcionCorta.toLowerCase();
    const ingredientes = (producto.ingredientes || []).join(' ').toLowerCase();

    return (
      nombre.includes(query) ||
      desc.includes(query) ||
      ingredientes.includes(query)
    );
  });
});

function seleccionarCategoria(id) {
  categoriaActiva.value = id;
}

function limpiarBusqueda() {
  busqueda.value = '';
}

function abrirDetalle(producto) {
  productoSeleccionado.value = producto;
  modalAbierto.value = true;
}

function cerrarModal() {
  modalAbierto.value = false;
  productoSeleccionado.value = null;
}

function agregarDirectoAlCarrito(e, plato) {
  e.stopPropagation();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cart:add', {
        detail: {
          id: plato.id,
          name: plato.nombre,
          price: plato.precio,
          imagen: plato.imagen,
          cantidad: 1,
        },
      })
    );
  }
}
</script>

<template>
  <section id="menu" class="catalogo-section">
    <!-- Encabezado de la Sección -->
    <div class="catalogo-header text-center">
      <span class="catalogo-subtitulo">SABORES AUTÉNTICOS ORIENTALES</span>
      <h2 class="catalogo-titulo">Nuestra Carta Completa</h2>
      <p class="catalogo-bajada">
        Explora nuestros platos tradicionales preparados al wok. Haz clic en cualquiera para ver sus ingredientes y detalles.
      </p>
    </div>

    <!-- Barra de Búsqueda y Filtros Reactivos -->
    <div class="controles-barra">
      <div class="buscador-caja">
        <span class="lupa-icono" aria-hidden="true">🔍</span>
        <input
          v-model="busqueda"
          type="text"
          class="buscador-input"
          placeholder="Buscar por plato, ingrediente o sabor..."
          aria-label="Buscar en el menú"
        />
        <button
          v-if="busqueda"
          type="button"
          class="btn-limpiar"
          @click="limpiarBusqueda"
          aria-label="Borrar búsqueda"
        >
          &times;
        </button>
      </div>

      <!-- Filtros por Categoría -->
      <nav class="categorias-pills" aria-label="Filtro por categorías de platos">
        <button
          v-for="cat in CATEGORIAS"
          :key="cat.id"
          type="button"
          class="pill-btn"
          :class="{ activo: categoriaActiva === cat.id }"
          @click="seleccionarCategoria(cat.id)"
        >
          <span>{{ cat.nombre }}</span>
          <span class="pill-badge">{{ conteoPorCategoria[cat.id] || 0 }}</span>
        </button>
      </nav>
    </div>

    <!-- Cuadrícula de Platos -->
    <div v-if="productosFiltrados.length > 0" class="productos-grid">
      <article
        v-for="producto in productosFiltrados"
        :key="producto.id"
        class="producto-card"
        @click="abrirDetalle(producto)"
      >
        <div class="producto-img-container">
          <img
            :src="producto.imagen"
            :alt="producto.nombre"
            class="producto-img"
            loading="lazy"
          />
          <span v-if="producto.badge" class="producto-badge">
            {{ producto.badge }}
          </span>
        </div>

        <div class="producto-cuerpo">
          <div class="producto-meta-top">
            <span class="producto-cat">{{ producto.categoria.toUpperCase() }}</span>
            <span class="producto-precio">{{ producto.precioFormateado }}</span>
          </div>

          <h3 class="producto-nombre">{{ producto.nombre }}</h3>
          <p class="producto-resumen">{{ producto.descripcionCorta }}</p>

          <div class="producto-card-footer">
            <button
              type="button"
              class="btn-card-detalle"
              @click.stop="abrirDetalle(producto)"
            >
              Ver detalles 👁️
            </button>
            <button
              type="button"
              class="btn-card-agregar"
              @click="(e) => agregarDirectoAlCarrito(e, producto)"
              title="Añadir al carrito"
              aria-label="Añadir al carrito"
            >
              🛒 +
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Estado Vacío -->
    <div v-else class="estado-vacio text-center">
      <div class="icono-vacio">🥢</div>
      <h3>No encontramos platos que coincidan</h3>
      <p>No hay resultados para "{{ busqueda }}". Prueba buscando con otro término o seleccionando otra categoría.</p>
      <button
        type="button"
        class="btn-restablecer"
        @click="limpiarBusqueda(); seleccionarCategoria('todos')"
      >
        Ver todos los platos
      </button>
    </div>

    <!-- Modal Flotante (Popup) -->
    <ModalDetalle
      :is-open="modalAbierto"
      :producto="productoSeleccionado"
      @close="cerrarModal"
    />
  </section>
</template>

<style scoped>
.catalogo-section {
  max-width: 1140px;
  margin: 3.5rem auto;
  padding: 0 1rem;
}

.catalogo-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.catalogo-subtitulo {
  font-size: 0.8rem;
  font-weight: 800;
  color: #b12715;
  letter-spacing: 0.14em;
  display: block;
  margin-bottom: 0.4rem;
}

.catalogo-titulo {
  font-size: 2.25rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 0.75rem 0;
}

.catalogo-bajada {
  font-size: 1.05rem;
  color: #4b5563;
  max-width: 620px;
  margin: 0 auto;
}

.controles-barra {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

@media (min-width: 768px) {
  .controles-barra {
    align-items: center;
  }
}

.buscador-caja {
  position: relative;
  width: 100%;
  max-width: 580px;
  margin: 0 auto;
}

.lupa-icono {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.1rem;
  pointer-events: none;
}

.buscador-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.85rem 2.8rem 0.85rem 2.8rem;
  border: 2px solid #e5e7eb;
  border-radius: 9999px;
  font-size: 0.95rem;
  outline: none;
  background-color: #ffffff;
  color: #111827;
  transition: all 0.2s ease;
}

.buscador-input:focus {
  border-color: #b12715;
  box-shadow: 0 0 0 3px rgba(177, 39, 21, 0.15);
}

.btn-limpiar {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 1.4rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.btn-limpiar:hover {
  color: #111827;
}

.categorias-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill-btn:hover {
  background: #e5e7eb;
  color: #111827;
}

.pill-btn.activo {
  background: #b12715;
  color: #ffffff;
  border-color: #b12715;
}

.pill-badge {
  background: rgba(0, 0, 0, 0.12);
  color: inherit;
  font-size: 0.72rem;
  padding: 1px 6px;
  border-radius: 9999px;
}

.pill-btn.activo .pill-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Grid de Productos */
.productos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.75rem;
}

@media (min-width: 1024px) {
  .productos-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.producto-card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.producto-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
  border-color: #fca5a5;
}

.producto-img-container {
  position: relative;
  background: #f9fafb;
  height: 180px;
  overflow: hidden;
}

.producto-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  display: block;
}

.producto-card:hover .producto-img {
  transform: scale(1.05);
}

.producto-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #b12715;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 9999px;
}

.producto-cuerpo {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.producto-meta-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.producto-cat {
  font-size: 0.7rem;
  font-weight: 800;
  color: #b12715;
  letter-spacing: 0.06em;
}

.producto-precio {
  font-size: 1.15rem;
  font-weight: 800;
  color: #111827;
}

.producto-nombre {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
  margin: 0.2rem 0 0.5rem 0;
  line-height: 1.3;
}

.producto-resumen {
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.45;
  margin-bottom: 1.2rem;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.producto-card-footer {
  margin-top: auto;
  display: flex;
  gap: 0.5rem;
}

.btn-card-detalle {
  flex: 1;
  padding: 0.55rem;
  border-radius: 8px;
  background: #fef2f2;
  color: #b12715;
  border: 1px solid #fecaca;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.producto-card:hover .btn-card-detalle {
  background: #b12715;
  color: #ffffff;
  border-color: #b12715;
}

.btn-card-agregar {
  background: #b12715;
  color: #ffffff;
  border: none;
  padding: 0.55rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-card-agregar:hover {
  background: #d8a61d;
  color: #111827;
}

/* Estado Vacío */
.estado-vacio {
  padding: 3.5rem 1rem;
  background: #f9fafb;
  border-radius: 16px;
  border: 2px dashed #e5e7eb;
}

.icono-vacio {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.estado-vacio h3 {
  font-size: 1.3rem;
  color: #111827;
  margin-bottom: 0.4rem;
}

.estado-vacio p {
  color: #6b7280;
  max-width: 480px;
  margin: 0 auto 1.25rem auto;
  font-size: 0.95rem;
}

.btn-restablecer {
  background: #b12715;
  color: #ffffff;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
}
</style>
