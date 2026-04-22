import React, { useState, useEffect, useMemo } from 'react';
import {
  Anchor, Ship, Users, TrendingUp, Archive as ArchiveIcon, Plus, Trash2, Edit2,
  ArrowLeft, Home, Waves, FileText, ChevronRight, AlertCircle, X, Save,
  LayoutDashboard, Coins, Package, Printer,
  Fuel, Wrench, Gift, Store, RefreshCcw, ClipboardList,
  Upload, Sparkles, FileSpreadsheet, Loader2, Camera, FileUp, Wand2, Check
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const FRAIS_CATS = [
  { id:'consommable', label:'Consommables', color:'#4a6fa5', bg:'bg-blue-50', text:'text-blue-700', border:'border-blue-200', icon:Fuel },
  { id:'admin', label:'Administratif', color:'#6b7280', bg:'bg-slate-50', text:'text-slate-700', border:'border-slate-200', icon:ClipboardList },
  { id:'entretien', label:'Entretien matériel', color:'#d97706', bg:'bg-orange-50', text:'text-orange-700', border:'border-orange-200', icon:Wrench },
  { id:'pourboire', label:'Pourboires (الفقيرة)', color:'#b45309', bg:'bg-amber-50', text:'text-amber-700', border:'border-amber-200', icon:Gift },
  { id:'fournisseur', label:'Fournisseurs', color:'#059669', bg:'bg-emerald-50', text:'text-emerald-700', border:'border-emerald-200', icon:Store },
  { id:'remboursement', label:'Remboursements (صاير)', color:'#b91c1c', bg:'bg-red-50', text:'text-red-700', border:'border-red-200', icon:RefreshCcw },
];

const DEFAULT_FRAIS = [
  { name: 'Gasoil (مازوط)',                       category: 'consommable' },
  { name: 'Glace (لاكلاص)',                       category: 'consommable' },
  { name: 'Huile moteur (الزيت)',                 category: 'consommable' },
  { name: 'Magasin — stockage filets (ماكازة)',   category: 'consommable' },
  { name: 'Assurance (لاصورنص)',                  category: 'admin' },
  { name: 'Taxes (الضريبة)',                      category: 'admin' },
  { name: 'Honoraires comptable (المحاسب)',       category: 'admin' },
  { name: 'Réparation filet (الشبكة)',            category: 'entretien' },
  { name: 'Pourboire manutentionnaire (الفقيرة العنبر)', category: 'pourboire' },
  { name: 'Pourboire gardien (الفقيرة العساس)',    category: 'pourboire' },
];

const ROLES = [
  { value:'PP', label:'Patron (Capitaine)', parts:2 },
  { value:'SP', label:'Second Patron', parts:1.5 },
  { value:'MEC', label:'Mécanicien', parts:1.5 },
  { value:'SMEC', label:'Second Mécanicien', parts:1.25 },
  { value:'GLC', label:'Glacier', parts:1.25 },
  { value:'CUIS', label:'Cuisinier', parts:1.25 },
  { value:'MAT', label:'Matelot', parts:1 },
  { value:'RAM', label:'Ramandeur', parts:1 },
  { value:'Gar', label:'Gardien', parts:0.5 },
  { value:'Ger', label:'Gérant', parts:0.5 },
  { value:'Cpt', label:'Comptable', parts:0.25 },
  { value:'AUT', label:'Autre', parts:1 },
];

const STORAGE = {
  // Uses localStorage — data stays on the user's device, no account needed
  async listBoats() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('boat:'));
      return keys.map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }).filter(Boolean);
    } catch { return []; }
  },
  async saveBoat(b) {
    try { localStorage.setItem(`boat:${b.id}`, JSON.stringify(b)); return { key: `boat:${b.id}`, value: JSON.stringify(b) }; }
    catch (e) { throw new Error('Stockage plein ou indisponible'); }
  },
  async deleteBoat(id) { localStorage.removeItem(`boat:${id}`); return { deleted: true }; },
  async listDecomptes() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('decompte:'));
      return keys.map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }).filter(Boolean);
    } catch { return []; }
  },
  async saveDecompte(d) {
    try { localStorage.setItem(`decompte:${d.id}`, JSON.stringify(d)); return { key: `decompte:${d.id}`, value: JSON.stringify(d) }; }
    catch (e) { throw new Error('Stockage plein ou indisponible'); }
  },
  async deleteDecompte(id) { localStorage.removeItem(`decompte:${id}`); return { deleted: true }; },
  // API key management
  getApiKey() { try { return localStorage.getItem('anthropic_api_key') || ''; } catch { return ''; } },
  setApiKey(key) { try { localStorage.setItem('anthropic_api_key', key); } catch {} },
  clearApiKey() { try { localStorage.removeItem('anthropic_api_key'); } catch {} },
};

function calc(d) {
  const brut = +d.brut || 0, especes = +d.especes || 0, fakira = +d.fakira || 0;
  const tot_net = brut + especes - fakira;
  const frais = (d.frais || []).map(f => ({ ...f, amount: +f.amount || 0 }));
  const total_frais = frais.reduce((s, f) => s + f.amount, 0);
  const frais_by_cat = FRAIS_CATS.map(cat => ({
    ...cat,
    items: frais.filter(f => f.category === cat.id && f.amount > 0),
    total: frais.filter(f => f.category === cat.id).reduce((s, f) => s + f.amount, 0),
  }));
  const n_repartir = tot_net - total_frais;
  const pool_armateur = n_repartir / 2, pool_equipage = n_repartir / 2;
  const crew = (d.crew || []).map(m => ({ ...m, parts: +m.parts || 0 }));
  const total_parts_equipage = crew.reduce((s, m) => s + m.parts, 0);
  const part_value = total_parts_equipage > 0 ? pool_equipage / total_parts_equipage : 0;
  const transferts = (d.transferts || []).map(t => {
    const amt = t.kind === 'parts' ? (+t.parts || 0) * part_value : (+t.amount || 0);
    return { ...t, computedAmount: amt };
  });
  const total_transferts_dh = transferts.reduce((s, t) => s + t.computedAmount, 0);
  const transferts_per_crew = {};
  transferts.forEach(t => {
    if (t.targetType === 'crew' && t.targetCrewId) {
      transferts_per_crew[t.targetCrewId] = (transferts_per_crew[t.targetCrewId] || 0) + t.computedAmount;
    } else if (t.targetType === 'collective-role' && t.targetRole) {
      const members = crew.filter(m => m.role === t.targetRole);
      if (members.length > 0) {
        const per = t.computedAmount / members.length;
        members.forEach(m => { transferts_per_crew[m.id] = (transferts_per_crew[m.id] || 0) + per; });
      }
    }
  });
  const crewCalc = crew.map(m => {
    const salaire_part = m.parts * part_value;
    const bonus = transferts_per_crew[m.id] || 0;
    return { ...m, salaire_part, bonus, total_brut_marin: salaire_part + bonus };
  });
  const total_equipage_brut = pool_equipage + total_transferts_dh;
  const armateur_keeps = pool_armateur - total_transferts_dh;
  const avances = (d.avances || []).map(a => ({ ...a, amount: +a.amount || 0 }));
  const total_avances = avances.reduce((s, a) => s + a.amount, 0);
  const cash_to_pay = total_equipage_brut - total_avances;
  return { brut, especes, fakira, tot_net, total_frais, frais_by_cat, frais, n_repartir, pool_armateur, pool_equipage,
    total_parts_equipage, part_value, crew: crewCalc, transferts, total_transferts_dh, total_equipage_brut, armateur_keeps,
    avances, total_avances, cash_to_pay };
}

