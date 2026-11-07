import { PRODUCTOS } from '../data/productos.js';

/** Clave usada por HeaderCart.astro para persistir el carrito. */
export const CART_STORAGE_KEY = 'chinos_cart';

/** Valor fijo del domicilio en pesos colombianos. */
export const ENVIO_FIJO = 5000;

const formateadorCOP = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
});

export function formatCOP(valor) {
  const numero = Number(valor);
  return `$${formateadorCOP.format(Number.isFinite(numero) ? numero : 0)}`;
}

export function calcularTotales(items = []) {
  const subtotal = items.reduce((total, item) => {
    const precio = Number(item?.price) || 0;
    const cantidad = Math.max(0, Number(item?.cantidad) || 0);
    return total + precio * cantidad;
  }, 0);

  const envio = items.length > 0 ? ENVIO_FIJO : 0;

  return {
    subtotal,
    envio,
    total: subtotal + envio,
  };
}

/**
 * Convierte el carrito de localStorage en items canónicos usando
 * los precios y nombres oficiales de PRODUCTOS.
 */
export function normalizarCarrito(carrito) {
  if (!Array.isArray(carrito)) return [];

  const mapa = new Map();

  carrito.forEach((item) => {
    if (!item || typeof item !== 'object') return;

    const id = Number(item.id);
    const producto = Number.isSafeInteger(id)
      ? PRODUCTOS.find((p) => p.id === id)
      : PRODUCTOS.find((p) => p.nombre === item.name);

    const nombre = producto?.nombre ?? item.name;
    if (typeof nombre !== 'string' || !nombre.trim()) return;

    const precio = Number(producto?.precio ?? item.price);
    if (!Number.isFinite(precio) || precio <= 0) return;

    const cantidad = Math.min(
      20,
      Math.max(1, Math.trunc(Number(item.cantidad) || 1))
    );

    const clave = producto ? `id-${producto.id}` : `nombre-${nombre.trim()}`;
    const existente = mapa.get(clave);

    if (existente) {
      existente.cantidad = Math.min(20, existente.cantidad + cantidad);
      return;
    }

    mapa.set(clave, {
      id: producto?.id ?? (Number.isSafeInteger(id) ? id : null),
      name: nombre.trim(),
      price: precio,
      cantidad,
      imagen: producto?.imagen ?? item.imagen ?? '',
    });
  });

  return Array.from(mapa.values());
}

export function validarCorreo(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor ?? '').trim());
}

export function normalizarTelefono(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

export function validarTelefono(valor) {
  const digitos = normalizarTelefono(valor);
  return digitos.length >= 7 && digitos.length <= 15;
}

export const ETAPAS_PROCESO = [
  'Validando datos de entrega',
  'Registrando el pedido',
  'Confirmando pago contra entrega',
];
