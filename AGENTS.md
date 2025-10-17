# Repository Guidelines

## Project Structure & Module Organization
- `src/` app code: `App.jsx`, `main.jsx`, `App.css`.
- Key folders: `components/` (UI, forms), `pages/` (route views), `api/` (`apiClient`, `api.js`, `index.js` real-only), `utils/`, `constants/`, `data/` (seed.json, geofences, company), `assets/` (SVGs).
- Routing uses `HashRouter` for static hosting. Kakao Maps SDK is loaded dynamically in components (not via CDN tags in `index.html`). For API details, refer to `src/api/apiTypes.js` and `src/api/apiClient.js`.

## Build, Test, and Development Commands
- `npm run dev` / `npm start`: Start Vite dev server on `5173`.
- `npm run build`: Production build to `dist/`.
- `npm run preview`: Serve the built app locally.

## Coding Style & Naming Conventions
- Language: JS/JSX (ES modules). Indentation 2 spaces; use semicolons and double quotes to match existing files.
- Components: `PascalCase` filenames with default exports (e.g., `NavigationBar.jsx`).
- Hooks: prefix with `use` (e.g., `useFormState.js`).
- Non-component modules: lowerCamelCase filenames (e.g., `apiClient.js`, `storage.js`). Assets: kebab-case (e.g., `default-logo.svg`).
- Keep logic in `pages/` minimal; prefer reusable UI/state in `components/` and `hooks/`.

## Testing Guidelines
- Current: `npm test` is a placeholder. When adding tests, prefer Vitest + React Testing Library.
- Naming: `*.test.jsx`; colocate near modules or under `src/__tests__/`.
- Scope: cover utilities (`utils/`), API client behavior (`api/apiClient.js`), and component behavior with accessible queries. Add minimal tests for new features.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`; optional scopes (e.g., `feat(settings): ...`).
- PRs must include: clear description, linked issues, screenshots/GIFs for UI changes, testing notes (commands, steps), and any doc updates (README, API spec).
- Keep PRs focused and small; avoid unrelated refactors.

## Security & Configuration Tips
- Environment: use `VITE_`-prefixed vars. Do not commit secrets; prefer `.env.local` for local keys.
- Real API base configured via `VITE_API_BASE_URL` (see `src/api/index.js`).
- If adjusting `index.html`, keep the app root and module script. Map SDKs are loaded dynamically. Hash-based routing eases static hosting.

## Agent-Specific Instructions
- Follow these conventions for any edits. Touch only relevant files. When altering API or routes, update README and ensure `src/api/apiTypes.js` reflects the latest endpoints.
- Verify locally with `npm run dev` when changes affect data flows or maps.
