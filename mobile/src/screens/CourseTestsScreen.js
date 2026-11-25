import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS } from '../theme';
import { mobileApi } from '../api';

export default function CourseTestsScreen({
  course,
  onBack,
  onStartTest,
  onReviewAttempt,
}) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [error, setError] = useState('');

  const loadTests = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const res = await mobileApi.courseTests(course.id);
        setTests(res.tests || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [course.id]
  );

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  async function handleStart(test) {
    setStartingId(test.id);
    setError('');
    try {
      const session = await mobileApi.startAttempt(test.id);
      onStartTest(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setStartingId(null);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTests(true)} />}
    >
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>← Back to Courses</Text>
      </TouchableOpacity>

      <View style={styles.courseHeader}>
        <Text style={styles.courseCategory}>{course.category}</Text>
        <Text style={styles.courseTitle}>{course.title}</Text>
        {course.description ? <Text style={styles.courseDesc}>{course.description}</Text> : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
      ) : tests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Tests Published Yet</Text>
          <Text style={styles.emptySub}>Check back soon for new test papers.</Text>
        </View>
      ) : (
        tests.map((t) => {
          const latest = t.latest_attempt;
          const isInProgress = latest?.status === 'in_progress';
          const hasSubmitted = latest && latest.status !== 'in_progress';
          const canStart = t.question_count > 0 && (t.allow_multiple_attempts || !hasSubmitted || isInProgress);

          return (
            <View key={t.id} style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.pillIndigo}>
                  <Text style={styles.pillIndigoText}>
                    {t.question_count} Qs · {t.duration_minutes} Min
                  </Text>
                </View>
                <View style={styles.pillNeutral}>
                  <Text style={styles.pillNeutralText}>
                    +{t.marks_correct} / -{t.negative_marks}
                  </Text>
                </View>
              </View>

              <Text style={styles.testTitle}>{t.title}</Text>
              {t.description ? <Text style={styles.testDesc}>{t.description}</Text> : null}

              {t.best_attempt ? (
                <View style={styles.scoreStrip}>
                  <Text style={styles.scoreStripText}>
                    Best Score: {t.best_attempt.score} / {t.best_attempt.max_score} (
                    {t.best_attempt.accuracy}% accuracy)
                  </Text>
                </View>
              ) : null}

              <View style={styles.btnRow}>
                {canStart ? (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1 }]}
                    onPress={() => handleStart(t)}
                    disabled={startingId === t.id}
                  >
                    <Text style={styles.primaryBtnText}>
                      {startingId === t.id
                        ? 'Loading Exam...'
                        : isInProgress
                        ? 'Resume Timed Test'
                        : hasSubmitted
                        ? 'Retake Test'
                        : 'Start Timed Test'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.disabledPill}>
                    <Text style={styles.disabledText}>
                      {t.question_count === 0 ? 'Questions Pending' : 'Attempt Completed'}
                    </Text>
                  </View>
                )}

                {hasSubmitted && (
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => onReviewAttempt(latest.id)}
                  >
                    <Text style={styles.reviewBtnText}>View Q&A</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 30 },
  backBtn: { marginBottom: 12, alignSelf: 'flex-start' },
  backBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  courseHeader: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  courseCategory: { fontSize: 11.5, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  courseTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  courseDesc: { fontSize: 13.5, color: COLORS.muted, lineHeight: 19 },
  errorBox: { backgroundColor: COLORS.dangerSoft, padding: 12, borderRadius: 10, marginBottom: 12 },
  errorText: { color: COLORS.danger, fontSize: 13 },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  emptySub: { fontSize: 13, color: COLORS.muted },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  pillIndigo: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillIndigoText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  pillNeutral: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillNeutralText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  testTitle: { fontSize: 16.5, fontWeight: '700', color: COLORS.text, marginBottom: 5 },
  testDesc: { fontSize: 13, color: COLORS.muted, lineHeight: 18, marginBottom: 10 },
  scoreStrip: {
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 12,
  },
  scoreStripText: { color: COLORS.success, fontSize: 12.5, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  reviewBtn: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  reviewBtnText: { color: COLORS.primary, fontSize: 13.5, fontWeight: '700' },
  disabledPill: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabledText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
});
