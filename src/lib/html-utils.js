/** Builds a fragment of text nodes with matched-index runs wrapped in <mark>. */
export function highlight(text, indices) {
  const fragment = document.createDocumentFragment();
  if (!indices || !indices.length) {
    fragment.appendChild(document.createTextNode(text));
    return fragment;
  }
  const indexSet = new Set(indices);
  let i = 0;
  while (i < text.length) {
    const marked = indexSet.has(i);
    let j = i + 1;
    while (j < text.length && indexSet.has(j) === marked) j++;
    const run = text.slice(i, j);
    if (marked) {
      const mark = document.createElement("mark");
      mark.textContent = run;
      fragment.appendChild(mark);
    } else {
      fragment.appendChild(document.createTextNode(run));
    }
    i = j;
  }
  return fragment;
}
