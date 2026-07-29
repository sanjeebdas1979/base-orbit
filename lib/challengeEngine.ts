export type ChallengeSpeed =
  | "steady"
  | "balanced"
  | "fast";

export type ChallengeLayout =
  | "even"
  | "offset"
  | "cluster"
  | "random";

export type ChallengeDirection =
  | "clockwise"
  | "counter-clockwise"
  | "mixed";

export type ChallengeTheme =
  | "base"
  | "neon"
  | "solar"
  | "frost"
  | "violet";

export type ChallengeObstacle = {
  angle: number;
  radius: number;
  speed: number;
  direction: 1 | -1;
};

export type OrbitChallenge = {
  seed: number;
  name: string;
  description: string;
  difficulty: number;
  obstacleCount: number;
  speedType: ChallengeSpeed;
  layout: ChallengeLayout;
  directionType: ChallengeDirection;
  theme: ChallengeTheme;
  playerBaseSpeed: number;
  scoreMultiplier: number;
  obstacles: ChallengeObstacle[];
};

type SeededRandom = () => number;

const FULL_CIRCLE = Math.PI * 2;

function createSeededRandom(
  seed: number,
): SeededRandom {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let value = state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1,
    );

    value ^=
      value +
      Math.imul(
        value ^ (value >>> 7),
        value | 61,
      );

    return (
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}

function randomBetween(
  random: SeededRandom,
  minimum: number,
  maximum: number,
) {
  return (
    minimum +
    random() * (maximum - minimum)
  );
}

function randomInteger(
  random: SeededRandom,
  minimum: number,
  maximum: number,
) {
  return Math.floor(
    randomBetween(
      random,
      minimum,
      maximum + 1,
    ),
  );
}

function choose<T>(
  random: SeededRandom,
  values: readonly T[],
): T {
  const index = Math.floor(
    random() * values.length,
  );

  return values[index] ?? values[0];
}

function normalizeAngle(angle: number) {
  return (
    ((angle % FULL_CIRCLE) + FULL_CIRCLE) %
    FULL_CIRCLE
  );
}

function createSeed() {
  const cryptoObject =
    typeof window !== "undefined"
      ? window.crypto
      : undefined;

  if (cryptoObject) {
    const values = new Uint32Array(1);

    cryptoObject.getRandomValues(values);

    return values[0] || Date.now();
  }

  return (
    Date.now() +
    Math.floor(Math.random() * 1_000_000)
  );
}

function getObstacleCount(
  random: SeededRandom,
) {
  const roll = random();

  if (roll < 0.3) {
    return 3;
  }

  if (roll < 0.72) {
    return 4;
  }

  if (roll < 0.94) {
    return 5;
  }

  return 6;
}

function getSpeedSettings(
  random: SeededRandom,
): {
  type: ChallengeSpeed;
  minimum: number;
  maximum: number;
  playerBaseSpeed: number;
} {
  const speedType = choose(random, [
    "steady",
    "balanced",
    "balanced",
    "fast",
  ] as const);

  if (speedType === "steady") {
    return {
      type: speedType,
      minimum: 0.13,
      maximum: 0.24,
      playerBaseSpeed: 1.45,
    };
  }

  if (speedType === "fast") {
    return {
      type: speedType,
      minimum: 0.23,
      maximum: 0.37,
      playerBaseSpeed: 1.68,
    };
  }

  return {
    type: speedType,
    minimum: 0.17,
    maximum: 0.31,
    playerBaseSpeed: 1.55,
  };
}

function getObstacleRadius(
  random: SeededRandom,
  obstacleCount: number,
) {
  const maximumRadius =
    obstacleCount >= 6
      ? 10
      : obstacleCount === 5
        ? 12
        : 14;

  const minimumRadius =
    obstacleCount >= 5 ? 8 : 9;

  return randomBetween(
    random,
    minimumRadius,
    maximumRadius,
  );
}

