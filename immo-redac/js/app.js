/* =====================================================
   IMMO RÉDAC — app.js
   Gilles MAROUN — Propulsé par Claude / Anthropic
   ===================================================== */

'use strict';

// ──────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL   = 'claude-sonnet-4-20250514';
const MAX_TOKENS     = 1500;

const LOADING_STEPS = [
  'Analyse du bien en cours…',
  'Rédaction de l\'accroche…',
  'Mise en forme de l\'annonce…',
  'Finalisation et optimisation…'
];

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────

let lastResult   = null;
let loadInterval = null;
let isVariant    = false;

// ──────────────────────────────────────────────
// DOM HELPERS
// ──────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function showEl(id)  { $(id).style.display = '';      }
function hideEl(id)  { $(id).style.display = 'none';  }
function showFlex(id){ $(id).style.display = 'flex';  }

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

// ──────────────────────────────────────────────
// LOADING ANIMATION
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// COLLECT FORM DATA
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// PROMPT BUILDER
// ──────────────────────────────────────────────

function buildPrompt(data, variant = false) {
  const variantNote = variant
    ? '\n⚠️ IMPORTANT : génère une VERSION DIFFÉRENTE de la précédente. Change l\'angle d\'accroche, le rythme et la structure du texte.\n'
    : '';

  const prixFormate = data.prix
    ? (data.transaction.toLowerCase().includes('location')
        ? `${Number(data.prix).toLocaleString('fr-FR')} €/mois`
        : `${Number(data.prix).toLocaleString('fr-FR')} €`)
    : null;

  const details = [
    data.surface   && `Surface : ${data.surface} m²`,
    data.pieces    && `Nombre de pièces : ${data.pieces}`,
    prixFormate    && `Prix : ${prixFormate}`,
    data.pointsForts && `Points forts : ${data.pointsForts}`,
    data.infosCompl  && `Informations complémentaires : ${data.infosCompl}`
  ].filter(Boolean).join('\n');

  return `Tu es un expert en rédaction d'annonces immobilières françaises pour la plateforme ${data.plateforme}.${variantNote}

BIEN À VENDRE / LOUER :
- Type : ${data.transaction} — ${data.typeBien}
- Localisation : ${data.localisation}
${details}

CONSIGNES DE RÉDACTION :
- Ton : ${data.ton}
- Plateforme cible : ${data.plateforme}
- Longueur souhaitée : environ 200-250 mots pour le corps de l'annonce
- Langue : français, sans fautes, style soigné
- N'invente PAS d'informations non fournies
- Commence directement par l'annonce, sans introduction

Réponds UNIQUEMENT en JSON valide (sans backticks, sans commentaires) :
{
  "titre": "Titre accrocheur de 10-15 mots",
  "corps": "Corps complet de l'annonce (200-250 mots, paragraphes séparés par \\n\\n)",
  "seo": {
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
    "meta": "Méta-description de 150-160 caractères exactement"
  }
}`;
}

// ──────────────────────────────────────────────
// API CALL
// ──────────────────────────────────────────────

async function callClaude(prompt) {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model:      CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur API (${response.status})`);
  }

  const data = await response.json();
  const raw  = data.content?.[0]?.text || '';

  // Strip possible markdown code fences
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('La réponse de l\'IA n\'était pas au format attendu. Réessayez.');
  }
}

// ──────────────────────────────────────────────
// RENDER RESULT
// ──────────────────────────────────────────────

function renderResult(result, data) {
  lastResult = { result, data };

  // Badges
  const badges = $('resultBadges');
  badges.innerHTML = `
    <span class="badge badge-blue">${data.transaction}</span>
    <span class="badge badge-gray">${data.typeBien}</span>
    <span class="badge badge-green">${data.ton.split('&')[0].trim()}</span>
  `;

  // Title
  const titleEl = $('resultTitle');
  if (result.titre) {
    titleEl.textContent = result.titre;
    titleEl.style.display = 'block';
  } else {
    titleEl.style.display = 'none';
  }

  // Body
  $('resultText').textContent = result.corps;

  // SEO
  if (result.seo) {
    const tagsContainer = $('seoTags');
    tagsContainer.innerHTML = '';
    (result.seo.tags || []).forEach(tag => {
      const span = document.createElement('span');
      span.className = 'seo-tag';
      span.textContent = tag;
      tagsContainer.appendChild(span);
    });

    $('seoMeta').textContent  = result.seo.meta || '';
    showEl('seoSection');
  } else {
    hideEl('seoSection');
  }

  // Show panels
  hideEl('loadingState');
  showEl('resultBody');
  hideEl('errorState');

  $('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ──────────────────────────────────────────────
// MAIN GENERATE FUNCTION
// ──────────────────────────────────────────────

async function generateAd(useVariant = false) {
  const data  = getFormData();
  const error = validateForm(data);

  if (error) {
    showToast('⚠️ ' + error, 3500);
    return;
  }

  isVariant = useVariant;

  // Show result section with loading
  showEl('resultSection');
  hideEl('resultBody');
  hideEl('errorState');
  showEl('loadingState');
  setBtn(true);
  startLoading();

  try {
    const prompt = buildPrompt(data, isVariant);
    const result = await callClaude(prompt);
    stopLoading();
    renderResult(result, data);
    showToast('✅ Annonce générée avec succès !');
  } catch (err) {
    stopLoading();
    hideEl('loadingState');
    hideEl('resultBody');
    showEl('errorState');
    $('errorMsg').textContent = '❌ ' + (err.message || 'Une erreur est survenue. Réessayez.');
    showToast('❌ Erreur de génération', 3500);
    console.error('[ImmoRédac]', err);
  }

  setBtn(false);
}

// ──────────────────────────────────────────────
// VARIANT (different angle)
// ──────────────────────────────────────────────

function generateVariant() {
  generateAd(true);
}

// ──────────────────────────────────────────────
// COPY
// ──────────────────────────────────────────────

function copyAd() {
  if (!lastResult) return;
  const { result } = lastResult;
  const text = [
    result.titre && result.titre,
    result.titre && '',          // blank line after title
    result.corps
  ].filter(v => v !== undefined).join('\n');

  navigator.clipboard.writeText(text)
    .then(() => showToast('📋 Annonce copiée dans le presse-papiers !'))
    .catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('📋 Annonce copiée !');
    });
}

// ──────────────────────────────────────────────
// KEYBOARD SHORTCUT  Ctrl+Enter → generate
// ──────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generateAd();
  }
});
