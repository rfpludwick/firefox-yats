import { resolveFaviconUrl } from "./url-utils.js";
import { faviconLetter } from "./entries.js";

export function faviconEl(entry) {
  const letter = faviconLetter(entry);
  const faviconUrl = resolveFaviconUrl(entry);
  if (faviconUrl) {
    const img = document.createElement("img");
    img.className = "favicon";
    img.src = faviconUrl;
    img.alt = "";
    img.dataset.letter = letter;
    img.loading = "lazy";
    img.decoding = "async";
    return img;
  }
  const div = document.createElement("div");
  div.className = "favicon-fallback";
  div.textContent = letter;
  return div;
}

const GROUP_COLORS = new Set([
  "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange",
]);

function groupColorClass(color) {
  return GROUP_COLORS.has(color) ? color : "grey";
}

function badgeEl(className, content) {
  const span = document.createElement("span");
  span.className = className;
  if (content instanceof Node) span.appendChild(content);
  else span.textContent = content;
  return span;
}

export function resultRowEl(match, index, helpers) {
  const { entry, titleIndices, groupIndices, urlIndices } = match;
  const badge = helpers.entryBadge(entry);
  const displayUrlText = helpers.urlTextFor(entry);
  const subtitle = helpers.subtitleFor(entry, displayUrlText);

  const li = document.createElement("li");
  li.id = `result-${index}`;
  li.setAttribute("role", "option");
  li.setAttribute("aria-selected", "false");
  li.dataset.index = String(index);

  li.appendChild(faviconEl(entry));

  const meta = document.createElement("div");
  meta.className = "meta";

  const titleEl = document.createElement("div");
  titleEl.className = "title";
  titleEl.appendChild(helpers.highlight(entry.title || "Untitled", titleIndices));
  meta.appendChild(titleEl);

  const urlEl = document.createElement("div");
  urlEl.className = "url";
  if (subtitle === displayUrlText && urlIndices.length) {
    urlEl.appendChild(helpers.highlight(subtitle, urlIndices));
  } else {
    urlEl.textContent = subtitle;
  }
  meta.appendChild(urlEl);

  li.appendChild(meta);

  const badges = [];
  if (entry.kind === "open" && entry.windowLabel && entry.windowIndex) {
    const paletteIndex = ((entry.windowIndex - 1) % 8) + 1;
    badges.push(badgeEl(`badge badge-window badge-window-${paletteIndex}`, entry.windowLabel));
  }
  if (entry.kind === "open" && entry.groupName) {
    const colorClass = groupColorClass(entry.groupColor);
    badges.push(
      badgeEl(`badge badge-group badge-group-${colorClass}`, helpers.highlight(entry.groupName, groupIndices))
    );
  }
  if (badge) {
    badges.push(badgeEl("badge", badge));
  }
  if (badges.length) {
    const badgesEl = document.createElement("div");
    badgesEl.className = "badges";
    for (const b of badges) badgesEl.appendChild(b);
    li.appendChild(badgesEl);
  }

  return li;
}

export function resultsListFragment(matches, helpers) {
  const fragment = document.createDocumentFragment();
  matches.forEach((m, i) => fragment.appendChild(resultRowEl(m, i, helpers)));
  return fragment;
}
