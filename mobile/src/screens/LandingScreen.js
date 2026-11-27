import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../theme';

export default function LandingScreen({ onOpenAuth }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Top Navbar */}
      <View style={styles.navBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandBolt}>⚡</Text>
          <Text style={styles.brandText}>
            Exam<Text style={{ color: '#818CF8' }}>Pulse</Text>
          </Text>
        </View>

        <View style={styles.navActions}>
          <TouchableOpacity
            style={styles.navLoginBtn}
            onPress={() => onOpenAuth('login')}
          >
            <Text style={styles.navLoginText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navRegisterBtn}
            onPress={() => onOpenAuth('register')}
          >
            <Text style={styles.navRegisterText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroPill}>
          <Text style={styles.heroPillText}>🚀 Real CBT Exam • English & हिन्दी</Text>
        </View>

        <Text style={styles.heroTitle}>
          Practice Smarter.{'\n'}
          <Text style={styles.heroTitleHighlight}>Crack Your Exam</Text> with Confidence.
        </Text>

        <Text style={styles.heroSubtitle}>
          ExamPulse gives you an authentic SSC & competitive CBT mock test portal — complete
          with sectional navigation, bilingual English ↔ हिन्दी toggle, and instant solutions.
        </Text>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => onOpenAuth('register')}
          >
            <Text style={styles.primaryCtaText}>Start Free Mock Test →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryCta}
            onPress={() => onOpenAuth('login')}
          >
            <Text style={styles.secondaryCtaText}>Student Login</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Quick Stats */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statBold}>100%</Text>
            <Text style={styles.statLabel}>Real CBT</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statBold}>EN / हिं</Text>
            <Text style={styles.statLabel}>Bilingual</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statBold}>Instant</Text>
            <Text style={styles.statLabel}>Solutions</Text>
          </View>
        </View>
      </View>

      {/* Interactive-Style CBT Preview Card */}
      <View style={styles.previewCard}>
        <View style={styles.previewTopBar}>
          <View style={styles.previewDots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.previewTitle}>ExamPulse CBT • Live</Text>
          <Text style={styles.previewTimer}>⏱ 54:18</Text>
        </View>

        <View style={styles.previewSectionPill}>
          <Text style={styles.previewSecText}>📑 Section: Quantitative Aptitude</Text>
          <Text style={styles.previewBadge}>14/25 ▾</Text>
        </View>

        <View style={styles.previewQBox}>
          <View style={styles.previewQMeta}>
            <Text style={styles.previewQNum}>Question 15 of 100</Text>
            <Text style={styles.previewLangBadge}>English | हिन्दी</Text>
          </View>
          <Text style={styles.previewQText}>
            If a train travels at 72 km/h, how much distance will it cover in 25 minutes?
          </Text>

          <View style={styles.previewOptionsGrid}>
            <View style={styles.previewOpt}>
              <Text style={styles.previewOptText}>(A) 25 km</Text>
            </View>
            <View style={[styles.previewOpt, styles.previewOptSelected]}>
              <Text style={[styles.previewOptText, { color: '#fff', fontWeight: '800' }]}>
                (B) 30 km ✓
              </Text>
            </View>
            <View style={styles.previewOpt}>
              <Text style={styles.previewOptText}>(C) 35 km</Text>
            </View>
            <View style={styles.previewOpt}>
              <Text style={styles.previewOptText}>(D) 40 km</Text>
            </View>
          </View>
        </View>

        <View style={styles.previewFooter}>
          <View style={styles.previewMarkBtn}>
            <Text style={styles.previewMarkText}>🟣 Mark & Next</Text>
          </View>
          <View style={styles.previewSaveBtn}>
            <Text style={styles.previewSaveText}>Save & Next →</Text>
          </View>
        </View>
      </View>

      {/* Features List */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeader}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>WHY EXAMPULSE</Text>
          </View>
          <Text style={styles.sectionTitle}>Built Like the Real Exam Portal</Text>
          <Text style={styles.sectionSubtitle}>
            Every tool you need to manage time, reduce negative marking, and boost accuracy.
          </Text>
        </View>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🖥️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Authentic CBT Interface</Text>
              <Text style={styles.featureDesc}>
                Sectional dropdown switcher, live countdown timer, and Mark for Review just like SSC portals.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🌐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>English ↔ हिन्दी Toggle</Text>
              <Text style={styles.featureDesc}>
                Switch question and options between English and Hindi with a single tap during the exam.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Smart Question Palette</Text>
              <Text style={styles.featureDesc}>
                Filter questions by Answered, Marked for Review, or Unanswered to jump directly.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Instant Score & Solutions</Text>
              <Text style={styles.featureDesc}>
                Get your accuracy, marks, and question-by-question explanations right after submission.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 4 Continuous Subject Blocks */}
      <View style={styles.sectionWrapAlt}>
        <View style={styles.sectionHeader}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>STRUCTURED SECTIONS</Text>
          </View>
          <Text style={styles.sectionTitle}>Continuous Subject Practice</Text>
        </View>

        <View style={styles.subjectsGrid}>
          <View style={styles.subjectCard}>
            <Text style={styles.subjNum}>01</Text>
            <Text style={styles.subjName}>Quantitative Aptitude</Text>
            <Text style={styles.subjDesc}>Arithmetic, Algebra, Geometry & Data Interpretation.</Text>
            <Text style={styles.subjRange}>Q1 – Q25</Text>
          </View>

          <View style={styles.subjectCard}>
            <Text style={styles.subjNum}>02</Text>
            <Text style={styles.subjName}>Logical Reasoning</Text>
            <Text style={styles.subjDesc}>Analogy, Coding-Decoding, Syllogism & Puzzles.</Text>
            <Text style={styles.subjRange}>Q26 – Q50</Text>
          </View>

          <View style={styles.subjectCard}>
            <Text style={styles.subjNum}>03</Text>
            <Text style={styles.subjName}>Verbal Ability</Text>
            <Text style={styles.subjDesc}>Grammar, Comprehension, Synonyms & Antonyms.</Text>
            <Text style={styles.subjRange}>Q51 – Q75</Text>
          </View>

          <View style={styles.subjectCard}>
            <Text style={styles.subjNum}>04</Text>
            <Text style={styles.subjName}>General Science</Text>
            <Text style={styles.subjDesc}>Physics, Chemistry, Biology & Everyday Science.</Text>
            <Text style={styles.subjRange}>Q76 – Q100</Text>
          </View>
        </View>
      </View>

      {/* Bottom CTA Card */}
      <View style={styles.ctaCard}>
        <Text style={styles.ctaCardTitle}>Ready to Boost Your Exam Score?</Text>
        <Text style={styles.ctaCardSub}>
          Join ExamPulse today and practice on real timed CBT tests.
        </Text>
        <TouchableOpacity
          style={styles.ctaCardBtn}
          onPress={() => onOpenAuth('register')}
        >
          <Text style={styles.ctaCardBtnText}>Create Free Account →</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>⚡ ExamPulse Student App</Text>
        <Text style={styles.footerSub}>Practice. Track. Excel.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navy },
  content: { paddingBottom: 32 },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandBolt: { fontSize: 20 },
  brandText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLoginBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  navLoginText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  navRegisterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  navRegisterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  heroSection: { padding: 20, paddingTop: 24 },
  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(129,140,248,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.35)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  heroPillText: { color: '#C7D2FE', fontSize: 11.5, fontWeight: '700' },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 36,
    marginBottom: 12,
  },
  heroTitleHighlight: { color: '#818CF8' },
  heroSubtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 21,
    marginBottom: 20,
  },
  ctaRow: { flexDirection: 'column', gap: 10, marginBottom: 24 },
  primaryCta: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryCtaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryCta: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryCtaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 16,
  },
  statItem: { alignItems: 'center' },
  statBold: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },
  previewCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    marginHorizontal: 18,
    padding: 14,
    marginBottom: 28,
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 10,
    marginBottom: 12,
  },
  previewDots: { flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  previewTitle: { color: '#94A3B8', fontSize: 11.5, fontWeight: '700' },
  previewTimer: {
    color: '#FCD34D',
    fontSize: 11.5,
    fontWeight: '800',
    backgroundColor: 'rgba(252,211,77,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  previewSectionPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  previewSecText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },
  previewBadge: {
    color: '#C7D2FE',
    fontSize: 10.5,
    fontWeight: '800',
    backgroundColor: 'rgba(79,70,229,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  previewQBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  previewQMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewQNum: { color: '#94A3B8', fontSize: 11 },
  previewLangBadge: {
    color: '#C7D2FE',
    fontSize: 10.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewQText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '600', lineHeight: 19, marginBottom: 10 },
  previewOptionsGrid: { gap: 6 },
  previewOpt: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  previewOptSelected: {
    backgroundColor: 'rgba(79,70,229,0.4)',
    borderColor: '#818CF8',
  },
  previewOptText: { color: '#E2E8F0', fontSize: 12 },
  previewFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  previewMarkBtn: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  previewMarkText: { color: '#DDD6FE', fontSize: 11, fontWeight: '700' },
  previewSaveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewSaveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  sectionWrap: {
    backgroundColor: COLORS.surface,
    padding: 20,
    paddingVertical: 28,
  },
  sectionWrapAlt: {
    backgroundColor: COLORS.bg,
    padding: 20,
    paddingVertical: 28,
  },
  sectionHeader: { marginBottom: 18 },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  tagText: { color: COLORS.primary, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.navy, marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  featuresList: { gap: 14 },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  featureIcon: { fontSize: 24 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: COLORS.navy, marginBottom: 3 },
  featureDesc: { fontSize: 12.5, color: COLORS.muted, lineHeight: 18 },
  subjectsGrid: { gap: 10 },
  subjectCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subjNum: { fontSize: 11.5, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  subjName: { fontSize: 15, fontWeight: '700', color: COLORS.navy, marginBottom: 4 },
  subjDesc: { fontSize: 12.5, color: COLORS.muted, lineHeight: 17, marginBottom: 8 },
  subjRange: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primary,
    fontSize: 10.5,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ctaCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    margin: 18,
    padding: 20,
    alignItems: 'center',
  },
  ctaCardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  ctaCardSub: { color: '#E0E7FF', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  ctaCardBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaCardBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  footer: { alignItems: 'center', paddingVertical: 20 },
  footerBrand: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  footerSub: { color: '#64748B', fontSize: 11.5, marginTop: 2 },
});
