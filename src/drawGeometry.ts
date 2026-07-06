import type { Gear } from "./gear";
import type { PitchCurve } from "./pitchCurve";
import { curvatureAtIndex, type PolygonalLoop } from "./polygonalLoop";
import {
  add,
  magnitude,
  normalizeVector,
  rotate,
  scale,
  sub,
  type Vector2d,
} from "./vector";

export const drawPoint = (
  context: CanvasRenderingContext2D,
  point: Vector2d,
  radius = 3,
  color = "red",
) => {
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, 2 * Math.PI);
  context.fillStyle = color;
  context.fill();
};

export const drawPolygonalLoop = (
  context: CanvasRenderingContext2D,
  loop: PolygonalLoop,
  fill = false,
  stroke = true,
  displayCenter = true,
) => {
  const vertices = loop.vertices.map((vertex) => rotate(vertex, loop.rotation));
  context.beginPath();
  context.moveTo(vertices[0].x + loop.center.x, vertices[0].y + loop.center.y);
  for (let i = 1; i < loop.vertices.length; i++) {
    context.lineTo(
      vertices[i].x + loop.center.x,
      vertices[i].y + loop.center.y,
    );
  }
  context.closePath();
  fill && context.fill();
  stroke && context.stroke();
  if (displayCenter) {
    drawPoint(context, loop.center, 3, "red");
  }
};

export const drawPolygonalChain = (
  context: CanvasRenderingContext2D,
  vertices: Vector2d[],
  center: Vector2d,
  fill = false,
  stroke = true,
) => {
  vertices = vertices.map((vertex) => add(center, vertex));
  context.beginPath();
  context.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    context.lineTo(vertices[i].x, vertices[i].y);
  }
  fill && context.fill();
  stroke && context.stroke();
};

export const drawPitchCurve = (
  context: CanvasRenderingContext2D,
  curve: PitchCurve,
  fill = false,
  stroke = true,
  displayCenter = true,
) => {
  drawPolygonalLoop(
    context,
    curve.renderedDiscreteLoop,
    fill,
    stroke,
    displayCenter,
  );
};

export const drawGear = (
  context: CanvasRenderingContext2D,
  gear: Gear,
  fill = false,
  stroke = true,
  displayCenter = true,
) => {
  drawPitchCurve(context, gear.pitchCurve, fill, stroke, displayCenter);
  drawPolygonalLoop(context, gear.polyAddendum, fill, stroke, displayCenter);
  drawPolygonalLoop(context, gear.polyDedendum, fill, stroke, displayCenter);
  for (const toothRoot of gear.toothRoots) {
    drawPoint(
      context,
      add(gear.pitchCurve.renderedDiscreteLoop.center, toothRoot.vertex),
    );
  }
  for (const toothFlanks of gear.toothFlanks) {
    drawPolygonalChain(
      context,
      toothFlanks,
      gear.pitchCurve.renderedDiscreteLoop.center,
    );
  }
};

export const drawCircleOfBestFitAtLoopIndex = (
  context: CanvasRenderingContext2D,
  loop: PolygonalLoop,
  index: number,
) => {
  const vertices = loop.vertices;
  index = Math.round(index);
  const len = vertices.length;
  const index0 = ((index % len) + len) % len;
  const index1 = (((index + 1) % len) + len) % len;
  const curvature = curvatureAtIndex(vertices, index);
  const radius = 1 / curvature;
  const center = loop.center;
  const v0 = vertices[index0];
  const v1 = vertices[index1];
  const tang = sub(v1, v0);
  const norm = normalizeVector(rotate(tang, Math.PI / 2));
  const circCenter = add(v0, add(center, scale(norm, radius)));
  context.arc(circCenter.x, circCenter.y, Math.abs(radius), 0, 2 * Math.PI);
  context.stroke();
};
