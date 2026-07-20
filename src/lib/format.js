export function formatLastVisit(ms, now = Date.now()) {
  if (!ms) return "";
  const diff = now - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Visited just now";
  if (mins < 60) return `Visited ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Visited ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Visited ${days}d ago`;
  return `Visited ${new Date(ms).toLocaleDateString()}`;
}
