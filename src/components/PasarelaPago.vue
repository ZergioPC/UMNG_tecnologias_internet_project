<script setup>
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';
import {
  CART_STORAGE_KEY,
  ETAPAS_PROCESO,
  calcularTotales,
  formatCOP,
  normalizarCarrito,
  validarCorreo,
  validarTelefono,
} from '../lib/pasarela.js';
import ReciboPago from './ReciboPago.vue';
import ResumenPedido from './ResumenPedido.vue';

const pasos = [
  { numero: 1, titulo: 'Carrito' },
  { numero: 2, titulo: 'Entrega' },
  { numero: 3, titulo: 'Confirmar' },
];

const paso = ref(1);
const cargado = ref(false);
const items = ref([]);
const acepta = ref(false);
const procesando = ref(false);
const etapaActual = ref(0);
const recibo = ref(null);
const errorPago = ref('');
const formulario = ref(crearFormularioVacio());
const errores = ref({});

function crearFormularioVacio() {
  return {
    nombre: '',
    correo: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    notas: '',
    efectivoCon: '',
  };
}

const totales = computed(() => calcularTotales(items.value));

const cambioEstimado = computed(() => {
  if (formulario.value.efectivoCon === '') return null;

  const valor = Number(formulario.value.efectivoCon);
  if (!Number.isFinite(valor) || valor < totales.value.total) return null;

  return valor - totales.value.total;
});

function leerCarrito() {
  if (typeof window === 'undefined') return [];

  try {
    const crudo = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!crudo) return [];
    return normalizarCarrito(JSON.parse(crudo));
  } catch {
    return [];
  }
}

function persistirCarrito() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(items.value)
    );
  } catch (error) {
    console.error(error);
  }

  window.dispatchEvent(new CustomEvent('cart:updated'));
}

function sincronizarCarrito() {
  // No alterar el resumen mientras se procesa el pedido o se muestra el recibo.
  if (paso.value >= 4) return;
  items.value = leerCarrito();
}

function alCambiarStorage(event) {
  if (!event.key || event.key === CART_STORAGE_KEY) {
    sincronizarCarrito();
  }
}

function buscarItem(item) {
  return items.value.find((actual) => actual.name === item.name);
}

function cambiarCantidad(item, delta) {
  const actual = buscarItem(item);
  if (!actual) return;

  actual.cantidad = Math.min(20, Math.max(1, actual.cantidad + delta));
  persistirCarrito();
}

function eliminarItem(item) {
  items.value = items.value.filter((actual) => actual.name !== item.name);
  persistirCarrito();
}

function limpiarError(campo) {
  if (errorPago.value) errorPago.value = '';

  if (!errores.value[campo]) return;

  const copia = { ...errores.value };
  delete copia[campo];
  errores.value = copia;
}

function validarEntrega() {
  const nuevos = {};
  const datos = formulario.value;

  if (datos.nombre.trim().length < 2) {
    nuevos.nombre = 'Escribe tu nombre completo.';
  }

  if (!validarCorreo(datos.correo)) {
    nuevos.correo = 'Escribe un correo electrónico válido.';
  }

  if (!validarTelefono(datos.telefono)) {
    nuevos.telefono = 'Escribe un teléfono de 7 a 15 dígitos.';
  }

  if (datos.direccion.trim().length < 5) {
    nuevos.direccion = 'Escribe la dirección de entrega.';
  }

  if (!datos.ciudad.trim()) {
    nuevos.ciudad = 'Indica la ciudad o barrio.';
  }

  if (datos.efectivoCon !== '' && datos.efectivoCon !== null) {
    const valor = Number(datos.efectivoCon);

    if (!Number.isInteger(valor) || valor < totales.value.total) {
      nuevos.efectivoCon = `Debe ser igual o mayor a ${formatCOP(
        totales.value.total
      )}.`;
    }
  }

  errores.value = nuevos;
  return Object.keys(nuevos).length === 0;
}

function irAConfirmacion() {
  if (!validarEntrega()) return;
  errorPago.value = '';
  paso.value = 3;
}

