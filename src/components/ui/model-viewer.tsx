"use client";

import { createElement, useEffect, useState } from "react";

const MODEL_VIEWER_SCRIPT =
  "https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js";

type ScriptState = "loading" | "ready" | "failed";

export function ModelViewer({ src, className }: { src: string; className?: string }) {
  const [state, setState] = useState<ScriptState>("loading");

  useEffect(() => {
    const registry = window.customElements;
    if (!registry) return;

    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setState("ready");
    };
    const markFailed = () => {
      if (!cancelled) setState("failed");
    };

    registry.whenDefined("model-viewer").then(markReady).catch(markFailed);

    if (registry.get("model-viewer")) {
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-model-viewer]");
    if (existing) {
      existing.addEventListener("error", markFailed);
      return () => {
        cancelled = true;
        existing.removeEventListener("error", markFailed);
      };
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = MODEL_VIEWER_SCRIPT;
    script.dataset.modelViewer = "true";
    script.addEventListener("error", markFailed);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("error", markFailed);
    };
  }, []);

  if (state === "failed") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-xs text-zinc-500">
          The interactive 3D viewer could not be loaded in this browser.
        </p>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
        >
          Open generated model
        </a>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={className}>
      {createElement("model-viewer", {
        src,
        alt: "Generated 3D model",
        "camera-controls": "",
        "auto-rotate": "",
        "shadow-intensity": "1",
        exposure: "1",
        "touch-action": "pan-y",
        style: { width: "100%", height: "100%" },
      })}
    </div>
  );
}
