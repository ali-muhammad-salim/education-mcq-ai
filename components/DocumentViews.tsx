"use client";
import { useEffect, useState, type ReactNode } from "react";
import { FileText, AlignLeft, ExternalLink } from "lucide-react";
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
      <div className={styles.actions} aria-label="Document view">
        {children && (
          <button
            className={styles.button}
            aria-pressed={view === "digital"}
            onClick={() => setView("digital")}
          >
            <AlignLeft size={16} />
            Digital text
          </button>
        )}
        {original && (
          <button
            className={styles.button}
            aria-pressed={view === "original"}
            onClick={() => setView("original")}
          >
            <FileText size={16} />
            Original PDF
          </button>
        )}
        {original && (
          <a
            className={styles.button}
            href={original}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} />
            Open PDF
          </a>
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