function volverAEntrega() {
  errorPago.value = '';
  paso.value = 2;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function confirmarPedido() {
  if (!acepta.value || procesando.value) return;

  if (items.value.length === 0) {
    errorPago.value = 'Tu carrito está vacío.';
    return;
  }

  if (items.value.some((item) => !Number.isSafeInteger(item.id))) {
    errorPago.value =
      'Uno de los productos ya no está disponible. Vuelve al menú y agrégalo de nuevo.';
    return;
  }

  errorPago.value = '';
  procesando.value = true;
  etapaActual.value = 0;
  paso.value = 4;

  const itemsSnapshot = items.value.map((item) => ({ ...item }));
  const formularioSnapshot = { ...formulario.value };
  const totalesSnapshot = { ...totales.value };

  try {
    await esperar(600);
    etapaActual.value = 1;
    await esperar(600);
    etapaActual.value = 2;

    const respuesta = await fetch('/api/pagos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre: formularioSnapshot.nombre.trim(),
        correo: formularioSnapshot.correo.trim(),
        telefono: formularioSnapshot.telefono.trim(),
        direccion: formularioSnapshot.direccion.trim(),
        ciudad: formularioSnapshot.ciudad.trim(),
        notas: formularioSnapshot.notas.trim(),
        items: itemsSnapshot.map((item) => ({
          id: item.id,
          cantidad: item.cantidad,
        })),
        efectivoCon:
          formularioSnapshot.efectivoCon === ''
            ? null
            : Number(formularioSnapshot.efectivoCon),
        metodo: 'contra_entrega',
      }),
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        datos.error || 'No se pudo registrar el pedido. Intenta de nuevo.'
      );
    }

    etapaActual.value = 3;
    await esperar(250);

    recibo.value = {
      ...datos,
      cliente: formularioSnapshot,
      items: itemsSnapshot,
      subtotal: datos.subtotal ?? totalesSnapshot.subtotal,
      envio: datos.envio ?? totalesSnapshot.envio,
      total: datos.total ?? totalesSnapshot.total,
    };

    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.error(error);
    }

    items.value = [];
    window.dispatchEvent(new CustomEvent('cart:updated'));
    paso.value = 5;
  } catch (error) {
    console.error(error);
    errorPago.value =
      error?.message ||
      'No se pudo registrar el pedido. Intenta de nuevo.';
    paso.value = 3;
  } finally {
    procesando.value = false;
  }
}

onMounted(() => {
  items.value = leerCarrito();
  cargado.value = true;
  window.addEventListener('cart:updated', sincronizarCarrito);
  window.addEventListener('storage', alCambiarStorage);
});

onUnmounted(() => {
  window.removeEventListener('cart:updated', sincronizarCarrito);
  window.removeEventListener('storage', alCambiarStorage);
});
</script>

