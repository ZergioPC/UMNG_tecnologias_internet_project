<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Chart from 'chart.js/auto';
import { formatCOP } from '../../lib/pasarela.js';

const props = defineProps({
  etiquetas: { type: Array, default: () => [] },
  valores: { type: Array, default: () => [] },
});

const lienzo = ref(null);
let grafico = null;

onMounted(() => {
  if (!lienzo.value) return;

  grafico = new Chart(lienzo.value, {
    type: 'bar',
    data: {
      labels: props.etiquetas,
      datasets: [
        {
          label: 'Ventas',
          data: props.valores,
          backgroundColor: 'rgba(177, 39, 21, 0.78)',
          hoverBackgroundColor: '#b12715',
          borderRadius: 6,
          maxBarThickness: 38,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (contexto) =>
              `Ventas: ${formatCOP(contexto.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#5f6673', font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: '#efece8' },
          border: { display: false },
          ticks: {
            color: '#5f6673',
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: (valor) => formatCOP(valor),
          },
        },
      },
    },
  });
});

onBeforeUnmount(() => {
  grafico?.destroy();
  grafico = null;
});
</script>

<template>
  <div class="grafico-canvas">
    <canvas
      ref="lienzo"
      role="img"
      aria-label="Gráfico de ventas de los últimos días"
    ></canvas>
  </div>
</template>

<style scoped>
.grafico-canvas {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
