// Loopworks: draws a rough 1080 × 1350 (4:5) ad in the studio's look: one scene, one bold condensed
// headline in two colours, the brand small. The line is typed over the sample scene, never drawn into it.
// Used by site.js for the live preview and by _src/render-ad.mjs for the sample picture.

(() => {
  const W = 1080;
  const H = 1350;
  const SIDE = 70;
  const TOP = 70;
  const ROOM = 250; // the headline stays on the wall, above the plants
  const SHIFT = 100; // the scene sits this much lower, with its wall carried up, to give the headline room
  const INK = '#1e231c';
  const ACCENT = '#175324';
  const VEIL = '246, 241, 233';
  const HEAD = '"Barlow Condensed", "Arial Narrow", sans-serif';

  const setSpacing = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; };

  // cut a string with an ellipsis until it fits the width
  const fitWidth = (ctx, text, max) => {
    if (ctx.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  };

  const wrap = (ctx, words, max) => {
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (!current || ctx.measureText(test).width <= max) current = test;
      else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
    return lines;
  };

  // a one-letter word never ends a line ("BEST CANDLE I / HAVE EVER OWNED")
  const settle = (ctx, lines, max) => {
    for (let i = 0; i < lines.length - 1; i += 1) {
      const words = lines[i].split(' ');
      const last = words[words.length - 1];
      const next = `${last} ${lines[i + 1]}`;
      if (words.length > 1 && last.length === 1 && ctx.measureText(next).width <= max) {
        lines[i] = words.slice(0, -1).join(' ');
        lines[i + 1] = next;
      }
    }
    return lines;
  };

  // the narrowest width that keeps the same number of lines, so the lines come out even
  const balance = (ctx, words, max) => {
    const count = wrap(ctx, words, max).length;
    let lo = max / 2;
    let hi = max;
    for (let i = 0; i < 12; i += 1) {
      const mid = (lo + hi) / 2;
      if (wrap(ctx, words, mid).length > count) lo = mid; else hi = mid;
    }
    return settle(ctx, wrap(ctx, words, hi), max);
  };

  // the words before the last sentence, and the last sentence: the payoff takes the second colour
  const split = (text) => {
    const sentences = [];
    let current = [];
    for (const word of text.split(/\s+/).filter(Boolean)) {
      current.push(word);
      if (/[.!?]["”’)\]]*$/.test(word)) { sentences.push(current); current = []; }
    }
    if (current.length) sentences.push(current);
    if (sentences.length < 2) return [sentences.flat()];
    return [sentences.slice(0, -1).flat(), sentences[sentences.length - 1]];
  };

  // returns where each line went, so a check can measure the contrast under it
  function draw(canvas, line, name, scene) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';

    ctx.fillStyle = `rgb(${VEIL})`;
    ctx.fillRect(0, 0, W, H);
    if (scene && scene.complete && scene.naturalWidth) {
      const k = scene.naturalWidth / W;
      // the plain wall at the top of the scene, stretched up into the room the shift leaves
      ctx.drawImage(scene, 0, 0, scene.naturalWidth, 4 * k, 0, 0, W, SHIFT + 2);
      ctx.drawImage(scene, 0, 0, scene.naturalWidth, (H - SHIFT) * k, 0, SHIFT, W, H - SHIFT);
    }

    // a soft lift of light at the top, the way the candle ad has one; it ends above the leaves
    const veil = ctx.createLinearGradient(0, 0, 0, 360);
    veil.addColorStop(0, `rgba(${VEIL}, 0.6)`);
    veil.addColorStop(0.5, `rgba(${VEIL}, 0.35)`);
    veil.addColorStop(1, `rgba(${VEIL}, 0)`);
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, 360);

    // the headline: one shared size for every line, the largest at which it fits the wall
    const max = W - 2 * SIDE;
    const parts = split(line.toUpperCase()).filter((p) => p.length);
    let size = 112;
    for (; size > 40; size -= 2) {
      ctx.font = `800 ${size}px ${HEAD}`;
      const blocks = parts.map((p) => wrap(ctx, p, max));
      const count = blocks.reduce((n, b) => n + b.length, 0);
      const widest = Math.max(0, ...blocks.flat().map((l) => ctx.measureText(l).width));
      if (widest <= max && count * size * 0.93 <= ROOM) break;
    }
    ctx.font = `800 ${size}px ${HEAD}`;
    setSpacing(ctx, 0);
    const placed = [];
    let y = TOP + size * 0.8;
    parts.forEach((p, i) => {
      ctx.fillStyle = i === 1 ? ACCENT : INK;
      for (const l of balance(ctx, p, max)) {
        const text = fitWidth(ctx, l, max);
        ctx.fillText(text, W / 2, y);
        const width = ctx.measureText(text).width;
        placed.push({ text, color: ctx.fillStyle, box: [W / 2 - width / 2, y - size * 0.72, W / 2 + width / 2, y] });
        y += size * 0.93;
      }
    });

    // the brand, small, at the foot
    ctx.fillStyle = INK;
    ctx.font = `700 38px ${HEAD}`;
    setSpacing(ctx, 6);
    const brand = fitWidth(ctx, name.toUpperCase(), max);
    ctx.fillText(brand, W / 2, H - 48);
    const bw = ctx.measureText(brand).width;
    placed.push({ text: brand, color: INK, box: [W / 2 - bw / 2, H - 48 - 28, W / 2 + bw / 2, H - 48] });
    return { size, lines: placed };
  }

  window.LoopworksAd = { draw, width: W, height: H };
})();
