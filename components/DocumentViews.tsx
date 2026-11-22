"use client";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./MaterialLayout.module.css";
import PaperPdfPanel from "./PaperPdfPanel";
import { safeDocumentUrl } from "@/lib/paperPresentation";
import ResourceDocumentNav from "./ResourceDocumentNav";
import PaperViewSwitch from "./PaperViewSwitch";

export default function DocumentViews({
  original,
  title,
  children,
  initialView,
  continuousPdf = false,
  digitalLabel = "Digital Paper",
  resourceLinks,
}: {
  original?: string | null;
  title: string;
  children?: ReactNode;
  initialView?: "digital" | "original";
  continuousPdf?: boolean;
  digitalLabel?: string;
  resourceLinks?: ReactNode;
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
      {resourceLinks !== undefined ? (
        <ResourceDocumentNav
          links={resourceLinks}
          digitalLabel={children ? digitalLabel : undefined}
          showOriginal={view === "original"}
          pdfAvailable={Boolean(original)}
          onShowDigital={() => setView("digital")}
          onShowOriginal={() => setView("original")}
        />
      ) : <PaperViewSwitch
        digitalLabel={children ? digitalLabel : undefined}
        showOriginal={view === "original"}
        pdfAvailable={Boolean(original)}
        onShowDigital={() => setView("digital")}
        onShowOriginal={() => setView("original")}
      />}

      {view === "digital" ? (
        children
      ) : original ? (
        <PaperPdfPanel url={original} title={title} continuous={continuousPdf} />
      ) : (
        <p className={styles.muted}>Original document unavailable.</p>
      )}
    </div>
  );
}
