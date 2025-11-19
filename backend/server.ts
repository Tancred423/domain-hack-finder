import { serve } from "@std/http/server.ts";
import { serveFile } from "@std/http/file_server.ts";
import { join } from "@std/path/mod.ts";
import { fromFileUrl } from "@std/path/from_file_url.ts";
import { findDomainHacks } from "./domainHack.ts";

const PORT = Number(Deno.env.get("PORT") ?? "8080");

const frontendRoot = fromFileUrl(new URL("../frontend/dist", import.meta.url));
const indexHtmlPath = join(frontendRoot, "index.html");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function handleApiRequest(url: URL) {
  const query = url.searchParams.get("query") ?? "";
  const trimmed = query.trim();

  if (!trimmed) {
    return jsonResponse({
      query,
      matches: [],
      hasMatches: false,
      message: "Enter a search term to find domain hacks.",
    });
  }

  const matches = findDomainHacks(trimmed);

  return jsonResponse({
    query,
    matches,
    hasMatches: matches.length > 0,
    message: matches.length > 0 ? undefined : "No domain hacks found for that search.",
  });
}

async function handleStaticRequest(req: Request, url: URL) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalizedPath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  const filePath = join(frontendRoot, normalizedPath);

  try {
    return await serveFile(req, filePath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return await serveFile(req, indexHtmlPath);
    }
    throw error;
  }
}

serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/api/domain-hacks" && req.method === "GET") {
    return handleApiRequest(url);
  }

  try {
    return await handleStaticRequest(req, url);
  } catch (error) {
    console.error("Error serving request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}, { port: PORT });
