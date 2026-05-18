/* =====================================================
   IMMO RÉDAC — app.js
   Gilles MAROUN — Propulsé par Google Gemini (gratuit)
   ===================================================== */

'use strict';

const API_URL = '/.netlify/functions/generate';

const LOADING_STEPS = [
  'Analyse du bien en cours…',
  'Rédaction de l\'accroche…',
  'Mise en forme de l\'annonce…',
  'Finalisation et optimisation…'
];

let lastResult   = null;
let loadInterval = null;
let isVariant    = false;

const $ = (id) => document.getElementById(id);
function showEl(id)  { $(id).style.display = '';     }
function hideEl(id)  { $(id).style.display = 'none'; }

function showToast(msg, duration = 2500) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function setBtn(disabled) {
  const btn = $('btnGenerate');
  btn.disabled = disabled;
  btn.querySelector('.btn-label').textContent = disabled ? 'Génération…' : 'Générer l\'annonce';
}

function startLoading() {
  let i = 0;
  $('loadingText').textContent = LOADING_STEPS[0];
  loadInterval = setInterval(() => {
    i = (i + 1) % LOADING_STEPS.length;
    $('loadingText').textContent = LOADING_STEPS[i];
  }, 1800);
}

function stopLoading() {
  clearInterval(loadInterval);
  loadInterval = null;
}

function getFormData() {
  return {
    typeBien:     $('typeBien').value.trim(),
    transaction:  $('transaction').value.trim(),
    surface:      $('surface').value.trim(),
    pieces:       $('pieces').value.trim(),
    prix:         $('prix').value.trim(),
    localisation: $('localisation').value.trim(),
    pointsForts:  $('pointsForts').value.trim(),
    ton:          $('ton').value.trim(),
    plateforme:   $('plateforme').value.trim(),
    infosCompl:   $('infosCompl').value.trim()
  };
}

function validateForm(data) {
  if (!data.localisation) return 'Veuillez renseigner la localisation du bien.';
  if (!data.typeBien)     return 'Veuillez sélectionner le type de bien.';
  return null;
}

function buildPrompt(data, variant) {
  const variantNote = variant ? '\nIMPORTANT : Génère une VERSION DIFFÉRENTE avec un angle d\'accroche distinct.\n' : '';
  const prixFormate = data.prix
    ? (data.transaction.toLowerCase().includes('location')
        ? Number(data.prix).toLocaleString('fr-FR') + ' €/mois'
        : Number(data.prix).toLocaleString('fr-FR') + ' €')
    : null;

  const details = [
    data.surface     && 'Surface : ' + data.surface + ' m²',
    data.pieces      && 'Pièces : ' + data.pieces,
    prixFormate      && 'Prix : ' + prixFormate,
    data.pointsForts && 'Points forts : ' + data.pointsForts,
    data.infosCompl  && 'Infos : ' + data.infosCompl
  ].filter(Boolean).join('\n');

  return 'Tu es un expert en rédaction d\'annonces immobilières françaises pour ' + data.plateforme + '.' + variantNote + '\n\nBIEN :\n- Type : ' + data.transaction + ' — ' + data.typeBien + '\n- Localisation : ' + data.localisation + '\n' + details + '\n\nCONSIGNES :\n- Ton : ' + data.ton + '\n- Longueur : 200-250 mots\n- Français soigné, sans fautes\n- N\'invente PAS d\'informations non fournies\n\nRéponds UNIQUEMENT en JSON valide, sans backticks, sans markdown :\n{\n  "titre": "Titre accrocheur de 10-15 mots",\n  "corps": "Corps de l\'annonce en 200-250 mots, paragraphes séparés par \\n\\n",\n  "seo": {\n    "tags": ["tag1","tag2","tag3","tag4","tag5","tag6"],\n    "meta": "Méta-description de 150-160 caractères"\n  }\n}';
}

async function callGemini(prompt) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur serveur (' + response.status + ')');

  const raw     = data.text || '';
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Réponse IA invalide. Réessayez.');
  }
}

function renderResult(result, data) {
  lastResult = { result, data };

  $('resultBadges').innerHTML =
    '<span class="badge badge-blue">' + data.transaction + '</span>' +
    '<span class="badge badge-gray">' + data.typeBien + '</span>' +
    '<span class="badge badge-green">' + data.ton.split('&')[0].trim() + '</span>';

  const titleEl = $('resultTitle');
  if (result.titre) { titleEl.textContent = result.titre; titleEl.style.display = 'block'; }
  else              { titleEl.style.display = 'none'; }

  $('resultText').textContent = result.corps;

  if (result.seo) {
    const tc = $('seoTags');
    tc.innerHTML = '';
    (result.seo.tags || []).forEach(tag => {
      const s = document.createElement('span');
      s.className = 'seo-tag'; s.textContent = tag;
      tc.appendChild(s);
    });
    $('seoMeta').textContent = result.seo.meta || '';
    showEl('seoSection');
  } else {
    hideEl('seoSection');
  }

  hideEl('loadingState');
  showEl('resultBody');
  hideEl('errorState');
  $('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function generateAd(useVariant) {
  const data  = getFormData();
  const error = validateForm(data);
  if (error) { showToast('⚠️ ' + error, 3500); return; }

  isVariant = !!useVariant;
  showEl('resultSection');
  hideEl('resultBody');
  hideEl('errorState');
  showEl('loadingState');
  setBtn(true);
  startLoading();

  try {
    const result = await callGemini(buildPrompt(data, isVariant));
    stopLoading();
    renderResult(result, data);
    showToast('✅ Annonce générée avec succès !');
  } catch (err) {
    stopLoading();
    hideEl('loadingState');
    hideEl('resultBody');
    showEl('errorState');
    $('errorMsg').textContent = '❌ ' + (err.message || 'Erreur inconnue. Réessayez.');
    showToast('❌ Erreur de génération', 3500);
    console.error('[ImmoRédac]', err);
  }

  setBtn(false);
}

function generateVariant() { generateAd(true); }

function copyAd() {
  if (!lastResult) return;
  const { result } = lastResult;
  const lines = [];
  if (result.titre) { lines.push(result.titre); lines.push(''); }
  lines.push(result.corps);
  const text = lines.join('\n');
  navigator.clipboard.writeText(text)
    .then(() => showToast('📋 Annonce copiée !'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('📋 Annonce copiée !');
    });
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); generateAd(); }
});
