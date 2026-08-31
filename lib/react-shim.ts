/**
 * React 19 Dispatcher Safety Shim
 * Guards against "dispatcher.getOwner is not a function" when Vite/JSX runtime
 * evaluates React components alongside React DOM Server / Edge renderers.
 */
import React from "react";

export function installReactSafetyShim() {
  try {
    const clientInternals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    if (clientInternals) {
      for (const key of ["A", "H"] as const) {
        let current = clientInternals[key];
        if (current && typeof current === "object" && typeof current.getOwner !== "function") {
          current.getOwner = () => null;
        }

        try {
          Object.defineProperty(clientInternals, key, {
            get() {
              return current;
            },
            set(val) {
              if (val && typeof val === "object" && typeof val.getOwner !== "function") {
                try {
                  val.getOwner = () => null;
                } catch {
                  // Ignore if non-extensible
                }
              }
              current = val;
            },
            configurable: true,
            enumerable: true,
          });
        } catch {
          // Ignore if cannot redefine
        }
      }
    }

    const serverInternals = (React as any).__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    if (serverInternals) {
      for (const key of ["H", "A"] as const) {
        let current = serverInternals[key];
        if (current && typeof current === "object" && typeof current.getOwner !== "function") {
          current.getOwner = () => null;
        }

        try {
          Object.defineProperty(serverInternals, key, {
            get() {
              return current;
            },
            set(val) {
              if (val && typeof val === "object" && typeof val.getOwner !== "function") {
                try {
                  val.getOwner = () => null;
                } catch {
                  // Ignore if non-extensible
                }
              }
              current = val;
            },
            configurable: true,
            enumerable: true,
          });
        } catch {
          // Ignore if cannot redefine
        }
      }
    }
  } catch {
    // Ignore any environment security blocks
  }
}

installReactSafetyShim();
