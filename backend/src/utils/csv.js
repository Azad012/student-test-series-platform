/**
 * RFC 4180-compatible CSV parser for bulk question import.
 * Supports quoted fields, escaped quotes (""), and CRLF/LF line endings.
 */
function parseCsvRows(csvText) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  const text = String(csvText || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentCell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\r' && next === '\n') {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell !== '')) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      i += 1;
    } else if (char === '\n' || char === '\r') {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell !== '')) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);

function normalizeQuestionRecord(raw, index = 0) {
  const questionText = String(raw.question_text ?? raw.questionText ?? raw.question ?? '').trim();
  const optionA = String(raw.option_a ?? raw.optionA ?? raw.a ?? '').trim();
  const optionB = String(raw.option_b ?? raw.optionB ?? raw.b ?? '').trim();
  const optionC = String(raw.option_c ?? raw.optionC ?? raw.c ?? '').trim();
  const optionD = String(raw.option_d ?? raw.optionD ?? raw.d ?? '').trim();
  const correctOption = String(raw.correct_option ?? raw.correctOption ?? raw.correct ?? raw.answer ?? '')
    .trim()
    .toUpperCase();
  const subject = String(raw.subject ?? raw.topic ?? 'General').trim() || 'General';
  const explanation = String(raw.explanation ?? '').trim();

  const errors = [];
  if (!questionText) errors.push('question_text is required');
  if (!optionA || !optionB || !optionC || !optionD) errors.push('all four options (A, B, C, D) are required');
  if (!VALID_OPTIONS.has(correctOption)) errors.push('correct_option must be A, B, C, or D');

  if (errors.length > 0) {
    return { error: `Row ${index + 1}: ${errors.join('; ')}` };
  }

  return {
    record: {
      subject,
      question_text: questionText,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_option: correctOption,
      explanation,
    },
  };
}

function parseBulkQuestions(format, data) {
  let rawItems = [];

  if (format === 'csv') {
    const rows = parseCsvRows(data);
    if (rows.length < 2) {
      return { valid: [], errors: ['CSV must include a header row and at least one data row'] };
    }
    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    rawItems = rows.slice(1).map((cells) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx] ?? '';
      });
      return obj;
    });
  } else {
    let parsed = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch {
        return { valid: [], errors: ['Invalid JSON payload'] };
      }
    }
    if (!Array.isArray(parsed)) {
      return { valid: [], errors: ['JSON payload must be an array of question objects'] };
    }
    rawItems = parsed;
  }

  const valid = [];
  const errors = [];
  rawItems.forEach((item, idx) => {
    const res = normalizeQuestionRecord(item, idx);
    if (res.error) errors.push(res.error);
    else valid.push(res.record);
  });

  return { valid, errors };
}

module.exports = {
  parseCsvRows,
  normalizeQuestionRecord,
  parseBulkQuestions,
};
