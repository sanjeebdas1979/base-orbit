"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const CANVAS_SIZE = 420;
const CENTER = CANVAS_SIZE / 2;
const ORBIT_RADIUS = 135;

const BEST_SCORE_KEY = "base-orbit-best-score";
const SOUND_KEY = "base-orbit-sound-enabled";

type GameStatus =
  | "ready"
  | "countdown"
  | "playing"
  | "game-over";

type Obstacle = {
  angle: number;
  radius: number;
  speed: number;
  direction: 1 | -1;
};

type Particle = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  size: number;
};

function createObstacles(): Obstacle[] {
  return [
    {
      angle: Math.PI * 0.25,
      radius: 12,
      speed: 0.26,
      direction: 1,
    },
    {
      angle: Math.PI * 0.85,
      radius: 13,
      speed: 0.18,
      direction: -1,
    },
    {
      angle: Math.PI * 1.55,
      radius: 11,
      speed: 0.32,
      direction: 1,
    },
  ];
}

function normalizeAngle(angle: number) {
  const fullCircle = Math.PI * 2;

  return ((angle % fullCircle) + fullCircle) % fullCircle;
}

function angleDistance(first: number, second: number) {
  const difference = Math.abs(
    normalizeAngle(first) - normalizeAngle(second),
  );

  return Math.min(
    difference,
    Math.PI * 2 - difference,
  );
}

function getLevelFromTime(elapsedTime: number) {
  if (elapsedTime < 4) {
    return 1;
  }

  if (elapsedTime < 5) {
    return 2;
  }

  if (elapsedTime < 6) {
    return 3;
  }

  if (elapsedTime < 7) {
    return 4;
  }

  return 5 + Math.floor(elapsedTime - 7);
}

export default function OrbitGame() {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const animationFrameRef =
    useRef<number | null>(null);

  const previousTimeRef =
    useRef<number | null>(null);

  const countdownTimerRef =
    useRef<number | null>(null);

  const audioContextRef =
    useRef<AudioContext | null>(null);

  const playerAngleRef = useRef(0);
  const playerDirectionRef = useRef<1 | -1>(1);
  const playerSpeedRef = useRef(1.55);

  const scoreRef = useRef(0);
  const elapsedTimeRef = useRef(0);

  const particlesRef = useRef<Particle[]>([]);
  const shakeEndTimeRef = useRef(0);

  const obstaclesRef =
    useRef<Obstacle[]>(createObstacles());

  const [status, setStatus] =
    useState<GameStatus>("ready");

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [level, setLevel] = useState(1);

  const [countdown, setCountdown] = useState<
    number | "GO" | null
  >(null);

  const [levelFlash, setLevelFlash] =
    useState<number | null>(null);

  const [soundEnabled, setSoundEnabled] =
    useState(true);

  const [isNewBest, setIsNewBest] =
    useState(false);

  useEffect(() => {
    const savedBestScore =
      window.localStorage.getItem(BEST_SCORE_KEY);

    if (savedBestScore) {
      const parsedScore = Number(savedBestScore);

      if (Number.isFinite(parsedScore)) {
        setBestScore(parsedScore);
      }
    }

    const savedSound =
      window.localStorage.getItem(SOUND_KEY);

    if (savedSound !== null) {
      setSoundEnabled(savedSound === "true");
    }
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current =
        new window.AudioContext();
    }

    return audioContextRef.current;
  }, []);

  const playTone = useCallback(
    (
      frequency: number,
      duration: number,
      volume: number,
      type: OscillatorType = "sine",
    ) => {
      if (!soundEnabled) {
        return;
      }

      const audioContext = getAudioContext();

      const oscillator =
        audioContext.createOscillator();

      const gain = audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(
        volume,
        audioContext.currentTime,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration,
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();

      oscillator.stop(
        audioContext.currentTime + duration,
      );
    },
    [getAudioContext, soundEnabled],
  );

  const playCountdownSound = useCallback(
    (isGo: boolean) => {
      playTone(
        isGo ? 760 : 420,
        isGo ? 0.2 : 0.11,
        0.08,
        "sine",
      );
    },
    [playTone],
  );

  const playTapSound = useCallback(() => {
    playTone(580, 0.06, 0.035, "triangle");
  }, [playTone]);

  const playLevelSound = useCallback(() => {
    playTone(690, 0.13, 0.055, "sine");

    window.setTimeout(() => {
      playTone(920, 0.18, 0.05, "sine");
    }, 85);
  }, [playTone]);

  const playCrashSound = useCallback(() => {
    playTone(150, 0.35, 0.12, "sawtooth");

    window.setTimeout(() => {
      playTone(90, 0.4, 0.08, "square");
    }, 50);
  }, [playTone]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((currentValue) => {
      const nextValue = !currentValue;

      window.localStorage.setItem(
        SOUND_KEY,
        String(nextValue),
      );

      return nextValue;
    });
  }, []);
