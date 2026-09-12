# atcfps — ATC Flight Strip Board

A configurable flight progress strip board for the browser: user-defined
bays, drag-and-drop strips (flight / info / vehicle), multiple boards, and a
keep-screen-on toggle for iPad use.

**Local-only.** Everything lives in your browser's `localStorage`. The app
makes no network requests after loading — no analytics, no sync, no backend.

See `project.md` for the spec and `PLAN.md` for the build plan.

## Development

```
npm install
npm run dev      # local dev server
npm test         # reducer tests (vitest)
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

Hosted on GitHub Pages at https://risingbridge.github.io/atcfps/
