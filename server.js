import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

/**
 * Nitro Vite SSR entry. The default TanStack Start server handler streams the
 * React app (src/routes + src/lab). Without this file pointed at
 * environments.ssr, Nitro v3 falls back to treating a root index.html as the
 * renderer template and production would serve that static page instead.
 */
export default createServerEntry({
    fetch(request) {
        return handler.fetch(request);
    },
});
