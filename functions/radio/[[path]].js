// Radio BREK : sert les MP3 avec prise en charge des requêtes « Range » (206),
// indispensable pour que le lecteur se place au bon endroit (radio synchronisée).
export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (!url.pathname.endsWith('.mp3')) return next();
  const res = await env.ASSETS.fetch(new Request(url.origin + url.pathname, { method: 'GET' }));
  if (!res.ok || !res.body) return res;
  let size = Number(res.headers.get('content-length')) || 0;
  let body = res.body;
  if (!size) { const buf = new Uint8Array(await res.arrayBuffer()); size = buf.byteLength; body = new Response(buf).body; }
  const base = {
    'content-type': 'audio/mpeg',
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=3600',
    'x-content-type-options': 'nosniff',
  };
  const range = request.headers.get('range');
  const m = range && size ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (!m) {
    if (request.method === 'HEAD') return new Response(null, { headers: { ...base, 'content-length': String(size) } });
    return new Response(body, { headers: { ...base, ...(size ? { 'content-length': String(size) } : {}) } });
  }
  let start, end;
  if (m[1] === '') { const n = Number(m[2]); start = Math.max(0, size - n); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (!(start <= end) || start >= size) {
    return new Response(null, { status: 416, headers: { ...base, 'content-range': `bytes */${size}` } });
  }
  const headers = { ...base, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) };
  if (request.method === 'HEAD') return new Response(null, { status: 206, headers });
  // Découpe en flux, sans charger tout le fichier en mémoire
  let pos = 0;
  const cut = new TransformStream({
    transform(chunk, ctl) {
      const a = pos, b = pos + chunk.byteLength; pos = b;
      if (b <= start || a > end) return;
      ctl.enqueue(chunk.subarray(Math.max(0, start - a), Math.min(chunk.byteLength, end + 1 - a)));
    },
  });
  return new Response(body.pipeThrough(cut), { status: 206, headers });
}
