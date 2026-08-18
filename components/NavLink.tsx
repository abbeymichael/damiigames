"use client";

import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";

// vinext's current next/link shim has a broken internal click/navigate
// handler ("e is not a function"), which swallows clicks and breaks
// navigation. This renders a plain <a> and drives navigation through
// useRouter().push instead, which is unaffected. Modifier-key clicks
// (cmd/ctrl/shift/middle-click) are left alone so "open in new tab" works.
export function NavLink({
  href,
  onClick,
  className,
  children,
  title,
}: {
  href: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    try {
      const result = router.push(href) as unknown;
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        (result as Promise<unknown>).catch(() => {
          if (typeof window !== "undefined") {
            window.location.assign(href);
          }
        });
      }
    } catch {
      if (typeof window !== "undefined") {
        window.location.assign(href);
      }
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className} title={title}>
      {children}
    </a>
  );
}

export default NavLink;
