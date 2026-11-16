// BREK-AYITI · Espace membre (inscription sur invitation, suivi, carte, administration)
// Tout reste dans le Supabase de BREK : fiches dans la base, pièces d'identité dans un dépôt privé.
import {createClient} from "https://esm.sh/@supabase/supabase-js@2"

const SB_URL="https://arefkpzykkhfzoizsbap.supabase.co"
const sb=createClient(SB_URL,"sb_publishable_qSyrtmo9Iijl7eakvc6UnA_7TyEbXC1")
const SITE="https://brek-ayiti.pages.dev"
const KEY="brek-membre-jeton"
const OBJECTIF=12
const DEPTS=["Artibonite","Centre","Grand'Anse","Nippes","Nord","Nord-Est","Nord-Ouest","Ouest","Sud","Sud-Est","Diaspora"]
const app=document.getElementById("app")
const qs=new URLSearchParams(location.search)
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))
const store={get(){try{return localStorage.getItem(KEY)}catch{return null}},set(v){try{localStorage.setItem(KEY,v)}catch{}}}
const photoUrl=p=>p?`${SB_URL}/storage/v1/object/public/membres-photos/${p}`:""
const fold=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-")
const fmtDate=d=>d?new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):""
const TITRE={fondateur:"Fondateur / Concepteur",cofondateur:"Cofondateur",membre:"Membre"}
const TITRE_COUL={fondateur:"#b38a36",cofondateur:"#b9002c",membre:"#206747"}
const STATUT={en_attente:"En attente de vérification",valide:"Membre validé",rejete:"Inscription refusée"}
let geo=null
async function communesOf(dept){
 if(!geo){try{geo=await (await fetch("/barometre/geo-2026.json")).json()}catch{geo=[]}}
 const d=geo.find(g=>fold(g.name)===fold(dept));return d?d.communes.map(c=>c.name):[]}

/* ---------- Images : réduire avant l'envoi (connexions lentes) ---------- */
function shrink(file,max=1600,q=.85){
 if(!/^image\//.test(file.type))return Promise.resolve(file)
 return new Promise((ok,ko)=>{const img=new Image();img.onload=()=>{const s=Math.min(1,max/Math.max(img.width,img.height))
  const c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s)
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);c.toBlob(b=>b?ok(new File([b],"image.jpg",{type:"image/jpeg"})):ko(new Error("Image illisible")),"image/jpeg",q)}
  img.onerror=()=>ko(new Error("Image illisible"));img.src=URL.createObjectURL(file)})}
const rand=()=>crypto.getRandomValues(new Uint32Array(4)).join("-")
async function session(){
 const {data:{session:s}}=await sb.auth.getSession();if(s?.user)return s.user
 const {data,error}=await sb.auth.signInAnonymously();if(error)throw error;return data.user}
async function upload(bucket,uid,file){
 const ext=file.type==="application/pdf"?"pdf":"jpg"
 const path=`${uid}/${rand()}.${ext}`
 const {error}=await sb.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false})
 if(error)throw error;return path}

/* ---------- Caméra : ouvrir l'appareil photo du téléphone ou de l'ordinateur ---------- */
function openCamera(facing="user"){
 return new Promise(async(ok,ko)=>{
  if(!navigator.mediaDevices?.getUserMedia){ko(new Error("nocam"));return}
  let stream,face=facing
  const box=document.createElement("div");box.className="cam"
  box.innerHTML=`<div class="cam-in"><video playsinline autoplay muted></video>
   <div class="actions"><button type="button" data-snap>📸 Prendre la photo</button><button type="button" class="secondary" data-flip>🔄 Changer de caméra</button><button type="button" class="secondary" data-close>Annuler</button></div>
   <p class="error" data-err></p></div>`
  document.body.appendChild(box);const v=box.querySelector("video")
  const stop=()=>stream?.getTracks().forEach(t=>t.stop())
  const start=async()=>{stop();try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:face,width:{ideal:1280},height:{ideal:1280}},audio:false});v.srcObject=stream;v.style.transform=face==="user"?"scaleX(-1)":"none"}
   catch(e){box.querySelector("[data-err]").textContent="Caméra indisponible : autorisez l’accès à la caméra, ou choisissez une photo."}}
  await start()
  box.querySelector("[data-flip]").onclick=()=>{face=face==="user"?"environment":"user";start()}
  box.querySelector("[data-close]").onclick=()=>{stop();box.remove();ko(new Error("cancel"))}
  box.querySelector("[data-snap]").onclick=()=>{if(!v.videoWidth)return;const c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight
   const x=c.getContext("2d");if(face==="user"){x.translate(c.width,0);x.scale(-1,1)}x.drawImage(v,0,0)
   c.toBlob(b=>{stop();box.remove();ok(b)},"image/jpeg",.92)}
 })}

