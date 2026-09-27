/* In2ition Media — interactions & motion */
(() => {

  const root = document.documentElement;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap) root.classList.remove('motion', 'intro');
  const motion = root.classList.contains('motion');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* =========================================================
     Content helpers (run with or without motion)
     ========================================================= */

  // "Now booking for <next month>"
  const next = new Date(); next.setDate(1); next.setMonth(next.getMonth() + 1);
  const monthName = next.toLocaleString('en-US', { month: 'long' });
  document.querySelectorAll('[data-booking-month]').forEach(el => (el.textContent = monthName));
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Rolling-text labels: duplicate the text so it can roll up on hover
  document.querySelectorAll('[data-text]').forEach(el => {
    const text = el.dataset.text;
    const wrap = document.createElement('span'); wrap.className = 'r';
    const a = document.createElement('span'); a.textContent = text;
    const b = document.createElement('span'); b.textContent = text; b.setAttribute('aria-hidden', 'true');
    wrap.append(a, b);
    el.textContent = ''; el.append(wrap);
  });

  /* ---- Meta Pixel events ---- */
  const trackEvent = (event, params) => { try { if (window.fbq) window.fbq('track', event, params); } catch (e) {} };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.includes('wa.me/')) trackEvent('Contact', { method: 'whatsapp' });
    else if (href.startsWith('tel:')) trackEvent('Contact', { method: 'phone' });
  });
  if (location.pathname.startsWith('/work/')) trackEvent('ViewContent', { content_name: document.title, content_category: 'Case study' });

  /* ---- Nav: scrolled pill, light-section contrast, hide on scroll down ---- */
  const nav = document.getElementById('nav');
  const lightSections = [...document.querySelectorAll('.section--light')];
  let lastY = window.scrollY;
  const updateNav = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 30);
    const probe = nav.offsetHeight / 2;
    const overLight = lightSections.some(s => {
      const r = s.getBoundingClientRect();
      return r.top <= probe && r.bottom >= probe;
    });
    nav.classList.toggle('is-light', overLight);
    const menuOpen = nav.classList.contains('menu-open');
    const goingDown = y > lastY + 2, goingUp = y < lastY - 2;
    if (!menuOpen && goingDown && y > 500) nav.classList.add('is-hidden');
    if (goingUp || y < 500) nav.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* ---- Mobile menu ---- */
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.getElementById('mobileMenu');
  let lenis = null;
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    nav.classList.toggle('menu-open', open);
    nav.classList.remove('is-hidden');
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
    if (motion && open) {
      gsap.fromTo('.mobile-menu nav a', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .8, ease: 'expo.out', stagger: .06, delay: .25 });
    }
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });

  /* ---- Hover-to-scroll browser frames ---- */
  const scrollFrames = [...document.querySelectorAll('[data-scroll]')];
  const setShift = frame => {
    const vp = frame.querySelector('.browser__viewport');
    const img = vp.querySelector('img');
    const shift = Math.max(0, img.offsetHeight - vp.offsetHeight);
    img.style.setProperty('--shift', `-${shift}px`);
    img.style.transitionDuration = `${Math.min(12, Math.max(4, shift / 700))}s`; // consistent speed
  };
  scrollFrames.forEach(f => {
    const img = f.querySelector('img');
    if (img.complete) setShift(f); else img.addEventListener('load', () => setShift(f));
  });
  window.addEventListener('resize', () => scrollFrames.forEach(setShift));

  /* ---- Project form → /api/contact (Turnstile-protected email) ---- */
  const form = document.getElementById('projectForm');
  if (form) {
    const note = form.querySelector('.form__note');
    const noteDefault = note.innerHTML;
    const submitBtn = form.querySelector('button[type="submit"]');
    const captcha = form.querySelector('[data-turnstile]');
    let widgetId = null;

    // Load Turnstile only when the form is close, so it never slows down the first page load
    const loadTurnstile = () => {
      if (!captcha || window.__turnstileRequested) return;
      window.__turnstileRequested = true;
      window.onTurnstileLoad = () => {
        widgetId = window.turnstile.render(captcha, { sitekey: captcha.dataset.sitekey, theme: 'light', appearance: 'interaction-only' });
      };
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
      s.async = true; s.defer = true;
      document.head.append(s);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { loadTurnstile(); io.disconnect(); } }, { rootMargin: '600px' });
      io.observe(form);
    } else loadTurnstile();
    form.addEventListener('focusin', loadTurnstile, { once: true });

    const setNote = (html, isError) => { note.innerHTML = html; note.classList.toggle('is-error', !!isError); };
    const waLink = '<a href="https://wa.me/5926922647" target="_blank" rel="noopener">message us on WhatsApp</a>';

    form.addEventListener('submit', async e => {
      e.preventDefault();
      let firstBad = null;
      form.querySelectorAll('[required]').forEach(input => {
        const bad = !input.value.trim();
        input.classList.toggle('is-invalid', bad);
        input.setAttribute('aria-invalid', String(bad));
        if (bad && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); setNote('Please fill in the highlighted fields.', true); return; }

      const data = new FormData(form);
      if (!data.get('cf-turnstile-response')) {
        loadTurnstile();
        setNote('Just a moment, we\'re checking you\'re not a robot. Then press send again.', true);
        return;
      }

      submitBtn.disabled = true; submitBtn.classList.add('is-loading');
      setNote('Sending…');
      try {
        const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        const out = await res.json().catch(() => ({}));
        if (res.ok && out.ok) {
          trackEvent('Lead', { content_name: 'Project form', content_category: data.get('type') || '', budget: data.get('budget') || '' });
          [...form.children].forEach(el => { if (!el.classList.contains('form__success')) el.hidden = true; });
          const ok = form.querySelector('.form__success');
          ok.hidden = false; ok.focus();
          if (motion) gsap.from(ok, { opacity: 0, y: 20, duration: .8, ease: 'expo.out' });
          return;
        }
        if (out.error === 'verification') setNote('We couldn\'t verify you\'re not a robot. Please try again, or ' + waLink + '.', true);
        else setNote('Sorry, something went wrong sending your details. Please try again, or ' + waLink + '.', true);
      } catch {
        setNote('You seem to be offline. Please try again, or ' + waLink + '.', true);
      } finally {
        submitBtn.disabled = false; submitBtn.classList.remove('is-loading');
        if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
      }
    });
    form.querySelectorAll('[required]').forEach(i => i.addEventListener('input', () => {
      i.classList.remove('is-invalid'); i.removeAttribute('aria-invalid');
      if (note.classList.contains('is-error')) setNote(noteDefault);
    }));
  }

  if (!motion) {
    try { sessionStorage.setItem('i2m-intro', '1'); } catch (e) {}
    return;
  }

  /* =========================================================
     Motion
     ========================================================= */
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();

  /* ---- Smooth scrolling ---- */
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        const target = id === '#top' || id === '#' ? 0 : document.querySelector(id);
        if (target === null) return;
        e.preventDefault();
        lenis.scrollTo(target, { duration: 1.6, offset: target && target.tagName !== 'SECTION' ? -110 : 0 });
      });
    });
  }

  /* ---- Scroll progress ---- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  /* ---- Split helpers ---- */
  // Wrap each word in a mask so it can slide up; keeps <em> and other inline tags intact.
  const splitWords = el => {
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.append(document.createTextNode(' ')); return; }
            const outer = document.createElement('span'); outer.className = 'sw';
            const inner = document.createElement('span'); inner.textContent = p;
            outer.append(inner); frag.append(outer);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
    return el.querySelectorAll('.sw > span');
  };

  /* ---- Hero title: word-by-word ---- */
  // The full word-by-word reveal only runs behind the desktop intro curtain.
  // Everywhere else (phones, repeat visits, inner pages) the headline is shown immediately
  // so the page is readable as soon as it loads.
  const hasIntro = root.classList.contains('intro') && !!document.querySelector('.loader');
  const title = hasIntro ? document.querySelector('.hero__title') : null;
  if (title) {
    const lines = title.querySelectorAll('.line__inner');
    lines.forEach((line, i) => {
      if (i < lines.length - 1) {
        line.innerHTML = line.textContent.trim().split(/\s+/).map(w => `<span class="hw">${w}</span>`).join(' ');
      } else {
        line.classList.add('hw'); // the rotating line moves as one piece
      }
    });
    gsap.set('.hero__title .hw', { yPercent: 115, rotate: 4, transformOrigin: '0% 100%' });
    title.classList.add('is-ready');
  }
  gsap.set('[data-hero-fade]', hasIntro ? { opacity: 0, y: 24 } : { y: 18 });

  // Homepage: title words rise, then the rest fades in. Other pages: just the fade.
  const heroTl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  if (title) heroTl.to('.hero__title .hw', { yPercent: 0, rotate: 0, duration: 1.4, stagger: .06 });
  heroTl.to('[data-hero-fade]', { opacity: 1, y: 0, duration: .9, stagger: .07 }, title ? .25 : 0);
  if (document.querySelector('.hero__glow')) {
    heroTl.from('.hero__glow', { opacity: 0, scale: .6, duration: 2.2, ease: 'power2.out' }, 0)
      .from('.hero__grid', { opacity: 0, duration: 2 }, .2);
  }
  if (document.querySelector('.rotator')) heroTl.add(() => startRotator(), title ? 1.4 : .6);

  /* ---- Rotating phrase ---- */
  function startRotator() {
    const items = [...document.querySelectorAll('.rotator__item')];
    if (items.length < 2) return;
    let i = 0;
    gsap.set(items, { y: 0, yPercent: 110 }); gsap.set(items[0], { yPercent: 0 });
    const cycle = () => {
      const cur = items[i], nxt = items[(i + 1) % items.length];
      gsap.to(cur, { yPercent: -110, duration: .8, ease: 'expo.inOut' });
      gsap.fromTo(nxt, { yPercent: 110 }, { yPercent: 0, duration: .8, ease: 'expo.inOut' });
      cur.classList.remove('is-active'); nxt.classList.add('is-active');
      i = (i + 1) % items.length;
      gsap.delayedCall(2.8, cycle);
    };
    gsap.delayedCall(2.4, cycle);
  }

  /* ---- Intro curtain ---- */
  const startPage = () => {
    root.classList.remove('intro');
    try { sessionStorage.setItem('i2m-intro', '1'); } catch (e) {}
    heroTl.play();
  };
  if (hasIntro) {
    if (lenis) lenis.stop();
    const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1200))]);
    gsap.timeline()
      .from('.loader__logo', { opacity: 0, y: 20, scale: .92, duration: .8, ease: 'expo.out' })
      .to('.loader__bar span', { scaleX: 1, duration: .9, ease: 'power2.inOut' }, .1)
      .add(() => fontsReady)
      .to('.loader__inner', { opacity: 0, y: -20, duration: .4, ease: 'power2.in' })
      .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'expo.inOut' }, '-=.1')
      .add(() => { if (lenis) lenis.start(); heroTl.play(); }, '-=.55')
      .add(() => { document.querySelector('.loader').remove(); startPage(); });
  } else {
    root.classList.remove('intro');
    heroTl.play();
  }

  /* ---- Hero: cursor-following glow + grid spotlight ---- */
  const hero = document.querySelector('.hero');
  if (finePointer && hero) {
    const proxy = { x: 72, y: 22 };
    const apply = () => { hero.style.setProperty('--mx', proxy.x + '%'); hero.style.setProperty('--my', proxy.y + '%'); };
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      gsap.to(proxy, { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, duration: 1.2, ease: 'power3.out', onUpdate: apply, overwrite: true });
    });
  }

  /* ---- Showcase: cards rise in, then the featured site zooms to fill the screen ---- */
  mm.add('(min-width: 861px)', () => {
    const c1 = document.querySelector('.stage-card--1');
    const c2 = document.querySelector('.stage-card--2');
    const c3 = document.querySelector('.stage-card--3');
    if (!c2) return;
    const heroImg = c2.querySelector('.browser__viewport img');
    const caption = c2.querySelector('.stage-caption');
    const stage = document.querySelector('.showcase__stage');

    const fillScale = () => {
      const w = c2.offsetWidth, h = c2.querySelector('.browser').offsetHeight;
      return Math.min((window.innerWidth * .94) / w, (window.innerHeight * .9) / h);
    };
    const imgShift = () => {
      const vp = c2.querySelector('.browser__viewport');
      return -Math.max(0, heroImg.offsetHeight - vp.offsetHeight) * .32;
    };

    gsap.set([c1, c2, c3], { xPercent: -50, yPercent: -50, x: 0, y: 0 });
    gsap.set(c2, { scale: .74, rotationX: 22, transformPerspective: 1800, transformOrigin: '50% 100%', y: () => window.innerHeight * .28 });
    gsap.set(c1, { x: () => -window.innerWidth * .27, y: () => window.innerHeight * .42, scale: .56, rotation: -7, opacity: 0 });
    gsap.set(c3, { x: () => window.innerWidth * .27, y: () => window.innerHeight * .42, scale: .56, rotation: 7, opacity: 0 });
    gsap.set(caption, { opacity: 0, y: 10 });

    // 1) While the hero scrolls away, the cards rise and flatten
    gsap.timeline({ scrollTrigger: { trigger: '.showcase', start: 'top bottom', end: 'top top', scrub: 1, invalidateOnRefresh: true } })
      .to(c2, { rotationX: 0, y: 0, scale: .74, ease: 'none' }, 0)
      .to([c1, c3], { y: () => window.innerHeight * .06, opacity: .5, ease: 'none' }, 0);

    // 2) Pinned: the featured site zooms to full screen and scrolls itself
    gsap.timeline({ scrollTrigger: { trigger: '.showcase', start: 'top top', end: '+=140%', pin: true, scrub: 1, invalidateOnRefresh: true } })
      .to(c1, { x: () => -window.innerWidth * .7, rotation: -14, opacity: 0, ease: 'power2.in' }, 0)
      .to(c3, { x: () => window.innerWidth * .7, rotation: 14, opacity: 0, ease: 'power2.in' }, 0)
      .to(c2, { scale: fillScale, ease: 'power2.inOut', duration: .7 }, 0)
      .to(heroImg, { y: imgShift, ease: 'none', duration: 1 }, .15)
      .to(caption, { opacity: 1, y: 0, duration: .2 }, .75);

    // Subtle 3D tilt that follows the mouse
    let onMove;
    if (finePointer) {
      onMove = e => {
        const dx = e.clientX / window.innerWidth - .5, dy = e.clientY / window.innerHeight - .5;
        gsap.to(stage, { rotationY: dx * 6, rotationX: -dy * 5, transformPerspective: 1600, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
      };
      window.addEventListener('pointermove', onMove);
    }
    return () => { if (onMove) window.removeEventListener('pointermove', onMove); gsap.set(stage, { clearProps: 'transform' }); };
  });

  mm.add('(max-width: 860px)', () => {
    gsap.from('.showcase__stage', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.showcase', start: 'top 85%', once: true } });
  });

  /* ---- Marquee: drifts on its own, speeds up and leans with scroll velocity ---- */
  const track = document.querySelector('.marquee__track');
  if (track) {
    track.classList.add('is-js');
    let pos = 0, dir = 1, boost = 0;
    const skew = gsap.quickTo(track, 'skewX', { duration: .5, ease: 'power3.out' });
    gsap.ticker.add((time, dt) => {
      pos -= 0.00125 * dt * (1 + boost) * dir;
      if (pos <= -50) pos += 50;
      if (pos > 0) pos -= 50;
      gsap.set(track, { xPercent: pos });
      boost *= .94;
    });
    ScrollTrigger.create({
      trigger: '.clients', start: 'top bottom', end: 'bottom top',
      onUpdate: self => {
        const v = self.getVelocity();
        boost = Math.min(Math.abs(v) / 250, 10);
        dir = v < 0 ? -1 : 1;
        skew(gsap.utils.clamp(-8, 8, -v / 300));
      },
      onToggle: self => { if (!self.isActive) skew(0); },
    });
    ScrollTrigger.addEventListener('scrollEnd', () => skew(0));
  }

  /* ---- Section titles: word reveal ---- */
  document.querySelectorAll('[data-split]').forEach(el => {
    const words = splitWords(el);
    gsap.set(words, { yPercent: 110 });
    gsap.to(words, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: .04, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });

  /* ---- Generic fade-ups (batched, staggered) ---- */
  const fadeTargets = document.querySelectorAll('.eyebrow, .section-note, .project__info > *, .process__list li, .about p, .contact__intro > p, .contact__direct, .availability--light, .form, .clients__label, .prose > *, .highlight, .post-card, .case-quote, .next-case, .cta-band__inner > *');
  gsap.set(fadeTargets, { opacity: 0, y: 30 });
  ScrollTrigger.batch(fadeTargets, {
    start: 'top 90%', once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .05 }),
  });

  /* ---- Services rows slide in ---- */
  gsap.from('.service', { opacity: 0, x: -30, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '.services__list', start: 'top 85%', once: true } });

  /* ---- Projects: mask reveal + inner zoom + phone parallax ---- */
  document.querySelectorAll('.project').forEach(p => {
    const frame = p.querySelector('.browser');
    const vp = p.querySelector('.browser__viewport');
    const phone = p.querySelector('.phone');
    gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 80%', once: true } })
      .fromTo(frame, { clipPath: 'inset(16% 12% 16% 12% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath' })
      .fromTo(vp, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.2)
      .fromTo(phone, { opacity: 0, rotation: 6 }, { opacity: 1, rotation: 0, duration: 1.2, ease: 'expo.out' }, .7);
    gsap.fromTo(phone, { y: 100 }, { y: -40, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // On touch screens there's no hover, so auto-scroll each site preview while it's in view
  if (!finePointer) {
    scrollFrames.forEach(f => ScrollTrigger.create({ trigger: f, start: 'top 70%', end: 'bottom 20%', toggleClass: 'is-auto' }));
  }

  /* ---- Reviews: score counts up, stars fill, cards rise, highlights sweep ---- */
  const scoreEl = document.querySelector('[data-count]');
  if (scoreEl) {
    const counter = { v: 0 };
    gsap.to(counter, {
      v: parseFloat(scoreEl.dataset.count), duration: 1.6, ease: 'power3.out',
      onUpdate: () => (scoreEl.textContent = counter.v.toFixed(1)),
      scrollTrigger: { trigger: '.rating-card', start: 'top 85%', once: true },
    });
  }
  document.querySelectorAll('.reviews .stars').forEach(group => {
    ScrollTrigger.create({ trigger: group, start: 'top 88%', once: true, onEnter: () => group.classList.add('is-filled') });
  });
  gsap.set('.review', { opacity: 0, y: 60, rotate: gsap.utils.wrap([-1.5, 1.5]) });
  ScrollTrigger.batch('.review', {
    start: 'top 88%', once: true,
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, rotate: 0, duration: 1.2, ease: 'expo.out', stagger: .12,
      onStart() { batch.forEach(el => setTimeout(() => el.classList.add('is-in'), 250)); },
    }),
  });
  gsap.utils.toArray('.review').forEach((card, i) => {
    gsap.fromTo(card, { yPercent: 0 }, { yPercent: i % 2 ? -8 : -3, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---- Statement: words light up as you scroll ---- */
  const statement = document.querySelector('[data-reveal-words]');
  if (statement) {
    statement.innerHTML = statement.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
    gsap.to(statement.querySelectorAll('.w'), {
      opacity: 1, stagger: .05, ease: 'none',
      scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  }

  /* ---- Footer: big CTA slides in ---- */
  gsap.fromTo('.footer__cta-text', { xPercent: -12 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'center center', scrub: 1 } });
  gsap.fromTo('.footer__cta-arrow', { rotation: -180, scale: .6 }, { rotation: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'center center', scrub: 1 } });

  /* ---- Custom cursor + magnetic buttons (mouse only) ---- */
  if (finePointer) {
    const cursor = document.querySelector('.cursor');
    const cx = gsap.quickTo(cursor, 'x', { duration: .35, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: .35, ease: 'power3.out' });
    window.addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); cursor.classList.remove('is-hidden'); });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerover', e => {
      const view = e.target.closest('[data-cursor="view"]');
      const link = e.target.closest('a, button, label, [data-magnetic], .service');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !view && !!link);
    });

    document.querySelectorAll('[data-magnetic]').forEach(el => {
      const strength = el.classList.contains('footer__cta') ? .12 : .3;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * strength, y: (e.clientY - r.top - r.height / 2) * strength, duration: .5, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .4)' }));
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
