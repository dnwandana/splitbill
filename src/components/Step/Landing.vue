<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue'
import { useSplitBill } from '../../composables/useSplitBill'

const { goToStep, userCurrency, currencyItems } = useSplitBill()

// Scroll-reveal observer lives here because Landing owns the only `.reveal`
// elements. Co-locating it with the component means it re-runs on every
// (re)mount — e.g. when "Start Over" brings the user back to landing — so the
// content never stays stuck at the default opacity:0.
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          observer?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  )

  document.querySelectorAll('.reveal').forEach((el) => observer!.observe(el))
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div class="editorial-page min-h-screen">
    <!-- Subtle grain overlay -->
    <div class="grain-overlay pointer-events-none" />

    <!-- Header -->
    <header class="py-6 border-b border-[var(--color-border)]">
      <div class="container-editorial">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3 animate-fade-in">
            <span class="font-serif text-2xl font-medium tracking-tight"
              >SplitBill</span
            >
          </div>
          <div class="flex items-center gap-6">
            <select
              v-model="userCurrency"
              aria-label="Select currency"
              class="select-editorial w-28 md:w-40 animate-fade-in delay-1"
            >
              <option
                v-for="item in currencyItems"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="section-padding overflow-hidden">
      <div class="container-editorial">
        <div
          class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[70vh]"
        >
          <!-- Left: Copy -->
          <div class="order-2 lg:order-1">
            <p class="text-overline mb-6 animate-fade-in-up delay-0">
              AI-Powered Bill Splitting
            </p>
            <h1 class="text-display mb-8 animate-fade-in-up delay-1">
              Split bills.<br >
              <em class="text-[var(--color-accent)]">Effortlessly.</em>
            </h1>
            <p class="text-subhead max-w-lg mb-10 animate-fade-in-up delay-2">
              Snap a photo of your receipt. Our AI extracts every item. Assign
              with a tap. Everyone pays their fair share.
            </p>
            <div class="flex flex-wrap gap-4 mb-12 animate-fade-in-up delay-3">
              <button class="btn-editorial" @click="goToStep('upload')">
                <span>Scan Your Receipt</span>
                <IconArrowRight class="w-5 h-5" />
              </button>
            </div>
            <!-- Trust signals -->
            <div
              class="flex flex-wrap items-center gap-6 text-caption animate-fade-in-up delay-4"
            >
              <div class="flex items-center gap-2">
                <IconCheckBadge class="w-4 h-4 text-[var(--color-accent)]" />
                <span>No signup required</span>
              </div>
              <div class="flex items-center gap-2">
                <IconLock class="w-4 h-4 text-[var(--color-accent)]" />
                <span>Privacy-first</span>
              </div>
              <div class="flex items-center gap-2">
                <IconBolt class="w-4 h-4 text-[var(--color-accent)]" />
                <span>Instant results</span>
              </div>
            </div>
          </div>

          <!-- Right: Animated Receipt Demo -->
          <div
            class="order-1 lg:order-2 flex justify-center lg:justify-end animate-slide-right delay-2"
          >
            <div class="relative">
              <!-- Decorative elements -->
              <div
                class="absolute -top-4 -left-4 w-24 h-24 border border-[var(--color-border)] opacity-50"
              />
              <div
                class="absolute -bottom-4 -right-4 w-24 h-24 bg-[var(--color-accent)] opacity-10"
              />

              <!-- Receipt mockup -->
              <div class="receipt-mockup animate-float relative z-10">
                <div
                  class="text-center mb-4 pb-3 border-b border-dashed border-gray-300"
                >
                  <p class="font-bold text-sm">THE HUNGRY FORK</p>
                  <p class="text-xs text-gray-500">123 Main Street</p>
                </div>
                <div class="space-y-2 mb-4 text-xs">
                  <div class="flex justify-between">
                    <span>Margherita Pizza</span>
                    <span class="font-mono">$18.00</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Caesar Salad</span>
                    <span class="font-mono">$12.00</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Pasta Carbonara</span>
                    <span class="font-mono">$16.00</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Tiramisu x2</span>
                    <span class="font-mono">$14.00</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Drinks</span>
                    <span class="font-mono">$24.00</span>
                  </div>
                </div>
                <div
                  class="border-t border-dashed border-gray-300 pt-3 space-y-1 text-xs"
                >
                  <div class="flex justify-between">
                    <span>Subtotal</span>
                    <span class="font-mono">$84.00</span>
                  </div>
                  <div class="flex justify-between text-gray-500">
                    <span>Tax (8%)</span>
                    <span class="font-mono">$6.72</span>
                  </div>
                  <div
                    class="flex justify-between font-bold text-sm pt-2 border-t border-gray-200"
                  >
                    <span>TOTAL</span>
                    <span class="font-mono">$90.72</span>
                  </div>
                </div>
                <div
                  class="mt-4 pt-3 border-t border-dashed border-gray-300 text-center"
                >
                  <p class="text-xs text-gray-400">Thank you!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Narrative Section -->
    <section
      class="py-24 md:py-32 bg-[var(--color-bg-card)] border-y border-[var(--color-border)]"
    >
      <div class="container-editorial">
        <div class="max-w-3xl mx-auto">
          <p class="text-overline mb-8 reveal">The Problem</p>
          <p class="pull-quote mb-12 reveal" style="transition-delay: 100ms">
            "Who had the extra appetizer? Did you split the wine? I only had
            water..."
          </p>
          <p
            class="text-body text-[var(--color-text-secondary)] mb-8 reveal"
            style="transition-delay: 200ms"
          >
            We've all been there. The check arrives, and suddenly everyone's
            doing mental gymnastics trying to figure out who owes what.
            Calculator apps get passed around. Someone inevitably pays too much.
            Someone else pays too little.
          </p>
          <div
            class="divider-editorial mb-8 reveal"
            style="transition-delay: 300ms"
          />
          <p class="text-body reveal" style="transition-delay: 400ms">
            <strong>SplitBill changes everything.</strong> Just photograph your
            receipt. Our AI reads every line item instantly. Tap to assign.
            Done. Fair splits in seconds, not arguments.
          </p>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="section-padding">
      <div class="container-editorial">
        <div class="text-center mb-16 md:mb-24">
          <p class="text-overline mb-4 reveal">The Process</p>
          <h2 class="text-headline reveal" style="transition-delay: 100ms">
            Three steps to fair splits
          </h2>
        </div>

        <div class="grid md:grid-cols-3 gap-8 md:gap-12">
          <!-- Step 1 -->
          <div class="reveal" style="transition-delay: 200ms">
            <span class="editorial-number">01</span>
            <h3 class="font-serif text-2xl mb-4 mt-2">Capture</h3>
            <p class="text-body text-[var(--color-text-secondary)]">
              Snap a photo of your receipt or upload an existing image. Our AI
              processes it instantly, extracting every item, price, and tax.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="reveal" style="transition-delay: 300ms">
            <span class="editorial-number">02</span>
            <h3 class="font-serif text-2xl mb-4 mt-2">Assign</h3>
            <p class="text-body text-[var(--color-text-secondary)]">
              Add your group members. Tap items to assign them. Split shared
              dishes between multiple people with a single gesture.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="reveal" style="transition-delay: 400ms">
            <span class="editorial-number">03</span>
            <h3 class="font-serif text-2xl mb-4 mt-2">Settle</h3>
            <p class="text-body text-[var(--color-text-secondary)]">
              See exactly what everyone owes, tax included. No more guesswork.
              No more "I'll Venmo you later" that never happens.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="py-24 md:py-32 bg-[var(--color-text-primary)]">
      <div class="container-editorial">
        <div class="text-center mb-16">
          <p class="text-overline text-[var(--color-accent)] mb-4 reveal">
            Features
          </p>
          <h2
            class="text-headline text-white reveal"
            style="transition-delay: 100ms"
          >
            Built for real-world dining
          </h2>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 200ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <IconLightBulb class="w-5 h-5" />
            </div>
            <h3 class="font-serif text-xl text-white mb-3">AI-Powered OCR</h3>
            <p class="text-gray-400 text-sm">
              Advanced vision models read receipts with near-perfect accuracy.
              Handles messy handwriting, faded prints, and complex layouts.
            </p>
          </div>

          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 250ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <IconUsers class="w-5 h-5" />
            </div>
            <h3 class="font-serif text-xl text-white mb-3">
              Flexible Splitting
            </h3>
            <p class="text-gray-400 text-sm">
              Share appetizers between three people. Split wine by the glass.
              Handle any combination of individual and shared items.
            </p>
          </div>

          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 300ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <IconCurrencyDollar class="w-5 h-5" />
            </div>
            <h3 class="font-serif text-xl text-white mb-3">30+ Currencies</h3>
            <p class="text-gray-400 text-sm">
              Traveling abroad? We auto-detect your location and support
              currencies from USD to VND and everything in between.
            </p>
          </div>

          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 350ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <IconCalculator class="w-5 h-5" />
            </div>
            <h3 class="font-serif text-xl text-white mb-3">Proportional Tax</h3>
            <p class="text-gray-400 text-sm">
              Tax is automatically split proportionally based on what each
              person ordered. Penny-perfect calculations every time.
            </p>
          </div>

          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 400ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <IconDeviceMobile class="w-5 h-5" />
            </div>
            <h3 class="font-serif text-xl text-white mb-3">Mobile Optimized</h3>
            <p class="text-gray-400 text-sm">
              Designed for phones first. Snap a photo right at the table, split,
              and settle before dessert arrives.
            </p>
          </div>

          <div
            class="card-editorial bg-white/5 border-white/10 hover:border-white/20 reveal"
            style="transition-delay: 450ms"
          >
            <div
              class="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white mb-6"
            >
              <IconShieldCheck class="w-5 h-5" />
            </div>
            <h3 class="font-serif text-xl text-white mb-3">Privacy First</h3>
            <p class="text-gray-400 text-sm">
              No accounts. No data stored. Cookie-free analytics. Your receipt
              is processed and forgotten instantly.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Social Proof / Stats -->
    <section class="py-24 md:py-32 border-b border-[var(--color-border)]">
      <div class="container-editorial">
        <div class="text-center max-w-2xl mx-auto">
          <p class="text-display mb-8 reveal">
            <span class="text-[var(--color-accent)]">Fair splits</span> for
            every table.
          </p>
          <p class="text-subhead reveal" style="transition-delay: 100ms">
            Whether it's a coffee date or a 20-person celebration, SplitBill
            handles it all with precision and ease.
          </p>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="py-24 md:py-32">
      <div class="container-editorial">
        <div class="max-w-2xl mx-auto text-center">
          <p class="text-overline mb-6 reveal">Get Started</p>
          <h2 class="text-headline mb-8 reveal" style="transition-delay: 100ms">
            Ready to split smarter?
          </h2>
          <p class="text-subhead mb-12 reveal" style="transition-delay: 200ms">
            No signup. No fees. Just fair splits in seconds.
          </p>
          <div class="reveal" style="transition-delay: 300ms">
            <button class="btn-editorial" @click="goToStep('upload')">
              <span>Scan Your Receipt</span>
              <IconArrowRight class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 border-t border-[var(--color-border)]">
      <div class="container-editorial">
        <div
          class="flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p class="font-serif text-lg">SplitBill</p>
          <div
            class="flex flex-wrap items-center justify-center gap-4 text-caption"
          >
            <span class="text-[var(--color-border)]">|</span>
            <span>
              AI by
              <a
                href="https://openrouter.ai"
                target="_blank"
                class="link-underline"
                >OpenRouter</a
              >
            </span>
            <span class="text-[var(--color-border)]">|</span>
            <span>
              Analytics by
              <a href="https://umami.is" target="_blank" class="link-underline"
                >Umami</a
              >
            </span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
