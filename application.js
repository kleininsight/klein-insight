(function () {
  'use strict';

  // This application uses the same destination as the site's contact form.
  const ACCESS_KEY = '5e33b3d7-0efc-43f8-8669-dec872870e3d';
  const SUBMIT_URL = 'https://api.web3forms.com/submit';
  const steps = [
    {
      title: 'Your business',
      description: 'A little context helps me understand the size and stage of the business.',
      fields: [
        { name: 'business_name', label: 'Business name', type: 'text', required: true, autocomplete: 'organization', maxLength: 120 },
        { name: 'business_website', label: 'Website (optional)', type: 'url', autocomplete: 'url', placeholder: 'https://example.com', maxLength: 250 },
        { name: 'years_operating', label: 'How long have you operated the business?', type: 'select', required: true, options: [
          { value: 'Under 2 years', label: 'Under 2 years' },
          { value: '2–5 years', label: '2–5 years' },
          { value: '6–10 years', label: '6–10 years' },
          { value: 'More than 10 years', label: 'More than 10 years' }
        ] },
        { name: 'team_size', label: 'How many people work in the business, including you?', type: 'select', required: true, options: [
          { value: 'Just me', label: 'Just me' },
          { value: '2–5 people', label: '2–5 people' },
          { value: '6–20 people', label: '6–20 people' },
          { value: 'More than 20 people', label: 'More than 20 people' }
        ] },
        { name: 'revenue_range', label: 'Approximate annual revenue (optional)', type: 'select', options: [
          { value: 'Under $100,000', label: 'Under $100,000' },
          { value: '$100,000–$249,999', label: '$100,000–$249,999' },
          { value: '$250,000–$499,999', label: '$250,000–$499,999' },
          { value: '$500,000–$999,999', label: '$500,000–$999,999' },
          { value: '$1 million or more', label: '$1 million or more' }
        ] }
      ]
    },
    {
      title: 'The main bottleneck',
      fields: [
        { name: 'bottleneck', label: 'What is the #1 bottleneck limiting your business or your ability to lead it right now?', type: 'textarea', required: true, rows: 5, help: 'How is it affecting revenue, time, or control?', maxLength: 2000 }
      ]
    },
    {
      title: 'What you have tried',
      fields: [
        { name: 'previous_attempts', label: 'What have you tried to address this, and what happened?', type: 'textarea', required: true, rows: 5, maxLength: 2000 }
      ]
    },
    {
      title: 'Your six-month goal',
      fields: [
        { name: 'six_month_goal', label: 'What specific result would make the next six months a success?', type: 'textarea', required: true, rows: 5, help: 'One or two measurable changes are enough.', maxLength: 2000 }
      ]
    },
    {
      title: 'Readiness to change',
      fields: [
        { name: 'commitment', label: 'On a scale of 1–10, how committed are you to changing your operating rhythm over the next six months?', type: 'rating', required: true, help: '1 = not ready to change; 10 = ready to make substantial changes.' },
        { name: 'first_month_change', label: 'What are you willing to do differently in the first 30 days?', type: 'textarea', required: true, rows: 4, maxLength: 1500 }
      ]
    },
    {
      title: 'Working together',
      fields: [
        { name: 'expectations', label: 'What support do you expect from me, and what work are you prepared to own?', type: 'textarea', required: true, rows: 5, help: 'Think about strategy, direct feedback, practical templates, accountability, and execution.', maxLength: 2000 }
      ]
    },
    {
      title: 'Investment and contact',
      description: 'The partnership lasts six months. The standard rate is $1,500 per month. The founding-client rate is $1,000 per month for eligible clients. No payment is taken here.',
      fields: [
        { name: 'investment_readiness', label: 'Could you consider this six-month investment if we agree there is a strong fit?', type: 'select', required: true, options: [
          { value: 'Yes, if accepted', label: 'Yes, if accepted' },
          { value: 'I would like to discuss timing or budget', label: 'I would like to discuss timing or budget' },
          { value: 'Not right now', label: 'Not right now' }
        ] },
        { name: 'full_name', label: 'Your name', type: 'text', required: true, autocomplete: 'name', maxLength: 120 },
        { name: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'email', maxLength: 254 },
        { name: 'phone', label: 'Phone number (optional)', type: 'tel', autocomplete: 'tel', maxLength: 40 },
        { name: 'referral_source', label: 'How did you hear about Klein Insight? (optional)', type: 'text', maxLength: 160 }
      ]
    }
  ];

  document.querySelectorAll('[data-application-root]').forEach(setupApplication);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setupApplication(root) {
    const dialog = root.closest('dialog');
    const triggers = dialog ? document.querySelectorAll('[data-application-trigger]') : [];
    const prefix = dialog ? 'modal-application' : 'page-application';
    const state = { step: -1, answers: {}, editing: false, sending: false };
    let lastTrigger = null;

    let diagnosticData = null;
    try {
      const stored = localStorage.getItem('klein_diagnostic_result');
      if (stored) {
        diagnosticData = JSON.parse(stored);
        if (diagnosticData.client) {
          if (diagnosticData.client.company && !state.answers.business_name) {
            state.answers.business_name = diagnosticData.client.company;
          }
          if (diagnosticData.client.name && !state.answers.full_name) {
            state.answers.full_name = diagnosticData.client.name;
          }
          if (diagnosticData.client.email && !state.answers.email) {
            state.answers.email = diagnosticData.client.email;
          }
        }
        if (diagnosticData.diagnostics && diagnosticData.diagnostics.primaryConstraint && !state.answers.bottleneck) {
          state.answers.bottleneck = '[Diagnostic Identified Constraint: ' + diagnosticData.diagnostics.primaryConstraint + ']\n' + 
            (diagnosticData.diagnostics.archetypeSummary || '') + 
            '\n\nAdditional notes on what is getting in the way:';
        }
      }
    } catch (e) {
      console.warn('Diagnostic prefill notice:', e);
    }

    if (dialog && triggers.length) {
      triggers.forEach(function (trigger) {
        trigger.addEventListener('click', function (event) {
          if (typeof dialog.showModal !== 'function') return;
          event.preventDefault();
          lastTrigger = trigger;
          dialog.showModal();
          focusTitle();
        });
      });
      dialog.addEventListener('close', function () {
        saveVisibleAnswers();
        if (state.step === 'success') {
          state.step = -1;
          state.answers = {};
          render(false);
        }
        if (lastTrigger) lastTrigger.focus();
      });
    }

    render(false);

    function focusTitle() {
      const title = root.querySelector('.application-title');
      if (title) title.focus({ preventScroll: true });
    }

    function render(focusAfterRender) {
      root.replaceChildren();
      const shell = element('div', 'application-shell');
      const top = element('div', 'application-topline');
      top.appendChild(element('p', 'application-eyebrow', 'Klein Insight | Six-month partnership'));
      if (dialog) {
        const close = element('button', 'application-close', 'Close');
        close.type = 'button';
        close.addEventListener('click', function () { dialog.close(); });
        top.appendChild(close);
      }
      shell.appendChild(top);

      if (diagnosticData && diagnosticData.diagnostics && diagnosticData.diagnostics.primaryConstraint && state.step !== 'success') {
        const diagBanner = element('div', 'application-diagnostic-banner');
        diagBanner.appendChild(element('span', 'application-diagnostic-badge', '✓ Diagnostic Attached'));
        diagBanner.appendChild(element('span', 'application-diagnostic-text', diagnosticData.diagnostics.primaryConstraint));
        shell.appendChild(diagBanner);
      }

      if (typeof state.step === 'number' && state.step >= 0) {
        const progress = element('div', 'application-progress-wrap');
        const isReview = state.step === steps.length;
        progress.appendChild(element('span', 'application-progress-label', isReview ? 'Review your answers' : 'Step ' + (state.step + 1) + ' of ' + steps.length));
        const bar = element('progress', 'application-progress');
        bar.max = steps.length;
        bar.value = isReview ? steps.length : state.step + 1;
        bar.setAttribute('aria-label', 'Application progress');
        progress.appendChild(bar);
        shell.appendChild(progress);
      }

      const title = element(dialog ? 'h2' : 'h1', 'application-title');
      title.id = dialog ? 'application-dialog-title' : 'application-page-title';
      title.tabIndex = -1;
      title.textContent = state.step === -1 ? 'Apply to work with Joe' :
        state.step === 'review' || state.step === steps.length ? 'Review your application' :
        state.step === 'success' ? 'Application sent' : steps[state.step].title;
      shell.appendChild(title);

      if (state.step === -1) renderIntro(shell);
      else if (state.step === steps.length || state.step === 'review') renderReview(shell);
      else if (state.step === 'success') renderSuccess(shell);
      else renderStep(shell, state.step);

      root.appendChild(shell);
      if (focusAfterRender) focusTitle();
    }

    function renderIntro(shell) {
      shell.appendChild(element('p', 'application-intro', 'Tell me where your business stands, what is holding it back, and what you are ready to change. This takes about 5–7 minutes. You will see and edit every answer before submitting.'));
      shell.appendChild(element('p', 'application-supporting', 'This is an application for a six-month partnership, not an enrollment or payment.'));
      const actions = element('div', 'application-actions');
      const start = makeButton('Start application', 'button button-primary application-button');
      start.addEventListener('click', function () { state.step = 0; render(true); });
      actions.appendChild(start);
      shell.appendChild(actions);
    }

    function renderStep(shell, index) {
      const step = steps[index];
      if (step.description) shell.appendChild(element('p', 'application-intro', step.description));
      const form = element('form', 'application-form');
      step.fields.forEach(function (field) { form.appendChild(renderField(field)); });
      const actions = element('div', 'application-actions');
      const back = makeButton('Back', 'button button-secondary application-button');
      back.addEventListener('click', function () {
        saveVisibleAnswers();
        state.step = state.editing ? steps.length : index - 1;
        state.editing = false;
        render(true);
      });
      actions.appendChild(back);
      const next = makeButton(state.editing ? 'Return to review' : index === steps.length - 1 ? 'Review answers' : 'Continue', 'button button-primary application-button');
      next.type = 'submit';
      actions.appendChild(next);
      form.appendChild(actions);
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        saveVisibleAnswers();
        state.step = state.editing ? steps.length : index + 1;
        state.editing = false;
        render(true);
      });
      shell.appendChild(form);
    }

    function renderField(field) {
      const wrap = element('div', 'application-field');
      const id = prefix + '-' + field.name;
      if (field.type === 'rating') {
        const group = element('fieldset', 'application-fieldset');
        group.appendChild(element('legend', 'application-label', field.label));
        if (field.help) group.appendChild(element('p', 'application-help', field.help));
        const options = element('div', 'application-rating');
        for (let number = 1; number <= 10; number += 1) {
          const label = element('label', 'application-rating-option');
          const input = element('input');
          input.type = 'radio';
          input.name = field.name;
          input.value = String(number);
          input.required = !!field.required;
          input.checked = state.answers[field.name] === input.value;
          label.appendChild(input);
          label.appendChild(element('span', '', String(number)));
          options.appendChild(label);
        }
        group.appendChild(options);
        wrap.appendChild(group);
        return wrap;
      }

      const label = element('label', 'application-label', field.label);
      label.htmlFor = id;
      wrap.appendChild(label);
      if (field.help) {
        const help = element('p', 'application-help', field.help);
        help.id = id + '-help';
        wrap.appendChild(help);
      }
      let control;
      if (field.type === 'textarea') {
        control = element('textarea', 'application-control');
        control.rows = field.rows || 4;
      } else if (field.type === 'select') {
        control = element('select', 'application-control');
        const placeholder = element('option', '', 'Select one');
        placeholder.value = '';
        control.appendChild(placeholder);
        field.options.forEach(function (option) {
          const item = element('option', '', option.label);
          item.value = option.value;
          control.appendChild(item);
        });
      } else {
        control = element('input', 'application-control');
        control.type = field.type;
      }
      control.id = id;
      control.name = field.name;
      control.required = !!field.required;
      if (field.autocomplete) control.autocomplete = field.autocomplete;
      if (field.placeholder) control.placeholder = field.placeholder;
      if (field.maxLength) control.maxLength = field.maxLength;
      if (field.help) control.setAttribute('aria-describedby', id + '-help');
      control.value = state.answers[field.name] || '';
      wrap.appendChild(control);
      return wrap;
    }

    function saveVisibleAnswers() {
      if (typeof state.step !== 'number' || state.step < 0 || state.step >= steps.length) return;
      const form = root.querySelector('.application-form');
      if (!form) return;
      steps[state.step].fields.forEach(function (field) {
        const control = form.elements.namedItem(field.name);
        state.answers[field.name] = control ? String(control.value || '').trim() : '';
      });
      if (state.answers.full_name || state.answers.email || state.answers.business_name) {
        try {
          const currentSaved = JSON.parse(localStorage.getItem('klein_contact_details') || '{}');
          if (state.answers.full_name) currentSaved.name = state.answers.full_name;
          if (state.answers.email) currentSaved.email = state.answers.email;
          if (state.answers.business_name) currentSaved.business = state.answers.business_name;
          currentSaved.savedAt = new Date().toISOString();
          localStorage.setItem('klein_contact_details', JSON.stringify(currentSaved));
        } catch (e) { }
      }
    }

    function renderReview(shell) {
      shell.appendChild(element('p', 'application-intro', 'Please check your answers. Select Edit beside any section to change it before submitting.'));
      steps.forEach(function (step, index) {
        const group = element('section', 'application-review-group');
        const heading = element('div', 'application-review-heading');
        heading.appendChild(element('h3', '', step.title));
        const edit = makeButton('Edit', 'application-edit');
        edit.setAttribute('aria-label', 'Edit ' + step.title);
        edit.addEventListener('click', function () {
          state.step = index;
          state.editing = true;
          render(true);
        });
        heading.appendChild(edit);
        group.appendChild(heading);
        const list = element('dl', 'application-review-list');
        step.fields.forEach(function (field) {
          list.appendChild(element('dt', '', field.label));
          list.appendChild(element('dd', '', displayAnswer(field, state.answers[field.name])));
        });
        group.appendChild(list);
        shell.appendChild(group);
      });
      shell.appendChild(element('p', 'application-supporting', 'Submitting does not reserve a place or charge you. I will review the application and contact you if there may be a fit.'));
      const actions = element('div', 'application-actions');
      const back = makeButton('Back', 'button button-secondary application-button');
      back.addEventListener('click', function () { state.step = steps.length - 1; render(true); });
      actions.appendChild(back);
      const submit = makeButton('Submit application', 'button button-primary application-button');
      submit.addEventListener('click', function () { submitApplication(submit, status); });
      actions.appendChild(submit);
      shell.appendChild(actions);
      const status = element('p', 'application-status');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      shell.appendChild(status);
    }

    function displayAnswer(field, raw) {
      if (!raw) return 'Not provided';
      if (field.type === 'rating') return raw + ' out of 10';
      if (field.options) {
        const option = field.options.find(function (item) { return item.value === raw; });
        if (option) return option.label;
      }
      return raw;
    }

    async function submitApplication(button, status) {
      if (state.sending) return;
      for (let index = 0; index < steps.length; index += 1) {
        const incomplete = steps[index].fields.some(function (field) { return field.required && !state.answers[field.name]; });
        if (incomplete) {
          state.step = index;
          state.editing = true;
          render(true);
          return;
        }
      }
      state.sending = true;
      button.disabled = true;
      status.textContent = 'Sending your application…';
      const payload = {
        access_key: ACCESS_KEY,
        subject: 'New Klein Insight Coaching Application',
        from_name: 'Klein Insight Application',
        name: state.answers.full_name,
        email: state.answers.email,
        botcheck: false
      };
      steps.forEach(function (step) {
        step.fields.forEach(function (field) {
          if (field.name === 'full_name' || field.name === 'email') return;
          if (state.answers[field.name]) payload[field.label] = displayAnswer(field, state.answers[field.name]);
        });
      });
      if (diagnosticData && diagnosticData.diagnostics) {
        payload['Diagnostic Constraint'] = diagnosticData.diagnostics.primaryConstraint;
        if (diagnosticData.diagnostics.dimensionBreakdown) {
          payload['Diagnostic Breakdown'] = Object.entries(diagnosticData.diagnostics.dimensionBreakdown).map(function (entry) {
            return entry[0] + ': ' + entry[1] + '%';
          }).join(', ');
        }
      }
      const params = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (key) {
        if (params.has(key)) payload[key] = params.get(key);
      });
      try {
        const response = await fetch(SUBMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error('Application could not be confirmed');
        try {
          localStorage.setItem('klein_contact_details', JSON.stringify({
            name: state.answers.full_name || '',
            email: state.answers.email || '',
            business: state.answers.business_name || '',
            savedAt: new Date().toISOString()
          }));
        } catch (e) { }
        state.step = 'success';
        render(true);
      } catch (error) {
        status.textContent = 'I could not confirm your application was sent. Your answers are still here. Please try again, or email joe@kleininsight.com.';
        button.disabled = false;
      } finally {
        state.sending = false;
      }
    }

    function renderSuccess(shell) {
      shell.appendChild(element('p', 'application-intro', 'Thank you for sharing the details of your business. I will review your answers and reach out by email if there may be a fit.'));
      const actions = element('div', 'application-actions');
      if (dialog) {
        const done = makeButton('Close', 'button button-primary application-button');
        done.addEventListener('click', function () { dialog.close(); });
        actions.appendChild(done);
      } else {
        const home = element('a', 'button button-primary application-button', 'Return to Klein Insight');
        home.href = '/';
        actions.appendChild(home);
      }
      shell.appendChild(actions);
    }

    function makeButton(text, className) {
      const button = element('button', className, text);
      button.type = 'button';
      return button;
    }
  }
}());
