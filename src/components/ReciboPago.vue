<script setup>
import { computed } from 'vue';
import { formatCOP } from '../lib/pasarela.js';

const props = defineProps({
  recibo: {
    type: Object,
    required: true,
  },
});

const cliente = computed(() => props.recibo?.cliente ?? {});
const items = computed(() => props.recibo?.items ?? []);

const subtotal = computed(() => {
  if (Number.isFinite(Number(props.recibo?.subtotal))) {
    return Number(props.recibo.subtotal);
  }

  return items.value.reduce(
    (total, item) =>
      total + (Number(item.price) || 0) * (Number(item.cantidad) || 0),
    0
  );
});

const envio = computed(() => Number(props.recibo?.envio) || 0);
const total = computed(() => Number(props.recibo?.total) || 0);

const fechaFormateada = computed(() => {
  const fecha = props.recibo?.fecha;
  if (!fecha) return '';

  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return String(fecha);

  return valor.toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
});

const estadoTexto = computed(() =>
  props.recibo?.estado === 'pendiente'
    ? 'Pago pendiente contra entrega'
    : 'Pedido registrado'
);

function imprimir() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
</script>

<template>
  <article class="recibo">
    <header class="recibo-cabecera">
      <div class="icono-exito" aria-hidden="true">✓</div>
      <span class="recibo-kicker">PEDIDO CONFIRMADO</span>
      <h2>¡Gracias por tu pedido!</h2>
      <p>{{ recibo.mensaje }}</p>

      <div class="recibo-referencia">
        <span>Referencia:</span>
        <strong>{{ recibo.referencia }}</strong>
      </div>

      <div>
        <span class="estado-badge">{{ estadoTexto }}</span>
      </div>

      <p v-if="fechaFormateada" class="recibo-fecha">
        {{ fechaFormateada }}
      </p>
    </header>

    <div class="recibo-grid">
      <section class="recibo-bloque">
        <h3>Datos de entrega</h3>
        <p><strong>{{ cliente.nombre }}</strong></p>
        <p>{{ cliente.telefono }}</p>
        <p>{{ cliente.correo }}</p>
        <p>{{ cliente.direccion }}</p>
        <p>{{ cliente.ciudad }}</p>
        <p v-if="cliente.notas"><strong>Notas:</strong> {{ cliente.notas }}</p>
      </section>

      <section class="recibo-bloque">
        <h3>Forma de pago</h3>
        <p><strong>Contra entrega</strong></p>
        <p>Pagas en efectivo al recibir tu pedido.</p>
        <p v-if="recibo.efectivoCon">
          <strong>Pagas con:</strong> {{ formatCOP(recibo.efectivoCon) }}
        </p>
        <p v-if="recibo.cambio !== null && recibo.cambio !== undefined">
          <strong>Cambio estimado:</strong> {{ formatCOP(recibo.cambio) }}
        </p>
      </section>
    </div>

    <section class="recibo-items">
      <h3>Productos</h3>
      <div v-for="item in items" :key="item.id ?? item.name" class="recibo-item">
        <span>
          {{ item.name }}
          <span class="cant">× {{ item.cantidad }}</span>
        </span>
        <strong>{{ formatCOP(item.price * item.cantidad) }}</strong>
      </div>
    </section>

    <div class="recibo-totales">
      <div>
        <span>Subtotal</span>
        <span>{{ formatCOP(subtotal) }}</span>
      </div>
      <div>
        <span>Envío domicilio</span>
        <span>{{ formatCOP(envio) }}</span>
      </div>
      <div class="total">
        <span>Total a pagar al recibir</span>
        <span>{{ formatCOP(total) }}</span>
      </div>
    </div>

    <footer class="recibo-acciones pago-no-print">
      <button type="button" class="recibo-btn primario" @click="imprimir">
        🖨️ Imprimir recibo
      </button>
      <a href="/#menu" class="recibo-btn secundario">Volver al menú</a>
    </footer>
  </article>
</template>

<style scoped>
.recibo {
  max-width: 780px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 2rem;
  box-shadow: 0 12px 32px rgba(17, 24, 39, 0.08);
}

.recibo-cabecera {
  text-align: center;
  padding-bottom: 1.25rem;
  border-bottom: 1px dashed #e5e7eb;
}

.icono-exito {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #dcfce7;
  color: #16a34a;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.85rem;
}

.recibo-kicker {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #16a34a;
  margin-bottom: 0.3rem;
}

.recibo-cabecera h2 {
  margin: 0 0 0.35rem;
  font-size: 1.55rem;
  font-weight: 800;
  color: #111827;
}

.recibo-cabecera > p {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.recibo-referencia {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.9rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  font-size: 0.8rem;
  color: #4b5563;
}

.recibo-referencia strong {
  color: #111827;
  letter-spacing: 0.03em;
}

.estado-badge {
  display: inline-block;
  margin-top: 0.75rem;
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fed7aa;
  border-radius: 9999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.74rem;
  font-weight: 800;
}

.recibo-fecha {
  margin-top: 0.55rem !important;
  font-size: 0.78rem !important;
  color: #9ca3af !important;
}

.recibo-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: 1fr;
  padding: 1.25rem 0;
}

@media (min-width: 640px) {
  .recibo-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.recibo-bloque h3,
.recibo-items h3 {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
}

.recibo-bloque p {
  margin: 0.15rem 0;
  font-size: 0.87rem;
  color: #374151;
  line-height: 1.4;
}

.recibo-bloque p strong {
  color: #111827;
}

.recibo-items {
  border-top: 1px dashed #e5e7eb;
  padding-top: 1rem;
}

.recibo-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.45rem 0;
  font-size: 0.87rem;
  color: #374151;
}

.recibo-item > span {
  flex: 1;
}

.recibo-item strong {
  color: #111827;
  white-space: nowrap;
}

.cant {
  color: #9ca3af;
  font-size: 0.78rem;
}

.recibo-totales {
  margin-top: 1rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
  display: grid;
  gap: 0.35rem;
}

.recibo-totales > div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.87rem;
  color: #4b5563;
}

.recibo-totales .total {
  margin-top: 0.35rem;
  padding-top: 0.55rem;
  border-top: 1px solid #e5e7eb;
  font-size: 1.05rem;
  font-weight: 800;
  color: #111827;
}

.recibo-totales .total span:last-child {
  color: #b12715;
}

.recibo-acciones {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.recibo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.75rem 1.15rem;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 0.92rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recibo-btn.primario {
  background: #b12715;
  color: #ffffff;
}

.recibo-btn.primario:hover {
  background: #d8a61d;
  color: #111827;
}

.recibo-btn.secundario {
  background: #ffffff;
  color: #374151;
  border-color: #d1d5db;
}

.recibo-btn.secundario:hover {
  background: #f9fafb;
  color: #111827;
}

@media print {
  .recibo {
    border: none;
    box-shadow: none;
    max-width: 100%;
    padding: 0;
  }
}
</style>
