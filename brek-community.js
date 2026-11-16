(()=>{'use strict';
const config=window.BREK_COMMUNITY||{};
let sdk,readyPromise,returnFocus;
let subscriptionState='checking';
const subscribeButtons=new Set();
const transientLikes=new Map();
function readLike(key,value){for(const storeName of ['localStorage','sessionStorage']){try{const store=window[storeName];if(!store)continue;if(typeof value==='boolean')store.setItem(key,value?'1':'0');return {liked:store.getItem(key)==='1',local:true,transient:storeName==='sessionStorage'};}catch{}}if(typeof value==='boolean')transientLikes.set(key,value);return {liked:transientLikes.get(key)===true,local:true,transient:true};}
function syncSubscription(){
 const permission=typeof Notification==='undefined'?'default':Notification.permission;
 const subscription=sdk?.User?.PushSubscription;
 if(permission==='denied')subscriptionState='inactive';
 else if(subscription&&typeof subscription.optedIn==='boolean')subscriptionState=subscription.optedIn?'active':'inactive';
 renderSubscription();
}
function renderSubscription(){
 const active=subscriptionState==='active',checking=subscriptionState==='checking';
 const blocked=typeof Notification!=='undefined'&&Notification.permission==='denied';
 const label=active?tr('✓ Abonné','✓ Abòne deja'):checking?tr('Vérification…','Verifikasyon…'):blocked?tr('Notifications bloquées','Notifikasyon bloke'):tr('🔔 S’abonner','🔔 Abòne');
 for(const b of subscribeButtons){if(b.textContent!==label)b.textContent=label;b.disabled=checking;b.dataset.subscriptionState=subscriptionState;b.setAttribute('aria-label',active?tr('Déjà abonné : gérer mes notifications','Ou abòne deja : jere notifikasyon mwen yo'):label);}
 if(typeof push!=='undefined'){const pushLabel=active?tr('✓ Notifications activées','✓ Notifikasyon aktive'):tr('🔔 Notifications sur cet appareil','🔔 Notifikasyon sou aparèy sa a');if(push.textContent!==pushLabel)push.textContent=pushLabel;push.disabled=checking||active;stop.hidden=!active;}
 if(dialog.open){const title=active?tr('Mon abonnement à BREK-AYITI','Abònman mwen ak BREK-AYITI'):tr('S’abonner à BREK-AYITI','Abòne ak BREK-AYITI');if(dialog.querySelector('h2').textContent!==title)dialog.querySelector('h2').textContent=title;}
}
function registerSubscribe(b){subscribeButtons.add(b);return b;}
const ht=()=>document.documentElement.lang==='ht';
const tr=(fr,kr)=>ht()?kr:fr;
const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b;};
const dialog=document.createElement('dialog');dialog.className='brek-community-dialog';dialog.setAttribute('aria-labelledby','brek-community-title');
dialog.innerHTML='<button type="button" class="brek-close" aria-label="Fermer / Fèmen">×</button><h2 id="brek-community-title">S’abonner à BREK-AYITI</h2><p>Recevez nos nouveaux articles, prises de position et émissions.</p><div class="brek-options"></div><p role="status" aria-live="polite" class="brek-community-status"></p><small>Choisissez librement votre canal. Les inscriptions et les envois sont gérés par OneSignal. Vous pourrez couper les notifications ici et vous désabonner des emails via leur lien de désabonnement.</small>';
document.body.append(dialog);
const options=dialog.querySelector('.brek-options'),status=dialog.querySelector('[role=status]');
dialog.querySelector('.brek-close').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>returnFocus?.focus());
function open(){returnFocus=document.activeElement;status.textContent='';dialog.querySelector('h2').textContent=tr('S’abonner à BREK-AYITI','Abòne ak BREK-AYITI');dialog.showModal();renderSubscription();if(subscriptionState==='error')init().catch(failure);}
function init(){
 if(readyPromise)return readyPromise;
 if(!/^(brek-ayiti\.pages\.dev|localhost|127\.0\.0\.1)$/.test(location.hostname))return Promise.reject(Error('wrong_host'));
 if(!/^[0-9a-f-]{36}$/i.test(config.oneSignalAppId||''))return Promise.reject(Error('not_configured'));
 readyPromise=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('timeout')),15000);
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  window.OneSignalDeferred.push(async os=>{try{
   await os.init({appId:config.oneSignalAppId,serviceWorkerPath:'/OneSignalSDKWorker.js',notifyButton:{enable:false}});
   sdk=os;os.User.PushSubscription.addEventListener('change',syncSubscription);os.Notifications.addEventListener('permissionChange',syncSubscription);syncSubscription();clearTimeout(timer);resolve(os);
  }catch(e){clearTimeout(timer);reject(e);}});
  const s=document.createElement('script');s.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';s.defer=true;s.onerror=()=>{s.remove();clearTimeout(timer);reject(Error('network'));};if(!document.querySelector('script[data-brek-onesignal]')){s.dataset.brekOnesignal='true';document.head.append(s);}
 });readyPromise=readyPromise.catch(e=>{readyPromise=undefined;subscriptionState='error';renderSubscription();throw e;});return readyPromise;
}
function failure(e){if(e&&e.message==='wrong_host'){status.textContent=tr('Les notifications fonctionnent sur le site officiel : ','Notifikasyon yo mache sou sit ofisyèl la : ');const a=document.createElement('a');a.href='https://brek-ayiti.pages.dev'+location.pathname+location.search+location.hash;a.textContent='brek-ayiti.pages.dev';status.append(a);return;}status.textContent=e.message==='not_configured'?tr('Les abonnements ne sont pas encore ouverts. Revenez bientôt.','Abònman yo poko ouvè. Retounen byento.'):tr('Le service ne répond pas. Réessayez plus tard.','Sèvis la pa reponn. Eseye ankò pita.');if(e&&e.message&&e.message!=='not_configured'){const d=document.createElement('small');d.style.cssText='display:block;margin-top:6px;opacity:.7;word-break:break-word';d.textContent='Détail : '+String(e.message).slice(0,180);status.append(d);}}
const push=button('🔔 Notifications sur cet appareil',async()=>{
 try{push.disabled=true;const os=await init();
  if(!os.Notifications.isPushSupported()){status.textContent='Sur iPhone/iPad, ajoutez le site à l’écran d’accueil puis ouvrez-le depuis son icône. Sinon, choisissez les emails.';return;}
  syncSubscription();if(subscriptionState==='active')return;
  if(os.Notifications.permissionNative==='denied'){status.textContent=tr('Les notifications sont bloquées dans ce navigateur. Autorisez-les dans les paramètres du site.','Navigatè sa a bloke notifikasyon yo. Otorize yo nan paramèt sit la.');return;}
  status.textContent=tr('Autorisez les notifications dans la fenêtre qui s’ouvre…','Otorize notifikasyon yo nan fenèt k ap louvri a…');
  if(!os.Notifications.permission){await os.Notifications.requestPermission();}
  if(typeof Notification!=='undefined'&&Notification.permission==='denied'){status.textContent=tr('Les notifications sont bloquées sur cet appareil. Ouvrez Paramètres → Applications → Chrome (ou BREK-AYITI) → Notifications, autorisez-les, puis réessayez.','Notifikasyon yo bloke sou aparèy sa a. Louvri Paramèt → Aplikasyon → Chrome (oswa BREK-AYITI) → Notifikasyon, otorize yo, epi eseye ankò.');return;}
  await os.User.PushSubscription.optIn();
  await new Promise(r=>setTimeout(r,1500));syncSubscription();
  status.textContent=subscriptionState==='active'?tr('✓ C’est fait : vous recevrez les notifications de BREK-AYITI sur cet appareil.','✓ Sa fèt : w ap resevwa notifikasyon BREK-AYITI sou aparèy sa a.'):tr('L’abonnement n’a pas abouti. Réessayez dans un instant.','Abònman an pa pase. Eseye ankò nan yon ti moman.');
 }catch(e){failure(e);}finally{renderSubscription();}
});
function updatePush(){syncSubscription();}
const email=button('✉ Recevoir les nouvelles par email',async()=>{
 if(!config.emailEnabled){status.textContent=tr('Les abonnements par email ne sont pas encore ouverts.','Abònman pa imel yo poko ouvè.');return;}
 try{const os=await init();dialog.close();await os.Slidedown.promptEmail();}catch(e){if(!dialog.open)dialog.showModal();failure(e);}
});
const stop=button('Désactiver les notifications de cet appareil',async()=>{
 try{const os=await init();await os.User.PushSubscription.optOut();updatePush();status.textContent='Notifications désactivées sur cet appareil.';}catch(e){failure(e);}
});options.append(push,...(config.emailEnabled?[email]:[]),stop);
const floating=registerSubscribe(button('Vérification…',open));floating.className='brek-subscribe-floating';document.body.append(floating);
let visitor;
function visitorId(){if(visitor)return visitor;try{visitor=localStorage.getItem('brek-visitor');if(!/^[0-9a-f-]{36}$/i.test(visitor||'')){visitor=crypto.randomUUID();localStorage.setItem('brek-visitor',visitor);}}catch{visitor=crypto.randomUUID();}return visitor;}
async function api(post,liked){
 if(!config.apiBase){
  const key='brek-like:'+post;
  return readLike(key,liked);
 }
 const url=new URL('/likes',config.apiBase);let opts={};
 if(typeof liked==='boolean')opts={method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({post,visitor:visitorId(),liked})};
 else{url.searchParams.set('post',post);url.searchParams.set('visitor',visitorId());}
 const r=await fetch(url,opts);if(!r.ok)throw Error('unavailable');return r.json();
}
function bar(post){
 const el=document.createElement('div');el.className='brek-community-bar';el.dataset.brekPost=post;
 const msg=document.createElement('span');msg.className='brek-community-status';msg.setAttribute('role','status');
 let liked=false;
 const like=button('♡ J’aime',async()=>{like.disabled=true;try{const s=await api(post,!liked);show(s);msg.textContent=s.transient?tr('Mention enregistrée pour cette session ; le navigateur bloque le stockage permanent.','Like anrejistre pou sesyon sa a; navigatè a bloke anrejistreman pèmanan.'):s.local?(s.liked?tr('Votre mention J’aime est enregistrée sur cet appareil.','Like ou a anrejistre sou aparèy sa a.'):tr('Mention J’aime retirée sur cet appareil.','Like la retire sou aparèy sa a.')):'';}catch{msg.textContent=tr('Les mentions J’aime sont momentanément indisponibles.','Like yo poko disponib.');}finally{like.disabled=false;}});like.setAttribute('aria-pressed','false');
 function show(s){liked=s.liked;like.setAttribute('aria-pressed',String(liked));like.textContent=(liked?'♥':'♡')+' '+tr(liked?'Aimé':'J’aime',liked?'Ou renmen l':'M renmen')+(s.local?'':' · '+s.count);if(s.local)like.title=tr('Mention conservée sur cet appareil, sans compteur public.','Like konsève sou aparèy sa a, san kontè piblik.');}
 const share=button('↗ Partager',()=>{
  const sharePath=post.startsWith('/#')?'/partage/'+post.slice(2)+'/':post;
  const target=new URL(sharePath,location.origin);
  const url=target.href;
  const chooser=document.createElement('dialog');chooser.className='brek-community-dialog';chooser.setAttribute('aria-label','Partager cet article');
  const title=document.createElement('h2');title.textContent=tr('Partager cet article','Pataje atik sa a');
  const field=document.createElement('input');field.type='url';field.readOnly=true;field.value=url;field.setAttribute('aria-label','Lien de partage');field.style.cssText='box-sizing:border-box;width:100%;font:16px Arial;padding:12px;margin:12px 0';
  const feedback=document.createElement('p');feedback.setAttribute('role','status');
  const copy=button(tr('Copier le lien','Kopye lyen an'),async()=>{
   try{await navigator.clipboard.writeText(url);feedback.textContent=tr('Lien copié ✓','Lyen an kopye ✓');}
   catch{field.focus();field.select();feedback.textContent=tr('Appuyez sur Ctrl+C ou faites un appui long pour copier le lien sélectionné.','Peze Ctrl+C oswa peze lontan pou kopye lyen ki seleksyone a.');}
  });
  const wa=document.createElement('a');wa.textContent='WhatsApp';wa.href='https://wa.me/?text='+encodeURIComponent(url);wa.target='_blank';wa.rel='noopener noreferrer';wa.style.cssText='display:inline-block;padding:10px 18px;color:#176b3e;font-weight:bold';
  const close=button(tr('Fermer','Fèmen'),()=>chooser.close());
  chooser.append(title,field,copy,wa);
  if(navigator.share)chooser.append(button(tr('Autres applications','Lòt aplikasyon'),async()=>{
   try{await navigator.share({title:document.title,url});}catch(e){if(e.name!=='AbortError')feedback.textContent=tr('Partage système indisponible : utilisez Copier le lien ou WhatsApp.','Pataj sistèm nan pa disponib: itilize Kopye lyen an oswa WhatsApp.');}
  }));
  chooser.append(feedback,close);document.body.append(chooser);chooser.addEventListener('close',()=>{chooser.remove();share.focus();});chooser.showModal();
 });
 const subscribe=registerSubscribe(button('Vérification…',open));subscribe.className='brek-subscribe';el.append(like,share,subscribe,msg);
 api(post).then(show).catch(()=>{msg.textContent=config.apiBase?'Compteur indisponible.':'Le stockage local est indisponible sur cet appareil.';});
 return el;
}
function mount(){
 let post=location.pathname.replace(/\/index\.html$/,'/').replace(/\/?$/,'/');
 if(post==='/'&&/^#(?:news-[a-z0-9-]+|justice|sdm|mairies|administration|securite-routiere|identite-circulation)$/.test(location.hash))post='/'+location.hash;
 document.querySelectorAll('[data-brek-post]').forEach(b=>{if(b.dataset.brekPost!==post)b.remove();});
 if(/^(?:\/(news|articles|editorial)\/[a-z0-9-]+\/|\/editorial\/|\/#(?:news-[a-z0-9-]+|justice|sdm|mairies|administration|securite-routiere|identite-circulation))$/.test(post)&&!document.querySelector('[data-brek-post]')){
  const article=document.querySelector('main article')||document.querySelector('main');if(article){article.append(bar(post));}
 }
 renderSubscription();
}
let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;mount();});}}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('hashchange',mount);
window.addEventListener('pageshow',()=>{syncSubscription();if(!sdk)init().catch(()=>{});});
window.addEventListener('focus',syncSubscription);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncSubscription();});
mount();init().catch(()=>{});
})();
