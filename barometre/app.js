import {mergeCandidates} from './candidates.mjs?v=20261115'
import React,{useState,useEffect,useRef} from "https://esm.sh/react@19.1.1"
import {createRoot} from "https://esm.sh/react-dom@19.1.1/client"
import htm from "https://esm.sh/htm@3.1.1"
import {createClient} from "https://esm.sh/@supabase/supabase-js@2"

const html=htm.bind(React.createElement)
const supabase=createClient("https://arefkpzykkhfzoizsbap.supabase.co","sb_publishable_qSyrtmo9Iijl7eakvc6UnA_7TyEbXC1")

// Clé publique Cloudflare Turnstile (anti-robot). Laisser vide tant qu'elle n'est pas créée.
const TURNSTILE_SITE_KEY=""
const THRESHOLD=50
const SHOWN=10
const PAGE_URL="https://brek-ayiti.pages.dev/barometre/"
const unknown="Préférence non précisée"
const COLORS=["#b9002c","#206747","#b38a36","#3d4f9f"]
const menus=[["Accueil","/"],["Qui sommes-nous","/#qui-sommes-nous"],["Programme","/#programme"],["Coordination","/#coordination"],["Radio · TV","/#radio"],["News","/#news"],["Sensibilisation","/#sensibilisation"],["Culture et Éducation","/#culture"],["Soutenir","/#soutenir"],["Brochure","/#brochure"],["Baromètre électoral","/barometre/"]]
const demoFields=[["age_bracket","Tranche d’âge",["18–24","25–34","35–44","45–54","55–64","65+"]],["sex","Sexe",["Femme","Homme","Autre"]],["category","Catégorie socioprofessionnelle",["Étudiant(e)","Salarié(e)","Indépendant(e)","Entrepreneur(e)","Sans emploi","Retraité(e)","Autre"]],["department","Département",["Artibonite","Centre","Grand’Anse","Nippes","Nord","Nord-Est","Nord-Ouest","Ouest","Sud","Sud-Est","Diaspora"]]]

const fmt=n=>Number(n||0).toLocaleString("fr-FR")
const pct=(n,t)=>t?(n/t*100).toLocaleString("fr-FR",{minimumFractionDigits:1,maximumFractionDigits:1})+" %":"0 %"
const hhmm=d=>d?new Date(d).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Port-au-Prince"}):""
const dayLabel=d=>new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"})
const status=v=>{const s=String(v||"").toLocaleLowerCase("fr")
 return s.includes("admis")?["🟢 Admis CEP","green"]:/refus|rejet/.test(s)?["🔴 Refusé CEP","red"]:["🟠 En attente CEP","orange"]}
const nameOf=c=>c.full_name||c.last_name||"Candidat"

