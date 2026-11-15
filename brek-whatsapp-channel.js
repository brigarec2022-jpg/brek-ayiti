(()=>{'use strict';
 const url='https://whatsapp.com/channel/0029VbELR47EwEk0elDF1g0N/100';
 function link(){
  const a=document.createElement('a');
  a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  a.dataset.brekWhatsappChannel='true';
  a.className='brek-whatsapp-channel';
  a.textContent='WhatsApp — Chaîne BREK-AYITI';
  a.setAttribute('aria-label','Suivre la chaîne WhatsApp BREK-AYITI (nouvel onglet)');
  return a;
 }
 function mount(){
  const social=[...document.querySelectorAll('[aria-label]')].filter(el=>/réseaux sociaux|rezo sosyal/i.test(el.getAttribute('aria-label')||''));
  if(social.length){
   for(const host of social)if(!host.querySelector('[data-brek-whatsapp-channel]'))host.append(link());
  }else{
   const footer=document.querySelector('footer');
   if(footer&&!footer.querySelector('[data-brek-whatsapp-channel]')){
    const p=document.createElement('p');p.className='brek-whatsapp-channel-row';p.append(link());footer.append(p);
   }
  }
 }
 new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();
})();
