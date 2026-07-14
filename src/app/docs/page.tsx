"use client";

import { useEffect, useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";
import "./docs-a11y-overrides.css";

export default function DocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    import("swagger-ui-dist/swagger-ui-bundle.js").then((mod) => {
      if (!active || !containerRef.current) {
        return;
      }
      // biome-ignore lint/suspicious/noExplicitAny: third-party UMD bundle has no usable type declarations
      const candidate = mod as any;
      const bundle =
        candidate.default?.default ?? candidate.default ?? candidate;
      bundle({
        url: "/api/docs",
        domNode: containerRef.current,
        presets: [bundle.presets.apis],
      });
    });

    return () => {
      active = false;
    };
  }, []);

  return <div ref={containerRef} />;
}
