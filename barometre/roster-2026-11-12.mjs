export const additions=[
  {
    "id": "c704af7d-be1c-5287-a691-8ea99a1dd23a",
    "full_name": "Jude Célestin",
    "last_name": "Célestin",
    "political_group": "ENA",
    "cep_status": "En attente",
    "photo_url": "https://brek-ayiti.pages.dev/news/26-candidats-choisir-autrement/portraits/04.webp"
  },
  {
    "id": "7fc5a3bc-82d0-56de-b9c3-64ca45888084",
    "full_name": "Marc Arthur Drouillard",
    "last_name": "Drouillard",
    "political_group": "MRN",
    "cep_status": "En attente",
    "photo_url": "https://brek-ayiti.pages.dev/news/26-candidats-choisir-autrement/portraits/07.webp"
  },
  {
    "id": "aabfcf4c-5a54-5d4e-8ef1-25f612a3f896",
    "full_name": "Dominique Dupuy",
    "last_name": "Dupuy",
    "political_group": "PVD",
    "cep_status": "En attente",
    "photo_url": "https://brek-ayiti.pages.dev/news/26-candidats-choisir-autrement/portraits/08.webp"
  },
  {
    "id": "dfdf69cc-7b3e-5125-a344-2e3cfcd7f1e3",
    "full_name": "Walsonn Sanon",
    "last_name": "Sanon",
    "political_group": "Anfòs pou sove lonè",
    "cep_status": "En attente",
    "photo_url": "https://brek-ayiti.pages.dev/news/26-candidats-choisir-autrement/portraits/23.webp"
  },
  {
    "id": "7b1658c0-696c-5622-a425-5be4468b31c1",
    "full_name": "Marie Anne Savannah Hadid Savary",
    "last_name": "Savary",
    "political_group": "HAMAD",
    "cep_status": "En attente",
    "photo_url": "https://brek-ayiti.pages.dev/news/26-candidats-choisir-autrement/portraits/24.webp"
  }
];
export const normalizeName=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function missingCandidates(current){const names=new Set(current.map(c=>normalizeName(c.full_name)));return additions.filter(c=>!names.has(normalizeName(c.full_name)));}
export function mergeCandidates(current){return [...current.map(c=>({...c,persisted:true})),...missingCandidates(current).map(c=>({...c,persisted:false}))];}
