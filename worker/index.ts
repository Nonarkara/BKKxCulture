/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { pageviewStats, recordPageview } from "./pageviews";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/pageview" && request.method === "POST") {
      const body = await request.json().catch(() => ({})) as {
        path?: unknown;
        referrer?: unknown;
      };
      const cloudflareRequest = request as Request & { cf?: { country?: string } };

      await recordPageview(env.DB, {
        path: typeof body.path === "string" ? body.path : "/",
        referrer: typeof body.referrer === "string" ? body.referrer : null,
        country: cloudflareRequest.cf?.country ?? null,
        language: request.headers.get("accept-language"),
        userAgent: request.headers.get("user-agent"),
      });
      return Response.json({ ok: true }, { status: 201 });
    }

    if (url.pathname === "/api/stats" && request.method === "GET") {
      return Response.json(await pageviewStats(env.DB), {
        headers: { "cache-control": "public, max-age=60" },
      });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