function getDirection(
  directionType: ChallengeDirection,
  obstacleIndex: number,
  random: SeededRandom,
): 1 | -1 {
  if (directionType === "clockwise") {
    return 1;
  }

  if (
    directionType === "counter-clockwise"
  ) {
    return -1;
  }

  if (obstacleIndex % 2 === 0) {
    return random() > 0.25 ? 1 : -1;
  }

  return random() > 0.25 ? -1 : 1;
}

function createEvenAngles(
  obstacleCount: number,
  offset: number,
) {
  return Array.from(
    { length: obstacleCount },
    (_, index) =>
      normalizeAngle(
        offset +
          (FULL_CIRCLE / obstacleCount) *
            index,
      ),
  );
}

function createOffsetAngles(
  random: SeededRandom,
  obstacleCount: number,
) {
  const baseAngles = createEvenAngles(
    obstacleCount,
    randomBetween(
      random,
      0,
      FULL_CIRCLE,
    ),
  );

  return baseAngles.map((angle) =>
    normalizeAngle(
      angle +
        randomBetween(random, -0.18, 0.18),
    ),
  );
}

function createClusterAngles(
  random: SeededRandom,
  obstacleCount: number,
) {
  const clusterCenter = randomBetween(
    random,
    0,
    FULL_CIRCLE,
  );

  const clusterSize =
    obstacleCount >= 5 ? 3 : 2;

  const angles: number[] = [];

  for (
    let index = 0;
    index < obstacleCount;
    index += 1
  ) {
    if (index < clusterSize) {
      angles.push(
        normalizeAngle(
          clusterCenter +
            randomBetween(
              random,
              -0.52,
              0.52,
            ),
        ),
      );
    } else {
      angles.push(
        normalizeAngle(
          clusterCenter +
            Math.PI +
            randomBetween(
              random,
              -1.05,
              1.05,
            ),
        ),
      );
    }
  }

  return angles;
}

function createRandomAngles(
  random: SeededRandom,
  obstacleCount: number,
) {
  const angles: number[] = [];
  const minimumGap = 0.52;

  let attempts = 0;

  while (
    angles.length < obstacleCount &&
    attempts < 200
  ) {
    attempts += 1;

    const candidate = randomBetween(
      random,
      0,
      FULL_CIRCLE,
    );

    const isFarEnough = angles.every(
      (existingAngle) => {
        const difference = Math.abs(
          normalizeAngle(candidate) -
            normalizeAngle(existingAngle),
        );

        const shortestDistance = Math.min(
          difference,
          FULL_CIRCLE - difference,
        );

        return shortestDistance >= minimumGap;
      },
    );

    if (isFarEnough) {
      angles.push(candidate);
    }
  }

  if (angles.length < obstacleCount) {
    return createEvenAngles(
      obstacleCount,
      randomBetween(
        random,
        0,
        FULL_CIRCLE,
      ),
    );
  }

  return angles;
}

function createObstacleAngles(
  random: SeededRandom,
  layout: ChallengeLayout,
  obstacleCount: number,
) {
  if (layout === "even") {
    return createEvenAngles(
      obstacleCount,
      randomBetween(
        random,
        0,
        FULL_CIRCLE,
      ),
    );
  }

  if (layout === "offset") {
    return createOffsetAngles(
      random,
      obstacleCount,
    );
  }

  if (layout === "cluster") {
    return createClusterAngles(
      random,
      obstacleCount,
    );
  }

  return createRandomAngles(
    random,
    obstacleCount,
  );
}

function calculateDifficulty(
  obstacleCount: number,
  speedType: ChallengeSpeed,
  directionType: ChallengeDirection,
  layout: ChallengeLayout,
) {
  let difficulty = 1;

  difficulty += obstacleCount - 3;

  if (speedType === "balanced") {
    difficulty += 1;
  }

  if (speedType === "fast") {
    difficulty += 2;
  }

  if (directionType === "mixed") {
    difficulty += 1;
  }

  if (layout === "cluster") {
    difficulty += 1;
  }

  if (layout === "random") {
    difficulty += 1;
  }

  return Math.min(
    5,
    Math.max(1, Math.ceil(difficulty / 2)),
  );
}

