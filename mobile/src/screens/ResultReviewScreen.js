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

export default function ResultReviewScreen({ attemptId, onBack }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'correct' | 'wrong' | 'unattempted'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    mobileApi
      .attemptResult(attemptId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [attemptId]);

  const filteredQuestions = useMemo(() => {
    if (!data?.questions) return [];
    return data.questions.filter((q) => {
      if (filter === 'correct') return q.selected_option && q.is_correct === 1;
      if (filter === 'wrong') return q.selected_option && q.is_correct === 0;
      if (filter === 'unattempted') return !q.selected_option;
      return true;
    });
  }, [data, filter]);

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

  const { attempt, test, subjectBreakdown, questions } = data;
  const pct =
    attempt.max_score > 0
      ? Math.max(0, ((attempt.score / attempt.max_score) * 100).toFixed(1))
      : '0.0';
  const positiveEarned = Number((attempt.correct_count * Number(test.marks_correct)).toFixed(2));
  const negativeDeducted = Number((attempt.wrong_count * Number(test.negative_marks)).toFixed(2));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

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

      {/* Question & Answer Review */}
      <Text style={styles.reviewHeading}>Question & Answer Review</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: `All (${questions.length})` },
            { id: 'correct', label: `Correct (${attempt.correct_count})` },
            { id: 'wrong', label: `Wrong (${attempt.wrong_count})` },
            { id: 'unattempted', label: `Skipped (${attempt.unattempted_count})` },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterPill, filter === tab.id && styles.filterPillActive]}
              onPress={() => setFilter(tab.id)}
            >
              <Text style={[styles.filterText, filter === tab.id && styles.filterTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {filteredQuestions.map((q) => {
        const isCorrect = q.selected_option && q.is_correct === 1;
        const isWrong = q.selected_option && q.is_correct === 0;
        const options = [
          { key: 'A', text: q.option_a },
          { key: 'B', text: q.option_b },
          { key: 'C', text: q.option_c },
          { key: 'D', text: q.option_d },
        ];

        return (
          <View key={q.id} style={styles.qCard}>
            <View style={styles.qTop}>
              <Text style={styles.qNum}>
                Q{q.order_index} · {q.subject}
              </Text>
              <View
                style={[
                  styles.qResultBadge,
                  {
                    backgroundColor: isCorrect
                      ? COLORS.successSoft
                      : isWrong
                      ? COLORS.dangerSoft
                      : COLORS.warningSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.qResultText,
                    {
                      color: isCorrect
                        ? COLORS.success
                        : isWrong
                        ? COLORS.danger
                        : COLORS.warning,
                    },
                  ]}
                >
                  {isCorrect
                    ? `Correct (+${q.marks_awarded})`
                    : isWrong
                    ? `Wrong (${q.marks_awarded})`
                    : 'Unattempted (0)'}
                </Text>
              </View>
            </View>

            <Text style={styles.qText}>{q.question_text}</Text>

            {options.map((opt) => {
              const isAns = opt.key === q.correct_option;
              const isSel = opt.key === q.selected_option;
              let borderColor = COLORS.border;
              let bg = COLORS.surfaceAlt;
              if (isAns) {
                borderColor = COLORS.success;
                bg = COLORS.successSoft;
              } else if (isSel && !isAns) {
                borderColor = COLORS.danger;
                bg = COLORS.dangerSoft;
              }

              return (
                <View key={opt.key} style={[styles.optRow, { borderColor, backgroundColor: bg }]}>
                  <Text style={styles.optKey}>{opt.key}.</Text>
                  <Text style={styles.optText}>{opt.text}</Text>
                  {isAns && <Text style={styles.optTagGood}>Correct</Text>}
                  {isSel && !isAns && <Text style={styles.optTagBad}>Your Choice</Text>}
                  {isSel && isAns && <Text style={styles.optTagGood}>Your Choice ✓</Text>}
                </View>
              );
            })}

            {q.explanation ? (
              <View style={styles.expBox}>
                <Text style={styles.expTitle}>Explanation</Text>
                <Text style={styles.expText}>{q.explanation}</Text>
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
  content: { padding: 16, paddingBottom: 32 },
  backBtn: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  errorBox: { backgroundColor: COLORS.dangerSoft, padding: 12, borderRadius: 10 },
  heroCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  heroTag: { color: '#A5B4FC', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  heroTitle: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 4 },
  heroCourse: { color: '#94A3B8', fontSize: 13, marginTop: 2, marginBottom: 14 },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreBig: { color: '#fff', fontSize: 30, fontWeight: '800' },
  scoreMax: { color: '#94A3B8', fontSize: 18, fontWeight: '600' },
  scoreLabel: { color: '#CBD5E1', fontSize: 12.5, marginTop: 2 },
  accBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  accValue: { color: '#34D399', fontSize: 20, fontWeight: '800' },
  accLabel: { color: '#CBD5E1', fontSize: 11 },
  metaStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 10,
  },
  metaStripText: { color: '#CBD5E1', fontSize: 12 },
  countsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  countBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  countVal: { fontSize: 20, fontWeight: '800' },
  countLbl: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  subjRow: { marginBottom: 10 },
  subjTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  subjName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  subjStats: { fontSize: 12, color: COLORS.muted },
  progressTrack: {
    height: 7,
    backgroundColor: COLORS.bg,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: 7, backgroundColor: COLORS.primary, borderRadius: 999 },
  reviewHeading: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12.5, fontWeight: '700', color: COLORS.text },
  filterTextActive: { color: '#fff' },
  qCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  qNum: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  qResultBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  qResultText: { fontSize: 11.5, fontWeight: '700' },
  qText: { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 22, marginBottom: 10 },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 7,
    gap: 8,
  },
  optKey: { fontWeight: '700', fontSize: 13, color: COLORS.text },
  optText: { flex: 1, fontSize: 13.5, color: COLORS.text },
  optTagGood: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  optTagBad: { fontSize: 11, fontWeight: '700', color: COLORS.danger },
  expBox: {
    marginTop: 6,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 10,
    padding: 10,
  },
  expTitle: { fontSize: 11.5, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  expText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
});
