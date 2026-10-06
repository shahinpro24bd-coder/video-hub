import { createFileRoute } from "@tanstack/react-router";

// Redirect top-level static page URLs (e.g. /video2.html) to /site/*
export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const name = url.pathname.replace(/^\/+/, "");
        if (/^[\w-]+\.html$/.test(name)) {
          return Response.redirect(`${url.origin}/site/${name}${url.search}`, 302);
        }
        return Response.redirect(`${url.origin}/site/404.html`, 302);
      },
    },
  },
});