function getChallengeName(
  random: SeededRandom,
  speedType: ChallengeSpeed,
  layout: ChallengeLayout,
  directionType: ChallengeDirection,
) {
  const firstWords = [
    "Neon",
    "Hyper",
    "Quantum",
    "Solar",
    "Turbo",
    "Phantom",
    "Nova",
    "Pulse",
    "Gravity",
    "Velocity",
  ] as const;

  const finalWords = [
    "Orbit",
    "Storm",
    "Circuit",
    "Rush",
    "Drift",
    "Field",
    "Pulse",
    "Run",
    "Loop",
    "Trial",
  ] as const;

  let prefix: string = choose(
  random,
  firstWords,
);

  if (speedType === "fast") {
    prefix = choose(random, [
      "Hyper",
      "Turbo",
      "Velocity",
      "Quantum",
    ] as const);
  }

  if (layout === "cluster") {
    prefix = choose(random, [
      "Gravity",
      "Phantom",
      "Nova",
      "Solar",
    ] as const);
  }

  if (directionType === "mixed") {
    prefix = choose(random, [
      "Chaos",
      "Mirror",
      "Quantum",
      "Phantom",
    ] as const);
  }

  return `${prefix} ${choose(
    random,
    finalWords,
  )}`;
}

function getChallengeDescription(
  obstacleCount: number,
  speedType: ChallengeSpeed,
  directionType: ChallengeDirection,
) {
  const speedLabel =
    speedType === "steady"
      ? "steady"
      : speedType === "fast"
        ? "high-speed"
        : "balanced";

  const directionLabel =
    directionType === "mixed"
      ? "mixed-direction"
      : directionType === "clockwise"
        ? "clockwise"
        : "counter-clockwise";

  return `${obstacleCount} ${speedLabel}, ${directionLabel} obstacles.`;
}

function getScoreMultiplier(
  difficulty: number,
) {
  return Number(
    (1 + (difficulty - 1) * 0.08).toFixed(
      2,
    ),
  );
}

export function createOrbitChallenge(
  suppliedSeed?: number,
): OrbitChallenge {
  const seed = suppliedSeed ?? createSeed();

  const random = createSeededRandom(seed);

  const obstacleCount =
    getObstacleCount(random);

  const speedSettings =
    getSpeedSettings(random);

  const layout = choose(random, [
    "even",
    "offset",
    "offset",
    "cluster",
    "random",
  ] as const);

  const directionType = choose(random, [
    "clockwise",
    "counter-clockwise",
    "mixed",
    "mixed",
  ] as const);

  const theme = choose(random, [
    "base",
    "base",
    "neon",
    "solar",
    "frost",
    "violet",
  ] as const);

  const angles = createObstacleAngles(
    random,
    layout,
    obstacleCount,
  );

  const obstacles =
    angles.map((angle, index) => ({
      angle,
      radius: getObstacleRadius(
        random,
        obstacleCount,
      ),
      speed: randomBetween(
        random,
        speedSettings.minimum,
        speedSettings.maximum,
      ),
      direction: getDirection(
        directionType,
        index,
        random,
      ),
    }));

  const difficulty =
    calculateDifficulty(
      obstacleCount,
      speedSettings.type,
      directionType,
      layout,
    );

  const name = getChallengeName(
    random,
    speedSettings.type,
    layout,
    directionType,
  );

  return {
    seed,
    name,
    description: getChallengeDescription(
      obstacleCount,
      speedSettings.type,
      directionType,
    ),
    difficulty,
    obstacleCount,
    speedType: speedSettings.type,
    layout,
    directionType,
    theme,
    playerBaseSpeed:
      speedSettings.playerBaseSpeed,
    scoreMultiplier:
      getScoreMultiplier(difficulty),
    obstacles,
  };
}

export function getDifficultyStars(
  difficulty: number,
) {
  const safeDifficulty = Math.min(
    5,
    Math.max(1, difficulty),
  );

  return `${"★".repeat(
    safeDifficulty,
  )}${"☆".repeat(5 - safeDifficulty)}`;
}

export function formatChallengeSeed(
  seed: number,
) {
  return String(seed)
    .padStart(8, "0")
    .slice(-8);
}