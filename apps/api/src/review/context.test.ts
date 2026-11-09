import { describe, expect, it } from "vitest";
import { buildReviewContext, validateReview } from "./context";
import { summary, detail, validReview } from "./test-fixtures";

describe("review evidence", () => {
  it("keeps zero, omits null, flips team advantage, and only includes exact timeline samples", () => {
    const c = buildReviewContext("42", detail(), undefined, []);
    expect(c.facts).toContainEqual(
      expect.objectContaining({ id: "match.deaths", value: 0 }),
    );
    expect(c.facts).not.toContainEqual(
      expect.objectContaining({ metric: "experiencePerMinute" }),
    );
    expect(c.facts).toContainEqual(
      expect.objectContaining({
        metric: "teamGoldAdvantage",
        value: -2000,
        atSeconds: 600,
      }),
    );
    expect(c.facts.filter((f) => f.atSeconds === 1200)).toEqual([]);
    expect(JSON.stringify(c)).not.toMatch(
      /PRIVATE NAME|accountId|900|heroImage/,
    );
  });
  it("rejects another player's match even if a manual profile or unrelated saved game exists", () => {
    expect(() => buildReviewContext("99", detail(), summary(), [])).toThrow(
      /own match/,
    );
    expect(() =>
      buildReviewContext("42", null, summary({ id: "901" }), [], "900"),
    ).toThrow(/own match/);
  });
  it("uses owned saved stats during source outages without claiming replay coverage", () => {
    const c = buildReviewContext("42", null, summary(), [], "900");
    expect(c.coverage).toBe("summary");
    expect(c.facts).toContainEqual(
      expect.objectContaining({ id: "match.deaths", value: 0 }),
    );
  });
  it("compares only earlier same-hero similar-duration games and requires five valid samples per metric", () => {
    const prior = Array.from({ length: 6 }, (_, i) =>
      summary({
        id: String(i + 1),
        startedAt: 1699999000 - i,
        goldPerMinute: 400,
        deaths: i === 0 ? null : 2,
      }),
    );
    prior.push(
      summary({ id: "901", startedAt: 1700000001, goldPerMinute: 9999 }),
      summary({ id: "902", heroId: 2, goldPerMinute: 9999 }),
      summary({ id: "903", duration: 400, goldPerMinute: 9999 }),
    );
    const c = buildReviewContext("42", detail(), undefined, prior);
    expect(c.facts).toContainEqual(
      expect.objectContaining({
        id: "baseline.goldPerMinute",
        value: 400,
        samples: 6,
      }),
    );
    expect(c.facts).toContainEqual(
      expect.objectContaining({ id: "baseline.deaths", value: 2, samples: 5 }),
    );
    expect(
      buildReviewContext(
        "42",
        detail(),
        undefined,
        prior.slice(0, 4),
      ).facts.some((f) => f.source === "baseline"),
    ).toBe(false);
  });
  it("accepts honest empty sections but rejects invented evidence and baseline-only claims", () => {
    const c = buildReviewContext("42", detail(), undefined, []);
    expect(validateReview(validReview(), c)).toEqual(validReview());
    const bad = validReview();
    bad.improve[0].evidenceIds = ["invented.warding"];
    expect(() => validateReview(bad, c)).toThrow();
    bad.improve[0].evidenceIds = ["baseline.goldPerMinute"];
    expect(() => validateReview(bad, c)).toThrow();
  });
});
