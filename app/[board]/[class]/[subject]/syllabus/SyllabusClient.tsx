"use client";
import { useEffect, useState } from "react";
import ScientificText from "@/components/ScientificText";
import styles from "@/components/MaterialLayout.module.css";
type Unit = {
  unitNumber: number;
  name: string;
  subtopics: { name: string; slos: { code: string; description: string }[] }[];
};
export default function SyllabusClient({
  units,
}: {
  units: Unit[];
  [key: string]: unknown;
}) {
  const [search, setSearch] = useState(""),
    [opened, setOpened] = useState<Record<number, boolean>>({});
  useEffect(() => {
    const reveal = () => {
      const code = decodeURIComponent(location.hash.replace(/^#slo-/, ""));
      const unit = units.find((u) =>
        u.subtopics.some((s) => s.slos.some((o) => o.code === code)),
      );
      if (unit) {
        setOpened((old) => ({ ...old, [unit.unitNumber]: true }));
        setTimeout(
          () =>
            document
              .getElementById("slo-" + code)
              ?.scrollIntoView({ block: "center" }),
          0,
        );
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [units]);
  const query = search.trim().toLowerCase();
  return (
    <div className={styles.digital}>
      <div className={styles.actions}>
        <input
          type="search"
          aria-label="Find learning outcome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find topic or SLO"
        />
      </div>
      {units.map((unit) => {
        const subtopics = unit.subtopics
          .map((s) => ({
            ...s,
            slos: s.slos.filter(
              (o) =>
                !query ||
                [unit.name, s.name, o.code, o.description].some((value) =>
                  value.toLowerCase().includes(query),
                ),
            ),
          }))
          .filter((s) => s.slos.length);
        if (!subtopics.length) return null;
        return (
          <details
            key={unit.unitNumber}
            open={Boolean(opened[unit.unitNumber] || query)}
            style={{
              borderBottom: "1px solid var(--border-color)",
              padding: ".6rem 0",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
              }}
              onClick={(e) => {
                e.preventDefault();
                setOpened((old) => ({
                  ...old,
                  [unit.unitNumber]: !old[unit.unitNumber],
                }));
              }}
            >
              {unit.unitNumber}. {unit.name}
            </summary>
            {subtopics.map((subtopic, i) => (
              <section key={i}>
                <h2>{subtopic.name}</h2>
                {subtopic.slos.map((outcome) => (
                  <div
                    key={outcome.code}
                    id={"slo-" + outcome.code}
                    style={{
                      scrollMarginTop: "120px",
                      padding: ".65rem 0",
                      display: "flex",
                      gap: ".7rem",
                      alignItems: "baseline",
                    }}
                  >
                    <strong
                      style={{ fontSize: ".85rem", whiteSpace: "nowrap" }}
                    >
                      {outcome.code}
                    </strong>
                    <ScientificText text={outcome.description} />
                  </div>
                ))}
              </section>
            ))}
          </details>
        );
      })}
    </div>
  );
}