<template>
  <section class="pasarela">
    <header class="pasarela-header pago-no-print">
      <span class="pasarela-kicker">CHECKOUT</span>
      <h1>Realiza tu Pago</h1>
      <p>
        Pedido a domicilio con pago contra entrega. No se realizan cargos en
        línea.
      </p>
    </header>

    <div v-if="!cargado" class="cargando pago-no-print">
      Cargando tu pedido…
    </div>

    <template v-else-if="paso === 5 && recibo">
      <ReciboPago :recibo="recibo" />
    </template>

    <section v-else-if="items.length === 0" class="vacio pago-no-print">
      <div class="vacio-icono" aria-hidden="true">🥢</div>
      <h2>Tu carrito está vacío</h2>
      <p>
        Agrega algunos platos desde la carta para iniciar tu pedido a
        domicilio.
      </p>
      <a class="pago-btn" href="/#menu">Ver el menú</a>
    </section>

    <template v-else>
      <ol class="stepper pago-no-print" aria-label="Pasos del checkout">
        <li
          v-for="p in pasos"
          :key="p.numero"
          :class="{
            activo: paso === p.numero,
            completado: paso > p.numero,
          }"
        >
          <span class="stepper-numero">
            {{ paso > p.numero ? '✓' : p.numero }}
          </span>
          <span class="stepper-label">{{ p.titulo }}</span>
        </li>
      </ol>

      <section
        v-if="paso === 4"
        class="pago-panel procesando pago-no-print"
        aria-live="polite"
      >
        <div class="spinner" aria-hidden="true"></div>
        <h2>Procesando tu pedido…</h2>
        <p class="panel-sub">
          Estamos registrando la orden y confirmando el pago contra entrega.
        </p>

        <ul class="etapas">
          <li
            v-for="(etapa, indice) in ETAPAS_PROCESO"
            :key="etapa"
            :class="{
              activa: etapaActual === indice,
              completada: etapaActual > indice,
            }"
          >
            <span class="etapa-icono">
              {{ etapaActual > indice ? '✓' : indice + 1 }}
            </span>
            {{ etapa }}
          </li>
        </ul>
      </section>

      <div v-else class="layout">
        <section class="pago-panel">
          <div v-if="paso === 1" key="paso-1" class="paso-contenido">
              <h2>Revisa tu pedido</h2>
              <p class="panel-sub">
                Ajusta las cantidades antes de continuar con la entrega.
              </p>

              <ResumenPedido
                :items="items"
                editable
                @cambiar-cantidad="cambiarCantidad"
                @eliminar="eliminarItem"
              />

              <div class="acciones">
                <a class="pago-btn-secundario" href="/#menu">
                  Seguir comprando
                </a>
                <button
                  type="button"
                  class="pago-btn"
                  @click="paso = 2"
                >
                  Continuar con la entrega
                </button>
              </div>
            </div>

            <form
              v-else-if="paso === 2"
              key="paso-2"
              class="paso-contenido"
              novalidate
              @submit.prevent="irAConfirmacion"
            >
              <h2>Datos de entrega</h2>
              <p class="panel-sub">¿A dónde llevamos tu pedido?</p>

              <div class="pago-grid">
                <div class="pago-field">
                  <label for="pago-nombre">Nombre completo *</label>
                  <input
                    id="pago-nombre"
                    v-model="formulario.nombre"
                    type="text"
                    class="pago-input"
                    :class="{ 'pago-input-error': errores.nombre }"
                    autocomplete="name"
                    placeholder="Ej. Ana Pérez"
                    :aria-invalid="errores.nombre ? 'true' : 'false'"
                    :aria-describedby="
                      errores.nombre ? 'error-pago-nombre' : undefined
                    "
                    @input="limpiarError('nombre')"
                  />
                  <p
                    v-if="errores.nombre"
                    id="error-pago-nombre"
                    class="pago-error"
                    role="alert"
                  >
                    {{ errores.nombre }}
                  </p>
                </div>

                <div class="pago-field">
                  <label for="pago-correo">Correo electrónico *</label>
                  <input
                    id="pago-correo"
                    v-model="formulario.correo"
                    type="email"
                    class="pago-input"
                    :class="{ 'pago-input-error': errores.correo }"
                    autocomplete="email"
                    inputmode="email"
                    placeholder="tucorreo@ejemplo.com"
                    :aria-invalid="errores.correo ? 'true' : 'false'"
                    :aria-describedby="
                      errores.correo ? 'error-pago-correo' : undefined
                    "
                    @input="limpiarError('correo')"
                  />
                  <p
                    v-if="errores.correo"
                    id="error-pago-correo"
                    class="pago-error"
                    role="alert"
                  >
                    {{ errores.correo }}
                  </p>
                </div>

                <div class="pago-field">
                  <label for="pago-telefono">Teléfono *</label>
                  <input
                    id="pago-telefono"
                    v-model="formulario.telefono"
                    type="tel"
                    class="pago-input"
                    :class="{ 'pago-input-error': errores.telefono }"
                    autocomplete="tel"
                    inputmode="tel"
                    placeholder="Ej. 3001234567"
                    :aria-invalid="errores.telefono ? 'true' : 'false'"
                    :aria-describedby="
                      errores.telefono ? 'error-pago-telefono' : undefined
                    "
                    @input="limpiarError('telefono')"
                  />
                  <p
                    v-if="errores.telefono"
                    id="error-pago-telefono"
                    class="pago-error"
                    role="alert"
                  >
                    {{ errores.telefono }}
                  </p>
                </div>

                <div class="pago-field">
                  <label for="pago-ciudad">Ciudad o barrio *</label>
                  <input
                    id="pago-ciudad"
                    v-model="formulario.ciudad"
                    type="text"
                    class="pago-input"
                    :class="{ 'pago-input-error': errores.ciudad }"
                    autocomplete="address-level2"
                    placeholder="Ej. Bogotá - Suba"
                    :aria-invalid="errores.ciudad ? 'true' : 'false'"
                    :aria-describedby="
                      errores.ciudad ? 'error-pago-ciudad' : undefined
                    "
                    @input="limpiarError('ciudad')"
                  />
                  <p
                    v-if="errores.ciudad"
                    id="error-pago-ciudad"
                    class="pago-error"
                    role="alert"
                  >
                    {{ errores.ciudad }}
                  </p>
                </div>

                <div class="pago-field pago-field-full">
                  <label for="pago-direccion">Dirección de entrega *</label>
                  <input
                    id="pago-direccion"
                    v-model="formulario.direccion"
                    type="text"
                    class="pago-input"
                    :class="{ 'pago-input-error': errores.direccion }"
                    autocomplete="street-address"
                    placeholder="Calle, carrera, número y referencias"
                    :aria-invalid="errores.direccion ? 'true' : 'false'"
                    :aria-describedby="
                      errores.direccion ? 'error-pago-direccion' : undefined
                    "
                    @input="limpiarError('direccion')"
                  />
                  <p
                    v-if="errores.direccion"
                    id="error-pago-direccion"
                    class="pago-error"
                    role="alert"
                  >
                    {{ errores.direccion }}
                  </p>
                </div>

                <div class="pago-field">
                  <label for="pago-efectivo">
                    ¿Con cuánto pagas?
                    <span class="pago-opcional">(opcional)</span>
                  </label>
                  <input
                    id="pago-efectivo"
                    v-model="formulario.efectivoCon"
                    type="number"
                    class="pago-input"
                    :class="{ 'pago-input-error': errores.efectivoCon }"
                    inputmode="numeric"
                    min="0"
                    step="1000"
                    placeholder="Ej. 50000"
                    :aria-invalid="
                      errores.efectivoCon ? 'true' : 'false'
                    "
                    :aria-describedby="
                      errores.efectivoCon
                        ? 'error-pago-efectivo'
                        : 'hint-pago-efectivo'
                    "
                    @input="limpiarError('efectivoCon')"
                  />
                  <p
                    v-if="errores.efectivoCon"
                    id="error-pago-efectivo"
                    class="pago-error"
                    role="alert"
                  >
                    {{ errores.efectivoCon }}
                  </p>
                  <p v-else id="hint-pago-efectivo" class="pago-hint">
                    Si pagas con un billete, calculamos tu cambio.
                  </p>
                </div>

                <div class="pago-field pago-field-full">
                  <label for="pago-notas">
                    Notas para el domiciliario
                    <span class="pago-opcional">(opcional)</span>
                  </label>
                  <textarea
                    id="pago-notas"
                    v-model="formulario.notas"
                    class="pago-textarea"
                    rows="3"
                    maxlength="300"
                    placeholder="Ej. Timbre azul, entregar en portería..."
                  ></textarea>
                </div>
              </div>

              <div class="acciones">
                <button
                  type="button"
                  class="pago-btn-secundario"
                  @click="paso = 1"
                >
                  Volver al carrito
                </button>
                <button type="submit" class="pago-btn">
                  Continuar
                </button>
              </div>
            </form>

            <div v-else-if="paso === 3" key="paso-3" class="paso-contenido">
              <h2>Confirma tu pedido</h2>
              <p class="panel-sub">
                Revisa los datos antes de registrar el pedido.
              </p>

              <div class="confirmacion-box">
                <div class="metodo-pago">
                  <span class="metodo-icono" aria-hidden="true">💵</span>
                  <div>
                    <strong>Pago contra entrega</strong>
                    <p>Pagas en efectivo cuando recibas tu pedido.</p>
                  </div>
                  <span class="metodo-check">Seleccionado</span>
                </div>

                <ul class="detalle-entrega">
                  <li>
                    <span>Nombre</span>
                    <strong>{{ formulario.nombre }}</strong>
                  </li>
                  <li>
                    <span>Teléfono</span>
                    <strong>{{ formulario.telefono }}</strong>
                  </li>
                  <li>
                    <span>Dirección</span>
                    <strong>{{ formulario.direccion }}</strong>
                  </li>
                  <li>
                    <span>Ciudad / barrio</span>
                    <strong>{{ formulario.ciudad }}</strong>
                  </li>
                  <li v-if="formulario.notas">
                    <span>Notas</span>
                    <strong>{{ formulario.notas }}</strong>
                  </li>
                  <li v-if="formulario.efectivoCon">
                    <span>Pagas con</span>
                    <strong>
                      {{ formatCOP(formulario.efectivoCon) }}
                    </strong>
                  </li>
                  <li v-if="cambioEstimado !== null">
                    <span>Cambio estimado</span>
                    <strong>{{ formatCOP(cambioEstimado) }}</strong>
                  </li>
                </ul>
              </div>

              <label class="pago-check">
                <input v-model="acepta" type="checkbox" />
                <span>
                  Confirmo que los datos de entrega son correctos y acepto
                  recibir el pedido con pago contra entrega.
                </span>
              </label>

              <p v-if="errorPago" class="pago-alerta" role="alert">
                {{ errorPago }}
              </p>

              <div class="acciones">
                <button
                  type="button"
                  class="pago-btn-secundario"
                  :disabled="procesando"
                  @click="volverAEntrega"
                >
                  Volver
                </button>
                <button
                  type="button"
                  class="pago-btn"
                  :disabled="!acepta || procesando"
                  @click="confirmarPedido"
                >
                  Confirmar pedido · {{ formatCOP(totales.total) }}
                </button>
              </div>
          </div>
        </section>

        <aside
          v-if="paso === 2 || paso === 3"
          class="resumen-col pago-no-print"
        >
          <ResumenPedido :items="items" />
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.pasarela {
  max-width: 1140px;
  margin: 2.5rem auto 4rem;
  padding: 0 1rem;
}

