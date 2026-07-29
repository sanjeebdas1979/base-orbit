"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAccount } from "wagmi";

import {
  createOrbitChallenge,
  formatChallengeSeed,
  getDifficultyStars,
  type OrbitChallenge,
} from "@/lib/challengeEngine";

const CANVAS_SIZE = 420;
const CENTER = CANVAS_SIZE / 2;
const ORBIT_RADIUS = 135;

const PRACTICE_BEST_SCORE_KEY = "base-orbit-practice-best-score";
const RANKED_BEST_SCORE_KEY = "base-orbit-ranked-best-score";
const SOUND_KEY = "base-orbit-sound-enabled";

type GameStatus =
  | "ready"
  | "countdown"
  | "playing"
  | "game-over";

type SaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error";
   type Particle = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  size: number;
};
type ThemeColors = {
  core: string;
  coreGlow: string;
  orbit: string;
  playerGlow: string;
  obstacle: string;
  obstacleGlow: string;
  background: string;
};

function getThemeColors(
  theme: OrbitChallenge["theme"],
): ThemeColors {
  if (theme === "neon") {
    return {
      core: "#00E5FF",
      coreGlow: "#00E5FF",
      orbit: "rgba(34, 211, 238, 0.58)",
      playerGlow: "#67E8F9",
      obstacle: "#F43F5E",
      obstacleGlow: "#FB7185",
      background: "rgba(8, 145, 178, 0.22)",
    };
  }

  if (theme === "solar") {
    return {
      core: "#F59E0B",
      coreGlow: "#FBBF24",
      orbit: "rgba(251, 191, 36, 0.55)",
      playerGlow: "#FDE68A",
      obstacle: "#EF4444",
      obstacleGlow: "#F97316",
      background: "rgba(245, 158, 11, 0.2)",
    };
  }

  if (theme === "frost") {
    return {
      core: "#38BDF8",
      coreGlow: "#BAE6FD",
      orbit: "rgba(186, 230, 253, 0.55)",
      playerGlow: "#E0F2FE",
      obstacle: "#A78BFA",
      obstacleGlow: "#C4B5FD",
      background: "rgba(56, 189, 248, 0.19)",
    };
  }

  if (theme === "violet") {
    return {
      core: "#8B5CF6",
      coreGlow: "#A78BFA",
      orbit: "rgba(167, 139, 250, 0.55)",
      playerGlow: "#C4B5FD",
      obstacle: "#F43F5E",
      obstacleGlow: "#FB7185",
      background: "rgba(124, 58, 237, 0.2)",
    };
  }

  return {
    core: "#0052FF",
    coreGlow: "#0052FF",
    orbit: "rgba(96, 165, 250, 0.48)",
    playerGlow: "#60A5FA",
    obstacle: "#FF4D6D",
    obstacleGlow: "#FF4D6D",
    background: "rgba(0, 82, 255, 0.24)",
  };
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

type GameMode = "practice" | "ranked";

type OrbitGameProps = {
  mode: GameMode;
};

export default function OrbitGame({
  mode,
}: OrbitGameProps) {
  const { address } = useAccount();

  const bestScoreKey =
    mode === "ranked"
      ? RANKED_BEST_SCORE_KEY
      : PRACTICE_BEST_SCORE_KEY;

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const animationFrameRef =
    useRef<number | null>(null);

  const previousTimeRef =
    useRef<number | null>(null);

  const countdownTimerRef =
    useRef<number | null>(null);

  const levelFlashTimerRef =
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

  const challengeRef = useRef<OrbitChallenge>(
    createOrbitChallenge(1),
  );

  const obstaclesRef = useRef(
    challengeRef.current.obstacles.map(
      (obstacle) => ({ ...obstacle }),
    ),
  );

  const [challenge, setChallenge] =
    useState<OrbitChallenge>(
      challengeRef.current,
    );

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

  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>("idle");

  const [saveMessage, setSaveMessage] =
    useState("");

  useEffect(() => {
    const savedBestScore =
      window.localStorage.getItem(bestScoreKey);

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
  }, [bestScoreKey]);

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

      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }

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
    const runLabel =
      mode === "ranked"
        ? "Ranked Challenge"
        : "Practice Mode";

    const text = `I scored ${score} in Base Orbit ${runLabel} on Base 🟦

Challenge: ${challenge.name}
Difficulty: ${getDifficultyStars(challenge.difficulty)}

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
  }, [challenge, mode, score]);

  const saveScore = useCallback(
    async (
      finalScore: number,
      finalLevel: number,
    ) => {
      if (!address) {
        setSaveStatus("error");
        setSaveMessage(
          "Wallet address was not available.",
        );
        return;
      }

      setSaveStatus("saving");
      setSaveMessage("Saving your daily score...");

      try {
        const response = await fetch("/api/scores", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: address,
            score: finalScore,
            level: finalLevel,
          }),
        });

        const result = (await response.json()) as {
          saved?: boolean;
          bestScore?: number;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Score could not be saved.",
          );
        }

        setSaveStatus("saved");

        if (result.saved) {
          setSaveMessage(
            "Daily leaderboard score saved.",
          );
        } else {
          setSaveMessage(
            `Your daily best remains ${result.bestScore ?? finalScore}.`,
          );
        }

        console.log("Score saved:", result);
      } catch (error) {
        console.error("Score request failed:", error);

        setSaveStatus("error");

        setSaveMessage(
          error instanceof Error
            ? error.message
            : "Score could not be saved.",
        );
      }
    },
    [address],
  );

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

  const stopLevelFlashTimer = useCallback(() => {
    if (levelFlashTimerRef.current !== null) {
      window.clearTimeout(
        levelFlashTimerRef.current,
      );

      levelFlashTimerRef.current = null;
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

    const themeColors = getThemeColors(
      challengeRef.current.theme,
    );

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
      themeColors.background,
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

    context.strokeStyle = themeColors.orbit;

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

    context.fillStyle = themeColors.core;
    context.shadowColor = themeColors.coreGlow;
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

        context.fillStyle = themeColors.obstacle;
        context.shadowColor = themeColors.obstacleGlow;
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
    context.shadowColor = themeColors.playerGlow;
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
            : themeColors.obstacle;

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

    const finalLevel = getLevelFromTime(
      elapsedTimeRef.current,
    );

    setScore(finalScore);
    setLevel(finalLevel);
    setStatus("game-over");

    if (mode === "ranked") {
      void saveScore(finalScore, finalLevel);
    }

    setBestScore((currentBest) => {
      const beatPreviousBest =
        finalScore > currentBest;

      const nextBest = Math.max(
        currentBest,
        finalScore,
      );

      setIsNewBest(beatPreviousBest);

      window.localStorage.setItem(
        bestScoreKey,
        String(nextBest),
      );

      return nextBest;
    });

    runExplosionAnimation();
  }, [
    bestScoreKey,
    createCollisionParticles,
    mode,
    playCrashSound,
    runExplosionAnimation,
    saveScore,
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
        challengeRef.current.playerBaseSpeed +
        speedBoost;

      scoreRef.current +=
        deltaSeconds *
        10 *
        currentLevel *
        challengeRef.current.scoreMultiplier;

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

          stopLevelFlashTimer();

          levelFlashTimerRef.current =
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
      stopLevelFlashTimer,
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
    stopLevelFlashTimer();

    const nextChallenge =
      createOrbitChallenge();

    challengeRef.current = nextChallenge;
    setChallenge(nextChallenge);

    playerAngleRef.current = 0;
    playerDirectionRef.current = 1;
    playerSpeedRef.current =
      nextChallenge.playerBaseSpeed;

    scoreRef.current = 0;
    elapsedTimeRef.current = 0;
    previousTimeRef.current = null;

    obstaclesRef.current =
      nextChallenge.obstacles.map(
        (obstacle) => ({ ...obstacle }),
      );

    particlesRef.current = [];

    setScore(0);
    setLevel(1);
    setLevelFlash(null);
    setIsNewBest(false);
    setSaveStatus("idle");
    setSaveMessage("");
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
    stopLevelFlashTimer,
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
      stopLevelFlashTimer();

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        void audioContextRef.current.close();
      }
    };
  }, [
    drawGame,
    stopAnimation,
    stopCountdown,
    stopLevelFlashTimer,
  ]);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center">
      <div className="mb-4 w-full rounded-2xl border border-blue-400/20 bg-blue-500/10 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-blue-300">
              Current Variation
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              {challenge.name}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              {challenge.description}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm tracking-[0.08em] text-yellow-300">
              {getDifficultyStars(
                challenge.difficulty,
              )}
            </p>

            <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Seed {formatChallengeSeed(challenge.seed)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {challenge.obstacleCount} obstacles
          </span>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {challenge.speedType}
          </span>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {challenge.directionType}
          </span>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            ×{challenge.scoreMultiplier} score
          </span>
        </div>
      </div>

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
                    Orbit Lost · {challenge.name}
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

                  {mode === "ranked" ? (
                    <div
                      className={`mt-4 rounded-xl border px-3 py-2 text-xs ${
                        saveStatus === "saved"
                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                          : saveStatus === "error"
                            ? "border-red-400/20 bg-red-500/10 text-red-300"
                            : "border-blue-400/20 bg-blue-500/10 text-blue-300"
                      }`}
                    >
                      {saveStatus === "saving"
                        ? "Saving score..."
                        : saveStatus === "saved"
                          ? saveMessage
                          : saveStatus === "error"
                            ? saveMessage
                            : "Preparing leaderboard score..."}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-left">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
                        Ready to Compete?
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Great run! Activate your Orbit
                        Pass to submit official scores
                        and compete on today&apos;s
                        leaderboard.
                      </p>
                    </div>
                  )}

                  {mode === "practice" && (
                    <Link
                      href="/play?mode=ranked"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      className="mt-5 block w-full rounded-2xl bg-gradient-to-r from-[#0052FF] to-[#3B82F6] py-4 text-center text-lg font-bold text-white shadow-[0_0_30px_rgba(0,82,255,0.28)] transition hover:scale-[1.02] active:scale-[0.97]"
                    >
                      Save an Official Score
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startCountdown();
                    }}
                    className={`w-full rounded-2xl py-4 text-lg font-bold transition active:scale-[0.97] ${
                      mode === "ranked"
                        ? "mt-5 bg-gradient-to-r from-[#0052FF] to-[#3B82F6] text-white shadow-[0_0_30px_rgba(0,82,255,0.28)] hover:scale-[1.02]"
                        : "mt-3 border border-white/10 bg-white/5 text-white hover:border-blue-400/30 hover:bg-blue-500/10"
                    }`}
                  >
                    {mode === "ranked"
                      ? "Play Ranked Again"
                      : "Practice Again"}
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
                    {mode === "ranked"
                      ? "One more run. Climb the leaderboard."
                      : "Practice freely until you are ready to compete."}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm uppercase tracking-[0.25em] text-blue-300">
                    {mode === "ranked"
                      ? "Ranked Challenge"
                      : "Practice Mode"}
                  </p>

                  <h2 className="mt-3 text-3xl font-black text-white">
                    {challenge.name}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {challenge.description} Every new
                    run generates a fresh variation.
                  </p>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startCountdown();
                    }}
                    className="mt-6 rounded-2xl bg-gradient-to-r from-[#0052FF] to-[#3B82F6] px-9 py-4 text-lg font-bold text-white transition hover:scale-105 active:scale-95"
                  >
                    {mode === "ranked"
                      ? "Start Ranked Orbit"
                      : "Start Practice"}
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
        {mode === "ranked"
          ? "Survive and climb today’s leaderboard."
          : "Practice freely and master the orbit."}
      </p>
    </section>
  );
}