"use client";
import { useEffect, useRef, useState } from "react";
import type {
  PDFDocumentProxy,
  PDFDocumentLoadingTask,
  RenderTask,
} from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import styles from "./MaterialLayout.module.css";

type PageSize = { width: number; height: number };

export default function ContinuousDocument({
  url,
  title,
  firstPage = 1,
  lastPage,
  firstPageInset = 0,
  lastPageInset = 0,
}: {
  url: string;
  title: string;
  firstPage?: number;
  lastPage?: number;
  firstPageInset?: number;
  lastPageInset?: number;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [page, setPage] = useState(firstPage);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set());
  const host = useRef<HTMLDivElement>(null);
  const pageHosts = useRef(new Map<number, HTMLDivElement>());
  const canvases = useRef(new Map<number, HTMLCanvasElement>());
  const tasks = useRef(new Map<number, RenderTask>());
  const tokens = useRef(new Map<number, number>());

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
    let loadingTask: PDFDocumentLoadingTask | undefined;
    setPdf(null);
    setPageSizes([]);
    setLoadedPages(new Set());
    setFailedPages(new Set());
    setPage(firstPage);
    setLoading(true);
    setError("");
    void import("pdfjs-dist")
      .then(async (runtime) => {
        if (disposed) return;
        const assets = "/pdfjs/" + runtime.version + "/";
        runtime.GlobalWorkerOptions.workerSrc = assets + "pdf.worker.min.mjs";
        loadingTask = runtime.getDocument({
          url,
          cMapUrl: assets + "cmaps/",
          cMapPacked: true,
          standardFontDataUrl: assets + "standard_fonts/",
          wasmUrl: assets + "wasm/",
          iccUrl: assets + "iccs/",
          disableStream: true,
          disableAutoFetch: true,
        });
        const document = await loadingTask.promise;
        if (disposed) return;
        setPdf(document);
        setLoading(false);
      })
      .catch(() => {
        if (!disposed) {
          setError("Unable to display this PDF here. Use Open PDF.");
          setLoading(false);
        }
      });
    return () => {
      disposed = true;
      void loadingTask?.destroy().catch(() => {});
    };
  }, [url, firstPage]);

  const endPage = Math.min(lastPage ?? Infinity, pdf?.numPages ?? firstPage);

  useEffect(() => {
    if (!pdf) return;
    let disposed = false;
    void (async () => {
      try {
        const sizes: PageSize[] = [];
        for (let n = firstPage; n <= endPage; n++) {
          const viewport = (await pdf.getPage(n)).getViewport({ scale: 1 });
          sizes.push({ width: viewport.width, height: viewport.height });
        }
        if (!disposed) setPageSizes(sizes);
      } catch {
        if (!disposed) setError("Unable to read this PDF. Use Open PDF.");
      }
    })();
    return () => {
      disposed = true;
    };
  }, [pdf, firstPage, endPage]);

  useEffect(() => {
    if (!pdf || width < 1 || pageSizes.length === 0) return;
    let disposed = false;

    for (let n = firstPage; n <= endPage; n++) {
      tokens.current.set(n, (tokens.current.get(n) || 0) + 1);
      const task = tasks.current.get(n);
      if (task) {
        try {
          task.cancel();
        } catch {}
      }
    }
    tasks.current.clear();
    for (const canvas of canvases.current.values()) {
      canvas.width = 0;
      canvas.height = 0;
    }
    setLoadedPages(new Set());
    setFailedPages(new Set());

    const clearPage = (n: number) => {
      tokens.current.set(n, (tokens.current.get(n) || 0) + 1);
      const task = tasks.current.get(n);
      if (task) {
        try {
          task.cancel();
        } catch {}
        tasks.current.delete(n);
      }
      const canvas = canvases.current.get(n);
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      setLoadedPages((prev) => {
        if (!prev.has(n)) return prev;
        const next = new Set(prev);
        next.delete(n);
        return next;
      });
    };

    const renderPage = async (n: number) => {
      const canvas = canvases.current.get(n);
      const size = pageSizes[n - firstPage];
      if (!canvas || !size || disposed) return;
      const token = (tokens.current.get(n) || 0) + 1;
      tokens.current.set(n, token);
      const previous = tasks.current.get(n);
      if (previous) {
        try {
          previous.cancel();
        } catch {}
      }
      setFailedPages((prev) => {
        if (!prev.has(n)) return prev;
        const next = new Set(prev);
        next.delete(n);
        return next;
      });
      try {
        const source = await pdf.getPage(n);
        if (disposed || tokens.current.get(n) !== token) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const cssWidth = Math.min(width, 960) * zoom;
        const viewport = source.getViewport({
          scale: (cssWidth / size.width) * ratio,
        });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = Math.ceil(cssWidth) + "px";
        canvas.style.height =
          Math.ceil((cssWidth * size.height) / size.width) + "px";
        const task = source.render({ canvas, viewport });
        tasks.current.set(n, task);
        await task.promise;
        if (disposed || tokens.current.get(n) !== token) return;
        tasks.current.delete(n);
        setLoadedPages((prev) => {
          const next = new Set(prev);
          next.add(n);
          return next;
        });
      } catch {
        if (!disposed && tokens.current.get(n) === token) {
          setFailedPages((prev) => new Set(prev).add(n));
        }
      }
    };

    const renderObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const n = Number((entry.target as HTMLElement).dataset.page);
          if (!n) continue;
          if (entry.isIntersecting) void renderPage(n);
          else clearPage(n);
        }
      },
      { rootMargin: "900px 0px" },
    );
    for (const pageHost of pageHosts.current.values()) {
      renderObserver.observe(pageHost);
    }

    return () => {
      disposed = true;
      renderObserver.disconnect();
      for (const task of tasks.current.values()) {
        try {
          task.cancel();
        } catch {}
      }
      tasks.current.clear();
    };
  }, [pdf, width, zoom, pageSizes, firstPage, endPage]);

  useEffect(() => {
    if (!pdf || pageSizes.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const marker = 160;
      let current = firstPage;
      for (const [n, element] of pageHosts.current) {
        if (element.getBoundingClientRect().top <= marker) {
          current = Math.max(current, n);
        }
      }
      setPage(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pdf, pageSizes, firstPage]);

  const scrollToPage = (value: number) => {
    const target = Math.max(firstPage, Math.min(value, endPage));
    setPage(target);
    pageHosts.current
      .get(target)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cssWidth = Math.min(width, 960) * zoom;

  return (
    <div ref={host} style={{ minWidth: 0 }}>
      {pdf && (
        <div className={styles.actions} aria-label="PDF pages">
          <button
            className={styles.button}
            aria-label="Previous page"
            disabled={page <= firstPage}
            onClick={() => scrollToPage(page - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <label className={styles.pdfPage}>
            <span className={styles.srOnly}>PDF page</span>
            <select
              aria-label="PDF page"
              value={page}
              onChange={(event) => scrollToPage(Number(event.target.value))}
            >
              {pageSizes.map((_, index) => (
                <option key={index + firstPage} value={index + firstPage}>
                  {index + firstPage}
                </option>
              ))}
            </select>
            <span>/ {endPage}</span>
          </label>
          <button
            className={styles.button}
            aria-label="Next page"
            disabled={page >= endPage}
            onClick={() => scrollToPage(page + 1)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            className={styles.button}
            aria-label="Zoom out"
            disabled={zoom <= 0.75}
            onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
          >
            <Minus size={18} />
          </button>
          <button
            className={styles.button}
            aria-label="Zoom in"
            disabled={zoom >= 3}
            onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
          >
            <Plus size={18} />
          </button>
          <span className={styles.muted} style={{ alignSelf: "center", fontSize: "0.78rem" }}>
            Continuous scroll
          </span>
        </div>
      )}
      {loading && (
        <p className={styles.muted} role="status">
          Loading original…
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {pdf && pageSizes.length > 0 && (
        <div
          aria-label={title + " — continuous pages"}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "14px",
            maxWidth: "100%",
            overflowX: "auto",
            padding: "10px",
            background: "#e9edf1",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
          }}
        >
          {pageSizes.map((size, index) => {
            const n = index + firstPage;
            const height = (cssWidth * size.height) / size.width;
            const top = n === firstPage ? firstPageInset : 0;
            const bottom = n === endPage ? lastPageInset : 0;
            return (
              <div
                key={n}
                data-page={n}
                ref={(element) => {
                  if (element) pageHosts.current.set(n, element);
                  else pageHosts.current.delete(n);
                }}
                style={{
                  position: "relative",
                  flex: "none",
                  width: cssWidth,
                  height: height * (1 - top - bottom),
                  overflow: "hidden",
                  marginInline: "auto",
                  background: "#ffffff",
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.16)",
                  scrollMarginTop: "96px",
                }}
              >
                <canvas
                  ref={(element) => {
                    if (element) canvases.current.set(n, element);
                    else canvases.current.delete(n);
                  }}
                  role="img"
                  aria-label={title + " — page " + n}
                  style={{ display: "block", width: cssWidth, height, transform: `translateY(-${top * 100}%)` }}
                />
                {!loadedPages.has(n) && (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: failedPages.has(n) ? "#b91c1c" : "#64748b",
                      background: failedPages.has(n) ? "#fef2f2" : "#f8fafc",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                    }}
                  >
                    {failedPages.has(n)
                      ? `Page ${n} could not be rendered`
                      : `Page ${n}…`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
