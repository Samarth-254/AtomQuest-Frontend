export function progressScore(items = []) {
  if (!items.length) {
    return 0;
  }

  const total = items.reduce((sum, item) => sum + (item.score ?? 0), 0);
  return Math.round(total / items.length);
}
