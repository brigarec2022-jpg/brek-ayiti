(()=>{
 const href='/barometre/';
 function install(){
   if(!document.body)return;
   const links=[...document.querySelectorAll('a')];
   if(!links.some(a=>a.dataset.brekBarometre==='1')){
     const candidate=links.find(a=>/News|Sensibilisation|Programme/i.test(a.textContent||'') && !a.closest('#brek-mobile-barometre'));
     if(candidate){
       const a=document.createElement('a');a.href=href;a.textContent='Baromètre électoral';a.dataset.brekBarometre='1';
       a.style.cssText='display:inline-flex;align-items:center;color:#a80024;font-weight:700;text-decoration:none;margin:0 10px;padding:8px 0;white-space:nowrap';
       candidate.insertAdjacentElement('afterend',a);
     }
   }
   if(!document.getElementById('brek-mobile-barometre')){
     const a=document.createElement('a');
     a.id='brek-mobile-barometre';a.href=href;
     a.textContent='🗳️ Baromètre électoral';
     a.setAttribute('aria-label','Ouvrir le Baromètre électoral BREK');
     document.body.appendChild(a);
   }
 }
 const css=document.createElement('style');
 css.textContent=`#brek-mobile-barometre{display:none!important}
 @media(max-width:800px){
 #brek-mobile-barometre{display:flex!important;position:fixed;bottom:calc(14px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);z-index:2147483000;align-items:center;justify-content:center;white-space:nowrap;max-width:calc(100vw - 28px);box-sizing:border-box;padding:12px 18px;border-radius:999px;background:#a80024;color:#fff!important;text-decoration:none!important;font:700 14px/1.3 system-ui,sans-serif;box-shadow:0 5px 18px #0005;border:2px solid #fff4}
 body{padding-bottom:76px!important}
 }`;
 document.head.appendChild(css);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
 new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})();
