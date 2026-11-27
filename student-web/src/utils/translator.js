// Translation utility for English <-> Hindi bilingual toggle
const memoryCache = new Map();

// Check if string already contains Hindi (Devanagari) characters
export function hasHindi(text) {
  if (!text) return false;
  return /[\u0900-\u097F]/.test(text);
}

// Translate a single string from English to Hindi
export async function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed || hasHindi(trimmed)) return trimmed;

  // Check in-memory cache
  if (memoryCache.has(trimmed)) {
    return memoryCache.get(trimmed);
  }

  // Check localStorage cache
  const cacheKey = `tr_hi_${trimmed.slice(0, 40)}_${trimmed.length}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      memoryCache.set(trimmed, cached);
      return cached;
    }
  } catch {}

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|hi`;
    const res = await fetch(url);
    if (!res.ok) return trimmed;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (translated && typeof translated === 'string' && !translated.startsWith('MYMEMORY WARNING')) {
      memoryCache.set(trimmed, translated);
      try { localStorage.setItem(cacheKey, translated); } catch {}
      return translated;
    }
  } catch (err) {
    // Network or offline fallback
  }

  return trimmed;
}

// Translate an entire question object into Hindi
export async function translateQuestionToHindi(q) {
  if (!q) return q;

  // If already has Hindi question text, return as is
  if (q.question_text_hi || hasHindi(q.question_text)) {
    return {
      ...q,
      question_text: q.question_text_hi || q.question_text,
      option_a: q.option_a_hi || q.option_a,
      option_b: q.option_b_hi || q.option_b,
      option_c: q.option_c_hi || q.option_c,
      option_d: q.option_d_hi || q.option_d,
      explanation: q.explanation_hi || q.explanation,
    };
  }

  const [qText, optA, optB, optC, optD, expl] = await Promise.all([
    translateText(q.question_text || q.text || q.question),
    translateText(q.option_a),
    translateText(q.option_b),
    translateText(q.option_c),
    translateText(q.option_d),
    translateText(q.explanation),
  ]);

  return {
    ...q,
    question_text: qText,
    option_a: optA,
    option_b: optB,
    option_c: optC,
    option_d: optD,
    explanation: expl,
  };
}
