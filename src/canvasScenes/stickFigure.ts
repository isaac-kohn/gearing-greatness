import { context } from "three/tsl";
import { drawLine, drawPolygonalChain } from "../canvasStuff/drawGeometry";
import {
  add,
  getAngle,
  mirrorLineX,
  mirrorLineY,
  sub,
  vertexToPolar,
  type CornerRect,
  type Line,
  type Orientation,
  type Vector2d,
} from "../generate/vector";

import {
  createRenderedImage,
  fillCanvasBackground,
  type CanvasScene,
  type CanvasSceneBooter,
  type CanvasSceneBooterGetter,
  type RenderedImage,
} from "./helpers/SceneTypesAndHelp";

export const bootStickFigureScene: CanvasSceneBooter = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): CanvasScene => {
  const proboscisFace = createRenderedImage(
    context,
    "/ProboscisFaceForStickFigure.png",
    {
      getDimensions: () => {
        return { x: 100, y: 100 };
      },
    },
  );

  const drawStickFigureScene = (
    context: CanvasRenderingContext2D,
    timeMs: number,
  ) => {
    const timeSeconds = 0.001 * timeMs;
    const loopedMs = timeMs % 9000 < 2000 ? 0 : -2000 + (timeMs % 9000);
    const loopedSeconds = 0; //0.001 * loopedMs;
    const scenePosition = { x: -300 + 200 * loopedSeconds, y: -300 };
    fillCanvasBackground(context, canvas, { color: "darkblue" });
    const handRadius = 20;
    const distToStickManRightHand = 100;
    const boxBottomLeftCorner = add(
      {
        x: distToStickManRightHand + handRadius,
        y: 0,
      },
      scenePosition,
    );
    const boxWidth = 200;
    const boxHeight = 300;
    const boxCenter = add(boxBottomLeftCorner, {
      x: boxWidth / 2,
      y: boxHeight / 2,
    });
    //drawBox(context, loopedMs, boxBottomLeftCorner, boxWidth, boxHeight);
    drawStickMan(
      context,
      loopedMs,
      scenePosition,
      proboscisFace,
      handRadius,
      distToStickManRightHand,
      150 + 100 * Math.cos(timeSeconds),
      "olive",
    );
    const cameraBoundingRect: CornerRect = {
      bottomLeft: { x: -350, y: -200 },
      width: 500,
      height: 400,
    };
    //floor
    context.fillStyle = "#222";
    context.fillRect(-canvas.width / 2, scenePosition.y, canvas.width, -1000);
    drawCameraBox(
      context,
      boxCenter,
      boxWidth + 50,
      boxHeight + 50,
      cameraBoundingRect,
    );
  };
  return {
    init: () => {},
    draw: (timeMs: number) => drawStickFigureScene(context, timeMs),
  };
};

export const getStickFigureScene: CanvasSceneBooterGetter = () =>
  bootStickFigureScene;

const drawBox = (
  context: CanvasRenderingContext2D,
  timeMs: number,
  position: Vector2d,
  boxWidth: number,
  boxHeight: number,
) => {
  const timeSeconds = 0.001 * timeMs;
  const corners: Vector2d[] = [
    { x: 0, y: 0 },
    { x: boxWidth, y: 0 },
    { x: boxWidth, y: boxHeight },
    { x: 0, y: boxHeight },
  ];
  //box
  context.fillStyle = "brown";
  context.strokeStyle = "black";
  context.lineWidth = 2;
  drawPolygonalChain(
    context,
    corners,
    { center: position, rotation: 0, mirrored: false },
    { fill: true, connectToStart: true },
  );
};

