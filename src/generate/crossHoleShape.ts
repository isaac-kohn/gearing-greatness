import type { Vector2d } from "./vector";

const generateArc = (
  startAngle: number,
  endAngle: number,
  radius: number,
  fidelity: number,
): Vector2d[] => {
  startAngle = (startAngle * Math.PI) / 180;
  endAngle = (endAngle * Math.PI) / 180;
  const angleGap = endAngle - startAngle;
  const interval = Array.from(
    { length: fidelity },
    (_, i) => startAngle + (angleGap * (i + 1)) / fidelity,
  );
  const arc = interval.map((angle): Vector2d => {
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
  return arc;
};

export const crossHole: Vector2d[] = [
  { x: -1.414, y: 0 },
  { x: -2.327, y: 0.913 },
  ...generateArc(158.578, 111.422, 2.5, 20),
  { x: 0, y: 1.414 },
  { x: 0.913, y: 2.327 },
  ...generateArc(68.578, 21.422, 2.5, 20),
  { x: 1.414, y: 0 },
  { x: 2.327, y: -0.913 },
  ...generateArc(-21.422, -68.578, 2.5, 20),
  { x: 0, y: -1.414 },
  { x: -0.913, y: -2.327 },
  ...generateArc(-111.422, -158.578, 2.5, 20),
];
