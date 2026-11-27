import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS } from './src/theme';
import { hydrateClientConfig, mobileApi, setAuthToken } from './src/api';
import LandingScreen from './src/screens/LandingScreen';
import AuthScreen from './src/screens/AuthScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import CourseTestsScreen from './src/screens/CourseTestsScreen';
import ExamScreen from './src/screens/ExamScreen';
import ResultReviewScreen from './src/screens/ResultReviewScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [tab, setTab] = useState('courses'); // 'courses' | 'dashboard' | 'profile'
  const [activeCourse, setActiveCourse] = useState(null);
  const [examSession, setExamSession] = useState(null);
  const [reviewAttemptId, setReviewAttemptId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { token } = await hydrateClientConfig();
        if (token) {
          const res = await mobileApi.me();
          if (res.user?.role === 'student') {
            setUser(res.user);
          } else {
            await setAuthToken('');
          }
        }
      } catch {
        await setAuthToken('');
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  async function handleLogout() {
    await setAuthToken('');
    setUser(null);
    setShowAuth(false);
    setActiveCourse(null);
    setExamSession(null);
    setReviewAttemptId(null);
    setTab('courses');
  }

  const topPad = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  if (booting) {
    return (
      <SafeAreaView style={[styles.safe, styles.center, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    if (!showAuth) {
      return (
        <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.navy, paddingTop: topPad }]}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
          <LandingScreen
            onOpenAuth={(mode = 'login') => {
              setAuthMode(mode);
              setShowAuth(true);
            }}
          />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.navy, paddingTop: topPad }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
        <AuthScreen
          initialMode={authMode}
          onAuthenticated={setUser}
          onBack={() => setShowAuth(false)}
        />
      </SafeAreaView>
    );
  }

  // Full-screen timed exam mode
  if (examSession) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.navy, paddingTop: topPad }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
        <ExamScreen
          session={examSession}
          onSubmitted={(attemptId) => {
            setExamSession(null);
            setReviewAttemptId(attemptId);
          }}
          onExit={() => setExamSession(null)}
        />
      </SafeAreaView>
    );
  }

  // Detailed result & Q&A review screen
  if (reviewAttemptId) {
    return (
      <SafeAreaView style={[styles.safe, { paddingTop: topPad }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
        <ResultReviewScreen
          attemptId={reviewAttemptId}
          onBack={() => setReviewAttemptId(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topPad }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.mainBody}>
        {tab === 'courses' && !activeCourse && (
          <CoursesScreen user={user} onOpenCourse={setActiveCourse} />
        )}
        {tab === 'courses' && activeCourse && (
          <CourseTestsScreen
            course={activeCourse}
            onBack={() => setActiveCourse(null)}
            onStartTest={(session) => setExamSession(session)}
            onReviewAttempt={(attemptId) => setReviewAttemptId(attemptId)}
          />
        )}
        {tab === 'dashboard' && (
          <DashboardScreen onReviewAttempt={(attemptId) => setReviewAttemptId(attemptId)} />
        )}
        {tab === 'profile' && <ProfileScreen user={user} onLogout={handleLogout} />}
      </View>

      {/* Bottom Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setTab('courses');
            setActiveCourse(null);
          }}
        >
          <Text style={[styles.tabIcon, tab === 'courses' && styles.tabActive]}>📚</Text>
          <Text style={[styles.tabLabel, tab === 'courses' && styles.tabActive]}>Courses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setTab('dashboard');
            setActiveCourse(null);
          }}
        >
          <Text style={[styles.tabIcon, tab === 'dashboard' && styles.tabActive]}>📊</Text>
          <Text style={[styles.tabLabel, tab === 'dashboard' && styles.tabActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setTab('profile');
            setActiveCourse(null);
          }}
        >
          <Text style={[styles.tabIcon, tab === 'profile' && styles.tabActive]}>👤</Text>
          <Text style={[styles.tabLabel, tab === 'profile' && styles.tabActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  mainBody: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  tabIcon: { fontSize: 18, opacity: 0.6 },
  tabLabel: { fontSize: 11.5, fontWeight: '600', color: COLORS.muted, marginTop: 2 },
  tabActive: { color: COLORS.primary, opacity: 1, fontWeight: '800' },
});
