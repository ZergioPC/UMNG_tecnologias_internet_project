<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { PRODUCTOS } from '../data/productos.js';
import ModalDetalle from './ModalDetalle.vue';

const platosRecomendados = computed(() =>
  PRODUCTOS.filter((p) => p.esRecomendado)
);

const indiceActual = ref(0);
const modalAbierto = ref(false);
const productoSeleccionado = ref(null);
const viewportRef = ref(null);
const cardsPorVista = ref(3);

function actualizarCardsPorVista() {
  if (typeof window === 'undefined') return;
  const w = window.innerWidth;
  if (w < 640) {
    cardsPorVista.value = 1;
  } else if (w < 1024) {
    cardsPorVista.value = 2;
  } else {
    cardsPorVista.value = 3;
  }
}

onMounted(() => {
  actualizarCardsPorVista();
  window.addEventListener('resize', actualizarCardsPorVista);
});

onUnmounted(() => {
  window.removeEventListener('resize', actualizarCardsPorVista);
});

const maxIndice = computed(() => {
  const diff = platosRecomendados.value.length - cardsPorVista.value;
  return diff > 0 ? diff : 0;
});

function anterior() {
  if (indiceActual.value > 0) {
    indiceActual.value--;
  } else {
    indiceActual.value = maxIndice.value;
  }
}

function siguiente() {
  if (indiceActual.value < maxIndice.value) {
    indiceActual.value++;
  } else {
    indiceActual.value = 0;
  }
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

function handleImageError(e, plato) {
  if (plato && plato.fallbackImagen) {
    e.target.src = plato.fallbackImagen;
  }
}
</script>

<template>
  <section id="recomendados" class="recomendados-section">
    <!-- Encabezado Elegante y Compacto -->
    <div class="seccion-header">
      <div class="header-texto">
        <span class="subtitulo-destacado">⭐ LOS FAVORITOS DE LA CASA</span>
        <h2 class="titulo-destacado">Platos Recomendados</h2>
        <p class="bajada-destacado">
          Las especialidades más aclamadas de nuestro wok tradicional.
        </p>
      </div>

      <div class="controles-nav">
        <button
          type="button"
          class="btn-nav"
          @click="anterior"
          aria-label="Ver platos anteriores"
        >
          &#8592;
        </button>
        <button
          type="button"
          class="btn-nav"
          @click="siguiente"
          aria-label="Ver platos siguientes"
        >
          &#8594;
        </button>
      </div>
    </div>

    <!-- Carrusel Multi-Card Responsivo -->
    <div ref="viewportRef" class="carrusel-contenedor">
      <div
        class="carrusel-slider"
        :style="{
          transform: `translateX(-${indiceActual * (100 / cardsPorVista)}%)`
        }"
      >
        <div
          v-for="plato in platosRecomendados"
          :key="plato.id"
          class="carrusel-item"
        >
          <article class="tarjeta-plato" @click="abrirDetalle(plato)">
            <div class="tarjeta-img-box">
              <img
                :src="plato.imagen"
                :alt="plato.nombre"
                class="tarjeta-img"
                loading="lazy"
                @error="(e) => handleImageError(e, plato)"
              />
              <span v-if="plato.badge" class="tarjeta-badge">
                {{ plato.badge }}
              </span>
            </div>

            <div class="tarjeta-info">
              <div class="tarjeta-meta">
                <span class="tarjeta-cat">{{ plato.categoria.toUpperCase() }}</span>
                <span class="tarjeta-precio">{{ plato.precioFormateado }}</span>
              </div>

              <h3 class="tarjeta-titulo">{{ plato.nombre }}</h3>
              <p class="tarjeta-desc">{{ plato.descripcionCorta }}</p>

              <div class="tarjeta-acciones">
                <button
                  type="button"
                  class="btn-ver"
                  @click.stop="abrirDetalle(plato)"
                >
                  Detalles 👁️
                </button>
                <button
                  type="button"
                  class="btn-agregar-rapido"
                  @click="(e) => agregarDirectoAlCarrito(e, plato)"
                  title="Añadir al carrito"
                  aria-label="Añadir al carrito"
                >
                  🛒 +
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- Indicador de barra / dots -->
    <div class="carrusel-indicadores">
      <button
        v-for="idx in (maxIndice + 1)"
        :key="idx"
        type="button"
        class="indicador-dot"
        :class="{ activo: (idx - 1) === indiceActual }"
        @click="indiceActual = (idx - 1)"
        :aria-label="`Ir a grupo ${idx}`"
      />
    </div>

    <!-- Modal Flotante Reutilizable -->
    <ModalDetalle
      :is-open="modalAbierto"
      :producto="productoSeleccionado"
      @close="cerrarModal"
    />
  </section>
