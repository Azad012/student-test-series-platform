import React from 'react'

export default function LandingPage({ onOpenAuth }) {
  return (
    <div className="landing-page">
      {/* Top Navbar */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <span className="brand-bolt">⚡</span> Exam<span>Pulse</span>
          </div>

          <nav className="landing-links">
            <a href="#features">Features</a>
            <a href="#categories">Subjects</a>
            <a href="#how-it-works">How It Works</a>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="btn btn-sm landing-btn-ghost"
              onClick={() => onOpenAuth('login')}
            >
              Login
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onOpenAuth('register')}
            >
              Get Started Free
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-container landing-hero-grid">
          <div className="hero-content">
            <div className="hero-pill">
              🚀 Real CBT Exam Experience • English &amp; हिन्दी
            </div>
            <h1 className="hero-title">
              Practice Smarter. <br />
              <span>Crack Your Exam</span> with Confidence.
            </h1>
            <p className="hero-subtitle">
              ExamPulse gives you an authentic SSC &amp; competitive CBT mock test portal —
              complete with sectional navigation, bilingual question toggle, smart palette filters,
              and instant detailed solutions.
            </p>

            <div className="hero-cta-row">
              <button
                type="button"
                className="btn btn-primary hero-cta-main"
                onClick={() => onOpenAuth('register')}
              >
                Start Free Mock Test →
              </button>
              <button
                type="button"
                className="btn hero-cta-sec"
                onClick={() => onOpenAuth('login')}
              >
                Student Login
              </button>
            </div>

            <div className="hero-stats-strip">
              <div className="hero-stat-item">
                <strong>100%</strong>
                <span>Real CBT Interface</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <strong>EN / हिं</strong>
                <span>Bilingual Support</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <strong>Instant</strong>
                <span>Score &amp; Analysis</span>
              </div>
            </div>
          </div>

          {/* Interactive-style CBT Preview Card */}
          <div className="hero-preview-wrap">
            <div className="hero-preview-card">
              <div className="preview-topbar">
                <div className="preview-dots">
                  <span /><span /><span />
                </div>
                <span className="preview-title">ExamPulse CBT • Mock Test</span>
                <span className="preview-timer">⏱ 54:18</span>
              </div>

              <div className="preview-section-pill">
                <span>📑 Section: Quantitative Aptitude</span>
                <span className="preview-badge">14/25 ▾</span>
              </div>

              <div className="preview-q-box">
                <div className="preview-q-meta">
                  <span>Question 15 of 100</span>
                  <span className="preview-lang-chip">English | हिन्दी</span>
                </div>
                <p className="preview-q-text">
                  If a train travels at 72 km/h, how much distance will it cover in 25 minutes?
                </p>
                <div className="preview-options">
                  <div className="preview-opt">(A) 25 km</div>
                  <div className="preview-opt selected">(B) 30 km</div>
                  <div className="preview-opt">(C) 35 km</div>
                  <div className="preview-opt">(D) 40 km</div>
                </div>
              </div>

              <div className="preview-footer">
                <span className="preview-btn-mark">🟣 Mark &amp; Next</span>
                <span className="preview-btn-save">Save &amp; Next →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="section-head">
            <span className="section-tag">WHY EXAMPULSE</span>
            <h2>Built Like the Real Exam Portal</h2>
            <p>Every tool you need to manage time, reduce negative marking, and boost accuracy.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🖥️</div>
              <h3>Authentic CBT Interface</h3>
              <p>Sectional dropdown switcher, live countdown timer, and Mark for Review &amp; Next just like official SSC &amp; RRB portals.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>English ↔ हिन्दी Toggle</h3>
              <p>Switch any question and its options between English and Hindi with a single click during the exam.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Smart Question Palette</h3>
              <p>Filter questions by Answered, Marked for Review, or Unanswered — and jump to any question instantly.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Instant Score &amp; Review</h3>
              <p>Get your accuracy, total marks, and question-by-question solutions immediately after submitting your test.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Performance Dashboard</h3>
              <p>Track all your past test attempts, compare scores, and identify weak subjects over time.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile, Tablet &amp; Laptop</h3>
              <p>Clean responsive design that adapts smoothly whether you practice on your phone, tablet, or desktop.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects / Categories Section */}
      <section id="categories" className="landing-section landing-section-alt">
        <div className="landing-container">
          <div className="section-head">
            <span className="section-tag">STRUCTURED SECTIONS</span>
            <h2>Continuous Subject-Wise Practice</h2>
            <p>Full-length mock tests organized into clear, continuous subject blocks.</p>
          </div>

          <div className="subjects-grid">
            <div className="subject-card">
              <div className="subject-num">01</div>
              <h4>Quantitative Aptitude</h4>
              <p>Arithmetic, Algebra, Geometry, Trigonometry &amp; Data Interpretation.</p>
              <span className="subject-chip">Q1 – Q25</span>
            </div>
            <div className="subject-card">
              <div className="subject-num">02</div>
              <h4>Logical Reasoning</h4>
              <p>Analogy, Coding-Decoding, Syllogism, Puzzles &amp; Series.</p>
              <span className="subject-chip">Q26 – Q50</span>
            </div>
            <div className="subject-card">
              <div className="subject-num">03</div>
              <h4>Verbal Ability</h4>
              <p>Grammar, Comprehension, Synonyms, Antonyms &amp; Error Spotting.</p>
              <span className="subject-chip">Q51 – Q75</span>
            </div>
            <div className="subject-card">
              <div className="subject-num">04</div>
              <h4>General Science</h4>
              <p>Physics, Chemistry, Biology &amp; Everyday Scientific Concepts.</p>
              <span className="subject-chip">Q76 – Q100</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing-section">
        <div className="landing-container">
          <div className="section-head">
            <span className="section-tag">3 SIMPLE STEPS</span>
            <h2>Start Your Test Series in Minutes</h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-circle">1</div>
              <h3>Create Your Account</h3>
              <p>Sign up as a student in seconds or use demo credentials to explore the portal.</p>
            </div>
            <div className="step-card">
              <div className="step-circle">2</div>
              <h3>Enroll in a Course</h3>
              <p>Browse available test series, enroll with one click, and view all included mock tests.</p>
            </div>
            <div className="step-card">
              <div className="step-circle">3</div>
              <h3>Attempt &amp; Analyze</h3>
              <p>Take timed CBT tests in English or Hindi and review detailed solutions right away.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="landing-cta-banner">
        <div className="landing-container landing-cta-inner">
          <div>
            <h2>Ready to Boost Your Exam Score?</h2>
            <p>Join ExamPulse today and experience real CBT mock tests for free.</p>
          </div>
          <button
            type="button"
            className="btn hero-cta-main"
            style={{ background: '#fff', color: '#3730A3', fontWeight: 800 }}
            onClick={() => onOpenAuth('register')}
          >
            Create Free Account →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-brand" style={{ fontSize: 18 }}>
            <span className="brand-bolt">⚡</span> Exam<span>Pulse</span>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Student Test Series Platform — Practice. Track. Excel.
          </p>
        </div>
      </footer>
    </div>
  )
}