/* ---------- Studio photo : recadrer et ajuster le béret BREK ---------- */
const beretImg=new Image();beretImg.src="/membership/beret-brek.webp"
function studio(root,onChange){
 const S=720;const st={img:null,zoom:1,px:0,py:0,beret:true,bw:.78,bx:.5,by:.2,rot:0}
 root.innerHTML=`<div class="studio"><canvas width="${S}" height="${S}" aria-label="Aperçu de la photo de carte"></canvas>
  <div class="ctrl"><label class="oath"><input type="checkbox" data-k="beret" checked><span>Porter le béret BREK</span></label>
  <div class="field">Position du béret<div class="pad">
   <button type="button" class="secondary" data-move="0,-1" aria-label="Monter le béret">⬆️ Monter</button>
   <button type="button" class="secondary" data-move="-1,0" aria-label="Déplacer le béret à gauche">⬅️</button>
   <button type="button" class="secondary" data-move="1,0" aria-label="Déplacer le béret à droite">➡️</button>
   <button type="button" class="secondary" data-move="0,1" aria-label="Descendre le béret">⬇️ Descendre</button></div>
   <small>Maintenez le bouton appuyé pour aller plus vite.</small></div>
  <label class="field">Taille du béret<input type="range" min="0.35" max="1.4" step="0.01" value="${st.bw}" data-k="bw"></label>
  <label class="field">Inclinaison du béret<input type="range" min="-35" max="35" step="1" value="0" data-k="rot"></label>
  <label class="field">Zoom de la photo<input type="range" min="1" max="2.5" step="0.01" value="1" data-k="zoom"></label>
  <p class="muted">Glissez le béret avec le doigt pour le poser sur la tête. Glissez avec deux doigts, ou en dehors du béret, pour déplacer la photo.</p></div></div>`
 const c=root.querySelector("canvas"),x=c.getContext("2d")
 const draw=()=>{x.fillStyle="#efe3c7";x.fillRect(0,0,S,S);const im=st.img;if(!im)return
  const s=Math.max(S/im.width,S/im.height)*st.zoom,w=im.width*s,h=im.height*s
  x.drawImage(im,(S-w)/2+st.px,(S-h)/2+st.py,w,h)
  if(st.beret&&beretImg.complete){const bw=st.bw*S,bh=bw*beretImg.height/beretImg.width
   x.save();x.translate(st.bx*S,st.by*S);x.rotate(st.rot*Math.PI/180);x.drawImage(beretImg,-bw/2,-bh/2,bw,bh);x.restore()}
  onChange?.()}
 beretImg.onload=draw
 root.querySelectorAll("[data-k]").forEach(i=>i.oninput=()=>{st[i.dataset.k]=i.type==="checkbox"?i.checked:+i.value;draw()})
 root.querySelectorAll("[data-move]").forEach(b=>{const [dx,dy]=b.dataset.move.split(",").map(Number);let t=null
  const step=()=>{st.bx=Math.min(1,Math.max(0,st.bx+dx*.01));st.by=Math.min(1,Math.max(-.15,st.by+dy*.01));draw()}
  const stop=()=>{clearTimeout(t);clearInterval(t);t=null}
  b.addEventListener("pointerdown",e=>{e.preventDefault();stop();step();t=setTimeout(()=>{t=setInterval(step,60)},350)})
  for(const ev of ["pointerup","pointerleave","pointercancel"])b.addEventListener(ev,stop)
  b.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();step()}})})
 let drag=null
 const pos=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
 const onBeret=p=>{if(!st.beret)return false;const bw=st.bw,bh=bw*beretImg.height/beretImg.width;return Math.abs(p.x-st.bx)<bw/2&&Math.abs(p.y-st.by)<bh/2}
 const pointers=new Map()
 c.addEventListener("pointerdown",e=>{c.setPointerCapture(e.pointerId);pointers.set(e.pointerId,pos(e));const p=pos(e)
  drag=pointers.size>1||!onBeret(p)?{mode:"photo",p,px:st.px,py:st.py}:{mode:"beret",p,bx:st.bx,by:st.by};e.preventDefault()})
 c.addEventListener("pointermove",e=>{if(!drag||!pointers.has(e.pointerId))return;pointers.set(e.pointerId,pos(e));const p=pos(e),dx=p.x-drag.p.x,dy=p.y-drag.p.y
  if(drag.mode==="beret"){st.bx=Math.min(1,Math.max(0,drag.bx+dx));st.by=Math.min(1,Math.max(-.1,drag.by+dy))}else{st.px=drag.px+dx*S;st.py=drag.py+dy*S}draw()})
 const end=e=>{pointers.delete(e.pointerId);if(!pointers.size)drag=null}
 c.addEventListener("pointerup",end);c.addEventListener("pointercancel",end)
 return{set(blob){const im=new Image();im.onload=()=>{st.img=im;st.px=st.py=0;draw()};im.src=URL.createObjectURL(blob)},
  has:()=>!!st.img,
  blob:()=>new Promise(ok=>{const o=document.createElement("canvas");o.width=o.height=600;o.getContext("2d").drawImage(c,0,0,600,600);o.toBlob(b=>ok(new File([b],"photo.jpg",{type:"image/jpeg"})),"image/jpeg",.88)})}
}

