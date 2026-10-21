import { describe, it, expect } from "vitest";
import { questionSyllabus } from "@/lib/questionSyllabus";
describe("Paper syllabus labels", () => {
  it("keeps historical references separate even when their codes exist today", () => {
    const result = questionSyllabus(
      { slo: "1.2.2" },
      [],
      9,
      "Physics",
      "AKU-EB",
      true,
    );
    expect(result.originalCode).toBe("1.2.2");
    expect(result.status).toBe("pending");
    expect(result.href).toBeUndefined();
    expect(
      questionSyllabus(
        { slo: "5.2.1", current_slo: "1.2.2" },
        [],
        9,
        "Physics",
        "AKU-EB",
        true,
      ).status,
    ).toBe("pending");
    const reviewed = questionSyllabus(
      { slo: "5.2.1", current_slo: "1.2.2", current_syllabus_reviewed: true },
      [],
      9,
      "Physics",
      "AKU-EB",
      true,
    );
    expect(reviewed.status).toBe("mapped");
    expect(reviewed.originalCode).toBe("5.2.1");
    expect(reviewed.code).toBe("1.2.2");
  });
  it("does not turn a missing or blanket-false mapping into an outside-syllabus judgment", () => {
    expect(
      questionSyllabus({ in_syllabus: false }, [], 9, "Physics").status,
    ).toBe("pending");
    expect(questionSyllabus({}, [], 9, "Physics").status).toBe("pending");
  });
  it("links an existing supplied code to the correct syllabus description and anchor", () => {
    const result = questionSyllabus(
      { in_syllabus: false, slo: "1.2.2" },
      [],
      9,
      "Physics",
    );
    expect(result.status).toBe("mapped");
    expect(result.description).toContain("base and derived");
    expect(result.href).toBe("/akueb/IX/physics/syllabus#slo-1.2.2");
  });
  it("does not reuse AKU-EB physics mappings for other boards or subjects", () => {
    expect(questionSyllabus({ slo: "1.2.2" }, [], 9, "Chemistry").status).toBe(
      "pending",
    );
    expect(
      questionSyllabus({ slo: "1.2.2" }, [], 9, "Physics", "FBISE").status,
    ).toBe("pending");
    expect(questionSyllabus({ slo: "999.99" }, [], 9, "Physics").status).toBe(
      "pending",
    );
  });
  it("requires an explicit review marker before labelling an unmapped question outside", () => {
    expect(
      questionSyllabus({ out_of_syllabus: true }, [], 9, "Physics").status,
    ).toBe("pending");
    expect(
      questionSyllabus(
        { out_of_syllabus: true, syllabus_reviewed: true },
        [],
        9,
        "Physics",
      ).status,
    ).toBe("outside");
  });
});
