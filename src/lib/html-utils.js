export function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function highlight(text, indices) {
  if (!indices || !indices.length) return escHtml(text);
  const indexSet = new Set(indices);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = escHtml(text[i]);
    out += indexSet.has(i) ? `<mark>${ch}</mark>` : ch;
  }
  return out;
}
