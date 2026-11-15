(() => {
  const match = location.pathname.match(/^\/i\/([a-f0-9]{24})\/?$/i);
  const code = match ? match[1].toLowerCase() : new URLSearchParams(location.search).get('ref');
  const target = new URL('https://brek-ayiti.jguillaume112.chatgpt.site/');
  if (code && /^[a-f0-9]{24}$/i.test(code)) target.searchParams.set('ref', code.toLowerCase());
  target.hash = 'membre';
  document.getElementById('join').href = target.href;
})();
