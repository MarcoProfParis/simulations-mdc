# Copilot Instructions

## Project Overview

Interactive scientific simulator platform for BTS "Métiers de la Chimie" students. Provides browser-based simulators across two domains:
- **Colorimetry / Color Spaces** (`src/apps/couleur/`) — CIE xy diagrams, CIELAB explorer
- **Rheology & Wetting** (`src/apps/rheologie/`) — Rheogram models, contact angle, Zisman line analysis

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Production build → dist/
npm run lint      # ESLint (JS + JSX)
npm run preview   # Preview production build locally
npm run deploy    # Build + deploy to GitHub Pages
```

No test suite exists in this project.

## Architecture

- **React 19 + Vite** — no React Router; navigation is pure state
- **Recharts** — all scientific charts/plots
- **KaTeX** — loaded lazily from CDN for math formula rendering
- **Lucide-react** — icons
- **Deployed to GitHub Pages** at base path `/simulations-mdc/` (set in `vite.config.js`)

### Navigation Model

`App.jsx` implements a 3-level state machine (no URL routing):
1. Category selection → sets `categoryId`
2. App selection within category → sets `appId`
3. Individual app renders

All app registrations live in `src/config.js` (`CATEGORIES` array), which references component imports directly.

### Directory Layout

```
src/
├── apps/
│   ├── couleur/       # Color science simulators
│   └── rheologie/     # Rheology & wetting simulators
├── components/ui/     # Reusable UI primitives (Tabs, Select)
├── App.jsx            # Top-level navigation state machine
├── ThemeContext.jsx    # Light/dark theme provider
├── config.js          # App/category registry (CATEGORIES)
├── index.css          # CSS variables & global theming
└── main.jsx           # React entry point
```

## Key Conventions

### Component Structure

App components are **monolithic** (often 1000–2000 lines). Domain constants, helper functions, and sub-components are defined within the same file. Do not split them out unless requested.

### Styling

Styling uses **CSS variables + inline style objects** — no CSS-in-JS libraries, no Tailwind, no CSS Modules.

- Global CSS tokens (`--text`, `--bg`, `--border`, `--accent`, etc.) are defined in `index.css` and switched via `data-theme` on `<html>`.
- Many components define a local color token object (conventionally named `T`) for internal use:

```jsx
const T = {
  bg: "#f8fafc",
  blue600: "#2563eb",
  fontMono: "'JetBrains Mono','Fira Code',monospace",
};
```

- Inline styles frequently reference both CSS variables and `T`:

```jsx
style={{
  border: `2px solid ${hovered ? T.blue600 : "var(--border)"}`,
  background: "var(--bg-card)",
}}
```

### Theme

Use `useTheme()` from `ThemeContext.jsx` to read `{ dark }`. Theme is persisted to `localStorage` and toggled by setting `data-theme` on `document.documentElement`.

### UI Primitives

`src/components/ui/tabs.jsx` and `select.jsx` follow shadcn-style composition using React Context internally:

```jsx
<Tabs value={tab} onValueChange={setTab}>
  <TabsList>
    <TabsTrigger value="a">A</TabsTrigger>
  </TabsList>
  <TabsContent value="a">...</TabsContent>
</Tabs>
```

### KaTeX

Apps that render math use a local `useKatex()` hook that lazy-loads KaTeX from CDN and caches it on `window.katex`. Check for the ready state before rendering.

### Constants Naming

- Domain data constants: `UPPER_SNAKE_CASE` (e.g., `MODELS`, `ILLUMINANTS`, `SURFACES`, `SOLVANTS`)
- ESLint is configured to allow unused variables matching `/^[A-Z_]/` — safe to define module-level constants without triggering lint errors

### Webhook Integration

Some apps (e.g., `ZismanApp.jsx`) send results to an external n8n endpoint. Keep webhook URLs as module-level constants named `WEBHOOK_URL`.

### Language

Domain labels and UI strings are in **French** (this is a French-language educational tool). Keep new UI text in French.
