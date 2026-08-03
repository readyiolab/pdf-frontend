import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { resolveSeo, SITE_NAME, SITE_URL, type SeoConfig } from "@/lib/seo";

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string
) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function applySeo(seo: SeoConfig) {
  const url = `${SITE_URL}${seo.path === "/" ? "/" : seo.path}`;
  document.title = seo.title;

  upsertMeta("name", "description", seo.description);
  upsertMeta("name", "robots", seo.robots ?? "index, follow");
  if (seo.keywords) {
    upsertMeta("name", "keywords", seo.keywords);
  }

  upsertMeta("property", "og:title", seo.title);
  upsertMeta("property", "og:description", seo.description);
  upsertMeta("property", "og:type", seo.ogType ?? "website");
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:site_name", SITE_NAME);

  upsertMeta("property", "twitter:card", "summary_large_image");
  upsertMeta("property", "twitter:title", seo.title);
  upsertMeta("property", "twitter:description", seo.description);

  upsertLink("canonical", url);
}

/**
 * Keeps document title + meta tags in sync with the active route.
 * Mount once near the router (covers all pages including /s/:token).
 */
export function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    applySeo(resolveSeo(pathname));
  }, [pathname]);

  return null;
}
