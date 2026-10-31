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
  if (typeof meta.official_answer === 'string' && !/^[A-D]$/i.test(meta.official_answer.trim())) return undefined;
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
    /model[-_ ]paper/i.test(url)
  )
    return undefined;
  return url;
}

export function paperLabel(code: string | null | undefined, title: string) {
  const annual = /-((?:19|20)\d\d)-P([123])$/i.exec(code || "");
  if (annual) return annual[1] + " · Paper " + annual[2];
  const model = /^PHY-(?:IX|X)-P([123])$/i.exec(code || "");
  if (model) return "Model paper " + model[1];
  if (/CHAP1-2$/i.test(code || "")) return "Chapters 1–2 · past questions";
  return title;
}
