<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
  producto: {
    type: Object,
    default: null,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'ordenar']);

const agregado = ref(false);
const cantidad = ref(1);

function cerrar() {
  agregado.value = false;
  cantidad.value = 1;
  emit('close');
}

function handleKeydown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    cerrar();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

function agregarAlPedido() {
  agregado.value = true;
  emit('ordenar', { producto: props.producto, cantidad: cantidad.value });

  // Enlazar con el carrito del Navbar
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cart:add', {
        detail: {
          id: props.producto.id,
          name: props.producto.nombre,
          price: props.producto.precio,
          imagen: props.producto.imagen,
          cantidad: cantidad.value,
        },
      })
    );
  }

  setTimeout(() => {
    agregado.value = false;
  }, 2200);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen && producto"
        class="modal-backdrop"
        @click.self="cerrar"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`modal-title-${producto.id}`"
      >
        <div class="modal-dialog">
          <button
            type="button"
            class="modal-btn-cerrar"
            @click="cerrar"
            aria-label="Cerrar ventana emergente"
          >
            &times;
          </button>

          <div class="modal-grid">
            <!-- Columna Imagen -->
            <div class="modal-imagen-container">
              <img
                :src="producto.imagen"
                :alt="producto.nombre"
                class="modal-imagen"
              />
              <span v-if="producto.badge" class="modal-badge-flotante">
                {{ producto.badge }}
              </span>
            </div>

            <!-- Columna Información -->
            <div class="modal-info">
              <div class="modal-header-info">
                <span class="modal-categoria">{{ producto.categoria.toUpperCase() }}</span>
                <h3 :id="`modal-title-${producto.id}`" class="modal-titulo">
                  {{ producto.nombre }}
                </h3>
                <div class="modal-precio-row">
                  <span class="modal-precio">{{ producto.precioFormateado }}</span>
                  <span v-if="producto.porcion" class="modal-meta-tag">
                    👥 {{ producto.porcion }}
                  </span>
                  <span v-if="producto.tiempoPrep" class="modal-meta-tag">
                    ⏱️ {{ producto.tiempoPrep }}
                  </span>
                </div>
              </div>

              <div class="modal-cuerpo">
                <p class="modal-descripcion">
                  {{ producto.descripcionLarga || producto.descripcionCorta }}
                </p>

                <div v-if="producto.ingredientes && producto.ingredientes.length" class="modal-ingredientes-box">
                  <h4 class="modal-subtitulo">Ingredientes destacados:</h4>
                  <div class="modal-tags">
                    <span
                      v-for="(ing, idx) in producto.ingredientes"
                      :key="idx"
                      class="modal-tag"
                    >
                      {{ ing }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="modal-footer-actions">
                <div class="modal-contador">
                  <button
                    type="button"
                    class="btn-qty"
                    @click="cantidad > 1 ? cantidad-- : null"
                    :disabled="cantidad <= 1"
                    aria-label="Disminuir cantidad"
                  >
                    -
                  </button>
                  <span class="qty-numero">{{ cantidad }}</span>
                  <button
                    type="button"
                    class="btn-qty"
                    @click="cantidad++"
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  class="btn-pedir"
                  :class="{ 'btn-exito': agregado }"
                  @click="agregarAlPedido"
                >
                  <span v-if="!agregado">
                    🛒 Agregar al Pedido ({{ producto.precioFormateado }})
                  </span>
                  <span v-else>
                    ✓ ¡Agregado al pedido!
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 9999;
}

.modal-dialog {
  position: relative;
  background: #ffffff;
  border-radius: 16px;
  max-width: 820px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  animation: modal-pop 0.25s ease-out;
}

.modal-btn-cerrar {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #374151;
  font-size: 26px;
  line-height: 1;
  border: none;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.modal-btn-cerrar:hover {
  background: #b12715;
  color: #ffffff;
  transform: rotate(90deg);
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .modal-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.modal-imagen-container {
  position: relative;
  background: #f9fafb;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.modal-imagen {
  width: 100%;
  height: 100%;
  object-fit: cover;
  min-height: 260px;
  max-height: 420px;
  display: block;
}

.modal-badge-flotante {
  position: absolute;
  top: 14px;
  left: 14px;
  background: #b12715;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.modal-info {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.modal-categoria {
  font-size: 0.75rem;
  font-weight: 800;
  color: #b12715;
  letter-spacing: 0.1em;
}

.modal-titulo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0.25rem 0 0.75rem 0;
  line-height: 1.25;
}

.modal-precio-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.modal-precio {
  font-size: 1.4rem;
  font-weight: 800;
  color: #b12715;
}

.modal-meta-tag {
  background: #f3f4f6;
  color: #4b5563;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}

.modal-descripcion {
  font-size: 0.95rem;
  color: #4b5563;
  line-height: 1.55;
  margin-bottom: 1.25rem;
}

.modal-subtitulo {
  font-size: 0.85rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.5rem;
}

.modal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
}

.modal-tag {
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #ffedd5;
  font-size: 0.75rem;
  padding: 3px 9px;
  border-radius: 9999px;
  font-weight: 500;
}

.modal-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.modal-contador {
  display: inline-flex;
  align-items: center;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.btn-qty {
  background: #f9fafb;
  color: #1f2937;
  border: none;
  width: 34px;
  height: 38px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s;
}

.btn-qty:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-qty:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty-numero {
  width: 32px;
  text-align: center;
  font-weight: 700;
  font-size: 0.95rem;
  color: #111827;
}

.btn-pedir {
  flex: 1;
  background: #b12715;
  color: #ffffff;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-pedir:hover {
  background: #d8a61d;
  color: #111827;
}

.btn-pedir.btn-exito {
  background: #16a34a !important;
  color: #ffffff !important;
}

/* Transiciones */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@keyframes modal-pop {
  from {
    transform: scale(0.94);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
