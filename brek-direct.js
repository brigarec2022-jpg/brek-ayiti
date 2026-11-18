/* BREK-TV : quand un direct est actif (tv/direct.json), bandeau « EN DIRECT » sur toutes les pages
   + lecteur du direct dans l'onglet Télévision de l'accueil. Disparaît tout seul quand actif=false. */
(function(){
  var D=null, esc=function(s){return String(s||'').replace(/[<>&"]/g,'')};
  function banner(){
    if(document.getElementById('brek-live-bar'))return;
    var onTv=/^\/tv\/?$/.test(location.pathname);
    var a=document.createElement('a');
    a.id='brek-live-bar'; a.href=onTv?'#partenaire':'/tv/#partenaire';
    a.innerHTML='<span class="bl-dot"></span><b>EN DIRECT</b><span class="bl-t">'+esc(D.titre||'Direct sur BREK-TV').replace(/^En direct\s*:\s*/i,'')+'</span><span class="bl-btn">▶ Regarder</span>';
    var st=document.createElement('style');
    st.textContent='#brek-live-bar{position:sticky;top:0;z-index:2147483000;display:flex;align-items:center;gap:12px;padding:10px 16px;background:linear-gradient(90deg,#b0001a,#e0172b);color:#fff;text-decoration:none;font:600 15px/1.3 Arial,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,.25)}'+
      '#brek-live-bar b{letter-spacing:1.5px;font-weight:900;white-space:nowrap}#brek-live-bar .bl-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
      '#brek-live-bar .bl-btn{white-space:nowrap;background:#fff;color:#b0001a;border-radius:20px;padding:6px 14px;font-weight:900}'+
      '#brek-live-bar .bl-dot{width:12px;height:12px;border-radius:50%;background:#fff;flex:none;animation:blp 1.2s infinite}'+
      '@keyframes blp{0%{box-shadow:0 0 0 0 rgba(255,255,255,.9)}70%{box-shadow:0 0 0 10px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}'+
      '@media(max-width:600px){#brek-live-bar{font-size:13px;gap:8px;padding:9px 12px}#brek-live-bar .bl-btn{padding:5px 10px}}';
    document.head.appendChild(st); document.body.insertBefore(a,document.body.firstChild);
  }
  function player(){
    document.querySelectorAll('iframe[src*="live_stream?channel=UCYsddSPNqns5DrNa_5XtdGg"]').forEach(function(f){
      if(f.dataset.brekDirect||/^\/tv\/?$/.test(location.pathname))return; f.dataset.brekDirect='1';
      f.src='https://www.youtube.com/embed/'+encodeURIComponent(D.video)+'?rel=0'; f.title=D.titre||'Direct partenaire';
      var p=document.createElement('p'); p.style.cssText='margin:10px auto 0;max-width:720px;font:700 16px Arial,sans-serif;color:#7a0612';
      p.innerHTML='📡 '+esc(D.titre||'Direct partenaire')+'<br><span style="font-weight:400;font-size:13px;color:#5c4a2e">Direct diffusé par '+esc(D.chaine||'une chaîne partenaire')+', relayé par BREK-TV. <a href="/tv/" style="color:#9d0826">Ouvrir BREK-TV ↗</a></span>';
      var box=f.parentElement; if(box&&box.parentElement) box.parentElement.insertBefore(p,box.nextSibling);
    });
  }
  function apply(){ if(D&&D.actif&&D.video){banner();player();} }
  fetch('/tv/direct.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(d){D=d;apply();
    if(D.actif) new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});}).catch(function(){});
})();
