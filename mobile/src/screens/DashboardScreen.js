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

export default function DashboardScreen({ onReviewAttempt }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await mobileApi.dashboard();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const summary = data?.summary || {};
  const subjects = data?.subjectBreakdown || [];
  const trend = data?.scoreTrend || [];
  const attempts = data?.recentAttempts || [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />
      }
    >
      <Text style={styles.heading}>Performance Dashboard</Text>
      <Text style={styles.subheading}>
        Analyze accuracy, subject mastery, marks, and review past tests
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={{ color: COLORS.danger }}>{error}</Text>
        </View>
      ) : null}

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Tests Taken</Text>
          <Text style={styles.kpiValue}>{summary.totalTestsTaken || 0}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Avg Score</Text>
          <Text style={[styles.kpiValue, { color: COLORS.primary }]}>
            {summary.averageScorePercent || 0}%
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Accuracy</Text>
          <Text style={[styles.kpiValue, { color: COLORS.success }]}>
            {summary.averageAccuracy || 0}%
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Best Score</Text>
          <Text style={styles.kpiValue}>{summary.bestScorePercent || 0}%</Text>
        </View>
      </View>

      {/* Overall Question Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Question Attempt Summary</Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statNum}>{summary.totalAttempted || 0}</Text>
            <Text style={styles.statLbl}>Attempted</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: COLORS.successSoft }]}>
            <Text style={[styles.statNum, { color: COLORS.success }]}>
              {summary.totalCorrect || 0}
            </Text>
            <Text style={styles.statLbl}>Correct</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: COLORS.dangerSoft }]}>
            <Text style={[styles.statNum, { color: COLORS.danger }]}>
              {summary.totalWrong || 0}
            </Text>
            <Text style={styles.statLbl}>Wrong</Text>
          </View>
        </View>
      </View>

      {/* Score Trend */}
      {trend.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Score Trend (%)</Text>
          <View style={styles.chartRow}>
            {trend.map((pt) => (
              <View key={pt.attemptId} style={styles.barCol}>
                <Text style={styles.barVal}>{pt.scorePercent}%</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max(8, Math.min(100, pt.scorePercent))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLbl} numberOfLines={1}>
                  {pt.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Subject Breakdown */}
      {subjects.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subject-wise Accuracy</Text>
          {subjects.map((s) => (
            <View key={s.subject} style={{ marginBottom: 11 }}>
              <View style={styles.subjHeader}>
                <Text style={styles.subjName}>{s.subject}</Text>
                <Text style={styles.subjMeta}>
                  {s.correct}/{s.attempted} correct · {s.accuracy}%
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.min(100, Math.max(4, s.accuracy))}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Attempt History */}
      <Text style={styles.sectionHeading}>Completed Tests (Tap to Review Q&A)</Text>
      {attempts.length === 0 ? (
        <View style={styles.card}>
          <Text style={{ color: COLORS.muted, fontSize: 13.5 }}>
            Take your first timed test from the Courses tab to unlock analytics!
          </Text>
        </View>
      ) : (
        attempts.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={styles.attemptCard}
            onPress={() => onReviewAttempt(a.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.attemptTitle}>{a.test_title}</Text>
              <Text style={styles.attemptSub}>{a.course_title}</Text>
              <Text style={styles.attemptMeta}>
                {a.correct_count}✓ · {a.wrong_count}✗ · {a.unattempted_count} skipped ·{' '}
                {a.accuracy}% accuracy
              </Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeVal}>
                {a.score}/{a.max_score}
              </Text>
              <Text style={styles.scoreBadgeLink}>Review →</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subheading: { fontSize: 13.5, color: COLORS.muted, marginTop: 2, marginBottom: 16 },
  errorBox: { backgroundColor: COLORS.dangerSoft, padding: 12, borderRadius: 10, marginBottom: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  kpiValue: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statPill: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statNum: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLbl: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 140, paddingTop: 10 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barVal: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  barTrack: {
    width: 24,
    height: 85,
    backgroundColor: COLORS.bg,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  barLbl: { fontSize: 10.5, color: COLORS.muted, marginTop: 5 },
  subjHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  subjName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  subjMeta: { fontSize: 12, color: COLORS.muted },
  track: { height: 7, backgroundColor: COLORS.bg, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 7, backgroundColor: COLORS.success, borderRadius: 999 },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  attemptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  attemptTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  attemptSub: { fontSize: 12.5, color: COLORS.primary, marginTop: 2 },
  attemptMeta: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  scoreBadge: { alignItems: 'flex-end' },
  scoreBadgeVal: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  scoreBadgeLink: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginTop: 3 },
});