.pasarela-header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.pasarela-kicker {
  display: block;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: #b12715;
  margin-bottom: 0.35rem;
}

.pasarela-header h1 {
  margin: 0 0 0.5rem;
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  font-weight: 800;
  color: #111827;
}

.pasarela-header p {
  max-width: 620px;
  margin: 0 auto;
  color: #6b7280;
  font-size: 0.95rem;
}

.stepper {
  list-style: none;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
  padding: 0;
  margin: 0 0 1.5rem;
}

.stepper li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0 0.25rem;
  color: #9ca3af;
  font-size: 0.85rem;
  font-weight: 600;
}

.stepper li:not(:last-child)::after {
  content: '';
  width: 32px;
  height: 2px;
  margin-left: 0.35rem;
  background: #e5e7eb;
  border-radius: 9999px;
}

.stepper-numero {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.76rem;
  font-weight: 800;
  flex-shrink: 0;
}

.stepper li.activo {
  color: #b12715;
}

.stepper li.activo .stepper-numero {
  background: #b12715;
  color: #ffffff;
}

.stepper li.completado {
  color: #16a34a;
}

.stepper li.completado .stepper-numero {
  background: #dcfce7;
  color: #16a34a;
}

.layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (min-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  }

  .resumen-col {
    position: sticky;
    top: 1rem;
  }
}

