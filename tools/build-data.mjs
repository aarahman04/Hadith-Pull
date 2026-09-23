#!/usr/bin/env node
// Builds Hadith-Pull/data/v1/ from fawazahmed0/hadith-api, pinned per the spec (H1-H12, section 3).
// Plain Node, no dependencies. Run: node tools/build-data.mjs
// Spec: C:\Users\aarah\.claude\plans\pasted-content-id-a360-role-you-shimmying-naur.md
//   section "Data source: bundled offline dataset"

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO_ROOT, "data", "v1");
const CACHE_DIR = path.join(__dirname, ".cache");
const SHA = "df57907be35291c91ad6a6691180e22ca9920784";
const BASE = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@${SHA}/editions`;
const SHARD_SIZE = 250;

// H3: the locked pool, in the order collections are listed everywhere else in the spec.
const COLLECTIONS = [
  { id: "bukhari", title: "Sahih al-Bukhari", sunnahSlug: "bukhari" },
  { id: "muslim", title: "Sahih Muslim", sunnahSlug: "muslim" },
  { id: "abudawud", title: "Sunan Abi Dawud", sunnahSlug: "abudawud" },
  { id: "tirmidhi", title: "Jami` at-Tirmidhi", sunnahSlug: "tirmidhi" },
  { id: "nasai", title: "Sunan an-Nasa'i", sunnahSlug: "nasai" },
  { id: "ibnmajah", title: "Sunan Ibn Majah", sunnahSlug: "ibnmajah" },
  { id: "malik", title: "Muwatta Malik", sunnahSlug: "malik" },
  { id: "nawawi", title: "The Forty Hadith of al-Nawawi", sunnahSlug: "nawawi40" },
  { id: "qudsi", title: "The Forty Hadith Qudsi", sunnahSlug: "qudsi40" },
  { id: "dehlawi", title: "The Forty Hadith of Shah Waliullah", sunnahSlug: "shahwaliullah40" },
];

// --- JS-compat text primitives (spec §1.4) ---------------------------------------------------
const WS = "\\s\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF";
const WS_RE_TRIM = new RegExp(`^[${WS}]+|[${WS}]+$`, "g");
function jsTrim(s) {
  return (s ?? "").replace(WS_RE_TRIM, "");
}
function splitWords(s) {
  return s.split(new RegExp(`[${WS}]+`)).filter((w) => w.length > 0);
}

const CROSS_REF_PATTERNS = [
  `\\bas (?:mentioned|stated|narrated|reported|described) (?:above|before|earlier|previously)\\b`,
  `\\bsame as (?:above|the (?:above|previous|preceding|foregoing))\\b`,
  `\\bsimilar to the (?:above|previous|preceding|one above)\\b`,
  `\\ba similar (?:hadith|narration|tradition|report|version)\\b`,
  `\\b(?:through|with) (?:a|another|a different) (?:other )?chain of (?:narrators|transmitters|authorities)\\b`,
  `\\bhas (?:already )?been (?:mentioned|narrated|reported|transmitted) (?:above|before|earlier)\\b`,
  `\\blike the (?:previous|preceding|foregoing) (?:hadith|narration|tradition)\\b`,
  `\\bto the same effect\\b`,
  `\\bthe same (?:meaning|as the preceding|as the previous)\\b`,
  `\\bsee[${WS}]+(?:hadith[${WS}]*)?(?:no\\.?|number)?[${WS}]*\\d+`,
  `\\bmentioned in the (?:previous|preceding) (?:hadith|narration)\\b`,
].map((p) => new RegExp(p, "i"));

function isSelfContained(text) {
  const clean = jsTrim(text);
  if (clean.length < 15) return false;
  if (splitWords(clean).length < 3) return false;
  if (clean.length < 300 && CROSS_REF_PATTERNS.some((re) => re.test(clean))) return false;
  return true;
}

function hasArabicWorthShowing(a) {
  const clean = jsTrim(a);
  return clean.length >= 12 && splitWords(clean).length >= 3;
}

function collapseWhitespace(s) {
  // Collapse runs of spaces/tabs, keep paragraph newlines, trim (spec §3.2 "Whitespace").
  return jsTrim(
    s
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t\u00A0]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
  );
}

