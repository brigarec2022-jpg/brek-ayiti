(()=>{
 // Ajoute « Baromètre électoral » dans chaque menu du site (bureau et mobile), juste après « Sensibilisation ».
 const href='/barometre/';
 const ANCRE=/^(Sensibilisation|Sansibilizasyon|Actualités|Nouvèl|News)$/i;
 function install(){
   if(!document.body)return;
   const ancres=[...document.querySelectorAll('header a, nav a, [role="dialog"] a, aside a')]
     .filter(a=>ANCRE.test((a.textContent||'').trim())&&!a.closest('#brek-mobile-barometre')&&!a.closest('main section p'));
   const vus=new Set();
   for(const a of ancres){
     const menu=a.parentElement?.closest('nav,header,ul,div')||a.parentElement;
     if(!menu||vus.has(menu))continue;vus.add(menu);
     if(menu.querySelector('[data-brek-barometre]'))continue;
     // préférer « Sensibilisation » comme point d'insertion dans ce menu
     const ici=[...menu.querySelectorAll('a')].find(x=>/^(Sensibilisation|Sansibilizasyon)$/i.test((x.textContent||'').trim()))||a;
     const lien=ici.cloneNode(false);
     lien.removeAttribute('aria-current');lien.removeAttribute('target');
     lien.href=href;lien.textContent='Baromètre électoral';lien.dataset.brekBarometre='1';
     lien.addEventListener('click',e=>{e.stopPropagation();location.href=href});
     const bloc=ici.parentElement&&ici.parentElement.children.length===1&&/^(LI|DIV)$/.test(ici.parentElement.tagName)?ici.parentElement:null;
     if(bloc){const b=bloc.cloneNode(false);b.appendChild(lien);bloc.insertAdjacentElement('afterend',b)}
     else ici.insertAdjacentElement('afterend',lien);
   }
   if(!document.getElementById('brek-mobile-barometre')){
     const p=document.createElement('a');
     p.id='brek-mobile-barometre';p.href=href;
     p.textContent='🗳️ Baromètre';
     p.setAttribute('aria-label','Ouvrir le Baromètre électoral BREK');
     document.body.appendChild(p);
   }
 }
 const css=document.createElement('style');
 css.textContent=`#brek-mobile-barometre{display:none!important}
 @media(max-width:800px){
 #brek-mobile-barometre{display:flex!important;position:fixed;bottom:calc(14px + env(safe-area-inset-bottom,0px));left:14px;z-index:2147483000;align-items:center;white-space:nowrap;box-sizing:border-box;padding:11px 16px;border-radius:999px;background:#a80024;color:#fff!important;text-decoration:none!important;font:700 14px/1.3 system-ui,sans-serif;box-shadow:0 5px 18px #0005;border:2px solid #fff4}
 body{padding-bottom:76px!important}
 }`;
 document.head.appendChild(css);
 let t=null;const run=()=>{clearTimeout(t);t=setTimeout(install,60)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
 new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();