/* ---------- Formulaire d'inscription (ou à refaire) ---------- */
async function viewForm({ref=null,redo=null,jeton=null}={}){
 let parrain=null
 if(ref){const {data}=await sb.rpc("membre_parrain",{p_code:ref});parrain=data}
 const v=redo||{}
 app.innerHTML=`
 <div class="eyebrow">Le réseau BREK</div>
 <h1>${redo?"Refaire mon inscription":"Votre engagement commence ici."}</h1>
 ${redo?`<div class="panel error"><b>Motif du refus :</b> ${esc(redo.motif)}</div>`:`<p class="lead">Inscrivez-vous, recevez votre lien personnel et invitez au moins ${OBJECTIF} personnes à rejoindre votre équipe. Aucun compte, aucun mot de passe.</p>`}
 ${parrain?`<p class="invited">✓ Vous êtes invité par ${esc(parrain.prenom)} ${esc(parrain.nom)}</p>`:ref?`<p class="muted">Code d’invitation : ${esc(ref)}</p>`:""}
 <form class="panel" id="f" novalidate>
  <h2>Vos informations</h2>
  <div class="fields">
   <label class="field">Prénom<input name="prenom" required maxlength="80" autocomplete="given-name" value="${esc(v.prenom)}"></label>
   <label class="field">Nom<input name="nom" required maxlength="80" autocomplete="family-name" value="${esc(v.nom)}"></label>
   <label class="field">Date de naissance<input name="date_naissance" type="date" required value="${esc(v.date_naissance)}"><small>Il faut avoir au moins 18 ans.</small></label>
   <label class="field">Sexe<select name="sexe"><option value="">— Préférer ne pas dire —</option>${["Femme","Homme","Autre"].map(s=>`<option ${v.sexe===s?"selected":""}>${s}</option>`).join("")}</select></label>
   <label class="field">Téléphone / WhatsApp<input name="telephone" type="tel" required maxlength="30" autocomplete="tel" placeholder="+509 …" value="${esc(v.telephone)}"></label>
   <label class="field">Numéro de CIN / NINU <small>(facultatif)</small><input name="numero_cin" maxlength="40" value="${esc(v.numero_cin)}"></label>
   <label class="field">Département<select name="departement" required><option value="">— Choisir —</option>${DEPTS.map(d=>`<option ${v.departement===d?"selected":""}>${d}</option>`).join("")}</select></label>
   <label class="field" id="communeField">Commune<input name="commune" required maxlength="80" list="communes" value="${esc(v.commune)}"><datalist id="communes"></datalist></label>
   <label class="field" id="paysField" hidden>Pays de résidence<input name="pays" maxlength="60" value="${esc(v.pays)}"></label>
  </div>
  <h2>Vos photos</h2>
  <p class="muted">Une photo de vous pour la carte de membre, et une photo de votre pièce d’identité (CIN, passeport ou permis). La pièce d’identité reste dans un dépôt privé : seuls les responsables chargés de la vérification peuvent la voir.</p>
  <h3>1. Photo de vous, avec le béret BREK</h3>
  <div class="actions"><button type="button" class="secondary" id="camPhoto">📷 Prendre une photo</button>
   <label class="btn-file secondary">🖼️ Choisir une photo<input type="file" accept="image/*" id="filePhoto" hidden></label>
   <label class="btn-file secondary" id="capPhoto" hidden>📷 Ouvrir l’appareil photo<input type="file" accept="image/*" capture="user" hidden></label></div>
  <div id="studio" hidden></div>
  <h3>2. Pièce d’identité</h3>
  <p class="muted">CIN, passeport ou permis. Photographiez la pièce à plat, bien lisible.</p>
  <div class="actions"><button type="button" class="secondary" id="camPiece">📷 Photographier la pièce</button>
   <label class="btn-file secondary">📎 Choisir un fichier (photo ou PDF)<input type="file" accept="image/*,application/pdf" id="filePiece" hidden></label>
   <label class="btn-file secondary" id="capPiece" hidden>📷 Ouvrir l’appareil photo<input type="file" accept="image/*" capture="environment" hidden></label></div>
  <p id="pieceInfo" class="success"></p>
  <label class="oath"><input type="checkbox" name="serment" required ${v.prenom?"checked":""}><span>Je m’engage à respecter les valeurs de BREK : compétence, intégrité, honnêteté, engagement, responsabilité, loyauté, altruisme et esprit de sacrifice. Je certifie que les informations données sont exactes.</span></label>
  <p id="err" class="error" role="alert"></p>
  <div class="actions"><button type="submit" id="go">${redo?"Renvoyer mon inscription":"Envoyer mon inscription"}</button></div>
  <p class="privacy">Vos informations servent uniquement à vérifier votre adhésion et à organiser le réseau. Elles ne sont ni vendues ni partagées avec un service extérieur.</p>
 </form>`
 const f=document.getElementById("f"),err=document.getElementById("err"),go=document.getElementById("go")
 const syncDept=async()=>{const d=f.departement.value,dia=d==="Diaspora"
  document.getElementById("paysField").hidden=!dia;f.commune.previousSibling.textContent=dia?"Ville":"Commune"
  document.getElementById("communes").innerHTML=(dia?[]:await communesOf(d)).map(c=>`<option value="${esc(c)}">`).join("")}
 f.departement.onchange=syncDept;syncDept()
 const st=studio(document.getElementById("studio"));let piece=null
 const showStudio=b=>{document.getElementById("studio").hidden=false;st.set(b);document.getElementById("studio").scrollIntoView({behavior:"smooth",block:"center"})}
 const setPiece=b=>{piece=b;document.getElementById("pieceInfo").textContent=b?"✓ Pièce d’identité ajoutée ("+(b.type==="application/pdf"?"PDF":"photo")+")":""}
 const cam=async(face,done,fallbackId)=>{try{done(await openCamera(face))}catch(e){if(e.message==="nocam"){const l=document.getElementById(fallbackId);l.hidden=false;l.querySelector("input").click()}}}
 document.getElementById("camPhoto").onclick=()=>cam("user",showStudio,"capPhoto")
 document.getElementById("camPiece").onclick=()=>cam("environment",setPiece,"capPiece")
 for(const [id,fn] of [["filePhoto",showStudio],["filePiece",setPiece]])document.getElementById(id).onchange=e=>e.target.files[0]&&fn(e.target.files[0])
 document.querySelector("#capPhoto input").onchange=e=>e.target.files[0]&&showStudio(e.target.files[0])
 document.querySelector("#capPiece input").onchange=e=>e.target.files[0]&&setPiece(e.target.files[0])
 f.onsubmit=async e=>{e.preventDefault();err.textContent=""
  const d=Object.fromEntries(new FormData(f).entries())
  const need=[["prenom","le prénom"],["nom","le nom"],["date_naissance","la date de naissance"],["telephone","le téléphone"],["departement","le département"],["commune",d.departement==="Diaspora"?"la ville":"la commune"]]
  for(const [k,l] of need)if(!String(d[k]||"").trim()){err.textContent="Indiquez "+l+".";return}
  const age=(Date.now()-new Date(d.date_naissance))/31557600000
  if(!(age>=18)){err.textContent="Il faut avoir au moins 18 ans pour devenir membre.";return}
  if(!st.has()){err.textContent="Prenez ou choisissez votre photo.";return}
  if(!piece){err.textContent="Ajoutez la photo de votre pièce d’identité.";return}
  if(!f.serment.checked){err.textContent="Cochez l’engagement pour continuer.";return}
  go.disabled=true;go.textContent="Envoi en cours…"
  try{
   const u=await session()
   const [photo,pieceFile]=await Promise.all([st.blob(),shrink(piece)])
   const photo_path=await upload("membres-photos",u.id,photo)
   const piece_path=await upload("membres-pieces",u.id,pieceFile)
   const p={prenom:d.prenom,nom:d.nom,date_naissance:d.date_naissance,sexe:d.sexe,telephone:d.telephone,departement:d.departement,
    commune:d.commune,pays:d.pays,numero_cin:d.numero_cin,photo_path,piece_path,serment:true,parrain_code:ref||""}
   const {data,error}=redo?await sb.rpc("membre_refaire",{p_jeton:jeton,p}):await sb.rpc("membre_inscrire",{p})
   if(error)throw error
   store.set(data.jeton);history.replaceState(null,"","/membre/?j="+data.jeton);viewStatus(data.jeton,true)
  }catch(x){err.textContent="Impossible d’envoyer : "+(x.message||x);go.disabled=false;go.textContent=redo?"Renvoyer mon inscription":"Envoyer mon inscription"}}
}

