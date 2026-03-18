import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { load } from "cheerio";

const SOURCE_URL =
  "https://docs.google.com/document/d/e/2PACX-1vSdvMDG0MOOM-RLv-lG3hd3F18Vcnq-fqSMxkvBZZDccUJrMiU3fiP89uVtXRAZ5wRlWH0l_Ymwhki7/pub?embedded=true";
const OUTPUT_PATH = resolve("src/data/recommendations.json");

function normalizeText(value = "") {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unwrapGoogleRedirect(href = "") {
  try {
    const url = new URL(href);
    if (url.hostname === "www.google.com" && url.pathname === "/url") {
      return url.searchParams.get("q") || href;
    }
    return href;
  } catch {
    return href;
  }
}

function getNodeClasses(node, inherited = []) {
  const currentClasses =
    node.attribs?.class?.split(/\s+/).filter(Boolean) ?? [];
  return [...inherited, ...currentClasses];
}

function flattenSegments($, node, inherited = []) {
  if (!node) {
    return [];
  }

  if (node.type === "text") {
    return [{ type: "text", text: node.data.replace(/\u00a0/g, " "), classes: inherited }];
  }

  if (node.type !== "tag") {
    return [];
  }

  const classes = getNodeClasses(node, inherited);

  if (node.tagName === "br") {
    return [{ type: "text", text: " ", classes }];
  }

  if (node.tagName === "a") {
    return [
      {
        type: "link",
        text: $(node).text().replace(/\u00a0/g, " "),
        href: unwrapGoogleRedirect($(node).attr("href")),
        classes,
      },
    ];
  }

  return $(node)
    .contents()
    .toArray()
    .flatMap((child) => flattenSegments($, child, classes));
}

function joinSegments(segments) {
  return normalizeText(segments.map((segment) => segment.text).join(" "));
}

function extractRecommender(text) {
  const directMatch =
    text.match(/\(\s*recommended by ([^)]+)\)/i) ||
    text.match(/\brecommended by ([^,):]+(?: [^,):]+)*)/i);
  return directMatch ? directMatch[1].trim() : "";
}

function stripTrailingPunctuation(text) {
  return text.replace(/[,:;]+$/g, "").trim();
}

function looksLikeNarrativeStart(text) {
  const cleanText = normalizeText(text);
  if (!cleanText) {
    return false;
  }

  return /^(This|When|A |An |In |And |But |It['’]s|Told|Set|Love|Min|Danny|Jess|Kaz|Jo|Spirits|Acclaimed|On |Readers|Explore|Join|Experience|Put on|Bilingual|With|These|Nobody|As )/i.test(
    cleanText,
  );
}

function isNameLikeToken(token) {
  return /^(?:[\p{Lu}]\.){2,}$/u.test(token) ||
    /^[\p{Lu}][\p{L}.'’\-]+$/u.test(token);
}

function isNameConnector(token) {
  return /^(and|&|de|da|del|di|du|la|le|van|von|st\.?)$/i.test(token);
}

function splitAfterAuthor(text) {
  const byMatch = text.match(/(?<!recommended)\s+by\s+/i);
  if (!byMatch || byMatch.index === undefined) {
    return null;
  }

  const prefix = normalizeText(text.slice(0, byMatch.index));
  const remainder = normalizeText(text.slice(byMatch.index + byMatch[0].length));
  const tokens = remainder.split(/\s+/).filter(Boolean);
  const authorTokens = [];
  let summaryIndex = -1;

  for (let index = 0; index < tokens.length; index += 1) {
    const rawToken = tokens[index];
    const token = rawToken.replace(/[,:;!?]+$/g, "");
    const nextToken = tokens[index + 1]?.replace(/[,:;!?]+$/g, "") ?? "";

    if (index > 0 && looksLikeNarrativeStart(tokens.slice(index).join(" "))) {
      summaryIndex = index;
      break;
    }

    if (
      index > 0 &&
      token &&
      /^[\p{Lu}]/u.test(token) &&
      nextToken &&
      /^[\p{Ll}]/u.test(nextToken)
    ) {
      summaryIndex = index;
      break;
    }

    if (isNameLikeToken(token) || isNameConnector(token)) {
      authorTokens.push(rawToken);
      continue;
    }

    if (authorTokens.length > 0) {
      summaryIndex = index;
      break;
    }

    return null;
  }

  if (summaryIndex === -1 || authorTokens.length === 0) {
    return null;
  }

  const summary = normalizeText(tokens.slice(summaryIndex).join(" "));
  if (!looksLikeNarrativeStart(summary)) {
    return null;
  }

  return {
    lead: normalizeText(`${prefix} by ${authorTokens.join(" ")}`),
    summary,
  };
}

function looksLikeAuthorFragment(text) {
  if (!text) {
    return false;
  }

  if (/recommended by/i.test(text)) {
    return true;
  }

  return /^[A-Z][A-Za-z.'’\-]+(?:\s+[A-Z][A-Za-z.'’\-]+){0,4}(?:\s*\([^)]*\))?$/.test(
    text,
  );
}

