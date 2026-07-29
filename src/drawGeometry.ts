import type { Gear } from "./gear";
import type { PitchCurve } from "./pitchCurve";
import { type PolygonalLoop } from "./polygonalLoop";
import {
  add,
  createOrientation,
  distance,
  normalizeVector,
  rotate,
  scale,
  sub,
  toWorld,
  type Line,
  type Orientation,
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
  orientation: Orientation = createOrientation(),
  fill = false,
  stroke = true,
  displayCenter = true,
) => {
  const vertices = loop.vertices.map((vertex) => toWorld(vertex, orientation));
  context.beginPath();
  context.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    context.lineTo(vertices[i].x, vertices[i].y);
  }
  context.closePath();
  fill && context.fill();
  stroke && context.stroke();
  if (displayCenter) {
    drawPoint(context, orientation.center, { radius: 3, color: "red" });
  }
};

export const drawPolygonalChain = (
  context: CanvasRenderingContext2D,
  vertices: Vector2d[],
  orientation: Orientation,
  fill = false,
  stroke = true,
) => {
  const world = vertices.map((vertex) => toWorld(vertex, orientation));
  context.beginPath();
  context.moveTo(world[0].x, world[0].y);
  for (let i = 1; i < world.length; i++) {
    context.lineTo(world[i].x, world[i].y);
  }
  fill && context.fill();
  stroke && context.stroke();
};

export const drawPitchCurve = (
  context: CanvasRenderingContext2D,
  curve: PitchCurve,
  orientation: Orientation,
  fill = false,
  stroke = true,
  displayCenter = true,
) => {
  drawPolygonalLoop(
    context,
    curve.renderedDiscreteLoop,
    orientation,
    fill,
    stroke,
    displayCenter,
  );
};

const drawToothRoots = (context: CanvasRenderingContext2D, gear: Gear) => {
  const orientation = gear.orientation;
  for (const toothRoot of gear.toothRoots) {
    drawPoint(context, toWorld(toothRoot.vertex, orientation), {
      radius: 1,
    });
    drawLine(
      context,
      {
        v0: toWorld(toothRoot.normalLine.v0, orientation),
        v1: toWorld(toothRoot.normalLine.v1, orientation),
      },
      {
        extendLength: 20,
        color: "orange",
      },
    );
  }
};

const drawToothFlanks = (
  context: CanvasRenderingContext2D,
  gear: Gear,
  style?: { color?: string | CanvasGradient | CanvasPattern },
) => {
  const color = style?.color || "blue";
  const orientation = gear.orientation;
  context.strokeStyle = color;
  for (const toothFlank of gear.fwdFlanks) {
    drawPolygonalChain(context, toothFlank.tip, orientation);
    drawPolygonalChain(context, toothFlank.base, orientation);
  }
  for (const toothFlank of gear.bwdFlanks) {
    drawPolygonalChain(context, toothFlank.tip, orientation);
    drawPolygonalChain(context, toothFlank.base, orientation);
  }
};

export const drawGear = (
  context: CanvasRenderingContext2D,
  gear: Gear,
  index: undefined | number = undefined,
) => {
  const fidelity = gear.fidelity;
  const orientation = gear.orientation;
  if (index !== undefined) {
    index = Math.floor(index);
    index = ((index % fidelity) + fidelity) % fidelity;
  }
  drawPolygonalLoop(
    context,
    gear.pitchCurve.renderedDiscreteLoop,
    orientation,
  );
  context.lineWidth = 0.5;
  drawPolygonalLoop(
    context,
    gear.bwdBaseCurve.renderedDiscreteLoop,
    orientation,
  );
  drawPolygonalLoop(
    context,
    gear.fwdBaseCurve.renderedDiscreteLoop,
    orientation,
  );
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
  if (index !== undefined) {
    const v0 = toWorld(
      gear.pitchCurve.fidelicDiscreteLoop.vertices[index],
      orientation,
    );
    const v1 = toWorld(
      gear.bwdBaseCurve.fidelicDiscreteLoop.vertices[index],
      orientation,
    );
    context.strokeStyle = "#00f";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(v0.x, v0.y);
    context.lineTo(v1.x, v1.y);
    context.stroke();
  }
  //drawPolygonalLoop(context, gear.polyAddendum, fill, stroke, displayCenter);
  //drawPolygonalLoop(context, gear.polyDedendum);
  drawPolygonalLoop(context, gear.polyAddendum, orientation);
  drawPolygonalLoop(context, gear.polyDedendum, orientation);
  drawToothRoots(context, gear);
  drawToothFlanks(context, gear);
};

export const drawCircleOfBestFitAtLoopIndex = (
  context: CanvasRenderingContext2D,
  loop: PolygonalLoop,
  index: number,
  pressureAngle: number,
  orientation: Orientation = createOrientation(),
) => {
  const vertices = loop.vertices;
  index = Math.round(index);
  const len = vertices.length;
  const index0 = ((index % len) + len) % len;
  const index1 = (((index + 1) % len) + len) % len;
  const curvature = loop.curvatureAtIndex(index);
  const radius = 1 / curvature;
  const v0 = vertices[index0];
  const v1 = vertices[index1];
  const tang = sub(v1, v0);
  const norm = normalizeVector(rotate(tang, Math.PI / 2));
  let circCenter = add(v0, scale(norm, radius));
  circCenter = toWorld(circCenter, orientation);
  context.lineWidth = 1;
  context.strokeStyle = "blue";
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

export const drawLine = (
  context: CanvasRenderingContext2D,
  line: Line,
  style?: {
    extendLength?: number;
    color?: string | CanvasGradient | CanvasPattern;
    lineWidth?: number;
  },
) => {
  const color = style?.color || "#000";
  const extendLength = style?.extendLength || 0;
  const lineWidth = style?.lineWidth || 0.5;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  let v0 = line.v0;
  let v1 = line.v1;
  const lineLength = distance(v0, v1);
  const scaleFactor = (lineLength + extendLength) / lineLength;
  let dir0 = scale(sub(v1, v0), scaleFactor);
  let dir1 = scale(sub(v0, v1), scaleFactor);
  v0 = add(v0, dir0);
  v1 = add(v1, dir1);
  context.moveTo(v0.x, v0.y);
  context.lineTo(v1.x, v1.y);
  context.stroke();
};
