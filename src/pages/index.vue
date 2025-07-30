<script lang="ts" setup>
const toast = useToast()

const handleClick = () => {
  toast.add({
    title: 'Hello World',
    description:
      'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.'
  })
}
</script>

<template>
  <UContainer class="flex flex-col items-center justify-center h-screen">
    <UButton @click="handleClick">Click me</UButton>
  </UContainer>
</template>