.pago-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 18px rgba(17, 24, 39, 0.04);
}

.pago-panel h2 {
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
  font-weight: 800;
  color: #111827;
}

.panel-sub {
  margin: 0 0 1.25rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.pago-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .pago-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pago-field-full {
    grid-column: 1 / -1;
  }
}

.pago-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pago-field label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #374151;
}

.pago-opcional {
  color: #9ca3af;
  font-weight: 500;
}

.pago-input,
.pago-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
  font-family: inherit;
  font-size: 0.92rem;
  color: #111827;
  background: #ffffff;
  box-shadow: none;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.pago-textarea {
  resize: vertical;
  min-height: 84px;
}

.pago-input:focus,
.pago-textarea:focus {
  border-color: #b12715;
  box-shadow: 0 0 0 3px rgba(177, 39, 21, 0.12);
}

.pago-input-error {
  border-color: #dc2626 !important;
}

.pago-input-error:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
}

.pago-error {
  margin: 0;
  color: #dc2626;
  font-size: 0.78rem;
}

.pago-hint {
  margin: 0;
  color: #9ca3af;
  font-size: 0.75rem;
}

.acciones {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.pago-btn,
.pago-btn-secundario {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.75rem 1.15rem;
  border: 1px solid transparent;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.pago-btn {
  background: #b12715;
  color: #ffffff;
}

.pago-btn:hover:not(:disabled) {
  background: #d8a61d;
  color: #111827;
}

.pago-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pago-btn-secundario {
  background: #ffffff;
  color: #374151;
  border-color: #d1d5db;
}

.pago-btn-secundario:hover:not(:disabled) {
  background: #f9fafb;
  color: #111827;
}

.pago-btn-secundario:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.confirmacion-box {
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  padding: 1rem;
  background: #fafafa;
}

.metodo-pago {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem;
  background: #ffffff;
  border: 1.5px solid #16a34a;
  border-radius: 12px;
}

.metodo-icono {
  font-size: 1.6rem;
  line-height: 1;
}

.metodo-pago strong {
  display: block;
  color: #111827;
  font-size: 0.92rem;
}

.metodo-pago p {
  margin: 0.15rem 0 0;
  color: #6b7280;
  font-size: 0.8rem;
}

.metodo-check {
  margin-left: auto;
  background: #dcfce7;
  color: #15803d;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  white-space: nowrap;
}

.detalle-entrega {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: grid;
  gap: 0.55rem;
}

.detalle-entrega li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px dashed #e5e7eb;
  font-size: 0.86rem;
  color: #4b5563;
}

.detalle-entrega li:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.detalle-entrega li strong {
  color: #111827;
  text-align: right;
}

.pago-check {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-top: 1rem;
  color: #374151;
  font-size: 0.85rem;
  line-height: 1.45;
  cursor: pointer;
}

.pago-check input {
  margin-top: 0.15rem;
  accent-color: #b12715;
  flex-shrink: 0;
}

.pago-alerta {
  margin: 1rem 0 0;
  padding: 0.7rem 0.9rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #991b1b;
  font-size: 0.85rem;
}

.procesando {
  text-align: center;
  padding: 3rem 1.5rem;
}

.spinner {
  width: 54px;
  height: 54px;
  margin: 0 auto 1.25rem;
  border: 4px solid #fecaca;
  border-top-color: #b12715;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

.etapas {
  list-style: none;
  max-width: 420px;
  margin: 1.5rem auto 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
  text-align: left;
}

.etapas li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #9ca3af;
  font-size: 0.88rem;
}

.etapa-icono {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  flex-shrink: 0;
}

.etapas li.activa {
  color: #b12715;
  font-weight: 700;
}

.etapas li.activa .etapa-icono {
  background: #b12715;
  color: #ffffff;
}

.etapas li.completada {
  color: #15803d;
}

.etapas li.completada .etapa-icono {
  background: #dcfce7;
  color: #15803d;
}

.cargando {
  max-width: 420px;
  margin: 2rem auto;
  padding: 2rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  text-align: center;
  color: #6b7280;
}

.vacio {
  text-align: center;
  padding: 3rem 1.5rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
}

.vacio-icono {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.vacio h2 {
  margin: 0 0 0.4rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: #111827;
}

.vacio p {
  max-width: 460px;
  margin: 0 auto 1.25rem;
  color: #6b7280;
  font-size: 0.92rem;
}

.paso-contenido {
  animation: aparecer-paso 0.2s ease;
}

@keyframes aparecer-paso {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 560px) {
  .stepper li:not(:last-child)::after {
    width: 12px;
  }

  .stepper-label {
    font-size: 0.75rem;
  }

  .acciones {
    flex-direction: column-reverse;
  }

  .acciones > * {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .paso-contenido {
    animation: none;
  }

  .spinner {
    animation-duration: 2s;
  }
}
</style>
