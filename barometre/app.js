import {mergeCandidates} from './candidates.mjs?v=20261115b';
import React,{useState,useEffect} from "https://esm.sh/react@19.1.1";
import{createRoot}from"https://esm.sh/react-dom@19.1.1/client";
import htm from"https://esm.sh/htm@3.1.1";
import{createClient}from"https://esm.sh/@supabase/supabase-js@2";
const html=htm.bind(React.createElement);
const supabase=createClient("https://arefkpzykkhfzoizsbap.supabase.co","sb_publishable_qSyrtmo9Iijl7eakvc6UnA_7TyEbXC1");
const unknown="Préférence non précisée";
const menus=[["Accueil","/"],["Qui sommes-nous","/#qui-sommes-nous"],["Programme","/#programme"],["Coordination","/#coordination"],["Radio · TV","/#radio"],["News","/#news"],["Sensibilisation","/#sensibilisation"],["Culture et Éducation","/#culture"],["Soutenir","/#soutenir"],["Brochure","/#brochure"],["Baromètre électoral","/barometre/"]];
const status=(v)=>{const s=String(v||"").toLocaleLowerCase("fr");return s.includes("admis")?["🟢 Admis CEP","green"]:s.includes("refusé")||s.includes("refuse")||s.includes("rejeté")||s.includes("rejete")?["🔴 Refusé CEP","red"]:["🟠 En attente CEP","orange"]};
function App(){
 const [geo,setGeo]=useState([]),[races,setRaces]=useState([]),[choices,setChoices]=useState([])
 const [place,setPlace]=useState(()=>store.get()||{dept:"",commune:"",race:""})
 const [picks,setPicks]=useState({}),[done,setDone]=useState({}),[user,setUser]=useState(null)
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[loading,setLoading]=useState(true),[copied,setCopied]=useState(false)
 const [tab,setTab]=useState("president"),[resDept,setResDept]=useState(""),[resCirc,setResCirc]=useState(""),[tick,setTick]=useState(0)
 const [captchaBox,captchaToken,resetCaptcha]=useTurnstile()

 const dept=geo.find(d=>d.slug===place.dept)
 const communes=dept?dept.communes:[]
 const commune=communes.find(m=>m.name===place.commune)
 const circsOfCommune=dept&&commune?dept.circs.filter(c=>commune.races.includes(c.race)):[]
 const circRace=circsOfCommune.length===1?circsOfCommune[0].race:circsOfCommune.some(c=>c.race===place.race)?place.race:""
 const byId=Object.fromEntries(races.map(r=>[r.id,r]))
 const myRaces=["president",...(dept?["senateur/"+dept.slug]:[]),...(circRace?[circRace]:[])].map(id=>byId[id]).filter(Boolean)
 const choicesOf=id=>choices.filter(c=>c.race_id===id&&(c.active!==false))
 const pending=myRaces.filter(r=>picks[r.id]&&!done[r.id])

 const loadPrivate=async u=>{if(!u){setDone({});return}
  const {data}=await supabase.from("bar_votes").select("race_id,choice_id")
  setDone(Object.fromEntries((data||[]).map(v=>[v.race_id,v.choice_id])))}

 useEffect(()=>{let alive=true
  ;(async()=>{try{
   const [g,r,c,{data:{session}}]=await Promise.all([fetch("/barometre/geo-2026.json?v=20261115").then(x=>x.json()),
    supabase.from("bar_races").select("id,office,department,label,sort").order("sort"),
    loadChoices(),
    supabase.auth.getSession()])
   if(!alive)return;if(r.error)throw r.error
   setGeo(g);setRaces(r.data||[]);setChoices(c);setUser(session?.user||null);await loadPrivate(session?.user||null)
  }catch(e){alive&&setMessage("Erreur de chargement : "+e.message)}finally{alive&&setLoading(false)}})()
  const timer=setInterval(()=>setTick(t=>t+1),5*60*1000)
  return()=>{alive=false;clearInterval(timer)}},[])

 useEffect(()=>{store.set(place);if(place.dept&&!resDept)setResDept(place.dept)},[place])
 useEffect(()=>{if(circRace&&!resCirc)setResCirc(circRace)},[circRace])

 const setDept=v=>{setPlace({dept:v,commune:"",race:""});setPicks(p=>({president:p.president}))}
 const setCommune=v=>{setPlace({...place,commune:v,race:""});setPicks(p=>({president:p.president,["senateur/"+place.dept]:p["senateur/"+place.dept]}))}

 const submit=async()=>{
  if(!pending.length||busy)return
  if(TURNSTILE_SITE_KEY&&!captchaToken){setMessage("Impossible d’envoyer : cochez d’abord la vérification anti-robot.");return}
  setBusy(true);setMessage("")
  try{let u=user
   if(!u){const {data,error}=await supabase.auth.signInAnonymously(TURNSTILE_SITE_KEY?{options:{captchaToken}}:undefined);if(error)throw error;u=data.user;setUser(u)}
   const rows=pending.map(r=>({race_id:r.id,choice_id:picks[r.id],department:place.dept||null,commune:place.commune||null}))
   let dup=false
   for(const row of rows){const {error}=await supabase.from("bar_votes").insert(row);if(error){if(error.code==="23505")dup=true;else throw error}}
   await loadPrivate(u);setPicks({});setTick(t=>t+1)
   setMessage(dup?"Merci. Certaines intentions avaient déjà été enregistrées depuis cet appareil.":"Merci. Vos intentions ont été enregistrées.")
   document.getElementById("resultats")?.scrollIntoView({behavior:"smooth"})
  }catch(e){setMessage("Impossible d’enregistrer : "+e.message)}finally{setBusy(false);resetCaptcha()}}

 const copy=async()=>{try{await navigator.clipboard.writeText(PAGE_URL);setCopied(true);setTimeout(()=>setCopied(false),2000)}catch{}}
 const isError=/^(Erreur|Impossible)/.test(message)
 const resRace=tab==="president"?byId.president:tab==="senateur"?byId["senateur/"+resDept]:byId[resCirc]
 const resGeo=geo.find(d=>d.slug===resDept)

 return html`<div className="app-shell"><div className="topline">Un mouvement né en 2017 · Haïti et diaspora</div>
 <header className="head"><a className="brand" href="/"><img src="/logo-original.jpg" alt="Logo BREK"/><span><b>BREK</b><small>Brigade Revolisyon Klasik</small></span></a>
 <nav className="nav">${menus.map(([n,u])=>html`<a key=${n} className=${n==="Baromètre électoral"?"active":""} href=${u}>${n}</a>`)}</nav></header>
 <main><div className="muted">BREK-AYITI · BAROMÈTRE CITOYEN</div><h1>Baromètre d’intentions de vote</h1>
 <p className="lead">Président, sénateur, député : dites-nous pour qui vous comptez voter. <b>Aucun nom, aucun e-mail, aucun compte.</b></p>
 <div className="notice"><strong>Sondage d’intentions — non officiel, ne remplace pas l’élection.</strong> Ce baromètre mesure une opinion exprimée volontairement sur internet. Ce n’est pas l’élection organisée par le CEP. BREK ne recommande aucun vote. Les listes de candidats proviennent du registre publié par le CEP et peuvent encore changer.</div>
 ${message&&html`<div role="status" className=${"panel "+(isError?"error":"success")}>${message}</div>`}

 <section className="panel where" id="voter"><h2>1. Où votez-vous ?</h2>
  <p className="muted">Votre département et votre commune servent seulement à afficher vos sénateurs et vos députés. Rien d’autre n’est demandé.</p>
  <div className="fields">
   <label className="field">Département<select value=${place.dept} onChange=${e=>setDept(e.target.value)}><option value="">— Choisir —</option>${geo.map(d=>html`<option key=${d.slug} value=${d.slug}>${d.name}</option>`)}</select></label>
   <label className="field">Commune<select value=${place.commune} disabled=${!dept} onChange=${e=>setCommune(e.target.value)}><option value="">— Choisir —</option>${communes.map(m=>html`<option key=${m.name} value=${m.name}>${m.name}</option>`)}</select></label>
   ${circsOfCommune.length>1&&html`<label className="field">Circonscription<select value=${place.race} onChange=${e=>setPlace({...place,race:e.target.value})}><option value="">— Choisir —</option>${circsOfCommune.map(c=>html`<option key=${c.race} value=${c.race}>${c.label}</option>`)}</select></label>`}
  </div>
  ${!place.dept&&html`<p className="muted">Vous pouvez aussi donner seulement votre choix pour la présidence, sans indiquer votre département.</p>`}
 </section>

 <h2 className="step">2. Vos choix</h2>
 ${loading?html`<p>Chargement des listes…</p>`:myRaces.map(r=>html`<${Ballot} key=${r.id} race=${r} choices=${choicesOf(r.id)} photos=${r.office==="president"} value=${picks[r.id]||null} done=${done[r.id]} onChange=${v=>setPicks({...picks,[r.id]:v})}/>`)}
 ${place.commune&&circsOfCommune.length>1&&!circRace&&html`<p className="muted">Choisissez votre circonscription ci-dessus pour voir vos candidats à la députation.</p>`}

 ${pending.length>0&&html`<div className="confirm" role="dialog" aria-label="Confirmer mes intentions">
  <p><b>Vos choix :</b></p><ul>${pending.map(r=>html`<li key=${r.id}>${r.label} : <b>${choices.find(c=>c.id===picks[r.id])?.full_name}</b></li>`)}</ul>
  ${TURNSTILE_SITE_KEY&&html`<div ref=${captchaBox} className="captcha"></div>`}
  <div className="actions"><button disabled=${busy} onClick=${submit}>${busy?"Envoi…":"Envoyer mes intentions"}</button><button className="secondary" disabled=${busy} onClick=${()=>setPicks({})}>Effacer</button></div>
  <p className="muted small">Une seule intention par poste et par appareil. Elle ne peut plus être modifiée ensuite.</p></div>`}

 <section className="panel" id="resultats"><h2>Résultats du baromètre</h2>
  <div className="tabs" role="tablist">${[["president","Président"],["senateur","Sénat"],["depute","Députés"]].map(([k,l])=>html`<button key=${k} role="tab" aria-selected=${tab===k} className=${tab===k?"":"secondary"} onClick=${()=>setTab(k)}>${l}</button>`)}</div>
  ${tab!=="president"&&html`<div className="fields">
   <label className="field">Département<select value=${resDept} onChange=${e=>{setResDept(e.target.value);setResCirc("")}}><option value="">— Choisir —</option>${geo.map(d=>html`<option key=${d.slug} value=${d.slug}>${d.name}</option>`)}</select></label>
   ${tab==="depute"&&resGeo&&html`<label className="field">Circonscription<select value=${resCirc} onChange=${e=>setResCirc(e.target.value)}><option value="">— Choisir —</option>${resGeo.circs.map(c=>html`<option key=${c.race} value=${c.race}>${c.label}</option>`)}</select></label>`}</div>`}
  ${resRace?html`<h3>${resRace.label}</h3><${Results} race=${resRace} choices=${choices.filter(c=>c.race_id===resRace.id)} tick=${tick}/>`:html`<p className="muted">Choisissez un ${tab==="senateur"?"département":"département et une circonscription"}.</p>`}
  <div className="actions"><a className="btn-wa" href=${"https://wa.me/?text="+encodeURIComponent("Baromètre citoyen BREK-AYITI — président, sénateur, député : donnez vos intentions de vote en une minute, sans nom ni compte (sondage non officiel) : "+PAGE_URL)} target="_blank" rel="noopener noreferrer">📲 Pataje sou WhatsApp</a>
   <button className="secondary" onClick=${copy}>${copied?"Lien copié ✓":"Copier le lien"}</button>
   <button className="secondary" onClick=${()=>setTick(t=>t+1)}>Actualiser</button></div>
  <details className="method"><summary>Comment ces chiffres sont calculés</summary>
   <p>Chaque appareil peut exprimer une seule intention par poste. Aucun nom, e-mail ni numéro de téléphone n’est demandé. Le département et la commune servent à afficher les bonnes listes.</p>
   <p>Pour repérer les envois en masse, nous gardons une empreinte chiffrée et irréversible de l’adresse réseau, jamais l’adresse elle-même. Quand un nombre anormal d’appareils envoie des intentions depuis la même adresse en moins d’une heure, ces envois sont marqués comme suspects et retirés des résultats. Le seuil est volontairement large, car en Haïti beaucoup de téléphones partagent la même adresse réseau.${TURNSTILE_SITE_KEY?" Une vérification anti-robot discrète bloque aussi les programmes automatiques.":""}</p>
   <p>Les pourcentages portent sur toutes les intentions retenues dans chaque course, y compris « Aucun candidat » et « Je ne sais pas encore ». Ils ne sont publiés qu’à partir de ${THRESHOLD.president} intentions pour la présidence, ${THRESHOLD.senateur} par département pour le Sénat et ${THRESHOLD.depute} par circonscription pour les députés. Ce sondage en ligne n’est pas un échantillon scientifique : il reflète seulement les personnes qui ont choisi d’y répondre.</p>
   <p>Listes : registre des candidatures du CEP, tel que relevé par <a href="https://espas.ht/haiti/election" target="_blank" rel="noopener noreferrer">Espas</a>.</p>
  </details></section>
 </main><footer className="foot">BREK · Brigade Revolisyon Klasik — Baromètre non officiel</footer></div>`}

createRoot(document.getElementById("root")).render(React.createElement(App))
