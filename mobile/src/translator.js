// Translation utility for English <-> Hindi bilingual toggle in Mobile App
const memoryCache = new Map();

// Check if string already contains Hindi (Devanagari) characters
export function hasHindi(text) {
  if (!text) return false;
  return /[\u0900-\u097F]/.test(text);
}

// Skip translation for English / Verbal Ability and Hindi subjects
export function isNonTranslatableSubject(subject) {
  if (!subject || typeof subject !== 'string') return false;
  const s = subject.toLowerCase().trim();
  return (
    s.includes('english') ||
    s.includes('verbal') ||
    s.includes('hindi') ||
    s.includes('हिन्दी') ||
    s.includes('हिंदी')
  );
}

// Translate a single string from English to Hindi using MyMemory API
export async function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed || hasHindi(trimmed)) return trimmed;

  // Check in-memory cache
  if (memoryCache.has(trimmed)) {
    return memoryCache.get(trimmed);
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|hi`;
    const res = await fetch(url);
    if (!res.ok) return trimmed;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (translated && typeof translated === 'string' && !translated.startsWith('MYMEMORY WARNING')) {
      memoryCache.set(trimmed, translated);
      return translated;
    }
  } catch (err) {
    // Fallback on network error
  }

  return trimmed;
}

// Translate an entire question object into Hindi
export async function translateQuestionToHindi(q) {
  if (!q) return q;
  if (isNonTranslatableSubject(q.subject)) return q;

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
