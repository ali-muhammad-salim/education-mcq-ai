"use client";
import { useEffect, useState, type ReactNode } from "react";
import { FileText, Sparkles } from "lucide-react";
import styles from "./MaterialLayout.module.css";
import OriginalDocument from "./OriginalDocument";
import { safeDocumentUrl } from "@/lib/paperPresentation";

export default function DocumentViews({
  original,
  title,
  children,
  initialView,
}: {
  original?: string | null;
  title: string;
  children?: ReactNode;
  initialView?: "digital" | "original";
}) {
  original = safeDocumentUrl(original);
  const [view, setView] = useState(
    initialView || (children ? "digital" : "original"),
  );
  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);

  return (
    <div>
      <div
        role="group"
        aria-label="Document view"
        style={{
          background: "#151f32",
          border: "1px solid #26334d",
          borderRadius: "14px",
          padding: "6px",
          display: "grid",
          gridTemplateColumns: children && original ? "1fr 1fr" : "1fr",
          gap: "6px",
          marginBottom: "1.5rem",
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.18)",
        }}
      >
        {children && (
          <button
            type="button"
            aria-pressed={view === "digital"}
            onClick={() => setView("digital")}
            style={{
              padding: "11px 20px",
              borderRadius: "10px",
              fontSize: "0.95rem",
              minHeight: "46px",
              fontWeight: 800,
              background: view === "digital" ? "#066e4f" : "transparent",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.15s ease",
            }}
          >
            <Sparkles size={18} />
            <span>Digital Paper</span>
          </button>
        )}
        {original && (
          <button
            type="button"
            aria-pressed={view === "original"}
            onClick={() => setView("original")}
            style={{
              padding: "11px 20px",
              borderRadius: "10px",
              fontSize: "0.95rem",
              minHeight: "46px",
              fontWeight: 800,
              background: view === "original" ? "#066e4f" : "transparent",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.15s ease",
            }}
          >
            <FileText size={18} />
            <span>Original PDF</span>
          </button>
        )}
      </div>

      {view === "digital" ? (
        children
      ) : original ? (
        <OriginalDocument url={original} title={title} />
      ) : (
        <p className={styles.muted}>Original document unavailable.</p>
      )}
    </div>
  );
}
