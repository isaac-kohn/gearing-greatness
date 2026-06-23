export interface Vector2d {
  x: number;
  y: number;
}

export interface PolarVector {
  angle: number;
  mag: number;
}

export interface Line {
  v0: Vector2d;
  v1: Vector2d;
}

export const add = (a: Vector2d, b: Vector2d): Vector2d => {
  return { x: a.x + b.x, y: a.y + b.y };
};

export const sub = (a: Vector2d, b: Vector2d): Vector2d => {
  return { x: a.x - b.x, y: a.y - b.y };
};

export const scale = (v: Vector2d, s: number): Vector2d => {
  return { x: v.x * s, y: v.y * s };
};

export const cross = (a: Vector2d, b: Vector2d): number => {
  return a.x * b.y - b.x * a.y;
};

export const dot = (a: Vector2d, b: Vector2d): number => {
  return a.x * b.x + b.y * a.y;
};

export const magnitude = (v: Vector2d): number => {
  return Math.sqrt(v.x * v.x + v.y * v.y);
};

export const distance = (v1: Vector2d, v2: Vector2d): number => {
  return magnitude(sub(v1, v2));
};

export const getAngle = (v: Vector2d): number => {
  return Math.atan2(v.y, v.x);
};

export const setMagnitude = (v: Vector2d, m: number): Vector2d => {
  const current = magnitude(v);

  if (current === 0) return { x: 0, y: 0 };

  const scaleFactor = m / current;

  return {
    x: v.x * scaleFactor,
    y: v.y * scaleFactor,
  };
};

export const setDirection = (v: Vector2d, radians: number): Vector2d => {
  const m = magnitude(v);

  return {
    x: m * Math.cos(radians),
    y: m * Math.sin(radians),
  };
};

export const rotate = (v: Vector2d, radians: number): Vector2d => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);

  return {
    x: v.x * c - v.y * s,
    y: v.x * s + v.y * c,
  };
};

export const normal = (v: Vector2d): Vector2d => {
  const m = magnitude(v);

  if (m === 0) return { x: 0, y: 0 };

  return {
    x: v.x / m,
    y: v.y / m,
  };
};

export const perp = (v: Vector2d): Vector2d => {
  return {
    x: -v.y,
    y: v.x,
  };
};

export const lerp = (a: Vector2d, b: Vector2d, t: number): Vector2d => {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
};

export const polarToVertex = (polar: PolarVector): Vector2d => {
  return {
    x: polar.mag * Math.cos(polar.angle),
    y: polar.mag * Math.sin(polar.angle),
  };
};

export const vertexToPolar = (vertex: Vector2d): PolarVector => {
  return { angle: getAngle(vertex), mag: magnitude(vertex) };
};

export const normalizeAngle = (angle: number): number => {
  return ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
};

export const lineIntersection = (lineA: Line, lineB: Line): Vector2d | null => {
  const directionA = sub(lineA.v0, lineA.v1);
  const directionB = sub(lineB.v0, lineB.v1);
  // 2d cross is measure of perpendicularity
  const perpendicularity = cross(directionA, directionB);
  if (perpendicularity === 0) {
    // if you want add it later, can check for colinearity. if they all on the same line, return a line, otherwise there no intersect
    // but i honestly don't want to include that here because it would require me to check type === number rather than just if (intersection)
    // const directionAB = sub(lineB.v0, lineA.v1);
    // if (cross(directionA, directionAB) === 0) return lineA;
    return null;
  }
  // used the algorithm from this article: https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
  const u = cross(directionA, sub(lineA.v0, lineB.v0)) / perpendicularity;
  return add(lineB.v0, scale(directionB, u));
};