/* ---------- Carte de membre ---------- */
function loadImg(src){return new Promise(ok=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src})}
function rr(x,a,b,w,h,r){x.beginPath();x.roundRect?x.roundRect(a,b,w,h,r):x.rect(a,b,w,h)}
async function drawBadge(c,m){
 const W=1012,H=638;c.width=W;c.height=H;const x=c.getContext("2d")
 const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#fff6e3");g.addColorStop(1,"#f3dfad");x.fillStyle=g;rr(x,0,0,W,H,36);x.fill()
 x.fillStyle="#111";x.fillRect(0,0,W/2,18);x.fillStyle="#b3121e";x.fillRect(W/2,0,W/2,18)
 const [logo,photo]=await Promise.all([loadImg("/membre/logo-brek-carre.png"),loadImg(photoUrl(m.photo_path))])
 if(logo){x.save();x.beginPath();x.arc(96,98,58,0,7);x.clip();x.drawImage(logo,38,40,116,116);x.restore();x.beginPath();x.arc(96,98,58,0,7);x.lineWidth=4;x.strokeStyle="#d4b26a";x.stroke()}
 x.fillStyle="#2a1d14";x.font="800 46px system-ui,sans-serif";x.fillText("BREK-AYITI",162,92)
 x.fillStyle="#5c4a2e";x.font="600 24px system-ui,sans-serif";x.fillText("Brigade Revolisyon Klasik · Carte de membre",162,128)
 x.fillStyle="#efe3c7";rr(x,48,190,250,310,22);x.fill()
 if(photo){x.save();rr(x,48,190,250,310,22);x.clip();const s=Math.max(250/photo.width,310/photo.height);x.drawImage(photo,48+(250-photo.width*s)/2,190+(310-photo.height*s)/2,photo.width*s,photo.height*s);x.restore()}
 x.fillStyle="#2a1d14";x.font="800 50px system-ui,sans-serif";x.fillText(m.prenom,334,250)
 x.font="800 50px system-ui,sans-serif";x.fillText(String(m.nom).toUpperCase(),334,310)
 x.fillStyle="#5c4a2e";x.font="600 28px system-ui,sans-serif"
 x.fillText(m.departement==="Diaspora"?`Diaspora · ${m.commune}${m.pays?", "+m.pays:""}`:`${m.commune} · ${m.departement}`,334,362)
 x.fillText("Membre depuis le "+new Date(m.depuis).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"America/Port-au-Prince"}),334,404)
 const t=TITRE[m.titre||"membre"];x.font="800 30px system-ui,sans-serif";const tw=x.measureText(t.toUpperCase()).width+44
 x.fillStyle=TITRE_COUL[m.titre||"membre"];rr(x,334,428,tw,52,26);x.fill();x.fillStyle="#fff";x.fillText(t.toUpperCase(),356,465)
 x.fillStyle="#2a1d14";x.font="800 36px ui-monospace,monospace";x.fillText(m.numero,334,532)
 if(window.qrcode){const q=qrcode(0,"M");q.addData(`${SITE}/membre/?n=${m.numero}`);q.make();const n=q.getModuleCount(),s=Math.floor(150/n),o=W-48-s*n,t=H-48-s*n
  x.fillStyle="#fff";x.fillRect(o-10,t-10,s*n+20,s*n+20);x.fillStyle="#111";for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))x.fillRect(o+k*s,t+r*s,s,s)}
 x.fillStyle="#2a1d14";x.font="700 22px system-ui,sans-serif";x.fillText("Dieu · Patrie · Travail",48,H-50)
}

