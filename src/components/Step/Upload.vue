<script lang="ts" setup>
import { useSplitBill } from '../../composables/useSplitBill'

const {
  file,
  error,
  isDragOver,
  fileInput,
  formatFileSize,
  triggerFileInput,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  clearFile,
  startParsing,
  goToStep,
} = useSplitBill()
</script>

<template>
  <div
    class="step-page-editorial flex flex-col items-center justify-center p-4 py-12"
  >
    <div class="w-full max-w-2xl">
      <!-- Header -->
      <div class="step-header-editorial">
        <button class="back-link-editorial mb-6" @click="goToStep('landing')">
          <IconChevronLeft class="w-4 h-4" />
          Back to Home
        </button>
        <h1 class="step-title-editorial">Receipt Ready?</h1>
        <p class="step-subtitle-editorial">
          Sharp photo in, fair split out. Simple as that.
        </p>
      </div>

      <!-- File Upload -->
      <div class="mb-8">
        <div
          class="upload-zone-editorial"
          :class="{
            'drag-over': isDragOver,
            'has-file': file
          }"
          role="button"
          tabindex="0"
          aria-label="Upload receipt image"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
          @click="triggerFileInput"
          @keydown.enter.prevent="triggerFileInput"
          @keydown.space.prevent="triggerFileInput"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp"
            class="hidden"
            @change="onFileSelect"
          >

          <div class="flex flex-col items-center justify-center">
            <div class="w-16 h-16 mb-6 flex items-center justify-center">
              <IconCamera
                class="w-full h-full"
                :class="
                  file
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-border)]'
                "
              />
            </div>
            <div v-if="file" class="text-center">
              <p
                class="font-serif text-xl mb-2 text-[var(--color-text-primary)]"
              >
                {{ file.name }}
              </p>
              <p class="text-caption mb-4">
                {{ formatFileSize(file.size) }}
              </p>
              <button
                class="btn-editorial btn-editorial-sm btn-editorial-danger"
                @click.stop="clearFile"
              >
                <span>Remove File</span>
              </button>
            </div>
            <div v-else class="text-center">
              <p
                class="font-serif text-xl mb-2 text-[var(--color-text-primary)]"
              >
                Drop your receipt here
              </p>
              <p class="text-caption">
                or click to browse · JPEG, PNG, WebP up to 10MB
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="alert-editorial alert-editorial-error mb-8">
        {{ error }}
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-center">
        <button
          :disabled="!file"
          class="btn-editorial"
          :class="{ 'opacity-50 cursor-not-allowed': !file }"
          @click="startParsing"
        >
          <span>Add Participants</span>
          <IconArrowRight class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
