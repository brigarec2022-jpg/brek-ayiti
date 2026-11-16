import React,{useState,useEffect,useRef,useMemo} from "https://esm.sh/react@19.1.1"
import {createRoot} from "https://esm.sh/react-dom@19.1.1/client"
import htm from "https://esm.sh/htm@3.1.1"
import {createClient} from "https://esm.sh/@supabase/supabase-js@2"

const html=htm.bind(React.createElement)
const supabase=createClient("https://arefkpzykkhfzoizsbap.supabase.co","sb_publishable_qSyrtmo9Iijl7eakvc6UnA_7TyEbXC1")

// Clé publique Cloudflare Turnstile (anti-robot). Laisser vide tant qu'elle n'est pas créée.
const TURNSTILE_SITE_KEY=""
const THRESHOLD={president:50,senateur:30,depute:20}
const SHOWN=10
const PAGE_URL="https://brek-ayiti.pages.dev/barometre/"
const COLORS=["#b9002c","#206747","#b38a36","#3d4f9f"]
const PLACE_KEY="brek-barometre-lieu"
const menus=[["Accueil","/"],["Qui sommes-nous","/#qui-sommes-nous"],["Programme","/#programme"],["Coordination","/#coordination"],["Radio · TV","/#radio"],["News","/#news"],["Sensibilisation","/#sensibilisation"],["Culture et Éducation","/#culture"],["Soutenir","/#soutenir"],["Brochure","/#brochure"],["Baromètre électoral","/barometre/"]]

const fmt=n=>Number(n||0).toLocaleString("fr-FR")
const pct=(n,t)=>t?(n/t*100).toLocaleString("fr-FR",{minimumFractionDigits:1,maximumFractionDigits:1})+" %":"0 %"
const hhmm=d=>d?new Date(d).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Port-au-Prince"}):""
const dayLabel=d=>new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"})
const fold=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()
const store={get(){try{return JSON.parse(localStorage.getItem(PLACE_KEY)||"null")}catch{return null}},set(v){try{localStorage.setItem(PLACE_KEY,JSON.stringify(v))}catch{}}}

