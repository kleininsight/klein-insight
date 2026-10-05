const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const year = document.querySelector('#year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const backToTop = document.querySelector('.back-to-top');
if (backToTop) {
  backToTop.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  });
}

const testimonialTrack = document.querySelector('#testimonial-track');

if (testimonialTrack) {
  const cards = Array.from(testimonialTrack.querySelectorAll('.testimonial-card'));
  const controls = document.querySelector('.testimonial-controls');
  const previous = document.querySelector('[data-testimonial-prev]');
  const next = document.querySelector('[data-testimonial-next]');
  const position = document.querySelector('[data-testimonial-position]');

  testimonialTrack.dataset.count = String(cards.length);

  if (cards.length > 1 && controls && previous && next && position) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cardStep = () => cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
    const visibleCount = () => {
      const step = cardStep();
      if (!step) return 1;
      const gap = step - cards[0].getBoundingClientRect().width;
      return Math.max(1, Math.min(cards.length, Math.round((testimonialTrack.clientWidth + gap) / step)));
    };
    const lastStart = () => Math.max(0, cards.length - visibleCount());
    const currentStart = () => Math.min(lastStart(), Math.max(0, Math.round(testimonialTrack.scrollLeft / cardStep())));

    function updateCarousel() {
      const maxScroll = testimonialTrack.scrollWidth - testimonialTrack.clientWidth;
      controls.hidden = maxScroll <= 1;
      if (controls.hidden) return;

      previous.disabled = testimonialTrack.scrollLeft <= 1;
      next.disabled = testimonialTrack.scrollLeft >= maxScroll - 1;
      const start = currentStart() + 1;
      const end = Math.min(cards.length, start + visibleCount() - 1);
      const label = (start === end ? String(start) : start + '–' + end) + ' of ' + cards.length;
      if (position.textContent !== label) position.textContent = label;
    }

    function moveCarousel(direction) {
      const destination = Math.min(lastStart(), Math.max(0, currentStart() + direction));
      testimonialTrack.scrollTo({
        left: destination * cardStep(),
        behavior: reducedMotion.matches ? 'auto' : 'smooth'
      });
    }

    previous.addEventListener('click', () => moveCarousel(-1));
    next.addEventListener('click', () => moveCarousel(1));
    testimonialTrack.addEventListener('keydown', (event) => {
      if (controls.hidden || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      moveCarousel(event.key === 'ArrowRight' ? 1 : -1);
    });
    testimonialTrack.addEventListener('scroll', updateCarousel, { passive: true });
    window.addEventListener('resize', updateCarousel);
    window.addEventListener('load', updateCarousel);
    updateCarousel();
  }
}

// Sync homepage buttons if user saved progress or completed the short form
function syncDiagnosticButtons() {
  try {
    const progressRaw = localStorage.getItem('klein_survey_progress');
    const dossierRaw = localStorage.getItem('klein_diagnostic_result');
    const progress = progressRaw ? JSON.parse(progressRaw) : null;
    const dossier = dossierRaw ? JSON.parse(dossierRaw) : null;

    const hasProgress = progress && (progress.hasSaved || (progress.answers && Object.keys(progress.answers).length > 0) || progress.isShortFormCompleted);
    const isShortFormOnly = progress && progress.isShortFormCompleted;
    const hasDossier = !!(dossier && (dossier.diagnostics || dossier.client)) || !!(progress && (progress.isCompleted || progress.isShortFormCompleted));

    // Reveal dossier links next to survey buttons when available
    const hookDossierBtn = document.getElementById('hookDossierBtn');
    if (hookDossierBtn) {
      if (hasDossier) {
        hookDossierBtn.style.display = 'inline-flex';
        if (dossier && dossier.diagnostics && dossier.diagnostics.primaryConstraint) {
          hookDossierBtn.title = `View Unlocked Dossier: ${dossier.diagnostics.primaryConstraint}`;
        }
      } else {
        hookDossierBtn.style.display = 'none';
      }
    }

    const panelDossierBtn = document.getElementById('panelDossierBtn');
    if (panelDossierBtn) {
      panelDossierBtn.style.display = hasDossier ? 'inline-flex' : 'none';
    }

    const navDossierLink = document.getElementById('navDossierLink');
    if (navDossierLink) {
      navDossierLink.style.display = hasDossier ? 'inline-block' : 'none';
    }

    if (hasProgress || isShortFormOnly || hasDossier) {
      document.querySelectorAll('a[href="survey.html"], a[href="/survey.html"]').forEach(btn => {
        // Skip dossier-specific links
        if (btn.id === 'hookDossierBtn' || btn.id === 'panelDossierBtn' || btn.id === 'navDossierLink') return;

        // Primary header navigation link
        if (btn.closest('.site-nav')) {
          btn.textContent = hasDossier ? 'Diagnostic' : 'Continue Diagnostic';
          if (!hasDossier) {
            btn.classList.add('nav-diagnostic-active');
          }
        }
        // "Who I am Looking For" action card
        else if (btn.classList.contains('hook-action-btn')) {
          btn.innerHTML = hasDossier ? 'Upgrade / Re-Run &rarr;' : 'Continue Diagnostic &rarr;';
          const card = btn.closest('.hook-action-card');
          if (card) {
            const badge = card.querySelector('.hook-action-badge');
            if (badge) {
              if (dossier && dossier.diagnostics && dossier.diagnostics.primaryConstraint) {
                badge.textContent = `Constraint Diagnosed: ${dossier.diagnostics.primaryConstraint}`;
              } else if (hasDossier) {
                badge.textContent = 'Constraint Dossier Unlocked';
              } else if (isShortFormOnly) {
                badge.textContent = 'Express Audit Saved';
              } else {
                badge.textContent = 'Diagnostic In Progress';
              }
            }
            const title = card.querySelector('.hook-action-title');
            if (title) {
              title.textContent = hasDossier
                ? 'Your Executive Constraint Dossier is ready.'
                : 'Ready to continue your operational diagnostic?';
            }
            const desc = card.querySelector('.hook-action-desc');
            if (desc) {
              desc.textContent = hasDossier
                ? 'Your 6-dimension constraint scorecard and 1-page action plan are compiled. Review your dossier or deepen your diagnostic evaluation.'
                : 'Your answers are saved. Resume where you left off to identify your primary operational constraint.';
            }
          }
        }
        // Owner-Bottleneck section CTA or other links
        else {
          btn.innerHTML = hasDossier ? 'Upgrade / Re-Run &rarr;' : 'Continue Diagnostic &rarr;';
          const panelWrap = btn.closest('.panel-action-wrap');
          if (panelWrap) {
            const label = panelWrap.querySelector('strong');
            if (label) label.textContent = hasDossier ? 'Your operational scorecard is ready' : 'Resume your operational scorecard';
            const sub = panelWrap.querySelector('span');
            if (sub) {
              sub.textContent = hasDossier
                ? 'Your customized 6-dimension scorecard is compiled. View your dossier or refine your answers.'
                : (isShortFormOnly
                  ? 'Your 11-scenario express audit is ready. Pick up where you left off to review or expand.'
                  : 'Your answers have been saved. Continue the audit to get your customized scorecard.');
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn('Diagnostic button sync notice:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncDiagnosticButtons);
} else {
  syncDiagnosticButtons();
}

