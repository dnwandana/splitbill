<script lang="ts" setup>
const file = ref<File | null>(null)

const parseInput = async () => {
  try {
    const formData = new FormData()
    formData.append('receipt', file.value as File)

    const response = await $fetch('/api/parse', {
      method: 'POST',
      body: formData
    })
    console.log(response)
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <UContainer class="flex flex-col items-center justify-center h-screen">
    <UFileUpload
      v-model="file"
      :dropzone="true"
      class="w-96 min-h-48"
      accept="image/jpeg, image/png, image/jpg, image/webp"
    />
    <UButton @click="parseInput">Parse</UButton>
  </UContainer>
</template>
