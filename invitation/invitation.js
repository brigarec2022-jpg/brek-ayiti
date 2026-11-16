(() => {
  // Lien d'invitation : /i/CODE ou ?ref=CODE → espace membre de BREK (aucun service extérieur)
  const match = location.pathname.match(/^\/i\/([a-z0-9]{6,24})\/?$/i);
  const code = match ? match[1] : new URLSearchParams(location.search).get('ref');
  const target = new URL('/membre/', location.origin);
  if (code && /^[a-z0-9]{8}$/i.test(code)) target.searchParams.set('ref', code.toUpperCase());
  document.getElementById('join').href = target.href;
})();
