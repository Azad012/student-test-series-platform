import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../theme';
import { mobileApi } from '../api';

export default function CoursesScreen({ user, onOpenCourse }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrollingId, setEnrollingId] = useState(null);
  const [error, setError] = useState('');

  const loadCourses = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await mobileApi.courses();
      setCourses(res.courses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  async function handleEnroll(course) {
    setEnrollingId(course.id);
    setError('');
    try {
      await mobileApi.enrollCourse(course.id);
      await loadCourses(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnrollingId(null);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCourses(true)} />}
    >
      <View style={styles.headerBanner}>
        <Text style={styles.greeting}>Welcome back, {user.name.split(' ')[0]}</Text>
        <Text style={styles.subGreeting}>
          Choose a test series course to start timed mock exams.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : courses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Courses Available Yet</Text>
          <Text style={styles.emptySub}>
            Ask your admin to publish or assign a test series course to your account.
          </Text>
        </View>
      ) : (
        courses.map((course) => {
          const enrolled = Boolean(course.is_enrolled);
          return (
            <View key={course.id} style={styles.card}>
              <View style={styles.badgeRow}>
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{course.category || 'General'}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: enrolled ? COLORS.successSoft : COLORS.warningSoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: enrolled ? COLORS.success : COLORS.warning },
                    ]}
                  >
                    {enrolled ? 'Enrolled' : 'Open to Enroll'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{course.title}</Text>
              <Text style={styles.cardDesc}>
                {course.description || 'Structured timed test series with instant evaluation.'}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.metaText}>{course.test_count} Test Series</Text>
                {enrolled ? (
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => onOpenCourse(course)}
                  >
                    <Text style={styles.openBtnText}>View Tests →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.enrollBtn}
                    onPress={() => handleEnroll(course)}
                    disabled={enrollingId === course.id}
                  >
                    <Text style={styles.enrollBtnText}>
                      {enrollingId === course.id ? 'Enrolling...' : 'Enroll Free'}
                    </Text>
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
  content: { padding: 16, paddingBottom: 28 },
  headerBanner: {
    backgroundColor: COLORS.navy,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  greeting: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  subGreeting: { color: '#CBD5E1', fontSize: 13.5 },
  errorBox: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: COLORS.danger, fontSize: 13 },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptySub: { fontSize: 13.5, color: COLORS.muted, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  catBadge: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  catBadgeText: { color: COLORS.primary, fontSize: 11.5, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusBadgeText: { fontSize: 11.5, fontWeight: '700' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  cardDesc: { fontSize: 13.5, color: COLORS.muted, lineHeight: 19, marginBottom: 14 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  metaText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  openBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  openBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  enrollBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  enrollBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
