/* BREK-TV : si un direct partenaire est actif (tv/direct.json), l'afficher aussi dans l'onglet BREK-TV de l'accueil */
(function(){
  var D=null;
  function apply(){
    if(!D||!D.actif||!D.video)return;
    document.querySelectorAll('iframe[src*="live_stream?channel=UCYsddSPNqns5DrNa_5XtdGg"]').forEach(function(f){
      if(f.dataset.brekDirect)return;f.dataset.brekDirect='1';
      f.src='https://www.youtube.com/embed/'+encodeURIComponent(D.video)+'?rel=0';
      f.title=D.titre||'Direct partenaire';
      var p=document.createElement('p');
      p.style.cssText='margin:10px auto 0;max-width:720px;font:700 16px Arial,sans-serif;color:#7a0612';
      p.innerHTML='📡 '+(D.titre?D.titre.replace(/[<>&]/g,''):'Direct partenaire')+
        '<br><span style="font-weight:400;font-size:13px;color:#5c4a2e">Direct diffusé par '+(D.chaine?D.chaine.replace(/[<>&]/g,''):'une chaîne partenaire')+', relayé par BREK-TV. <a href="/tv/" style="color:#9d0826">Ouvrir BREK-TV ↗</a></span>';
      var box=f.parentElement; if(box&&box.parentElement) box.parentElement.insertBefore(p,box.nextSibling);
    });
  }
  fetch('/tv/direct.json?t='+Date.now()).then(function(r){return r.json()}).then(function(d){D=d;apply();
    new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});}).catch(function(){});
})();
