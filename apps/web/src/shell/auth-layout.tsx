import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

const warpStars = [
  { x: 18, y: 18, dx: -42, dy: -32, angle: -143, tail: 30, delay: -0.4, duration: 4.8, size: 2 },
  { x: 32, y: 12, dx: -24, dy: -40, angle: -121, tail: 24, delay: -2.6, duration: 5.5, size: 1 },
  { x: 49, y: 16, dx: -2, dy: -46, angle: -92, tail: 34, delay: -3.2, duration: 5.1, size: 2 },
  { x: 68, y: 13, dx: 26, dy: -38, angle: -56, tail: 26, delay: -1.9, duration: 5.8, size: 1 },
  { x: 84, y: 22, dx: 43, dy: -28, angle: -33, tail: 42, delay: -3.9, duration: 5.3, size: 2 },
  { x: 14, y: 40, dx: -46, dy: -8, angle: -170, tail: 28, delay: -4.5, duration: 6.1, size: 1 },
  { x: 28, y: 42, dx: -32, dy: -7, angle: -168, tail: 36, delay: -1.7, duration: 4.7, size: 2 },
  { x: 72, y: 39, dx: 34, dy: -11, angle: -18, tail: 25, delay: -2.2, duration: 5, size: 1 },
  { x: 89, y: 44, dx: 48, dy: -3, angle: -4, tail: 44, delay: -4.8, duration: 6.2, size: 2 },
  { x: 16, y: 66, dx: -44, dy: 24, angle: 151, tail: 40, delay: -2.1, duration: 5.4, size: 2 },
  { x: 35, y: 72, dx: -22, dy: 38, angle: 120, tail: 24, delay: -4.1, duration: 5.9, size: 1 },
  { x: 52, y: 78, dx: 4, dy: 48, angle: 85, tail: 35, delay: -1.2, duration: 5.1, size: 2 },
  { x: 70, y: 70, dx: 30, dy: 36, angle: 50, tail: 22, delay: -3.8, duration: 5.7, size: 1 },
  { x: 86, y: 65, dx: 46, dy: 22, angle: 26, tail: 38, delay: -4.6, duration: 4.9, size: 2 },
  { x: 24, y: 86, dx: -34, dy: 48, angle: 125, tail: 27, delay: -2.8, duration: 6.3, size: 1 },
  { x: 78, y: 84, dx: 36, dy: 46, angle: 52, tail: 41, delay: -3.5, duration: 5.4, size: 2 },
];

const passingPlanets = [
  {
    origin: { left: '47%', top: '39%' },
    size: 42,
    delay: 0,
    duration: 19,
    x: -88,
    y: -48,
    colors: ['#fd0000', '#f97316', '#7f1d1d'],
    ring: true,
    ringTone: 'rgba(248, 250, 252, 0.5)',
  },
  {
    origin: { left: '53%', top: '37%' },
    size: 34,
    delay: 6,
    duration: 21,
    x: 84,
    y: -52,
    colors: ['#38bdf8', '#0f766e', '#082f49'],
    ring: false,
  },
  {
    origin: { left: '45%', top: '48%' },
    size: 38,
    delay: 10,
    duration: 20,
    x: -94,
    y: 6,
    colors: ['#f8fafc', '#94a3b8', '#334155'],
    ring: true,
    ringTone: 'rgba(148, 163, 184, 0.48)',
  },
  {
    origin: { left: '55%', top: '50%' },
    size: 46,
    delay: 15,
    duration: 22,
    x: 92,
    y: 10,
    colors: ['#fde68a', '#f59e0b', '#78350f'],
    ring: true,
    ringTone: 'rgba(253, 230, 138, 0.42)',
  },
  {
    origin: { left: '43%', top: '57%' },
    size: 32,
    delay: 21,
    duration: 18,
    x: -74,
    y: 64,
    colors: ['#c4b5fd', '#7c3aed', '#2e1065'],
    ring: false,
  },
  {
    origin: { left: '57%', top: '58%' },
    size: 40,
    delay: 25,
    duration: 20,
    x: 78,
    y: 62,
    colors: ['#bbf7d0', '#16a34a', '#14532d'],
    ring: false,
  },
  {
    origin: { left: '49%', top: '34%' },
    size: 26,
    delay: 31,
    duration: 18,
    x: -46,
    y: -74,
    colors: ['#fecdd3', '#fb7185', '#881337'],
    ring: true,
    ringTone: 'rgba(254, 205, 211, 0.46)',
  },
  {
    origin: { left: '51%', top: '60%' },
    size: 30,
    delay: 35,
    duration: 19,
    x: 48,
    y: 78,
    colors: ['#bae6fd', '#0284c7', '#0c4a6e'],
    ring: true,
    ringTone: 'rgba(186, 230, 253, 0.38)',
  },
];

