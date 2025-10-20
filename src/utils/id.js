export function randomId(prefix = "") {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix ? prefix + '-' : ''}${ts}-${rnd}`;
}