</template>

<style scoped>
.recomendados-section {
  max-width: 1140px;
  margin: 3rem auto;
  padding: 0 1rem;
}

.seccion-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
  border-bottom: 2px solid #f3f4f6;
  padding-bottom: 1rem;
}

.subtitulo-destacado {
  font-size: 0.75rem;
  font-weight: 800;
  color: #b12715;
  letter-spacing: 0.12em;
  display: block;
  margin-bottom: 0.25rem;
}

.titulo-destacado {
  font-size: 1.85rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 0.3rem 0;
}

.bajada-destacado {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0;
}

.controles-nav {
  display: flex;
  gap: 0.5rem;
}

.btn-nav {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #1f2937;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.btn-nav:hover {
  background: #b12715;
  color: #ffffff;
  border-color: #b12715;
  transform: translateY(-1px);
}

.carrusel-contenedor {
  overflow: hidden;
  padding: 0.5rem 0 1rem 0;
}

.carrusel-slider {
  display: flex;
  transition: transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.carrusel-item {
  flex: 0 0 100%;
  padding: 0 0.6rem;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .carrusel-item {
    flex: 0 0 50%;
  }
}

@media (min-width: 1024px) {
  .carrusel-item {
    flex: 0 0 33.3333%;
  }
}

.tarjeta-plato {
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  height: 100%;
  cursor: pointer;
  transition: all 0.25s ease;
}

.tarjeta-plato:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(177, 39, 21, 0.12);
  border-color: #fca5a5;
}

.tarjeta-img-box {
  position: relative;
  height: 190px;
  background: #f9fafb;
  overflow: hidden;
}

.tarjeta-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}

.tarjeta-plato:hover .tarjeta-img {
  transform: scale(1.06);
}

.tarjeta-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #b12715;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 9999px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.tarjeta-info {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.tarjeta-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}

.tarjeta-cat {
  font-size: 0.7rem;
  font-weight: 800;
  color: #b12715;
  letter-spacing: 0.06em;
}

.tarjeta-precio {
  font-size: 1.15rem;
  font-weight: 800;
  color: #111827;
}

.tarjeta-titulo {
  font-size: 1.15rem;
  font-weight: 700;
  color: #111827;
  margin: 0.2rem 0 0.4rem 0;
  line-height: 1.3;
}

.tarjeta-desc {
  font-size: 0.85rem;
  color: #4b5563;
  line-height: 1.45;
  margin-bottom: 1.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.tarjeta-acciones {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}

.btn-ver {
  flex: 1;
  background: #fef2f2;
  color: #b12715;
  border: 1px solid #fecaca;
  padding: 0.55rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-ver:hover {
  background: #b12715;
  color: #ffffff;
  border-color: #b12715;
}

.btn-agregar-rapido {
  background: #b12715;
  color: #ffffff;
  border: none;
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-agregar-rapido:hover {
  background: #d8a61d;
  color: #111827;
}

.carrusel-indicadores {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 1rem;
}

.indicador-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: #e5e7eb;
  cursor: pointer;
  padding: 0;
  transition: all 0.25s ease;
}

.indicador-dot.activo {
  background: #b12715;
  width: 24px;
  border-radius: 9999px;
}
</style>
