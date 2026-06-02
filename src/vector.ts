export interface Vector2d {
  x: number;
  y: number;
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

export const magnitude = (v: Vector2d): number => {
  return Math.sqrt(v.x * v.x + v.y * v.y);
};

export const direction = (v: Vector2d): number => {
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
