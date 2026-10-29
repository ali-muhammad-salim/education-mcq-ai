"use client";
import katex from "katex";
import { Fragment } from "react";

/** Render only explicit math delimiters. Never rewrite source numbers, symbols or punctuation. */
export default function ScientificText({ text }: { text: string }) {
  const pieces = text.split(
    /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g,
  );
  return (
    <>
      {pieces.map((piece, index) => {
        const display = piece.startsWith("$$") || piece.startsWith("\\["),
          inline = piece.startsWith("$") || piece.startsWith("\\(");
        if (!inline && !display)
          return <Fragment key={index}>{piece}</Fragment>;
        const size = piece.startsWith("$") ? (display ? 2 : 1) : 2;
        try {
          return (
            <span
              key={index}
              style={{
                display: "inline-block",
                maxWidth: "100%",
                overflowX: "auto",
                verticalAlign: "middle",
              }}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(piece.slice(size, -size), {
                  displayMode: display,
                  throwOnError: true,
                  trust: false,
                  strict: "warn",
                  maxExpand: 1000,
                  maxSize: 50,
                }),
              }}
            />
          );
        } catch {
          return <span key={index}>{piece}</span>;
        }
      })}
    </>
  );
}
