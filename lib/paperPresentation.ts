export function paperMetadata(value: unknown): Record<string, any> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}
export function paperChoices(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (Array.isArray(value))
    value.forEach((option, index) => {
      const item = paperMetadata(option);
      const key = String(
        item.id || item.key || item.label || String.fromCharCode(65 + index),
      )
        .trim()
        .toUpperCase();
      const text =
        typeof option === "string"
          ? option
          : item.text || item.value || item.content;
      if (/^[A-Z]$/.test(key) && typeof text === "string") result[key] = text;
    });
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([key, text]) => {
      const normalized = key.trim().toUpperCase(),
        item = paperMetadata(text);
      const label = typeof text === "string" ? text : item.text;
      if (/^[A-Z]$/.test(normalized) && typeof label === "string")
        result[normalized] = label;
    });
  return result;
}
export function paperAnswer(
  meta: Record<string, any>,
  choices: Record<string, string>,
) {
  if (meta.single_answer_review_required === true) return undefined;
  if (meta.answer_status === 'KEY_CONFLICT' || meta.answer_status === 'OFFICIAL_ASTERISK') return undefined;
  if (typeof meta.official_answer === 'string' && !/^[A-D](?:,\s*[A-D])*$/i.test(meta.official_answer.trim()) && meta.answer_status !== 'ANSWER_CORRECTED') return undefined;
  const candidate =
    meta.correct_answer || meta.solved_correct_option || meta.correctOption;
  const key =
    typeof candidate === "string" ? candidate.trim().toUpperCase() : "";
  return Object.hasOwn(choices, key) ? key : undefined;
}
export function safeDocumentUrl(value: string | null | undefined) {
  if (!value || /[\u0000-\u0020\\]/.test(value)) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function presentPaperQuestion(q: Record<string, any>) {
  return {
    id: String(q.id),
    questionNumber: String(q.questionNumber || ""),
    questionText: typeof q.questionText === "string" ? q.questionText : "",
    questionType: typeof q.questionType === "string" ? q.questionType : "",
    marks: typeof q.marks === "number" ? q.marks : undefined,
    difficulty: typeof q.difficulty === "string" ? q.difficulty : undefined,
    sourceRegion: q.sourceRegion,
    diagramBased:
      typeof q.diagramBased === "boolean" ? q.diagramBased : undefined,
    topics: Array.isArray(q.topics)
      ? q.topics
          .filter((item) => typeof item?.topic?.name === "string")
          .map((item) => ({
            topic: {
              name: item.topic.name as string,
              topicNumber:
                typeof item.topic.topicNumber === "string"
                  ? item.topic.topicNumber
                  : undefined,
            },
          }))
      : [],
    slos: Array.isArray(q.slos)
      ? q.slos
          .filter((item) => typeof item?.slo?.description === "string")
          .map((item) => ({
            slo: {
              description: item.slo.description as string,
              code:
                typeof item.slo.code === "string" ? item.slo.code : undefined,
            },
          }))
      : [],
  };
}

export function safePaperOriginal(
  code: string | undefined,
  value: string | null | undefined,
) {
  const url = safeDocumentUrl(value);
  if (
    url &&
    /-20\d\d-P[123]$/i.test(code || "") &&
    !/-MODEL-/i.test(code || "") &&
    /model[-_ ]paper/i.test(url)
  )
    return undefined;
  return url;
}

export function paperLabel(code: string | null | undefined, title: string) {
  if (/-MODEL-/i.test(code || "")) return title;
  const annual = /-((?:19|20)\d\d)-P([123])$/i.exec(code || "");
  if (annual) return annual[1] + " · Paper " + annual[2];
  const model = /^PHY-(?:IX|X)-P([123])$/i.exec(code || "");
  if (model) return "Model paper " + model[1];
  if (/CHAP1-2$/i.test(code || "")) return "Chapters 1–2 · past questions";
  return title;
}

/** Original PDF for a biology paper code, used when the paper has no question page. */
export function biologyPaperPdfHref(code: string): string | null {
  const match = /^BIO-(IX|X)-(\d{4})-(P1|P2)$/i.exec(code);
  if (!match) return null;
  const [, roman, year, part] = match;
  const ssc = roman.toUpperCase() === "IX" ? "1" : "2";
  return `/materials/ssc/biology/ssc-${ssc}/biology-${roman.toLowerCase()}-${year}-${part.toUpperCase() === "P1" ? "paper-i" : "paper-ii"}.pdf`;
}

/** Canonicalize a listing label so paper, key and marking rows share one slot per year. */
export function normalizePaperListingLabel(label: string): string {
  if (/e[- ]?marking/i.test(label)) return "Paper 2 E-marking";
  if (/\bkeys?\b/i.test(label)) return "Paper 1 keys";
  if (/\bpaper\s*(2|II)\b/i.test(label)) return "Paper 2";
  if (/\bpaper\s*(1|I)\b/i.test(label)) return "Paper 1";
  return label;
}

const isDigitalPaperHref = (href: string) => href.startsWith("/past-papers/");

/**
 * Merge paper listing rows by year + canonical label. A digital question page
 * (/past-papers/...) always wins its slot over a PDF fallback, no matter which
 * order the rows arrive in; otherwise the earliest row wins and exact
 * duplicates collapse.
 */
export function mergePaperListings<T extends { label: string; href: string; year?: number }>(
  items: T[],
): T[] {
  const merged = new Map<string, T>();
  for (const item of items) {
    const normalized = { ...item, label: normalizePaperListingLabel(item.label) };
    const key = `${item.year ?? ""}:${normalized.label}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, normalized);
      continue;
    }
    if (isDigitalPaperHref(normalized.href) && !isDigitalPaperHref(existing.href)) {
      merged.set(key, normalized);
    }
  }
  return [...merged.values()];
}