// --- H8: grading category -------------------------------------------------------------------
function gradingCategory(grade) {
  const s = jsTrim(grade).toLowerCase().replace(/[`'\u2019]/g, "");
  if (/daif|daeef|weak|mawdu|maudu|munkar/.test(s)) return "daif";
  if (/sahih/.test(s)) return "sahih";
  if (/hasan/.test(s)) return "hasan";
  return "unknown";
}

// --- fetch with on-disk cache (so re-runs and fixture checks are instant) --------------------
async function fetchJson(url, cacheName) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, cacheName);
  if (existsSync(cachePath)) {
    return JSON.parse(await readFile(cachePath, "utf8"));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  const text = await res.text();
  await writeFile(cachePath, text, "utf8");
  return JSON.parse(text);
}

// --- ref (spec §3.2 "ref") -------------------------------------------------------------------
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
function computeRef(collectionId, hadithnumber, arabicnumber) {
  if (collectionId !== "muslim") return String(hadithnumber);
  if (arabicnumber === undefined || arabicnumber === null) return null;
  if (typeof arabicnumber === "number" && Number.isInteger(arabicnumber)) {
    return String(arabicnumber);
  }
  const s = String(arabicnumber);
  if (/^\d+$/.test(s)) return s; // plain integer, just delivered as a string
  const m = s.match(/^(\d+)\.0*([1-9]\d*)$/);
  if (!m) return null; // not the "N.0k" shape -> excluded (spec: non-integer/odd numbers filtered)
  const n = m[1];
  const k = parseInt(m[2], 10);
  if (k < 1 || k > LETTERS.length) return null;
  return `${n}${LETTERS[k - 1]}`;
}

// --- narrator split (spec §3.2) --------------------------------------------------------------
const NARRATOR_RE = /^Narrated ([^:]{1,120}):/;
function splitNarrator(text) {
  const m = text.match(NARRATOR_RE);
  if (!m) return { narrator: "", english: text };
  return { narrator: `Narrated ${jsTrim(m[1])}`, english: text.slice(m[0].length) };
}

// --- sunnah.com url (spec §3.2 "url") ---------------------------------------------------------
function sunnahUrl(collection, ref, book, inBook) {
  const slug = collection.sunnahSlug;
  if (collection.id === "malik") {
    // The spec proposed /{slug}/{book}/{inBook} for Malik (no global number in this source).
    // Verified live and found WRONG: hadithapi's reference.hadith is not a unique in-book
    // position for Malik -- e.g. book 3 has two different hadiths both with reference.hadith=16
    // (hadithnumber 161 and 183), and /malik/3/16 resolves to a THIRD, unrelated hadith on
    // sunnah.com. There is no reliable field to build a correct Malik URL from, so it is
    // intentionally omitted rather than risk linking to the wrong hadith.
    return null;
  }
  if (ref == null) return null;
  return `https://sunnah.com/${slug}:${encodeURIComponent(ref)}`;
}

// --- primary grade (spec §3.2 "primary", H4, H5) ----------------------------------------------
function computePrimary(collectionId, grades) {
  if (grades.length === 0) {
    if (collectionId === "bukhari" || collectionId === "muslim") {
      return { grade: "Sahih", by: null, cat: "sahih", consensus: true };
    }
    return null;
  }
  const albani = grades.find((g) => /al-albani/i.test(g.by));
  const chosen = albani ?? grades[0];
  return { grade: chosen.grade, by: chosen.by, cat: gradingCategory(chosen.grade), consensus: false };
}

// --- build one collection ----------------------------------------------------------------------
async function buildCollection(collection) {
  const eng = await fetchJson(`${BASE}/eng-${collection.id}.min.json`, `eng-${collection.id}.json`);
  const ara = await fetchJson(`${BASE}/ara-${collection.id}.min.json`, `ara-${collection.id}.json`);

  const araByNumber = new Map(ara.hadiths.map((h) => [h.hadithnumber, h]));
  const sections = eng.metadata?.sections ?? {};

  const reasons = {
    total: eng.hadiths.length,
    emptyEnglish: 0,
    noRef: 0,
    notSelfContained: 0,
    kept: 0,
  };
  const gradeVocab = new Map(); // raw grade string -> {count, cat}
  let narratorMatches = 0;
  let narratorCandidates = 0;

  const records = [];
  for (const h of eng.hadiths) {
    const rawEnglish = h.text ?? "";
    if (!jsTrim(rawEnglish)) {
      reasons.emptyEnglish++;
      continue;
    }
    // isSelfContained runs on the FULL english, before narrator stripping (spec: "exactly as
    // script.js:181-183 does" -- ported verbatim here, same rule reused for the new source).
    if (!isSelfContained(rawEnglish)) {
      reasons.notSelfContained++;
      continue;
    }

    const ref = computeRef(collection.id, h.hadithnumber, h.arabicnumber);
    if (ref === null) {
      reasons.noRef++;
      continue;
    }

    const bookNum = h.reference?.book;
    const inBookNum = h.reference?.hadith;
    const book = bookNum ? bookNum : null;
    const inBook = inBookNum ? inBookNum : null;

    const chapter = jsTrim(sections[String(bookNum ?? "")] ?? "");

    const collapsedEnglish = collapseWhitespace(rawEnglish);
    if (NARRATOR_RE.test(collapsedEnglish)) narratorCandidates++;
    const { narrator, english } = splitNarrator(collapsedEnglish);
    if (narrator) narratorMatches++;

    const araEntry = araByNumber.get(h.hadithnumber);
    const rawArabic = araEntry?.text ?? "";
    const arabic = hasArabicWorthShowing(rawArabic) ? collapseWhitespace(rawArabic) : "";

    const grades = (h.grades ?? [])
      .filter((g) => g.name && g.grade)
      .map((g) => ({ by: g.name, grade: g.grade }));
    for (const g of grades) {
      const cat = gradingCategory(g.grade);
      const key = g.grade;
      const entry = gradeVocab.get(key) ?? { count: 0, cat };
      entry.count++;
      gradeVocab.set(key, entry);
    }

    const primary = computePrimary(collection.id, grades);
    const url = sunnahUrl(collection, ref, book, inBook);

    records.push({
      ref,
      book,
      inBook,
      chapter,
      narrator,
      english: jsTrim(english),
      arabic,
      grades,
      primary,
      url,
    });
    reasons.kept++;
  }

  return { collection, records, reasons, gradeVocab, narratorMatches, narratorCandidates };
}

// --- write shards ------------------------------------------------------------------------------
async function writeShards(collectionId, records) {
  const dir = path.join(OUT_DIR, collectionId);
  await mkdir(dir, { recursive: true });
  const shardCount = Math.max(1, Math.ceil(records.length / SHARD_SIZE));
  for (let k = 0; k < shardCount; k++) {
    const slice = records.slice(k * SHARD_SIZE, (k + 1) * SHARD_SIZE);
    await writeFile(path.join(dir, `${k}.json`), JSON.stringify(slice), "utf8");
  }
  return shardCount;
}

// --- fixtures (spec §3.4) ----------------------------------------------------------------------
async function runFixtures(byCollection) {
  const fixturesPath = path.join(__dirname, "fixtures.json");
  const fixtures = JSON.parse(await readFile(fixturesPath, "utf8"));
  const lines = [];
  let failed = 0;
  for (const f of fixtures) {
    const built = byCollection.get(f.collection);
    const rec = built?.records.find((r) => r.ref === f.ref);
    const problems = [];
    if (!rec) {
      problems.push("no such ref in output");
    } else {
      if (f.englishContains && !rec.english.toLowerCase().includes(f.englishContains.toLowerCase())) {
        problems.push(`english missing "${f.englishContains}"`);
      }
      if (f.book !== undefined && rec.book !== f.book) problems.push(`book ${rec.book} != ${f.book}`);
      if (f.inBook !== undefined && rec.inBook !== f.inBook) {
        problems.push(`inBook ${rec.inBook} != ${f.inBook}`);
      }
      if (f.primaryCat !== undefined && rec.primary?.cat !== f.primaryCat) {
        problems.push(`primary.cat ${rec.primary?.cat} != ${f.primaryCat}`);
      }
      if (f.url && rec.url !== f.url) problems.push(`url ${rec.url} != ${f.url}`);
    }
    const status = problems.length ? "FAIL" : "PASS";
    if (problems.length) failed++;
    lines.push(`  [${status}] ${f.collection}:${f.ref}${problems.length ? " -- " + problems.join("; ") : ""}`);
  }
  return { failed, total: fixtures.length, lines };
}

// --- main ----------------------------------------------------------------------------------------
async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const byCollection = new Map();
  const built = [];
  for (const c of COLLECTIONS) {
    process.stderr.write(`fetching ${c.id}...\n`);
    const result = await buildCollection(c);
    byCollection.set(c.id, result);
    built.push(result);
  }

  // Ref uniqueness per collection: `${collection}:${ref}` is the bookmark/recent key (H9), so a
  // collision here would silently merge two different hadiths.
  for (const result of built) {
    const seen = new Set();
    for (const r of result.records) {
      if (seen.has(r.ref)) {
        throw new Error(`duplicate ref ${result.collection.id}:${r.ref} -- fix computeRef/dedup`);
      }
      seen.add(r.ref);
    }
  }

  const indexCollections = [];
  for (const result of built) {
    const shardCount = await writeShards(result.collection.id, result.records);
    indexCollections.push({
      id: result.collection.id,
      title: result.collection.title,
      count: result.records.length,
      shards: Array.from({ length: shardCount }, (_, i) => i),
    });
  }

  const index = {
    source: { repo: "fawazahmed0/hadith-api", sha: SHA },
    generatedAt: new Date().toISOString(),
    collections: indexCollections,
  };
  await writeFile(path.join(OUT_DIR, "index.json"), JSON.stringify(index), "utf8");

  const fixtureResult = await runFixtures(byCollection);

  // report.txt (spec §3.3)
  const reportLines = [];
  reportLines.push(`Hadith Pull data pipeline report`);
  reportLines.push(`Source: fawazahmed0/hadith-api @ ${SHA}`);
  reportLines.push(`Generated: ${index.generatedAt}`);
  reportLines.push("");
  reportLines.push("Per-collection counts:");
  let totalKept = 0;
  for (const result of built) {
    const r = result.reasons;
    totalKept += r.kept;
    const narratorPct = r.kept ? Math.round((100 * result.narratorMatches) / r.kept) : 0;
    reportLines.push(
      `  ${result.collection.id.padEnd(10)} total=${r.total} kept=${r.kept} ` +
        `excluded(emptyEnglish=${r.emptyEnglish}, notSelfContained=${r.notSelfContained}, noRef=${r.noRef}) ` +
        `narratorSplit=${narratorPct}%`
    );
  }
  reportLines.push(`  TOTAL kept: ${totalKept}`);
  reportLines.push("");
  reportLines.push("Grade vocabulary -> category (raw grade string : count : category):");
  const allGrades = new Map();
  for (const result of built) {
    for (const [grade, entry] of result.gradeVocab) {
      const acc = allGrades.get(grade) ?? { count: 0, cat: entry.cat };
      acc.count += entry.count;
      allGrades.set(grade, acc);
    }
  }
  const sortedGrades = [...allGrades.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [grade, entry] of sortedGrades) {
    reportLines.push(`  ${grade} : ${entry.count} : ${entry.cat}`);
  }
  reportLines.push("");
  reportLines.push(`Fixtures: ${fixtureResult.total - fixtureResult.failed}/${fixtureResult.total} passed`);
  reportLines.push(...fixtureResult.lines);
  reportLines.push("");
  reportLines.push(
    "Note: a small number of generated sunnah.com URLs 404 or render an empty page on " +
      "sunnah.com's own site (a gap in their site, not in this data -- e.g. muslim:356/356a/356b " +
      "are all empty on sunnah.com while muslim:355 and muslim:357 work fine either side of them). " +
      "This is a known, low-frequency risk of the 'View on Sunnah.com' link feature, not a defect " +
      "in the ref/url computation, which was verified correct against the site wherever it does " +
      "have the page."
  );
  reportLines.push("");
  reportLines.push("Sample URLs for the user's 10-URL spot-check (spec 3.4):");
  const sampleCollections = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"];
  for (const id of sampleCollections) {
    const result = byCollection.get(id);
    const withUrl = result.records.filter((r) => r.url);
    for (const frac of [0.1, 0.6]) {
      const rec = withUrl[Math.floor(withUrl.length * frac)];
      if (rec) reportLines.push(`  ${id}:${rec.ref}  ${rec.url}`);
    }
  }

  await writeFile(path.join(OUT_DIR, "report.txt"), reportLines.join("\n") + "\n", "utf8");

  process.stderr.write("\n" + reportLines.join("\n") + "\n");

  if (fixtureResult.failed > 0) {
    process.stderr.write(`\nFAILED: ${fixtureResult.failed} fixture(s) did not pass.\n`);
    process.exit(1);
  }
  process.stderr.write(`\nOK. Wrote ${OUT_DIR}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
