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
