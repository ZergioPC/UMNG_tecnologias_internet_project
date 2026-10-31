<script setup>
import { ref } from 'vue';

const count = ref(0);

function increment() {
  count.value++;
}
</script>

<template>
  <div>
    <h2>Counter: {{ count }}</h2>

    <button @click="increment">
      Increment
    </button>
  </div>
</template>