"use client";
import { useEffect, useRef, useState } from "react";
import type {
  PDFDocumentProxy,
  PDFDocumentLoadingTask,
  RenderTask,
} from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import styles from "./MaterialLayout.module.css";

export default function OriginalDocument({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(1),
    [width, setWidth] = useState(0),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.floor(entries[0].contentRect.width)),
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let disposed = false;
    let loading: PDFDocumentLoadingTask | undefined;
    setPdf(null);
    setPage(1);
    setBusy(true);
    setError("");
    void import("pdfjs-dist")
      .then(async (runtime) => {
        if (disposed) return;
        const assets = "/pdfjs/" + runtime.version + "/";
        runtime.GlobalWorkerOptions.workerSrc = assets + "pdf.worker.min.mjs";
        loading = runtime.getDocument({
          url,
          cMapUrl: assets + "cmaps/",
          cMapPacked: true,
          standardFontDataUrl: assets + "standard_fonts/",
          wasmUrl: assets + "wasm/",
          iccUrl: assets + "iccs/",
          disableStream: true,
          disableAutoFetch: true,
        });
        const document = await loading.promise;
        if (disposed) return;
        setPdf(document);
      })
      .catch(() => {
        if (!disposed) {
          setError("Unable to display this PDF here. Use Open PDF.");
          setBusy(false);
        }
      });
    return () => {
      disposed = true;
      void loading?.destroy().catch(() => {});
    };
  }, [url]);
  useEffect(() => {
    if (!pdf || !canvas.current || width < 1) return;
    let disposed = false;
    let task: RenderTask | undefined;
    setBusy(true);
    setError("");
    void pdf
      .getPage(page)
      .then(async (source) => {
        if (disposed || !canvas.current) return;
        const base = source.getViewport({ scale: 1 }),
          ratio = Math.min(window.devicePixelRatio || 1, 2);
        const scale = (Math.min(width, 960) / base.width) * zoom;
        const viewport = source.getViewport({ scale: scale * ratio });
        const target = canvas.current;
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        target.style.width = Math.ceil(viewport.width / ratio) + "px";
        target.style.height = Math.ceil(viewport.height / ratio) + "px";
        task = source.render({ canvas: target, viewport });
        await task.promise;
        if (!disposed) setBusy(false);
      })
      .catch(() => {
        if (!disposed) {
          setError("This page could not be rendered. Use Open PDF.");
          setBusy(false);
        }
      });
    return () => {
      disposed = true;
      task?.cancel();
    };
  }, [pdf, page, width, zoom]);
  return (
    <div ref={host} style={{ minWidth: 0 }}>
      {pdf && (
        <div className={styles.actions} aria-label="PDF pages">
          <button
            className={styles.button}
            aria-label="Previous page"
            disabled={page === 1 || busy}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <label className={styles.pdfPage}>
            <span className={styles.srOnly}>PDF page</span>
            <select
              aria-label="PDF page"
              value={page}
              disabled={busy}
              onChange={(event) => setPage(Number(event.target.value))}
            >
              {Array.from({ length: pdf.numPages }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
            <span>/ {pdf.numPages}</span>
          </label>
          <button
            className={styles.button}
            aria-label="Next page"
            disabled={page === pdf.numPages || busy}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            className={styles.button}
            aria-label="Zoom out"
            disabled={zoom <= 0.75 || busy}
            onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
          >
            <Minus size={18} />
          </button>
          <button
            className={styles.button}
            aria-label="Zoom in"
            disabled={zoom >= 3 || busy}
            onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
          >
            <Plus size={18} />
          </button>
        </div>
      )}
      {busy && (
        <p className={styles.muted} role="status">
          Loading original…
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <div
        style={{
          overflow: "auto",
          maxWidth: "100%",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          background: "#fff",
        }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={title + " — original page " + page}
          style={{ display: "block", margin: "auto", maxWidth: "none" }}
        />
      </div>
    </div>
  );
}
