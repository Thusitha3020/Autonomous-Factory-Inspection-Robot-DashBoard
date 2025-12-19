SvelteKit scaffold — AFIR Dashboard

How to run locally:

1. Install dependencies

```bash
npm install
```

2. Run dev server

```bash
npm run dev
```

3. Open http://localhost:5173 — the SvelteKit page embeds the static prototype (`/index-static.html`) so you can continue developing and migrate components incrementally.

Notes:
- Prototype static assets are in `static/` (styles and app JS). For a full migration, I can convert the static markup into Svelte components inside `src/lib` and wire Chart.js and stores.
- Next steps I suggest: move interactive logic into Svelte stores, create components for `Sidebar`, `Header`, `SensorCard`, `LiveChart`, `CameraPanel`, and `ControlPanel`, and add Tailwind (optional) for faster styling.
