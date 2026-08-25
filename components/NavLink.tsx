"use client";

import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent, AnchorHTMLAttributes } from "react";

/**
 * Safe navigation utility that attempts Next.js router.push and automatically
 * falls back to full window location assignment if the RSC client fetch fails
 * (e.g. vinext RSC network hiccup in iframe preview).
 */
export function safeNavigate(router: ReturnType<typeof useRouter> | null, href: string) {
  if (typeof window === "undefined" || !href) return;

  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    window.location.assign(href);
    return;
  }

  try {
    if (router && typeof router.push === "function") {
      const result = router.push(href) as unknown;
      if (result && typeof (result as Promise<unknown>)?.catch === "function") {
        (result as Promise<unknown>).catch(() => {
          if (typeof window !== "undefined") {
            window.location.assign(href);
          }
        });
      }
    } else {
      window.location.assign(href);
    }
  } catch {
    if (typeof window !== "undefined") {
      window.location.assign(href);
    }
  }
}

export interface NavLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  children: ReactNode;
  title?: string;
  id?: string;
}

// vinext's current next/link shim has a broken internal click/navigate
// handler ("e is not a function"), which swallows clicks and breaks
// navigation. This renders a plain <a> and drives navigation through
// useRouter().push instead with automatic window.location fallback.
export function NavLink({
  href,
  onClick,
  className,
  children,
  title,
  id,
  target,
  rel,
  ...rest
}: NavLinkProps) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (target === "_blank" || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    safeNavigate(router, href);
  };

  return (
    <a
      href={href}
      id={id}
      onClick={handleClick}
      className={className}
      title={title}
      target={target}
      rel={rel}
      {...rest}
    >
      {children}
    </a>
  );
}

export const Link = NavLink;
export default NavLink;
