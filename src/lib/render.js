import { escHtml } from "./html-utils.js";
import { resolveFaviconUrl } from "./url-utils.js";
import { faviconLetter } from "./entries.js";

export function faviconHtml(entry) {
  const letter = faviconLetter(entry);
  const faviconUrl = resolveFaviconUrl(entry);
  if (faviconUrl) {
    return `<img class="favicon" src="${escHtml(faviconUrl)}" alt="" data-letter="${escHtml(letter)}" loading="lazy" decoding="async" />`;
  }
  return `<div class="favicon-fallback">${escHtml(letter)}</div>`;
}

const GROUP_COLORS = new Set([
  "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange",
]);

function groupColorClass(color) {
  return GROUP_COLORS.has(color) ? color : "grey";
}

export function resultRowHtml(match, index, helpers) {
  const { entry, titleIndices, groupIndices, urlIndices } = match;
  const badge = helpers.entryBadge(entry);
  const displayUrlText = helpers.urlTextFor(entry);
  const subtitle = helpers.subtitleFor(entry, displayUrlText);
  const urlHtml =
    subtitle === displayUrlText && urlIndices.length
      ? helpers.highlight(subtitle, urlIndices)
      : escHtml(subtitle);
  const badges = [];
  if (entry.kind === "open" && entry.windowLabel && entry.windowIndex) {
    const paletteIndex = ((entry.windowIndex - 1) % 8) + 1;
    badges.push(
      `<span class="badge badge-window badge-window-${paletteIndex}">${escHtml(entry.windowLabel)}</span>`
    );
  }
  if (entry.kind === "open" && entry.groupName) {
    const colorClass = groupColorClass(entry.groupColor);
    badges.push(
      `<span class="badge badge-group badge-group-${colorClass}">${helpers.highlight(entry.groupName, groupIndices)}</span>`
    );
  }
  if (badge) {
    badges.push(`<span class="badge">${escHtml(badge)}</span>`);
  }
  const badgesHtml = badges.length
    ? `<div class="badges">${badges.join("")}</div>`
    : "";
  return `<li id="result-${index}" role="option" aria-selected="false" data-index="${index}">
    ${faviconHtml(entry)}
    <div class="meta">
      <div class="title">${helpers.highlight(entry.title || "Untitled", titleIndices)}</div>
      <div class="url">${urlHtml}</div>
    </div>
    ${badgesHtml}
  </li>`;
}

export function resultsListHtml(matches, helpers) {
  return matches
    .map((m, i) => resultRowHtml(m, i, helpers))
    .join("");
}