const passingAsteroids = [
  { origin: { left: '46%', top: '42%' }, size: 18, delay: 3.5, duration: 15, x: -102, y: -20, rotate: -115 },
  { origin: { left: '55%', top: '45%' }, size: 14, delay: 12, duration: 14, x: 96, y: -22, rotate: 92 },
  { origin: { left: '50%', top: '55%' }, size: 20, delay: 23, duration: 16, x: -68, y: 82, rotate: -76 },
  { origin: { left: '52%', top: '36%' }, size: 12, delay: 33, duration: 13, x: 54, y: -88, rotate: 130 },
];

const passingMeteors = [
  { origin: { left: '43%', top: '35%' }, delay: 1.5, duration: 7.2, x: -108, y: -72, angle: -146, size: 14, tail: 260, thickness: 4 },
  { origin: { left: '58%', top: '38%' }, delay: 9.5, duration: 7.8, x: 108, y: -66, angle: -31, size: 12, tail: 230, thickness: 3 },
  { origin: { left: '39%', top: '61%' }, delay: 18, duration: 7.4, x: -104, y: 70, angle: 146, size: 13, tail: 250, thickness: 4 },
  { origin: { left: '61%', top: '57%' }, delay: 27, duration: 8.1, x: 96, y: 74, angle: 38, size: 10, tail: 210, thickness: 3 },
  { origin: { left: '51%', top: '45%' }, delay: 36, duration: 6.8, x: 0, y: -105, angle: -90, size: 16, tail: 290, thickness: 5 },
];

const passingSatellites = [
  { origin: { left: '54%', top: '40%' }, delay: 8, duration: 24, x: 82, y: -42, rotate: 24 },
  { origin: { left: '45%', top: '54%' }, delay: 30, duration: 23, x: -82, y: 54, rotate: -18 },
];

const getSceneAlreadyPrepared = () => {
  try {
    return window.sessionStorage.getItem('jornada-auth-scene-ready') === 'true';
  } catch {
    return false;
  }
};

const markScenePrepared = () => {
  try {
    window.sessionStorage.setItem('jornada-auth-scene-ready', 'true');
  } catch {
    // The loader is only a polish layer, so storage failures should not block login.
  }
};

