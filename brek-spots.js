(()=>{
 // Carte « Spot » en tête de la rubrique « À la une » de la page d'accueil
 const SPOT={href:'/spots/le-temps-du-serieux/',img:'/spots/le-temps-du-serieux/affiche.jpg',kicker:'SPOT · BREK-AYITI · 16 NOVEMBRE 2026',title:'Le temps du sérieux',text:'La course aux inscriptions est terminée. Celle de la crédibilité commence. Regardez et partagez le spot.'};
 function mount(){for(const host of [document.querySelector('#news'),...document.querySelectorAll('section')].filter(Boolean)){
  if(host.querySelector('[data-spot-card]'))continue;const h=host.querySelector('h1,h2');if(!h||!(/À la une/i.test(h.textContent)||host.id==='news'))continue;
  const c=document.createElement('article');c.dataset.spotCard='1';
  c.style.cssText='margin:24px auto;padding:20px;background:#0b0b0b;color:#fff;border:3px solid #c99a3c;border-radius:14px;max-width:1100px';
  c.innerHTML=`<a href="${SPOT.href}" style="color:inherit;text-decoration:none;display:block"><div style="position:relative"><img src="${SPOT.img}" alt="Spot BREK-AYITI : ${SPOT.title}" style="width:100%;height:auto;border-radius:8px;display:block"><span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:84px;height:84px;border-radius:50%;background:#a21919e6;display:grid;place-items:center;font:700 34px Arial;color:#fff;box-shadow:0 6px 20px #0008">▶</span></div><p style="color:#e2bd5c;font:800 14px Arial,sans-serif;letter-spacing:2px;margin:14px 0 4px">${SPOT.kicker}</p><h2 style="margin:0 0 6px;color:#fff">${SPOT.title}</h2><p style="margin:0 0 8px;color:#eee">${SPOT.text}</p><strong style="color:#e2bd5c">Regarder le spot →</strong></a>`;
  if(host.id==='news')host.prepend(c);else h.insertAdjacentElement('afterend',c)}}
 new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