/* ---------- Suivi personnel ---------- */
async function viewStatus(jeton,fresh=false){
 const {data:m,error}=await sb.rpc("membre_fiche",{p_jeton:jeton})
 if(error||!m){app.innerHTML=`<div class="panel error">Ce lien personnel n’est pas reconnu.</div><p><a href="/membre/">Revenir à l’inscription</a></p>`;return}
 store.set(jeton)
 const perso=`${SITE}/membre/?j=${jeton}`,invit=`${SITE}/membre/?ref=${m.code}`
 const wa=t=>"https://wa.me/?text="+encodeURIComponent(t)
 app.innerHTML=`
 <div class="eyebrow">Mon espace membre</div>
 <h1>${esc(m.prenom)} ${esc(m.nom)}</h1>
 <p><span class="status ${m.statut}">${STATUT[m.statut]}</span> ${m.statut==="valide"?`<span class="status titre-${m.titre||"membre"}">${TITRE[m.titre||"membre"]}</span>`:""}</p>
 ${fresh?`<div class="panel success"><b>Merci, votre inscription est enregistrée.</b> Un responsable va vérifier votre identité. Revenez sur votre lien personnel pour voir la réponse.</div>`:""}
 <section class="panel"><h2>Votre lien personnel</h2>
  <p>Gardez ce lien : il vous permet de revenir ici depuis n’importe quel téléphone. <b>Ne le partagez pas</b>, c’est la clé de votre espace.</p>
  <div class="linkbox"><code>${esc(perso)}</code><button class="secondary" data-copy="${esc(perso)}">Copier</button></div>
  <div class="actions"><a class="btn-wa" href="${wa("Mon lien personnel BREK-AYITI (à garder pour moi) : "+perso)}" target="_blank" rel="noopener noreferrer">📲 Me l’envoyer sur WhatsApp</a></div>
 </section>
 ${m.statut==="rejete"?`<section class="panel"><h2>Inscription refusée</h2><p><b>Motif :</b> ${esc(m.motif)}</p><p>Vous pouvez corriger vos informations et renvoyer votre inscription.</p><div class="actions"><button id="redo">Refaire mon inscription</button></div></section>`:""}
 ${m.statut==="en_attente"?`<section class="panel"><h2>Vérification en cours</h2><p>Un responsable compare vos informations avec votre pièce d’identité. Dès que c’est fait, votre carte de membre apparaîtra ici.</p></section>`:""}
 ${m.statut==="valide"?`<section class="panel"><h2>Ma carte de membre</h2><div class="badge-wrap"><canvas id="badge" aria-label="Carte de membre de ${esc(m.prenom)} ${esc(m.nom)}"></canvas></div>
  <div class="actions"><button id="dl">Télécharger ma carte</button></div></section>`:""}
 <section class="panel"><h2>Mon équipe</h2>
  <p>Invitez au moins ${OBJECTIF} personnes avec votre lien d’invitation. Chaque personne inscrite par votre lien rejoint votre équipe.</p>
  <div class="stat"><div><b>${m.filleuls}</b>inscrits</div><div><b>${m.filleuls_valides}</b>validés</div><div><b>${Math.max(0,OBJECTIF-m.filleuls_valides)}</b>pour atteindre ${OBJECTIF}</div></div>
  ${m.statut==="valide"?`<h3>Mon lien d’invitation</h3><div class="linkbox"><code>${esc(invit)}</code><button class="secondary" data-copy="${esc(invit)}">Copier</button></div>
  <div class="actions"><a class="btn-wa" href="${wa("Je t’invite à rejoindre BREK-AYITI. Inscription simple, sans compte ni mot de passe : "+invit)}" target="_blank" rel="noopener noreferrer">📲 Inviter sur WhatsApp</a></div>`
  :`<p class="muted">Votre lien d’invitation sera actif dès que votre adhésion sera validée.</p>`}
 </section>`
 app.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent="Copié ✓"}catch{}})
 document.getElementById("redo")?.addEventListener("click",()=>viewForm({redo:m,jeton}))
 const c=document.getElementById("badge")
 if(c){const draw=()=>drawBadge(c,m);window.qrcode?draw():window.addEventListener("load",draw)
  document.getElementById("dl").onclick=()=>{try{const a=document.createElement("a");a.download=`carte-BREK-${m.numero}.png`;a.href=c.toDataURL("image/png");a.click()}catch{alert("Téléchargement impossible : faites une capture d’écran de la carte.")}}}
}

