import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, formatDurationClock } from '../theme';
import { mobileApi } from '../api';
import { translateQuestionToHindi, isNonTranslatableSubject } from '../translator';

function formatQText(text) {
  if (!text) return '';
  return String(text).replace(/^Q\d+\.\s*/i, '');
}

export default function ResultReviewScreen({ attemptId, onBack }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'correct' | 'wrong' | 'unattempted'
  const [lang, setLang] = useState('en'); // 'en' | 'hi'
  const [translatedMap, setTranslatedMap] = useState({});
  const [translating, setTranslating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const orderRank = useMemo(
    () => ({
      'quantitative aptitude': 1,
      quant: 1,
      math: 1,
      mathematics: 1,
      'logical reasoning': 2,
      reasoning: 2,
      'general intelligence': 2,
      'verbal ability': 3,
      english: 3,
      'english comprehension': 3,
      'general science': 4,
      'general awareness': 4,
      science: 4,
    }),
    []
  );

  useEffect(() => {
    setLoading(true);
    mobileApi
      .attemptResult(attemptId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [attemptId]);

  // Translate review questions when Hindi is chosen
  useEffect(() => {
    if (lang === 'hi' && data?.questions) {
      const untranslated = data.questions.filter(
        (q) => !translatedMap[q.id] && !isNonTranslatableSubject(q.subject)
      );
      if (untranslated.length > 0) {
        setTranslating(true);
        Promise.all(
          untranslated.map((q) => translateQuestionToHindi(q).then((tQ) => [q.id, tQ]))
        )
          .then((entries) => {
            setTranslatedMap((m) => ({ ...m, ...Object.fromEntries(entries) }));
          })
          .finally(() => setTranslating(false));
      }
    }
  }, [lang, data?.questions, translatedMap]);

  // Order review questions continuously by subject
  const rawQuestions = useMemo(() => {
    const raw = data?.questions || [];
    return [...raw].sort((a, b) => {
      const sA = (a.subject || 'General').toLowerCase().trim();
      const sB = (b.subject || 'General').toLowerCase().trim();
      const rankA = orderRank[sA] || 99;
      const rankB = orderRank[sB] || 99;
      if (rankA !== rankB) return rankA - rankB;
      if (sA !== sB) return sA.localeCompare(sB);
      return (a.order_index ?? a.id ?? 0) - (b.order_index ?? b.id ?? 0);
    });
  }, [data?.questions, orderRank]);

  const filteredQuestions = useMemo(() => {
    return rawQuestions.filter((q) => {
      if (filter === 'correct') return q.selected_option && q.is_correct === 1;
      if (filter === 'wrong') return q.selected_option && q.is_correct === 0;
      if (filter === 'unattempted') return !q.selected_option;
      return true;
    });
  }, [rawQuestions, filter]);

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, { padding: 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.errorBox}>
          <Text style={{ color: COLORS.danger }}>{error || 'Unable to load result'}</Text>
        </View>
      </View>
    );
  }

  const { attempt, test, subjectBreakdown } = data;
  const pct =
    attempt.max_score > 0
      ? Math.max(0, ((attempt.score / attempt.max_score) * 100).toFixed(1))
      : '0.0';
  const positiveEarned = Number((attempt.correct_count * Number(test.marks_correct)).toFixed(2));
  const negativeDeducted = Number((attempt.wrong_count * Number(test.negative_marks)).toFixed(2));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Top Header Row with Back & Language Toggle */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← Back to Tests</Text>
        </TouchableOpacity>

        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
            onPress={() => setLang('en')}
          >
            <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'hi' && styles.langBtnActive]}
            onPress={() => setLang('hi')}
          >
            <Text style={[styles.langText, lang === 'hi' && styles.langTextActive]}>हिं</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Score Hero */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTag}>
          {attempt.status === 'auto_submitted' ? 'AUTO-SUBMITTED ON TIMEOUT' : 'TEST RESULT'}
        </Text>
        <Text style={styles.heroTitle}>{test.title}</Text>
        <Text style={styles.heroCourse}>{test.course_title}</Text>

        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.scoreBig}>
              {attempt.score}
              <Text style={styles.scoreMax}> / {attempt.max_score}</Text>
            </Text>
            <Text style={styles.scoreLabel}>Total Marks ({pct}%)</Text>
          </View>
          <View style={styles.accBadge}>
            <Text style={styles.accValue}>{attempt.accuracy}%</Text>
            <Text style={styles.accLabel}>Accuracy</Text>
          </View>
        </View>

        <View style={styles.metaStrip}>
          <Text style={styles.metaStripText}>
            Time: {formatDurationClock(attempt.time_taken_seconds)}
          </Text>
          <Text style={styles.metaStripText}>
            +{positiveEarned} correct · -{negativeDeducted} penalty
          </Text>
        </View>
      </View>

      {/* Breakdown Counts */}
      <View style={styles.countsRow}>
        <View style={[styles.countBox, { backgroundColor: COLORS.successSoft }]}>
          <Text style={[styles.countVal, { color: COLORS.success }]}>{attempt.correct_count}</Text>
          <Text style={styles.countLbl}>Correct</Text>
        </View>
        <View style={[styles.countBox, { backgroundColor: COLORS.dangerSoft }]}>
          <Text style={[styles.countVal, { color: COLORS.danger }]}>{attempt.wrong_count}</Text>
          <Text style={styles.countLbl}>Wrong</Text>
        </View>
        <View style={[styles.countBox, { backgroundColor: COLORS.warningSoft }]}>
          <Text style={[styles.countVal, { color: COLORS.warning }]}>
            {attempt.unattempted_count}
          </Text>
          <Text style={styles.countLbl}>Skipped</Text>
        </View>
      </View>

      {/* Subject-wise Performance */}
      {subjectBreakdown?.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Subject-wise Performance</Text>
          {subjectBreakdown.map((s) => (
            <View key={s.subject} style={styles.subjRow}>
              <View style={styles.subjTop}>
                <Text style={styles.subjName}>{s.subject}</Text>
                <Text style={styles.subjStats}>
                  {s.correct}/{s.total} correct · {s.marks} marks ({s.accuracy}%)
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(4, s.accuracy))}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Question & Answer Review Header */}
      <View style={styles.reviewHeaderRow}>
        <Text style={styles.reviewHeading}>Question & Answer Review</Text>
        {lang === 'hi' && translating && (
          <View style={styles.translatingPill}>
            <Text style={styles.translatingText}>🔄 अनुवाद...</Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {[
          { key: 'all', label: `All (${rawQuestions.length})` },
          { key: 'correct', label: `Correct (${attempt.correct_count})` },
          { key: 'wrong', label: `Wrong (${attempt.wrong_count})` },
          { key: 'unattempted', label: `Skipped (${attempt.unattempted_count})` },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Questions Review List */}
      {filteredQuestions.map((rawQ, i) => {
        const q = (lang === 'hi' && translatedMap[rawQ.id]) ? translatedMap[rawQ.id] : rawQ;
        const selectedOpt = rawQ.selected_option;
        const correctOpt = rawQ.correct_option;
        const isSkipped = !selectedOpt;
        const isCorrect = rawQ.is_correct === 1 || (selectedOpt && selectedOpt === correctOpt);
        const isWrong = !isSkipped && !isCorrect;

        const options = [
          { key: 'A', text: q.option_a },
          { key: 'B', text: q.option_b },
          { key: 'C', text: q.option_c },
          { key: 'D', text: q.option_d },
        ].filter((opt) => opt.text !== undefined && opt.text !== null && opt.text !== '');

        return (
          <View key={rawQ.id || i} style={styles.questionCard}>
            <View style={styles.qHeader}>
              <Text style={styles.qIndex}>
                Q{i + 1} {q.subject ? `• ${q.subject}` : ''}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isCorrect
                    ? { backgroundColor: COLORS.successSoft }
                    : isWrong
                    ? { backgroundColor: COLORS.dangerSoft }
                    : { backgroundColor: COLORS.warningSoft },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isCorrect
                      ? { color: COLORS.success }
                      : isWrong
                      ? { color: COLORS.danger }
                      : { color: COLORS.warning },
                  ]}
                >
                  {isCorrect ? '✓ Correct' : isWrong ? '✗ Incorrect' : '— Skipped'}
                </Text>
              </View>
            </View>

            <Text style={styles.qText}>
              {formatQText(q.question_text || q.text || q.question)}
            </Text>

            <View style={styles.optionsWrap}>
              {options.map((opt) => {
                const isThisCorrect = opt.key === correctOpt;
                const isThisSelected = opt.key === selectedOpt;

                let bg = COLORS.surface;
                let borderColor = COLORS.border;
                if (isThisCorrect) {
                  bg = COLORS.successSoft;
                  borderColor = COLORS.success;
                } else if (isThisSelected && !isCorrect) {
                  bg = COLORS.dangerSoft;
                  borderColor = COLORS.danger;
                }

                return (
                  <View
                    key={opt.key}
                    style={[styles.reviewOption, { backgroundColor: bg, borderColor }]}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.optKey, isThisCorrect && { color: COLORS.success }]}>
                        ({opt.key})
                      </Text>
                      <Text style={styles.optText}>{opt.text}</Text>
                    </View>
                    {isThisCorrect && (
                      <Text style={[styles.optTag, { color: COLORS.success }]}>✓ Correct</Text>
                    )}
                    {isThisSelected && !isThisCorrect && (
                      <Text style={[styles.optTag, { color: COLORS.danger }]}>✗ Your Choice</Text>
                    )}
                  </View>
                );
              })}
            </View>

            {q.explanation ? (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>💡 Explanation</Text>
                <Text style={styles.explanationText}>{q.explanation}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 2,
  },
  langBtn: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  langBtnActive: { backgroundColor: COLORS.primary },
  langText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  langTextActive: { color: '#FFFFFF' },
  heroCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  heroTag: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  heroCourse: { color: '#94A3B8', fontSize: 13, marginBottom: 14 },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreBig: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  scoreMax: { color: '#94A3B8', fontSize: 18 },
  scoreLabel: { color: '#CBD5E1', fontSize: 12.5, marginTop: 2 },
  accBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  accValue: { color: '#FCD34D', fontSize: 20, fontWeight: '800' },
  accLabel: { color: '#E2E8F0', fontSize: 11 },
  metaStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },
  metaStripText: { color: '#94A3B8', fontSize: 11.5 },
  countsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  countBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  countVal: { fontSize: 22, fontWeight: '800' },
  countLbl: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  subjRow: { marginBottom: 12 },
  subjTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  subjName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  subjStats: { fontSize: 12, color: COLORS.muted },
  progressTrack: {
    height: 7,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: 7, backgroundColor: COLORS.primary, borderRadius: 999 },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewHeading: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  translatingPill: {
    backgroundColor: COLORS.warningSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  translatingText: { color: COLORS.warning, fontSize: 11, fontWeight: '600' },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  filterChipTextActive: { color: '#FFFFFF' },
  questionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  qIndex: { fontSize: 12.5, fontWeight: '700', color: COLORS.muted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  qText: { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 22, marginBottom: 12 },
  optionsWrap: { gap: 6, marginBottom: 10 },
  reviewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  optKey: { fontSize: 13, fontWeight: '800', marginRight: 8, color: COLORS.muted },
  optText: { fontSize: 13.5, color: COLORS.text, flex: 1 },
  optTag: { fontSize: 11.5, fontWeight: '800', marginLeft: 8 },
  explanationBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  explanationTitle: { fontSize: 12.5, fontWeight: '800', color: COLORS.primary, marginBottom: 3 },
  explanationText: { fontSize: 13, color: '#312E81', lineHeight: 18 },
  errorBox: { backgroundColor: COLORS.dangerSoft, padding: 12, borderRadius: 10 },
});
