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
  <div class="files">
   <label class="drop"><span class="ph" id="pvPhoto">🙂</span><span><b>Photo de vous</b><small>Visage bien visible</small><br><input type="file" name="photo" accept="image/*" required></span></label>
   <label class="drop"><span class="ph" id="pvPiece">🪪</span><span><b>Pièce d’identité</b><small>Photo ou PDF</small><br><input type="file" name="piece" accept="image/*,application/pdf" required></span></label>
  </div>
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
 const preview=(input,box)=>input.onchange=()=>{const file=input.files[0];if(!file)return
  const el=document.getElementById(box);if(/^image\//.test(file.type)){const i=new Image();i.src=URL.createObjectURL(file);i.alt="";el.replaceWith(Object.assign(i,{id:box}))}else el.textContent="📄"}
 preview(f.photo,"pvPhoto");preview(f.piece,"pvPiece")
 f.onsubmit=async e=>{e.preventDefault();err.textContent=""
  const d=Object.fromEntries(new FormData(f).entries())
  const need=[["prenom","le prénom"],["nom","le nom"],["date_naissance","la date de naissance"],["telephone","le téléphone"],["departement","le département"],["commune",d.departement==="Diaspora"?"la ville":"la commune"]]
  for(const [k,l] of need)if(!String(d[k]||"").trim()){err.textContent="Indiquez "+l+".";return}
  const age=(Date.now()-new Date(d.date_naissance))/31557600000
  if(!(age>=18)){err.textContent="Il faut avoir au moins 18 ans pour devenir membre.";return}
  if(!f.photo.files[0]||!f.piece.files[0]){err.textContent="Ajoutez votre photo et votre pièce d’identité.";return}
  if(!f.serment.checked){err.textContent="Cochez l’engagement pour continuer.";return}
  go.disabled=true;go.textContent="Envoi en cours…"
  try{
   const u=await session()
   const [photo,piece]=await Promise.all([shrink(f.photo.files[0],900),shrink(f.piece.files[0])])
   const photo_path=await upload("membres-photos",u.id,photo)
   const piece_path=await upload("membres-pieces",u.id,piece)
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
 const [logo,photo]=await Promise.all([loadImg("/logo-original.jpg"),loadImg(photoUrl(m.photo_path))])
 if(logo){x.save();x.beginPath();x.arc(92,96,52,0,7);x.clip();x.drawImage(logo,40,44,104,104);x.restore()}
 x.fillStyle="#2a1d14";x.font="800 46px system-ui,sans-serif";x.fillText("BREK-AYITI",162,92)
 x.fillStyle="#5c4a2e";x.font="600 24px system-ui,sans-serif";x.fillText("Brigade Revolisyon Klasik · Carte de membre",162,128)
 x.fillStyle="#efe3c7";rr(x,48,190,250,310,22);x.fill()
 if(photo){x.save();rr(x,48,190,250,310,22);x.clip();const s=Math.max(250/photo.width,310/photo.height);x.drawImage(photo,48+(250-photo.width*s)/2,190+(310-photo.height*s)/2,photo.width*s,photo.height*s);x.restore()}
 x.fillStyle="#2a1d14";x.font="800 50px system-ui,sans-serif";x.fillText(m.prenom,334,250)
 x.font="800 50px system-ui,sans-serif";x.fillText(String(m.nom).toUpperCase(),334,310)
 x.fillStyle="#5c4a2e";x.font="600 28px system-ui,sans-serif"
 x.fillText(m.departement==="Diaspora"?`Diaspora · ${m.commune}${m.pays?", "+m.pays:""}`:`${m.commune} · ${m.departement}`,334,362)
 x.fillText("Membre depuis le "+fmtDate(m.depuis),334,404)
 x.fillStyle="#b9002c";x.font="800 40px ui-monospace,monospace";x.fillText(m.numero,334,474)
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
 <p><span class="status ${m.statut}">${STATUT[m.statut]}</span></p>
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
  <p><span class="status ${m.valide?"valide":"rejete"}">${m.valide?"Membre valide de BREK-AYITI":"Carte non valide"}</span></p>${m.valide&&m.depuis?`<p class="muted">Depuis le ${fmtDate(m.depuis)}</p>`:""}</div></div>`}`
}

/* ---------- Administration ---------- */
async function viewAdmin(){
 const {data:{session:s}}=await sb.auth.getSession()
 const isAdmin=s&&!s.user.is_anonymous&&(await sb.rpc("is_brek_admin")).data
 if(!isAdmin){
  app.innerHTML=`<div class="eyebrow">Administration</div><h1>Gestion des membres</h1>
  <form class="panel" id="login"><div class="fields"><label class="field">E-mail<input name="email" type="email" required autocomplete="username"></label>
  <label class="field">Mot de passe<input name="password" type="password" required autocomplete="current-password"></label></div>
  <p class="error" id="err"></p><div class="actions"><button>Se connecter</button></div></form>`
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
    <div class="actions"><button class="secondary" data-piece="${esc(m.piece_path)}">Ouvrir la pièce d’identité</button></div>
    ${m.statut!=="valide"?`<label class="oath"><input type="checkbox" data-check><span>J’ai contrôlé la pièce : l’identité et la date de naissance correspondent, et la personne a au moins 18 ans.</span></label>
     <div class="actions"><button data-ok>Valider et émettre la carte</button></div>`:""}
    <div class="actions"><textarea rows="2" placeholder="Motif du refus (sera montré à la personne)" data-motif></textarea><button class="secondary" data-ko>Rejeter</button></div>
    <p class="error" data-err></p>
   </div></article>`).join("")}</section>`
  app.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()})
  document.getElementById("out").onclick=async()=>{await sb.auth.signOut();viewAdmin()}
  app.querySelectorAll("[data-piece]").forEach(b=>b.onclick=async()=>{const w=window.open("","_blank")
   const {data,error}=await sb.storage.from("membres-pieces").createSignedUrl(b.dataset.piece,600)
   if(error){w?.close();alert("Impossible d’ouvrir la pièce : "+error.message)}else if(w)w.location=data.signedUrl;else location.href=data.signedUrl})
  app.querySelectorAll(".card").forEach(card=>{const id=card.dataset.id,errp=card.querySelector("[data-err]")
   card.querySelector("[data-ok]")?.addEventListener("click",async()=>{if(!card.querySelector("[data-check]").checked){errp.textContent="Cochez d’abord le contrôle de la pièce.";return}
    const {error}=await sb.rpc("admin_decider",{p_id:id,p_decision:"valide"});error?errp.textContent=error.message:render()})
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
