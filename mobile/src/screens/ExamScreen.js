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

export default function ExamScreen({ session, onSubmitted, onExit }) {
  const { attempt, test, questions, savedAnswers, remainingSeconds: initialSeconds } = session;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
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

  const [paletteVisible, setPaletteVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const answersRef = useRef(answersMap);
  answersRef.current = answersMap;
  const submittedOnceRef = useRef(false);

  const currentQuestion = questions[currentIndex];
  const currentState = answersMap[currentQuestion?.id] || {
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
      if (err.message.includes('auto-submitted')) {
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
    if (idx < 0 || idx >= questions.length) return;
    const targetQ = questions[idx];
    setAnswersMap((prev) => ({
      ...prev,
      [targetQ.id]: { ...prev[targetQ.id], isVisited: true },
    }));
    setCurrentIndex(idx);
    setPaletteVisible(false);
  }

  function selectOption(optKey) {
    const qId = currentQuestion.id;
    const nextState = {
      ...answersMap[qId],
      selectedOption: optKey,
      isVisited: true,
    };
    setAnswersMap((prev) => ({ ...prev, [qId]: nextState }));
    persistAnswer(qId, nextState);
  }

  function toggleMarkForReview() {
    const qId = currentQuestion.id;
    const nextState = {
      ...answersMap[qId],
      isMarkedForReview: !answersMap[qId].isMarkedForReview,
      isVisited: true,
    };
    setAnswersMap((prev) => ({ ...prev, [qId]: nextState }));
    persistAnswer(qId, nextState);
  }

  function clearResponse() {
    const qId = currentQuestion.id;
    const nextState = {
      ...answersMap[qId],
      selectedOption: null,
      isVisited: true,
    };
    setAnswersMap((prev) => ({ ...prev, [qId]: nextState }));
    persistAnswer(qId, nextState);
  }

  const stats = useMemo(() => {
    let answered = 0;
    let marked = 0;
    let notVisited = 0;
    let notAnswered = 0;
    for (const q of questions) {
      const st = answersMap[q.id];
      if (!st?.isVisited) {
        notVisited += 1;
      } else if (st.selectedOption) {
        answered += 1;
        if (st.isMarkedForReview) marked += 1;
      } else {
        notAnswered += 1;
        if (st.isMarkedForReview) marked += 1;
      }
    }
    return { answered, marked, notVisited, notAnswered };
  }, [answersMap, questions]);

  const isLowTime = remainingSeconds <= 300;
  const optionsList = [
    { key: 'A', text: currentQuestion.option_a },
    { key: 'B', text: currentQuestion.option_b },
    { key: 'C', text: currentQuestion.option_c },
    { key: 'D', text: currentQuestion.option_d },
  ];

  function getTileStyle(qId) {
    const st = answersMap[qId];
    if (!st?.isVisited) return { bg: '#E2E8F0', fg: '#475569' };
    if (st.selectedOption && st.isMarkedForReview) return { bg: COLORS.purple, fg: '#FFFFFF' };
    if (st.selectedOption) return { bg: COLORS.success, fg: '#FFFFFF' };
    if (st.isMarkedForReview) return { bg: COLORS.purpleSoft, fg: COLORS.purple };
    return { bg: COLORS.warningSoft, fg: COLORS.warning };
  }

  return (
    <View style={styles.root}>
      {/* Top Exam Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.testTitle} numberOfLines={1}>
            {test.title}
          </Text>
          <Text style={styles.markingText}>
            +{test.marks_correct} / -{test.negative_marks} · Q {currentIndex + 1}/{questions.length}
          </Text>
        </View>
        <View style={[styles.timerPill, isLowTime && styles.timerPillDanger]}>
          <Text style={[styles.timerText, isLowTime && { color: COLORS.danger }]}>
            ⏱ {formatDurationClock(remainingSeconds)}
          </Text>
        </View>
        <TouchableOpacity style={styles.paletteBtn} onPress={() => setPaletteVisible(true)}>
          <Text style={styles.paletteBtnText}>Palette</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={{ color: COLORS.danger, fontSize: 12.5 }}>{error}</Text>
        </View>
      ) : null}

      {/* Question Body */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.qMetaRow}>
          <View style={styles.subjectPill}>
            <Text style={styles.subjectText}>{currentQuestion.subject}</Text>
          </View>
          {currentState.isMarkedForReview && (
            <View style={styles.markedPill}>
              <Text style={styles.markedText}>★ Marked for Review</Text>
            </View>
          )}
        </View>

        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

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
              <Text style={[styles.optionText, selected && { fontWeight: '700' }]}>{opt.text}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.utilityRow}>
          <TouchableOpacity style={styles.utilityBtn} onPress={toggleMarkForReview}>
            <Text style={styles.utilityBtnText}>
              {currentState.isMarkedForReview ? 'Unmark Review' : 'Mark for Review'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.utilityBtn} onPress={clearResponse}>
            <Text style={styles.utilityBtnText}>Clear Response</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Controls */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          disabled={currentIndex === 0}
          onPress={() => goToQuestion(currentIndex - 1)}
        >
          <Text style={styles.navBtnText}>← Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitTriggerBtn}
          onPress={() => setConfirmVisible(true)}
          disabled={submitting}
        >
          <Text style={styles.submitTriggerText}>{submitting ? 'Submitting...' : 'Submit Test'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.nextBtn,
            currentIndex === questions.length - 1 && { backgroundColor: COLORS.navy },
          ]}
          onPress={() => {
            if (currentIndex < questions.length - 1) goToQuestion(currentIndex + 1);
            else setConfirmVisible(true);
          }}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex < questions.length - 1 ? 'Save & Next →' : 'Finish →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Question Palette Modal */}
      <Modal visible={paletteVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Question Palette ({questions.length})</Text>
              <TouchableOpacity onPress={() => setPaletteVisible(false)}>
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.legendRow}>
              <Text style={styles.legendItem}>🟢 Answered: {stats.answered}</Text>
              <Text style={styles.legendItem}>🟣 Marked: {stats.marked}</Text>
              <Text style={styles.legendItem}>🟡 Skipped: {stats.notAnswered}</Text>
              <Text style={styles.legendItem}>⚪ Unvisited: {stats.notVisited}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.paletteGrid}>
              {questions.map((q, idx) => {
                const { bg, fg } = getTileStyle(q.id);
                const isCurrent = idx === currentIndex;
                return (
                  <TouchableOpacity
                    key={q.id}
                    style={[
                      styles.paletteTile,
                      { backgroundColor: bg },
                      isCurrent && styles.paletteTileCurrent,
                    ]}
                    onPress={() => goToQuestion(idx)}
                  >
                    <Text style={[styles.paletteTileText, { color: fg }]}>{idx + 1}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.modalExitBtn} onPress={onExit}>
              <Text style={styles.modalExitText}>Pause & Exit (Progress Saved)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal visible={confirmVisible} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalTitle}>Submit Test?</Text>
            <Text style={{ color: COLORS.muted, fontSize: 13.5, marginVertical: 8 }}>
              Once submitted, your answers will be graded immediately.
            </Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLine}>Total Questions: {questions.length}</Text>
              <Text style={styles.summaryLine}>Answered: {stats.answered}</Text>
              <Text style={styles.summaryLine}>
                Unanswered: {questions.length - stats.answered}
              </Text>
              <Text style={styles.summaryLine}>Marked for Review: {stats.marked}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.navBtn, { flex: 1, alignItems: 'center' }]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.navBtnText}>Keep Reviewing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 1, backgroundColor: COLORS.success }]}
                onPress={() => handleSubmit(false)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.nextBtnText}>Confirm Submit</Text>
                )}
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testTitle: { color: '#fff', fontSize: 14.5, fontWeight: '700' },
  markingText: { color: '#94A3B8', fontSize: 11.5, marginTop: 2 },
  timerPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerPillDanger: { backgroundColor: COLORS.dangerSoft },
  timerText: { color: '#F8FAFC', fontWeight: '800', fontSize: 13 },
  paletteBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  paletteBtnText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
  errorBanner: { backgroundColor: COLORS.dangerSoft, padding: 10 },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 28 },
  qMetaRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  subjectPill: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  subjectText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  markedPill: {
    backgroundColor: COLORS.purpleSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  markedText: { color: COLORS.purple, fontSize: 12, fontWeight: '700' },
  questionText: {
    fontSize: 16.5,
    fontWeight: '600',
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
    padding: 13,
    marginBottom: 10,
    gap: 12,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  optionCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCircleSelected: { backgroundColor: COLORS.primary },
  optionKey: { fontWeight: '700', fontSize: 13.5, color: COLORS.text },
  optionText: { flex: 1, fontSize: 14.5, color: COLORS.text, lineHeight: 20 },
  utilityRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  utilityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  utilityBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  footer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  navBtnDisabled: { opacity: 0.45 },
  navBtnText: { fontWeight: '700', fontSize: 13, color: COLORS.text },
  submitTriggerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.successSoft,
  },
  submitTriggerText: { color: COLORS.success, fontWeight: '700', fontSize: 13 },
  nextBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '82%',
  },
  confirmCard: {
    backgroundColor: COLORS.surface,
    margin: 20,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  legendItem: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 14,
  },
  paletteTile: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteTileCurrent: { borderWidth: 2.5, borderColor: COLORS.navy },
  paletteTileText: { fontWeight: '700', fontSize: 13 },
  modalExitBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalExitText: { color: COLORS.text, fontWeight: '700', fontSize: 13.5 },
  summaryBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  summaryLine: { fontSize: 13.5, fontWeight: '600', color: COLORS.text },
});