export function AuthLayout() {
  const [showLogin, setShowLogin] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [canUseDeepScene, setCanUseDeepScene] = useState(false);
  const sceneRef = useRef<HTMLElement | null>(null);
  const farLayerRef = useRef<HTMLDivElement | null>(null);
  const nearLayerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const viewTargetRef = useRef({ x: 0, y: 0 });
  const viewCurrentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const revealTimer = window.setTimeout(() => {
      setShowLogin(true);
    }, 950);

    return () => {
      window.clearTimeout(revealTimer);
    };
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktopQuery = window.matchMedia('(min-width: 768px)');

    const updateSceneCapability = () => {
      setCanUseDeepScene(desktopQuery.matches && !motionQuery.matches);
    };

    updateSceneCapability();
    desktopQuery.addEventListener('change', updateSceneCapability);
    motionQuery.addEventListener('change', updateSceneCapability);

    return () => {
      desktopQuery.removeEventListener('change', updateSceneCapability);
      motionQuery.removeEventListener('change', updateSceneCapability);
    };
  }, []);

  useEffect(() => {
    const alreadyPrepared = getSceneAlreadyPrepared();

    if (alreadyPrepared) {
      setSceneReady(true);
      return;
    }

    const sceneTimer = window.setTimeout(() => {
      markScenePrepared();
      setSceneReady(true);
    }, 820);

    return () => {
      window.clearTimeout(sceneTimer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const applyLookDirection = (x: number, y: number) => {
    const farLayer = farLayerRef.current;
    const nearLayer = nearLayerRef.current;

    if (!farLayer || !nearLayer) {
      return;
    }

    const lookX = -x;
    const lookY = -y;
    const farX = lookX * 104;
    const farY = lookY * 74;
    const nearX = lookX * 152;
    const nearY = lookY * 112;
    const farTiltX = lookY * 9.5;
    const farTiltY = lookX * -13;
    const nearTiltX = lookY * 12.4;
    const nearTiltY = lookX * -17;

    farLayer.style.transform = `perspective(980px) translate3d(${farX}px, ${farY}px, 0) rotateX(${farTiltX}deg) rotateY(${farTiltY}deg) scale(1.04)`;
    farLayer.style.transformOrigin = `${50 + lookX * 18}% ${42 + lookY * 14}%`;
    nearLayer.style.transform = `perspective(840px) translate3d(${nearX}px, ${nearY}px, 0) rotateX(${nearTiltX}deg) rotateY(${nearTiltY}deg) scale(1.06)`;
    nearLayer.style.transformOrigin = `${50 + lookX * 18}% ${42 + lookY * 14}%`;
  };

  const animateLookDirection = () => {
    const current = viewCurrentRef.current;
    const target = viewTargetRef.current;
    const nextX = current.x + (target.x - current.x) * 0.09;
    const nextY = current.y + (target.y - current.y) * 0.09;

    current.x = Math.abs(nextX) < 0.001 ? 0 : nextX;
    current.y = Math.abs(nextY) < 0.001 ? 0 : nextY;
    applyLookDirection(current.x, current.y);

    if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) {
      frameRef.current = window.requestAnimationFrame(animateLookDirection);
      return;
    }

    frameRef.current = null;
  };

  const queueLookDirection = (x: number, y: number) => {
    viewTargetRef.current = { x, y };

    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(animateLookDirection);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') {
      return;
    }

    const target = sceneRef.current;

    if (!target) {
      return;
    }

    const bounds = target.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    const clampedX = Math.max(-0.5, Math.min(0.5, x));
    const clampedY = Math.max(-0.5, Math.min(0.5, y));

    queueLookDirection(clampedX, clampedY);
  };

  const handlePointerLeave = () => {
    queueLookDirection(0, 0);
  };

  return (
    <main
      ref={sceneRef}
      className="relative min-h-screen overflow-hidden bg-[#07111d] text-white"
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
    >
      <div ref={farLayerRef} className="pointer-events-none absolute inset-[-6%] auth-direction-layer">
        <div className="absolute inset-0 auth-hero-image" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,15,0.18),rgba(3,8,15,0.72))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(253,0,0,0.18),transparent_28%),radial-gradient(circle_at_bottom,rgba(8,47,73,0.34),transparent_35%)]" />
        <div className="absolute inset-0 auth-star-depth" />
        <div className="absolute inset-0 auth-warp-vignette" />
        <div className="absolute inset-0 overflow-hidden">
          {warpStars.map((star, index) => (
            <span
              key={`${star.x}-${star.y}-${index}`}
              className="auth-warp-star"
              style={
                {
                  '--x': `${star.x}%`,
                  '--y': `${star.y}%`,
                  '--dx': `${star.dx}vw`,
                  '--dy': `${star.dy}vh`,
                  '--angle': `${star.angle}deg`,
                  '--delay': `${star.delay}s`,
                  '--duration': `${star.duration}s`,
                  '--size': `${star.size}px`,
                  '--tail': `${star.tail}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-[-12%] top-[-10%] h-56 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),rgba(248,113,113,0.16),rgba(56,189,248,0.12),transparent)] blur-3xl"
          animate={{ x: ['-4%', '6%', '-4%'], opacity: [0.18, 0.34, 0.18] }}
          transition={{ duration: 9.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
      </div>
      <div ref={nearLayerRef} className="pointer-events-none absolute inset-[-6%] auth-direction-layer auth-direction-layer-near">
        {canUseDeepScene && sceneReady ? passingPlanets.map(({ origin, size, delay, duration, x, y, colors, ring, ringTone }, index) => (
          <motion.div
            key={`${origin.left}-${origin.top}-${index}`}
            initial={{ opacity: 0, scale: 0.18 }}
            animate={{
              opacity: [0, 0.2, 0.74, 0.9, 0.9, 0.9],
              scale: [0.08, 0.18, 0.42, 0.88, 1.42, 2.28],
              x: ['0vw', `${x * 0.08}vw`, `${x * 0.22}vw`, `${x * 0.48}vw`, `${x * 0.76}vw`, `${x}vw`],
              y: ['0vh', `${y * 0.08}vh`, `${y * 0.22}vh`, `${y * 0.48}vh`, `${y * 0.76}vh`, `${y}vh`],
              rotate: [0, -1, 2, 5, 9, 14],
            }}
            transition={{
              duration,
              delay,
              ease: 'linear',
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 14,
            }}
            className="auth-pass-object absolute"
            style={{ left: origin.left, top: origin.top }}
          >
            <span
              className={`auth-planet ${ring ? 'auth-planet-ringed' : ''}`}
              style={
                {
                  '--planet-size': `${size}px`,
                  '--planet-a': colors[0],
                  '--planet-b': colors[1],
                  '--planet-c': colors[2],
                  '--planet-ring': ringTone ?? 'rgba(248, 250, 252, 0.42)',
                } as CSSProperties
              }
            >
              {ring ? <span className="auth-planet-ring-front" /> : null}
            </span>
          </motion.div>
        )) : null}
        {canUseDeepScene && sceneReady ? passingAsteroids.map(({ origin, size, delay, duration, x, y, rotate }, index) => (
          <motion.div
            key={`asteroid-${index}`}
            initial={{ opacity: 0, scale: 0.12 }}
            animate={{
              opacity: [0, 0.24, 0.68, 0.86, 0.86],
              scale: [0.1, 0.24, 0.52, 1.05, 1.7],
              x: ['0vw', `${x * 0.1}vw`, `${x * 0.3}vw`, `${x * 0.68}vw`, `${x}vw`],
              y: ['0vh', `${y * 0.1}vh`, `${y * 0.3}vh`, `${y * 0.68}vh`, `${y}vh`],
              rotate: [rotate * 0.1, rotate * 0.45, rotate * 0.8, rotate, rotate * 1.24],
            }}
            transition={{
              duration,
              delay,
              ease: 'linear',
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 16,
            }}
            className="auth-pass-object absolute"
            style={{ left: origin.left, top: origin.top }}
          >
            <span
              className="auth-asteroid"
              style={{ '--asteroid-size': `${size}px` } as CSSProperties}
            />
          </motion.div>
        )) : null}
        {canUseDeepScene && sceneReady ? passingMeteors.map(({ origin, delay, duration, x, y, angle, size, tail, thickness }, index) => (
          <motion.div
            key={`meteor-${index}`}
            initial={{ opacity: 0, scale: 0.12 }}
            animate={{
              opacity: [0, 0.18, 0.94, 0.9, 0.28, 0],
              scale: [0.08, 0.24, 0.64, 1.18, 1.95, 2.45],
              x: ['0vw', `${x * 0.08}vw`, `${x * 0.24}vw`, `${x * 0.55}vw`, `${x * 0.86}vw`, `${x}vw`],
              y: ['0vh', `${y * 0.08}vh`, `${y * 0.24}vh`, `${y * 0.55}vh`, `${y * 0.86}vh`, `${y}vh`],
            }}
            transition={{
              duration,
              delay,
              ease: 'linear',
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 18,
            }}
            className="auth-pass-object absolute"
            style={{ left: origin.left, top: origin.top }}
          >
            <span
              className="auth-meteor"
              style={
                {
                  '--meteor-angle': `${angle}deg`,
                  '--meteor-size': `${size}px`,
                  '--meteor-tail': `${tail}px`,
                  '--meteor-thickness': `${thickness}px`,
                } as CSSProperties
              }
            />
          </motion.div>
        )) : null}
        {canUseDeepScene && sceneReady ? passingSatellites.map(({ origin, delay, duration, x, y, rotate }, index) => (
          <motion.div
            key={`satellite-${index}`}
            initial={{ opacity: 0, scale: 0.12 }}
            animate={{
              opacity: [0, 0.16, 0.62, 0.82, 0.82],
              scale: [0.1, 0.2, 0.44, 0.82, 1.22],
              x: ['0vw', `${x * 0.1}vw`, `${x * 0.32}vw`, `${x * 0.68}vw`, `${x}vw`],
              y: ['0vh', `${y * 0.1}vh`, `${y * 0.32}vh`, `${y * 0.68}vh`, `${y}vh`],
              rotate: [rotate - 12, rotate - 4, rotate, rotate + 8, rotate + 14],
            }}
            transition={{
              duration,
              delay,
              ease: 'linear',
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 18,
            }}
            className="auth-pass-object absolute"
            style={{ left: origin.left, top: origin.top }}
          >
            <span className="auth-satellite">
              <span className="auth-satellite-panel auth-satellite-panel-left" />
              <span className="auth-satellite-body" />
              <span className="auth-satellite-panel auth-satellite-panel-right" />
            </span>
          </motion.div>
        )) : null}
      </div>

      <AnimatePresence>
        {!sceneReady ? (
          <motion.div
            key="auth-scene-loader"
            className="auth-scene-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <img src="/crew-logo.png" alt="Gran Services" className="auth-scene-loader-logo" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] items-center justify-center px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
        <div className="relative w-full max-w-md">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-2 z-0 h-24 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16),rgba(255,255,255,0.06)_48%,transparent_72%)] blur-3xl"
            animate={{ opacity: [0.26, 0.48, 0.26], scale: [0.96, 1.04, 0.96] }}
            transition={{ duration: 6.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
          <AnimatePresence>
            {showLogin ? (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, y: 28, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10"
              >
                <Outlet />
              </motion.div>
            ) : null}
          </AnimatePresence>

        </div>
      </div>
    </main>
  );
}
