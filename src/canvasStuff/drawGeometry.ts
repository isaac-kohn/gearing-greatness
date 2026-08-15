import { drawCameraBox } from "../canvasScenes/stickFigure";
import type { Gear } from "../generate/gear";
import type { PitchCurve } from "../generate/pitchCurve";
import { type PolygonalLoop } from "../generate/polygonalLoop";
import {
  add,
  createOrientation,
  distance,
  magnitude,
  normalizeVector,
  perp,
  rotate,
  scale,
  setMagnitude,
  sub,
  toWorld,
  type Line,
  type Orientation,
  type Vector2d,
} from "../generate/vector";
import type { PolygonWithHoles } from "../threeStuff/compileGear";

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
  style?: { fill?: Boolean; stroke?: Boolean; connectToStart?: Boolean },
) => {
  const fill = style?.fill || false;
  const stroke = style?.stroke || true;
  const connectToStart = style?.connectToStart || false;
  const world = vertices.map((vertex) => toWorld(vertex, orientation));
  context.beginPath();
  context.moveTo(world[0].x, world[0].y);
  for (let i = 1; i < world.length; i++) {
    context.lineTo(world[i].x, world[i].y);
  }
  if (connectToStart) context.lineTo(world[0].x, world[0].y);
  fill && context.fill();
  stroke && context.stroke();
};

export const drawClosedPolygonWithHoles = (
  context: CanvasRenderingContext2D,
  shape: PolygonWithHoles,
  orientation: Orientation,
  style?: { fill?: Boolean; stroke?: Boolean },
) => {
  const fill = style?.fill || true;
  const stroke = style?.stroke || true;
  context.beginPath();
  const drawHelper = (vertices: Vector2d[]) => {
    const world = vertices.map((vertex) => toWorld(vertex, orientation));
    context.moveTo(world[0].x, world[0].y);
    for (let i = 1; i < world.length; i++) {
      context.lineTo(world[i].x, world[i].y);
    }
    context.lineTo(world[0].x, world[0].y);
  };
  drawHelper(shape.polygon);
  for (const hole of shape.holes) drawHelper(hole);
  fill && context.fill("evenodd");
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
  gear.toothRoots.forEach((toothRoot, i) => {
    const flip = gear.isConjugate ? -1 : 1;
    const { v0, v1 } = toothRoot.normalLine;
    drawPoint(context, toWorld(toothRoot.vertex, orientation), {
      radius: 1,
    });
    drawLine(
      context,
      {
        v0: toWorld(v0, orientation),
        v1: toWorld(v1, orientation),
      },
      {
        extendLength: 20,
        color: "orange",
        lineWidth: 0.5,
      },
    );
    // bounds
    const limitNumOut = gear.approximateOuterDendums[i];
    const limitPointOut = add(v0, setMagnitude(sub(v1, v0), limitNumOut));
    drawPoint(context, toWorld(limitPointOut, orientation), {
      radius: 1,
      color: "green",
    });
    const limitNumIn = gear.approximateInnerDendums[i];
    const limitPointIn = add(v0, setMagnitude(sub(v1, v0), limitNumIn));
    drawPoint(context, toWorld(limitPointIn, orientation), {
      radius: 1,
      color: "green",
    });
  });
};

const drawToothFlanks = (
  context: CanvasRenderingContext2D,
  gear: Gear,
  style?: {
    color?: string | CanvasGradient | CanvasPattern;
    lineWidth?: number;
  },
) => {
  const lineWidth = style?.lineWidth || 0.5;
  const color = style?.color || "lightgray"; //"blue";
  const orientation = gear.orientation;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
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
  /*if (index !== undefined) {
    index = Math.floor(index);
    index = ((index % fidelity) + fidelity) % fidelity;
  }*/
  index = index || 0;
  //drawPolygonalLoop(context, gear.pitchCurve.renderedDiscreteLoop, orientation);
  context.lineWidth = 0.5;
  /*
  drawPolygonalLoop(
    context,
    gear.bwdBaseCurve.renderedDiscreteLoop,
    orientation,
  );
  drawPolygonalLoop(
    context,
    gear.fwdBaseCurve.renderedDiscreteLoop,
    orientation,
  );*/
  context.lineWidth = 1;
  context.strokeStyle = "#0ff";
  /*
  gear.pitchCurve.renderedDiscreteLoop.vertices.forEach((v0, i) => {
    const v1 = gear.baseCurve.renderedDiscreteLoop.vertices[i];
    context.beginPath();
    context.moveTo(v0.x, v0.y);
    context.lineTo(v1.x, v1.y);
    context.stroke();
  });
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
  }*/
  //drawPolygonalLoop(context, gear.polyAddendum, orientation);
  //drawPolygonalLoop(context, gear.polyDedendum, orientation);
  //drawToothRoots(context, gear);
  drawToothFlanks(context, gear);

  if (!gear.isConjugate) {
    const pitchX = gear.pitchCurve.fidelicDiscreteLoop.vertices[0];
    context.save();
    context.translate(pitchX.x, 0);
    const lineOfAction: Line = {
      v0: {
        x: -30 * Math.cos(gear.pressureAngle),
        y: -30 * Math.sin(gear.pressureAngle),
      },
      v1: {
        x: 30 * Math.cos(gear.pressureAngle),
        y: 30 * Math.sin(gear.pressureAngle),
      },
    };
    drawLine(context, lineOfAction, { color: "orange", lineWidth: 2 });
    drawPoint(
      context,
      { x: 0, y: 0 },
      {
        radius: 3,
        color: "lime",
      },
    );
    const lineOfActionDirection = sub(lineOfAction.v1, lineOfAction.v0);
    const contactPoint = setMagnitude(lineOfActionDirection, index);
    const tangentLineDirection = setMagnitude(perp(lineOfActionDirection), 10);
    const tangent0 = add(tangentLineDirection, contactPoint);
    const tangent1 = sub(contactPoint, tangentLineDirection);
    const tangentLine = { v0: tangent0, v1: tangent1 };
    drawLine(context, tangentLine, { color: "yellow", lineWidth: 1 });

    context.strokeStyle = "blue";
    context.beginPath();
    context.arc(0, 0, magnitude(contactPoint), 0, 2 * Math.PI);
    context.stroke();
    context.closePath();
    drawPoint(context, contactPoint, { radius: 3, color: "magenta" });
    context.restore();
  }
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
    orientation?: Orientation;
  },
) => {
  const color = style?.color || "#000";
  const extendLength = style?.extendLength || 0;
  const lineWidth = style?.lineWidth || 0.5;
  const orientation = style?.orientation || {
    center: { x: 0, y: 0 },
    rotation: 0,
    mirrored: false,
  };
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  let v0 = toWorld(line.v0, orientation);
  let v1 = toWorld(line.v1, orientation);
  const lineLength = distance(v0, v1);
  const scaleFactor =
    lineLength > 0 ? (lineLength + extendLength) / lineLength : 1;
  let dir0 = scale(sub(v1, v0), scaleFactor);
  let dir1 = scale(sub(v0, v1), scaleFactor);
  v0 = add(v0, dir0);
  v1 = add(v1, dir1);
  context.moveTo(v0.x, v0.y);
  context.lineTo(v1.x, v1.y);
  context.stroke();
  context.closePath();
};
