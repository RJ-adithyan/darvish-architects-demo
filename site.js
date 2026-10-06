function nextShowcasePosition(positions, current, direction, maximum) {
  const stops = positions.map(position => Math.max(0, Math.min(maximum, position)));
  return direction > 0
    ? (stops.find(position => position > current + 1) ?? maximum)
    : ([...stops].reverse().find(position => position < current - 1) ?? 0);
}

function heroScrollState(distance, viewportHeight, reducedMotion = false) {
  const progress = reducedMotion ? 0 : Math.max(0, Math.min(1, distance / (Math.max(1, viewportHeight) * .8)));
  return {
    progress,
    opacity: 1 - progress,
    blur: progress * 5,
    lift: progress * 18,
    planShift: reducedMotion ? 0 : Math.max(0, Math.min(distance, viewportHeight)) * .6,
    planOpacity: .34 + progress * .16
  };
}


if (typeof module !== 'undefined') module.exports = { nextShowcasePosition, heroScrollState };

if (typeof document !== 'undefined') (() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const film = document.querySelector('[data-hero-film]');
  if (film) {
    const phone = window.matchMedia('(max-width: 767px)');
    let inView = true;
    let unavailable = false;
    film.loop = true;
    const playFilm = () => {
      film.play().catch(() => { film.classList.remove('is-ready'); });
    };
    const configureFilm = () => {
      if (motion.matches || navigator.connection?.saveData) {
        film.pause();
        film.removeAttribute('src');
        film.load();
        film.classList.remove('is-ready');
        return;
      }
      if (unavailable) return;
      const source = phone.matches ? film.dataset.mobileSrc : film.dataset.desktopSrc;
      if (inView && !document.hidden && film.getAttribute('src') !== source) {
        film.classList.remove('is-ready');
        film.src = source;
        film.muted = true;
      }
      if (inView && !document.hidden) playFilm();
    };
    film.addEventListener('playing', () => { film.classList.add('is-ready'); });
    film.addEventListener('error', () => {
      unavailable = true;
      film.classList.remove('is-ready');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) film.pause();
      else configureFilm();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        if (!inView) film.pause();
        else configureFilm();
      }, { threshold: 0 }).observe(film.parentElement);
    }
    motion.addEventListener('change', configureFilm);
    phone.addEventListener('change', configureFilm);
    configureFilm();
  }
  const craftFilm = document.querySelector('[data-craft-film]');
  if (craftFilm) {
    let visible = !('IntersectionObserver' in window);
    let failed = false;
    const syncCraftFilm = () => {
      if (motion.matches || navigator.connection?.saveData) {
        craftFilm.pause();
        craftFilm.removeAttribute('src');
        craftFilm.load();
        craftFilm.classList.remove('is-ready');
      } else if (visible && !document.hidden && !failed) {
        if (!craftFilm.getAttribute('src')) craftFilm.src = craftFilm.dataset.src;
        craftFilm.muted = true;
        craftFilm.play().catch(() => craftFilm.classList.remove('is-ready'));
      } else craftFilm.pause();
    };
    craftFilm.addEventListener('playing', () => craftFilm.classList.add('is-ready'));
    craftFilm.addEventListener('error', () => { failed = true; craftFilm.classList.remove('is-ready'); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncCraftFilm(); }, { threshold: .01 }).observe(craftFilm.parentElement);
    }
    document.addEventListener('visibilitychange', syncCraftFilm);
    motion.addEventListener('change', syncCraftFilm);
    syncCraftFilm();
  }
  const hero = document.querySelector('.home-hero');
  if (hero) {
    const intro = hero.querySelector('.hero-main');
    const action = intro.querySelector('.button-link');
    let frame = 0;
    let start = 0;
    const paintHero = () => {
      frame = 0;
      const enabled = !motion.matches && intro.offsetHeight <= window.innerHeight * 1.2;
      const state = heroScrollState(window.scrollY - start, window.innerHeight, !enabled);
      hero.classList.toggle('hero-scroll-ready', enabled);
      hero.style.setProperty('--hero-opacity', state.opacity);
      hero.style.setProperty('--hero-blur', state.blur + 'px');
      hero.style.setProperty('--hero-lift', -state.lift + 'px');
      hero.style.setProperty('--hero-plan-shift', state.planShift + 'px');
      hero.style.setProperty('--hero-plan-opacity', state.planOpacity);
      intro.classList.toggle('hero-intro-hidden', state.progress >= .85);
      if (action) {
        if (state.progress >= .85) action.setAttribute('tabindex', '-1');
        else action.removeAttribute('tabindex');
      }
    };
    const scheduleHero = () => {
      if (!frame) frame = requestAnimationFrame(paintHero);
    };
    const measureHero = () => {
      start = hero.getBoundingClientRect().top + window.scrollY;
      scheduleHero();
    };
    window.addEventListener('scroll', scheduleHero, { passive: true });
    window.addEventListener('resize', measureHero);
    window.addEventListener('pageshow', measureHero);
    motion.addEventListener('change', measureHero);
    intro.addEventListener('focusin', () => {
      if (window.scrollY > start + window.innerHeight * .25) {
        window.scrollTo({ top: start, behavior: 'instant' });
      }
    });
    document.fonts?.ready.then(measureHero);
    measureHero();
  }
  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    const trigger = menu.querySelector('summary');
    const background = [document.querySelector('main'), document.querySelector('.closing-cta'), document.querySelector('footer'), document.querySelector('.site-header .wordmark')].filter(Boolean);
    menu.addEventListener('toggle', () => {
      trigger.setAttribute('aria-expanded', String(menu.open));
      document.body.classList.toggle('menu-is-open', menu.open);
      background.forEach(element => { element.inert = menu.open; });
    });
    menu.addEventListener('keydown', event => {
      if (!menu.open) return;
      if (event.key === 'Escape') { event.preventDefault(); menu.open = false; trigger.focus(); }
      if (event.key === 'Tab') {
        const links = [...menu.querySelectorAll('summary, a[href]')];
        if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); links.at(-1).focus(); }
        if (!event.shiftKey && document.activeElement === links.at(-1)) { event.preventDefault(); links[0].focus(); }
      }
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
    window.matchMedia('(min-width: 768px)').addEventListener('change', event => { if (event.matches) menu.open = false; });
  }

  const work = document.querySelector('[data-work]');
  if (work) {
    const filters = [...work.querySelectorAll('[data-work-category-filter]')];
    const categories = filters.map(link => link.dataset.workCategoryFilter);
    const render = () => {
      const value = new URLSearchParams(location.search).get('category') || 'all';
      const category = categories.find(item => item.toLowerCase() === value.toLowerCase()) || 'all';
      work.querySelectorAll('[data-work-project]').forEach(item => { item.hidden = category !== 'all' && item.dataset.category !== category; });
      filters.forEach(link => {
        if (link.dataset.workCategoryFilter === category) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };
    filters.forEach(link => link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (link.href !== location.href) history.pushState(null, '', link.href);
      render();
    }));
    window.addEventListener('popstate', render);
    render();
  }

  document.querySelectorAll('[data-showcase]').forEach(showcase => {
    const track = showcase.querySelector('[data-showcase-track]');
    const cards = [...showcase.querySelectorAll('[data-showcase-card]')];
    const previous = showcase.querySelector('[data-showcase-prev]');
    const next = showcase.querySelector('[data-showcase-next]');
    if (!track || !cards.length || !previous || !next) return;
    // Featured width stays independent of scroll position, so swipes never resize the track.
    cards[Math.min(1, cards.length - 1)].classList.add('is-featured');
    const syncControls = () => {
      previous.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
    };
    const move = direction => {
      const viewport = track.getBoundingClientRect();
      const positions = cards.map(card => {
        const box = card.getBoundingClientRect();
        return track.scrollLeft + box.left + box.width / 2 - viewport.left - track.clientWidth / 2;
      });
      track.scrollTo({ left: nextShowcasePosition(positions, track.scrollLeft, direction, track.scrollWidth - track.clientWidth), behavior: motion.matches ? 'instant' : 'smooth' });
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('scroll', syncControls, { passive: true });
    window.addEventListener('resize', syncControls);
    syncControls();
  });

  if (!motion.matches && 'IntersectionObserver' in window && Element.prototype.animate) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (motion.matches) return;
        const image = entry.target.dataset.reveal === 'image';
        entry.target.animate([{ opacity: .12, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: image ? 750 : 550, easing: 'cubic-bezier(.2,.7,.2,1)' });
        if (image) entry.target.querySelector('img')?.animate([{ transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 850, easing: 'cubic-bezier(.2,.7,.2,1)' });
      });
    }, { threshold: .13 });
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    motion.addEventListener('change', event => { if (event.matches) { observer.disconnect(); document.getAnimations().forEach(animation => animation.cancel()); } });
  }
})();
// THEME PACK START
/* Pack 8 motion: day and dusk toggle, italic last word, rules that draw across, timeline that rises in order. */
if (typeof document !== 'undefined' && document.documentElement && typeof window !== 'undefined' && window.addEventListener) {
  (() => {
    const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    // 1. The last word of each big heading turns italic.
    const italicise = heading => {
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      let last = null;
      while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) last = walker.currentNode;
      if (!last) return;
      const match = last.nodeValue.match(/(\S+)\s*$/);
      if (!match) return;
      const tail = last.splitText(match.index);
      const em = document.createElement('em');
      em.className = 'tn-it';
      tail.parentNode.insertBefore(em, tail);
      em.appendChild(tail);
    };
    all('h1.display, .hero-main h1, h2.heading[data-reveal="text"]')
      .filter(el => !el.closest('.fl-principle, .fl-process-step, .fl-contact-panel, .service-staircase, .fl-next-project'))
      .forEach(italicise);

    // 2. Day to dusk toggle on the home hero. The CSS animation plays the first dusk; the button swaps back and forth.
    const hero = document.querySelector('.home-hero');
    if (hero) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tn-sun';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Show the building in daylight');
      button.innerHTML =
        '<svg class="tn-sunicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>' +
        '<svg class="tn-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
      hero.appendChild(button);
      let day = false;
      button.addEventListener('click', () => {
        day = !day;
        hero.style.animation = 'none';
        hero.style.setProperty('--tn-dusk', day ? '0' : '1');
        button.setAttribute('aria-pressed', String(day));
        button.setAttribute('aria-label', day ? 'Show the building at dusk' : 'Show the building in daylight');
      });
    }

    // 3. Rules draw across and timeline years rise in order, once each section is in view.
    const armed = all('.craft-heading, .showcase-heading .heading, .home-services .heading, .origin-copy .heading, .fl-page-intro .display, .fl-about-intro .display, .fl-services-intro .heading, .fl-contact-copy .display, .fl-project-heading .display, .closing-cta .heading, .fl-image-hero .display, .hero-main h1');
    const lists = all('.service-staircase');
    if ('IntersectionObserver' in window && !reduce) {
      const io = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('tn-seen');
        io.unobserve(entry.target);
      }), { threshold: .15 });
      armed.forEach(el => { el.classList.add('tn-armed'); io.observe(el); });
      lists.forEach(list => {
        list.classList.add('tn-armed-list');
        all(':scope > li', list).forEach((item, index) => item.style.setProperty('--i', index));
        io.observe(list);
      });
    }
  })();
}
// THEME PACK END

