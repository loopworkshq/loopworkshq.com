// Loopworks: email links, reveals, the header ink per chapter, the live ad preview (drawn by ad.js),
// the contact bar and the photo strip. Everything on the page works without this file
// except the live preview, which then shows its sample.

(() => {
  const MAIL = 'hello@loopworkshq.com';
  const mailto = (subject, body) =>
    `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // ---------- email links with a written subject and body ----------
  const defaultBody = 'Hi Loopworks,\n\nI’d like a free ad. My store: \n\nThanks,\n';
  document.querySelectorAll('[data-mail="default"]').forEach((a) => {
    a.href = mailto('Free ad for my store', defaultBody);
  });

  // ---------- reveal once when a part enters the viewport ----------
  const targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach((el) => io.observe(el));
    // safety net: anything on screen a few seconds after load is shown, whatever the observer did
    window.addEventListener('load', () => setTimeout(() => {
      targets.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
      });
    }, 2500));
  }

  // ---------- the header steps out of the way while reading down, and returns on the way up ----------
  const header = document.querySelector('.top');
  const mark = header && header.querySelector('.wordmark');
  if (header && mark) {
    // It takes the fill of the first filled thing under the wordmark, so nothing reads through it on
    // the way back up, and black ink on light fills (the yellow and pink chapters, the white card,
    // the white specimen on a phone), white on dark fills and on the photographs, which sit on
    // black. A chapter's data-ink is the fallback.
    const linear = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const under = () => {
      // where the wordmark rests, whether or not the header is out of the way right now
      const x = mark.offsetLeft + mark.offsetWidth / 2;
      const y = mark.offsetTop + mark.offsetHeight / 2;
      const hit = document.elementsFromPoint(x, y).find((el) => !header.contains(el));
      for (let n = hit; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (parseFloat(cs.opacity) < 0.5) continue;
        const c = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number);
        if (c.length === 3 || c[3] > 0.5) {
          const light = 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]) > 0.18;
          return { ink: light ? '#000000' : '#ffffff', fill: cs.backgroundColor };
        }
        if (n.dataset.ink) return { ink: n.dataset.ink, fill: '' };
      }
      return { ink: '#ffffff', fill: '' };
    };
    const paintInk = () => {
      const { ink, fill } = under();
      const root = document.documentElement.style;
      root.setProperty('--header-ink', ink);
      root.setProperty('--header-fill', fill || 'transparent');
      header.classList.toggle('is-filled', !!fill);
    };

    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      ticking = false;
      const y = window.scrollY;
      const pastHero = y > window.innerHeight * 0.6;
      if (pastHero && y > lastY + 6) header.classList.add('is-away');
      else if (!pastHero || y < lastY - 6) header.classList.remove('is-away');
      lastY = y;
      paintInk();
    };
    const request = () => {
      if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
    };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    window.addEventListener('load', paintInk);
    // an opened question tile turns green under the wordmark without any scrolling
    document.addEventListener('toggle', request, true);
    header.addEventListener('focusin', () => header.classList.remove('is-away'));
    paintInk();
  }

  // ---------- try it: a review line drawn as a rough 4:5 ad ----------
  const review = document.getElementById('try-review');
  const store = document.getElementById('try-store');
  const adImg = document.getElementById('ad-img');
  const note = document.getElementById('ad-note');
  const send = document.getElementById('try-send');

  if (review && store && adImg && window.LoopworksAd) {
    const sample = review.value.trim();
    const canvas = document.createElement('canvas');
    const clean = (s) => s.replace(/\s+/g, ' ').trim().replace(/^["“”']+|["“”']+$/g, '');
    let pending = 0;
    let lastUrl = '';

    // the sample scene and the ad's typeface load once the visitor is near the box, not with the page
    let assets = null;
    const load = () => {
      if (!assets) {
        const scene = new Image();
        scene.src = 'assets/img/ad-scene.jpg';
        const fonts = document.fonts && document.fonts.load
          ? [document.fonts.load('800 100px "Barlow Condensed"'), document.fonts.load('700 38px "Barlow Condensed"')]
          : [];
        assets = Promise.all([scene.decode ? scene.decode() : Promise.resolve(), ...fonts]).catch(() => {}).then(() => scene);
      }
      return assets;
    };
    const box = document.getElementById('try');
    if (box && 'IntersectionObserver' in window) {
      const near = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { load(); near.disconnect(); }
      }, { rootMargin: '600px 0px' });
      near.observe(box);
    }

    const render = async () => {
      pending = 0;
      const scene = await load();
      const line = clean(review.value) || clean(sample);
      const name = store.value.replace(/\s+/g, ' ').trim() || 'Your store';
      window.LoopworksAd.draw(canvas, line, name, scene);
      canvas.toBlob((blob) => {
        if (!blob) return;
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(blob);
        adImg.src = lastUrl;
      }, 'image/jpeg', 0.9);
      adImg.alt = `Preview ad for ${name}: the headline “${line}” over the sample scene, a picture made with AI of a lush basil plant in a self-watering pot next to a dead one in a clay pot.`;
      note.textContent = review.value.trim() === sample
        ? 'A rough 4:5 preview with a sample review. The scene is a sample, made with AI. Type your own line to change it.'
        : 'A rough 4:5 preview of your line on our sample scene, made with AI. Your real ad gets a scene made around your product.';
      send.href = mailto(
        `Free ad for ${name}`,
        `Hi Loopworks,\n\nI’d like a free ad. Here’s a line from one of our reviews:\n\n“${line}”\n\nOur store’s address: \n\nThanks,\n`
      );
    };
    const schedule = () => { if (!pending) pending = window.setTimeout(render, 120); };

    review.addEventListener('input', schedule);
    store.addEventListener('input', schedule);
    // the sample picture is already on the page; redraw only once the visitor types
    send.href = mailto('Free ad for my store', `Hi Loopworks,\n\nI’d like a free ad. Here’s a line from one of our reviews:\n\n\n\nOur store’s address: \n\nThanks,\n`);
    review.addEventListener('focus', load, { once: true });
    store.addEventListener('focus', load, { once: true });
  }

  // ---------- the film loop plays only while it is on screen, and never under reduced motion ----------
  const film = document.querySelector('.card-video');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (film && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !still.matches && !document.hidden) {
        const playing = film.play();
        if (playing && playing.catch) playing.catch(() => {});
      } else {
        film.pause();
      }
    }, { threshold: 0.25 }).observe(film);
    document.addEventListener('visibilitychange', () => { if (document.hidden) film.pause(); });
  }

  // ---------- contact bar: opens the visitor's own email app, filled in ----------
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const site = form.elements.namedItem('store').value.trim();
      const first = form.elements.namedItem('first').value.trim();
      if (!site) { form.elements.namedItem('store').focus(); return; }
      window.location.href = mailto(
        `Free ad for ${site}`,
        `Hi Loopworks,\n\nI’d like a free ad for my store: ${site}\n\nThanks,\n${first}\n`
      );
    });
  }

  // ---------- the photo strip pauses off screen and in a hidden tab ----------
  const strip = document.querySelector('.strip');
  if (strip) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => strip.classList.toggle('is-paused', !entry.isIntersecting)).observe(strip);
    }
    document.addEventListener('visibilitychange', () => strip.classList.toggle('is-hidden', document.hidden));
  }
})();