const fmt = n => { const x = isFinite(n) && !isNaN(n) ? n : 0; return (Math.round(x * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits:2, maximumFractionDigits:2 }); };
const fmtDH = n => `${fmt(n)} DH`;
const fmtK = n => { const x = isFinite(n) && !isNaN(n) ? n : 0; if (Math.abs(x) >= 1000) return `${(x/1000).toLocaleString('fr-FR', { maximumFractionDigits:1 })}k`; return Math.round(x).toLocaleString('fr-FR'); };
const fmtDateFR = d => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; } };
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const FONT_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');
* { box-sizing: border-box; }
html, body, #root { margin: 0; }
body { font-family: 'Geist', system-ui, sans-serif; }
.font-display { font-family: 'Fraunces', serif; font-variation-settings: "SOFT" 100; }
.font-mono { font-family: 'Geist Mono', monospace; }
.paper-bg { background-color: #faf6ed; background-image: radial-gradient(ellipse 1000px 500px at 0% 0%, rgba(200, 157, 79, 0.08), transparent), radial-gradient(ellipse 800px 400px at 100% 100%, rgba(184, 92, 60, 0.05), transparent); }
.paper-bg::before { content: ''; position: fixed; inset: 0; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E"); opacity: 0.06; z-index: 0; }
.shadow-soft { box-shadow: 0 1px 2px rgba(26, 45, 69, 0.04), 0 4px 14px rgba(26, 45, 69, 0.06); }
.shadow-card { box-shadow: 0 1px 3px rgba(26, 45, 69, 0.05), 0 8px 24px rgba(26, 45, 69, 0.08); }
.input-base { background: #fffbf4; border: 1px solid #e6dcc8; border-radius: 4px; padding: 0.5rem 0.65rem; font-family: 'Geist Mono', monospace; font-size: 0.85rem; color: #1a2d45; outline: none; transition: border-color 0.15s, box-shadow 0.15s; width: 100%; }
.input-base:focus { border-color: #c89d4f; box-shadow: 0 0 0 3px rgba(200, 157, 79, 0.15); }
.input-text { font-family: 'Geist', sans-serif; }
.animate-in { animation: fadeInUp 0.35s ease-out backwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@media print { body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .paper-bg::before { display: none !important; } .no-print { display: none !important; } .print-only { display: block !important; } main, header, nav { padding: 0 !important; margin: 0 !important; max-width: 100% !important; } @page { margin: 1cm; size: A4; } }
.print-only { display: none; }
`;

// ============ AI EXTRACTION ============

const EXTRACTION_PROMPT = `Tu es un assistant comptable spécialisé dans la pêche palangrier marocaine. Tu reçois un ou plusieurs documents qu'un armateur utilise pour établir son décompte :

1. **Bordereau ONP** (Office National des Pêches) — donne le brut de la vente
2. **Factures fournisseurs** — gasoil (مازوط), glace (لاكلاص), huile (الزيت), nourriture (الكاشطي), magasin/stockage (ماكازة), assurance (لاصورنص), taxes (الضريبة), réparation filets (الشبكة), honoraires comptable (المحاسب), pourboires (الفقيرة), remboursements capitaine (صاير), etc.
3. **Liste d'équipage** — noms des marins, rôles, nombre de parts décidées
4. **Avances déjà versées** — chèques donnés aux marins ou au capitaine avant le décompte
5. **Feuille de décompte complet** (version papier déjà calculée, comme référence)

Ta mission : lis TOUS les documents fournis, comprends le rôle de chacun (bordereau, facture, liste...), et retourne UNIQUEMENT un objet JSON valide (pas de markdown, pas de \`\`\`, juste le JSON pur).

## RÈGLES IMPORTANTES DE LANGUE

- **Tout le texte doit être en FRANÇAIS**
- Les termes arabes traditionnels DOIVENT apparaître **entre parenthèses** après le terme français
- Exemples corrects :
  * "Gasoil (مازوط)"
  * "Glace (لاكلاص)"
  * "Nourriture équipage (الكاشطي)"
  * "Pourboire manutentionnaire (الفقيرة العنبر)"
  * "Remboursement capitaine Abdellah (صاير اسني عبد الله)"
  * "Magasin stockage filets (ماكازة)"
  * "Honoraires comptable (المحاسب)"
- Si le document n'est qu'en arabe, traduis d'abord puis mets l'arabe en parenthèses
- Les NOMS PROPRES des marins restent tels qu'écrits (ex: "OUANIR AHMED")

## STRUCTURE JSON ATTENDUE

{
  "header": {
    "boat_name": "string (ex: BT ASNI-2)",
    "matricule": "string (ex: N° 12-98)",
    "decompte_number": "string (ex: DECO 5)",
    "date": "YYYY-MM-DD"
  },
  "recettes": {
    "brut": number,
    "especes": number,
    "fakira": number
  },
  "frais": [
    {
      "name": "Nom en français avec arabe en parenthèses",
      "amount": number,
      "category": "consommable|admin|entretien|pourboire|fournisseur|remboursement"
    }
  ],
  "crew": [
    { "name": "NOM", "role": "PP|SP|MEC|SMEC|GLC|CUIS|MAT|RAM|Gar|Ger|Cpt|AUT", "parts": number }
  ],
  "transferts": [
    { "label": "Description (en français)", "kind": "parts", "parts": number, "target_role": "PP|Ger|Cpt|MAT|RAM|null", "target_name": "nom du marin ou null" }
  ],
  "avances": [
    { "label": "Chèque marin (Chèque البحرية) ou Chèque capitaine (Chèque عبد الله)", "amount": number }
  ]
}

## CATÉGORIES DE FRAIS

- **consommable** : gasoil (مازوط), glace (لاكلاص), huile moteur (الزيت), magasin/stockage (ماكازة)
- **admin** : assurance (لاصورنص), taxes/impôts (الضريبة), honoraires comptable (المحاسب)
- **entretien** : réparation filet (الشبكة)
- **pourboire** : tout ce qui contient الفقيرة (pourboire manutentionnaire, gardien, etc.)
- **fournisseur** : nourriture équipage (الكاشطي), tout autre fournisseur identifiable
- **remboursement** : tout commençant par صاير (saier) — rembourse des dépenses personnelles du capitaine ou autres

## RÔLES DE L'ÉQUIPAGE

- **PP** = Patron Pêcheur / Capitaine
- **SP** = Second Patron
- **MEC** = Mécanicien
- **SMEC** = Second Mécanicien
- **GLC** = Glacier (responsable de la glace)
- **CUIS** = Cuisinier
- **MAT** = Matelot
- **RAM** = Ramandeur (répare les filets)
- **Gar** = Gardien
- **Ger** = Gérant
- **Cpt** = Comptable

## RÔLES COMBINÉS

Si tu vois un marin avec un rôle combiné comme "SP+RAM", "MEC+RAM", "S MEC+GLC" :
- Garde seulement le rôle principal (premier = "SP" par exemple)
- Ajoute un transfert collectif pour le rôle bonus si pertinent (par exemple 0,25 part collective pour tous ceux qui ont "+RAM")

## TRANSFERTS TYPIQUES

L'armateur verse des bonus depuis ses 50% vers l'équipage :
- **3 parts au capitaine** (bonus traditionnel)
- **1 part au gérant**
- **0,25 part au comptable**
- **0,25 part collective aux matelots** (divisée entre tous les MAT)
- **0,25 part collective aux ramandeurs**
- **Montants fixes en DH** pour remboursements (صاير)

Ne mets dans "transferts" QUE ceux que tu identifies explicitement dans les documents. Si le décompte est complet et montre la répartition finale, déduis les transferts des bonus visibles.

## SI UN DOCUMENT EST MANQUANT

- Pas de bordereau ONP → brut = 0, l'utilisateur le remplira
- Pas de factures → frais = [] vide
- Pas de liste équipage → crew = [] vide
- Date manquante → utilise aujourd'hui
- Valeurs numériques manquantes → 0

## FORMAT DES MONTANTS

- Retourne toujours des NOMBRES, jamais des strings
- "12 450,00" → 12450.00
- "1 000" → 1000
- Enlève les espaces, virgules en décimales → convertis en points

Retourne UNIQUEMENT le JSON, sans aucun autre texte, sans markdown.`;

async function extractDecompteFromFiles(files) {
  if (!files || !files.length) throw new Error("Aucun fichier fourni");

  // Convert each file to base64 + prepare content blocks
  const contentBlocks = [];

  for (const file of files) {
    const base64Data = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = () => rej(new Error(`Impossible de lire ${file.name}`));
      r.readAsDataURL(file);
    });

    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const mediaType = file.type || (isPDF ? 'application/pdf' : 'image/jpeg');

    // Add a label so the AI knows what each file is supposed to represent
    contentBlocks.push({
      type: 'text',
      text: `\n--- Document : ${file.name} ---\n`,
    });
    contentBlocks.push(
      isPDF
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }
        : { type: 'image',    source: { type: 'base64', media_type: mediaType,          data: base64Data } }
    );
  }

  // Final instruction
  contentBlocks.push({ type: 'text', text: EXTRACTION_PROMPT });

  const messages = [{ role: 'user', content: contentBlocks }];

  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages,
    }),
  });

  if (!response.ok) {
    const txt = await response.text();
    let detail = txt.slice(0, 300);
    try { const j = JSON.parse(txt); detail = j.error || detail; } catch {}
    throw new Error(`Extraction impossible (${response.status}) : ${detail}`);
  }

  const data = await response.json();
  const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  let cleaned = textBlocks.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace > 0 || lastBrace < cleaned.length - 1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("L'IA n'a pas renvoyé un JSON valide. Réessaie avec des images plus nettes.");
  }
}

// Convert AI extraction to internal decompte format
function buildDecompteFromExtraction(ext, boatId) {
  const crewWithIds = (ext.crew || []).map(m => ({
    id: uid(),
    name: m.name || '',
    role: m.role || 'MAT',
    parts: +m.parts || 0,
  }));

  const transferts = (ext.transferts || []).map(t => {
    let targetType = 'crew';
    let targetCrewId = '';
    let targetRole = '';
    if (t.target_name) {
      const found = crewWithIds.find(c => c.name === t.target_name);
      if (found) targetCrewId = found.id;
      else if (t.target_role) { targetType = 'collective-role'; targetRole = t.target_role; }
    } else if (t.target_role) {
      // If a single person has that role, attach to them (capitaine, gérant, comptable)
      const matching = crewWithIds.filter(c => c.role === t.target_role);
      if (matching.length === 1) {
        targetCrewId = matching[0].id;
      } else {
        targetType = 'collective-role';
        targetRole = t.target_role;
      }
    }
    return {
      id: uid(),
      label: t.label || '',
      kind: t.kind || 'parts',
      parts: +t.parts || 0,
      amount: +t.amount || 0,
      targetType, targetCrewId, targetRole,
    };
  });

  return {
    id: uid(),
    boatId: boatId,
    number: ext.header?.decompte_number || `DECO ${Date.now().toString().slice(-3)}`,
    date: ext.header?.date || todayISO(),
    brut: +ext.recettes?.brut || 0,
    especes: +ext.recettes?.especes || 0,
    fakira: +ext.recettes?.fakira || 0,
    frais: (ext.frais || []).map(f => ({
      id: uid(),
      name: f.name || '',
      arabic: f.arabic || '', // kept for backwards compat but name now contains parenthetical arabic
      amount: +f.amount || 0,
      category: f.category || 'consommable',
    })),
    crew: crewWithIds,
    transferts,
    avances: (ext.avances || []).map(a => ({ id: uid(), label: a.label || '', amount: +a.amount || 0 })),
    _extraction: { boat_name: ext.header?.boat_name, matricule: ext.header?.matricule },
  };
}

// ============ EXCEL EXPORT ============

function generateExcelHTML(decompte, boat) {
  const c = calc(decompte);
  // Excel can open HTML tables with .xls extension
  const styles = `
    table { border-collapse: collapse; font-family: Arial; font-size: 11px; }
    .h1 { font-size: 16px; font-weight: bold; background: #c89d4f; color: #fff; padding: 8px; }
    .h2 { background: #1a2d45; color: #fff; padding: 6px; font-weight: bold; }
    .label { background: #f5efe4; font-weight: bold; padding: 4px 8px; }
    td { padding: 4px 8px; border: 1px solid #ccc; }
    .num { text-align: right; font-family: 'Courier New', monospace; }
    .total { background: #fff3cf; font-weight: bold; }
    .captain { background: #fbe4dc; }
  `;

  let html = `<html><head><meta charset="UTF-8"><style>${styles}</style></head><body>`;
  html += `<table>`;
  html += `<tr><td class="h1" colspan="6">DÉCOMPTE PALANGRIER — ${boat?.name || ''} ${boat?.matricule || ''}</td></tr>`;
  html += `<tr><td colspan="6">N° ${decompte.number} · Date : ${fmtDateFR(decompte.date)}</td></tr>`;
  html += `<tr><td colspan="6"></td></tr>`;

  html += `<tr><td class="h2" colspan="6">01 · RECETTES</td></tr>`;
  html += `<tr><td class="label">Brut</td><td class="num" colspan="5">${fmt(c.brut)}</td></tr>`;
  if (c.especes) html += `<tr><td class="label">Espèces</td><td class="num" colspan="5">${fmt(c.especes)}</td></tr>`;
  if (c.fakira)  html += `<tr><td class="label">Fakira</td><td class="num" colspan="5">-${fmt(c.fakira)}</td></tr>`;
  html += `<tr><td class="label total">Tot. Net</td><td class="num total" colspan="5">${fmt(c.tot_net)}</td></tr>`;
  html += `<tr><td colspan="6"></td></tr>`;

  html += `<tr><td class="h2" colspan="6">02 · FRAIS COMMUNS</td></tr>`;
  c.frais_by_cat.filter(fc => fc.total > 0).forEach(fc => {
    html += `<tr><td class="label" colspan="6">${fc.label}</td></tr>`;
    fc.items.forEach(f => {
      html += `<tr><td colspan="5">${f.name}</td><td class="num">${fmt(f.amount)}</td></tr>`;
    });
  });
  html += `<tr><td class="label total" colspan="5">TOTAL CHARGES</td><td class="num total">${fmt(c.total_frais)}</td></tr>`;
  html += `<tr><td colspan="6"></td></tr>`;

  html += `<tr><td class="h2" colspan="6">03 · RÉPARTITION</td></tr>`;
  html += `<tr><td class="label">Net à Répartir</td><td class="num" colspan="5">${fmt(c.n_repartir)}</td></tr>`;
  html += `<tr><td class="label">50% Armateur</td><td class="num" colspan="5">${fmt(c.pool_armateur)}</td></tr>`;
  html += `<tr><td class="label">50% Équipage</td><td class="num" colspan="5">${fmt(c.pool_equipage)}</td></tr>`;
  html += `<tr><td class="label total">Valeur 1 part (${c.total_parts_equipage} parts)</td><td class="num total" colspan="5">${fmt(c.part_value)}</td></tr>`;
  html += `<tr><td colspan="6"></td></tr>`;

  html += `<tr><td class="h2" colspan="6">04 · ÉQUIPAGE</td></tr>`;
  html += `<tr><td class="label">N°</td><td class="label">Nom</td><td class="label">Rôle</td><td class="label">Parts</td><td class="label">Salaire</td><td class="label">Total</td></tr>`;
  c.crew.forEach((m, i) => {
    const row = m.role === 'PP' ? 'captain' : '';
    html += `<tr class="${row}"><td>${i + 1}</td><td>${m.name || '—'}</td><td>${m.role}</td><td class="num">${m.parts}</td><td class="num">${fmt(m.salaire_part)}</td><td class="num">${fmt(m.total_brut_marin)}</td></tr>`;
  });
  html += `<tr><td colspan="6"></td></tr>`;

  if (c.transferts.length) {
    html += `<tr><td class="h2" colspan="6">05 · TRANSFERTS ARMATEUR</td></tr>`;
    c.transferts.forEach(t => {
      html += `<tr><td colspan="4">${t.label}</td><td>${t.kind === 'parts' ? t.parts + ' parts' : 'DH'}</td><td class="num">${fmt(t.computedAmount)}</td></tr>`;
    });
    html += `<tr><td class="label total" colspan="5">Total transferts</td><td class="num total">${fmt(c.total_transferts_dh)}</td></tr>`;
    html += `<tr><td colspan="6"></td></tr>`;
  }

  if (c.avances.length) {
    html += `<tr><td class="h2" colspan="6">06 · AVANCES VERSÉES</td></tr>`;
    c.avances.forEach(a => {
      html += `<tr><td colspan="5">${a.label}</td><td class="num">${fmt(a.amount)}</td></tr>`;
    });
    html += `<tr><td class="label total" colspan="5">Total avances</td><td class="num total">${fmt(c.total_avances)}</td></tr>`;
    html += `<tr><td colspan="6"></td></tr>`;
  }

  html += `<tr><td class="h2" colspan="6">RÉSULTAT FINAL</td></tr>`;
  html += `<tr><td class="label">Armateur garde</td><td class="num total" colspan="5">${fmt(c.armateur_keeps)}</td></tr>`;
  html += `<tr><td class="label">Équipage brut total</td><td class="num total" colspan="5">${fmt(c.total_equipage_brut)}</td></tr>`;
  html += `<tr><td class="label">Cash à verser équipage</td><td class="num total" colspan="5">${fmt(c.cash_to_pay)}</td></tr>`;

  html += `</table></body></html>`;
  return html;
}

