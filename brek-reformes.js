(()=>{
const PNH='/reformes/integrite-pnh/';
function navLink(){
  document.querySelectorAll('a[href="#programme"]').forEach(a=>{
    if(a.dataset.reformesNav||!a.closest('header'))return;
    a.dataset.reformesNav='true';
    if(a.parentElement.querySelector('[data-reformes-link]'))return;
    const r=a.cloneNode(true);r.removeAttribute('data-reformes-nav');r.dataset.reformesLink='true';r.href='/reformes/';r.textContent='Réformes';
    const wrap=a.parentElement.tagName==='LI'?a.parentElement:null;
    if(wrap){const li=wrap.cloneNode(false);li.append(r);wrap.after(li)}else a.after(r);
  });
}
function programmeBlock(){
  if(document.querySelector('[data-reformes-block]'))return;
  const h=[...document.querySelectorAll('h1')].find(x=>/Notre programme/i.test(x.textContent));
  if(!h)return;
  const anchor=(h.nextElementSibling&&h.nextElementSibling.tagName==='P')?h.nextElementSibling:h;
  const b=document.createElement('section');b.dataset.reformesBlock='true';
  b.style.cssText='margin:24px 0;padding:24px;background:#fff9ec;color:#191919;border:2px solid #a21919;border-radius:14px;font-family:Georgia,serif';
  b.innerHTML='<p style="color:#941717;font:bold 14px/1.4 Arial,sans-serif;letter-spacing:1px;margin:0">RÉFORMES ET PROPOSITIONS · REFÒM AK PWOPOZISYON</p><h2 style="margin:8px 0">Refonder l’État, chantier par chantier</h2><ol style="line-height:1.8;margin:8px 0 12px"><li><a href="/#sdm" style="color:#a11a20">Le SDM — texte fondateur de 2018</a></li><li>Réforme de l’État civil — <em>en révision</em></li><li>Émission du passeport — <em>en révision</em></li><li><a href="'+PNH+'" style="color:#a11a20"><strong>Une police propre pour un peuple protégé</strong></a> — nouveau</li></ol><a href="/reformes/" style="display:inline-block;padding:12px 18px;background:#a11a20;color:#fff;border-radius:10px;text-decoration:none;font:bold 16px Arial,sans-serif">Découvrir les réformes · Dekouvri refòm yo</a>';
  anchor.after(b);
}
function uneCard(){
  for(const host of [document.querySelector('#news'),...document.querySelectorAll('section')].filter(Boolean)){
    if(host.querySelector('[data-pnh-card]'))continue;
    const heading=host.querySelector('h1,h2');
    if(!heading||!(/À la une/i.test(heading.textContent)||host.id==='news'))continue;
    const c=document.createElement('article');c.dataset.pnhCard='true';
    c.style.cssText='margin:24px auto;padding:24px;background:#fff9ec;color:#191919;border:2px solid #a21919;border-radius:14px;max-width:1100px';
    c.innerHTML='<a href="'+PNH+'" style="color:inherit;text-decoration:none"><img src="'+PNH+'couverture.webp" alt="Illustration conceptuelle : agents de la PNH, arme saisie sous scellés et registre de traçabilité" style="width:100%;height:auto;border-radius:8px"><p style="color:#941717;font-weight:bold">RÉFORMES ET PROPOSITIONS · 15 NOVEMBRE 2026</p><h2>Une police propre pour un peuple protégé</h2><p>Contrôle progressif de toute la PNH, traçabilité des armes, enquêtes sur preuves, sans quota d’arrestations. Kote zam yo ye, e kiyès ki te vann yo ?</p><strong>Lire notre proposition →</strong></a>';
    if(host.id==='news')host.prepend(c);else heading.insertAdjacentElement('afterend',c);
  }
}
function mount(){navLink();programmeBlock();uneCard()}
new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();
})();