function useTurnstile(){
 const box=useRef(null),[token,setToken]=useState("")
 useEffect(()=>{if(!TURNSTILE_SITE_KEY)return
  const render=()=>{if(box.current&&window.turnstile&&!box.current.dataset.done){box.current.dataset.done="1"
   window.turnstile.render(box.current,{sitekey:TURNSTILE_SITE_KEY,language:"fr",callback:setToken,"expired-callback":()=>setToken("")})}}
  if(window.turnstile)render()
  else{const s=document.createElement("script");s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";s.async=true;s.onload=render;document.head.appendChild(s)}},[])
 return [box,token,()=>{setToken("");try{window.turnstile?.reset(box.current)}catch{}}]
}

function Evolution({daily,choices}){
 if(!daily.length)return null
 const days=[...new Set(daily.map(r=>r.day))].sort()
 const share={};for(const r of daily){(share[r.day]??={})[r.candidate_id]=r.total?r.cumul/r.total*100:0}
 const last=days[days.length-1]
 const top=choices.filter(c=>c.kind==="candidate").sort((a,b)=>(share[last]?.[b.id]||0)-(share[last]?.[a.id]||0)).slice(0,4)
 const W=640,H=200,P=30,max=Math.max(10,...top.map(c=>Math.max(...days.map(d=>share[d]?.[c.id]||0))))
 const x=i=>P+(days.length<2?0:i*(W-2*P)/(days.length-1)),y=v=>H-P-(v/max)*(H-2*P)
 return html`<details className="evo" open><summary>Évolution jour par jour</summary>
 <svg viewBox=${"0 0 "+W+" "+H} role="img" aria-label="Évolution de la part des quatre premiers choix">
  <line x1=${P} x2=${W-P} y1=${H-P} y2=${H-P} stroke="#d9c79f"/><line x1=${P} x2=${W-P} y1=${y(max)} y2=${y(max)} stroke="#eee2c6"/>
  <text x="2" y=${y(max)+4} className="axis">${Math.round(max)}</text><text x="2" y=${H-P+4} className="axis">0</text>
  <text x=${P} y=${H-8} className="axis">${dayLabel(days[0])}</text><text x=${W-P} y=${H-8} textAnchor="end" className="axis">${dayLabel(last)}</text>
  ${top.map((c,i)=>html`<polyline key=${c.id} fill="none" stroke=${COLORS[i]} strokeWidth="3" points=${days.map((d,j)=>x(j)+","+y(share[d]?.[c.id]||0)).join(" ")}/>`)}
 </svg>
 <div className="legend">${top.map((c,i)=>html`<span key=${c.id}><i style=${{background:COLORS[i]}}></i>${nameOf(c)}</span>`)}</div>
 <p className="muted">Part de chaque choix parmi les intentions retenues, à la fin de chaque journée (heure d’Haïti). Le tableau donne les 5 derniers jours.</p>
 <div className="table-scroll"><table><thead><tr><th>Jour</th>${top.map(c=>html`<th key=${c.id}>${nameOf(c)}</th>`)}</tr></thead>
 <tbody>${days.slice(-5).reverse().map(d=>html`<tr key=${d}><td>${dayLabel(d)}</td>${top.map(c=>html`<td key=${c.id}>${(share[d]?.[c.id]||0).toLocaleString("fr-FR",{maximumFractionDigits:1})} %</td>`)}</tr>`)}</tbody></table></div>
 </details>`
}

function App(){
 const [candidates,setCandidates]=useState(mergeCandidates([]).map(c=>({...c,kind:"candidate"})))
 const [votes,setVotes]=useState([]),[meta,setMeta]=useState(null),[daily,setDaily]=useState([])
 const [user,setUser]=useState(null),[myVote,setMyVote]=useState(null),[admin,setAdmin]=useState(false)
 const [selected,setSelected]=useState(null),[chosen,setChosen]=useState([])
 const [demo,setDemo]=useState({age_bracket:unknown,sex:unknown,category:unknown,department:unknown})
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[copied,setCopied]=useState(false)
 const [adminMode]=useState(()=>location.hash==="#admin"),[email,setEmail]=useState(""),[password,setPassword]=useState("")
 const [captchaBox,captchaToken,resetCaptcha]=useTurnstile()
 const confirmRef=useRef(null)

 const counts=Object.fromEntries(votes.map(v=>[v.candidate_id,Number(v.total_votes||0)]))
 const total=votes.reduce((a,v)=>a+Number(v.total_votes||0),0)
 const open=total>=THRESHOLD
 const people=candidates.filter(c=>c.kind==="candidate")
 const special=candidates.filter(c=>c.kind!=="candidate").sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
 const ranked=[...candidates].sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0)||nameOf(a).localeCompare(nameOf(b),"fr"))
 const grid=open?[...people].sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0)):[...people].sort((a,b)=>nameOf(a).localeCompare(nameOf(b),"fr"))
 const choice=candidates.find(c=>c.id===selected)

 const loadPublic=async()=>{
  const [c,r,m,d]=await Promise.all([
   supabase.from("candidates").select("id,full_name,last_name,political_group,cep_status,photo_url,kind,sort_order"),
   supabase.rpc("get_vote_intentions_summary"),supabase.rpc("get_barometre_meta"),supabase.rpc("get_vote_daily")])
  if(c.error)throw c.error;if(r.error)throw r.error
  const rows=c.data||[]
  setCandidates([...mergeCandidates(rows.filter(x=>(x.kind||"candidate")==="candidate")).map(x=>({...x,kind:"candidate"})),...rows.filter(x=>x.kind&&x.kind!=="candidate").map(x=>({...x,voting_available:true}))])
  setVotes(r.data||[]);setMeta(m.error?null:m.data);setDaily(d.error?[]:(d.data||[]))}

 const loadPrivate=async u=>{if(!u){setMyVote(null);setAdmin(false);return}
  const v=await supabase.from("vote_intentions").select("candidate_id").eq("voter_id",u.id).maybeSingle()
  if(!v.error)setMyVote(v.data?.candidate_id||null)
  if(!u.is_anonymous){const p=await supabase.from("profiles").select("role").eq("id",u.id).maybeSingle();setAdmin(!p.error&&p.data?.role==="admin")}}

 useEffect(()=>{let alive=true
  ;(async()=>{try{const {data:{session}}=await supabase.auth.getSession();if(!alive)return
   setUser(session?.user||null);await Promise.all([loadPublic(),loadPrivate(session?.user||null)])}
   catch(e){if(alive)setMessage("Erreur de chargement : "+e.message)}finally{if(alive)setLoading(false)}})()
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{if(!alive)return;setUser(s?.user||null);setTimeout(()=>loadPrivate(s?.user||null).catch(()=>{}),0)})
  const timer=setInterval(()=>loadPublic().catch(()=>{}),5*60*1000)
  return()=>{alive=false;subscription.unsubscribe();clearInterval(timer)}},[])

 const pick=id=>{if(myVote||busy)return;setSelected(id);setMessage("");setTimeout(()=>confirmRef.current?.scrollIntoView({behavior:"smooth",block:"center"}),50)}

 const submitVote=async()=>{
  if(!selected||myVote||busy)return
  if(TURNSTILE_SITE_KEY&&!captchaToken){setMessage("Impossible d’enregistrer : cochez d’abord la vérification anti-robot.");return}
  setBusy(true);setMessage("")
  try{
   let u=user
   if(!u){const {data,error}=await supabase.auth.signInAnonymously(TURNSTILE_SITE_KEY?{options:{captchaToken}}:undefined)
    if(error)throw error;u=data.user;setUser(u)}
   const row={voter_id:u.id,candidate_id:selected}
   for(const k of Object.keys(demo))if(demo[k]!==unknown)row[k]=demo[k]
   const {error}=await supabase.from("vote_intentions").insert(row)
   if(error){if(error.code==="23505"){setMessage("Impossible d’enregistrer : une intention a déjà été exprimée depuis cet appareil.");await loadPrivate(u)}else throw error}
   else{setMyVote(selected);setSelected(null);setMessage("Merci. Votre intention a été enregistrée.");await loadPublic()}
  }catch(e){setMessage("Impossible d’enregistrer votre intention : "+e.message)}finally{setBusy(false);resetCaptcha()}}

 const adminLogin=async e=>{e.preventDefault();setBusy(true)
  const {error}=await supabase.auth.signInWithPassword({email,password});setMessage(error?"Impossible : "+error.message:"Connexion administrateur effectuée.");setBusy(false)}

 const changeStatus=async v=>{if(!admin||!chosen.length||busy)return;setBusy(true)
  const {error}=await supabase.from("candidates").update({cep_status:v}).in("id",chosen)
  setMessage(error?"Mise à jour refusée : "+error.message:"Statuts mis à jour.");if(!error){setChosen([]);await loadPublic()};setBusy(false)}

 const copy=async()=>{try{await navigator.clipboard.writeText(PAGE_URL);setCopied(true);setTimeout(()=>setCopied(false),2000)}catch{}}

 const row=c=>{const n=counts[c.id]||0
  return html`<div key=${c.id} className="res-row"><div className="res-name"><b>${nameOf(c)}</b>${c.political_group&&html`<small>${c.political_group}</small>`}</div>
  <div className="res-track"><span style=${{width:(total?n/total*100:0)+"%"}}></span></div>
  <div className="res-num"><b>${pct(n,total)}</b><small>${fmt(n)} intention${n>1?"s":""}</small></div></div>`}

 const isError=/^(Erreur|Impossible|Mise à jour refusée)/.test(message)

 return html`<div className="app-shell"><div className="topline">Un mouvement né en 2017 · Haïti et diaspora</div>
 <header className="head"><a className="brand" href="/"><img src="/logo-original.jpg" alt="Logo BREK"/><span><b>BREK</b><small>Brigade Revolisyon Klasik</small></span></a>
 <nav className="nav">${menus.map(([n,u])=>html`<a key=${n} className=${n==="Baromètre électoral"?"active":""} href=${u}>${n}</a>`)}</nav></header>
 <main><div className="muted">BREK-AYITI · BAROMÈTRE CITOYEN</div><h1>Baromètre d’intentions de vote</h1>
 <p className="lead">Choisissez, confirmez, c’est fait. <b>Aucun compte, aucun e-mail, aucun mot de passe.</b></p>
 <div className="notice"><strong>Sondage d’intentions — non officiel, ne remplace pas l’élection.</strong> Ce baromètre mesure une opinion exprimée volontairement sur internet. Ce n’est pas l’élection organisée par le CEP. BREK ne recommande aucun vote. Les candidats sont affichés à titre informatif, y compris ceux dont le dossier reste en attente de validation par le CEP.</div>
 ${message&&html`<div role="status" className=${"panel "+(isError?"error":"success")}>${message}</div>`}

 <section className="panel" id="resultats"><h2>Président de la République</h2>
 ${meta&&html`<p className="muted">Résultats mis à jour à ${hhmm(meta.generated_at)} (heure d’Haïti), puis toutes les 5 minutes.</p>`}
 ${!open?html`<p><strong>Résultats masqués : ${fmt(total)}/${THRESHOLD} intentions pour l’instant.</strong></p><p className="muted">Les pourcentages seront publiés à partir de ${THRESHOLD} intentions retenues. Aucun classement anticipé n’est affiché.</p>`
 :html`<p><strong>${fmt(total)} intentions retenues</strong></p>
  ${meta?.suspect>0&&html`<p className="alert">Des envois massifs et suspects (${fmt(meta.suspect)}) ont été détectés et retirés des résultats.</p>`}
  <div className="results">${ranked.slice(0,SHOWN).map(row)}</div>
  ${ranked.length>SHOWN&&html`<details className="more"><summary>Voir les ${ranked.length-SHOWN} autres choix</summary><div className="results">${ranked.slice(SHOWN).map(row)}</div></details>`}
  <${Evolution} daily=${daily} choices=${candidates}/>`}
 <div className="actions"><a className="btn-wa" href=${"https://wa.me/?text="+encodeURIComponent("Baromètre citoyen BREK-AYITI — donnez votre intention de vote en 10 secondes, sans compte (sondage non officiel) : "+PAGE_URL)} target="_blank" rel="noopener noreferrer">📲 Pataje sou WhatsApp</a>
 <button className="secondary" onClick=${copy}>${copied?"Lien copié ✓":"Copier le lien"}</button>
 <button className="secondary" disabled=${busy} onClick=${()=>loadPublic().catch(e=>setMessage("Erreur de chargement : "+e.message))}>Actualiser</button></div>
 <details className="method"><summary>Comment ces chiffres sont calculés</summary>
  <p>Chaque appareil peut exprimer une seule intention. Aucun nom, e-mail ni numéro de téléphone n’est demandé.</p>
  <p>Pour repérer les envois en masse, nous gardons une empreinte chiffrée et irréversible de l’adresse réseau, jamais l’adresse elle-même. Quand un nombre anormal d’intentions arrive de la même adresse en moins d’une heure, ces envois sont marqués comme suspects et retirés des résultats. Le seuil est volontairement large, car en Haïti beaucoup de téléphones partagent la même adresse réseau.${TURNSTILE_SITE_KEY?" Une vérification anti-robot discrète bloque aussi les programmes automatiques.":""}</p>
  <p>Les pourcentages portent sur toutes les intentions retenues, y compris « Aucun candidat » et « Je ne sais pas encore ». Ce sondage en ligne n’est pas un échantillon scientifique : il reflète seulement les personnes qui ont choisi d’y répondre.</p>
 </details></section>

 <section className="panel vote-panel" id="voter"><h2>${myVote?"Votre intention est enregistrée":"Exprimer mon intention"}</h2>
 ${myVote?html`<p className="success">✓ Vous avez choisi : <b>${nameOf(candidates.find(c=>c.id===myVote)||{})}</b>. Une seule intention par appareil.</p>`
 :html`<p>1. Touchez un candidat ci-dessous, ou l’un de ces choix. 2. Confirmez.</p>
  <div className="actions">${special.map(c=>html`<button key=${c.id} className=${selected===c.id?"":"secondary"} disabled=${busy} onClick=${()=>pick(c.id)}>${nameOf(c)}</button>`)}</div>`}
 </section>

 <h2>Les candidats (${people.length})</h2>
 ${loading?html`<p>Chargement des candidats…</p>`:html`<div className="grid">${grid.map(c=>{const st=status(c.cep_status),n=counts[c.id]||0
  return html`<article key=${c.id} className=${"candidate"+(selected===c.id?" picked":"")+(myVote===c.id?" mine":"")}>
  ${c.photo_url&&(c.photo_url.startsWith("https://")||c.photo_url.startsWith("/news/"))&&html`<img className=${/ricardo\s+jean[- ]pierre/i.test(c.full_name||"")?"portrait-ricardo":""} src=${c.photo_url} alt=${"Photo de "+c.full_name} loading="lazy"/>`}
  <div className="name">${nameOf(c)}</div><div className="muted">${c.political_group||"Groupe non précisé"}</div><span className=${"badge "+st[1]}>${st[0]}</span>
  ${open&&html`<div><strong>${pct(n,total)}</strong> <span className="muted">· ${fmt(n)}</span><div className="bar"><div className="fill" style=${{width:(total?n/total*100:0)+"%"}}></div></div></div>`}
  ${myVote===c.id?html`<div className="voteLabel">✓ Votre intention</div>`:!myVote&&(c.voting_available?html`<button disabled=${busy} className=${selected===c.id?"":"secondary"} onClick=${()=>pick(c.id)}>${selected===c.id?"✓ Sélectionné":"Choisir"}</button>`:html`<p className="muted">Choix bientôt disponible.</p>`)}
  </article>`})}</div>`}

 ${!myVote&&choice&&html`<div className="confirm" ref=${confirmRef} role="dialog" aria-label="Confirmer mon intention">
  <p>Votre choix : <b>${nameOf(choice)}</b></p>
  <details><summary>Ajouter des informations facultatives (âge, sexe, département…)</summary><div className="fields">${demoFields.map(([k,l,o])=>html`<label key=${k} className="field">${l}<select value=${demo[k]} onChange=${e=>setDemo({...demo,[k]:e.target.value})}>${[unknown,...o].map(x=>html`<option key=${x} value=${x}>${x}</option>`)}</select></label>`)}</div></details>
  ${TURNSTILE_SITE_KEY&&html`<div ref=${captchaBox} className="captcha"></div>`}
  <div className="actions"><button disabled=${busy} onClick=${submitVote}>${busy?"Enregistrement…":"Confirmer mon intention"}</button><button className="secondary" disabled=${busy} onClick=${()=>setSelected(null)}>Annuler</button></div>
 </div>`}

 ${adminMode&&!admin&&html`<section className="panel"><h2>Connexion administrateur</h2><form onSubmit=${adminLogin}><div className="fields">
  <label className="field">E-mail<input type="email" required value=${email} onChange=${e=>setEmail(e.target.value)}/></label>
  <label className="field">Mot de passe<input type="password" required value=${password} onChange=${e=>setPassword(e.target.value)}/></label></div>
  <div className="actions"><button disabled=${busy} type="submit">Se connecter</button></div></form></section>`}
 ${admin&&html`<section className="panel"><h2>Administration · statuts CEP</h2>${people.filter(c=>c.voting_available).map(c=>html`<label key=${c.id} style=${{display:"block",padding:"7px 0"}}><input type="checkbox" style=${{width:"auto",marginRight:10}} checked=${chosen.includes(c.id)} onChange=${e=>setChosen(e.target.checked?[...chosen,c.id]:chosen.filter(x=>x!==c.id))}/>${c.full_name} — ${c.cep_status||"En attente"}</label>`)}
  <div className="actions"><button disabled=${busy||!chosen.length} onClick=${()=>changeStatus("Admis")}>Marquer ADMIS</button><button disabled=${busy||!chosen.length} onClick=${()=>changeStatus("Refusé")}>Marquer REFUSÉ</button><button disabled=${busy||!chosen.length} onClick=${()=>changeStatus("En attente")}>Remettre EN ATTENTE</button><button className="secondary" onClick=${()=>supabase.auth.signOut()}>Se déconnecter</button></div></section>`}
 </main><footer className="foot">BREK · Brigade Revolisyon Klasik — Baromètre non officiel</footer></div>`}

createRoot(document.getElementById("root")).render(React.createElement(App))
