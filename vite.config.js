// Vite standalone config (v8+ ignores astro's server.allowedHosts in some paths).
// Allow all hosts in dev — CSRF + auth are still enforced by middleware.ts.
export default {
  server: {
    allowedHosts: true,
  },
};
