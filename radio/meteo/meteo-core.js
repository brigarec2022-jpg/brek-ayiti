/* MÉTÉO BREK — noyau commun (navigateur + Node)
   Source des données : Open-Meteo.com (CC BY 4.0). Aucune clé API.
   Règle : aucune prévision n'est inventée. Si une donnée manque, on le dit. */
(function (root) {
  const TZ = 'America/Port-au-Prince';
  const VILLES = [
    { dep: 'Nord', v: 'Cap-Haïtien', lat: 19.7594, lon: -72.2009 },
    { dep: 'Nord-Est', v: 'Fort-Liberté', lat: 19.6656, lon: -71.8389 },
    { dep: 'Nord-Ouest', v: 'Port-de-Paix', lat: 19.9395, lon: -72.8305 },
    { dep: 'Artibonite', v: 'Gonaïves', lat: 19.4475, lon: -72.6889 },
    { dep: 'Artibonite', v: 'Saint-Marc', lat: 19.1082, lon: -72.6939 },
    { dep: 'Centre', v: 'Hinche', lat: 19.1430, lon: -72.0049 },
    { dep: 'Ouest', v: 'Port-au-Prince', lat: 18.5392, lon: -72.3350 },
    { dep: 'Ouest', v: 'Delmas', lat: 18.5447, lon: -72.3027 },
    { dep: 'Ouest', v: 'Tabarre', lat: 18.5833, lon: -72.2667 },
    { dep: 'Ouest', v: 'Pétion-Ville', lat: 18.5125, lon: -72.2853 },
    { dep: 'Ouest', v: 'Léogâne', lat: 18.5111, lon: -72.6339 },
    { dep: 'Sud-Est', v: 'Jacmel', lat: 18.2342, lon: -72.5347 },
    { dep: 'Nippes', v: 'Miragoâne', lat: 18.4459, lon: -73.0896 },
    { dep: 'Sud', v: 'Les Cayes', lat: 18.1933, lon: -73.7461 },
    { dep: "Grand'Anse", v: 'Jérémie', lat: 18.6500, lon: -74.1167 },
  ];
  const DEPS = ['Nord', 'Nord-Est', 'Nord-Ouest', 'Artibonite', 'Centre', 'Ouest', 'Sud-Est', 'Nippes', 'Sud', "Grand'Anse"];

  function url() {
    const q = new URLSearchParams({
      latitude: VILLES.map(x => x.lat).join(','),
      longitude: VILLES.map(x => x.lon).join(','),
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code,precipitation',
      hourly: 'precipitation_probability,weather_code,temperature_2m',
      daily: 'temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,precipitation_sum,weather_code,sunrise,sunset,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max',
      timezone: TZ, forecast_days: '2',
    });
    return 'https://api.open-meteo.com/v1/forecast?' + q.toString();
  }

  // Libellés WMO
  function ciel(c) {
    if (c == null) return 'conditions indisponibles';
    if (c === 0) return 'ciel dégagé';
    if (c === 1) return 'temps plutôt ensoleillé';
    if (c === 2) return 'ciel partiellement nuageux';
    if (c === 3) return 'ciel couvert';
    if (c === 45 || c === 48) return 'brouillard';
    if (c >= 51 && c <= 57) return 'bruine';
    if (c >= 61 && c <= 67) return 'pluie';
    if (c >= 80 && c <= 82) return 'averses';
    if (c >= 95) return 'orages';
    return 'temps variable';
  }
  function icone(c) {
    if (c == null) return 'na';
    if (c <= 1) return 'sun'; if (c === 2) return 'part'; if (c === 3 || c === 45 || c === 48) return 'cloud';
    if (c >= 95) return 'storm'; if (c >= 51) return 'rain'; return 'part';
  }

  const PER = [['la matinée', 6, 12], ["l'après-midi", 12, 18], ['la soirée', 18, 24], ['la nuit', 24, 30]];
  // Analyse d'une ville à partir des données brutes (index i dans la réponse multi-lieux)
  function analyse(raw, i, jour) {
    const r = Array.isArray(raw) ? raw[i] : raw; if (!r || !r.daily) return null;
    const d = jour || 0, D = r.daily, H = r.hourly || {};
    const base = d * 24, pr = [];
    for (const [nom, a, b] of PER) {
      let mx = -1, orage = false;
      for (let h = base + a; h < base + b && h < (H.time || []).length; h++) {
        const p = H.precipitation_probability ? H.precipitation_probability[h] : null;
        if (p != null && p > mx) mx = p;
        if (p >= 40 && H.weather_code && H.weather_code[h] >= 95) orage = true;
      }
      pr.push({ nom, p: mx < 0 ? null : mx, orage });
    }
    const hm = s => s ? s.slice(11, 16) : null;
    return {
      dep: VILLES[i].dep, v: VILLES[i].v,
      tmin: D.temperature_2m_min[d], tmax: D.temperature_2m_max[d], ress: D.apparent_temperature_max[d],
      pluie: D.precipitation_probability_max[d], mm: D.precipitation_sum[d], code: D.weather_code[d],
      lever: hm(D.sunrise[d]), coucher: hm(D.sunset[d]), uv: D.uv_index_max[d],
      vent: D.wind_speed_10m_max[d], rafales: D.wind_gusts_10m_max[d], periodes: pr,
      cur: d === 0 && r.current ? r.current : null,
    };
  }

  // Ciel dominant prudent : on ne parle d'orage/pluie que si la probabilité le justifie
  function resume(a) {
    const humides = a.periodes.filter(p => p.p != null && p.p >= 40);
    const orage = humides.some(p => p.orage);
    let ciel0 = a.code != null && a.code >= 51 ? 'ciel partiellement nuageux' : ciel(a.code);
    if (!humides.length) return { txt: ciel0, pluieTxt: 'pas de pluie significative attendue', humides, orage };
    const quand = humides.map(p => p.nom).join(' et ');
    const pmax = Math.max(...humides.map(p => p.p));
    const mot = orage ? 'orages' : 'averses';
    const niv = pmax >= 80 ? `${mot} très probables` : pmax >= 60 ? `${mot} probables` : `${mot} possibles`;
    return { txt: ciel0, pluieTxt: `${niv} dans ${quand}`, humides, orage, pmax };
  }

  // Points de vigilance automatiques — JAMAIS présentés comme alertes officielles
  function vigilances(as) {
    const v = [];
    const chaud = as.filter(a => a.ress >= 38).map(a => a.v);
    if (chaud.length) v.push({ k: 'chaleur', t: `Chaleur ressentie très forte (38 degrés ou plus) : ${chaud.join(', ')}.` });
    const pluie = as.filter(a => a.pluie >= 70 && a.mm >= 15).map(a => a.v);
    if (pluie.length) v.push({ k: 'pluie', t: `Pluies abondantes possibles : ${pluie.join(', ')}. Prudence près des ravines et sur les routes inondables.` });
    const vent = as.filter(a => a.rafales >= 50).map(a => a.v);
    if (vent.length) v.push({ k: 'vent', t: `Rafales de vent fortes possibles : ${vent.join(', ')}.` });
    const uv = as.filter(a => a.uv >= 8).map(a => a.v);
    if (uv.length) v.push({ k: 'uv', t: `Indice UV très élevé : ${uv.join(', ')}.` });
    return v;
  }

  // Conseils pratiques — consignes générales de bon sens, liées aux conditions prévues
  function conseils(as) {
    const ressMax = Math.max(...as.map(a => a.ress)), pMax = Math.max(...as.map(a => a.pluie)), uvMax = Math.max(...as.map(a => a.uv));
    const orage = as.some(a => resume(a).orage);
    const maison = ['Buvez de l\'eau régulièrement, même sans soif.'];
    if (ressMax >= 33) maison.push('Aux heures les plus chaudes, aérez la maison et restez à l\'ombre.');
    if (orage) maison.push('Pendant un orage, restez à l\'abri et débranchez les appareils électriques.');
    maison.push('Veillez particulièrement sur les enfants et les personnes âgées.');
    const dehors = [];
    if (uvMax >= 6) dehors.push('Entre 10 heures et 15 heures, protégez-vous du soleil : chapeau, ombre, eau.');
    if (pMax >= 40) dehors.push('Prévoyez un parapluie ou un imperméable.');
    if (pMax >= 60) dehors.push('Conducteurs et piétons : ne traversez jamais une rue ou une ravine inondée.');
    dehors.push('Au volant, réduisez la vitesse sur chaussée mouillée.');
    return { maison, dehors };
  }

  // ---------- Script radio (adapté à la synthèse vocale : pas de symboles) ----------
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function dateFr(iso) { const [y, m, d] = iso.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d, 12)); return `${JOURS[dt.getUTCDay()]} ${d === 1 ? '1er' : d} ${MOIS[m - 1]} ${y}`; }
  const deg = x => `${Math.round(x)} degrés`;
  const heure = s => { const [h, m] = s.split(':').map(Number); return m ? `${h} heures ${String(m).padStart(2, '0')}` : `${h} heures`; };
  const voix = s => s.replace(/(\d+) %/g, '$1 pour cent').replace(/'/g, '’');

  function script(raw, edition) {
    const jour = edition === 'soir' ? 0 : 0;
    const as = VILLES.map((_, i) => analyse(raw, i, jour)).filter(Boolean);
    if (as.length !== VILLES.length) return { ok: false, erreur: 'Données incomplètes : bulletin non généré.' };
    const pap = as.find(a => a.v === 'Port-au-Prince');
    const date = raw[0].daily.time[0];
    const ed = { matin: 'la météo du matin', midi: 'la météo de midi', soir: 'la météo du soir' }[edition];
    const L = [];
    L.push(`Radio BREK, ${ed}. Météo BREK : le temps chez vous, les conseils pour votre journée.`);
    L.push(`Nous sommes le ${dateFr(date)}.`);
    const rp = resume(pap);
    if (edition === 'matin') {
      L.push(`À Port-au-Prince, le soleil s’est levé à ${heure(pap.lever)} et se couchera à ${heure(pap.coucher)}.`);
      L.push(`Aujourd’hui dans la capitale : ${rp.txt}, de ${deg(pap.tmin)} au lever du jour à ${deg(pap.tmax)} au plus chaud. La chaleur ressentie pourra atteindre ${deg(pap.ress)}. ${cap(rp.pluieTxt)}.`);
    } else if (edition === 'midi') {
      const c = pap.cur;
      if (c) L.push(`En ce moment à Port-au-Prince, il fait ${deg(c.temperature_2m)}, avec une chaleur ressentie de ${deg(c.apparent_temperature)} et ${c.relative_humidity_2m} % d’humidité.`);
      const apm = pap.periodes[1];
      L.push(`Pour l’après-midi : maximum ${deg(pap.tmax)}. ${apm.p != null && apm.p >= 40 ? niveau(apm) + '.' : 'Peu de risque d’averses.'}`);
    } else {
      L.push(`À Port-au-Prince, le soleil se couche à ${heure(pap.coucher)}.`);
      const s = pap.periodes[2], n = pap.periodes[3];
      L.push(`Ce soir : ${s.p != null && s.p >= 40 ? niveau(s).toLowerCase() : 'temps généralement sec'}. Cette nuit : ${n.p != null && n.p >= 40 ? niveau(n).toLowerCase() : 'peu de pluie attendue'}.`);
    }
    // Régions
    L.push('Dans les départements.');
    for (const dep of DEPS) {
      const vs = as.filter(a => a.dep === dep);
      if (dep === 'Ouest') {
        const autres = vs.filter(a => a.v !== 'Port-au-Prince');
        L.push(`Dans l’Ouest, ${autres.map(a => `${a.v} ${Math.round(a.tmax)}`).join(', ')} degrés au maximum. ${groupePluie(autres)}`);
        continue;
      }
      const t = vs.map(a => { const r = resume(a); return `${a.v}, ${r.txt}, maximum ${deg(a.tmax)}, ${r.pluieTxt}`; }).join(' ; ');
      L.push(`${prepDep(dep)} : ${t}.`);
    }
    if (edition === 'soir') {
      const dm = VILLES.map((_, i) => analyse(raw, i, 1)).filter(Boolean), p2 = dm.find(a => a.v === 'Port-au-Prince');
      if (p2) { const r2 = resume(p2); L.push(`Demain à Port-au-Prince : ${r2.txt}, de ${deg(p2.tmin)} à ${deg(p2.tmax)}, ${r2.pluieTxt}. Lever du soleil à ${heure(p2.lever)}.`); }
    }
    const vg = vigilances(as);
    if (vg.length) { L.push('Points de vigilance, selon les prévisions : ' + vg.map(x => x.t).join(' ')); }
    const co = conseils(as);
    L.push('Nos conseils. À la maison : ' + co.maison.join(' '));
    L.push('Si vous sortez : ' + co.dehors.join(' '));
    L.push('Ces informations sont des prévisions. En cas d’alerte officielle, suivez les consignes de la Protection civile et de l’Unité hydrométéorologique d’Haïti.');
    L.push('C’était Météo BREK, sur Radio BREK. Ayiti d’abord, Ayiti toujours !');
    const texte = voix(L.join('\n\n'));
    return { ok: true, texte, date, edition, prevision: raw[0].current ? raw[0].current.time : null };
  }
  function niveau(p) { const m = p.orage ? 'Orages' : 'Averses'; return p.p >= 80 ? `${m} très probables` : p.p >= 60 ? `${m} probables` : `${m} possibles`; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function prepDep(d) { return ({ 'Nord': 'Dans le Nord', 'Nord-Est': 'Dans le Nord-Est', 'Nord-Ouest': 'Dans le Nord-Ouest', 'Artibonite': 'Dans l’Artibonite', 'Centre': 'Dans le Centre', 'Sud-Est': 'Dans le Sud-Est', 'Nippes': 'Dans les Nippes', 'Sud': 'Dans le Sud', "Grand'Anse": 'Dans la Grand’Anse' })[d] || d; }
  function groupePluie(vs) {
    const h = vs.map(a => ({ a, r: resume(a) })).filter(x => x.r.humides.length);
    if (!h.length) return 'Pas de pluie significative attendue.';
    return `${h[0].r.orage ? 'Orages' : 'Averses'} ${h[0].r.pmax >= 60 ? 'probables' : 'possibles'} à ${h.map(x => x.a.v).join(', ')}, surtout dans ${h[0].r.humides.map(p => p.nom).join(' et ')}.`;
  }

  root.MeteoBREK = { TZ, VILLES, DEPS, url, ciel, icone, analyse, resume, vigilances, conseils, script };
  if (typeof module !== 'undefined') module.exports = root.MeteoBREK;
})(typeof window !== 'undefined' ? window : globalThis);