function parseLead(lead) {
  const cleanLead = normalizeText(lead);
  if (!cleanLead) {
    return {
      title: "",
      author: "",
      recommender: "",
      meta: "",
    };
  }

  if (/^Anything by /i.test(cleanLead)) {
    return {
      title: cleanLead,
      author: "",
      recommender: extractRecommender(cleanLead),
      meta: "",
    };
  }

  let title = cleanLead;
  let author = "";
  let meta = "";

  const byIndex = cleanLead.search(/(?<!recommended)\s+by\s+/i);
  if (byIndex !== -1) {
    title = stripTrailingPunctuation(cleanLead.slice(0, byIndex));
    author = normalizeText(cleanLead.slice(byIndex + 4));
  } else {
    const commaIndex = cleanLead.indexOf(",");
    if (commaIndex !== -1) {
      const possibleAuthor = normalizeText(cleanLead.slice(commaIndex + 1));
      if (looksLikeAuthorFragment(possibleAuthor)) {
        title = stripTrailingPunctuation(cleanLead.slice(0, commaIndex));
        author = possibleAuthor;
      }
    }
  }

  const recommender = extractRecommender(author || cleanLead);

  if (recommender) {
    author = normalizeText(
      author
        .replace(/\(\s*recommended by [^)]+\)/i, "")
        .replace(/\brecommended by [^,):]+(?: [^,):]+)*/i, ""),
    );
    meta = `Recommended by ${recommender}`;
  }

  const authorNoteIndex = author.indexOf(",");
  if (authorNoteIndex !== -1) {
    const possibleAuthor = normalizeText(author.slice(0, authorNoteIndex));
    const possibleNote = normalizeText(author.slice(authorNoteIndex + 1));
    if (looksLikeAuthorFragment(possibleAuthor) && possibleNote) {
      author = possibleAuthor;
      meta = normalizeText(meta ? `${meta}. ${possibleNote}` : possibleNote);
    }
  }

  return {
    title: title || cleanLead,
    author: stripTrailingPunctuation(author),
    recommender,
    meta: stripTrailingPunctuation(meta),
  };
}

function splitLeadAndSummary(text) {
  const cleanText = normalizeText(text);
  if (!cleanText) {
    return { lead: "", summary: "" };
  }

  const parentheticalSplitIndex = cleanText.lastIndexOf(") ");
  const parentheticalStartIndex = cleanText.lastIndexOf("(");
  const lastParenthetical =
    parentheticalStartIndex !== -1 && parentheticalSplitIndex !== -1
      ? cleanText.slice(parentheticalStartIndex, parentheticalSplitIndex + 1)
      : "";

  if (
    parentheticalSplitIndex !== -1 &&
    /recommended by/i.test(lastParenthetical)
  ) {
    const possibleSummary = cleanText.slice(parentheticalSplitIndex + 2);
    if (looksLikeNarrativeStart(possibleSummary)) {
      return {
        lead: normalizeText(cleanText.slice(0, parentheticalSplitIndex + 1)),
        summary: normalizeText(possibleSummary),
      };
    }
  }

  const authorSplit = splitAfterAuthor(cleanText);
  if (authorSplit) {
    return authorSplit;
  }

  const seriesMatch = cleanText.match(/^(?<lead>.+?series\b)(?<tail>\s+.+)$/i);
  if (seriesMatch?.groups?.lead && seriesMatch.groups.tail) {
    const possibleSummary = normalizeText(seriesMatch.groups.tail);
    if (!/^by\s+/i.test(possibleSummary) && looksLikeNarrativeStart(possibleSummary)) {
      return {
        lead: normalizeText(seriesMatch.groups.lead),
        summary: possibleSummary,
      };
    }
  }

  return { lead: cleanText, summary: "" };
}

function extractParagraphData($, node) {
  const segments = flattenSegments($, node).filter((segment) => normalizeText(segment.text));
  const firstContent = segments.find((segment) => normalizeText(segment.text));
  const startsWithLink = firstContent?.type === "link";

  const links = [];
  for (const segment of segments) {
    if (segment.type !== "link" || !segment.href) {
      continue;
    }

    if (links.some((link) => link.url === segment.href)) {
      continue;
    }

    links.push({
      label: normalizeText(segment.text),
      url: segment.href,
    });
  }

  const beforeFirstLink = [];
  const afterFirstLink = [];
  let seenLink = false;

  for (const segment of segments) {
    if (segment.type === "link") {
      seenLink = true;
      continue;
    }

    if (seenLink) {
      afterFirstLink.push(segment);
    } else {
      beforeFirstLink.push(segment);
    }
  }

  const beforeText = joinSegments(beforeFirstLink);
  const afterText = joinSegments(afterFirstLink);
  let lead = "";
  let summary = "";

  if (startsWithLink) {
    summary = afterText;
  } else if (links.length > 0) {
    lead = beforeText;
    summary = afterText;
  } else {
    const split = splitLeadAndSummary(beforeText);
    lead = split.lead;
    summary = split.summary;
  }

  const fallbackText = normalizeText(
    segments
      .filter((segment) => segment.type !== "link")
      .map((segment) => segment.text)
      .join(" "),
  );

  return {
    lead: lead || (!startsWithLink ? fallbackText : ""),
    summary,
    links,
    startsWithLink,
    text: fallbackText,
  };
}