/* ---------- Vérification publique d'une carte (QR) ---------- */
async function viewVerify(n){
 const {data:m}=await sb.rpc("membre_verifier",{p_numero:n})
 app.innerHTML=`<div class="eyebrow">Vérification de carte</div><h1>${esc(n)}</h1>
 ${!m?`<div class="panel error"><b>Carte inconnue.</b> Ce numéro ne correspond à aucun membre.</div>`
 :`<div class="panel card">${m.photo_path?`<img src="${photoUrl(m.photo_path)}" alt="">`:"<span></span>"}<div><h3>${esc(m.prenom)} ${esc(m.nom)}</h3><p>${esc(m.departement)}</p>
  <p><span class="status ${m.valide?"valide":"rejete"}">${m.valide?TITRE[m.titre||"membre"]+" · carte valide de BREK-AYITI":"Carte non valide"}</span></p>${m.valide&&m.depuis?`<p class="muted">Depuis le ${fmtDate(m.depuis)}</p>`:""}</div></div>`}`
}

/* ---------- Administration ---------- */
async function viewAdmin(){
 const {data:{session:s}}=await sb.auth.getSession()
 const isAdmin=s&&!s.user.is_anonymous&&(await sb.rpc("is_brek_admin")).data
 if(!isAdmin){
  app.innerHTML=`<div class="eyebrow">Administration</div><h1>Gestion des membres</h1>
  <form class="panel" id="login"><div class="fields"><label class="field">E-mail<input name="email" type="email" required autocomplete="username"></label>
  <label class="field">Mot de passe<span class="pw"><input name="password" type="password" required autocomplete="current-password"><button type="button" class="eye" aria-label="Afficher le mot de passe" title="Afficher le mot de passe">👁️</button></span></label></div>
  <p class="error" id="err"></p><div class="actions"><button>Se connecter</button></div></form>`
  const eye=app.querySelector(".eye");eye.onclick=()=>{const i=eye.previousElementSibling,show=i.type==="password";i.type=show?"text":"password";eye.textContent=show?"🙈":"👁️";eye.setAttribute("aria-label",show?"Masquer le mot de passe":"Afficher le mot de passe")}
  document.getElementById("login").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries())
   if(s?.user?.is_anonymous)await sb.auth.signOut()
   const {error}=await sb.auth.signInWithPassword({email:d.email,password:d.password})
   if(error){document.getElementById("err").textContent="Connexion impossible : "+error.message;return}
   if(!(await sb.rpc("is_brek_admin")).data){document.getElementById("err").textContent="Ce compte n’a pas le rôle d’administrateur.";return}
   viewAdmin()};return}
 let tab="en_attente"
 const render=async()=>{
  const {data,error}=await sb.rpc("admin_membres",{p_statut:tab})
  app.innerHTML=`<div class="eyebrow">Administration</div><h1>Gestion des membres — Contrôle des adhésions</h1>
  <p>Comparez l’identité et la date de naissance avec la pièce d’identité. Validez seulement si tout correspond et si la personne a au moins 18 ans.</p>
  <div class="tabs">${[["en_attente","En attente"],["valide","Validés"],["rejete","Refusés"],["tous","Tous"]].map(([k,l])=>`<button class="${tab===k?"":"secondary"}" data-tab="${k}">${l}</button>`).join("")}
   <button class="secondary" id="out">Se déconnecter</button></div>
  ${error?`<p class="error">${esc(error.message)}</p>`:""}
  <section class="panel">${!(data||[]).length?`<p class="muted">Aucune fiche.</p>`:(data||[]).map(m=>`
   <article class="card" data-id="${m.id}"><img src="${photoUrl(m.photo_path)}" alt="" loading="lazy">
   <div><h3>${esc(m.prenom)} ${esc(m.nom)} <span class="status ${m.statut}">${STATUT[m.statut]}</span></h3>
    <p>${esc(m.date_naissance)} · <b>${m.age} ans</b>${m.sexe?" · "+esc(m.sexe):""}</p>
    <p>${esc(m.commune)} · ${esc(m.departement)}${m.pays?" · "+esc(m.pays):""} · ${esc(m.telephone)}</p>
    ${m.numero_cin?`<p>CIN / NINU : ${esc(m.numero_cin)}</p>`:""}
    <p class="muted">Inscrit le ${fmtDate(m.created_at)}${m.parrain?" · invité par "+esc(m.parrain):""}${m.numero?" · carte "+esc(m.numero):""}</p>
    ${m.motif?`<p class="error">Motif du refus : ${esc(m.motif)}</p>`:""}
    ${m.statut==="valide"?`<div class="actions"><label class="field">Titre sur la carte<select data-titre>${Object.entries(TITRE).map(([k,l])=>`<option value="${k}" ${m.titre===k?"selected":""}>${l}</option>`).join("")}</select></label></div>`:""}
    <div class="actions"><button class="secondary" data-piece="${esc(m.piece_path)}">Ouvrir la pièce d’identité</button></div>
    ${m.statut!=="valide"?`<label class="oath"><input type="checkbox" data-check><span>J’ai contrôlé la pièce : l’identité et la date de naissance correspondent, et la personne a au moins 18 ans.</span></label>
     <div class="actions"><button data-ok>Valider et émettre la carte</button></div><p class="error" data-err-ok role="alert"></p>`:""}
    <div class="actions"><textarea rows="2" placeholder="Motif du refus (sera montré à la personne)" data-motif></textarea><button class="secondary" data-ko>Rejeter</button></div>
    <p class="error" data-err></p>
   </div></article>`).join("")}</section>`
  app.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()})
  document.getElementById("out").onclick=async()=>{await sb.auth.signOut();viewAdmin()}
  app.querySelectorAll("[data-piece]").forEach(b=>b.onclick=async()=>{const w=window.open("","_blank")
   const {data,error}=await sb.storage.from("membres-pieces").createSignedUrl(b.dataset.piece,600)
   if(error){w?.close();alert("Impossible d’ouvrir la pièce : "+error.message)}else if(w)w.location=data.signedUrl;else location.href=data.signedUrl})
  app.querySelectorAll(".card").forEach(card=>{const id=card.dataset.id,errp=card.querySelector("[data-err]")
   card.querySelector("[data-ok]")?.addEventListener("click",async e=>{const eo=card.querySelector("[data-err-ok]")
    if(!card.querySelector("[data-check]").checked){eo.textContent="Cochez d’abord la case « J’ai contrôlé la pièce » juste au-dessus.";return}
    e.target.disabled=true;e.target.textContent="Validation…"
    const {error}=await sb.rpc("admin_decider",{p_id:id,p_decision:"valide"})
    if(error){eo.textContent="Validation impossible : "+error.message;e.target.disabled=false;e.target.textContent="Valider et émettre la carte"}else{tab="valide";render()}})
   card.querySelector("[data-titre]")?.addEventListener("change",async e=>{const {data,error}=await sb.rpc("admin_titre",{p_id:id,p_titre:e.target.value})
    if(error){errp.textContent=error.message;render()}else errp.innerHTML=`<span class="success">Titre enregistré. Cofondateurs : ${data.cofondateurs}/12.</span>`})
   card.querySelector("[data-ko]").onclick=async()=>{const motif=card.querySelector("[data-motif]").value.trim()
    if(!motif){errp.textContent="Écrivez le motif du refus : la personne le verra pour corriger son inscription.";return}
    const {error}=await sb.rpc("admin_decider",{p_id:id,p_decision:"rejete",p_motif:motif});error?errp.textContent=error.message:render()}})
 }
 render()
}

/* ---------- Aiguillage ---------- */
;(async()=>{
 try{
  if(location.hash==="#admin")return await viewAdmin()
  if(qs.get("n"))return await viewVerify(qs.get("n"))
  if(qs.get("ref"))return await viewForm({ref:qs.get("ref").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12)})
  const j=qs.get("j")||store.get()
  if(j&&/^[0-9a-f-]{36}$/i.test(j))return await viewStatus(j)
  await viewForm()
 }catch(x){app.innerHTML=`<div class="panel error">Erreur de chargement : ${esc(x.message||x)}</div>`}
})()
window.addEventListener("hashchange",()=>location.reload())
