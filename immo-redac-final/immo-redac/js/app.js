/* =====================================================
   IMMO RÉDAC — app.js
   Gilles MAROUN — Google Gemini direct (usage personnel)
   ===================================================== */

'use strict';

// ⚠️ Remplacez par votre clé Gemini obtenue sur aistudio.google.com
const GEMINI_API_KEY = 'AIzaSyD5mxGbxFZ1Pv6mu3lBhIR464LXfyYL2As';

const LOADING_STEPS = [
  'Analyse du bien en cours…',
  'Rédaction de l\'accroche…',
  'Mise en forme de l\'annonce…',
  'Finalisation et optimisation…'
];

let lastResult   = null;
let loadInterval = null;

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
  return null;
}

function buildPrompt(data, variant) {
  const variantNote = variant ? '\nIMPORTANT : Génère une VERSION DIFFÉRENTE avec un angle distinct.\n' : '';
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

  return 'Tu es un expert en rédaction d\'annonces immobilières françaises pour ' + data.plateforme + '.' + variantNote + '\n\nBIEN :\n- Type : ' + data.transaction + ' — ' + data.typeBien + '\n- Localisation : ' + data.localisation + '\n' + details + '\n\nCONSIGNES :\n- Ton : ' + data.ton + '\n- Longueur : 200-250 mots\n- Français soigné, sans fautes\n- N\'invente PAS d\'informations non fournies\n\nRéponds UNIQUEMENT en JSON valide, sans backticks :\n{\n  "titre": "Titre accrocheur de 10-15 mots",\n  "corps": "Corps de l\'annonce en 200-250 mots, paragraphes séparés par \\n\\n",\n  "seo": {\n    "tags": ["tag1","tag2","tag3","tag4","tag5","tag6"],\n    "meta": "Méta-description de 150-160 caractères"\n  }\n}';
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'VOTRE_CLE_ICI') {
    throw new Error('Clé API manquante. Ouvrez js/app.js et remplacez VOTRE_CLE_ICI par votre clé Gemini.');
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 1500 }
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Erreur API Gemini');

  const raw     = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
  else { titleEl.style.display = 'none'; }

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

  showEl('resultSection');
  hideEl('resultBody');
  hideEl('errorState');
  showEl('loadingState');
  setBtn(true);
  startLoading();

  try {
    const result = await callGemini(buildPrompt(data, !!useVariant));
    stopLoading();
    renderResult(result, data);
    showToast('✅ Annonce générée avec succès !');
  } catch (err) {
    stopLoading();
    hideEl('loadingState');
    hideEl('resultBody');
    showEl('errorState');
    $('errorMsg').textContent = '❌ ' + (err.message || 'Erreur inconnue. Réessayez.');
    showToast('❌ Erreur', 3500);
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
  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => showToast('📋 Annonce copiée !'))
    .catch(() => showToast('❌ Erreur de copie'));
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); generateAd(); }
});
