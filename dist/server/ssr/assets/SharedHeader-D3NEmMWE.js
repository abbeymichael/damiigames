import { _ as AppElementsWire, a as navigateClientSide, b as stripBasePath, c as useRouter, f as resolveRelativeHref, g as isDangerousScheme, h as withBasePath$1, i as getPrefetchedUrls, l as createRscRequestHeaders, m as toSameOriginAppPath, o as prefetchRscResponse, p as toBrowserNavigationHref, r as getMountedSlotsHeader, s as usePathname, t as getCurrentInterceptionContext, u as createRscRequestUrl, v as VINEXT_MOUNTED_SLOTS_HEADER, y as hasBasePath } from "../index.js";
import React, { createContext, createElement, forwardRef, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
//#region node_modules/vinext/dist/routing/utils.js
var PATH_DELIMITER_REGEX = /([/#?\\]|%(2f|23|3f|5c))/gi;
function encodePathDelimiters(segment) {
	return segment.replace(PATH_DELIMITER_REGEX, (char) => encodeURIComponent(char));
}
/**
* Decode a filesystem or URL path segment while preserving encoded path delimiters.
* Mirrors Next.js segment-wise decoding so "%5F" becomes "_" but "%2F" stays "%2F".
*/
function decodeRouteSegment(segment) {
	try {
		return encodePathDelimiters(decodeURIComponent(segment));
	} catch {
		return segment;
	}
}
/**
* Normalize a pathname for route matching by decoding each segment independently.
* This prevents encoded slashes from turning into real path separators.
*/
function normalizePathnameForRouteMatch(pathname) {
	return pathname.split("/").map((segment) => decodeRouteSegment(segment)).join("/");
}
function decodeMatchedParam(value) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
/**
* Decode captured route params with `decodeURIComponent`, mirroring Next.js
* route-matcher.ts:25-27. Mutates the params object in place. Catch-all
* arrays are decoded element-wise. Malformed escapes are preserved (the
* strict normalization layer rejects them at the request boundary).
*/
function decodeMatchedParams(params) {
	for (const key of Object.keys(params)) {
		const value = params[key];
		if (Array.isArray(value)) params[key] = value.map(decodeMatchedParam);
		else params[key] = decodeMatchedParam(value);
	}
}
//#endregion
//#region node_modules/vinext/dist/routing/route-trie.js
function createNode() {
	return {
		staticChildren: /* @__PURE__ */ new Map(),
		dynamicChild: null,
		catchAllChild: null,
		optionalCatchAllChild: null,
		route: null
	};
}
/**
* Build a trie from pre-sorted routes.
*
* Routes must have a `patternParts` property (string[] of URL segments).
* Pattern segment conventions:
*   - `:name`  — dynamic segment
*   - `:name+` — catch-all (1+ segments)
*   - `:name*` — optional catch-all (0+ segments)
*   - anything else — static segment
*
* First route to claim a terminal position wins (routes are pre-sorted
* by precedence, so insertion order preserves correct priority).
*/
function buildRouteTrie(routes) {
	const root = createNode();
	for (const route of routes) {
		const parts = route.patternParts;
		if (parts.length === 0) {
			if (root.route === null) root.route = route;
			continue;
		}
		let node = root;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.endsWith("+") && part.startsWith(":")) {
				if (i !== parts.length - 1) break;
				const paramName = part.slice(1, -1);
				if (node.catchAllChild === null) node.catchAllChild = {
					paramName,
					route
				};
				break;
			}
			if (part.endsWith("*") && part.startsWith(":")) {
				if (i !== parts.length - 1) break;
				const paramName = part.slice(1, -1);
				if (node.optionalCatchAllChild === null) node.optionalCatchAllChild = {
					paramName,
					route
				};
				break;
			}
			if (part.startsWith(":")) {
				const paramName = part.slice(1);
				if (node.dynamicChild === null) node.dynamicChild = {
					paramName,
					node: createNode()
				};
				node = node.dynamicChild.node;
				if (i === parts.length - 1) {
					if (node.route === null) node.route = route;
				}
				continue;
			}
			let child = node.staticChildren.get(part);
			if (!child) {
				child = createNode();
				node.staticChildren.set(part, child);
			}
			node = child;
			if (i === parts.length - 1) {
				if (node.route === null) node.route = route;
			}
		}
	}
	return root;
}
/**
* Match a URL against the trie.
*
* Returns decoded param values — `decodeURIComponent` is applied to
* individual param entries so that `%2F` → `/`, `%23` → `#`, etc.
* Segment boundaries (the original `/` splits) are preserved by the
* upstream normalization layer; this step only decodes the captured
* param strings the caller sees.
*
* Mirrors Next.js route-matcher.ts:25-27.
*
* @param root - Trie root built by `buildRouteTrie`
* @param urlParts - Pre-split URL segments (no empty strings)
* @returns Match result with route and extracted params, or null
*/
function trieMatch(root, urlParts) {
	const result = match(root, urlParts, 0);
	if (result) decodeMatchedParams(result.params);
	return result;
}
function createParams() {
	return Object.create(null);
}
function match(node, urlParts, index) {
	if (index === urlParts.length) {
		if (node.route !== null) return {
			route: node.route,
			params: createParams()
		};
		if (node.optionalCatchAllChild !== null) return {
			route: node.optionalCatchAllChild.route,
			params: createParams()
		};
		return null;
	}
	const segment = urlParts[index];
	const staticChild = node.staticChildren.get(segment);
	if (staticChild) {
		const result = match(staticChild, urlParts, index + 1);
		if (result !== null) return result;
	}
	if (node.dynamicChild !== null) {
		const result = match(node.dynamicChild.node, urlParts, index + 1);
		if (result !== null) {
			result.params[node.dynamicChild.paramName] = segment;
			return result;
		}
	}
	if (node.catchAllChild !== null) {
		const remaining = urlParts.slice(index);
		const params = createParams();
		params[node.catchAllChild.paramName] = remaining;
		return {
			route: node.catchAllChild.route,
			params
		};
	}
	if (node.optionalCatchAllChild !== null) {
		const remaining = urlParts.slice(index);
		const params = createParams();
		params[node.optionalCatchAllChild.paramName] = remaining;
		return {
			route: node.optionalCatchAllChild.route,
			params
		};
	}
	return null;
}
//#endregion
//#region node_modules/vinext/dist/routing/route-matching.js
/**
* Shared route-match preamble used by both Pages Router and App Router.
*
* Both routers normalize URLs and call `trieMatch` with nearly-identical
* preamble: strip query, trailing-slash normalize, run
* `normalizePathnameForRouteMatch`, split into url parts, then look up via a
* per-routes-array trie cache. This module factors that out so each router
* just calls `matchRouteWithTrie(url, routes)`.
*/
function createRouteTrieCache() {
	return /* @__PURE__ */ new WeakMap();
}
function getOrBuildTrie(cache, routes) {
	let trie = cache.get(routes);
	if (!trie) {
		trie = buildRouteTrie(routes);
		cache.set(routes, trie);
	}
	return trie;
}
/**
* Match a URL path against a list of routes via the shared preamble:
*   1. strip query string
*   2. trailing-slash normalize (preserving root "/")
*   3. run `normalizePathnameForRouteMatch`
*   4. split into url parts and look up via the (cached) trie
*
* Generic over the route shape; both Pages `Route` and App `AppRoute`
* satisfy `{ patternParts: string[] }`.
*/
function matchRouteWithTrie(url, routes, cache) {
	const pathname = url.split("?")[0];
	let normalizedUrl = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
	normalizedUrl = normalizePathnameForRouteMatch(normalizedUrl);
	const urlParts = normalizedUrl.split("/").filter(Boolean);
	return trieMatch(getOrBuildTrie(cache, routes), urlParts);
}
//#endregion
//#region node_modules/vinext/dist/utils/domain-locale.js
function normalizeDomainHostname(hostname) {
	if (!hostname) return void 0;
	return hostname.split(",", 1)[0]?.trim().split(":", 1)[0]?.toLowerCase() || void 0;
}
/**
* Match a configured domain either by hostname or locale.
* When both are provided, the checks intentionally use OR semantics so the
* same helper can cover Next.js's hostname lookup and preferred-locale lookup.
* If both are passed, the first domain matching either input wins, so callers
* should pass hostname or detectedLocale, not both.
*/
function detectDomainLocale(domainItems, hostname, detectedLocale) {
	if (!domainItems?.length) return void 0;
	const normalizedHostname = normalizeDomainHostname(hostname);
	const normalizedLocale = detectedLocale?.toLowerCase();
	for (const item of domainItems) if (normalizedHostname === normalizeDomainHostname(item.domain) || normalizedLocale === item.defaultLocale.toLowerCase() || item.locales?.some((locale) => locale.toLowerCase() === normalizedLocale)) return item;
}
function addLocalePrefix(path, locale, localeDefault) {
	const normalizedLocale = locale.toLowerCase();
	if (normalizedLocale === localeDefault.toLowerCase()) return path;
	const pathWithLeadingSlash = path.startsWith("/") ? path : `/${path}`;
	const normalizedPathname = (pathWithLeadingSlash.split(/[?#]/, 1)[0] ?? pathWithLeadingSlash).toLowerCase();
	const localePrefix = `/${normalizedLocale}`;
	if (normalizedPathname === localePrefix || normalizedPathname.startsWith(`${localePrefix}/`)) return path.startsWith("/") ? path : pathWithLeadingSlash;
	return `/${locale}${pathWithLeadingSlash}`;
}
function withBasePath(path, basePath = "") {
	if (!basePath) return path;
	return basePath + path;
}
function getDomainLocaleUrl(url, locale, { basePath, currentHostname, domainItems }) {
	if (!domainItems?.length) return void 0;
	const targetDomain = detectDomainLocale(domainItems, void 0, locale);
	if (!targetDomain) return void 0;
	const currentDomain = detectDomainLocale(domainItems, currentHostname ?? void 0);
	const localizedPath = addLocalePrefix(url, locale, targetDomain.defaultLocale);
	if (currentDomain && normalizeDomainHostname(currentDomain.domain) === normalizeDomainHostname(targetDomain.domain)) return;
	return `${`http${targetDomain.http ? "" : "s"}://`}${targetDomain.domain}${withBasePath(localizedPath, basePath)}`;
}
//#endregion
//#region node_modules/vinext/dist/utils/query.js
function setOwnQueryValue(obj, key, value) {
	Object.defineProperty(obj, key, {
		value,
		enumerable: true,
		writable: true,
		configurable: true
	});
}
function addQueryParam(obj, key, value) {
	if (Object.hasOwn(obj, key)) {
		const current = obj[key];
		setOwnQueryValue(obj, key, Array.isArray(current) ? current.concat(value) : [current, value]);
	} else setOwnQueryValue(obj, key, value);
}
/**
* Convert a Next.js-style query object into URLSearchParams while preserving
* repeated keys for array values.
*
* Ported from Next.js `urlQueryToSearchParams()`:
* https://github.com/vercel/next.js/blob/canary/packages/next/src/shared/lib/router/utils/querystring.ts
*/
function stringifyUrlQueryParam(param) {
	if (typeof param === "string") return param;
	if (typeof param === "number" && !isNaN(param) || typeof param === "boolean") return String(param);
	return "";
}
function urlQueryToSearchParams(query) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (Array.isArray(value)) {
			for (const item of value) params.append(key, stringifyUrlQueryParam(item));
			continue;
		}
		params.set(key, stringifyUrlQueryParam(value));
	}
	return params;
}
/**
* Append query parameters to a URL while preserving any existing query string
* and fragment identifier.
*/
function appendSearchParamsToUrl(url, params) {
	const hashIndex = url.indexOf("#");
	const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
	const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
	const queryIndex = beforeHash.indexOf("?");
	const base = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
	const existingQuery = queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1);
	const merged = new URLSearchParams(existingQuery);
	for (const [key, value] of params) merged.append(key, value);
	const search = merged.toString();
	return `${base}${search ? `?${search}` : ""}${hash}`;
}
//#endregion
//#region node_modules/vinext/dist/shims/i18n-context.js
var _getI18nContext = () => {
	if (globalThis.__VINEXT_DEFAULT_LOCALE__ == null && globalThis.__VINEXT_LOCALE__ == null) return null;
	return {
		locale: globalThis.__VINEXT_LOCALE__,
		locales: globalThis.__VINEXT_LOCALES__,
		defaultLocale: globalThis.__VINEXT_DEFAULT_LOCALE__,
		domainLocales: globalThis.__VINEXT_DOMAIN_LOCALES__,
		hostname: globalThis.__VINEXT_HOSTNAME__
	};
};
function getI18nContext() {
	return _getI18nContext();
}
//#endregion
//#region node_modules/vinext/dist/shims/link-prefetch.js
function canLinkPrefetch(input) {
	return input.nodeEnv === "production" && input.prefetch !== false && !input.isDangerous;
}
/**
* Normalize absolute and protocol-relative Link hrefs to app-relative paths
* that are eligible for prefetching. Non-absolute relative hrefs are returned
* unchanged; callers must resolve them against the current browser URL before
* constructing a concrete fetch target.
*/
function getLinkPrefetchHref(input) {
	const { href, basePath, currentOrigin } = input;
	if (!isAbsoluteOrProtocolRelative(href)) return href;
	if (currentOrigin === void 0) return null;
	try {
		const current = new URL(currentOrigin);
		const parsed = href.startsWith("//") ? new URL(href, current.origin) : new URL(href);
		if (parsed.origin !== current.origin) return null;
		if (!basePath) return parsed.pathname + parsed.search + parsed.hash;
		if (!hasBasePath(parsed.pathname, basePath)) return null;
		return stripBasePath(parsed.pathname, basePath) + parsed.search + parsed.hash;
	} catch {
		return null;
	}
}
function isAbsoluteOrProtocolRelative(href) {
	return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//");
}
//#endregion
//#region node_modules/vinext/dist/shims/link.js
/**
* next/link shim
*
* Renders an <a> tag with client-side navigation support.
* On click, prevents full page reload and triggers client-side
* page swap via the router's navigation system.
*/
var LinkStatusContext = createContext({ pending: false });
/** basePath from next.config.js, injected by the plugin at build time */
var __basePath = "";
var linkPrefetchRouteTrieCache = createRouteTrieCache();
function resolveHref(href) {
	if (typeof href === "string") return href;
	let url = href.pathname ?? "/";
	if (href.query) {
		const params = urlQueryToSearchParams(href.query);
		url = appendSearchParamsToUrl(url, params);
	}
	return url;
}
function resolveLinkPrefetchMode(prefetchProp, isDangerous) {
	if (isDangerous || prefetchProp === false) return "disabled";
	if (prefetchProp === true) return "full";
	return "auto";
}
function toSameOriginRouteHref(href) {
	if (typeof window === "undefined") return null;
	let url;
	try {
		url = new URL(href, window.location.href);
	} catch {
		return null;
	}
	if (url.origin !== window.location.origin) return null;
	return `${stripBasePath(url.pathname, __basePath)}${url.search}`;
}
function canAutoPrefetchFullAppRoute(href) {
	if (typeof window === "undefined") return false;
	const routes = window.__VINEXT_LINK_PREFETCH_ROUTES__;
	if (!routes) return false;
	const routeHref = toSameOriginRouteHref(href);
	if (routeHref === null) return false;
	const match = matchRouteWithTrie(routeHref, routes, linkPrefetchRouteTrieCache);
	if (!match) return false;
	return !match.route.isDynamic;
}
/**
* Prefetch a URL for faster navigation.
*
* For App Router (RSC): fetches the .rsc payload in the background and
* stores it in an in-memory cache for instant use during navigation.
* For Pages Router: injects a <link rel="prefetch"> for the page module.
*
* Uses `requestIdleCallback` (or `setTimeout` fallback) to avoid blocking
* the main thread during initial page load.
*/
function prefetchUrl(href, mode, priority = "low") {
	if (typeof window === "undefined") return;
	const prefetchHref = getLinkPrefetchHref({
		href,
		basePath: __basePath,
		currentOrigin: window.location.origin
	});
	if (prefetchHref == null) return;
	const fullHref = toBrowserNavigationHref(prefetchHref, window.location.href, __basePath);
	(window.requestIdleCallback ?? ((fn) => setTimeout(fn, 100)))(() => {
		(async () => {
			if (typeof window.__VINEXT_RSC_NAVIGATE__ === "function") {
				if (mode === "auto" && !canAutoPrefetchFullAppRoute(prefetchHref)) return;
				const interceptionContext = getCurrentInterceptionContext();
				const mountedSlotsHeader = getMountedSlotsHeader();
				const headers = createRscRequestHeaders({ interceptionContext });
				if (mountedSlotsHeader) headers.set(VINEXT_MOUNTED_SLOTS_HEADER, mountedSlotsHeader);
				const rscUrl = await createRscRequestUrl(fullHref, headers);
				const cacheKey = AppElementsWire.encodeCacheKey(rscUrl, interceptionContext);
				const prefetched = getPrefetchedUrls();
				if (prefetched.has(cacheKey)) return;
				prefetched.add(cacheKey);
				prefetchRscResponse(rscUrl, fetch(rscUrl, {
					headers,
					credentials: "include",
					priority,
					purpose: "prefetch"
				}), interceptionContext, mountedSlotsHeader);
			} else if (window.__NEXT_DATA__?.__vinext?.pageModuleUrl) {
				const link = document.createElement("link");
				link.rel = "prefetch";
				link.href = fullHref;
				link.as = "document";
				document.head.appendChild(link);
			}
		})().catch((error) => {
			console.error("[vinext] RSC prefetch setup error:", error);
		});
	});
}
/**
* Shared IntersectionObserver for viewport-based prefetching.
* All Link elements use the same observer to minimize resource usage.
*/
var sharedObserver = null;
var observerCallbacks = /* @__PURE__ */ new WeakMap();
function getSharedObserver() {
	if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return null;
	if (sharedObserver) return sharedObserver;
	sharedObserver = new IntersectionObserver((entries) => {
		for (const entry of entries) if (entry.isIntersecting) {
			const callback = observerCallbacks.get(entry.target);
			if (callback) {
				callback();
				sharedObserver?.unobserve(entry.target);
				observerCallbacks.delete(entry.target);
			}
		}
	}, { rootMargin: "250px" });
	return sharedObserver;
}
function getDefaultLocale() {
	if (typeof window !== "undefined") return window.__VINEXT_DEFAULT_LOCALE__;
	return getI18nContext()?.defaultLocale;
}
function getDomainLocales() {
	if (typeof window !== "undefined") return window.__NEXT_DATA__?.domainLocales;
	return getI18nContext()?.domainLocales;
}
function getCurrentHostname() {
	if (typeof window !== "undefined") return window.location.hostname;
	return getI18nContext()?.hostname;
}
function getDomainLocaleHref(href, locale) {
	return getDomainLocaleUrl(href, locale, {
		basePath: __basePath,
		currentHostname: getCurrentHostname(),
		domainItems: getDomainLocales()
	});
}
/**
* Apply locale prefix to a URL path based on the locale prop.
* - locale="fr" → prepend /fr (unless it already has a locale prefix)
* - locale={false} → use the href as-is (no locale prefix, link to default)
* - locale=undefined → use current locale (href as-is in most cases)
*/
function applyLocaleToHref(href, locale) {
	if (locale === false) return href;
	if (locale === void 0) return href;
	if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) return href;
	const domainLocaleHref = getDomainLocaleHref(href, locale);
	if (domainLocaleHref) return domainLocaleHref;
	return addLocalePrefix(href, locale, getDefaultLocale() ?? "");
}
var Link = forwardRef(function Link({ href, as, replace = false, prefetch: prefetchProp, scroll = true, children, onClick, onMouseEnter, onTouchStart, onNavigate, ...rest }, forwardedRef) {
	const { locale, ...restWithoutLocale } = rest;
	const resolvedHref = as ?? resolveHref(href);
	const isDangerous = typeof resolvedHref === "string" && isDangerousScheme(resolvedHref);
	const localizedHref = applyLocaleToHref(isDangerous ? "/" : resolvedHref, locale);
	const fullHref = withBasePath$1(localizedHref, __basePath);
	const [pending, setPending] = useState(false);
	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);
	const internalRef = useRef(null);
	const prefetchMode = resolveLinkPrefetchMode(prefetchProp, isDangerous);
	const shouldPrefetch = canLinkPrefetch({
		nodeEnv: "production",
		prefetch: prefetchProp,
		isDangerous
	});
	const setRefs = useCallback((node) => {
		internalRef.current = node;
		if (typeof forwardedRef === "function") forwardedRef(node);
		else if (forwardedRef) forwardedRef.current = node;
	}, [forwardedRef]);
	useEffect(() => {
		if (!shouldPrefetch || typeof window === "undefined") return;
		const node = internalRef.current;
		if (!node) return;
		const hrefToPrefetch = getLinkPrefetchHref({
			href: localizedHref,
			basePath: __basePath,
			currentOrigin: window.location.origin
		});
		if (hrefToPrefetch == null) return;
		const observer = getSharedObserver();
		if (!observer) return;
		observerCallbacks.set(node, () => prefetchUrl(hrefToPrefetch, prefetchMode, "low"));
		observer.observe(node);
		return () => {
			observer.unobserve(node);
			observerCallbacks.delete(node);
		};
	}, [
		shouldPrefetch,
		prefetchMode,
		localizedHref
	]);
	const prefetchOnIntent = useCallback(() => {
		if (!shouldPrefetch) return;
		prefetchUrl(localizedHref, prefetchMode, "high");
	}, [
		shouldPrefetch,
		prefetchMode,
		localizedHref
	]);
	const handleMouseEnter = useCallback((e) => {
		onMouseEnter?.(e);
		prefetchOnIntent();
	}, [onMouseEnter, prefetchOnIntent]);
	const handleTouchStart = useCallback((e) => {
		onTouchStart?.(e);
		prefetchOnIntent();
	}, [onTouchStart, prefetchOnIntent]);
	const handleClick = async (e) => {
		if (onClick) onClick(e);
		if (e.defaultPrevented) return;
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		if (e.currentTarget.target && e.currentTarget.target !== "_self") return;
		let navigateHref = localizedHref;
		if (resolvedHref.startsWith("http://") || resolvedHref.startsWith("https://") || resolvedHref.startsWith("//")) {
			const localPath = toSameOriginAppPath(resolvedHref, __basePath);
			if (localPath == null) return;
			navigateHref = localPath;
		}
		e.preventDefault();
		const absoluteHref = resolveRelativeHref(navigateHref, window.location.href, __basePath);
		const absoluteFullHref = toBrowserNavigationHref(navigateHref, window.location.href, __basePath);
		if (onNavigate) try {
			const navUrl = new URL(absoluteFullHref, window.location.origin);
			let prevented = false;
			const navEvent = {
				url: navUrl,
				preventDefault() {
					prevented = true;
				},
				get defaultPrevented() {
					return prevented;
				}
			};
			onNavigate(navEvent);
			if (navEvent.defaultPrevented) return;
		} catch {}
		if (typeof window.__VINEXT_RSC_NAVIGATE__ === "function") {
			setPending(true);
			React.startTransition(() => {
				navigateClientSide(navigateHref, replace ? "replace" : "push", scroll, true).finally(() => {
					if (mountedRef.current) setPending(false);
				});
			});
			return;
		} else try {
			const Router = (await import("./router-CM6BBu8E.js")).default;
			if (replace) await Router.replace(absoluteHref, void 0, { scroll });
			else await Router.push(absoluteHref, void 0, { scroll });
		} catch {
			if (replace) window.history.replaceState({}, "", absoluteFullHref);
			else window.history.pushState({}, "", absoluteFullHref);
			window.dispatchEvent(new PopStateEvent("popstate"));
		}
	};
	const { passHref: _p, ...anchorProps } = restWithoutLocale;
	const linkStatusValue = React.useMemo(() => ({ pending }), [pending]);
	if (isDangerous) return /* @__PURE__ */ jsx("a", {
		...anchorProps,
		onMouseEnter: handleMouseEnter,
		onTouchStart: handleTouchStart,
		children
	});
	return /* @__PURE__ */ jsx(LinkStatusContext.Provider, {
		value: linkStatusValue,
		children: /* @__PURE__ */ jsx("a", {
			ref: setRefs,
			href: fullHref,
			onClick: (event) => {
				handleClick(event);
			},
			onMouseEnter: handleMouseEnter,
			onTouchStart: handleTouchStart,
			...anchorProps,
			children
		})
	});
});
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
	return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toPascalCase = (string) => {
	const camelCase = toCamelCase(string);
	return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
//#endregion
//#region node_modules/lucide-react/dist/esm/defaultAttributes.mjs
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var defaultAttributes = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round"
};
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var hasA11yProp = (props) => {
	for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
	return false;
};
//#endregion
//#region node_modules/lucide-react/dist/esm/context.mjs
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LucideContext = createContext({});
var useLucideContext = () => useContext(LucideContext);
//#endregion
//#region node_modules/lucide-react/dist/esm/Icon.mjs
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Icon = forwardRef(({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
	const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, color: contextColor = "currentColor", className: contextClass = "" } = useLucideContext() ?? {};
	const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
	return createElement("svg", {
		ref,
		...defaultAttributes,
		width: size ?? contextSize ?? defaultAttributes.width,
		height: size ?? contextSize ?? defaultAttributes.height,
		stroke: color ?? contextColor,
		strokeWidth: calculatedStrokeWidth,
		className: mergeClasses("lucide", contextClass, className),
		...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
		...rest
	}, [...iconNode.map(([tag, attrs]) => createElement(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
});
//#endregion
//#region node_modules/lucide-react/dist/esm/createLucideIcon.mjs
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var createLucideIcon = (iconName, iconNode) => {
	const Component = forwardRef(({ className, ...props }, ref) => createElement(Icon, {
		ref,
		iconNode,
		className: mergeClasses(`lucide-${toKebabCase(toPascalCase(iconName))}`, `lucide-${iconName}`, className),
		...props
	}));
	Component.displayName = toPascalCase(iconName);
	return Component;
};
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Trophy = createLucideIcon("trophy", [
	["path", {
		d: "M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2",
		key: "pwuv1l"
	}],
	["path", {
		d: "M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2",
		key: "1y54w1"
	}],
	["path", {
		d: "M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3",
		key: "e30mpu"
	}],
	["path", {
		d: "M4 22h16",
		key: "57wxv0"
	}],
	["path", {
		d: "M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z",
		key: "1mhfuq"
	}],
	["path", {
		d: "M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3",
		key: "i0yafy"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Wallet = createLucideIcon("wallet", [["path", {
	d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",
	key: "18etb6"
}], ["path", {
	d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",
	key: "xoc0q4"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Swords = createLucideIcon("swords", [
	["polyline", {
		points: "14.5 17.5 3 6 3 3 6 3 17.5 14.5",
		key: "1hfsw2"
	}],
	["line", {
		x1: "13",
		x2: "19",
		y1: "19",
		y2: "13",
		key: "1vrmhu"
	}],
	["line", {
		x1: "16",
		x2: "20",
		y1: "16",
		y2: "20",
		key: "1bron3"
	}],
	["line", {
		x1: "19",
		x2: "21",
		y1: "21",
		y2: "19",
		key: "13pww6"
	}],
	["polyline", {
		points: "14.5 6.5 18 3 21 3 21 6 17.5 9.5",
		key: "hbey2j"
	}],
	["line", {
		x1: "5",
		x2: "9",
		y1: "14",
		y2: "18",
		key: "1hf58s"
	}],
	["line", {
		x1: "7",
		x2: "4",
		y1: "17",
		y2: "20",
		key: "pidxm4"
	}],
	["line", {
		x1: "3",
		x2: "5",
		y1: "19",
		y2: "21",
		key: "1pehsh"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var User = createLucideIcon("user", [["path", {
	d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",
	key: "975kel"
}], ["circle", {
	cx: "12",
	cy: "7",
	r: "4",
	key: "17ys0d"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LogIn = createLucideIcon("log-in", [
	["path", {
		d: "m10 17 5-5-5-5",
		key: "1bsop3"
	}],
	["path", {
		d: "M15 12H3",
		key: "6jk70r"
	}],
	["path", {
		d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",
		key: "u53s6r"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LogOut = createLucideIcon("log-out", [
	["path", {
		d: "m16 17 5-5-5-5",
		key: "1bji2h"
	}],
	["path", {
		d: "M21 12H9",
		key: "dn1m92"
	}],
	["path", {
		d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
		key: "1uf3rs"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var KeyRound = createLucideIcon("key-round", [["path", {
	d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
	key: "1s6t7t"
}], ["circle", {
	cx: "16.5",
	cy: "7.5",
	r: ".5",
	fill: "currentColor",
	key: "w0ekpg"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var CircleCheck = createLucideIcon("circle-check", [["circle", {
	cx: "12",
	cy: "12",
	r: "10",
	key: "1mglay"
}], ["path", {
	d: "m9 12 2 2 4-4",
	key: "dzmm74"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var CircleAlert = createLucideIcon("circle-alert", [
	["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}],
	["line", {
		x1: "12",
		x2: "12",
		y1: "8",
		y2: "12",
		key: "1pkeuh"
	}],
	["line", {
		x1: "12",
		x2: "12.01",
		y1: "16",
		y2: "16",
		key: "4dfq90"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var X = createLucideIcon("x", [["path", {
	d: "M18 6 6 18",
	key: "1bl5f8"
}], ["path", {
	d: "m6 6 12 12",
	key: "d8bk6v"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Menu = createLucideIcon("menu", [
	["path", {
		d: "M4 5h16",
		key: "1tepv9"
	}],
	["path", {
		d: "M4 12h16",
		key: "1lakjw"
	}],
	["path", {
		d: "M4 19h16",
		key: "1djgab"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Shield = createLucideIcon("shield", [["path", {
	d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
	key: "oel41y"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Bell = createLucideIcon("bell", [["path", {
	d: "M10.268 21a2 2 0 0 0 3.464 0",
	key: "vwvbt9"
}], ["path", {
	d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
	key: "11g9vi"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Zap = createLucideIcon("zap", [["path", {
	d: "M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z",
	key: "1v7up4"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Sparkles = createLucideIcon("sparkles", [
	["path", {
		d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
		key: "1s2grr"
	}],
	["path", {
		d: "M20 2v4",
		key: "1rf3ol"
	}],
	["path", {
		d: "M22 4h-4",
		key: "gwowj6"
	}],
	["circle", {
		cx: "4",
		cy: "20",
		r: "2",
		key: "6kqj1y"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Check = createLucideIcon("check", [["path", {
	d: "M20 6 9 17l-5-5",
	key: "1gmf2c"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Phone = createLucideIcon("phone", [["path", {
	d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
	key: "9njp5v"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ChevronDown = createLucideIcon("chevron-down", [["path", {
	d: "m6 9 6 6 6-6",
	key: "qrunsl"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ChevronRight = createLucideIcon("chevron-right", [["path", {
	d: "m9 18 6-6-6-6",
	key: "mthhwq"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var UserCog = createLucideIcon("user-cog", [
	["path", {
		d: "M10 15H6a4 4 0 0 0-4 4v2",
		key: "1nfge6"
	}],
	["path", {
		d: "m14.305 16.53.923-.382",
		key: "1itpsq"
	}],
	["path", {
		d: "m15.228 13.852-.923-.383",
		key: "eplpkm"
	}],
	["path", {
		d: "m16.852 12.228-.383-.923",
		key: "13v3q0"
	}],
	["path", {
		d: "m16.852 17.772-.383.924",
		key: "1i8mnm"
	}],
	["path", {
		d: "m19.148 12.228.383-.923",
		key: "1q8j1v"
	}],
	["path", {
		d: "m19.53 18.696-.382-.924",
		key: "vk1qj3"
	}],
	["path", {
		d: "m20.772 13.852.924-.383",
		key: "n880s0"
	}],
	["path", {
		d: "m20.772 16.148.924.383",
		key: "1g6xey"
	}],
	["circle", {
		cx: "18",
		cy: "15",
		r: "3",
		key: "gjjjvw"
	}],
	["circle", {
		cx: "9",
		cy: "7",
		r: "4",
		key: "nufk8"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Eye = createLucideIcon("eye", [["path", {
	d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
	key: "1nclc0"
}], ["circle", {
	cx: "12",
	cy: "12",
	r: "3",
	key: "1v7zrd"
}]]);
//#endregion
//#region lib/rank-service.ts
var GHANAIAN_RANKS = [
	{
		tier: 1,
		title: "Draft Learner",
		aka: "Spot Starter",
		badgeEmoji: "🪵",
		minRating: 0,
		nextTierRating: 1080,
		minGamesRequired: 0,
		description: "New draughts player getting started on the board."
	},
	{
		tier: 2,
		title: "Base Challenger",
		aka: "Base Player",
		badgeEmoji: "🥉",
		minRating: 1080,
		nextTierRating: 1220,
		minGamesRequired: 3,
		description: "Regular player at local draughts bases across Ghana."
	},
	{
		tier: 3,
		title: "Spot Champion",
		aka: "Spot Hero",
		badgeEmoji: "🥈",
		minRating: 1220,
		nextTierRating: 1380,
		minGamesRequired: 8,
		description: "Dominates local match tables and spot challenges."
	},
	{
		tier: 4,
		title: "Town Master",
		aka: "Town Champion",
		badgeEmoji: "🥇",
		minRating: 1380,
		nextTierRating: 1550,
		minGamesRequired: 15,
		description: "Renowned neighborhood tactician and compulsory capture expert."
	},
	{
		tier: 5,
		title: "Regional Giant",
		aka: "Region Master",
		badgeEmoji: "💎",
		minRating: 1550,
		nextTierRating: 1720,
		minGamesRequired: 25,
		description: "Feared across regional tournament leagues and wager arenas."
	},
	{
		tier: 6,
		title: "Ghana Damii Master",
		aka: "National Master",
		badgeEmoji: "👑",
		minRating: 1720,
		nextTierRating: 1880,
		minGamesRequired: 40,
		description: "Elite national draughts master recognized across Ghana."
	},
	{
		tier: 7,
		title: "Opana Grandmaster",
		aka: "Opana",
		badgeEmoji: "🔥",
		minRating: 1880,
		nextTierRating: 2050,
		minGamesRequired: 60,
		description: "Grandmaster status with flying king mastery and legendary instinct."
	},
	{
		tier: 8,
		title: "Champion of Champions",
		aka: "Okonkwo",
		badgeEmoji: "⚡",
		minRating: 2050,
		nextTierRating: 9999,
		minGamesRequired: 80,
		description: "The supreme legend of Ghanaian 10x10 Damii."
	}
];
/**
* Dynamically calculates a player's rank based on composite factors:
* 1. Base ELO Rating
* 2. Win Streak Bonus
* 3. Match Frequency / Recency Bonus
* 4. Opponent Rating Gap Quality
*/
function getProfileRank(profile) {
	if (!profile) return {
		...GHANAIAN_RANKS[0],
		progressPercent: 0,
		dpi: 1e3,
		baseRating: 1e3,
		streakBonus: 0,
		frequencyBonus: 0,
		gapBonus: 0
	};
	const baseRating = profile.rating ?? 1e3;
	const wins = profile.wins ?? 0;
	const losses = profile.losses ?? 0;
	const draws = profile.draws ?? 0;
	const totalGames = wins + losses + draws;
	const winStreak = profile.winStreak ?? 0;
	const bestStreak = profile.bestStreak ?? 0;
	const matchesLast7Days = profile.matchesLast7Days ?? (totalGames > 0 ? Math.min(totalGames, 5) : 0);
	const opponentRatingAvg = profile.opponentRatingAvg ?? 1e3;
	const streakBonus = Math.min(150, winStreak * 18 + (bestStreak >= 3 ? 20 : 0));
	const frequencyBonus = Math.min(100, matchesLast7Days * 15);
	const gapBonus = Math.min(120, Math.max(-40, Math.round((opponentRatingAvg - 1e3) * .25)));
	const dpi = Math.max(100, Math.round(baseRating + streakBonus + frequencyBonus + gapBonus));
	let currentRankIndex = 0;
	for (let i = GHANAIAN_RANKS.length - 1; i >= 0; i--) {
		const tier = GHANAIAN_RANKS[i];
		if (dpi >= tier.minRating && totalGames >= tier.minGamesRequired) {
			currentRankIndex = i;
			break;
		}
	}
	const currentRank = GHANAIAN_RANKS[currentRankIndex];
	const nextRank = GHANAIAN_RANKS[Math.min(currentRankIndex + 1, GHANAIAN_RANKS.length - 1)];
	let progressPercent = 100;
	if (currentRankIndex < GHANAIAN_RANKS.length - 1) {
		const ratingRange = Math.max(1, nextRank.minRating - currentRank.minRating);
		const ratingProgress = Math.max(0, dpi - currentRank.minRating);
		progressPercent = Math.min(100, Math.round(ratingProgress / ratingRange * 100));
	}
	return {
		...currentRank,
		progressPercent,
		dpi,
		baseRating,
		streakBonus,
		frequencyBonus,
		gapBonus
	};
}
//#endregion
//#region lib/client-auth.ts
function getSessionToken() {
	if (typeof window === "undefined") return null;
	return localStorage.getItem("damii_session_token") || localStorage.getItem("damii_token") || localStorage.getItem("damii-player-token") || sessionStorage.getItem("damii_session_token");
}
function saveSessionToken(token, csrfToken) {
	if (typeof window === "undefined") return;
	localStorage.setItem("damii_session_token", token);
	localStorage.setItem("damii_token", token);
	localStorage.setItem("damii-player-token", token);
	sessionStorage.setItem("damii_session_token", token);
	if (csrfToken) saveCsrfToken(csrfToken);
}
function saveCsrfToken(csrfToken) {
	if (typeof window === "undefined") return;
	localStorage.setItem("damii_csrf_token", csrfToken);
}
function getCsrfToken() {
	if (typeof window === "undefined") return null;
	const match = document.cookie.match(/(?:^|; )damii_csrf=([^;]*)/);
	if (match && match[1]) return decodeURIComponent(match[1]);
	return localStorage.getItem("damii_csrf_token");
}
function clearSessionToken() {
	if (typeof window === "undefined") return;
	localStorage.removeItem("damii_session_token");
	localStorage.removeItem("damii_token");
	localStorage.removeItem("damii-player-token");
	localStorage.removeItem("damii-player-name");
	localStorage.removeItem("damii-auth-user");
	localStorage.removeItem("damii_csrf_token");
	sessionStorage.removeItem("damii_session_token");
	document.cookie = "damii_session=; path=/; max-age=0";
	document.cookie = "damii_csrf=; path=/; max-age=0";
}
function getAuthHeaders(extraHeaders = {}) {
	const token = getSessionToken();
	const csrfToken = getCsrfToken();
	const headers = {
		"Content-Type": "application/json",
		...extraHeaders
	};
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
		headers["x-session-token"] = token;
	}
	if (csrfToken) headers["x-csrf-token"] = csrfToken;
	return headers;
}
async function rotateSessionToken() {
	try {
		const res = await fetch("/api/auth", {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify({ action: "rotate_session" })
		});
		const data = await res.json();
		if (res.ok && data.success && data.token) {
			saveSessionToken(data.token, data.csrfToken);
			return {
				success: true,
				token: data.token,
				csrfToken: data.csrfToken
			};
		}
		return {
			success: false,
			error: data.error || "Failed to rotate session"
		};
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : "Network error"
		};
	}
}
async function revokeAllSessions(exceptCurrent = false) {
	try {
		const res = await fetch("/api/auth", {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify({
				action: "revoke_all_sessions",
				exceptCurrent
			})
		});
		const data = await res.json();
		if (res.ok && data.success) {
			if (!exceptCurrent) clearSessionToken();
			return {
				success: true,
				count: data.count
			};
		}
		return {
			success: false,
			error: data.error || "Failed to revoke sessions"
		};
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : "Network error"
		};
	}
}
//#endregion
//#region components/Header.tsx
function Header() {
	const pathname = usePathname();
	const router = useRouter();
	const [userToken, setUserToken] = useState(null);
	const [username, setUsername] = useState("");
	const [points, setPoints] = useState(0);
	const [role, setRole] = useState("user");
	const [rating, setRating] = useState(1e3);
	const [phoneNumber, setPhoneNumber] = useState("");
	const [wins, setWins] = useState(0);
	const [losses, setLosses] = useState(0);
	const [draws, setDraws] = useState(0);
	const [winStreak, setWinStreak] = useState(0);
	const [bestStreak, setBestStreak] = useState(0);
	const [matchesLast7Days, setMatchesLast7Days] = useState(0);
	const [opponentRatingAvg, setOpponentRatingAvg] = useState(1e3);
	const [organizerStatus, setOrganizerStatus] = useState("none");
	const [isAuthOpen, setIsAuthOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
	const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
	const [isMatchActive, setIsMatchActive] = useState(false);
	const [isFocusMode, setIsFocusMode] = useState(false);
	const [pendingNavUrl, setPendingNavUrl] = useState(null);
	useEffect(() => {
		const checkMatchState = () => {
			if (typeof window !== "undefined") {
				setIsMatchActive(sessionStorage.getItem("damii-active-match") === "true");
				setIsFocusMode(sessionStorage.getItem("damii-focus-mode") === "true");
			}
		};
		checkMatchState();
		const handleMatchChange = (e) => {
			if (e && "detail" in e && typeof e.detail === "boolean") setIsMatchActive(e.detail);
			else checkMatchState();
		};
		const handleFocusChange = (e) => {
			if (e && "detail" in e && typeof e.detail === "boolean") setIsFocusMode(e.detail);
			else checkMatchState();
		};
		window.addEventListener("damii-match-active-change", handleMatchChange);
		window.addEventListener("damii-focus-mode-change", handleFocusChange);
		return () => {
			window.removeEventListener("damii-match-active-change", handleMatchChange);
			window.removeEventListener("damii-focus-mode-change", handleFocusChange);
		};
	}, []);
	const handleNavClick = (e, href) => {
		if (isMatchActive && pathname === "/arena" && href !== "/arena" && href !== "#") {
			e.preventDefault();
			e.stopPropagation();
			setPendingNavUrl(href);
		}
	};
	const [notifications, setNotifications] = useState([]);
	const [readIds, setReadIds] = useState([]);
	const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
	const [authMode, setAuthMode] = useState("login");
	const [formUsername, setFormUsername] = useState("");
	const [formPasscode, setFormPasscode] = useState("");
	const [formPhone, setFormPhone] = useState("");
	const [authError, setAuthError] = useState("");
	const [authSuccess, setAuthSuccess] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [editUsername, setEditUsername] = useState("");
	const [editPhone, setEditPhone] = useState("");
	const [editPasscode, setEditPasscode] = useState("");
	const [editError, setEditError] = useState("");
	const [editSuccess, setEditSuccess] = useState("");
	const [isEditLoading, setIsEditLoading] = useState(false);
	const fetchNotifications = useCallback((token) => {
		fetch(`/api/notifications?token=${encodeURIComponent(token)}`).then((res) => res.json()).then((data) => {
			if (Array.isArray(data.notifications)) setNotifications(data.notifications);
		}).catch(() => void 0);
	}, []);
	const syncAuth = useCallback(() => {
		const token = localStorage.getItem("damii-player-token");
		const name = localStorage.getItem("damii-player-name");
		if (token) {
			setUserToken(token);
			setUsername(name || "Player");
			fetch(`/api/wallet?token=${encodeURIComponent(token)}`).then((res) => res.json()).then((data) => {
				if (data.balance) {
					setPoints(data.balance.points ?? 0);
					if (data.balance.username) setUsername(data.balance.username);
					if (data.balance.role) setRole(data.balance.role);
					if (data.balance.rating !== void 0) setRating(data.balance.rating);
					if (data.balance.phoneNumber !== void 0) setPhoneNumber(data.balance.phoneNumber);
					if (data.balance.wins !== void 0) setWins(data.balance.wins);
					if (data.balance.losses !== void 0) setLosses(data.balance.losses);
					if (data.balance.draws !== void 0) setDraws(data.balance.draws);
					if (data.balance.winStreak !== void 0) setWinStreak(data.balance.winStreak);
					if (data.balance.bestStreak !== void 0) setBestStreak(data.balance.bestStreak);
					if (data.balance.matchesLast7Days !== void 0) setMatchesLast7Days(data.balance.matchesLast7Days);
					if (data.balance.opponentRatingAvg !== void 0) setOpponentRatingAvg(data.balance.opponentRatingAvg);
				}
			}).catch(() => void 0);
			fetch(`/api/organizer/request`, { headers: { Authorization: `Bearer ${token}` } }).then((res) => res.json()).then((data) => {
				if (data.organizerProfile?.status) setOrganizerStatus(data.organizerProfile.status);
				else setOrganizerStatus("none");
			}).catch(() => setOrganizerStatus("none"));
			fetchNotifications(token);
		} else {
			setUserToken(null);
			setUsername("Guest");
			setPoints(0);
			setRole("guest");
			setRating(1e3);
			setPhoneNumber("");
			setWins(0);
			setLosses(0);
			setDraws(0);
			setNotifications([]);
			setOrganizerStatus("none");
		}
	}, [fetchNotifications]);
	useEffect(() => {
		try {
			const savedRead = localStorage.getItem("damii-read-notifications");
			if (savedRead) setReadIds(JSON.parse(savedRead));
		} catch {}
	}, []);
	useEffect(() => {
		if (isMobileMenuOpen) document.body.style.overflow = "hidden";
		else document.body.style.overflow = "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [isMobileMenuOpen]);
	useEffect(() => {
		syncAuth();
		const handleAuthChange = () => syncAuth();
		const handleOpenAuth = (e) => {
			setAuthError("");
			setAuthSuccess("");
			const customEvent = e;
			if (customEvent.detail?.mode) setAuthMode(customEvent.detail.mode);
			setIsAuthOpen(true);
		};
		window.addEventListener("damii-auth-changed", handleAuthChange);
		window.addEventListener("storage", handleAuthChange);
		window.addEventListener("damii-open-auth", handleOpenAuth);
		return () => {
			window.removeEventListener("damii-auth-changed", handleAuthChange);
			window.removeEventListener("storage", handleAuthChange);
			window.removeEventListener("damii-open-auth", handleOpenAuth);
		};
	}, [pathname, syncAuth]);
	const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;
	const isOrganizerOrApplied = [
		"organizer",
		"facilitator",
		"admin",
		"super_admin"
	].includes(role) || [
		"pending",
		"approved",
		"rejected"
	].includes(organizerStatus);
	const markAllNotificationsRead = () => {
		const allIds = notifications.map((n) => n.id);
		setReadIds(allIds);
		localStorage.setItem("damii-read-notifications", JSON.stringify(allIds));
	};
	const markNotificationRead = (id) => {
		const updated = Array.from(new Set([...readIds, id]));
		setReadIds(updated);
		localStorage.setItem("damii-read-notifications", JSON.stringify(updated));
	};
	const handleAuthSubmit = async (e) => {
		e.preventDefault();
		setAuthError("");
		setAuthSuccess("");
		if (!formUsername.trim() || !formPasscode.trim()) {
			setAuthError("Username and passcode are required.");
			return;
		}
		if (authMode === "register" && !formPhone.trim()) {
			setAuthError("Phone number is required for registration.");
			return;
		}
		setIsLoading(true);
		try {
			const res = await fetch("/api/auth", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: authMode,
					username: formUsername.trim(),
					passcode: formPasscode.trim(),
					phoneNumber: formPhone.trim()
				})
			});
			const data = await res.json();
			if (!res.ok || data.error) {
				setAuthError(data.error || "Authentication failed.");
				setIsLoading(false);
				return;
			}
			saveSessionToken(data.token, data.csrfToken);
			localStorage.setItem("damii-player-token", data.token);
			localStorage.setItem("damii-player-name", data.profile.username);
			localStorage.setItem("damii-auth-user", JSON.stringify({
				token: data.token,
				username: data.profile.username,
				points: data.profile.points,
				role: data.profile.role
			}));
			setAuthSuccess(authMode === "register" ? `Account created! Welcome to DAMII Arena.` : `Welcome back, ${data.profile.username}!`);
			window.dispatchEvent(new Event("damii-auth-changed"));
			setTimeout(() => {
				setIsAuthOpen(false);
				setFormPasscode("");
				setFormPhone("");
				setAuthSuccess("");
			}, 1e3);
		} catch {
			setAuthError("Server communication error. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};
	const handleEditProfileSubmit = async (e) => {
		e.preventDefault();
		setEditError("");
		setEditSuccess("");
		if (!editUsername.trim()) {
			setEditError("Username cannot be empty.");
			return;
		}
		if (!userToken) return;
		setIsEditLoading(true);
		try {
			const res = await fetch("/api/auth", {
				method: "POST",
				headers: getAuthHeaders(),
				body: JSON.stringify({
					action: "update_profile",
					token: userToken,
					username: editUsername.trim(),
					phoneNumber: editPhone.trim(),
					passcode: editPasscode.trim() || void 0
				})
			});
			const data = await res.json();
			if (!res.ok || data.error) {
				setEditError(data.error || "Failed to update profile.");
				setIsEditLoading(false);
				return;
			}
			setEditSuccess("Profile updated successfully!");
			localStorage.setItem("damii-player-name", data.profile.username);
			setUsername(data.profile.username);
			setPhoneNumber(data.profile.phoneNumber || "");
			window.dispatchEvent(new Event("damii-auth-changed"));
			setTimeout(() => {
				setIsEditProfileOpen(false);
				setEditPasscode("");
				setEditSuccess("");
			}, 1e3);
		} catch {
			setEditError("Server communication error. Please try again.");
		} finally {
			setIsEditLoading(false);
		}
	};
	const handleRotateSession = async () => {
		setEditError("");
		setEditSuccess("");
		setIsEditLoading(true);
		const result = await rotateSessionToken();
		setIsEditLoading(false);
		if (result.success && result.token) {
			setUserToken(result.token);
			setEditSuccess("Session token rotated successfully! New secure session active.");
			window.dispatchEvent(new Event("damii-auth-changed"));
		} else setEditError(result.error || "Failed to rotate session token.");
	};
	const handleRevokeSessions = async (exceptCurrent = false) => {
		setEditError("");
		setEditSuccess("");
		setIsEditLoading(true);
		const result = await revokeAllSessions(exceptCurrent);
		setIsEditLoading(false);
		if (result.success) if (exceptCurrent) setEditSuccess(`Revoked ${result.count ?? 0} other active session(s).`);
		else {
			clearAuth();
			setIsEditProfileOpen(false);
			alert("All sessions revoked. You have been signed out.");
		}
		else setEditError(result.error || "Failed to revoke sessions.");
	};
	const clearAuth = () => {
		clearSessionToken();
		localStorage.removeItem("damii-player-token");
		localStorage.removeItem("damii-player-name");
		localStorage.removeItem("damii-auth-user");
		setUserToken(null);
		setUsername("");
		setIsProfileDropdownOpen(false);
		window.dispatchEvent(new Event("damii-auth-changed"));
	};
	const handleLogout = () => {
		clearAuth();
	};
	return /* @__PURE__ */ jsxs(Fragment$1, { children: [
		/* @__PURE__ */ jsxs("header", {
			className: "topbar relative",
			children: [
				/* @__PURE__ */ jsxs(Link, {
					className: "brand",
					href: "/",
					onClick: (e) => handleNavClick(e, "/"),
					children: [/* @__PURE__ */ jsx("span", {
						className: "brand-mark",
						children: "D"
					}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", { children: "DAMII" }), /* @__PURE__ */ jsx("small", {
						className: "hidden sm:block",
						children: "10×10 Strategy Arena"
					})] })]
				}),
				/* @__PURE__ */ jsxs("nav", {
					className: "hidden md:flex topbar-desktop-nav items-center gap-5",
					children: [
						/* @__PURE__ */ jsxs(Link, {
							className: `nav-link ${pathname === "/arena" ? "active" : ""}`,
							href: "/arena",
							onClick: (e) => handleNavClick(e, "/arena"),
							children: [/* @__PURE__ */ jsx(Swords, { size: 16 }), " Arena"]
						}),
						/* @__PURE__ */ jsxs(Link, {
							className: `nav-link ${pathname === "/leagues" ? "active" : ""}`,
							href: "/leagues",
							onClick: (e) => handleNavClick(e, "/leagues"),
							children: [/* @__PURE__ */ jsx(Trophy, { size: 16 }), " Tournaments"]
						}),
						isOrganizerOrApplied && /* @__PURE__ */ jsxs(Link, {
							className: `nav-link ${pathname === "/organizer" ? "active" : ""}`,
							href: "/organizer",
							onClick: (e) => handleNavClick(e, "/organizer"),
							children: [/* @__PURE__ */ jsx(UserCog, {
								size: 16,
								className: "text-[#d6a735]"
							}), " Organizer Hub"]
						}),
						/* @__PURE__ */ jsxs(Link, {
							className: `nav-link ${pathname === "/wallet" ? "active" : ""}`,
							href: "/wallet",
							onClick: (e) => handleNavClick(e, "/wallet"),
							children: [/* @__PURE__ */ jsx(Wallet, { size: 16 }), " Wallet"]
						}),
						role === "admin" && /* @__PURE__ */ jsxs(Link, {
							className: `nav-link ${pathname === "/admin" ? "active" : ""}`,
							href: "/admin",
							onClick: (e) => handleNavClick(e, "/admin"),
							children: [/* @__PURE__ */ jsx(Shield, {
								size: 16,
								className: "text-[#d6a735]"
							}), " Admin"]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "topbar-user",
							children: userToken ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
								/* @__PURE__ */ jsxs("div", {
									className: "relative",
									children: [/* @__PURE__ */ jsxs("button", {
										type: "button",
										onClick: () => {
											setIsNotificationsOpen((prev) => !prev);
											setIsProfileDropdownOpen(false);
										},
										"aria-label": "Notifications",
										className: "relative p-2 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded-xl border border-[#d6a735]/40 transition-colors flex items-center justify-center shadow-sm",
										title: "Notifications & Updates",
										children: [/* @__PURE__ */ jsx(Bell, { size: 16 }), unreadCount > 0 && /* @__PURE__ */ jsx("span", {
											className: "absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-[#d6a735] text-[#06261f] font-black text-[10px] rounded-full flex items-center justify-center shadow-md animate-pulse",
											children: unreadCount
										})]
									}), isNotificationsOpen && /* @__PURE__ */ jsxs("div", {
										className: "absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-[#06261f] border border-[#d6a735]/40 rounded-2xl shadow-2xl z-50 p-3 space-y-2 text-left text-[#f5efdf] animate-in fade-in slide-in-from-top-2 duration-150",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between pb-2 border-b border-[#0c3b2e]",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex items-center gap-1.5 text-xs font-bold text-[#f5efdf]",
												children: [
													/* @__PURE__ */ jsx(Bell, {
														size: 14,
														className: "text-[#d6a735]"
													}),
													/* @__PURE__ */ jsx("span", { children: "Updates & Invitations" }),
													unreadCount > 0 && /* @__PURE__ */ jsxs("span", {
														className: "px-1.5 py-0.2 bg-[#d6a735]/20 text-[#d6a735] rounded-full text-[10px] font-extrabold",
														children: [unreadCount, " New"]
													})
												]
											}), unreadCount > 0 && /* @__PURE__ */ jsx("button", {
												type: "button",
												onClick: markAllNotificationsRead,
												className: "text-[10px] text-[#d6a735] hover:underline font-bold",
												children: "Mark all read"
											})]
										}), /* @__PURE__ */ jsx("div", {
											className: "max-h-72 overflow-y-auto space-y-2 scrollbar-thin",
											children: notifications.length === 0 ? /* @__PURE__ */ jsx("p", {
												className: "text-xs text-slate-400 text-center py-4",
												children: "No recent notifications"
											}) : notifications.map((n) => {
												const isUnread = !readIds.includes(n.id);
												return /* @__PURE__ */ jsx("div", {
													className: `p-2.5 rounded-xl border transition-all relative ${isUnread ? "bg-[#0c3b2e] border-[#d6a735]/50" : "bg-[#0c3b2e]/40 border-[#184d3c] opacity-80"}`,
													children: /* @__PURE__ */ jsxs("div", {
														className: "flex items-start justify-between gap-2",
														children: [/* @__PURE__ */ jsxs(Link, {
															href: n.link,
															onClick: () => {
																markNotificationRead(n.id);
																setIsNotificationsOpen(false);
															},
															className: "flex-1 min-w-0",
															children: [/* @__PURE__ */ jsxs("div", {
																className: "flex items-center gap-1.5 mb-1",
																children: [n.type === "league_invite" ? /* @__PURE__ */ jsx(Trophy, {
																	size: 13,
																	className: "text-[#d6a735] shrink-0"
																}) : n.type === "wager_settlement" ? /* @__PURE__ */ jsx(Zap, {
																	size: 13,
																	className: "text-emerald-400 shrink-0"
																}) : /* @__PURE__ */ jsx(Sparkles, {
																	size: 13,
																	className: "text-sky-400 shrink-0"
																}), /* @__PURE__ */ jsx("strong", {
																	className: "text-xs font-bold text-[#f5efdf] truncate block",
																	children: n.title
																})]
															}), /* @__PURE__ */ jsx("p", {
																className: "text-[11px] text-[#cbd5e1] leading-tight mb-1",
																children: n.message
															})]
														}), isUnread && /* @__PURE__ */ jsx("button", {
															type: "button",
															onClick: () => markNotificationRead(n.id),
															title: "Mark as read",
															className: "p-1 hover:bg-[#144435] text-slate-400 hover:text-[#d6a735] rounded shrink-0",
															children: /* @__PURE__ */ jsx(Check, { size: 12 })
														})]
													})
												}, n.id);
											})
										})]
									})]
								}),
								/* @__PURE__ */ jsxs(Link, {
									href: "/wallet",
									onClick: (e) => handleNavClick(e, "/wallet"),
									className: "points-badge shrink-0 hover:scale-105 transition-transform flex items-center gap-1 font-black cursor-pointer shadow-sm",
									title: "Click to Open Wallet",
									children: ["GH₵ ", typeof points === "number" ? points.toFixed(2) : points]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "relative",
									children: (() => {
										const userRank = getProfileRank({
											rating,
											wins,
											losses,
											draws,
											winStreak,
											bestStreak,
											matchesLast7Days,
											opponentRatingAvg
										});
										return /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => {
												setIsProfileDropdownOpen((prev) => !prev);
												setIsNotificationsOpen(false);
											},
											className: "user-pill shrink-0 flex items-center gap-2 hover:bg-[#0c3b2e] border border-[#d6a735]/40 py-1.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm",
											title: "User Account & Settings Menu",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "w-6 h-6 rounded-full bg-[#d6a735]/20 text-[#d6a735] font-black flex items-center justify-center text-xs border border-[#d6a735]/50",
													children: username ? username[0].toUpperCase() : "P"
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "text-left hidden sm:block",
													children: [/* @__PURE__ */ jsx("strong", {
														className: "block text-xs font-black text-[#f5efdf] leading-tight truncate max-w-[100px]",
														children: username
													}), /* @__PURE__ */ jsx("span", {
														className: "block text-[9px] text-[#d6a735] font-bold uppercase truncate max-w-[100px]",
														children: role === "admin" ? "Admin" : `${userRank.badgeEmoji} ${userRank.title}`
													})]
												}),
												/* @__PURE__ */ jsx(ChevronDown, {
													size: 14,
													className: `text-[#d6a735] transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""}`
												})
											]
										}), isProfileDropdownOpen && /* @__PURE__ */ jsxs("div", {
											className: "absolute right-0 top-full mt-2 w-72 bg-[#06261f] border border-[#d6a735]/40 rounded-2xl shadow-2xl z-50 p-3 space-y-2.5 text-left text-[#f5efdf] animate-in fade-in slide-in-from-top-2 duration-150",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "p-3 bg-[#0c3b2e] rounded-xl border border-[#d6a735]/30 flex items-center gap-3",
													children: [/* @__PURE__ */ jsx("div", {
														className: "w-10 h-10 rounded-full bg-[#d6a735] text-[#06261f] font-black flex items-center justify-center text-base shadow-md shrink-0",
														children: username ? username[0].toUpperCase() : "U"
													}), /* @__PURE__ */ jsxs("div", {
														className: "min-w-0 flex-1",
														children: [
															/* @__PURE__ */ jsx("strong", {
																className: "block text-sm font-black text-[#f5efdf] truncate",
																children: username
															}),
															/* @__PURE__ */ jsxs("div", {
																className: "flex items-center gap-1.5 mt-0.5",
																children: [/* @__PURE__ */ jsx("span", {
																	className: "px-1.5 py-0.5 bg-[#d6a735]/20 text-[#d6a735] text-[9px] font-black rounded uppercase",
																	children: role === "admin" ? "Admin" : `${userRank.badgeEmoji} ${userRank.title}`
																}), /* @__PURE__ */ jsxs("span", {
																	className: "text-[10px] text-slate-300 font-bold",
																	children: [
																		userRank.dpi,
																		" DPI (",
																		rating,
																		" ELO)"
																	]
																})]
															}),
															phoneNumber ? /* @__PURE__ */ jsxs("span", {
																className: "block text-[10px] text-[#cbd5e1] mt-1 font-semibold truncate flex items-center gap-1",
																children: [
																	/* @__PURE__ */ jsx(Phone, {
																		size: 10,
																		className: "text-[#d6a735]"
																	}),
																	" ",
																	phoneNumber
																]
															}) : /* @__PURE__ */ jsxs("span", {
																className: "block text-[10px] text-amber-400/90 mt-1 font-semibold italic flex items-center gap-1",
																children: [/* @__PURE__ */ jsx(Phone, { size: 10 }), " Add phone number"]
															})
														]
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "p-2.5 bg-[#0c3b2e]/90 rounded-xl border border-[#d6a735]/30 space-y-1.5",
													children: [
														/* @__PURE__ */ jsxs("div", {
															className: "flex items-center justify-between text-[10px] font-bold",
															children: [/* @__PURE__ */ jsx("span", {
																className: "text-[#d6a735] uppercase tracking-wider",
																children: userRank.aka
															}), /* @__PURE__ */ jsxs("span", {
																className: "text-slate-300",
																children: [userRank.progressPercent, "% to Next Rank"]
															})]
														}),
														/* @__PURE__ */ jsx("div", {
															className: "w-full bg-[#06261f] h-2 rounded-full overflow-hidden border border-[#184d3c]",
															children: /* @__PURE__ */ jsx("div", {
																className: "bg-gradient-to-r from-amber-500 to-[#d6a735] h-full rounded-full transition-all duration-300",
																style: { width: `${userRank.progressPercent}%` }
															})
														}),
														/* @__PURE__ */ jsx("span", {
															className: "block text-[9px] text-slate-400 italic",
															children: userRank.description
														}),
														/* @__PURE__ */ jsxs("div", {
															className: "pt-1.5 border-t border-[#184d3c]/80 grid grid-cols-2 gap-1 text-[9px] font-semibold text-slate-300",
															children: [
																/* @__PURE__ */ jsxs("div", {
																	className: "bg-[#06261f]/70 p-1 rounded border border-[#184d3c] flex items-center justify-between",
																	children: [/* @__PURE__ */ jsx("span", { children: "🔥 Win Streak:" }), /* @__PURE__ */ jsxs("span", {
																		className: "text-amber-400 font-bold",
																		children: [
																			"+",
																			userRank.streakBonus,
																			" DPI"
																		]
																	})]
																}),
																/* @__PURE__ */ jsxs("div", {
																	className: "bg-[#06261f]/70 p-1 rounded border border-[#184d3c] flex items-center justify-between",
																	children: [/* @__PURE__ */ jsx("span", { children: "⚡ Activity:" }), /* @__PURE__ */ jsxs("span", {
																		className: "text-emerald-400 font-bold",
																		children: [
																			"+",
																			userRank.frequencyBonus,
																			" DPI"
																		]
																	})]
																}),
																/* @__PURE__ */ jsxs("div", {
																	className: "bg-[#06261f]/70 p-1 rounded border border-[#184d3c] flex items-center justify-between col-span-2",
																	children: [/* @__PURE__ */ jsx("span", { children: "🎯 Opponent Gap Bonus:" }), /* @__PURE__ */ jsxs("span", {
																		className: "text-[#d6a735] font-bold",
																		children: [
																			"+",
																			userRank.gapBonus,
																			" DPI (",
																			opponentRatingAvg,
																			" Avg ELO)"
																		]
																	})]
																})
															]
														})
													]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "grid grid-cols-3 gap-1 text-center p-2 bg-[#0c3b2e]/60 rounded-xl border border-[#184d3c] text-[10px]",
													children: [
														/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
															className: "block text-emerald-400 font-black text-xs",
															children: wins
														}), /* @__PURE__ */ jsx("span", {
															className: "text-slate-400 font-bold uppercase",
															children: "Wins"
														})] }),
														/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
															className: "block text-red-400 font-black text-xs",
															children: losses
														}), /* @__PURE__ */ jsx("span", {
															className: "text-slate-400 font-bold uppercase",
															children: "Losses"
														})] }),
														/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
															className: "block text-amber-400 font-black text-xs",
															children: draws
														}), /* @__PURE__ */ jsx("span", {
															className: "text-slate-400 font-bold uppercase",
															children: "Draws"
														})] })
													]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "space-y-1.5 pt-1",
													children: [
														/* @__PURE__ */ jsxs("button", {
															type: "button",
															onClick: () => {
																setEditUsername(username);
																setEditPhone(phoneNumber || "");
																setEditPasscode("");
																setEditError("");
																setEditSuccess("");
																setIsProfileDropdownOpen(false);
																setIsEditProfileOpen(true);
															},
															className: "w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors",
															children: [/* @__PURE__ */ jsxs("span", {
																className: "flex items-center gap-2",
																children: [/* @__PURE__ */ jsx(UserCog, {
																	size: 15,
																	className: "text-[#d6a735]"
																}), " Edit Profile & Phone"]
															}), /* @__PURE__ */ jsx(ChevronRight, {
																size: 14,
																className: "text-[#cbd5e1]"
															})]
														}),
														/* @__PURE__ */ jsxs(Link, {
															href: "/wallet",
															onClick: (e) => {
																handleNavClick(e, "/wallet");
																setIsProfileDropdownOpen(false);
															},
															className: "w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors",
															children: [/* @__PURE__ */ jsxs("span", {
																className: "flex items-center gap-2",
																children: [/* @__PURE__ */ jsx(Wallet, {
																	size: 15,
																	className: "text-[#d6a735]"
																}), " Wallet & Ledger"]
															}), /* @__PURE__ */ jsxs("span", {
																className: "text-[10px] font-black text-[#d6a735]",
																children: ["GH₵ ", typeof points === "number" ? points.toFixed(2) : points]
															})]
														}),
														/* @__PURE__ */ jsxs(Link, {
															href: "/leagues",
															onClick: (e) => {
																handleNavClick(e, "/leagues");
																setIsProfileDropdownOpen(false);
															},
															className: "w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors",
															children: [/* @__PURE__ */ jsxs("span", {
																className: "flex items-center gap-2",
																children: [/* @__PURE__ */ jsx(Trophy, {
																	size: 15,
																	className: "text-[#d6a735]"
																}), " Tournaments & Leagues"]
															}), /* @__PURE__ */ jsx(ChevronRight, {
																size: 14,
																className: "text-[#cbd5e1]"
															})]
														}),
														isOrganizerOrApplied && /* @__PURE__ */ jsxs(Link, {
															href: "/organizer",
															onClick: (e) => {
																handleNavClick(e, "/organizer");
																setIsProfileDropdownOpen(false);
															},
															className: "w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors",
															children: [/* @__PURE__ */ jsxs("span", {
																className: "flex items-center gap-2",
																children: [/* @__PURE__ */ jsx(UserCog, {
																	size: 15,
																	className: "text-[#d6a735]"
																}), " Organizer Portal & Studio"]
															}), /* @__PURE__ */ jsx(ChevronRight, {
																size: 14,
																className: "text-[#cbd5e1]"
															})]
														}),
														role === "admin" && /* @__PURE__ */ jsxs(Link, {
															href: "/admin",
															onClick: (e) => {
																handleNavClick(e, "/admin");
																setIsProfileDropdownOpen(false);
															},
															className: "w-full p-2.5 rounded-xl text-xs font-bold bg-[#0c3b2e]/80 hover:bg-[#144435] text-[#f5efdf] border border-[#184d3c] flex items-center justify-between transition-colors",
															children: [/* @__PURE__ */ jsxs("span", {
																className: "flex items-center gap-2",
																children: [/* @__PURE__ */ jsx(Shield, {
																	size: 15,
																	className: "text-[#d6a735]"
																}), " Admin Control Center"]
															}), /* @__PURE__ */ jsx(ChevronRight, {
																size: 14,
																className: "text-[#cbd5e1]"
															})]
														})
													]
												}),
												/* @__PURE__ */ jsx("div", {
													className: "pt-2 border-t border-[#0c3b2e]",
													children: /* @__PURE__ */ jsxs("button", {
														type: "button",
														onClick: handleLogout,
														className: "w-full py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md",
														children: [/* @__PURE__ */ jsx(LogOut, { size: 15 }), " Logout Account"]
													})
												})
											]
										})] });
									})()
								})
							] }) : /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "shrink-0 flex items-center gap-1.5 bg-[#0c3b2e]/90 border border-[#d6a735]/40 py-1 px-2.5 rounded-xl text-xs font-bold text-[#f5efdf]",
									title: "Recognized as Guest Player",
									children: [/* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-amber-400 animate-pulse" }), /* @__PURE__ */ jsx("span", {
										className: "text-[#d6a735] font-black uppercase text-[10px]",
										children: "Guest Player"
									})]
								}), /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => {
										setAuthError("");
										setAuthSuccess("");
										setIsAuthOpen(true);
									},
									className: "px-3.5 py-1.5 text-xs bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl flex items-center gap-1.5 shadow-md transition-all",
									children: [/* @__PURE__ */ jsx(LogIn, { size: 14 }), " Login / Register"]
								})]
							})
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex md:hidden items-center gap-1.5 sm:gap-2",
					children: [userToken ? /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1.5",
						children: [/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => {
								setEditUsername(username);
								setEditPhone(phoneNumber || "");
								setEditPasscode("");
								setEditError("");
								setEditSuccess("");
								setIsEditProfileOpen(true);
							},
							className: "user-pill shrink-0 max-w-[100px] text-[11px] py-1 px-2 flex items-center gap-1 font-bold bg-[#0c3b2e] border border-[#d6a735]/40 text-[#f5efdf]",
							title: "Click to Edit Profile",
							children: [
								/* @__PURE__ */ jsx(User, {
									size: 12,
									className: "shrink-0 text-[#d6a735]"
								}),
								" ",
								/* @__PURE__ */ jsx("span", {
									className: "truncate",
									children: username
								})
							]
						}), /* @__PURE__ */ jsxs("span", {
							className: "points-badge text-[11px] py-1 px-2 font-black shrink-0",
							children: ["GH₵ ", typeof points === "number" ? points.toFixed(2) : points]
						})]
					}) : /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1.5",
						children: [/* @__PURE__ */ jsx("span", {
							className: "px-2 py-0.5 text-[10px] font-black uppercase text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 rounded-lg",
							children: "Guest"
						}), /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => {
								setAuthError("");
								setAuthSuccess("");
								setIsAuthOpen(true);
							},
							className: "px-2.5 py-1 text-xs bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-lg flex items-center gap-1 shadow-sm transition-all",
							children: [/* @__PURE__ */ jsx(LogIn, { size: 13 }), " Login"]
						})]
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => setIsMobileMenuOpen((prev) => !prev),
						"aria-label": "Toggle navigation menu",
						className: "p-1.5 sm:p-2 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded-xl border border-[#d6a735]/40 focus:outline-none transition-colors shadow-sm",
						children: isMobileMenuOpen ? /* @__PURE__ */ jsx(X, { size: 20 }) : /* @__PURE__ */ jsx(Menu, { size: 20 })
					})]
				}),
				isMobileMenuOpen && /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx("div", {
					className: "fixed inset-0 z-50 bg-black/80 backdrop-blur-xs md:hidden transition-opacity",
					onClick: () => setIsMobileMenuOpen(false)
				}), /* @__PURE__ */ jsxs("div", {
					className: "fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[88vw] bg-[#06261f] border-l border-[#d6a735]/30 shadow-2xl p-5 md:hidden flex flex-col justify-between animate-in slide-in-from-right duration-200 text-[#f5efdf]",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between pb-3.5 border-b border-[#0c3b2e]",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2.5",
									children: [/* @__PURE__ */ jsx("span", {
										className: "w-8 h-8 rounded-full bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/50 flex items-center justify-center font-black font-serif text-sm shadow-inner",
										children: "D"
									}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", {
										className: "block text-sm font-black text-[#f5efdf] font-serif tracking-wider",
										children: "DAMII ARENA"
									}), /* @__PURE__ */ jsx("span", {
										className: "block text-[9px] text-[#d6a735] uppercase font-bold tracking-widest",
										children: "Emerald Forest Theme"
									})] })]
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setIsMobileMenuOpen(false),
									"aria-label": "Close navigation menu",
									className: "p-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded-xl border border-[#d6a735]/30 transition-colors",
									children: /* @__PURE__ */ jsx(X, { size: 18 })
								})]
							}),
							userToken ? /* @__PURE__ */ jsxs("div", {
								className: "p-3.5 bg-[#0c3b2e] rounded-2xl border border-[#d6a735]/30 shadow-inner space-y-2",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-3 min-w-0",
										children: [/* @__PURE__ */ jsx("span", {
											className: "w-9 h-9 rounded-full bg-[#d6a735]/20 text-[#d6a735] font-black flex items-center justify-center text-xs border border-[#d6a735]/40 shrink-0 shadow-sm",
											children: username ? username[0].toUpperCase() : "P"
										}), /* @__PURE__ */ jsxs("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ jsx("strong", {
												className: "block text-xs font-black text-[#f5efdf] truncate",
												children: username
											}), /* @__PURE__ */ jsx("span", {
												className: "block text-[10px] text-[#d6a735] font-bold uppercase tracking-wider",
												children: role === "admin" ? "Admin" : `${getProfileRank({
													rating,
													wins,
													losses,
													draws
												}).badgeEmoji} ${getProfileRank({
													rating,
													wins,
													losses,
													draws
												}).title}`
											})]
										})]
									}), /* @__PURE__ */ jsxs("span", {
										className: "px-2.5 py-1 rounded-full bg-[#d6a735] text-[#06261f] font-black text-xs shrink-0 shadow-md",
										children: ["GH₵ ", typeof points === "number" ? points.toFixed(2) : points]
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "pt-2 border-t border-[#184d3c] flex items-center justify-between text-[11px]",
									children: [/* @__PURE__ */ jsxs("span", {
										className: "text-[#cbd5e1] font-medium truncate flex items-center gap-1",
										children: [
											/* @__PURE__ */ jsx(Phone, {
												size: 12,
												className: "text-[#d6a735]"
											}),
											" ",
											phoneNumber || "No phone added"
										]
									}), /* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => {
											setEditUsername(username);
											setEditPhone(phoneNumber || "");
											setEditPasscode("");
											setEditError("");
											setEditSuccess("");
											setIsMobileMenuOpen(false);
											setIsEditProfileOpen(true);
										},
										className: "text-[#d6a735] hover:underline font-bold text-[10px] uppercase",
										children: "Edit Profile"
									})]
								})]
							}) : /* @__PURE__ */ jsxs("div", {
								className: "p-3.5 bg-[#0c3b2e]/90 rounded-2xl border border-[#d6a735]/20 text-center space-y-2",
								children: [/* @__PURE__ */ jsx("p", {
									className: "text-xs text-[#cbd5e1] font-medium",
									children: "Welcome to DAMII Strategy Arena"
								}), /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => {
										setAuthError("");
										setAuthSuccess("");
										setIsAuthOpen(true);
										setIsMobileMenuOpen(false);
									},
									className: "w-full py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5",
									children: [/* @__PURE__ */ jsx(LogIn, { size: 14 }), " Sign In / Register"]
								})]
							}),
							/* @__PURE__ */ jsxs("nav", {
								className: "flex flex-col gap-2 pt-1",
								children: [
									/* @__PURE__ */ jsx("small", {
										className: "block text-[10px] font-extrabold text-[#d6a735]/80 uppercase tracking-widest px-1 mb-0.5",
										children: "Arena Navigation"
									}),
									/* @__PURE__ */ jsxs(Link, {
										href: "/arena",
										onClick: (e) => {
											handleNavClick(e, "/arena");
											setIsMobileMenuOpen(false);
										},
										className: `p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${pathname === "/arena" ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20" : "bg-[#0c3b2e]/80 text-[#f5efdf] hover:bg-[#144435] border border-[#184d3c]"}`,
										children: [/* @__PURE__ */ jsx(Swords, {
											size: 18,
											className: pathname === "/arena" ? "text-[#06261f]" : "text-[#d6a735]"
										}), /* @__PURE__ */ jsx("span", { children: "Strategy Game Arena" })]
									}),
									/* @__PURE__ */ jsxs(Link, {
										href: "/leagues",
										onClick: (e) => {
											handleNavClick(e, "/leagues");
											setIsMobileMenuOpen(false);
										},
										className: `p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${pathname === "/leagues" ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20" : "bg-[#0c3b2e]/80 text-[#f5efdf] hover:bg-[#144435] border border-[#184d3c]"}`,
										children: [/* @__PURE__ */ jsx(Trophy, {
											size: 18,
											className: pathname === "/leagues" ? "text-[#06261f]" : "text-[#d6a735]"
										}), /* @__PURE__ */ jsx("span", { children: "Tournaments & Leagues" })]
									}),
									/* @__PURE__ */ jsxs(Link, {
										href: "/wallet",
										onClick: (e) => {
											handleNavClick(e, "/wallet");
											setIsMobileMenuOpen(false);
										},
										className: `p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${pathname === "/wallet" ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20" : "bg-[#0c3b2e]/80 text-[#f5efdf] hover:bg-[#144435] border border-[#184d3c]"}`,
										children: [/* @__PURE__ */ jsx(Wallet, {
											size: 18,
											className: pathname === "/wallet" ? "text-[#06261f]" : "text-[#d6a735]"
										}), /* @__PURE__ */ jsx("span", { children: "Wallet & Marbles Ledger" })]
									}),
									isOrganizerOrApplied && /* @__PURE__ */ jsxs(Link, {
										href: "/organizer",
										onClick: (e) => {
											handleNavClick(e, "/organizer");
											setIsMobileMenuOpen(false);
										},
										className: `p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${pathname === "/organizer" ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20" : "bg-[#0c3b2e]/80 text-[#f5efdf] hover:bg-[#144435] border border-[#184d3c]"}`,
										children: [/* @__PURE__ */ jsx(UserCog, {
											size: 18,
											className: pathname === "/organizer" ? "text-[#06261f]" : "text-[#d6a735]"
										}), /* @__PURE__ */ jsx("span", { children: "Organizer Studio" })]
									}),
									role === "admin" && /* @__PURE__ */ jsxs(Link, {
										href: "/admin",
										onClick: (e) => {
											handleNavClick(e, "/admin");
											setIsMobileMenuOpen(false);
										},
										className: `p-3 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${pathname === "/admin" ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20" : "bg-[#0c3b2e]/80 text-[#f5efdf] hover:bg-[#144435] border border-[#184d3c]"}`,
										children: [/* @__PURE__ */ jsx(Shield, {
											size: 18,
											className: pathname === "/admin" ? "text-[#06261f]" : "text-[#d6a735]"
										}), /* @__PURE__ */ jsx("span", { children: "Admin Control Center" })]
									})
								]
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "pt-4 border-t border-[#0c3b2e] space-y-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "p-3 bg-[#0c3b2e]/60 rounded-xl border border-[#d6a735]/20 text-[11px] text-[#cbd5e1] flex items-center justify-between",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "flex items-center gap-1.5 font-bold text-[#f5efdf]",
								children: [/* @__PURE__ */ jsx(Sparkles, {
									size: 14,
									className: "text-[#d6a735]"
								}), " Ghanaian 10×10 Rules"]
							}), /* @__PURE__ */ jsx("span", {
								className: "text-[9px] bg-[#d6a735]/20 text-[#d6a735] px-1.5 py-0.5 rounded font-extrabold uppercase",
								children: "Official"
							})]
						}), userToken ? /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => {
								handleLogout();
								setIsMobileMenuOpen(false);
							},
							className: "w-full py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md",
							children: [/* @__PURE__ */ jsx(LogOut, { size: 15 }), " Logout Account"]
						}) : /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => {
								setAuthError("");
								setAuthSuccess("");
								setIsAuthOpen(true);
								setIsMobileMenuOpen(false);
							},
							className: "w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all",
							children: [/* @__PURE__ */ jsx(LogIn, { size: 15 }), " Sign In / Create Account"]
						})]
					})]
				})] })
			]
		}),
		pathname !== "/admin" && /* @__PURE__ */ jsx("nav", {
			"aria-label": "Mobile Navigation Bar",
			className: "fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#06261f]/95 border-t border-[#d6a735]/30 backdrop-blur-md px-3 py-2 shadow-2xl flex items-center justify-around",
			children: isFocusMode && pathname === "/arena" ? /* @__PURE__ */ jsxs("div", {
				className: "w-full flex items-center justify-between px-2 py-1 bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg animate-in fade-in duration-200",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-1.5",
					children: [/* @__PURE__ */ jsx(Eye, { size: 16 }), /* @__PURE__ */ jsx("span", {
						className: "uppercase tracking-wide text-[11px]",
						children: "Arena Focus Mode Active"
					})]
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => {
						if (typeof window !== "undefined") {
							sessionStorage.setItem("damii-focus-mode", "false");
							window.dispatchEvent(new CustomEvent("damii-focus-mode-change", { detail: false }));
						}
					},
					className: "px-2.5 py-1 bg-slate-950 text-amber-300 rounded-lg text-[10px] font-bold border border-amber-400/40 hover:bg-slate-900 transition-colors",
					children: "Exit Focus"
				})]
			}) : /* @__PURE__ */ jsxs(Fragment$1, { children: [
				/* @__PURE__ */ jsxs(Link, {
					href: "/arena",
					onClick: (e) => handleNavClick(e, "/arena"),
					className: `flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${pathname === "/arena" ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black shadow-md" : "text-[#cbd5e1] hover:text-[#f5efdf]"}`,
					children: [/* @__PURE__ */ jsx(Swords, {
						size: 18,
						className: pathname === "/arena" ? "text-[#d6a735]" : "text-[#94a3b8]"
					}), /* @__PURE__ */ jsx("span", {
						className: "text-[10px] font-extrabold tracking-tight",
						children: "Arena"
					})]
				}),
				/* @__PURE__ */ jsxs(Link, {
					href: "/leagues",
					onClick: (e) => handleNavClick(e, "/leagues"),
					className: `flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${pathname === "/leagues" ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black shadow-md" : "text-[#cbd5e1] hover:text-[#f5efdf]"}`,
					children: [/* @__PURE__ */ jsx(Trophy, {
						size: 18,
						className: pathname === "/leagues" ? "text-[#d6a735]" : "text-[#94a3b8]"
					}), /* @__PURE__ */ jsx("span", {
						className: "text-[10px] font-extrabold tracking-tight",
						children: "Leagues"
					})]
				}),
				/* @__PURE__ */ jsxs(Link, {
					href: "/wallet",
					onClick: (e) => handleNavClick(e, "/wallet"),
					className: `flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${pathname === "/wallet" ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black shadow-md" : "text-[#cbd5e1] hover:text-[#f5efdf]"}`,
					children: [/* @__PURE__ */ jsx(Wallet, {
						size: 18,
						className: pathname === "/wallet" ? "text-[#d6a735]" : "text-[#94a3b8]"
					}), /* @__PURE__ */ jsx("span", {
						className: "text-[10px] font-extrabold tracking-tight",
						children: "Wallet"
					})]
				}),
				userToken && /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => setIsNotificationsOpen((prev) => !prev),
					className: `relative flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${isNotificationsOpen ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black" : "text-[#cbd5e1] hover:text-[#f5efdf]"}`,
					children: [/* @__PURE__ */ jsxs("div", {
						className: "relative",
						children: [/* @__PURE__ */ jsx(Bell, {
							size: 18,
							className: unreadCount > 0 ? "text-[#d6a735]" : "text-[#94a3b8]"
						}), unreadCount > 0 && /* @__PURE__ */ jsx("span", {
							className: "absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 bg-[#d6a735] text-[#06261f] font-black text-[9px] rounded-full flex items-center justify-center animate-pulse shadow-sm",
							children: unreadCount
						})]
					}), /* @__PURE__ */ jsx("span", {
						className: "text-[10px] font-extrabold tracking-tight",
						children: "Updates"
					})]
				}),
				/* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => setIsMobileMenuOpen((prev) => !prev),
					className: `flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all ${isMobileMenuOpen ? "text-[#d6a735] bg-[#0c3b2e] border border-[#d6a735]/40 font-black shadow-md" : "text-[#cbd5e1] hover:text-[#f5efdf]"}`,
					children: [/* @__PURE__ */ jsx(Menu, {
						size: 18,
						className: isMobileMenuOpen ? "text-[#d6a735]" : "text-[#94a3b8]"
					}), /* @__PURE__ */ jsx("span", {
						className: "text-[10px] font-extrabold tracking-tight",
						children: "Menu"
					})]
				})
			] })
		}),
		isAuthOpen && /* @__PURE__ */ jsx("div", {
			className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4",
			children: /* @__PURE__ */ jsxs("div", {
				className: "w-full max-w-md bg-[#06261f] border border-[#d6a735]/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#f5efdf]",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between px-6 py-4 border-b border-[#0c3b2e] bg-[#0c3b2e]/60",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx(KeyRound, {
							className: "text-[#d6a735]",
							size: 20
						}), /* @__PURE__ */ jsx("h3", {
							className: "text-lg font-black font-serif text-[#f5efdf]",
							children: authMode === "login" ? "User Sign In" : "Create Player Account"
						})]
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => {
							setIsAuthOpen(false);
							window.dispatchEvent(new CustomEvent("damii-auth-closed"));
						},
						className: "text-slate-400 hover:text-slate-100 transition-colors p-1",
						children: /* @__PURE__ */ jsx(X, { size: 20 })
					})]
				}), /* @__PURE__ */ jsxs("form", {
					onSubmit: handleAuthSubmit,
					className: "p-6 space-y-4",
					children: [
						authError && /* @__PURE__ */ jsxs("div", {
							className: "p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(CircleAlert, {
								size: 16,
								className: "shrink-0 text-red-400"
							}), /* @__PURE__ */ jsx("span", { children: authError })]
						}),
						authSuccess && /* @__PURE__ */ jsxs("div", {
							className: "p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(CircleCheck, {
								size: 16,
								className: "shrink-0 text-emerald-400"
							}), /* @__PURE__ */ jsx("span", { children: authSuccess })]
						}),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
							className: "block text-xs font-bold text-[#f5efdf] mb-1.5",
							children: "Username"
						}), /* @__PURE__ */ jsx("input", {
							type: "text",
							required: true,
							value: formUsername,
							onChange: (e) => setFormUsername(e.target.value),
							placeholder: "e.g. Kwame_Master",
							className: "w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
						})] }),
						authMode === "register" && /* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsxs("label", {
								className: "block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1",
								children: [/* @__PURE__ */ jsx(Phone, {
									size: 13,
									className: "text-[#d6a735]"
								}), " Phone Number (Ghana Mobile Money)"]
							}),
							/* @__PURE__ */ jsx("input", {
								type: "tel",
								required: true,
								value: formPhone,
								onChange: (e) => setFormPhone(e.target.value),
								placeholder: "e.g. 0241234567 or +233241234567",
								className: "w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
							}),
							/* @__PURE__ */ jsx("small", {
								className: "block text-[10px] text-slate-400 mt-1",
								children: "Used for Mobile Money payouts & wager victory settlements."
							})
						] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
							className: "block text-xs font-bold text-[#f5efdf] mb-1.5",
							children: "Passcode / PIN"
						}), /* @__PURE__ */ jsx("input", {
							type: "password",
							required: true,
							value: formPasscode,
							onChange: (e) => setFormPasscode(e.target.value),
							placeholder: "Enter secret passcode",
							className: "w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
						})] }),
						authMode === "register" && /* @__PURE__ */ jsxs("div", {
							className: "p-3 bg-[#0c3b2e] border border-[#d6a735]/30 rounded-xl text-[#d6a735] text-xs",
							children: [
								"🎁 ",
								/* @__PURE__ */ jsx("strong", { children: "Welcome Bonus:" }),
								" New accounts receive ",
								/* @__PURE__ */ jsx("strong", { children: "GH₵ 500.00 free balance" }),
								" to play wager matches and join tournaments immediately!"
							]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "submit",
							disabled: isLoading,
							className: "w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2",
							children: isLoading ? "Processing..." : authMode === "login" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(LogIn, { size: 16 }), " Sign In"] }) : /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(KeyRound, { size: 16 }), " Register & Claim GH₵ 500.00"] })
						}),
						/* @__PURE__ */ jsx("div", {
							className: "pt-2 text-center text-xs text-slate-400",
							children: authMode === "login" ? /* @__PURE__ */ jsxs("span", { children: [
								"Don't have an account?",
								" ",
								/* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => {
										setAuthMode("register");
										setAuthError("");
									},
									className: "text-[#d6a735] hover:underline font-bold",
									children: "Create one here"
								})
							] }) : /* @__PURE__ */ jsxs("span", { children: [
								"Already have an account?",
								" ",
								/* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => {
										setAuthMode("login");
										setAuthError("");
									},
									className: "text-[#d6a735] hover:underline font-bold",
									children: "Sign in here"
								})
							] })
						})
					]
				})]
			})
		}),
		isEditProfileOpen && /* @__PURE__ */ jsx("div", {
			className: "fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4",
			children: /* @__PURE__ */ jsxs("div", {
				className: "w-full max-w-md bg-[#06261f] border border-[#d6a735]/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#f5efdf]",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between px-6 py-4 border-b border-[#0c3b2e] bg-[#0c3b2e]/60",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx(UserCog, {
							className: "text-[#d6a735]",
							size: 20
						}), /* @__PURE__ */ jsx("h3", {
							className: "text-lg font-black font-serif text-[#f5efdf]",
							children: "Edit Profile Details"
						})]
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => setIsEditProfileOpen(false),
						className: "text-slate-400 hover:text-slate-100 transition-colors",
						children: /* @__PURE__ */ jsx(X, { size: 20 })
					})]
				}), /* @__PURE__ */ jsxs("form", {
					onSubmit: handleEditProfileSubmit,
					className: "p-6 space-y-4",
					children: [
						editError && /* @__PURE__ */ jsxs("div", {
							className: "p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(CircleAlert, {
								size: 16,
								className: "shrink-0 text-red-400"
							}), /* @__PURE__ */ jsx("span", { children: editError })]
						}),
						editSuccess && /* @__PURE__ */ jsxs("div", {
							className: "p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(CircleCheck, {
								size: 16,
								className: "shrink-0 text-emerald-400"
							}), /* @__PURE__ */ jsx("span", { children: editSuccess })]
						}),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
							className: "block text-xs font-bold text-[#f5efdf] mb-1.5",
							children: "Username"
						}), /* @__PURE__ */ jsx("input", {
							type: "text",
							required: true,
							value: editUsername,
							onChange: (e) => setEditUsername(e.target.value),
							placeholder: "Update username",
							className: "w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsxs("label", {
								className: "block text-xs font-bold text-[#f5efdf] mb-1.5 flex items-center gap-1",
								children: [/* @__PURE__ */ jsx(Phone, {
									size: 13,
									className: "text-[#d6a735]"
								}), " Phone Number (Ghana Mobile Money)"]
							}),
							/* @__PURE__ */ jsx("input", {
								type: "tel",
								value: editPhone,
								onChange: (e) => setEditPhone(e.target.value),
								placeholder: "e.g. 0241234567 or +233241234567",
								className: "w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
							}),
							/* @__PURE__ */ jsx("small", {
								className: "block text-[10px] text-slate-400 mt-1",
								children: "Used for Ghana Mobile Money payouts & wager victory settlements."
							})
						] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("label", {
							className: "block text-xs font-bold text-[#f5efdf] mb-1.5",
							children: ["New Passcode / PIN ", /* @__PURE__ */ jsx("span", {
								className: "text-[10px] text-slate-400 font-normal",
								children: "(Leave blank to keep current)"
							})]
						}), /* @__PURE__ */ jsx("input", {
							type: "password",
							value: editPasscode,
							onChange: (e) => setEditPasscode(e.target.value),
							placeholder: "Enter new secret passcode",
							className: "w-full px-3.5 py-2.5 bg-[#0c3b2e] border border-[#184d3c] rounded-xl text-[#f5efdf] placeholder-slate-500 text-sm focus:outline-none focus:border-[#d6a735] transition-colors"
						})] }),
						/* @__PURE__ */ jsx("button", {
							type: "submit",
							disabled: isEditLoading,
							className: "w-full py-3 bg-[#d6a735] hover:bg-[#b88c24] disabled:opacity-50 text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2",
							children: isEditLoading ? "Saving Changes..." : "Save Profile Changes"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "pt-4 border-t border-[#0c3b2e] space-y-2.5",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ jsxs("span", {
										className: "text-xs font-bold text-[#d6a735] flex items-center gap-1.5",
										children: [/* @__PURE__ */ jsx(Shield, { size: 14 }), " Session Security & Tokens"]
									}), /* @__PURE__ */ jsx("span", {
										className: "text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 font-mono",
										children: "CSRF Protected"
									})]
								}),
								/* @__PURE__ */ jsx("p", {
									className: "text-[11px] text-slate-400",
									children: "Manage active sessions, rotate session keys, or revoke access on lost/other devices."
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1",
									children: [/* @__PURE__ */ jsxs("button", {
										type: "button",
										disabled: isEditLoading,
										onClick: handleRotateSession,
										className: "w-full py-2 px-3 bg-[#0c3b2e] hover:bg-[#114232] border border-[#184d3c] text-[#f5efdf] text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5",
										children: [/* @__PURE__ */ jsx(Zap, {
											size: 13,
											className: "text-[#d6a735]"
										}), " Rotate Session Token"]
									}), /* @__PURE__ */ jsxs("button", {
										type: "button",
										disabled: isEditLoading,
										onClick: () => handleRevokeSessions(true),
										className: "w-full py-2 px-3 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5",
										children: [/* @__PURE__ */ jsx(LogOut, {
											size: 13,
											className: "text-amber-400"
										}), " Revoke Other Devices"]
									})]
								}),
								/* @__PURE__ */ jsxs("button", {
									type: "button",
									disabled: isEditLoading,
									onClick: () => handleRevokeSessions(false),
									className: "w-full py-2 px-3 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5",
									children: [/* @__PURE__ */ jsx(X, {
										size: 13,
										className: "text-red-400"
									}), " Revoke All Sessions & Sign Out"]
								})
							]
						})
					]
				})]
			})
		}),
		pendingNavUrl && /* @__PURE__ */ jsx("div", {
			className: "fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200",
			children: /* @__PURE__ */ jsxs("div", {
				className: "bg-[#06261f] border-2 border-[#d6a735] rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl text-[#f5efdf] space-y-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-3 pb-3 border-b border-[#0c3b2e]",
						children: [/* @__PURE__ */ jsx("span", {
							className: "p-2.5 bg-amber-500/20 text-[#d6a735] rounded-xl border border-[#d6a735]/40 shrink-0",
							children: /* @__PURE__ */ jsx(Swords, { size: 22 })
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
							className: "text-sm sm:text-base font-black text-[#d6a735] font-serif",
							children: "Active Match in Progress!"
						}), /* @__PURE__ */ jsx("p", {
							className: "text-[11px] sm:text-xs text-[#cbd5e1] font-medium",
							children: "1-on-1 strategy match currently live."
						})] })]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-xs text-[#cbd5e1] leading-relaxed",
						children: "Navigating to another page now will exit your active match in the Arena. Are you sure you want to leave?"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-col sm:flex-row items-center gap-2 pt-1",
						children: [/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => setPendingNavUrl(null),
							className: "w-full sm:flex-1 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-1.5",
							children: [/* @__PURE__ */ jsx(Swords, { size: 14 }), " Stay & Resume Match"]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => {
								const target = pendingNavUrl;
								setPendingNavUrl(null);
								setIsMatchActive(false);
								if (typeof window !== "undefined") {
									sessionStorage.setItem("damii-active-match", "false");
									sessionStorage.setItem("damii-focus-mode", "false");
								}
								router.push(target);
							},
							className: "w-full sm:w-auto px-4 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1",
							children: "Leave Match"
						})]
					})
				]
			})
		})
	] });
}
//#endregion
//#region components/SharedHeader.tsx
function SharedHeader() {
	return /* @__PURE__ */ jsx(Header, {});
}
//#endregion
export { createLucideIcon as C, urlQueryToSearchParams as D, appendSearchParamsToUrl as E, addLocalePrefix as O, Trophy as S, addQueryParam as T, LogOut as _, Eye as a, Swords as b, Phone as c, Zap as d, Shield as f, CircleCheck as g, CircleAlert as h, saveSessionToken as i, getDomainLocaleUrl as k, Check as l, X as m, clearSessionToken as n, UserCog as o, Menu as p, getSessionToken as r, ChevronDown as s, SharedHeader as t, Sparkles as u, LogIn as v, Link as w, Wallet as x, User as y };
