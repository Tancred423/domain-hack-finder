<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

type DomainHack = {
  domain: string;
  host: string;
  left: string;
  tld: string;
};

type ThemeOption = 'auto' | 'light' | 'dark';

const query = ref('');
const results = ref<DomainHack[]>([]);
const message = ref<string | null>('Try a word to see domain hacks.');
const isLoading = ref(false);
const hasResults = computed(() => results.value.length > 0);

const themeMode = ref<ThemeOption>('auto');
const themeOptions = ['auto', 'light', 'dark'] as const;
const optionLabels: Record<ThemeOption, string> = {
  auto: 'Auto',
  light: 'Light',
  dark: 'Dark',
};
const THEME_STORAGE_KEY = 'domain-hack-finder:theme';
let mediaQuery: MediaQueryList | null = null;

function applyTheme() {
  const prefersDark = mediaQuery?.matches ?? false;
  const nextTheme = themeMode.value === 'auto' ? (prefersDark ? 'dark' : 'light') : themeMode.value;

  document.documentElement.dataset.theme = nextTheme;
}

function saveThemePreference(option: ThemeOption) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, option);
  } catch {
    // ignore storage errors (e.g., private mode)
  }
}

function loadThemePreference(): ThemeOption | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeOption | null;
    if (stored && themeOptions.includes(stored)) {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', applyTheme);
  const storedTheme = loadThemePreference();
  if (storedTheme) {
    themeMode.value = storedTheme;
  }
  applyTheme();
});

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', applyTheme);
});

watch(themeMode, (value) => {
  saveThemePreference(value);
  applyTheme();
});

function setTheme(option: ThemeOption) {
  themeMode.value = option;
}

async function search() {
  const trimmed = query.value.trim();

  if (!trimmed) {
    results.value = [];
    message.value = 'Enter a word (like "emotes") to generate domain hacks.';
    return;
  }

  isLoading.value = true;
  message.value = null;

  try {
    const response = await fetch(`/api/domain-hacks?query=${encodeURIComponent(trimmed)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch suggestions.');
    }

    const data = await response.json();
    results.value = data.matches ?? [];
    message.value = data.message ?? null;
  } catch (error) {
    console.error(error);
    message.value = 'Something went wrong. Please try again.';
    results.value = [];
  } finally {
    isLoading.value = false;
  }
}

function onSubmit(event: Event) {
  event.preventDefault();
  search();
}
</script>

<template>
  <main class="hero">
    <div class="hero__content">
      <header class="hero__header">
        <div class="hero__header-text">
          <h1>Domain Hack Finder</h1>
          <p>Type a word and we will find domain hacks for it.</p>
        </div>

        <div class="theme-toggle" role="group" aria-label="Theme selection">
          <button
            v-for="option in themeOptions"
            :key="option"
            type="button"
            class="theme-toggle__button"
            :class="{ 'theme-toggle__button--active': themeMode === option }"
            @click="setTheme(option)"
          >
            <span class="theme-toggle__label">
              {{ optionLabels[option] }}
            </span>
          </button>
        </div>
      </header>

      <form class="search" @submit="onSubmit">
        <input
          v-model="query"
          type="text"
          name="query"
          placeholder="Try 'emotes'"
          aria-label="Domain keyword"
          :disabled="isLoading"
        />
        <button type="submit" :disabled="isLoading">
          <span v-if="isLoading">Searching…</span>
          <span v-else>Search</span>
        </button>
      </form>

      <section class="results" :class="{ 'results--active': hasResults || message }" aria-live="polite">
        <ul v-if="hasResults">
          <li v-for="item in results" :key="item.host">
            <span class="domain">
              {{ item.left }}<span class="domain__dot">.</span><span class="domain__tld">{{ item.tld }}</span>
            </span>
          </li>
        </ul>
        <p v-else class="results__message">
          {{ message }}
        </p>
      </section>
    </div>
  </main>
</template>
