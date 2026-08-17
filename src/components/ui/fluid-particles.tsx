"use client";

import { useEffect, useRef } from "react";

/**
 * Ken Perlin's improved noise, 3D.
 *
 * Lifted from the reference unchanged apart from the name — it calls this
 * `simplex3`, but simplex noise is a different algorithm (and a patented one for
 * 3D). This is classic Perlin with the 2002 fade curve. The permutation table is
 * Perlin's own.
 *
 * Built once per mount rather than per render. In the reference this sits in the
 * component body, so every render produces a new object, and because that object
 * is in the effect's dependency array every render also tears down and restarts
 * the animation. Combined with the missing cancelAnimationFrame below, that
 * means a fresh animation loop stacking on top of the old one on every single
 * render.
 */
function createNoise() {
  const permutation = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
    36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120,
    234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
    134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133,
    230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
    1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
    116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
    124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
    47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
    154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98,
    108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
    242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14,
    239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
    50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243,
    141, 128, 195, 78, 66, 215, 61, 156, 180,
  ];

  const p = new Array<number>(512);
  for (let i = 0; i < 256; i++) p[256 + i] = p[i] = permutation[i];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t: number, a: number, b: number) => a + t * (b - a);

  function grad(hash: number, x: number, y: number, z: number) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  return function noise3(x: number, y: number, z: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;

    return lerp(
      w,
      lerp(
        v,
        lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z)),
      ),
      lerp(
        v,
        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        lerp(
          u,
          grad(p[AB + 1], x, y - 1, z - 1),
          grad(p[BB + 1], x - 1, y - 1, z - 1),
        ),
      ),
    );
  };
}

/**
 * A drifting particle field, driven by a Perlin flow field.
 *
 * -----------------------------------------------------------------------------
 * FILLS ITS NEAREST POSITIONED ANCESTOR, NOT THE SCREEN. The reference is built
 * as a full-page background: it wraps its children, sets h-screen, and sizes its
 * canvas from window.innerWidth/innerHeight. Dropped into a ~250px panel that
 * paints a viewport-sized field into a small box — the visible slice would be
 * the top-left corner of it, and the particle density would be wrong by an order
 * of magnitude. This measures its parent instead and follows it through resizes
 * with a ResizeObserver.
 *
 * IT DOES NOT WRAP CONTENT. The reference nests children inside a z-10 div. That
 * forces every consumer to restructure its markup around the effect. This is a
 * sibling that positions itself absolutely, so a panel adds one line and changes
 * nothing else.
 *
 * THE LOOP IS CANCELLED. The reference's cleanup removes the resize listener and
 * nothing else, so its requestAnimationFrame chain runs forever — including
 * after the component unmounts, and including the old loop when a new one
 * starts. On a page someone navigates away from, that is a canvas animating into
 * a detached DOM node for as long as the tab is open.
 *
 * IT STOPS WHEN IT IS NOT ON SCREEN. This panel sits at the foot of a long page,
 * so most of the time it is nowhere near the viewport. An IntersectionObserver
 * suspends the loop when it scrolls away, which matters more here than it would
 * for a hero — a full-page background is on screen by definition, this is not.
 *
 * TRAILS ARE ERASED, NOT PAINTED OVER. The usual way to leave trails is to fill
 * the canvas with a translucent background colour each frame. That relies on the
 * canvas being opaque. Here it has to stay transparent so the panel shows
 * through, and repeatedly filling translucent black over a transparent canvas
 * accumulates toward solid black — the panel would slowly disappear behind a
 * dark slab. Compositing with destination-out removes a little alpha per frame
 * instead, which fades the trails and leaves the canvas transparent.
 * -----------------------------------------------------------------------------
 */
export function FluidParticles({
  className,
  /**
   * Particles per square pixel. A count rather than a density — the reference's
   * flat 2000 — is wrong at every size but one: sparse across a wide desktop
   * panel and a solid wall of dots on a phone.
   *
   * 0.0004 puts roughly 120 particles on a full-width panel. It started at three
   * times that, which on a box this size read as a solid weave rather than as
   * individual points drifting.
   */
  density = 0.0004,
  /**
   * How much alpha is removed per frame. This is the trail length, and it is the
   * other half of "crowded" — at a low value each particle leaves a long comet
   * tail, and enough long tails become a mesh of lines no matter how few
   * particles are drawing them. Higher fades faster, so the tails stay short and
   * the field reads as points rather than as strokes.
   */
  trailFade = 0.16,
  /**
   * Distance over which the flow field turns. Larger noiseScale means tighter
   * curls; this is deliberately loose so neighbouring particles travel roughly
   * together and the field drifts rather than churns.
   */
  noiseScale = 0.0022,
  speed = 0.9,
  maxOpacity = 0.2,
}: {
  className?: string;
  density?: number;
  trailFade?: number;
  noiseScale?: number;
  speed?: number;
  maxOpacity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Honoured here rather than through the global CSS rule: this is JavaScript
    // painting to a canvas, and the blanket duration override in globals.css
    // cannot reach it. Bailing out leaves an empty transparent canvas, so the
    // panel renders exactly as it did before the effect existed.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const noise3 = createNoise();

    type Particle = {
      x: number;
      y: number;
      size: number;
      life: number;
      maxLife: number;
    };

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;

    // Capped at 2. Beyond that the backing store grows quadratically for a
    // difference nobody can see on a field of one-pixel dots.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const spawn = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.5 + Math.random() * 1.5,
      // Staggered so they do not all fade in and out together on the first
      // cycle, which would read as the whole field pulsing.
      life: Math.random() * 100,
      maxLife: 100 + Math.random() * 60,
    });

    function measure() {
      const rect = parent!.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      // Draw in CSS pixels and let the transform handle the device ratio, so
      // every coordinate below is in the same units as the layout.
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.round(width * height * density);
      particles = Array.from({ length: target }, spawn);
    }

    function draw() {
      const t = performance.now() * 0.0001;

      // Fade what is already there by removing alpha, rather than painting a
      // translucent background over it. See the note above.
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillStyle = `rgba(0,0,0,${trailFade})`;
      ctx!.fillRect(0, 0, width, height);
      ctx!.globalCompositeOperation = "source-over";

      for (const particle of particles) {
        particle.life += 1;
        if (particle.life > particle.maxLife) {
          Object.assign(particle, spawn(), { life: 0 });
        }

        const angle =
          noise3(particle.x * noiseScale, particle.y * noiseScale, t) *
          Math.PI *
          4;

        particle.x += Math.cos(angle) * speed;
        particle.y += Math.sin(angle) * speed;

        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;

        const opacity =
          Math.sin((particle.life / particle.maxLife) * Math.PI) * maxOpacity;

        ctx!.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx!.beginPath();
        ctx!.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx!.fill();
      }

      frame = requestAnimationFrame(draw);
    }

    function start() {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(draw);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(frame);
    }

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(parent);

    // The panel is at the foot of the page; no reason to animate it while
    // someone is reading the top.
    const visibility = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "120px" },
    );
    visibility.observe(canvas);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
    };
  }, [density, trailFade, noiseScale, speed, maxOpacity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={
        "pointer-events-none absolute inset-0 -z-10 h-full w-full rounded-[inherit] " +
        (className ?? "")
      }
    />
  );
}
