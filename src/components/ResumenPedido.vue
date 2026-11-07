<script setup>
import { computed } from 'vue';
import { calcularTotales, formatCOP } from '../lib/pasarela.js';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  editable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['cambiar-cantidad', 'eliminar']);

const totales = computed(() => calcularTotales(props.items));

const totalUnidades = computed(() =>
  props.items.reduce(
    (total, item) => total + (Number(item.cantidad) || 0),
    0
  )
);
</script>

<template>
  <section
    class="resumen"
    aria-label="Resumen del pedido"
    :class="{ 'resumen-editable': editable }"
  >
    <header class="resumen-header">
      <h3>Tu pedido</h3>
      <span class="resumen-badge">
        {{ totalUnidades }}
        {{ totalUnidades === 1 ? 'producto' : 'productos' }}
      </span>
    </header>

    <ul class="items">
      <li v-for="item in items" :key="item.id ?? item.name" class="item">
        <img
          v-if="item.imagen"
          :src="item.imagen"
          :alt="item.name"
          class="item-img"
          loading="lazy"
        />
        <span v-else class="item-img item-img-vacia" aria-hidden="true">
          🍜
        </span>

        <div class="item-info">
          <span class="item-nombre">{{ item.name }}</span>
          <span class="item-precio">{{ formatCOP(item.price) }} c/u</span>

          <div v-if="editable" class="item-cantidad">
            <div class="cantidad">
              <button
                type="button"
                :disabled="item.cantidad <= 1"
                aria-label="Disminuir cantidad"
                @click="emit('cambiar-cantidad', item, -1)"
              >
                −
              </button>
              <span>{{ item.cantidad }}</span>
              <button
                type="button"
                :disabled="item.cantidad >= 20"
                aria-label="Aumentar cantidad"
                @click="emit('cambiar-cantidad', item, 1)"
              >
                +
              </button>
            </div>
            <button
              type="button"
              class="btn-eliminar"
              @click="emit('eliminar', item)"
            >
              Eliminar
            </button>
          </div>
        </div>

        <span class="item-total">
          {{ formatCOP(item.price * item.cantidad) }}
        </span>
      </li>
    </ul>

    <div class="totales">
      <div class="totales-fila">
        <span>Subtotal</span>
        <span>{{ formatCOP(totales.subtotal) }}</span>
      </div>
      <div class="totales-fila">
        <span>Envío domicilio</span>
        <span>{{ formatCOP(totales.envio) }}</span>
      </div>
      <div class="totales-fila total">
        <span>Total a pagar</span>
        <span>{{ formatCOP(totales.total) }}</span>
      </div>
    </div>

    <p class="resumen-nota">
      💵 El pago se realiza en efectivo cuando recibas tu pedido.
    </p>
  </section>
</template>

<style scoped>
.resumen {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 4px 18px rgba(17, 24, 39, 0.04);
}

.resumen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.resumen-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #111827;
}

.resumen-badge {
  background: #fef2f2;
  color: #b12715;
  font-size: 0.74rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  white-space: nowrap;
}

.items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.75rem;
}

.item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.item-img {
  width: 52px;
  height: 52px;
  border-radius: 9px;
  object-fit: cover;
  background: #f3f4f6;
  flex-shrink: 0;
}

.item-img-vacia {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.item-nombre {
  font-size: 0.88rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.25;
}

.item-precio {
  font-size: 0.76rem;
  color: #6b7280;
}

.item-cantidad {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: 0.35rem;
}

.cantidad {
  display: inline-flex;
  align-items: center;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.cantidad button {
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  background: #f9fafb;
  color: #374151;
  font-size: 1rem;
  cursor: pointer;
}

.cantidad button:hover:not(:disabled) {
  background: #e5e7eb;
}

.cantidad button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cantidad span {
  min-width: 26px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #111827;
}

.btn-eliminar {
  padding: 0;
  border: none;
  background: none;
  color: #9ca3af;
  font-size: 0.74rem;
  text-decoration: underline;
  cursor: pointer;
}

.btn-eliminar:hover {
  background: none;
  color: #dc2626;
}

.item-total {
  font-size: 0.86rem;
  font-weight: 800;
  color: #b12715;
  white-space: nowrap;
  align-self: flex-start;
  padding-top: 0.1rem;
}

.totales {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px dashed #e5e7eb;
  display: grid;
  gap: 0.4rem;
}

.totales-fila {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.86rem;
  color: #4b5563;
}

.totales-fila.total {
  margin-top: 0.35rem;
  padding-top: 0.55rem;
  border-top: 1px solid #e5e7eb;
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
}

.totales-fila.total span:last-child {
  color: #b12715;
}

.resumen-nota {
  margin: 0.85rem 0 0;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  border-radius: 9px;
  padding: 0.6rem 0.7rem;
  font-size: 0.78rem;
  line-height: 1.4;
}
</style>