function downloadExcel(decompte, boat) {
  const html = generateExcelHTML(decompte, boat);
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `decompte-${boat?.name || 'bateau'}-${decompte.number || 'X'}.xls`.replace(/[^a-z0-9.-]/gi, '_');
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============ IMPORT MODAL ============

function ImportModal({ boats, onClose, onImported, onCreateBoat }) {
  const [files, setFiles] = useState([]); // array of {id, file, kind}
  const [boatId, setBoatId] = useState(boats[0]?.id || '');
  const [step, setStep] = useState('select'); // select | extracting | done | error
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState(null);

  const addFiles = (fileList, kind = 'auto') => {
    const arr = Array.from(fileList || []);
    setFiles(prev => [
      ...prev,
      ...arr.map(f => ({ id: uid(), file: f, kind })),
    ]);
    setError('');
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));
  const setKind = (id, kind) => setFiles(prev => prev.map(f => f.id === id ? { ...f, kind } : f));

  const KIND_OPTIONS = [
    { value: 'auto',     label: 'Auto (laisse l\'IA deviner)' },
    { value: 'onp',      label: '📄 Bordereau ONP (vente)' },
    { value: 'invoice',  label: '🧾 Facture / Charge' },
    { value: 'crew',     label: '👥 Liste équipage' },
    { value: 'advance',  label: '💰 Avances / Chèques' },
    { value: 'full',     label: '📋 Décompte complet (papier)' },
  ];

  const startExtraction = async () => {
    if (!files.length) { setError("Ajoute au moins un document"); return; }
    if (!boatId) { setError("Choisis ou crée un bateau d'abord"); return; }
    setStep('extracting');
    setError('');
    try {
      // Prepend "type" indication to each file's name via a tiny wrapper
      // The AI prompt already understands the context by filename + content
      const annotatedFiles = files.map(f => {
        const kindLabel = KIND_OPTIONS.find(k => k.value === f.kind)?.label || 'Document';
        // Rename file to include the type (model sees the filename in the message)
        try {
          const renamed = new File([f.file], `[${f.kind.toUpperCase()}] ${f.file.name}`, { type: f.file.type });
          return renamed;
        } catch {
          return f.file; // fallback if File constructor fails
        }
      });
      const ext = await extractDecompteFromFiles(annotatedFiles);
      const decompte = buildDecompteFromExtraction(ext, boatId);
      setExtracted(decompte);
      setStep('done');
    } catch (e) {
      console.error(e);
      setError(e.message || String(e));
      setStep('error');
    }
  };

  const handleConfirm = () => onImported(extracted);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={step === 'extracting' ? null : onClose}>
      <div className="bg-white rounded-sm shadow-card max-w-xl w-full p-5 animate-in max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-600" />
            <h2 className="font-display italic text-xl text-slate-900">Importer un décompte</h2>
          </div>
          {step !== 'extracting' && <button onClick={onClose} className="text-stone-400 hover:text-slate-900"><X className="w-5 h-5" /></button>}
        </div>

        {step === 'select' && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 mb-4 text-xs text-amber-900">
              <strong className="block mb-1">📎 Envoie tous tes documents ensemble :</strong>
              <ul className="space-y-0.5 ml-4 list-disc">
                <li>Bordereau <strong>ONP</strong> (Office National des Pêches) — pour le brut de la vente</li>
                <li>Toutes les <strong>factures</strong> (gasoil, glace, nourriture, etc.)</li>
                <li>La <strong>liste de l'équipage</strong> avec les parts décidées</li>
                <li><em>(optionnel)</em> les chèques d'avances déjà versés</li>
              </ul>
              <div className="mt-2 italic">L'IA comprendra chaque document, fera les calculs et te laissera vérifier.</div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono mb-1">Bateau</label>
                {boats.length === 0 ? (
                  <Btn variant="secondary" icon={Ship} onClick={() => { onClose(); onCreateBoat(); }}>Créer un bateau d'abord</Btn>
                ) : (
                  <select className="input-base input-text" value={boatId} onChange={e => setBoatId(e.target.value)}>
                    {boats.map(b => <option key={b.id} value={b.id}>{b.name} · {b.matricule}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono mb-1">Documents ({files.length})</label>
                <div className="space-y-1.5 mb-2">
                  {files.map(f => (
                    <div key={f.id} className="flex items-center gap-1.5 p-2 bg-stone-50 border border-stone-200 rounded-sm">
                      <FileText className="w-4 h-4 text-stone-500 flex-shrink-0" />
                      <span className="text-xs text-slate-800 flex-1 truncate">{f.file.name}</span>
                      <select className="input-base input-text !py-1 !text-[0.7rem] w-44" value={f.kind} onChange={e => setKind(f.id, e.target.value)}>
                        {KIND_OPTIONS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                      </select>
                      <button onClick={() => removeFile(f.id)} className="p-1 text-stone-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                <label className="input-base input-text cursor-pointer flex items-center gap-2 hover:border-amber-500 transition">
                  <FileUp className="w-4 h-4 text-stone-500" />
                  <span className="flex-1 text-sm text-stone-600">+ Ajouter des fichiers (PDF, photo)</span>
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" onChange={e => addFiles(e.target.files)} className="hidden" />
                </label>
              </div>

              {error && <div className="p-2 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700">{error}</div>}
            </div>

            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
              <Btn icon={Sparkles} onClick={startExtraction} disabled={!files.length || !boatId}>
                Extraire {files.length > 0 && `(${files.length})`}
              </Btn>
            </div>
          </>
        )}

        {step === 'extracting' && (
          <div className="py-8 flex flex-col items-center text-center">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-3" />
            <h3 className="font-display italic text-lg text-slate-900">Extraction en cours...</h3>
            <p className="text-sm text-stone-500 mt-1">L'IA lit {files.length} document{files.length > 1 ? 's' : ''} (15–40 secondes)</p>
            <p className="text-xs text-stone-400 mt-3 italic">Plus il y a de documents, plus c'est long.</p>
          </div>
        )}

        {step === 'done' && extracted && (() => {
          const c = calc(extracted);
          return (
            <>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm mb-3 flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <strong>Extraction réussie !</strong> Vérifie les résultats ci-dessous, puis ouvre l'éditeur pour corriger si besoin.
                </div>
              </div>
              <div className="space-y-3 text-xs mb-4 max-h-80 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-stone-50 rounded-sm"><div className="text-[0.6rem] uppercase tracking-wider text-stone-500 font-mono">N° décompte</div><div className="font-mono">{extracted.number}</div></div>
                  <div className="p-2 bg-stone-50 rounded-sm"><div className="text-[0.6rem] uppercase tracking-wider text-stone-500 font-mono">Date</div><div className="font-mono">{fmtDateFR(extracted.date)}</div></div>
                </div>
                <div className="p-2 bg-amber-50 rounded-sm">
                  <div className="text-[0.6rem] uppercase tracking-wider text-amber-700 font-mono mb-1">Calculs automatiques</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <div className="flex justify-between"><span>Brut</span><strong className="font-mono">{fmtDH(c.brut)}</strong></div>
                    <div className="flex justify-between"><span>Charges</span><strong className="font-mono">{fmtDH(c.total_frais)}</strong></div>
                    <div className="flex justify-between"><span>Net à répartir</span><strong className="font-mono">{fmtDH(c.n_repartir)}</strong></div>
                    <div className="flex justify-between"><span>Valeur 1 part</span><strong className="font-mono text-amber-700">{fmtDH(c.part_value)}</strong></div>
                    <div className="flex justify-between"><span>Armateur garde</span><strong className="font-mono">{fmtDH(c.armateur_keeps)}</strong></div>
                    <div className="flex justify-between"><span>Cash à verser</span><strong className="font-mono text-emerald-700">{fmtDH(c.cash_to_pay)}</strong></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-stone-50 rounded-sm text-center"><div className="text-[0.6rem] uppercase tracking-wider text-stone-500 font-mono">Marins</div><div className="font-mono text-slate-900 font-medium">{extracted.crew.length}</div></div>
                  <div className="p-2 bg-stone-50 rounded-sm text-center"><div className="text-[0.6rem] uppercase tracking-wider text-stone-500 font-mono">Charges</div><div className="font-mono text-slate-900 font-medium">{extracted.frais.length}</div></div>
                  <div className="p-2 bg-stone-50 rounded-sm text-center"><div className="text-[0.6rem] uppercase tracking-wider text-stone-500 font-mono">Transferts</div><div className="font-mono text-slate-900 font-medium">{extracted.transferts.length}</div></div>
                </div>
                {extracted._extraction?.boat_name && (
                  <div className="text-[0.7rem] text-stone-500 italic">Bateau détecté : {extracted._extraction.boat_name} {extracted._extraction.matricule}</div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
                <Btn icon={Edit2} onClick={handleConfirm}>Vérifier & éditer</Btn>
              </div>
            </>
          );
        })()}

        {step === 'error' && (
          <>
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm mb-3">
              <div className="flex items-start gap-2 mb-1"><AlertCircle className="w-4 h-4 text-red-600 mt-0.5" /><strong className="text-sm text-red-800">Échec de l'extraction</strong></div>
              <div className="text-xs text-red-700 mt-1 break-words">{error}</div>
            </div>
            <p className="text-xs text-stone-500 mb-4">💡 Conseils : utilise des photos bien éclairées, tiens le téléphone droit, et ajoute les documents dans l'ordre (ONP → factures → équipage).</p>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={onClose}>Fermer</Btn>
              <Btn variant="secondary" onClick={() => setStep('select')}>Réessayer</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Btn({ children, variant='primary', icon:Icon, onClick, disabled, size='md', className='' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed no-print';
  const sizes = { sm:'px-2.5 py-1.5 text-xs', md:'px-3 py-1.5 text-sm', lg:'px-4 py-2 text-sm' };
  const variants = { primary:'bg-slate-900 text-amber-50 hover:bg-slate-800 shadow-soft', secondary:'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50', ghost:'text-slate-600 hover:bg-slate-100', danger:'text-red-700 hover:bg-red-50 border border-red-200' };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}{children}</button>;
}

function Pill({ children, color='gold' }) {
  const styles = { gold:'bg-amber-100 text-amber-800 border-amber-200', navy:'bg-slate-100 text-slate-700 border-slate-200' };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm border ${styles[color]}`}>{children}</span>;
}

function Card({ children, className='' }) { return <div className={`bg-white border border-stone-200 rounded-sm shadow-soft ${className}`}>{children}</div>; }

function StatCard({ label, value, sub, icon:Icon, accent='navy' }) {
  const accents = { navy:'text-slate-900', gold:'text-amber-700', green:'text-emerald-700', red:'text-red-700' };
  return <Card className="p-4"><div className="flex items-start justify-between mb-3"><span className="text-[0.62rem] tracking-[0.2em] uppercase text-stone-500 font-mono">{label}</span>{Icon && <Icon className={`w-4 h-4 ${accents[accent]}`} />}</div><div className={`font-display italic text-2xl ${accents[accent]} leading-none`}>{value}</div>{sub && <div className="mt-1.5 text-xs text-stone-500 font-mono">{sub}</div>}</Card>;
}

function SectionHeader({ num, title, action }) {
  return <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-stone-200"><div className="flex items-baseline gap-3">{num && <span className="text-[0.6rem] tracking-[0.25em] uppercase text-amber-700 font-mono">{num}</span>}<h2 className="font-display italic text-lg text-slate-900">{title}</h2></div>{action}</div>;
}

function EmptyState({ icon:Icon, title, sub, action }) {
  return <div className="flex flex-col items-center justify-center text-center py-10 px-6">{Icon && <Icon className="w-10 h-10 text-stone-400 mb-3" strokeWidth={1.25} />}<h3 className="font-display italic text-xl text-slate-800 mb-1">{title}</h3>{sub && <p className="text-sm text-stone-500 mb-4 max-w-sm">{sub}</p>}{action}</div>;
}

function Modal({ children, onClose, title }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}><div className="bg-white rounded-sm shadow-card max-w-md w-full p-5 animate-in" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="font-display italic text-xl text-slate-900">{title}</h2><button onClick={onClose} className="text-stone-400 hover:text-slate-900"><X className="w-5 h-5" /></button></div>{children}</div></div>;
}

function Dashboard({ boats, decomptes, onNavigate, onNewDecompte }) {
  const stats = useMemo(() => {
    const calcs = decomptes.map(d => ({ d, c: calc(d) }));
    const totBrut = calcs.reduce((s, x) => s + x.c.brut, 0);
    const totCharges = calcs.reduce((s, x) => s + x.c.total_frais, 0);
    const totArm = calcs.reduce((s, x) => s + x.c.armateur_keeps, 0);
    const totEquipage = calcs.reduce((s, x) => s + x.c.total_equipage_brut, 0);
    const byMonth = {};
    calcs.forEach(({ d, c }) => {
      if (!d.date) return;
      const m = d.date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = { month: m, brut: 0, charges: 0 };
      byMonth[m].brut += c.brut; byMonth[m].charges += c.total_frais;
    });
    const monthly = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
    const byCat = {};
    calcs.forEach(({ c }) => { c.frais_by_cat.forEach(fc => { byCat[fc.id] = (byCat[fc.id] || 0) + fc.total; }); });
    const catData = FRAIS_CATS.map(cat => ({ id: cat.id, name: cat.label, value: byCat[cat.id] || 0, color: cat.color })).filter(c => c.value > 0);
    return { totBrut, totCharges, totArm, totEquipage, monthly, catData, count: decomptes.length };
  }, [decomptes]);

  const recent = useMemo(() => [...decomptes].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4), [decomptes]);

  return (
    <div className="space-y-5 pb-8">
      <div className="animate-in">
        <span className="text-[0.6rem] tracking-[0.25em] uppercase text-amber-700 font-mono">Tableau de bord</span>
        <h1 className="font-display italic text-3xl sm:text-4xl text-slate-900 leading-none mb-1">Vue d'ensemble</h1>
        <p className="text-stone-500 text-sm">{stats.count === 0 ? "Aucun décompte enregistré" : `${stats.count} décompte${stats.count > 1 ? 's' : ''} · ${boats.length} bateau${boats.length > 1 ? 'x' : ''}`}</p>
      </div>
      {stats.count === 0 ? (
        <Card className="p-0"><EmptyState icon={Waves} title="Commence ton premier décompte" sub="Ajoute un bateau puis enregistre ta première marée." action={boats.length === 0 ? <Btn icon={Ship} variant="secondary" onClick={() => onNavigate('boats')}>Ajouter un bateau</Btn> : <Btn icon={Plus} onClick={onNewDecompte}>Nouveau décompte</Btn>} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in" style={{ animationDelay:'0.05s' }}>
            <StatCard label="Brut cumulé" value={fmtK(stats.totBrut)} sub="DH, toutes marées" icon={Coins} accent="navy" />
            <StatCard label="Charges" value={fmtK(stats.totCharges)} sub="DH, frais communs" icon={Package} accent="red" />
            <StatCard label="Part armateur" value={fmtK(stats.totArm)} sub="DH net armateur" icon={TrendingUp} accent="gold" />
            <StatCard label="Part équipage" value={fmtK(stats.totEquipage)} sub="DH versés" icon={Users} accent="green" />
          </div>
          {stats.monthly.length > 1 && (
            <Card className="p-4 sm:p-5 animate-in" style={{ animationDelay:'0.1s' }}>
              <SectionHeader num="Évolution" title="Revenus vs charges par mois" />
              <div style={{ width:'100%', height:220 }}>
                <ResponsiveContainer>
                  <AreaChart data={stats.monthly} margin={{ left:0, right:8, top:5 }}>
                    <defs>
                      <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a2d45" stopOpacity={0.25} /><stop offset="100%" stopColor="#1a2d45" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b85c3c" stopOpacity={0.3} /><stop offset="100%" stopColor="#b85c3c" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6dcc8" />
                    <XAxis dataKey="month" stroke="#8b7a5a" style={{ fontSize:10, fontFamily:'Geist Mono' }} />
                    <YAxis stroke="#8b7a5a" style={{ fontSize:10, fontFamily:'Geist Mono' }} tickFormatter={fmtK} width={45} />
                    <Tooltip formatter={v => fmtDH(v)} contentStyle={{ background:'#fffbf4', border:'1px solid #e6dcc8', borderRadius:4, fontSize:12 }} />
                    <Area type="monotone" dataKey="brut" stroke="#1a2d45" fill="url(#gb)" strokeWidth={2} name="Brut" />
                    <Area type="monotone" dataKey="charges" stroke="#b85c3c" fill="url(#gc)" strokeWidth={2} name="Charges" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          <div className="grid lg:grid-cols-2 gap-3 animate-in" style={{ animationDelay:'0.15s' }}>
            <Card className="p-4 sm:p-5">
              <SectionHeader num="Ventilation" title="Charges par nature" />
              {stats.catData.length === 0 ? <p className="text-sm text-stone-500 py-4">Aucune charge enregistrée.</p> : (
                <div className="space-y-2">
                  {stats.catData.sort((a, b) => b.value - a.value).map(c => {
                    const pct = (c.value / stats.totCharges) * 100;
                    const cat = FRAIS_CATS.find(x => x.id === c.id);
                    const Icon = cat?.icon;
                    return (
                      <div key={c.id}>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="flex items-center gap-2 text-slate-700">{Icon && <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />}{c.name}</span>
                          <span className="font-mono text-slate-900">{fmtK(c.value)} <span className="text-stone-400">· {pct.toFixed(0)}%</span></span>
                        </div>
                        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background: c.color }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
            <Card className="p-4 sm:p-5">
              <SectionHeader num="Récents" title="Derniers décomptes" action={<button className="text-xs text-amber-700 hover:text-amber-900 font-mono" onClick={() => onNavigate('archive')}>Tout voir →</button>} />
              <div className="space-y-1.5">
                {recent.map(d => {
                  const boat = boats.find(b => b.id === d.boatId);
                  const c = calc(d);
                  return (
                    <button key={d.id} onClick={() => onNavigate('view', d.id)} className="w-full flex items-center justify-between p-2.5 rounded-sm hover:bg-stone-50 border border-stone-100 hover:border-stone-200 transition text-left group">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 text-sm truncate">{boat?.name || '—'} · {d.number || '—'}</div>
                        <div className="text-xs text-stone-500 font-mono">{fmtDateFR(d.date)}</div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div><div className="font-mono text-sm text-slate-900">{fmtK(c.brut)}</div><div className="text-[0.62rem] text-stone-500 uppercase tracking-wider">DH</div></div>
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-700 transition" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function BoatsView({ boats, decomptes, onNavigate, onNewBoat, onDeleteBoat }) {
  const [confirmDel, setConfirmDel] = useState(null);
  const statsFor = id => {
    const ds = decomptes.filter(d => d.boatId === id);
    const totBrut = ds.reduce((s, d) => s + calc(d).brut, 0);
    const last = ds.length ? ds.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] : null;
    return { count: ds.length, totBrut, last };
  };
  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-end justify-between animate-in flex-wrap gap-2">
        <div>
          <span className="text-[0.6rem] tracking-[0.25em] uppercase text-amber-700 font-mono">Flotte</span>
          <h1 className="font-display italic text-3xl sm:text-4xl text-slate-900 leading-none">Mes bateaux</h1>
        </div>
        <Btn icon={Plus} onClick={onNewBoat}>Nouveau bateau</Btn>
      </div>
      {boats.length === 0 ? <Card className="p-0"><EmptyState icon={Ship} title="Aucun bateau" sub="Ajoute ton premier bateau." action={<Btn icon={Plus} onClick={onNewBoat}>Ajouter un bateau</Btn>} /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in">
          {boats.map(b => {
            const s = statsFor(b.id);
            return (
              <Card key={b.id} className="p-0 overflow-hidden group hover:shadow-card transition-shadow">
                <button onClick={() => onNavigate('boat', b.id)} className="block w-full text-left p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 bg-slate-900 text-amber-100 rounded-sm flex items-center justify-center"><Ship className="w-4 h-4" strokeWidth={1.5} /></div>
                    <Pill color="gold">{s.count} déc.</Pill>
                  </div>
                  <h3 className="font-display italic text-xl text-slate-900 leading-tight">{b.name}</h3>
                  <div className="text-xs text-stone-500 font-mono mb-3">{b.matricule || '—'}</div>
                  <div className="pt-3 border-t border-stone-100 flex items-baseline justify-between">
                    <span className="text-[0.62rem] uppercase tracking-wider text-stone-500 font-mono">Brut cumulé</span>
                    <span className="font-mono text-sm text-slate-900">{fmtK(s.totBrut)} DH</span>
                  </div>
                  {s.last && <div className="text-[0.62rem] text-stone-400 font-mono mt-1.5">Dernière : {fmtDateFR(s.last.date)}</div>}
                </button>
                <div className="border-t border-stone-100 px-3 py-1.5 flex"><button className="text-[0.68rem] text-stone-500 hover:text-red-700 font-mono ml-auto" onClick={e => { e.stopPropagation(); setConfirmDel(b); }}>Supprimer</button></div>
              </Card>
            );
          })}
        </div>
      )}
      {confirmDel && <Modal onClose={() => setConfirmDel(null)} title="Supprimer le bateau ?"><p className="text-sm text-stone-600 mb-4"><strong>{confirmDel.name}</strong> sera supprimé. Les décomptes associés resteront archivés.</p><div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setConfirmDel(null)}>Annuler</Btn><Btn variant="danger" icon={Trash2} onClick={() => { onDeleteBoat(confirmDel.id); setConfirmDel(null); }}>Supprimer</Btn></div></Modal>}
    </div>
  );
}

function BoatDetail({ boat, decomptes, onBack, onNavigate, onNewDecompte }) {
  const ds = decomptes.filter(d => d.boatId === boat.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const agg = useMemo(() => ({
    totBrut: ds.reduce((s, d) => s + calc(d).brut, 0),
    totCharges: ds.reduce((s, d) => s + calc(d).total_frais, 0),
    totArm: ds.reduce((s, d) => s + calc(d).armateur_keeps, 0),
  }), [ds]);
  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-slate-900 animate-in"><ArrowLeft className="w-4 h-4" /> Retour aux bateaux</button>
      <div className="flex items-start justify-between animate-in flex-wrap gap-2">
        <div>
          <span className="text-[0.6rem] tracking-[0.25em] uppercase text-amber-700 font-mono">Bateau</span>
          <h1 className="font-display italic text-3xl sm:text-4xl text-slate-900 leading-none">{boat.name}</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">{boat.matricule}</p>
        </div>
        <Btn icon={Plus} onClick={() => onNewDecompte(boat.id)}>Nouveau décompte</Btn>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Brut" value={fmtK(agg.totBrut)} sub="DH cumulés" accent="navy" />
        <StatCard label="Charges" value={fmtK(agg.totCharges)} sub="DH" accent="red" />
        <StatCard label="Armateur" value={fmtK(agg.totArm)} sub="DH net" accent="gold" />
      </div>
      <Card className="p-4 sm:p-5">
        <SectionHeader title="Historique des décomptes" />
        {ds.length === 0 ? <EmptyState icon={FileText} title="Pas encore de décompte" /> : (
          <div className="space-y-1">
            {ds.map(d => {
              const c = calc(d);
              return (
                <button key={d.id} onClick={() => onNavigate('view', d.id)} className="w-full flex items-center justify-between p-2.5 rounded-sm hover:bg-stone-50 text-left group border border-transparent hover:border-stone-200 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-sm bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4" strokeWidth={1.5} /></div>
                    <div className="min-w-0"><div className="font-medium text-slate-900 text-sm">{d.number || '—'}</div><div className="text-xs text-stone-500 font-mono">{fmtDateFR(d.date)}</div></div>
                  </div>
                  <div className="flex items-center gap-3"><div className="text-right"><div className="font-mono text-sm text-slate-900">{fmtK(c.brut)} DH</div><div className="text-[0.62rem] text-stone-500 uppercase tracking-wider">brut</div></div><ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-700" /></div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function ArchiveView({ decomptes, boats, onNavigate }) {
  const [boatFilter, setBoatFilter] = useState('all');
  const filtered = useMemo(() => {
    const arr = boatFilter === 'all' ? decomptes : decomptes.filter(d => d.boatId === boatFilter);
    return [...arr].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [decomptes, boatFilter]);
  return (
    <div className="space-y-5 pb-8">
      <div className="animate-in">
        <span className="text-[0.6rem] tracking-[0.25em] uppercase text-amber-700 font-mono">Archive</span>
        <h1 className="font-display italic text-3xl sm:text-4xl text-slate-900 leading-none">Tous les décomptes</h1>
        <p className="text-sm text-stone-500 mt-1">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>
      </div>
      {boats.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setBoatFilter('all')} className={`px-3 py-1.5 text-sm rounded-sm border ${boatFilter === 'all' ? 'bg-slate-900 text-amber-50 border-slate-900' : 'bg-white text-slate-700 border-stone-200 hover:bg-stone-50'}`}>Tous</button>
          {boats.map(b => <button key={b.id} onClick={() => setBoatFilter(b.id)} className={`px-3 py-1.5 text-sm rounded-sm border ${boatFilter === b.id ? 'bg-slate-900 text-amber-50 border-slate-900' : 'bg-white text-slate-700 border-stone-200 hover:bg-stone-50'}`}>{b.name}</button>)}
        </div>
      )}
      {filtered.length === 0 ? <Card className="p-0"><EmptyState icon={ArchiveIcon} title="Aucun décompte" /></Card> : (
        <Card className="p-0 overflow-hidden"><div className="divide-y divide-stone-100">
          {filtered.map(d => {
            const b = boats.find(x => x.id === d.boatId);
            const c = calc(d);
            return (
              <button key={d.id} onClick={() => onNavigate('view', d.id)} className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-stone-50 text-left group transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap"><span className="font-medium text-slate-900 text-sm">{b?.name || '—'}</span><Pill color="navy">{d.number || '—'}</Pill></div>
                  <div className="text-xs text-stone-500 font-mono">{fmtDateFR(d.date)} · {(d.crew || []).length} marins</div>
                </div>
                <div className="flex items-center gap-3"><div className="text-right"><div className="font-mono text-sm text-slate-900">{fmtK(c.brut)} DH</div><div className="text-[0.62rem] text-stone-500 uppercase tracking-wider">brut</div></div><ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-700" /></div>
              </button>
            );
          })}
        </div></Card>
      )}
    </div>
  );
}

function DecompteEditor({ boats, existingBoatId, decompte, onCancel, onSave }) {
  const [state, setState] = useState(() => {
    if (decompte) return { ...decompte, transferts: decompte.transferts || [], avances: decompte.avances || [] };
    return { id: uid(), boatId: existingBoatId || (boats[0]?.id), number: `DECO ${Date.now().toString().slice(-3)}`, date: todayISO(),
      brut: 0, especes: 0, fakira: 0, frais: DEFAULT_FRAIS.map(f => ({ id: uid(), ...f, amount: 0 })), crew: [], transferts: [], avances: [] };
  });
  const c = calc(state);
  const setField = (k, v) => setState(s => ({ ...s, [k]: v }));
  const addFrais = cat => setState(s => ({ ...s, frais: [...(s.frais || []), { id: uid(), name: '', arabic: '', amount: 0, category: cat }] }));
  const updFrais = (id, p) => setState(s => ({ ...s, frais: (s.frais || []).map(f => f.id === id ? { ...f, ...p } : f) }));
  const remFrais = id => setState(s => ({ ...s, frais: (s.frais || []).filter(f => f.id !== id) }));
  const addCrew = () => { const r = ROLES.find(x => x.value === 'MAT'); setState(s => ({ ...s, crew: [...(s.crew || []), { id: uid(), name: '', role: r.value, parts: r.parts }] })); };
  const updCrew = (id, p) => setState(s => ({ ...s, crew: (s.crew || []).map(m => m.id === id ? { ...m, ...p } : m) }));
  const remCrew = id => setState(s => ({ ...s, crew: (s.crew || []).filter(m => m.id !== id) }));
  const addTransfert = preset => setState(s => ({ ...s, transferts: [...(s.transferts || []), { id: uid(), label: preset?.label || '', kind: preset?.kind || 'parts', parts: preset?.parts ?? 0, amount: preset?.amount ?? 0, targetType: preset?.targetType || 'crew', targetCrewId: preset?.targetCrewId || '', targetRole: preset?.targetRole || '' }] }));
  const updTransfert = (id, p) => setState(s => ({ ...s, transferts: (s.transferts || []).map(t => t.id === id ? { ...t, ...p } : t) }));
  const remTransfert = id => setState(s => ({ ...s, transferts: (s.transferts || []).filter(t => t.id !== id) }));
  const addAvance = () => setState(s => ({ ...s, avances: [...(s.avances || []), { id: uid(), label: '', amount: 0 }] }));
  const updAvance = (id, p) => setState(s => ({ ...s, avances: (s.avances || []).map(a => a.id === id ? { ...a, ...p } : a) }));
  const remAvance = id => setState(s => ({ ...s, avances: (s.avances || []).filter(a => a.id !== id) }));
  const canSave = state.boatId && state.number && state.date;
  const captainId = state.crew.find(m => m.role === 'PP')?.id;
  const gerantId = state.crew.find(m => m.role === 'Ger')?.id;
  const comptId = state.crew.find(m => m.role === 'Cpt')?.id;
  const presets = [
    { label: 'Bonus capitaine (3 parts)', kind: 'parts', parts: 3, targetType: 'crew', targetCrewId: captainId },
    { label: 'Bonus gérant (1 part)', kind: 'parts', parts: 1, targetType: 'crew', targetCrewId: gerantId },
    { label: 'Bonus comptable (0,25)', kind: 'parts', parts: 0.25, targetType: 'crew', targetCrewId: comptId },
    { label: 'Bonus matelots (0,25 collectif)', kind: 'parts', parts: 0.25, targetType: 'collective-role', targetRole: 'MAT' },
    { label: 'Bonus ramandeurs (0,25 collectif)', kind: 'parts', parts: 0.25, targetType: 'collective-role', targetRole: 'RAM' },
  ];
  return (
    <div className="fixed inset-0 z-40 paper-bg overflow-y-auto">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 relative z-10">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#faf6ed] py-3 -mx-3 px-3 sm:-mx-6 sm:px-6 border-b border-stone-200 z-20">
          <button onClick={onCancel} className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-slate-900"><X className="w-4 h-4" /> Fermer</button>
          <h1 className="font-display italic text-lg text-slate-900 hidden sm:block">{decompte ? 'Modifier décompte' : 'Nouveau décompte'}</h1>
          <Btn icon={Save} onClick={() => onSave(state)} disabled={!canSave}>Enregistrer</Btn>
        </div>
        <div className="space-y-3 pb-10">
          <Card className="p-4 sm:p-5">
            <SectionHeader num="Identification" title="En-tête du décompte" />
            <div className="grid sm:grid-cols-3 gap-3">
              <div><label className="block text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono mb-1">Bateau</label><select className="input-base input-text" value={state.boatId || ''} onChange={e => setField('boatId', e.target.value)}>{boats.map(b => <option key={b.id} value={b.id}>{b.name} · {b.matricule}</option>)}</select></div>
              <div><label className="block text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono mb-1">N° décompte</label><input className="input-base" value={state.number} onChange={e => setField('number', e.target.value)} placeholder="DECO 5" /></div>
              <div><label className="block text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono mb-1">Date</label><input className="input-base" type="date" value={state.date} onChange={e => setField('date', e.target.value)} /></div>
            </div>
          </Card>
          <Card className="p-4 sm:p-5">
            <SectionHeader num="01" title="Recettes" />
            <div className="grid sm:grid-cols-3 gap-3">
              <div><label className="block text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono mb-1">Brut (DH)</label><input className="input-base" type="number" value={state.brut} onChange={e => setField('brut', +e.target.value || 0)} /></div>
              <div><label className="block text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono mb-1">Espèces (DH)</label><input className="input-base" type="number" value={state.especes} onChange={e => setField('especes', +e.target.value || 0)} /></div>
              <div><label className="block text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono mb-1">Fakira (DH)</label><input className="input-base" type="number" value={state.fakira} onChange={e => setField('fakira', +e.target.value || 0)} /></div>
            </div>
            <div className="mt-3 p-3 bg-amber-50 border-l-2 border-amber-600 rounded-sm flex items-baseline justify-between"><span className="text-[0.65rem] tracking-[0.2em] uppercase text-amber-700 font-mono">Tot. Net</span><span className="font-display italic text-xl text-slate-900">{fmtDH(c.tot_net)}</span></div>
          </Card>
          <Card className="p-4 sm:p-5">
            <SectionHeader num="02" title="Frais communs" />
            <div className="space-y-3">
              {FRAIS_CATS.map(cat => {
                const items = (state.frais || []).filter(f => f.category === cat.id);
                const Icon = cat.icon;
                const catTotal = items.reduce((s, f) => s + (+f.amount || 0), 0);
                return (
                  <div key={cat.id} className={`rounded-sm border ${cat.border} ${cat.bg}`}>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-current border-opacity-20">
                      <div className={`flex items-center gap-2 text-sm font-medium ${cat.text}`}><Icon className="w-4 h-4" />{cat.label}</div>
                      <div className="flex items-center gap-2">{catTotal > 0 && <span className={`text-xs font-mono ${cat.text}`}>{fmtDH(catTotal)}</span>}<button onClick={() => addFrais(cat.id)} className={`p-1 rounded-sm hover:bg-white/50 ${cat.text}`}><Plus className="w-3.5 h-3.5" /></button></div>
                    </div>
                    {items.length > 0 && (
                      <div className="p-2 space-y-1.5 bg-white/60">
                        {items.map(f => (
                          <div key={f.id} className="flex items-center gap-1.5">
                            <input className="input-base input-text flex-1 min-w-0" placeholder="Ex: Gasoil (مازوط)" value={f.name} onChange={e => updFrais(f.id, { name: e.target.value })} />
                            <input className="input-base w-24 sm:w-32 text-right" type="number" placeholder="0" value={f.amount} onChange={e => updFrais(f.id, { amount: +e.target.value || 0 })} />
                            <button onClick={() => remFrais(f.id)} className="p-1.5 text-stone-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 p-3 bg-stone-100 rounded-sm flex items-baseline justify-between"><span className="text-[0.65rem] tracking-[0.2em] uppercase text-stone-600 font-mono">Total charges</span><span className="font-mono text-slate-900 font-medium">{fmtDH(c.total_frais)}</span></div>
          </Card>
          <Card className="p-4 sm:p-5">
            <SectionHeader num="03" title="Répartition 50 / 50" />
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-3 bg-stone-50 rounded-sm"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono">N à Répartir</div><div className="font-display italic text-2xl text-slate-900 mt-1">{fmtDH(c.n_repartir)}</div></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-amber-50 rounded-sm"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-amber-700 font-mono">Armateur 50%</div><div className="font-mono text-slate-900 mt-1 text-sm">{fmtDH(c.pool_armateur)}</div></div>
                <div className="p-3 bg-emerald-50 rounded-sm"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-emerald-700 font-mono">Équipage 50%</div><div className="font-mono text-slate-900 mt-1 text-sm">{fmtDH(c.pool_equipage)}</div></div>
              </div>
            </div>
          </Card>
          <Card className="p-4 sm:p-5">
            <SectionHeader num="04" title={`Équipage (${state.crew?.length || 0})`} action={<Btn size="sm" variant="ghost" icon={Plus} onClick={addCrew}>Marin</Btn>} />
            {(state.crew || []).length === 0 ? <p className="text-sm text-stone-500 text-center py-4">Aucun marin. Clique "Marin" pour ajouter.</p> : (
              <div className="space-y-1.5">
                <div className="hidden sm:grid grid-cols-12 gap-2 text-[0.55rem] tracking-[0.2em] uppercase text-stone-500 font-mono px-2 pb-1">
                  <div className="col-span-5">Nom</div><div className="col-span-3">Rôle</div><div className="col-span-1 text-center">Parts</div><div className="col-span-2 text-right">Salaire</div><div className="col-span-1"></div>
                </div>
                {c.crew.map(m => {
                  const isCapt = m.role === 'PP';
                  const isKey = ['PP','SP','MEC','Ger','Cpt'].includes(m.role);
                  return (
                    <div key={m.id} className={`rounded-sm border p-1.5 grid grid-cols-12 gap-1.5 items-center ${isCapt ? 'bg-amber-50/60 border-amber-200' : isKey ? 'bg-blue-50/30 border-blue-100' : 'bg-stone-50 border-stone-100'}`}>
                      <input className="input-base input-text col-span-7 sm:col-span-5" placeholder="Nom" value={m.name} onChange={e => updCrew(m.id, { name: e.target.value })} />
                      <select className="input-base input-text col-span-3" value={m.role} onChange={e => { const r = ROLES.find(x => x.value === e.target.value); updCrew(m.id, { role: e.target.value, parts: r?.parts ?? m.parts }); }}>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.value}</option>)}
                      </select>
                      <input className="input-base col-span-1 text-center" type="number" step="0.25" value={m.parts} onChange={e => updCrew(m.id, { parts: +e.target.value || 0 })} />
                      <div className="col-span-5 sm:col-span-2 text-right font-mono text-xs text-slate-900">{fmtK(m.salaire_part)} <span className="text-stone-400 text-[0.6rem]">DH</span></div>
                      <button onClick={() => remCrew(m.id)} className="col-span-1 p-1.5 text-stone-400 hover:text-red-600 justify-self-end"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 p-3 bg-stone-100 rounded-sm flex flex-wrap gap-3 justify-between text-xs font-mono"><span>Total parts : <strong className="text-slate-900">{c.total_parts_equipage.toLocaleString('fr-FR')}</strong></span><span>Valeur 1 part : <strong className="text-amber-700">{fmtDH(c.part_value)}</strong></span></div>
          </Card>
          <Card className="p-4 sm:p-5">
            <SectionHeader num="05" title="Transferts armateur → équipage" />
            <p className="text-xs text-stone-500 mb-3">Bonus en parts que l'armateur verse depuis ses 50% à des membres d'équipage (capitaine, gérant, comptable, bonus collectifs…).</p>
            {(state.transferts || []).length > 0 && (
              <div className="space-y-1.5 mb-3">
                {c.transferts.map(t => (
                  <div key={t.id} className="rounded-sm border border-stone-200 bg-stone-50 p-2 grid grid-cols-12 gap-1.5 items-center">
                    <input className="input-base input-text col-span-12 sm:col-span-4" placeholder="Description" value={t.label} onChange={e => updTransfert(t.id, { label: e.target.value })} />
                    <select className="input-base input-text col-span-4 sm:col-span-2" value={t.kind} onChange={e => updTransfert(t.id, { kind: e.target.value })}><option value="parts">Parts</option><option value="dh">DH</option></select>
                    {t.kind === 'parts' ? <input className="input-base col-span-3 sm:col-span-1 text-center" type="number" step="0.25" value={t.parts} onChange={e => updTransfert(t.id, { parts: +e.target.value || 0 })} /> : <input className="input-base col-span-3 sm:col-span-1 text-right" type="number" value={t.amount} onChange={e => updTransfert(t.id, { amount: +e.target.value || 0 })} />}
                    <select className="input-base input-text col-span-5 sm:col-span-3" value={t.targetType === 'crew' ? `crew:${t.targetCrewId || ''}` : t.targetType === 'collective-role' ? `role:${t.targetRole}` : 'crew:'} onChange={e => { const v = e.target.value; if (v.startsWith('crew:')) updTransfert(t.id, { targetType: 'crew', targetCrewId: v.slice(5), targetRole: '' }); else if (v.startsWith('role:')) updTransfert(t.id, { targetType: 'collective-role', targetRole: v.slice(5), targetCrewId: '' }); }}>
                      <option value="crew:">— bénéficiaire —</option>
                      {state.crew.map(m => <option key={m.id} value={`crew:${m.id}`}>{m.name || `(${m.role})`} · {m.role}</option>)}
                      <option disabled>— collectif —</option>
                      {Array.from(new Set(state.crew.map(m => m.role))).map(role => <option key={role} value={`role:${role}`}>Tous les {role}</option>)}
                    </select>
                    <div className="col-span-3 sm:col-span-1 text-right font-mono text-xs text-amber-700">{fmtK(t.computedAmount)}</div>
                    <button onClick={() => remTransfert(t.id)} className="col-span-1 p-1.5 text-stone-400 hover:text-red-600 justify-self-end"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {presets.map((p, i) => <button key={i} onClick={() => addTransfert(p)} className="text-[0.68rem] font-mono px-2 py-1 rounded-sm border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100">+ {p.label}</button>)}
              <button onClick={() => addTransfert({})} className="text-[0.68rem] font-mono px-2 py-1 rounded-sm border border-stone-200 bg-white text-stone-700 hover:bg-stone-50">+ ligne vide</button>
            </div>
            <div className="p-3 bg-amber-50 rounded-sm flex justify-between text-xs font-mono"><span className="text-amber-800">Total transferts</span><strong className="text-slate-900">{fmtDH(c.total_transferts_dh)}</strong></div>
          </Card>
          <Card className="p-4 sm:p-5">
            <SectionHeader num="06" title="Avances déjà versées" action={<Btn size="sm" variant="ghost" icon={Plus} onClick={addAvance}>Avance</Btn>} />
            <p className="text-xs text-stone-500 mb-3">Chèques et cash déjà donnés à l'équipage avant le décompte.</p>
            {(state.avances || []).length === 0 ? <p className="text-sm text-stone-500 text-center py-4">Aucune avance enregistrée.</p> : (
              <div className="space-y-1.5">
                {(state.avances || []).map(a => (
                  <div key={a.id} className="rounded-sm border border-stone-200 bg-stone-50 p-2 grid grid-cols-12 gap-1.5 items-center">
                    <input className="input-base input-text col-span-8 sm:col-span-9" placeholder="CHEQUE BHRIA, CHEQUE Abdellah…" value={a.label} onChange={e => updAvance(a.id, { label: e.target.value })} />
                    <input className="input-base col-span-3 sm:col-span-2 text-right" type="number" value={a.amount} onChange={e => updAvance(a.id, { amount: +e.target.value || 0 })} />
                    <button onClick={() => remAvance(a.id)} className="col-span-1 p-1.5 text-stone-400 hover:text-red-600 justify-self-end"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 p-3 bg-red-50 rounded-sm flex justify-between text-xs font-mono"><span className="text-red-700">Total avances</span><strong className="text-slate-900">{fmtDH(c.total_avances)}</strong></div>
          </Card>
          <Card className="p-4 sm:p-5 bg-slate-900 text-amber-50 border-slate-900">
            <h2 className="font-display italic text-xl mb-3">Résultat final</h2>
            <div className="grid sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="p-3 bg-slate-800 rounded-sm border-t-2 border-amber-500"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-amber-200 font-mono opacity-80">Armateur garde</div><div className="font-display italic text-2xl mt-1">{fmtDH(c.armateur_keeps)}</div><div className="text-[0.6rem] font-mono opacity-60 mt-1">50% − transferts</div></div>
              <div className="p-3 bg-slate-800 rounded-sm border-t-2 border-emerald-500"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-emerald-200 font-mono opacity-80">Équipage total brut</div><div className="font-display italic text-2xl mt-1">{fmtDH(c.total_equipage_brut)}</div><div className="text-[0.6rem] font-mono opacity-60 mt-1">50% + transferts</div></div>
              <div className="p-3 bg-slate-800 rounded-sm border-t-2 border-red-400"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-red-200 font-mono opacity-80">Cash à verser</div><div className="font-display italic text-2xl mt-1">{fmtDH(c.cash_to_pay)}</div><div className="text-[0.6rem] font-mono opacity-60 mt-1">équipage − avances</div></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DecompteViewer({ decompte, boat, onBack, onEdit, onDelete }) {
  const c = calc(decompte);
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <>
      <div className="space-y-5 pb-8 animate-in no-print">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Retour</button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <span className="text-[0.6rem] tracking-[0.25em] uppercase text-amber-700 font-mono">Décompte</span>
            <h1 className="font-display italic text-3xl sm:text-4xl text-slate-900 leading-none">{decompte.number}</h1>
            <p className="text-sm text-stone-500 mt-1">{boat?.name} · {boat?.matricule} · {fmtDateFR(decompte.date)}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" icon={FileSpreadsheet} onClick={() => downloadExcel(decompte, boat)}>Excel</Btn>
            <Btn variant="secondary" icon={Printer} onClick={() => window.print()}>PDF / Imprimer</Btn>
            <Btn variant="secondary" icon={Edit2} onClick={onEdit}>Modifier</Btn>
            <Btn variant="danger" icon={Trash2} onClick={() => setConfirmDel(true)}>Supprimer</Btn>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard label="Brut" value={fmtK(c.brut)} sub="DH" accent="navy" />
          <StatCard label="Charges" value={fmtK(c.total_frais)} sub="DH" accent="red" />
          <StatCard label="Armateur garde" value={fmtK(c.armateur_keeps)} sub="DH net" accent="gold" />
          <StatCard label="Cash à verser" value={fmtK(c.cash_to_pay)} sub="DH équipage" accent="green" />
        </div>
        <Card className="p-4 sm:p-5">
          <SectionHeader num="Charges" title="Frais par nature" />
          <div className="space-y-3">
            {c.frais_by_cat.filter(fc => fc.total > 0).map(fc => {
              const Icon = fc.icon;
              return (
                <div key={fc.id} className={`rounded-sm border ${fc.border} ${fc.bg} p-3`}>
                  <div className={`flex items-center justify-between mb-2 text-sm font-medium ${fc.text}`}><div className="flex items-center gap-2"><Icon className="w-4 h-4" />{fc.label}</div><span className="font-mono">{fmtDH(fc.total)}</span></div>
                  <div className="space-y-0.5 pl-6 text-xs">
                    {fc.items.map(f => <div key={f.id} className="flex justify-between text-slate-700"><span>{f.name}</span><span className="font-mono">{fmtDH(f.amount)}</span></div>)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionHeader num="Partage" title="Répartition 50/50" />
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="p-3 bg-stone-50 rounded-sm"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono">Net à Répartir</div><div className="font-mono text-slate-900 mt-1">{fmtDH(c.n_repartir)}</div></div>
            <div className="p-3 bg-amber-50 rounded-sm"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-amber-700 font-mono">50% Armateur</div><div className="font-mono text-slate-900 mt-1">{fmtDH(c.pool_armateur)}</div></div>
            <div className="p-3 bg-emerald-50 rounded-sm"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-emerald-700 font-mono">50% Équipage</div><div className="font-mono text-slate-900 mt-1">{fmtDH(c.pool_equipage)}</div></div>
          </div>
          <div className="mt-3 p-3 bg-amber-50 rounded-sm flex justify-between items-baseline"><span className="text-xs text-amber-800 font-mono">Valeur 1 part ({c.total_parts_equipage} parts)</span><span className="font-display italic text-xl text-amber-800">{fmtDH(c.part_value)}</span></div>
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionHeader num="Équipage" title={`${c.crew.length} marins`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-[0.55rem] tracking-[0.2em] uppercase text-stone-500 font-mono"><th className="text-left py-2 pr-2">Nom</th><th className="text-left py-2 pr-2">Rôle</th><th className="text-center py-2 pr-2">Parts</th><th className="text-right py-2 pr-2">Salaire</th><th className="text-right py-2 pr-2">Bonus</th><th className="text-right py-2">Total</th></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {c.crew.map(m => (
                  <tr key={m.id} className={m.role === 'PP' ? 'bg-amber-50/50' : ''}>
                    <td className="py-1.5 pr-2 text-slate-900">{m.name || '—'}</td>
                    <td className="py-1.5 pr-2 font-mono text-xs">{m.role}</td>
                    <td className="py-1.5 pr-2 text-center font-mono text-xs">{m.parts}</td>
                    <td className="py-1.5 pr-2 text-right font-mono text-xs">{fmtDH(m.salaire_part)}</td>
                    <td className="py-1.5 pr-2 text-right font-mono text-xs text-amber-700">{m.bonus ? fmtDH(m.bonus) : '—'}</td>
                    <td className="py-1.5 text-right font-mono font-medium">{fmtDH(m.total_brut_marin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {c.transferts.length > 0 && (
          <Card className="p-4 sm:p-5">
            <SectionHeader num="Transferts" title="Armateur → équipage" />
            <div className="space-y-1">
              {c.transferts.map(t => (
                <div key={t.id} className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0 text-sm">
                  <span className="text-slate-800">{t.label || '(sans description)'}</span>
                  <div className="flex items-center gap-3"><span className="text-xs font-mono text-stone-500">{t.kind === 'parts' ? `${t.parts} part${t.parts > 1 ? 's' : ''}` : 'DH'}</span><span className="font-mono text-amber-700 text-sm">{fmtDH(t.computedAmount)}</span></div>
                </div>
              ))}
              <div className="flex justify-between items-baseline pt-3 mt-1 border-t-2 border-stone-200"><span className="font-medium text-sm">Total</span><span className="font-mono font-medium text-amber-700">{fmtDH(c.total_transferts_dh)}</span></div>
            </div>
          </Card>
        )}
        {c.avances.length > 0 && (
          <Card className="p-4 sm:p-5">
            <SectionHeader num="Avances" title="Déjà versées" />
            <div className="space-y-1">
              {c.avances.map(a => <div key={a.id} className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0 text-sm"><span className="text-slate-800">{a.label || '(sans description)'}</span><span className="font-mono text-red-700">{fmtDH(a.amount)}</span></div>)}
              <div className="flex justify-between items-baseline pt-3 mt-1 border-t-2 border-stone-200"><span className="font-medium text-sm">Total avances</span><span className="font-mono font-medium text-red-700">{fmtDH(c.total_avances)}</span></div>
            </div>
          </Card>
        )}
        <Card className="p-4 sm:p-5 bg-slate-900 text-amber-50 border-slate-900">
          <h2 className="font-display italic text-2xl mb-4">Résultat final</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-800 rounded-sm border-t-2 border-amber-500"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-amber-200 font-mono opacity-80 mb-1">Armateur garde</div><div className="font-display italic text-2xl sm:text-3xl">{fmtDH(c.armateur_keeps)}</div></div>
            <div className="p-4 bg-slate-800 rounded-sm border-t-2 border-emerald-500"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-emerald-200 font-mono opacity-80 mb-1">Équipage brut total</div><div className="font-display italic text-2xl sm:text-3xl">{fmtDH(c.total_equipage_brut)}</div></div>
            <div className="p-4 bg-slate-800 rounded-sm border-t-2 border-red-400"><div className="text-[0.6rem] tracking-[0.2em] uppercase text-red-200 font-mono opacity-80 mb-1">Cash à verser</div><div className="font-display italic text-2xl sm:text-3xl">{fmtDH(c.cash_to_pay)}</div></div>
          </div>
        </Card>
      </div>

      <div className="print-only" style={{ padding:'1rem', background:'white' }}>
        <div style={{ borderBottom:'2px solid #1a2d45', paddingBottom:10, marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div>
              <div className="font-display italic" style={{ fontSize:22, color:'#1a2d45' }}>Feuille de décompte</div>
              <div style={{ fontSize:11, color:'#8b7a5a', fontFamily:'Geist Mono' }}>{boat?.name} · {boat?.matricule}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{decompte.number}</div>
              <div style={{ fontSize:11, color:'#8b7a5a', fontFamily:'Geist Mono' }}>{fmtDateFR(decompte.date)}</div>
            </div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div style={{ border:'1px solid #e6dcc8', padding:8 }}>
            <div style={{ fontSize:10, color:'#8b7a5a', fontFamily:'Geist Mono' }}>RECETTES</div>
            <div style={{ fontSize:12, marginTop:4 }}>Brut : <strong>{fmtDH(c.brut)}</strong></div>
            {c.especes > 0 && <div style={{ fontSize:11 }}>Espèces : {fmtDH(c.especes)}</div>}
            {c.fakira > 0 && <div style={{ fontSize:11 }}>Fakira : −{fmtDH(c.fakira)}</div>}
            <div style={{ fontSize:13, marginTop:6, borderTop:'1px solid #e6dcc8', paddingTop:4 }}>Tot. Net : <strong>{fmtDH(c.tot_net)}</strong></div>
          </div>
          <div style={{ border:'1px solid #e6dcc8', padding:8 }}>
            <div style={{ fontSize:10, color:'#8b7a5a', fontFamily:'Geist Mono' }}>RÉPARTITION</div>
            <div style={{ fontSize:11 }}>Total frais : {fmtDH(c.total_frais)}</div>
            <div style={{ fontSize:12 }}>Net à répartir : <strong>{fmtDH(c.n_repartir)}</strong></div>
            <div style={{ fontSize:11 }}>50% Armateur : {fmtDH(c.pool_armateur)}</div>
            <div style={{ fontSize:11 }}>50% Équipage : {fmtDH(c.pool_equipage)}</div>
            <div style={{ fontSize:12, marginTop:4, borderTop:'1px solid #e6dcc8', paddingTop:4 }}>Valeur 1 part : <strong>{fmtDH(c.part_value)}</strong> ({c.total_parts_equipage} parts)</div>
          </div>
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:4, color:'#1a2d45' }}>FRAIS COMMUNS</div>
          <table style={{ width:'100%', fontSize:10, borderCollapse:'collapse' }}>
            <tbody>
              {c.frais_by_cat.filter(fc => fc.total > 0).flatMap(fc => [
                <tr key={`h-${fc.id}`} style={{ background:'#f5efe4' }}><td colSpan={2} style={{ padding:'3px 6px', fontWeight:600 }}>{fc.label}</td></tr>,
                ...fc.items.map(f => (
                  <tr key={f.id} style={{ borderBottom:'1px solid #f0e8d8' }}>
                    <td style={{ padding:'2px 6px' }}>{f.name}</td>
                    <td style={{ padding:'2px 6px', textAlign:'right', fontFamily:'Geist Mono' }}>{fmtDH(f.amount)}</td>
                  </tr>
                )),
              ])}
              <tr style={{ borderTop:'1.5px solid #1a2d45' }}><td style={{ padding:'4px 6px', fontWeight:600 }}>TOTAL</td><td style={{ padding:'4px 6px', textAlign:'right', fontWeight:600, fontFamily:'Geist Mono' }}>{fmtDH(c.total_frais)}</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:4, color:'#1a2d45' }}>ÉQUIPAGE</div>
          <table style={{ width:'100%', fontSize:10, borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f5efe4', fontSize:9 }}>
              <th style={{ padding:'3px 6px', textAlign:'left' }}>N°</th>
              <th style={{ padding:'3px 6px', textAlign:'left' }}>Nom</th>
              <th style={{ padding:'3px 6px', textAlign:'left' }}>Rôle</th>
              <th style={{ padding:'3px 6px', textAlign:'center' }}>Parts</th>
              <th style={{ padding:'3px 6px', textAlign:'right' }}>Salaire</th>
              <th style={{ padding:'3px 6px', textAlign:'right' }}>Bonus</th>
              <th style={{ padding:'3px 6px', textAlign:'right' }}>Total</th>
            </tr></thead>
            <tbody>
              {c.crew.map((m, i) => (
                <tr key={m.id} style={{ borderBottom:'1px solid #f0e8d8' }}>
                  <td style={{ padding:'2px 6px', fontFamily:'Geist Mono' }}>{i + 1}</td>
                  <td style={{ padding:'2px 6px' }}>{m.name || '—'}</td>
                  <td style={{ padding:'2px 6px', fontFamily:'Geist Mono' }}>{m.role}</td>
                  <td style={{ padding:'2px 6px', textAlign:'center', fontFamily:'Geist Mono' }}>{m.parts}</td>
                  <td style={{ padding:'2px 6px', textAlign:'right', fontFamily:'Geist Mono' }}>{fmtDH(m.salaire_part)}</td>
                  <td style={{ padding:'2px 6px', textAlign:'right', fontFamily:'Geist Mono' }}>{m.bonus ? fmtDH(m.bonus) : '—'}</td>
                  <td style={{ padding:'2px 6px', textAlign:'right', fontFamily:'Geist Mono', fontWeight:600 }}>{fmtDH(m.total_brut_marin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:10, paddingTop:10, borderTop:'2px solid #1a2d45' }}>
          <div style={{ background:'#f5efe4', padding:8 }}><div style={{ fontSize:9, color:'#8b7a5a', fontFamily:'Geist Mono' }}>ARMATEUR GARDE</div><div style={{ fontSize:14, fontWeight:600, marginTop:3 }}>{fmtDH(c.armateur_keeps)}</div></div>
          <div style={{ background:'#f5efe4', padding:8 }}><div style={{ fontSize:9, color:'#8b7a5a', fontFamily:'Geist Mono' }}>ÉQUIPAGE BRUT</div><div style={{ fontSize:14, fontWeight:600, marginTop:3 }}>{fmtDH(c.total_equipage_brut)}</div></div>
          <div style={{ background:'#f5efe4', padding:8 }}><div style={{ fontSize:9, color:'#8b7a5a', fontFamily:'Geist Mono' }}>CASH À VERSER</div><div style={{ fontSize:14, fontWeight:600, marginTop:3 }}>{fmtDH(c.cash_to_pay)}</div></div>
        </div>
      </div>

      {confirmDel && <Modal onClose={() => setConfirmDel(false)} title="Supprimer le décompte ?"><p className="text-sm text-stone-600 mb-4">Cette action est irréversible.</p><div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setConfirmDel(false)}>Annuler</Btn><Btn variant="danger" icon={Trash2} onClick={() => { onDelete(); setConfirmDel(false); }}>Supprimer</Btn></div></Modal>}
    </>
  );
}

function BoatEditor({ boat, onCancel, onSave }) {
  const [state, setState] = useState(boat || { id: uid(), name: '', matricule: '' });
  const nameOk = (state.name || '').trim().length > 0;
  const handleSave = () => {
    const cleaned = { ...state, name: (state.name || '').trim(), matricule: (state.matricule || '').trim() };
    if (!cleaned.name) return;
    onSave(cleaned);
  };
  return (
    <Modal onClose={onCancel} title={boat ? "Modifier bateau" : "Nouveau bateau"}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono mb-1">Nom du bateau *</label>
          <input
            className="input-base input-text"
            value={state.name}
            onChange={e => setState(s => ({ ...s, name: e.target.value }))}
            onBlur={e => setState(s => ({ ...s, name: e.target.value }))}
            placeholder="BT ASNI-2"
            autoFocus
            autoComplete="off"
            inputMode="text"
          />
        </div>
        <div>
          <label className="block text-[0.6rem] tracking-[0.2em] uppercase text-stone-500 font-mono mb-1">Matricule</label>
          <input
            className="input-base input-text"
            value={state.matricule}
            onChange={e => setState(s => ({ ...s, matricule: e.target.value }))}
            onBlur={e => setState(s => ({ ...s, matricule: e.target.value }))}
            placeholder="N° 12-98"
            autoComplete="off"
            inputMode="text"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
        <Btn icon={Save} disabled={!nameOk} onClick={handleSave}>Enregistrer</Btn>
      </div>
    </Modal>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [boats, setBoats] = useState([]);
  const [decomptes, setDecomptes] = useState([]);
  const [view, setView] = useState({ name: 'dashboard' });
  const [editingBoat, setEditingBoat] = useState(null);
  const [editingDecompte, setEditingDecompte] = useState(null);
  const [newForBoat, setNewForBoat] = useState(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    (async () => {
      try { const [b, d] = await Promise.all([STORAGE.listBoats(), STORAGE.listDecomptes()]); setBoats(b); setDecomptes(d); }
      catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const navigate = (name, id) => { if (name === 'view' || name === 'boat') setView({ name, id }); else setView({ name }); };
  const saveBoat = async (boat) => {
    try {
      const result = await STORAGE.saveBoat(boat);
      if (!result) { alert("Le bateau n'a pas été enregistré (storage a renvoyé null). Réessaie."); return; }
      setBoats(prev => { const idx = prev.findIndex(b => b.id === boat.id); return idx >= 0 ? prev.map(b => b.id === boat.id ? boat : b) : [...prev, boat]; });
      setEditingBoat(null);
    } catch (e) {
      console.error(e);
      alert("Erreur : " + (e?.message || String(e)));
    }
  };
  const deleteBoat = async (id) => { try { await STORAGE.deleteBoat(id); setBoats(prev => prev.filter(b => b.id !== id)); } catch (e) { console.error(e); } };
  const saveDecompte = async (d) => {
    try {
      const result = await STORAGE.saveDecompte(d);
      if (!result) { alert("Le décompte n'a pas été enregistré. Réessaie."); return; }
      setDecomptes(prev => { const idx = prev.findIndex(x => x.id === d.id); return idx >= 0 ? prev.map(x => x.id === d.id ? d : x) : [...prev, d]; });
      setEditingDecompte(null); setNewForBoat(null); setView({ name: 'view', id: d.id });
    } catch (e) {
      console.error(e);
      alert("Erreur : " + (e?.message || String(e)));
    }
  };
  const deleteDecompte = async (id) => { try { await STORAGE.deleteDecompte(id); setDecomptes(prev => prev.filter(x => x.id !== id)); setView({ name: 'dashboard' }); } catch (e) { console.error(e); } };
  const openNewDecompte = (boatId) => { if (!boats.length) { setEditingBoat({ id: uid(), name: '', matricule: '' }); return; } setNewForBoat(boatId || boats[0].id); setEditingDecompte({ _new: true }); };

  const content = () => {
    if (loading) return <div className="flex items-center justify-center py-20"><Waves className="w-8 h-8 text-amber-600 animate-pulse" /></div>;
    switch (view.name) {
      case 'dashboard': return <Dashboard boats={boats} decomptes={decomptes} onNavigate={navigate} onNewDecompte={() => openNewDecompte()} />;
      case 'boats': return <BoatsView boats={boats} decomptes={decomptes} onNavigate={navigate} onNewBoat={() => setEditingBoat({ id: uid(), name: '', matricule: '' })} onDeleteBoat={deleteBoat} />;
      case 'boat': { const b = boats.find(x => x.id === view.id); if (!b) return <EmptyState icon={AlertCircle} title="Bateau introuvable" />; return <BoatDetail boat={b} decomptes={decomptes} onBack={() => setView({ name: 'boats' })} onNavigate={navigate} onNewDecompte={openNewDecompte} />; }
      case 'archive': return <ArchiveView decomptes={decomptes} boats={boats} onNavigate={navigate} />;
      case 'view': { const d = decomptes.find(x => x.id === view.id); const b = d && boats.find(x => x.id === d.boatId); if (!d) return <EmptyState icon={AlertCircle} title="Décompte introuvable" />; return <DecompteViewer decompte={d} boat={b} onBack={() => setView({ name: 'archive' })} onEdit={() => setEditingDecompte(d)} onDelete={() => deleteDecompte(d.id)} />; }
      default: return null;
    }
  };

  const showEditor = editingDecompte && (editingDecompte._new || editingDecompte.id);

  return (
    <div className="paper-bg min-h-screen">
      <style>{FONT_STYLE}</style>
      <header className="border-b border-stone-200 bg-[#faf6ed]/90 backdrop-blur sticky top-0 z-30 relative no-print">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-slate-900 text-amber-100 rounded-sm flex items-center justify-center"><Anchor className="w-4 h-4" strokeWidth={1.5} /></div>
            <div>
              <div className="font-display italic text-lg text-slate-900 leading-none">Palangrier</div>
              <div className="text-[0.55rem] tracking-[0.25em] uppercase text-amber-700 font-mono mt-0.5">Gestion armateur</div>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {[['dashboard','Tableau',LayoutDashboard],['boats','Bateaux',Ship],['archive','Archive',ArchiveIcon]].map(([k, label, Icon]) => (
              <button key={k} onClick={() => navigate(k)} className={`px-3 py-1.5 text-sm rounded-sm inline-flex items-center gap-1.5 transition ${view.name === k || (k === 'boats' && view.name === 'boat') ? 'bg-slate-900 text-amber-50' : 'text-stone-700 hover:bg-stone-100'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
            <Btn size="sm" variant="secondary" icon={Wand2} onClick={() => setShowImport(true)} className="ml-2">Importer</Btn>
            <Btn size="sm" icon={Plus} onClick={() => openNewDecompte()}>Nouveau</Btn>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-7 relative z-10">{content()}</main>
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-[#faf6ed] border-t border-stone-200 z-20 no-print">
        <div className="grid grid-cols-5 text-xs">
          {[['dashboard','Accueil',Home],['boats','Bateaux',Ship],['archive','Archive',ArchiveIcon]].map(([k, label, Icon]) => (
            <button key={k} onClick={() => navigate(k)} className={`py-2 flex flex-col items-center gap-1 ${view.name === k || (k === 'boats' && view.name === 'boat') ? 'text-amber-700' : 'text-stone-600'}`}>
              <Icon className="w-5 h-5" strokeWidth={1.5} /><span className="text-[0.62rem]">{label}</span>
            </button>
          ))}
          <button onClick={() => setShowImport(true)} className="py-2 flex flex-col items-center gap-1 text-amber-700">
            <Wand2 className="w-5 h-5" strokeWidth={1.5} /><span className="text-[0.62rem]">Importer</span>
          </button>
          <button onClick={() => openNewDecompte()} className="py-2 flex flex-col items-center gap-1 text-slate-900">
            <div className="w-8 h-8 -mt-1 bg-slate-900 text-amber-50 rounded-sm flex items-center justify-center shadow-soft"><Plus className="w-4 h-4" /></div>
            <span className="text-[0.62rem]">Nouveau</span>
          </button>
        </div>
      </nav>
      <div className="sm:hidden h-14 no-print"></div>
      {editingBoat && <BoatEditor boat={editingBoat.name ? editingBoat : null} onCancel={() => setEditingBoat(null)} onSave={saveBoat} />}
      {showEditor && <DecompteEditor boats={boats} existingBoatId={newForBoat} decompte={editingDecompte._new ? null : editingDecompte} onCancel={() => { setEditingDecompte(null); setNewForBoat(null); }} onSave={saveDecompte} />}
      {showImport && (
        <ImportModal
          boats={boats}
          onClose={() => setShowImport(false)}
          onCreateBoat={() => setEditingBoat({ id: uid(), name: '', matricule: '' })}
          onImported={(decompte) => {
            setShowImport(false);
            setNewForBoat(decompte.boatId);
            setEditingDecompte(decompte);
          }}
        />
      )}
    </div>
  );
}