function isLikelyNewItem(text) {
  const cleanText = normalizeText(text);

  if (!cleanText) {
    return false;
  }

  if (cleanText.startsWith("(")) {
    return false;
  }

  if (/^(This|When|A |An |In |And |But |It['’]s|Told|Set|Love|Min|Danny|Jess|Kaz|Jo|Acclaimed|Readers are|Explore|Join|Experience|Put on|On the surface|Bilingual|With|These|D\.J|Nobody|As Stevie)/i.test(cleanText)) {
    return false;
  }

  if (/^https?:\/\//i.test(cleanText)) {
    return false;
  }

  if (/\bby\b/i.test(cleanText) || /\bseries\b/i.test(cleanText) || /\bbooks\b/i.test(cleanText)) {
    return true;
  }

  return cleanText.length <= 140 && !/[.!?]$/.test(cleanText);
}

function appendText(target, field, value) {
  const cleanValue = normalizeText(value);
  if (!cleanValue) {
    return;
  }

  target[field] = target[field]
    ? normalizeText(`${target[field]} ${cleanValue}`)
    : cleanValue;
}

function createRecommendation(themeId, index, paragraph) {
  const leadInfo = parseLead(paragraph.lead);
  return {
    id: `${themeId}-${index + 1}`,
    headline: paragraph.lead || paragraph.text,
    title: leadInfo.title || paragraph.lead || paragraph.text,
    author: leadInfo.author,
    recommender: leadInfo.recommender,
    meta: leadInfo.meta,
    summary: paragraph.summary,
    note: "",
    links: paragraph.links,
  };
}

function finalizeRecommendation(theme, recommendation) {
  if (!recommendation) {
    return;
  }

  recommendation.summary = normalizeText(recommendation.summary);
  recommendation.note = normalizeText(recommendation.note);
  recommendation.meta = normalizeText(recommendation.meta);

  theme.recommendations.push(recommendation);
}

function normalizeRecommendation(recommendation) {
  const spilloverMatch = recommendation.summary.match(
    /^(?<spill>[A-Z][\p{L}.'’\-]+(?:\s+(?:and|&)\s+[A-Z][\p{L}.'’\-]+)?(?:\s+[A-Z][\p{L}.'’\-]+)*)\s+(?<rest>This|When|A|An|In|Getting|Buckle|Loved|These|With|Explore|Join|Experience|Put|Readers|Set|Told|Love|Spirits)\b/u,
  );

  if (
    spilloverMatch?.groups?.spill &&
    spilloverMatch.groups.rest &&
    recommendation.author &&
    recommendation.author.split(/\s+/).length <= 2
  ) {
    const restIndex = recommendation.summary.indexOf(spilloverMatch.groups.rest);
    recommendation.author = normalizeText(
      `${recommendation.author} ${spilloverMatch.groups.spill}`,
    );
    recommendation.summary = normalizeText(recommendation.summary.slice(restIndex));
  }

  if (recommendation.author && /\s+by\s+/i.test(recommendation.headline)) {
    recommendation.headline = normalizeText(
      `${recommendation.title} by ${recommendation.author}${
        recommendation.recommender
          ? ` (recommended by ${recommendation.recommender})`
          : ""
      }`,
    );
  }

  recommendation.title = normalizeText(recommendation.title);
  recommendation.author = normalizeText(recommendation.author);
  recommendation.headline = normalizeText(recommendation.headline);
  recommendation.summary = normalizeText(recommendation.summary);
  recommendation.note = normalizeText(recommendation.note);
  recommendation.meta = normalizeText(recommendation.meta);

  return recommendation;
}

function buildFallbackPayload() {
  return {
    sourceUrl: SOURCE_URL,
    syncedAt: "",
    intro: "Unable to refresh the source document, so the last saved data is being used.",
    ageGroups: [],
    teacherPicks: [],
  };
}

async function fetchDocument() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.text();
}

function parseDocument(html) {
  const $ = load(html);
  const contentTable = $("div.doc-content > table").last();
  const stream = contentTable.find("h1, h2, h3, p, li").toArray();

  const payload = {
    sourceUrl: SOURCE_URL.replace("?embedded=true", ""),
    syncedAt: new Date().toISOString(),
    intro: "Books that children will not want to put down, organized by age band, mood, and reading adventure.",
    ageGroups: [],
    teacherPicks: [],
  };

  let currentAgeGroup = null;
  let currentTheme = null;
  let currentRecommendation = null;
  let currentTeacher = null;

  for (const node of stream) {
    const tagName = node.tagName.toLowerCase();
    const text = normalizeText($(node).text());

    if (!text) {
      continue;
    }

    if (tagName === "h1") {
      continue;
    }

    if (tagName === "h2") {
      if (currentTheme && currentRecommendation) {
        finalizeRecommendation(currentTheme, currentRecommendation);
      }
      currentRecommendation = null;
      currentTheme = null;
      currentTeacher = null;

      const nextGroup = {
        id: slugify(text),
        label: text,
        themes: [],
      };

      if (text === "Teacher Picks") {
        payload.teacherPicks = [];
      } else {
        payload.ageGroups.push(nextGroup);
      }

      currentAgeGroup = nextGroup;
      continue;
    }

    if (tagName === "h3") {
      if (!currentAgeGroup || currentAgeGroup.label === "Teacher Picks") {
        continue;
      }

      if (currentTheme && currentRecommendation) {
        finalizeRecommendation(currentTheme, currentRecommendation);
      }

      currentRecommendation = null;
      currentTheme = {
        id: slugify(`${currentAgeGroup.label}-${text}`),
        title: text,
        recommendations: [],
      };

      currentAgeGroup.themes.push(currentTheme);
      continue;
    }

    const paragraph = extractParagraphData($, node);

    if (currentAgeGroup?.label === "Teacher Picks") {
      if (tagName === "p") {
        if (text.startsWith("Ambassador ")) {
          const cleanedName = stripTrailingPunctuation(
            text
              .replace(/\s+recommended this list:.*$/i, "")
              .replace(/\s+School Library Journal - Top 100 Chapter Books$/i, ""),
          );
          currentTeacher = {
            id: slugify(text),
            name: cleanedName,
            picks: [],
            resource: paragraph.links[0]
              ? {
                  label: paragraph.links[0].label,
                  url: paragraph.links[0].url,
                }
              : null,
          };
          payload.teacherPicks.push(currentTeacher);
        }
      } else if (tagName === "li" && currentTeacher) {
        currentTeacher.picks.push(stripTrailingPunctuation(text));
      }
      continue;
    }

    if (!currentTheme) {
      continue;
    }

    if (paragraph.startsWithLink) {
      if (!currentRecommendation) {
        currentRecommendation = createRecommendation(
          currentTheme.id,
          currentTheme.recommendations.length,
          paragraph,
        );
      }

      currentRecommendation.links.push(...paragraph.links);
      appendText(currentRecommendation, "summary", paragraph.summary);
      continue;
    }

    if (!currentRecommendation || isLikelyNewItem(paragraph.lead || paragraph.text)) {
      if (currentRecommendation) {
        finalizeRecommendation(currentTheme, currentRecommendation);
      }
      currentRecommendation = createRecommendation(
        currentTheme.id,
        currentTheme.recommendations.length,
        paragraph,
      );
      continue;
    }

    if ((paragraph.text || paragraph.summary).startsWith("(")) {
      appendText(currentRecommendation, "note", paragraph.text || paragraph.summary);
    } else {
      appendText(
        currentRecommendation,
        "summary",
        paragraph.summary || paragraph.lead || paragraph.text,
      );
    }

    if (paragraph.links.length > 0) {
      currentRecommendation.links.push(...paragraph.links);
    }
  }

  if (currentTheme && currentRecommendation) {
    finalizeRecommendation(currentTheme, currentRecommendation);
  }

  for (const ageGroup of payload.ageGroups) {
    for (const theme of ageGroup.themes) {
      theme.recommendations = theme.recommendations.map((recommendation) => ({
        ...normalizeRecommendation(recommendation),
        links: recommendation.links.filter(
          (link, index, links) =>
            links.findIndex((candidate) => candidate.url === link.url) === index,
        ),
      }));
    }
  }

  return payload;
}

async function writePayload(payload) {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

async function loadExistingPayload() {
  try {
    const existing = await readFile(OUTPUT_PATH, "utf8");
    return JSON.parse(existing);
  } catch {
    return buildFallbackPayload();
  }
}

async function main() {
  try {
    const html = await fetchDocument();
    const payload = parseDocument(html);
    await writePayload(payload);
    console.log(`Synced reading lists to ${OUTPUT_PATH}`);
  } catch (error) {
    const existing = await loadExistingPayload();
    await writePayload(existing);
    console.warn(`Falling back to existing data: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 0;
  }
}

await main();