const shareScore = useCallback(() => {
  const text = `I scored ${score} in Base Orbit on Base 🟦

Can you beat my score?

Survive the block. Own the streak.`;

  const appUrl = window.location.origin;

  const xUrl = new URL(
    "https://twitter.com/intent/tweet",
  );

  xUrl.searchParams.set("text", text);
  xUrl.searchParams.set("url", appUrl);

  window.open(
    xUrl.toString(),
    "_blank",
    "noopener,noreferrer",
  );
}, [score]);
  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(
        animationFrameRef.current,
      );

      animationFrameRef.current = null;
    }
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      window.clearTimeout(
        countdownTimerRef.current,
      );

      countdownTimerRef.current = null;
    }
  }, []);

  const createCollisionParticles =
    useCallback(() => {
      const playerX =
        CENTER +
        Math.cos(playerAngleRef.current) *
          ORBIT_RADIUS;

      const playerY =
        CENTER +
        Math.sin(playerAngleRef.current) *
          ORBIT_RADIUS;

      particlesRef.current = Array.from(
        { length: 34 },
        () => {
          const direction =
            Math.random() * Math.PI * 2;

          const speed =
            45 + Math.random() * 130;

          return {
            x: playerX,
            y: playerY,
            velocityX:
              Math.cos(direction) * speed,
            velocityY:
              Math.sin(direction) * speed,
            life: 1,
            size: 2 + Math.random() * 4,
          };
        },
      );
    }, []);

  const updateParticles = useCallback(
    (deltaSeconds: number) => {
      particlesRef.current =
        particlesRef.current
          .map((particle) => ({
            ...particle,
            x:
              particle.x +
              particle.velocityX *
                deltaSeconds,
            y:
              particle.y +
              particle.velocityY *
                deltaSeconds,
            velocityX:
              particle.velocityX * 0.97,
            velocityY:
              particle.velocityY * 0.97,
            life:
              particle.life -
              deltaSeconds * 1.9,
          }))
          .filter(
            (particle) => particle.life > 0,
          );
    },
    [],
  );

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.save();

    context.clearRect(
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
    );

    const isShaking =
      performance.now() <
      shakeEndTimeRef.current;

    if (isShaking) {
      context.translate(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      );
    }

    const backgroundGradient =
      context.createRadialGradient(
        CENTER,
        CENTER,
        20,
        CENTER,
        CENTER,
        210,
      );

    backgroundGradient.addColorStop(
      0,
      "rgba(0, 82, 255, 0.24)",
    );

    backgroundGradient.addColorStop(
      1,
      "rgba(5, 8, 22, 0)",
    );

    context.fillStyle = backgroundGradient;

    context.fillRect(
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
    );

    context.beginPath();

    context.arc(
      CENTER,
      CENTER,
      ORBIT_RADIUS,
      0,
      Math.PI * 2,
    );

    context.strokeStyle =
      "rgba(96, 165, 250, 0.48)";

    context.lineWidth = 3;
    context.stroke();

    context.beginPath();

    context.arc(
      CENTER,
      CENTER,
      ORBIT_RADIUS - 18,
      0,
      Math.PI * 2,
    );

    context.strokeStyle =
      "rgba(255, 255, 255, 0.06)";

    context.lineWidth = 1;
    context.stroke();

    const pulse =
      1 +
      Math.sin(performance.now() / 250) *
        0.04;

    context.beginPath();

    context.arc(
      CENTER,
      CENTER,
      52 * pulse,
      0,
      Math.PI * 2,
    );

    context.fillStyle = "#0052FF";
    context.shadowColor = "#0052FF";
    context.shadowBlur = 42;
    context.fill();

    context.shadowBlur = 0;

    context.beginPath();

    context.arc(
      CENTER,
      CENTER,
      17,
      0,
      Math.PI * 2,
    );

    context.fillStyle = "#ffffff";
    context.fill();

    obstaclesRef.current.forEach(
      (obstacle) => {
        const obstacleX =
          CENTER +
          Math.cos(obstacle.angle) *
            ORBIT_RADIUS;

        const obstacleY =
          CENTER +
          Math.sin(obstacle.angle) *
            ORBIT_RADIUS;

        context.beginPath();

        context.arc(
          obstacleX,
          obstacleY,
          obstacle.radius,
          0,
          Math.PI * 2,
        );

        context.fillStyle = "#ff4d6d";
        context.shadowColor = "#ff4d6d";
        context.shadowBlur = 24;
        context.fill();

        context.shadowBlur = 0;

        context.beginPath();

        context.arc(
          obstacleX,
          obstacleY,
          obstacle.radius / 3,
          0,
          Math.PI * 2,
        );

        context.fillStyle =
          "rgba(255,255,255,0.75)";

        context.fill();
      },
    );

    const playerX =
      CENTER +
      Math.cos(playerAngleRef.current) *
        ORBIT_RADIUS;

    const playerY =
      CENTER +
      Math.sin(playerAngleRef.current) *
        ORBIT_RADIUS;

    context.beginPath();

    context.arc(
      playerX,
      playerY,
      10,
      0,
      Math.PI * 2,
    );

    context.fillStyle = "#ffffff";
    context.shadowColor = "#60a5fa";
    context.shadowBlur = 30;
    context.fill();

    context.shadowBlur = 0;

    particlesRef.current.forEach(
      (particle) => {
        context.globalAlpha =
          Math.max(0, particle.life);

        context.beginPath();

        context.arc(
          particle.x,
          particle.y,
          particle.size,
          0,
          Math.PI * 2,
        );

        context.fillStyle =
          particle.life > 0.5
            ? "#ffffff"
            : "#ff4d6d";

        context.fill();
      },
    );

    context.globalAlpha = 1;

    context.restore();
  }, []);

  const runExplosionAnimation =
    useCallback(() => {
      let previousTime = performance.now();

      const animateExplosion = (
        currentTime: number,
      ) => {
        const deltaSeconds = Math.min(
          (currentTime - previousTime) / 1000,
          0.05,
        );

        previousTime = currentTime;

        updateParticles(deltaSeconds);
        drawGame();

        const stillAnimating =
          particlesRef.current.length > 0 ||
          currentTime <
            shakeEndTimeRef.current;

        if (stillAnimating) {
          animationFrameRef.current =
            window.requestAnimationFrame(
              animateExplosion,
            );
        }
      };

      animationFrameRef.current =
        window.requestAnimationFrame(
          animateExplosion,
        );
    }, [drawGame, updateParticles]);

  const endGame = useCallback(() => {
    stopAnimation();

    createCollisionParticles();

    shakeEndTimeRef.current =
      performance.now() + 420;

    playCrashSound();

    const finalScore = Math.floor(
      scoreRef.current,
    );

    setScore(finalScore);
    setStatus("game-over");

    setBestScore((currentBest) => {
      const beatPreviousBest =
        finalScore > currentBest;

      const nextBest = Math.max(
        currentBest,
        finalScore,
      );

      setIsNewBest(beatPreviousBest);

      window.localStorage.setItem(
        BEST_SCORE_KEY,
        String(nextBest),
      );

      return nextBest;
    });

    runExplosionAnimation();
  }, [
    createCollisionParticles,
    playCrashSound,
    runExplosionAnimation,
    stopAnimation,
  ]);

  const gameLoop = useCallback(
    (currentTime: number) => {
      if (previousTimeRef.current === null) {
        previousTimeRef.current =
          currentTime;
      }

      const deltaSeconds = Math.min(
        (currentTime -
          previousTimeRef.current) /
          1000,
        0.05,
      );

      previousTimeRef.current =
        currentTime;

      elapsedTimeRef.current +=
        deltaSeconds;

      const currentLevel =
        getLevelFromTime(
          elapsedTimeRef.current,
        );

      const speedBoost = Math.min(
        (currentLevel - 1) * 0.12,
        1.8,
      );

      playerSpeedRef.current =
        1.55 + speedBoost;

      scoreRef.current +=
        deltaSeconds *
        10 *
        currentLevel;

      playerAngleRef.current =
        normalizeAngle(
          playerAngleRef.current +
            playerDirectionRef.current *
              playerSpeedRef.current *
              deltaSeconds,
        );

      obstaclesRef.current.forEach(
        (obstacle) => {
          obstacle.angle =
            normalizeAngle(
              obstacle.angle +
                obstacle.direction *
                  (obstacle.speed +
                    speedBoost * 0.28) *
                  deltaSeconds,
            );
        },
      );

      const collisionEnabled =
        elapsedTimeRef.current > 1;

      const hasCollision =
        collisionEnabled &&
        obstaclesRef.current.some(
          (obstacle) => {
            const collisionThreshold =
              (10 + obstacle.radius) /
              ORBIT_RADIUS;

            return (
              angleDistance(
                playerAngleRef.current,
                obstacle.angle,
              ) < collisionThreshold
            );
          },
        );

      if (hasCollision) {
        endGame();
        return;
      }

      setScore(
        Math.floor(scoreRef.current),
      );

      setLevel((previousLevel) => {
        if (currentLevel > previousLevel) {
          setLevelFlash(currentLevel);

          playLevelSound();

          window.setTimeout(() => {
            setLevelFlash(null);
          }, 650);
        }

        return currentLevel;
      });

      drawGame();

      animationFrameRef.current =
        window.requestAnimationFrame(
          gameLoop,
        );
    },
    [
      drawGame,
      endGame,
      playLevelSound,
    ],
  );

  const beginPlaying = useCallback(() => {
    previousTimeRef.current = null;

    setCountdown(null);
    setStatus("playing");

    animationFrameRef.current =
      window.requestAnimationFrame(
        gameLoop,
      );
  }, [gameLoop]);

  const startCountdown = useCallback(() => {
    stopAnimation();
    stopCountdown();

    playerAngleRef.current = 0;
    playerDirectionRef.current = 1;
    playerSpeedRef.current = 1.55;

    scoreRef.current = 0;
    elapsedTimeRef.current = 0;
    previousTimeRef.current = null;

    obstaclesRef.current =
      createObstacles();

    particlesRef.current = [];

    setScore(0);
    setLevel(1);
    setIsNewBest(false);
    setStatus("countdown");
    setCountdown(3);

    drawGame();

    const sequence: Array<
      number | "GO"
    > = [3, 2, 1, "GO"];

    let index = 0;

    const runNextStep = () => {
      const currentValue =
        sequence[index];

      setCountdown(currentValue);

      playCountdownSound(
        currentValue === "GO",
      );

      index += 1;

      if (index < sequence.length) {
        countdownTimerRef.current =
          window.setTimeout(
            runNextStep,
            650,
          );
      } else {
        countdownTimerRef.current =
          window.setTimeout(
            beginPlaying,
            420,
          );
      }
    };

    runNextStep();
  }, [
    beginPlaying,
    drawGame,
    playCountdownSound,
    stopAnimation,
    stopCountdown,
  ]);

  const switchDirection = useCallback(() => {
    if (status !== "playing") {
      return;
    }

    playerDirectionRef.current =
      playerDirectionRef.current === 1
        ? -1
        : 1;

    playTapSound();
  }, [playTapSound, status]);

  useEffect(() => {
    drawGame();

    return () => {
      stopAnimation();
      stopCountdown();

      audioContextRef.current?.close();
    };
  }, [
    drawGame,
    stopAnimation,
    stopCountdown,
  ]);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center">
      <div className="mb-5 grid w-full grid-cols-[1fr_1fr_1fr_auto] items-center rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Score
          </p>

          <p className="mt-1 text-2xl font-bold text-white">
            {score}
          </p>
        </div>

        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Level
          </p>

          <p className="mt-1 text-2xl font-bold text-purple-300">
            {level}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Best
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-300">
            {bestScore}
          </p>
        </div>

        <button
          type="button"
          onClick={toggleSound}
          className="ml-4 rounded-xl border border-white/10 px-3 py-2 text-lg text-white transition hover:border-blue-400/40"
          aria-label={
            soundEnabled
              ? "Mute sound"
              : "Enable sound"
          }
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Switch orbit direction"
        onClick={switchDirection}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            switchDirection();
          }
        }}
        className="relative w-full cursor-pointer touch-none overflow-hidden rounded-[2rem] border border-blue-400/25 bg-[#050816]/70 p-2 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-blue-400/60"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="h-auto w-full"
        />

        {levelFlash !== null &&
          status === "playing" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse rounded-2xl border border-purple-300/30 bg-purple-500/15 px-6 py-3 text-center backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.28em] text-purple-200">
                  Level Up
                </p>

                <p className="mt-1 text-4xl font-black text-white">
                  {levelFlash}
                </p>
              </div>
            </div>
          )}

        {status === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050816]/45 backdrop-blur-[2px]">
            <p className="animate-pulse text-7xl font-black text-white">
              {countdown}
            </p>
          </div>
        )}

        {(status === "ready" ||
          status === "game-over") && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050816]/72 backdrop-blur-md">
            <div className="w-full max-w-xs px-5 text-center">
              {status === "game-over" ? (
                <>
                  {isNewBest && (
                    <div className="mb-4 inline-flex animate-pulse items-center rounded-full border border-yellow-300/30 bg-yellow-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
                      ✦ New Personal Best
                    </div>
                  )}

                  <p className="text-xs uppercase tracking-[0.3em] text-red-300">
                    Orbit Lost
                  </p>

                  <h2 className="mt-3 text-5xl font-black tracking-tight text-white">
                    {score}
                  </h2>

                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Final Score
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Level
                      </p>

                      <p className="mt-1 text-2xl font-black text-purple-300">
                        {level}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Best
                      </p>

                      <p className="mt-1 text-2xl font-black text-blue-300">
                        {bestScore}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startCountdown();
                    }}
                    className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#0052FF] to-[#3B82F6] py-4 text-lg font-bold text-white shadow-[0_0_30px_rgba(0,82,255,0.28)] transition hover:scale-[1.02] active:scale-[0.97]"
                  >
                    Play Again
                  </button>
<button
  type="button"
  onClick={(event) => {
    event.stopPropagation();
    shareScore();
  }}
  className="mt-3 w-full rounded-2xl border border-blue-400/20 bg-blue-500/10 py-3 font-semibold text-blue-200 transition hover:border-blue-300/40 hover:bg-blue-500/15 active:scale-[0.98]"
>
  Share Score on X
</button>
                  <p className="mt-3 text-xs text-slate-500">
                    One more run. Beat your orbit.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-blue-300">
                    Daily Orbit
                  </p>

                  <h2 className="mt-3 text-3xl font-black text-white">
                    Survive the Block
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Reverse direction, avoid every
                    obstacle and beat your best score.
                  </p>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startCountdown();
                    }}
                    className="mt-6 rounded-2xl bg-gradient-to-r from-[#0052FF] to-[#3B82F6] px-9 py-4 text-lg font-bold text-white transition hover:scale-105 active:scale-95"
                  >
                    Start Orbit
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-slate-400">
        Tap the arena to switch direction.
        <br />
        Survive, level up and beat your best.
      </p>
    </section>
  );
}