function useTurnstile(){
 const box=useRef(null),[token,setToken]=useState("")
 useEffect(()=>{if(!TURNSTILE_SITE_KEY)return
  const render=()=>{if(box.current&&window.turnstile&&!box.current.dataset.done){box.current.dataset.done="1"
   window.turnstile.render(box.current,{sitekey:TURNSTILE_SITE_KEY,language:"fr",callback:setToken,"expired-callback":()=>setToken("")})}}
  if(window.turnstile)render()
  else{const s=document.createElement("script");s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";s.async=true;s.onload=render;document.head.appendChild(s)}})
 return [box,token,()=>{setToken("");try{window.turnstile?.reset(box.current)}catch{}}]
}

/* ---------- Choix d'un candidat dans une course ---------- */
function Ballot({race,choices,value,onChange,done,photos}){
 const [q,setQ]=useState("")
 const people=choices.filter(c=>c.kind==="candidate")
 const special=choices.filter(c=>c.kind!=="candidate")
 const list=q?people.filter(c=>fold(c.full_name+" "+(c.party||"")).includes(fold(q))):people
 const mine=choices.find(c=>c.id===done)
 return html`<section className="panel ballot" id=${"b-"+race.office}>
  <h3>${race.label}</h3>
  ${done?html`<p className="success">✓ Intention enregistrée : <b>${mine?.full_name||"—"}</b></p>`:html`
  <p className="muted">${people.length} candidat${people.length>1?"s":""} · touchez un nom pour le choisir.</p>
  ${people.length>8&&html`<input type="search" className="search" placeholder="Chercher un nom ou un parti" value=${q} onInput=${e=>setQ(e.target.value)}/>`}
  <div className=${photos?"grid":"options"}>${list.map(c=>photos?html`
   <button key=${c.id} className=${"candidate pick"+(value===c.id?" picked":"")} onClick=${()=>onChange(value===c.id?null:c.id)} aria-pressed=${value===c.id}>
    ${c.photo_url&&html`<img src=${c.photo_url} alt="" loading="lazy" className=${/ricardo/i.test(c.full_name)?"portrait-ricardo":""}/>`}
    <span className="name">${c.full_name}</span><span className="muted">${c.party||"Groupe non précisé"}</span>
    <span className="tick">${value===c.id?"✓ Choisi":"Choisir"}</span></button>`:html`
   <button key=${c.id} className=${"opt"+(value===c.id?" picked":"")} onClick=${()=>onChange(value===c.id?null:c.id)} aria-pressed=${value===c.id}>
    <span><b>${c.full_name}</b><small>${c.party||"Groupe non précisé"}</small></span><span className="dot">${value===c.id?"✓":""}</span></button>`)}</div>
  ${!list.length&&html`<p className="muted">Aucun nom ne correspond à « ${q} ».</p>`}
  <div className="actions">${special.map(c=>html`<button key=${c.id} className=${value===c.id?"":"secondary"} onClick=${()=>onChange(value===c.id?null:c.id)}>${c.full_name}</button>`)}</div>`}
 </section>`
}

/* ---------- Résultats d'une course ---------- */
function Evolution({daily,choices}){
 if(!daily.length)return null
 const days=[...new Set(daily.map(r=>r.day))].sort()
 const share={};for(const r of daily){(share[r.day]??={})[r.choice_id]=r.total?r.cumul/r.total*100:0}
 const last=days[days.length-1]
 const top=choices.filter(c=>c.kind==="candidate").sort((a,b)=>(share[last]?.[b.id]||0)-(share[last]?.[a.id]||0)).slice(0,4)
 const W=640,H=200,P=30,max=Math.max(10,...top.map(c=>Math.max(...days.map(d=>share[d]?.[c.id]||0))))
 const x=i=>P+(days.length<2?0:i*(W-2*P)/(days.length-1)),y=v=>H-P-(v/max)*(H-2*P)
 return html`<details className="evo"><summary>Évolution jour par jour</summary>
 <svg viewBox=${"0 0 "+W+" "+H} role="img" aria-label="Évolution de la part des quatre premiers choix">
  <line x1=${P} x2=${W-P} y1=${H-P} y2=${H-P} stroke="#d9c79f"/><line x1=${P} x2=${W-P} y1=${y(max)} y2=${y(max)} stroke="#eee2c6"/>
  <text x="2" y=${y(max)+4} className="axis">${Math.round(max)}</text><text x="2" y=${H-P+4} className="axis">0</text>
  <text x=${P} y=${H-8} className="axis">${dayLabel(days[0])}</text><text x=${W-P} y=${H-8} textAnchor="end" className="axis">${dayLabel(last)}</text>
  ${top.map((c,i)=>html`<polyline key=${c.id} fill="none" stroke=${COLORS[i]} strokeWidth="3" points=${days.map((d,j)=>x(j)+","+y(share[d]?.[c.id]||0)).join(" ")}/>`)}
 </svg>
 <div className="legend">${top.map((c,i)=>html`<span key=${c.id}><i style=${{background:COLORS[i]}}></i>${c.full_name}</span>`)}</div>
 <p className="muted">Part de chaque choix parmi les intentions retenues, à la fin de chaque journée (heure d’Haïti).</p>
 <div className="table-scroll"><table><thead><tr><th>Jour</th>${top.map(c=>html`<th key=${c.id}>${c.full_name}</th>`)}</tr></thead>
 <tbody>${days.slice(-5).reverse().map(d=>html`<tr key=${d}><td>${dayLabel(d)}</td>${top.map(c=>html`<td key=${c.id}>${(share[d]?.[c.id]||0).toLocaleString("fr-FR",{maximumFractionDigits:1})} %</td>`)}</tr>`)}</tbody></table></div>
 </details>`
}

function Results({race,choices,tick}){
 const [rows,setRows]=useState(null),[meta,setMeta]=useState(null),[daily,setDaily]=useState([]),[err,setErr]=useState("")
 useEffect(()=>{if(!race)return;let alive=true;setRows(null)
  Promise.all([supabase.rpc("bar_results",{p_race:race.id}),supabase.rpc("bar_meta",{p_race:race.id}),supabase.rpc("bar_daily",{p_race:race.id})])
  .then(([r,m,d])=>{if(!alive)return;if(r.error)throw r.error;setRows(r.data||[]);setMeta(m.data||null);setDaily(d.data||[]);setErr("")})
  .catch(e=>alive&&setErr(e.message));return()=>{alive=false}},[race?.id,tick])
 if(!race)return null
 if(err)return html`<p className="error">Résultats indisponibles : ${err}</p>`
 if(!rows)return html`<p className="muted">Chargement des résultats…</p>`
 const counts=Object.fromEntries(rows.map(r=>[r.choice_id,Number(r.total)]))
 const total=rows.reduce((a,r)=>a+Number(r.total),0),need=THRESHOLD[race.office]
 const ranked=choices.filter(c=>c.active!==false||counts[c.id]).sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0)||a.sort-b.sort)
 const row=c=>{const n=counts[c.id]||0;return html`<div key=${c.id} className="res-row"><div className="res-name"><b>${c.full_name}</b>${c.party&&html`<small>${c.party}</small>`}</div>
  <div className="res-track"><span style=${{width:(total?n/total*100:0)+"%"}}></span></div><div className="res-num"><b>${pct(n,total)}</b><small>${fmt(n)} intention${n>1?"s":""}</small></div></div>`}
 return html`<div>
  ${meta&&html`<p className="muted">Mis à jour à ${hhmm(meta.generated_at)} (heure d’Haïti).</p>`}
  ${total<need?html`<p><strong>Résultats masqués : ${fmt(total)}/${need} intentions pour l’instant.</strong></p><p className="muted">Les pourcentages de cette course seront publiés à partir de ${need} intentions retenues.</p>`:html`
  <p><strong>${fmt(total)} intentions retenues</strong></p>
  ${meta?.suspect>0&&html`<p className="alert">Des envois massifs et suspects (${fmt(meta.suspect)}) ont été détectés et retirés de ces résultats.</p>`}
  <div className="results">${ranked.slice(0,SHOWN).map(row)}</div>
  ${ranked.length>SHOWN&&html`<details className="more"><summary>Voir les ${ranked.length-SHOWN} autres choix</summary><div className="results">${ranked.slice(SHOWN).map(row)}</div></details>`}
  <${Evolution} daily=${daily} choices=${choices}/>`}</div>`
}

// Supabase renvoie au plus 1 000 lignes par requête : on lit les choix par pages.
async function loadChoices(){const all=[];for(let i=0;;i+=1000){
 const {data,error}=await supabase.from("bar_choices").select("id,race_id,full_name,party,photo_url,kind,sort,active").order("race_id").order("sort").order("id").range(i,i+999)
 if(error)throw error;all.push(...data);if(data.length<1000)return all}}

/* ---------- Application ---------- */
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
 <figure className="barometre-hero"><img src="/barometre/barometre-electoral.webp" alt="Illustration du baromètre électoral BREK-AYITI : un cadran et une urne devant la Citadelle et la baie, sans résultat chiffré." width="1734" height="907" fetchpriority="high"/><figcaption>Consultation citoyenne, non officielle : le baromètre prend le pouls des intentions de vote.</figcaption></figure>
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
