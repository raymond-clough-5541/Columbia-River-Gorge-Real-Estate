"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Command, Moon, Search, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NavigateFn } from "./gorge-app";

/* ------------------------------------------------------------------ */
/* Keyboard shortcuts — power-user navigation for the analytics SPA.   */
/*                                                                     */
/*  g then o/m/p/l  →  jump to Overview / Matrix / Projections /       */
/*                     Listings (classic "goto" sequences)             */
/*  /               →  jump to Listings and focus the search field     */
/*  t               →  toggle dark / light theme                       */
/*  ?               →  open this shortcut reference                    */
/*  Esc             →  close dialogs (handled natively by Radix)       */
/* ------------------------------------------------------------------ */

const SEQUENCE_TARGETS: Record<
  string,
  { label: string; icon: typeof Command; route: Parameters<NavigateFn>[0] }
> = {
  o: { label: "Overview", icon: Command, route: { view: "overview" } },
  m: { label: "Master Matrix", icon: Command, route: { view: "matrix" } },
  p: { label: "Projections", icon: Command, route: { view: "projections" } },
  l: { label: "Listings", icon: Command, route: { view: "listings" } },
};

/** Small keyboard-key styled chip. */
function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={
        "inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 px-1.5 font-mono text-[11.5px] font-semibold shadow-[0_1px_0_var(--border)] " +
        (className ?? "bg-muted text-muted-foreground")
      }
    >
      {children}
    </kbd>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function KeyboardShortcuts({
  navigate,
  helpOpen,
  onHelpOpenChange,
}: {
  navigate: NavigateFn;
  helpOpen: boolean;
  onHelpOpenChange: (open: boolean) => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const armPending = () => {
      setPending(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPending(false), 1400);
    };
    const disarm = () => {
      setPending(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      // e.key is undefined on some synthetic/IME/dead-key events — normalize
      // once so no downstream toLowerCase() can throw.
      const key = e.key ?? "";

      // "?" opens the reference sheet.
      if (key === "?") {
        e.preventDefault();
        onHelpOpenChange(true);
        disarm();
        return;
      }

      // "/" jumps to the listings search field.
      if (key === "/") {
        e.preventDefault();
        disarm();
        navigate({ view: "listings" });
        window.setTimeout(() => {
          document
            .querySelector<HTMLInputElement>('input[aria-label="Search listings"]')
            ?.focus();
        }, 120);
        return;
      }

      if (pending) {
        const target = SEQUENCE_TARGETS[key.toLowerCase()];
        if (target) {
          e.preventDefault();
          navigate(target.route);
        }
        disarm();
        return;
      }

      if (key.toLowerCase() === "g") {
        e.preventDefault();
        armPending();
        return;
      }

      // "t" toggles the theme.
      if (key.toLowerCase() === "t") {
        e.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigate, pending, resolvedTheme, setTheme, onHelpOpenChange]);

  return (
    <>
      {/* "g …" sequence hint chip */}
      <AnimatePresence>
        {pending ? (
          <motion.div
            initial={{ opacity: 0, y: 12, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 12, x: "-50%" }}
            transition={{ duration: 0.16 }}
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2 rounded-full border bg-popover/95 px-4 py-2 text-[12.5px] font-medium text-popover-foreground shadow-lg backdrop-blur-sm"
            role="status"
            aria-label="Goto sequence armed — press o, m, p, or l"
          >
            <Kbd className="bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950">
              g
            </Kbd>
            <span className="text-muted-foreground">then</span>
            {Object.entries(SEQUENCE_TARGETS).map(([key, t]) => (
              <span key={key} className="inline-flex items-center gap-1">
                <Kbd>{key}</Kbd>
                <span className="hidden text-[11.5px] text-muted-foreground sm:inline">
                  {t.label.split(" ").pop()?.slice(0, 10)}
                </span>
              </span>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Shortcut reference sheet */}
      <Dialog open={helpOpen} onOpenChange={onHelpOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2">
              <Command className="h-4 w-4 text-muted-foreground" aria-hidden />
              Keyboard shortcuts
            </DialogTitle>
            <DialogDescription>
              Move through the corridor workspaces without leaving the
              keyboard. Sequences are case-insensitive.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            {[
              {
                keys: ["g", "o"],
                label: "Goto · Executive Overview",
                hint: "Corridor KPIs, statutory framework, tax arbitrage",
              },
              {
                keys: ["g", "m"],
                label: "Goto · Master Matrix",
                hint: "11-jurisdiction sortable ledger",
              },
              {
                keys: ["g", "p"],
                label: "Goto · Projections",
                hint: "Compound curves, scenarios, A/B verdicts",
              },
              {
                keys: ["g", "l"],
                label: "Goto · Listings Showcase",
                hint: "Search, filter, star a personal watchlist",
              },
            ].map((row) => (
              <div
                key={row.keys.join("")}
                className="flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
              >
                <div>
                  <p className="text-[13.5px] font-medium">{row.label}</p>
                  <p className="text-[11.5px] text-muted-foreground">{row.hint}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1">
                  {row.keys.map((k, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 ? (
                        <span className="text-[10px] text-muted-foreground">+</span>
                      ) : null}
                      <Kbd>{k}</Kbd>
                    </span>
                  ))}
                </span>
              </div>
            ))}

            <div className="my-2 border-t" />

            {[
              {
                icon: Search,
                keys: ["/"],
                label: "Focus listing search",
              },
              {
                icon: Search,
                keys: ["⌘K"],
                label: "Command palette — jump to any market or workspace",
              },
              {
                icon: resolvedTheme === "dark" ? Sun : Moon,
                keys: ["t"],
                label: "Toggle dark / light theme",
              },
              {
                icon: Command,
                keys: ["?"],
                label: "Open this shortcut reference",
              },
              {
                icon: Command,
                keys: ["Esc"],
                label: "Close dialogs & drawers",
              },
            ].map((row) => (
              <div
                key={row.keys.join("")}
                className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
              >
                <p className="flex items-center gap-2 text-[13.5px] font-medium">
                  <row.icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  {row.label}
                </p>
                <Kbd>{row.keys[0]}</Kbd>
              </div>
            ))}
          </div>

          <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
            Shortcuts are suppressed while typing in any input, slider, or
            select — so the search field, scenario names, and filter controls
            keep every key.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
