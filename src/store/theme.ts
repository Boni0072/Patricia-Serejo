import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

const STORAGE_KEY = 'ctrl-theme';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
}

function initialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return saved === 'light' ? 'light' : 'dark';
}

applyTheme(initialTheme());

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme(),
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    set({ theme: next });
  },
  set: (t) => {
    applyTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    set({ theme: t });
  },
}));
