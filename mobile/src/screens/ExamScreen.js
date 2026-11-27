import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { COLORS, formatDurationClock } from '../theme';
import { mobileApi } from '../api';
import { translateQuestionToHindi, isNonTranslatableSubject } from '../translator';

function formatQText(text) {
  if (!text) return '';
  return String(text).replace(/^Q\d+\.\s*/i, '');
}

export default function ExamScreen({ session, onSubmitted, onExit }) {
  const { attempt, test, savedAnswers, remainingSeconds: initialSeconds } = session;

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

  // Continuously sort questions by subject: 1-25 Quant, 26-50 Reasoning, 51-75 Verbal, 76-100 Science
  const questions = useMemo(() => {
    const raw = session.questions || [];
    return [...raw].sort((a, b) => {
      const sA = (a.subject || 'General').toLowerCase().trim();
      const sB = (b.subject || 'General').toLowerCase().trim();
      const rankA = orderRank[sA] || 99;
      const rankB = orderRank[sB] || 99;
      if (rankA !== rankB) return rankA - rankB;
      if (sA !== sB) return sA.localeCompare(sB);
      return (a.order_index ?? a.id ?? 0) - (b.order_index ?? b.id ?? 0);
    });
  }, [session.questions, orderRank]);

  const total = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lang, setLang] = useState('en'); // 'en' | 'hi'
  const [translatedMap, setTranslatedMap] = useState({});
  const [translating, setTranslating] = useState(false);

  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds || 3600);
  const [answersMap, setAnswersMap] = useState(() => {
    const map = {};
    for (const q of questions) {
      map[q.id] = {
        selectedOption: null,
        isMarkedForReview: false,
        isVisited: false,
      };
    }
    for (const sa of savedAnswers || []) {
      map[sa.question_id] = {
        selectedOption: sa.selected_option || null,
        isMarkedForReview: Boolean(sa.is_marked_for_review),
        isVisited: Boolean(sa.is_visited),
      };
    }
    if (questions[0]) {
      map[questions[0].id] = { ...map[questions[0].id], isVisited: true };
    }
    return map;
  });

  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [paletteScope, setPaletteScope] = useState('section'); // 'section' | 'all'
  const [paletteFilter, setPaletteFilter] = useState('all'); // 'all' | 'answered' | 'marked' | 'unanswered'
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const answersRef = useRef(answersMap);
  answersRef.current = answersMap;
  const submittedOnceRef = useRef(false);

  // Group unique sections
  const sections = useMemo(() => {
    const map = new Map();
    questions.forEach((qn, index) => {
      const subj = qn.subject || 'General';
      if (!map.has(subj)) {
        map.set(subj, { name: subj, startIndex: index, questionIndices: [] });
      }
      map.get(subj).questionIndices.push(index);
    });
    return Array.from(map.values());
  }, [questions]);

  const rawQ = questions[currentIndex];
  const activeSectionName = rawQ?.subject || 'General';

  // Handle translation when language is switched to Hindi
  useEffect(() => {
    if (lang === 'hi' && rawQ && !translatedMap[rawQ.id] && !isNonTranslatableSubject(rawQ.subject)) {
      setTranslating(true);
      translateQuestionToHindi(rawQ)
        .then((tQ) => setTranslatedMap((m) => ({ ...m, [rawQ.id]: tQ })))
        .finally(() => setTranslating(false));
    }
  }, [lang, rawQ?.id, rawQ?.subject]);

  const currentQuestion = (lang === 'hi' && translatedMap[rawQ?.id]) ? translatedMap[rawQ.id] : rawQ;
  const currentState = answersMap[rawQ?.id] || {
    selectedOption: null,
    isMarkedForReview: false,
    isVisited: true,
  };

  async function persistAnswer(questionId, nextState) {
    try {
      await mobileApi.saveAnswer(attempt.id, {
        questionId,
        selectedOption: nextState.selectedOption,
        isMarkedForReview: nextState.isMarkedForReview,
        isVisited: true,
      });
    } catch (err) {
      if (err.message && err.message.includes('auto-submitted')) {
        handleSubmit(true);
      }
    }
  }

  async function handleSubmit(autoSubmitted = false) {
    if (submittedOnceRef.current) return;
    submittedOnceRef.current = true;
    setSubmitting(true);
    setConfirmVisible(false);
    setPaletteVisible(false);
    setError('');

    try {
      const batch = Object.entries(answersRef.current).map(([qId, st]) => ({
        questionId: Number(qId),
        selectedOption: st.selectedOption,
        isMarkedForReview: st.isMarkedForReview,
        isVisited: st.isVisited,
      }));
      await mobileApi.submitAttempt(attempt.id, { autoSubmitted, answers: batch });
      onSubmitted(attempt.id);
    } catch (err) {
      submittedOnceRef.current = false;
      setError(err.message);
      setSubmitting(false);
    }
  }

  // Countdown timer synced with server expires_at
  useEffect(() => {
    const expiresMs = new Date(attempt.expires_at).getTime();
    const timer = setInterval(() => {
      const left = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left <= 0) {
        clearInterval(timer);
        handleSubmit(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt.expires_at]);

  function goToQuestion(idx) {
    if (idx < 0 || idx >= total) return;
    const targetQ = questions[idx];
    setAnswersMap((prev) => ({
      ...prev,
      [targetQ.id]: { ...prev[targetQ.id], isVisited: true },
    }));
    setCurrentIndex(idx);
    setPaletteVisible(false);
  }

  function selectOption(optKey) {
    const qId = rawQ.id;
    const isSame = currentState.selectedOption === optKey;
    const nextState = {
      ...answersMap[qId],
      selectedOption: isSame ? null : optKey,
      isVisited: true,
    };
    setAnswersMap((prev) => ({ ...prev, [qId]: nextState }));
    persistAnswer(qId, nextState);
  }

  function clearResponse() {
    const qId = rawQ.id;
    const nextState = {
      ...answersMap[qId],
      selectedOption: null,
      isVisited: true,
    };
    setAnswersMap((prev) => ({ ...prev, [qId]: nextState }));
    persistAnswer(qId, nextState);
  }

  function markAndNext() {
    const qId = rawQ.id;
    const nextState = {
      ...answersMap[qId],
      isMarkedForReview: true,
      isVisited: true,
    };
    setAnswersMap((prev) => ({ ...prev, [qId]: nextState }));
    persistAnswer(qId, nextState);
    if (currentIndex < total - 1) {
      goToQuestion(currentIndex + 1);
    }
  }

  function saveAndNext() {
    const qId = rawQ.id;
    persistAnswer(qId, currentState);
    if (currentIndex < total - 1) {
      goToQuestion(currentIndex + 1);
    } else {
      setConfirmVisible(true);
    }
  }

  // Stats calculation
  const answeredCount = Object.values(answersMap).filter((s) => s.selectedOption).length;
  const markedCount = Object.values(answersMap).filter((s) => s.isMarkedForReview).length;
  const unansweredCount = total - answeredCount;

  // Active section statistics
  const currentSection = sections.find((s) => s.name === activeSectionName);
  const secAnswered = currentSection
    ? currentSection.questionIndices.filter((i) => answersMap[questions[i]?.id]?.selectedOption).length
    : 0;
  const secTotal = currentSection ? currentSection.questionIndices.length : total;

  // Questions for Palette based on Scope & Filter
  const paletteQuestions = useMemo(() => {
    let list = [];
    if (paletteScope === 'section' && currentSection) {
      list = currentSection.questionIndices.map((i) => ({ qn: questions[i], index: i }));
    } else {
      list = questions.map((qn, i) => ({ qn, index: i }));
    }

    return list.filter(({ qn }) => {
      const st = answersMap[qn.id] || {};
      const isAns = Boolean(st.selectedOption);
      const isMrk = Boolean(st.isMarkedForReview);
      if (paletteFilter === 'answered') return isAns;
      if (paletteFilter === 'marked') return isMrk;
      if (paletteFilter === 'unanswered') return !isAns;
      return true;
    });
  }, [paletteScope, currentSection, questions, paletteFilter, answersMap]);

  const isLowTime = remainingSeconds <= 300;
  const optionsList = currentQuestion
    ? [
        { key: 'A', text: currentQuestion.option_a },
        { key: 'B', text: currentQuestion.option_b },
        { key: 'C', text: currentQuestion.option_c },
        { key: 'D', text: currentQuestion.option_d },
      ].filter((o) => o.text !== undefined && o.text !== null && o.text !== '')
    : [];

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.testTitle} numberOfLines={1}>
            {test.title}
          </Text>
          <Text style={styles.markingText}>
            +{test.marks_correct} / -{test.negative_marks}
          </Text>
        </View>

        {/* English <-> Hindi Toggle */}
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

        {/* Timer */}
        <View style={[styles.timerPill, isLowTime && styles.timerPillDanger]}>
          <Text style={[styles.timerText, isLowTime && { color: COLORS.danger }]}>
            ⏱ {formatDurationClock(remainingSeconds)}
          </Text>
        </View>

        {/* Palette button */}
        <TouchableOpacity style={styles.paletteBtn} onPress={() => setPaletteVisible(true)}>
          <Text style={styles.paletteBtnText}>Palette</Text>
        </TouchableOpacity>
      </View>

      {/* SSC CBT Section Dropdown Button */}
      {sections.length > 1 && (
        <View style={styles.sectionBarWrap}>
          <TouchableOpacity
            style={styles.sectionDropdownBtn}
            onPress={() => setSectionModalVisible(true)}
          >
            <Text style={styles.secDropLabel}>📑 Section:</Text>
            <Text style={styles.secDropTitle} numberOfLines={1}>
              {activeSectionName}
            </Text>
            <View style={[styles.secBadge, secAnswered === secTotal && styles.secBadgeDone]}>
              <Text style={styles.secBadgeText}>
                {secAnswered}/{secTotal}
              </Text>
            </View>
            <Text style={styles.secDropArrow}>▾</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={{ color: COLORS.danger, fontSize: 12.5 }}>{error}</Text>
        </View>
      ) : null}

      {/* Question Body */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.qMetaRow}>
          <Text style={styles.qNumber}>
            Question {currentIndex + 1} of {total}
          </Text>
          {currentState.isMarkedForReview && (
            <View style={styles.markedPill}>
              <Text style={styles.markedText}>🟣 Marked for Review</Text>
            </View>
          )}
          {lang === 'hi' && translating && (
            <View style={styles.translatingPill}>
              <Text style={styles.translatingText}>🔄 अनुवाद...</Text>
            </View>
          )}
        </View>

        <Text style={styles.questionText}>
          {formatQText(currentQuestion.question_text || currentQuestion.text)}
        </Text>

        {optionsList.map((opt) => {
          const selected = currentState.selectedOption === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.optionCard, selected && styles.optionCardSelected]}
              onPress={() => selectOption(opt.key)}
            >
              <View style={[styles.optionCircle, selected && styles.optionCircleSelected]}>
                <Text style={[styles.optionKey, selected && { color: '#fff' }]}>{opt.key}</Text>
              </View>
              <Text style={[styles.optionText, selected && { fontWeight: '700', color: COLORS.navy }]}>
                {opt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Aligned Unified Action Bar */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <TouchableOpacity
            style={[styles.prevBtn, currentIndex === 0 && styles.btnDisabled]}
            disabled={currentIndex === 0}
            onPress={() => goToQuestion(currentIndex - 1)}
          >
            <Text style={styles.prevBtnText}>← Prev</Text>
          </TouchableOpacity>

          {currentState.selectedOption && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearResponse}>
              <Text style={styles.clearBtnText}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footerRight}>
          <TouchableOpacity style={styles.markNextBtn} onPress={markAndNext}>
            <Text style={styles.markNextBtnText}>🟣 Mark & Next</Text>
          </TouchableOpacity>

          {currentIndex < total - 1 ? (
            <TouchableOpacity style={styles.saveNextBtn} onPress={saveAndNext}>
              <Text style={styles.saveNextBtnText}>Save & Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.submitFinalBtn}
              onPress={() => setConfirmVisible(true)}
              disabled={submitting}
            >
              <Text style={styles.submitFinalBtnText}>
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Section Switcher Modal */}
      <Modal visible={sectionModalVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSectionModalVisible(false)}
        >
          <View style={styles.sectionModalCard}>
            <Text style={styles.sectionModalTitle}>📑 Select Subject Section</Text>
            {sections.map((sec) => {
              const isActive = sec.name === activeSectionName;
              const ansCount = sec.questionIndices.filter(
                (i) => answersMap[questions[i]?.id]?.selectedOption
              ).length;
              return (
                <TouchableOpacity
                  key={sec.name}
                  style={[styles.sectionModalItem, isActive && styles.sectionModalItemActive]}
                  onPress={() => {
                    goToQuestion(sec.startIndex);
                    setSectionModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sectionModalItemText,
                      isActive && { color: COLORS.primary, fontWeight: '800' },
                    ]}
                  >
                    {sec.name}
                  </Text>
                  <View
                    style={[
                      styles.secBadge,
                      ansCount === sec.questionIndices.length && styles.secBadgeDone,
                    ]}
                  >
                    <Text style={styles.secBadgeText}>
                      {ansCount}/{sec.questionIndices.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Question Palette Modal */}
      <Modal visible={paletteVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Question Palette</Text>
                <Text style={styles.modalSub}>
                  {paletteScope === 'section' ? activeSectionName : 'All Questions'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPaletteVisible(false)}>
                <Text style={styles.closeBtn}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            {/* Scope Switcher */}
            {sections.length > 1 && (
              <View style={styles.scopeRow}>
                <TouchableOpacity
                  style={[styles.scopeBtn, paletteScope === 'section' && styles.scopeBtnActive]}
                  onPress={() => setPaletteScope('section')}
                >
                  <Text
                    style={[
                      styles.scopeBtnText,
                      paletteScope === 'section' && styles.scopeBtnTextActive,
                    ]}
                  >
                    Current Section
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scopeBtn, paletteScope === 'all' && styles.scopeBtnActive]}
                  onPress={() => setPaletteScope('all')}
                >
                  <Text
                    style={[
                      styles.scopeBtnText,
                      paletteScope === 'all' && styles.scopeBtnTextActive,
                    ]}
                  >
                    All Questions ({total})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Interactive Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterPill, paletteFilter === 'all' && styles.filterPillActive]}
                onPress={() => setPaletteFilter('all')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    paletteFilter === 'all' && styles.filterPillTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  paletteFilter === 'answered' && styles.filterPillActive,
                ]}
                onPress={() => setPaletteFilter((f) => (f === 'answered' ? 'all' : 'answered'))}
              >
                <View style={[styles.filterDot, { backgroundColor: COLORS.success }]} />
                <Text
                  style={[
                    styles.filterPillText,
                    paletteFilter === 'answered' && styles.filterPillTextActive,
                  ]}
                >
                  Answered ({answeredCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, paletteFilter === 'marked' && styles.filterPillActive]}
                onPress={() => setPaletteFilter((f) => (f === 'marked' ? 'all' : 'marked'))}
              >
                <View style={[styles.filterDot, { backgroundColor: '#8B5CF6' }]} />
                <Text
                  style={[
                    styles.filterPillText,
                    paletteFilter === 'marked' && styles.filterPillTextActive,
                  ]}
                >
                  Marked ({markedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  paletteFilter === 'unanswered' && styles.filterPillActive,
                ]}
                onPress={() => setPaletteFilter((f) => (f === 'unanswered' ? 'all' : 'unanswered'))}
              >
                <View style={[styles.filterDot, { backgroundColor: '#94A3B8' }]} />
                <Text
                  style={[
                    styles.filterPillText,
                    paletteFilter === 'unanswered' && styles.filterPillTextActive,
                  ]}
                >
                  Unanswered ({unansweredCount})
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Palette Grid */}
            <ScrollView contentContainerStyle={styles.paletteGrid}>
              {paletteQuestions.map(({ qn, index }) => {
                const st = answersMap[qn.id];
                const isCurrent = index === currentIndex;
                const isAns = Boolean(st?.selectedOption);
                const isMrk = Boolean(st?.isMarkedForReview);

                let bg = '#F1F5F9';
                let fg = '#475569';
                if (isMrk) {
                  bg = '#EDE9FE';
                  fg = '#7C3AED';
                } else if (isAns) {
                  bg = COLORS.success;
                  fg = '#FFFFFF';
                }

                return (
                  <TouchableOpacity
                    key={qn.id}
                    style={[
                      styles.paletteTile,
                      { backgroundColor: bg },
                      isCurrent && styles.paletteTileCurrent,
                    ]}
                    onPress={() => goToQuestion(index)}
                  >
                    <Text style={[styles.paletteTileText, { color: fg }]}>{index + 1}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal visible={confirmVisible} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Submit Test?</Text>
            <Text style={styles.confirmSub}>
              You have answered {answeredCount} of {total} questions.
            </Text>

            <View style={styles.confirmStatsRow}>
              <View style={[styles.confirmStat, { backgroundColor: COLORS.successSoft }]}>
                <Text style={[styles.confirmStatVal, { color: COLORS.success }]}>
                  {answeredCount}
                </Text>
                <Text style={styles.confirmStatLbl}>Answered</Text>
              </View>
              <View style={[styles.confirmStat, { backgroundColor: '#EDE9FE' }]}>
                <Text style={[styles.confirmStatVal, { color: '#7C3AED' }]}>{markedCount}</Text>
                <Text style={styles.confirmStatLbl}>Marked</Text>
              </View>
              <View style={[styles.confirmStat, { backgroundColor: COLORS.warningSoft }]}>
                <Text style={[styles.confirmStatVal, { color: COLORS.warning }]}>
                  {unansweredCount}
                </Text>
                <Text style={styles.confirmStatLbl}>Unanswered</Text>
              </View>
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Continue Test</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmSubmitBtn}
                onPress={() => handleSubmit(false)}
                disabled={submitting}
              >
                <Text style={styles.confirmSubmitBtnText}>
                  {submitting ? 'Submitting...' : 'Yes, Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  testTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  markingText: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 7,
    padding: 2,
  },
  langBtn: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5 },
  langBtnActive: { backgroundColor: COLORS.primary },
  langText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' },
  langTextActive: { color: '#FFFFFF' },
  timerPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },
  timerPillDanger: { backgroundColor: COLORS.dangerSoft },
  timerText: { color: '#FCD34D', fontSize: 12, fontWeight: '800' },
  paletteBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paletteBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  sectionBarWrap: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  sectionDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  secDropLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  secDropTitle: { flex: 1, color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  secBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  secBadgeDone: { backgroundColor: COLORS.success },
  secBadgeText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' },
  secDropArrow: { color: '#94A3B8', fontSize: 12 },
  errorBanner: { backgroundColor: COLORS.dangerSoft, padding: 8, alignItems: 'center' },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 24 },
  qMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  qNumber: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  markedPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  markedText: { color: '#7C3AED', fontSize: 11, fontWeight: '700' },
  translatingPill: {
    backgroundColor: COLORS.warningSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  translatingText: { color: COLORS.warning, fontSize: 11, fontWeight: '600' },
  questionText: {
    fontSize: 16.5,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  optionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionCircleSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionKey: { fontSize: 12.5, fontWeight: '700', color: COLORS.muted },
  optionText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  footer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prevBtn: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnDisabled: { opacity: 0.4 },
  prevBtnText: { color: COLORS.text, fontSize: 12.5, fontWeight: '700' },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearBtnText: { color: COLORS.muted, fontSize: 11.5, fontWeight: '600' },
  markNextBtn: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
  },
  markNextBtnText: { color: '#7C3AED', fontSize: 12, fontWeight: '700' },
  saveNextBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  saveNextBtnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  submitFinalBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  submitFinalBtnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sectionModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  sectionModalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  sectionModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionModalItemActive: { backgroundColor: COLORS.primarySoft, borderRadius: 8, paddingHorizontal: 8 },
  sectionModalItemText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
    padding: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  modalSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  closeBtn: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  scopeBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 7,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scopeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  scopeBtnText: { fontSize: 11.5, fontWeight: '600', color: COLORS.muted },
  scopeBtnTextActive: { color: '#fff' },
  filterScroll: { flexDirection: 'row', marginBottom: 12 },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginRight: 6,
  },
  filterPillActive: { backgroundColor: COLORS.primary },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterPillText: { fontSize: 11.5, fontWeight: '600', color: COLORS.muted },
  filterPillTextActive: { color: '#FFFFFF' },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 },
  paletteTile: {
    width: '17.5%',
    aspectRatio: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteTileCurrent: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  paletteTileText: { fontSize: 13, fontWeight: '700' },
  confirmCard: {
    backgroundColor: COLORS.surface,
    margin: 20,
    borderRadius: 18,
    padding: 20,
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  confirmSub: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  confirmStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  confirmStat: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  confirmStatVal: { fontSize: 18, fontWeight: '800' },
  confirmStatLbl: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  confirmSubmitBtn: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmSubmitBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
