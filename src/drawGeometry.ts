import type { Gear, ToothFlank } from "./gear";
import type { PitchCurve } from "./pitchCurve";
import { type PolygonalLoop } from "./polygonalLoop";
import {
  add,
  magnitude,
  normalizeVector,
  rotate,
  scale,
  sub,
  type Line,
  type Vector2d,
} from "./vector";

export const drawPoint = (
  context: CanvasRenderingContext2D,
  point: Vector2d,
  style?: {
    radius?: number;
    color?: string | CanvasGradient | CanvasPattern;
  },
) => {
  const radius = style?.radius || 2;
  const color = style?.color || "red";
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
    drawPoint(context, loop.center, { radius: 3, color: "red" });
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

const drawToothRoots = (context: CanvasRenderingContext2D, gear: Gear) => {
  for (const toothRoot of gear.toothRoots) {
    drawPoint(
      context,
      add(gear.pitchCurve.renderedDiscreteLoop.center, toothRoot.vertex),
    );
  }
};

const drawToothFlanks = (context: CanvasRenderingContext2D, gear: Gear) => {
  for (const toothFlank of gear.fwdFlanks) {
    drawPolygonalChain(
      context,
      toothFlank.tip,
      gear.pitchCurve.renderedDiscreteLoop.center,
    );
    drawPolygonalChain(
      context,
      toothFlank.base,
      gear.pitchCurve.renderedDiscreteLoop.center,
    );
  }
  for (const toothFlank of gear.bwdFlanks) {
    drawPolygonalChain(
      context,
      toothFlank.tip,
      gear.pitchCurve.renderedDiscreteLoop.center,
    );
    drawPolygonalChain(
      context,
      toothFlank.base,
      gear.pitchCurve.renderedDiscreteLoop.center,
    );
  }
};

export const drawGear = (
  context: CanvasRenderingContext2D,
  gear: Gear,
  index: undefined | number = undefined,
) => {
  const fidelity = gear.fidelity;
  if (index !== undefined) {
    index = Math.floor(index);
    index = ((index % fidelity) + fidelity) % fidelity;
  }
  drawPitchCurve(context, gear.pitchCurve);
  context.lineWidth = 0.5;
  drawPolygonalLoop(context, gear.bwdBaseCurve.renderedDiscreteLoop);
  context.lineWidth = 1;
  context.strokeStyle = "#0ff";
  /*
  gear.pitchCurve.renderedDiscreteLoop.vertices.forEach((v0, i) => {
    const v1 = gear.baseCurve.renderedDiscreteLoop.vertices[i];
    context.beginPath();
    context.moveTo(v0.x, v0.y);
    context.lineTo(v1.x, v1.y);
    context.stroke();
  });*/
  const v0 = gear.pitchCurve.fidelicDiscreteLoop.vertices[index];
  const v1 = gear.bwdBaseCurve.fidelicDiscreteLoop.vertices[index];
  context.strokeStyle = "#00f";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(v0.x, v0.y);
  context.lineTo(v1.x, v1.y);
  context.stroke();
  //drawPolygonalLoop(context, gear.polyAddendum, fill, stroke, displayCenter);
  //drawPolygonalLoop(context, gear.polyDedendum);
  drawToothRoots(context, gear);
  drawToothFlanks(context, gear);
};

export const drawCircleOfBestFitAtLoopIndex = (
  context: CanvasRenderingContext2D,
  loop: PolygonalLoop,
  index: number,
  pressureAngle: number,
) => {
  const vertices = loop.vertices;
  index = Math.round(index);
  const len = vertices.length;
  const index0 = ((index % len) + len) % len;
  const index1 = (((index + 1) % len) + len) % len;
  const curvature = loop.curvatureAtIndex(index);
  const radius = 1 / curvature;
  const center = loop.center;
  const v0 = vertices[index0];
  const v1 = vertices[index1];
  const tang = sub(v1, v0);
  const norm = normalizeVector(rotate(tang, Math.PI / 2));
  let circCenter = add(v0, scale(norm, radius));
  circCenter = add(center, rotate(circCenter, loop.rotation));
  context.lineWidth = 1;
  //context.strokeStyle = "#000";
  context.beginPath();
  context.arc(circCenter.x, circCenter.y, Math.abs(radius), 0, 2 * Math.PI);
  context.stroke();
  context.beginPath();
  context.arc(
    circCenter.x,
    circCenter.y,
    Math.cos(pressureAngle) * Math.abs(radius),
    0,
    2 * Math.PI,
  );
  context.stroke();
};

export const drawLine = (context: CanvasRenderingContext2D, line: Line) => {
  context.beginPath();
  let v0 = line.v0;
  let v1 = line.v1;
  let dir0 = scale(sub(v1, v0), 100);
  let dir1 = scale(sub(v0, v1), 100);
  v0 = add(v0, dir0);
  v1 = add(v1, dir1);
  context.moveTo(v0.x, v0.y);
  context.moveTo(v1.x, v1.y);
  context.stroke();
};