// DARVISH LAYER START: "Jaali and Dusk" (design brief v2, items 2-9).
// Guarded per the Pack Contract: check-media.cjs runs this file in a fake VM and check-motion.cjs requires it in Node.
// Everything here is decoration on top of content that already shows without JS.
(function () {
  if (typeof document === 'undefined' || !document.documentElement || !document.body || typeof window === 'undefined' || !window.addEventListener || !window.matchMedia) return;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var still = reduce.matches;
  var hasIO = 'IntersectionObserver' in window;
  var all = function (selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); };
  var make = function (tag, className) { var el = document.createElement(tag); el.className = className; el.setAttribute('aria-hidden', 'true'); return el; };
  var onceInView = function (targets, threshold, callback) {
    if (!hasIO) { targets.forEach(callback); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        callback(entry.target);
      });
    }, { threshold: threshold });
    targets.forEach(function (target) { io.observe(target); });
  };
  if (!still && hasIO) root.classList.add('dv-js');

  // The dusk film is the hero now, so pack 8's day/dusk button goes.
  all('.tn-sun').forEach(function (button) { button.remove(); });

  // Is this element painted on navy? Walk up to the first opaque background; the page body is navy.
  var isDark = function (element) {
    for (var node = element; node && node.nodeType === 1; node = node.parentElement) {
      var colour = getComputedStyle(node).backgroundColor || '';
      var parts = colour.match(/[\d.]+/g);
      if (!parts || parts.length < 3) continue;
      var scale = colour.indexOf('color(') === 0 ? 255 : 1;
      if (parts.length > 3 && +parts[3] <= .5) continue;
      return (0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]) * scale / 255 < .4;
    }
    return true;
  };
  var sections = all('main > section, .closing-cta');
  if (sections.length < 3) sections = []; // ponytail: pages with only the closing CTA get no lone 'I' label

  // 3. Section labels: column glyph, Roman numeral, name, written into the heading (hidden from screen readers).
  var byId = { 'showcase-title': 'The work', 'services-title': 'Services', 'work-title': 'The work', 'studio-title': 'The studio', 'studio-statement-title': 'Philosophy', 'process-title': 'Approach', 'approach-title': 'Method', 'contact-title': 'Contact' }; // Project story sections already carry pack 8's large numerals.
  var byClass = [['craft-section', 'Materials'], ['home-origin', 'The studio'], ['closing-cta', 'Enquire']];
  var roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  var count = 0;
  sections.forEach(function (section) {
    var id = section.getAttribute('aria-labelledby');
    var name = id && byId[id];
    byClass.forEach(function (pair) { if (!name && section.classList.contains(pair[0])) name = pair[1]; });
    var heading = (id && document.getElementById(id)) || section.querySelector('h2.heading, h1.display');
    if (!name || !heading || heading.querySelector('.dv-label') || count >= roman.length) return;
    var label = make('span', 'dv-label');
    label.innerHTML = '<span class="dv-num"></span><span class="dv-dot">·</span><span class="dv-name"></span>';
    label.querySelector('.dv-num').textContent = roman[count++];
    label.querySelector('.dv-name').textContent = name;
    if (isDark(heading)) label.classList.add('dv-on-dark');
    if (getComputedStyle(heading).textAlign === 'center') label.classList.add('dv-center');
    heading.insertBefore(label, heading.firstChild);
  });

  // 5. Colonnade divider at the top of each section after the first, columns rising left to right.
  var first = document.querySelector('main') && document.querySelector('main').firstElementChild;
  sections.forEach(function (section) {
    if (section === first || section.classList.contains('container') || !(section.classList.contains('section') || section.classList.contains('closing-cta'))) return;
    var row = make('div', 'dv-colonnade');
    for (var i = 0; i < 25; i++) { var column = document.createElement('i'); column.style.setProperty('--i', i); row.appendChild(column); }
    if (isDark(section)) row.classList.add('dv-on-dark');
    section.classList.add('dv-colonnade-host');
    section.insertBefore(row, section.firstChild);
    if (!still && hasIO) {
      row.classList.add('dv-armed');
      onceInView([row], .6, function (target) { target.classList.add('dv-seen'); });
    }
  });

  // 4. Photos open through a jaali lattice. The master fade starts at 12% opacity and would hide the lattice, so it is cancelled here.
  if (!still && hasIO) {
    var veiled = all('[data-reveal="image"]');
    veiled.forEach(function (frame) { frame.classList.add('dv-veil'); });
    onceInView(veiled, .15, function (frame) {
      if (frame.getAnimations) frame.getAnimations().forEach(function (animation) { animation.cancel(); });
      requestAnimationFrame(function () { requestAnimationFrame(function () { frame.classList.add('dv-open'); }); });
      setTimeout(function () { frame.classList.remove('dv-veil', 'dv-open'); }, 1050);
    });
  }

  // 8. Facts band: unit and plus sign styled apart, numbers count up once.
  var facts = document.querySelector('.dv-facts');
  if (facts) {
    var format = function (value) { return Math.round(value).toLocaleString('en-IN'); };
    all('.dv-fact', facts).forEach(function (fact, index) { fact.style.setProperty('--i', index); });
    var counters = all('.dv-fact-num[data-count]', facts).map(function (number) {
      var target = Number(number.getAttribute('data-count')) || 0;
      var suffix = number.getAttribute('data-suffix') || '';
      var value = document.createElement('span');
      value.className = 'dv-value';
      value.textContent = format(target);
      number.textContent = '';
      number.appendChild(value);
      if (suffix) {
        var tail = document.createElement('span');
        tail.className = suffix.trim() === '+' ? 'dv-plus' : 'dv-unit';
        tail.textContent = suffix;
        number.appendChild(tail);
      }
      return { value: value, target: target };
    });
    if (still || !hasIO) facts.classList.add('dv-seen');
    else onceInView([facts], .35, function () {
      facts.classList.add('dv-seen');
      counters.forEach(function (counter, index) {
        var start = null;
        var step = function (time) {
          if (start === null) start = time + index * 120;
          var progress = Math.max(0, Math.min(1, (time - start) / 1700));
          counter.value.textContent = format(counter.target * (1 - Math.pow(1 - progress, 4)));
          if (progress < 1) requestAnimationFrame(step);
        };
        counter.value.textContent = format(0);
        requestAnimationFrame(step);
      });
    });
  }

  // 7. Lamp cursor: a soft blue-white glow follows a mouse across navy sections. Fine pointer only.
  if (!still && window.matchMedia('(pointer: fine)').matches) {
    all('.home-hero, main > section, .closing-cta, .site-footer').filter(isDark).forEach(function (host) {
      var lamp = make('span', 'dv-lamp');
      host.classList.add('dv-lamp-host');
      host.insertBefore(lamp, host.firstChild);
      var frame = 0, x = 0, y = 0;
      host.addEventListener('pointermove', function (event) {
        if (event.pointerType && event.pointerType !== 'mouse') return;
        var box = host.getBoundingClientRect();
        x = event.clientX - box.left;
        y = event.clientY - box.top;
        host.classList.add('dv-lit');
        if (!frame) frame = requestAnimationFrame(function () {
          frame = 0;
          host.style.setProperty('--dv-x', x + 'px');
          host.style.setProperty('--dv-y', y + 'px');
        });
      }, { passive: true });
      host.addEventListener('pointerleave', function () { host.classList.remove('dv-lit'); });
    });
  }

  // 9. If reduced motion switches on mid-visit, settle everything in its final state.
  reduce.addEventListener && reduce.addEventListener('change', function (event) {
    if (!event.matches) return;
    root.classList.remove('dv-js');
    all('.dv-colonnade').forEach(function (row) { row.classList.remove('dv-armed'); });
    all('.dv-veil').forEach(function (frame) { frame.classList.remove('dv-veil', 'dv-open'); });
    all('.dv-lit').forEach(function (host) { host.classList.remove('dv-lit'); });
    if (facts) facts.classList.add('dv-seen');
  });
})();
// DARVISH LAYER END
