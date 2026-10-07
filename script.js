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
    // 1. Check URL parameters for override or testing (?unlocked=true, ?deep=1, ?v=2, or ?reset=1, ?v=1)
    const params = new URLSearchParams(window.location.search);
    if (params.get('unlocked') === 'true' || params.get('deep') === '1' || params.get('v') === '2') {
      try {
        localStorage.setItem('klein_call_booked', 'true');
        localStorage.setItem('klein_deep_unlocked', 'true');
      } catch (e) { }
    } else if (params.get('reset') === '1' || params.get('v') === '1') {
      try {
        localStorage.removeItem('klein_call_booked');
        localStorage.removeItem('klein_contact_submitted');
        localStorage.removeItem('klein_deep_unlocked');
      } catch (e) { }
    }

    const isCallBookedExplicit = localStorage.getItem('klein_call_booked') === 'true' ||
                                 localStorage.getItem('klein_contact_submitted') === 'true';

    const progressRaw = localStorage.getItem('klein_survey_progress');
    const dossierRaw = localStorage.getItem('klein_diagnostic_result');
    const leadgenRaw = localStorage.getItem('klein_leadgen_results');
    const progress = progressRaw ? JSON.parse(progressRaw) : null;
    const dossier = dossierRaw ? JSON.parse(dossierRaw) : null;
    const leadgen = leadgenRaw ? JSON.parse(leadgenRaw) : null;

    const hasSurveyFinished = !!(leadgen && leadgen.analysis && leadgen.analysis.profileTitle);
    const hasDossier = !!(dossier && (dossier.diagnostics || dossier.client)) ||
                       !!(progress && (progress.isCompleted || progress.isShortFormCompleted)) ||
                       !!(progress && progress.answers && Object.keys(progress.answers).length >= 14);

    const isCallBooked = isCallBookedExplicit || hasDossier;

    // Elements
    const hookCardV1 = document.getElementById('hookCardV1');
    const hookCardV2 = document.getElementById('hookCardV2');
    const hookSurveyBtn = document.getElementById('hookSurveyBtn');
    const hookProfileBtn = document.getElementById('hookProfileBtn');
    const hookDeepBtn = document.getElementById('hookDeepBtn');
    const hookProfileBtnV2 = document.getElementById('hookProfileBtnV2');

    const panelActionV1 = document.getElementById('panelActionV1');
    const panelActionV2 = document.getElementById('panelActionV2');
    const panelSurveyBtn = document.getElementById('panelSurveyBtn');
    const panelProfileBtn = document.getElementById('panelProfileBtn');
    const panelDeepBtn = document.getElementById('panelDeepBtn');
    const panelProfileBtnV2 = document.getElementById('panelProfileBtnV2');

    const navDiagnosticLink = document.getElementById('navDiagnosticLink');
    const navDossierLink = document.getElementById('navDossierLink');
    const navDeepLink = document.getElementById('navDeepLink');
    const navCta = document.querySelector('.nav-cta');

    if (navCta) {
      navCta.style.display = isCallBooked ? 'none' : 'inline-flex';
    }

    if (!isCallBooked) {
      // =========================================================================
      // NO CALL BOOKED: V1 Cards Active
      // =========================================================================
      if (hookCardV1) hookCardV1.style.display = 'block';
      if (hookCardV2) hookCardV2.style.display = 'none';
      if (panelActionV1) panelActionV1.style.display = 'flex';
      if (panelActionV2) panelActionV2.style.display = 'none';
      if (navDeepLink) navDeepLink.style.display = 'none';

      if (!hasSurveyFinished) {
        // -----------------------------------------------------------------------
        // STATE 1: If survey untaken, ONLY survey button (or Resume if partial progress saved)
        // -----------------------------------------------------------------------
        let partialProgress = null;
        try {
          const rawProgress = localStorage.getItem('klein_leadgen_progress');
          if (rawProgress) partialProgress = JSON.parse(rawProgress);
        } catch (e) { }

        const hasPartial = partialProgress && (partialProgress.currentIndex > 0 || (partialProgress.answers && Object.keys(partialProgress.answers).length > 0));
        const resumeNum = hasPartial ? Math.min(17, (partialProgress.currentIndex || 0) + 1) : 1;

        if (hookSurveyBtn) {
          hookSurveyBtn.style.display = 'inline-flex';
          hookSurveyBtn.innerHTML = hasPartial
            ? `Resume 3-Min Assessment (${resumeNum}/17) &rarr;`
            : `Take 3-Min Assessment &rarr;`;
        }
        if (hookProfileBtn) hookProfileBtn.style.display = 'none';
        if (panelSurveyBtn) {
          panelSurveyBtn.style.display = 'inline-flex';
          panelSurveyBtn.innerHTML = hasPartial
            ? `Resume 3-Min Assessment (${resumeNum}/17) &rarr;`
            : `Take 3-Min Assessment &rarr;`;
        }
        if (panelProfileBtn) panelProfileBtn.style.display = 'none';

        if (navDiagnosticLink) {
          navDiagnosticLink.style.display = 'inline-block';
          navDiagnosticLink.textContent = hasPartial ? `Resume (${resumeNum}/17)` : `3-Min Assessment`;
        }
        if (navDossierLink) navDossierLink.style.display = 'none';
      } else {
        // -----------------------------------------------------------------------
        // STATE 2: If survey finished, ONLY profile button (use link in profile to retake)
        // -----------------------------------------------------------------------
        if (hookSurveyBtn) hookSurveyBtn.style.display = 'none';
        if (hookProfileBtn) {
          hookProfileBtn.style.display = 'inline-flex';
          hookProfileBtn.href = 'survey.html?view=results';
          hookProfileBtn.innerHTML = `<span>📊 View 3-Min Profile &rarr;</span>`;
        }

        if (panelSurveyBtn) panelSurveyBtn.style.display = 'none';
        if (panelProfileBtn) {
          panelProfileBtn.style.display = 'inline-flex';
          panelProfileBtn.href = 'survey.html?view=results';
          panelProfileBtn.innerHTML = `<span>📊 View 3-Min Profile &rarr;</span>`;
        }

        // Update V1 card copy to highlight completed profile
        if (hookCardV1) {
          const badge = hookCardV1.querySelector('.hook-action-badge');
          if (badge) badge.textContent = `✓ Profile Ready: ${leadgen.analysis.profileTitle}`;
          const title = hookCardV1.querySelector('.hook-action-title');
          if (title) title.textContent = `Your Operational Profile (${leadgen.analysis.profileTitle}) is ready.`;
          const desc = hookCardV1.querySelector('.hook-action-desc');
          if (desc) desc.textContent = `Your 3-minute assessment identified your operating pattern: ${leadgen.analysis.profileTitle}. Review your breakdown or schedule your strategy call with Joe.`;
        }

        if (navDiagnosticLink) navDiagnosticLink.style.display = 'none';
        if (navDossierLink) {
          navDossierLink.style.display = 'inline-block';
          navDossierLink.href = 'survey.html?view=results';
          navDossierLink.textContent = '3-Min Profile';
        }
      }
    } else {
      // =========================================================================
      // CALL BOOKED: V2 Cards Active
      // =========================================================================
      if (hookCardV1) hookCardV1.style.display = 'none';
      if (hookCardV2) hookCardV2.style.display = 'block';
      if (panelActionV1) panelActionV1.style.display = 'none';
      if (panelActionV2) panelActionV2.style.display = 'flex';
      if (navDiagnosticLink) navDiagnosticLink.style.display = 'none';

      if (!hasDossier) {
        // -----------------------------------------------------------------------
        // STATE 3: If call booked (no assessment yet) JUST assessment and profile buttons
        // -----------------------------------------------------------------------
        if (hookDeepBtn) {
          hookDeepBtn.style.display = 'inline-flex';
          hookDeepBtn.href = 'survey-deep.html';
          hookDeepBtn.innerHTML = `In-Depth Assessment &rarr;`;
        }
        if (hookProfileBtnV2) {
          hookProfileBtnV2.style.display = 'inline-flex';
          hookProfileBtnV2.href = hasSurveyFinished ? 'survey.html?view=results' : 'survey.html';
          hookProfileBtnV2.innerHTML = hasSurveyFinished ? `3-Min Profile &rarr;` : `Take 3-Min Assessment &rarr;`;
        }

        if (panelDeepBtn) {
          panelDeepBtn.href = 'survey-deep.html';
          panelDeepBtn.innerHTML = `Launch In-Depth Assessment &rarr;`;
        }
        if (panelProfileBtnV2) {
          panelProfileBtnV2.href = hasSurveyFinished ? 'survey.html?view=results' : 'survey.html';
          panelProfileBtnV2.innerHTML = hasSurveyFinished ? `View 3-Min Profile &rarr;` : `Take 3-Min Assessment &rarr;`;
        }

        if (navDeepLink) {
          navDeepLink.style.display = 'inline-block';
          navDeepLink.href = 'survey-deep.html';
          navDeepLink.textContent = 'In-Depth Assessment';
        }
        if (navDossierLink) {
          navDossierLink.style.display = 'inline-block';
          navDossierLink.href = hasSurveyFinished ? 'survey.html?view=results' : 'survey.html';
          navDossierLink.textContent = hasSurveyFinished ? '3-Min Profile' : '3-Min Assessment';
        }
      } else {
        // -----------------------------------------------------------------------
        // STATE 4: If call booked and dossier available, BOTH profile and dossier buttons
        // (retake from there as w/ profile)
        // -----------------------------------------------------------------------
        if (hookDeepBtn) {
          hookDeepBtn.style.display = 'inline-flex';
          hookDeepBtn.href = 'survey-deep.html?view=dossier';
          hookDeepBtn.innerHTML = `📊 View Executive Dossier &rarr;`;
        }
        if (hookProfileBtnV2) {
          hookProfileBtnV2.style.display = 'inline-flex';
          hookProfileBtnV2.href = hasSurveyFinished ? 'survey.html?view=results' : 'survey.html';
          hookProfileBtnV2.innerHTML = hasSurveyFinished ? `📊 View 3-Min Profile &rarr;` : `3-Min Assessment &rarr;`;
        }

        if (hookCardV2) {
          const badge = hookCardV2.querySelector('.hook-action-badge');
          if (badge) {
            badge.textContent = `✓ Executive Dossier Ready`;
            badge.style.background = 'rgba(16, 185, 129, 0.12)';
            badge.style.color = '#047857';
          }
          const title = hookCardV2.querySelector('.hook-action-title');
          if (title) title.textContent = `Your Executive Constraint Dossier is Ready`;
          const desc = hookCardV2.querySelector('.hook-action-desc');
          if (desc) desc.textContent = `Your synthesized 3-phase constraint audit, operating friction scorecard, and focus sprints are saved. Review your briefing or download your 3-page PDF dossier.`;
        }

        if (panelDeepBtn) {
          panelDeepBtn.href = 'survey-deep.html?view=dossier';
          panelDeepBtn.innerHTML = `📊 View Executive Dossier &rarr;`;
        }
        if (panelProfileBtnV2) {
          panelProfileBtnV2.href = hasSurveyFinished ? 'survey.html?view=results' : 'survey.html';
          panelProfileBtnV2.innerHTML = hasSurveyFinished ? `View 3-Min Profile &rarr;` : `Take 3-Min Assessment &rarr;`;
        }

        if (navDeepLink) {
          navDeepLink.style.display = 'inline-block';
          navDeepLink.href = 'survey-deep.html?view=dossier';
          navDeepLink.textContent = 'Dossier';
        }
        if (navDossierLink) {
          navDossierLink.style.display = 'inline-block';
          navDossierLink.href = hasSurveyFinished ? 'survey.html?view=results' : 'survey.html';
          navDossierLink.textContent = hasSurveyFinished ? '3-Min Profile' : '3-Min Assessment';
        }
      }
    }
  } catch (err) {
    console.warn('Diagnostic button sync notice:', err);
  }
}