const drawStickMan = (
  context: CanvasRenderingContext2D,
  timeMs: number,
  position: Vector2d,
  proboscisFace: RenderedImage,
  handRadius: number,
  rightBoundDistance: number,
  handHeight: number,
  handColor?: string | CanvasGradient | CanvasPattern,
) => {
  const timeSeconds = 0.001 * timeMs;
  const lineStyle = { color: "#AAA", lineWidth: 10 };
  const neckJoint: Vector2d = { x: 0, y: 200 };
  const hipJoint: Vector2d = { x: 0, y: 50 };
  const leftFootPoint: Vector2d = {
    x: -50 - 20 * Math.sin(timeSeconds * 10),
    y: 0,
  };
  const rightFootPoint: Vector2d = {
    x: 50 + 20 * Math.cos(timeSeconds * 10),
    y: 0,
  };
  const shoulderJoint: Vector2d = { x: 0, y: 150 };
  const leftHandPoint: Vector2d = { x: -50, y: 50 };
  const rightHandPoint: Vector2d = { x: rightBoundDistance, y: handHeight };
  const torsoLine: Line = { v0: neckJoint, v1: hipJoint };
  const leftLegLine: Line = { v0: hipJoint, v1: leftFootPoint };
  const rightLegLine: Line = { v0: hipJoint, v1: rightFootPoint };
  const leftArmLine: Line = { v0: shoulderJoint, v1: leftHandPoint };
  const rightArmLine: Line = { v0: shoulderJoint, v1: rightHandPoint };
  const lines = [
    torsoLine,
    leftLegLine,
    rightLegLine,
    leftArmLine,
    rightArmLine,
  ];
  lines.forEach((line) => {
    const v0 = add(line.v0, position);
    const v1 = add(line.v1, position);
    const shiftedLine = { v0, v1 };
    drawLine(context, shiftedLine, lineStyle);
  });
  // the hand is a circle
  const circPos = add(position, rightHandPoint);
  context.lineWidth = 0;
  context.fillStyle = handColor === undefined ? lineStyle.color : handColor;
  context.arc(circPos.x, circPos.y, handRadius, 0, 2 * Math.PI);
  context.fill();
  context.closePath();
  proboscisFace.style.getOrientation = () => {
    return {
      center: add(position, { x: 0, y: 250 }),
      rotation: 0,
      mirrored: false,
    };
  };
  proboscisFace.render();
};

export const drawCameraBox = (
  context: CanvasRenderingContext2D,
  targetCenter: Vector2d,
  focusWidth: number,
  focusHeight: number,
  relativeBoundingRect: CornerRect,
  rotation?: number,
) => {
  rotation = rotation || 0;
  const orientation: Orientation = {
    center: targetCenter,
    rotation,
    mirrored: false,
  };
  const crossRadius = 20;
  const vertCrossLine: Line = {
    v0: { x: 0, y: +crossRadius },
    v1: { x: 0, y: -crossRadius },
  };
  const horCrossLine: Line = {
    v0: { x: +crossRadius, y: 0 },
    v1: { x: -crossRadius, y: 0 },
  };
  const focusCornerPoint: Vector2d = {
    x: -focusWidth / 2,
    y: focusHeight / 2,
  };
  const focusCornerHorLine: Line = {
    v0: focusCornerPoint,
    v1: add(focusCornerPoint, { x: crossRadius, y: 0 }),
  };
  const focusCornerVertLine: Line = {
    v0: focusCornerPoint,
    v1: add(focusCornerPoint, { x: 0, y: -crossRadius }),
  };
  const mirAxisX = 0;
  const mirAxisY = 0;
  let lines = [focusCornerHorLine, focusCornerVertLine];
  lines = [...lines, ...lines.map((line) => mirrorLineX(line, mirAxisX))];
  lines = [...lines, ...lines.map((line) => mirrorLineY(line, mirAxisY))];
  lines.push(horCrossLine, vertCrossLine);
  const lineStyle = {
    color: "red",
    lineWidth: 4,
    orientation,
  };
  lines.forEach((line) => {
    drawLine(context, line, lineStyle);
  });
  context.strokeStyle = "red";
  context.lineWidth = 4;
  const w = relativeBoundingRect.width;
  const h = relativeBoundingRect.height;
  const v = relativeBoundingRect.bottomLeft;
  const rectCorners = [
    v,
    add(v, { x: 0, y: h }),
    add(v, { x: w, y: h }),
    add(v, { x: w, y: 0 }),
  ];
  drawPolygonalChain(context, rectCorners, orientation, {
    fill: false,
    connectToStart: true,
  });
};
