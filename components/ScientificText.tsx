"use client";
import katex from "katex";
import { Fragment } from "react";
import MathText from "./MathText";
import { formatEducationalMath, formatExplicitMath } from "@/lib/syllabusMath";
import { educationalLines } from "@/lib/inlineEducationalLists";

/** Shared mathematical display; source numbers, symbols and stored text stay intact. */
export default function ScientificText({ text }: { text: string }) {
  if (text.includes("`")) return <MathText text={text} />;
  const lines = educationalLines(text);
  if (lines.filter(line => line.marker).length > 1 || lines.some(line => line.kind === "bullet")) return <MathText text={text} />;
  const pieces = formatEducationalMath(text).split(
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
                __html: katex.renderToString(formatExplicitMath(piece.slice(size, -size)), {
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