// Preload contact details in the "Let's Talk" form if already submitted
function preloadContactDetails() {
  const contactForm = document.querySelector('.contact-form');
  if (!contactForm) return;

  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const businessInput = document.getElementById('business');

  let leadName = '';
  let leadEmail = '';
  let leadBusiness = '';

  // 1. Check URL query parameters
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('name')) leadName = params.get('name').trim();
    if (params.get('email')) leadEmail = params.get('email').trim();
    if (params.get('business')) leadBusiness = params.get('business').trim();
    if (!leadBusiness && params.get('company')) leadBusiness = params.get('company').trim();
  } catch (e) { }

  // 2. Check explicitly saved contact details
  if (!leadName || !leadEmail || !leadBusiness) {
    try {
      if (!leadName) leadName = localStorage.getItem('klein_contact_name') || '';
      if (!leadBusiness) leadBusiness = localStorage.getItem('klein_contact_business') || '';
      if (!leadEmail) leadEmail = localStorage.getItem('klein_contact_email') || '';
      const savedContactRaw = localStorage.getItem('klein_contact_details');
      if (savedContactRaw) {
        const savedContact = JSON.parse(savedContactRaw);
        if (!leadName && savedContact.name) leadName = savedContact.name;
        if (!leadEmail && savedContact.email) leadEmail = savedContact.email;
        if (!leadBusiness && (savedContact.business || savedContact.company)) leadBusiness = savedContact.business || savedContact.company;
      }
    } catch (e) { }
  }

  // 2b. Check leadgen assessment results
  if (!leadName || !leadEmail || !leadBusiness) {
    try {
      const leadgenRaw = localStorage.getItem('klein_leadgen_results');
      if (leadgenRaw) {
        const leadgen = JSON.parse(leadgenRaw);
        if (leadgen && leadgen.lead) {
          if (!leadName && leadgen.lead.name) leadName = leadgen.lead.name;
          if (!leadEmail && leadgen.lead.email) leadEmail = leadgen.lead.email;
          if (!leadBusiness && (leadgen.lead.company || leadgen.lead.business)) {
            leadBusiness = leadgen.lead.company || leadgen.lead.business;
          }
        }
      }
    } catch (e) { }
  }

  // 3. Check diagnostic dossier results
  if (!leadName || !leadEmail || !leadBusiness) {
    try {
      const dossierRaw = localStorage.getItem('klein_diagnostic_result');
      if (dossierRaw) {
        const dossier = JSON.parse(dossierRaw);
        if (dossier && dossier.client) {
          if (!leadName && dossier.client.name && dossier.client.name !== 'Executive Lead') {
            leadName = dossier.client.name;
          }
          if (!leadEmail && dossier.client.email && dossier.client.email.includes('@')) {
            leadEmail = dossier.client.email;
          }
          if (!leadBusiness && dossier.client.company && dossier.client.company !== 'Your Company') {
            leadBusiness = dossier.client.company;
          }
        }
      }
    } catch (e) { }
  }

  // 4. Check survey progress leadData
  if (!leadName || !leadEmail || !leadBusiness) {
    try {
      const progressRaw = localStorage.getItem('klein_survey_progress');
      if (progressRaw) {
        const progress = JSON.parse(progressRaw);
        if (progress && progress.leadData) {
          if (!leadName && progress.leadData.name && progress.leadData.name !== 'Executive Lead') {
            leadName = progress.leadData.name;
          }
          if (!leadEmail && progress.leadData.email && progress.leadData.email.includes('@')) {
            leadEmail = progress.leadData.email;
          }
          if (!leadBusiness && progress.leadData.company && progress.leadData.company !== 'Your Company') {
            leadBusiness = progress.leadData.company;
          }
        }
      }
    } catch (e) { }
  }

  // Pre-fill inputs if empty
  if (nameInput && !nameInput.value && leadName) {
    nameInput.value = leadName;
  }
  if (emailInput && !emailInput.value && leadEmail) {
    emailInput.value = leadEmail;
  }
  if (businessInput && !businessInput.value && leadBusiness) {
    businessInput.value = leadBusiness;
  }

  // Auto-save any manual updates in the form so it is remembered
  const saveCurrentContact = () => {
    try {
      const current = {
        name: nameInput ? nameInput.value.trim() : '',
        email: emailInput ? emailInput.value.trim() : '',
        business: businessInput ? businessInput.value.trim() : '',
        savedAt: new Date().toISOString()
      };
      if (current.email || current.name || current.business) {
        localStorage.setItem('klein_contact_details', JSON.stringify(current));
      }
    } catch (e) { }
  };

  const escapeText = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const renderNextStepsCard = (name, business) => {
    const contactFormWrap = document.getElementById('contactFormWrap');
    const contactNextSteps = document.getElementById('contactNextSteps');
    const nextStepsHeading = document.getElementById('nextStepsHeading');
    const nextStepsIntro = document.getElementById('nextStepsIntro');

    if (!contactNextSteps) return;

    if (contactFormWrap) contactFormWrap.style.display = 'none';
    contactNextSteps.style.display = 'block';

    const cleanName = (name || '').trim();
    const firstName = cleanName ? cleanName.split(' ')[0] : '';
    const cleanBusiness = (business || '').trim();

    if (nextStepsHeading) {
      if (firstName) {
        nextStepsHeading.innerHTML = `Thank you, ${escapeText(firstName)}!`;
      } else {
        nextStepsHeading.textContent = `Thank you for reaching out!`;
      }
    }

    if (nextStepsIntro) {
      if (cleanBusiness) {
        nextStepsIntro.textContent = `Your inquiry regarding ${cleanBusiness} has been sent straight to Joe's inbox. He personally reviews every note and will get back to you within 1 business day.`;
      } else {
        nextStepsIntro.textContent = `Your inquiry has been sent straight to Joe's inbox. He personally reviews every note and will get back to you within 1 business day.`;
      }
    }
  };

  const showForm = () => {
    const contactFormWrap = document.getElementById('contactFormWrap');
    const contactNextSteps = document.getElementById('contactNextSteps');
    const submitBtn = document.getElementById('contactSubmitBtn');
    if (contactFormWrap) contactFormWrap.style.display = 'block';
    if (contactNextSteps) contactNextSteps.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Request';
    }
  };

  // If already submitted in this browser session, display Next Steps card
  try {
    const isSubmitted = localStorage.getItem('klein_contact_submitted') === 'true';
    if (isSubmitted) {
      const savedName = localStorage.getItem('klein_contact_name') || leadName || '';
      const savedBusiness = localStorage.getItem('klein_contact_business') || leadBusiness || '';
      renderNextStepsCard(savedName, savedBusiness);
    }
  } catch (e) { }

  const nextStepsResetBtn = document.getElementById('nextStepsResetBtn');
  if (nextStepsResetBtn) {
    nextStepsResetBtn.addEventListener('click', () => {
      showForm();
      if (nameInput) nameInput.focus();
    });
  }

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const business = businessInput ? businessInput.value.trim() : '';
    const submitBtn = document.getElementById('contactSubmitBtn');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending Request...';
    }

    saveCurrentContact();
    try {
      localStorage.setItem('klein_call_booked', 'true');
      localStorage.setItem('klein_contact_submitted', 'true');
      localStorage.setItem('klein_deep_unlocked', 'true');
      if (name) localStorage.setItem('klein_contact_name', name);
      if (business) localStorage.setItem('klein_contact_business', business);
      if (email) localStorage.setItem('klein_contact_email', email);
    } catch (e) { }

    // Dispatch form via fetch
    try {
      const formData = new FormData(contactForm);
      await fetch(contactForm.action || 'https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
    } catch (err) {
      console.warn('Web3Forms dispatch note:', err);
    }

    renderNextStepsCard(name, business);
    syncDiagnosticButtons();

    const contactCard = document.getElementById('contactCard');
    if (contactCard) {
      contactCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  if (nameInput) nameInput.addEventListener('change', saveCurrentContact);
  if (emailInput) emailInput.addEventListener('change', saveCurrentContact);
  if (businessInput) businessInput.addEventListener('change', saveCurrentContact);
}

function initPageInteractions() {
  syncDiagnosticButtons();
  preloadContactDetails();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPageInteractions);
} else {
  initPageInteractions();
}

