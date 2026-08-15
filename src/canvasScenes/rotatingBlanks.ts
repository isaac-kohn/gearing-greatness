import { context } from "three/tsl";
import {
  drawLine,
  drawPoint,
  drawPolygonalChain,
} from "../canvasStuff/drawGeometry";
import {
  add,
  distance,
  magnitude,
  perp,
  rotate,
  setMagnitude,
  sub,
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
import { drawCameraBox } from "./stickFigure";

export const bootRotatingBlanksScene: CanvasSceneBooter = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): CanvasScene => {
  const metalWidth = 400;
  const metalHeight = 400;
  const metalSheetImage = createRenderedImage(context, "/MetalForGears.png", {
    getDimensions: () => {
      return { x: metalWidth, y: metalHeight };
    },
  });
  const metalAxleImage = createRenderedImage(context, "/MetalForGears.png", {
    getDimensions: () => {
      return { x: 50, y: 50 };
    },
  });

  const drawScene = (context: CanvasRenderingContext2D, timeMs: number) => {
    const timeSeconds = timeMs / 1000;
    const T = Math.PI / 2;
    const loopedSeconds =
      timeSeconds < T ? timeSeconds : T + 0.5 * Math.sin(timeSeconds - T);
    const loopedMs = loopedSeconds * 1000;
    fillCanvasBackground(context, canvas, { color: "black" });
    context.save();
    context.scale(0.8, 0.8);
    context.translate(-400, 0);

    miniDrawScene(
      context,
      loopedMs,
      canvas,
      metalWidth,
      metalHeight,
      metalSheetImage,
      metalAxleImage,
    );
    context.restore();

    context.save();
    context.scale(0.8, 0.8);
    context.translate(400, 0);
    context.rotate((2 * loopedMs * 0.001) / 5);

    miniDrawScene(
      context,
      loopedMs,
      canvas,
      metalWidth,
      metalHeight,
      metalSheetImage,
      metalAxleImage,
    );
    context.restore();
  };
  return {
    init: () => {},
    draw: (timeMs: number) => drawScene(context, timeMs),
  };
};

export const getRotatingBlanksScene: CanvasSceneBooterGetter = () =>
  bootRotatingBlanksScene;

const miniDrawScene = (
  context: CanvasRenderingContext2D,
  timeMs: number,
  canvas: HTMLCanvasElement,
  metalWidth: number,
  metalHeight: number,
  metalSheetImage: RenderedImage,
  metalAxleImage: RenderedImage,
) => {
  const timeSeconds = 0.001 * timeMs;
  const loopedSeconds = (timeMs % 8000) / 1000;

  let pointCloudOpacity = 0;
  let metalSheetOpacity = 1;

  /*if (loopedSeconds < 2) {
      // 0-2s: Points fully transparent, sheets fully opaque
      pointCloudOpacity = 0;
      metalSheetOpacity = 1;
    } else if (loopedSeconds >= 2 && loopedSeconds < 3) {
      // 2-3s: Points fade in to 100%, sheets stay 100% opaque
      pointCloudOpacity = loopedSeconds - 2;
      metalSheetOpacity = 1;
    } else if (loopedSeconds >= 3 && loopedSeconds < 5) {
      // 3-5s: Nothing changes (hold)
      pointCloudOpacity = 1;
      metalSheetOpacity = 1;
    } else if (loopedSeconds >= 5 && loopedSeconds < 6) {
      // 5-6s: Sheet metal fades out to 0, points stay opaque
      pointCloudOpacity = 1;
      metalSheetOpacity = 1 - (loopedSeconds - 5);
    } else {
      // 6-8s: Nothing changes (hold)
      pointCloudOpacity = 1;
      metalSheetOpacity = 0;
    }*/

  const yellowAlpha = Math.round(metalSheetOpacity * 102)
    .toString(16)
    .padStart(2, "0");

  const alpha = Math.round(pointCloudOpacity * 255)
    .toString(16)
    .padStart(2, "0");

  //fillCanvasBackground(context, canvas, { color: "black" });

  const rotationB = (3 * timeSeconds) / 5;
  const rotationA = (-2 * timeSeconds) / 5;

  const axisA = { x: 0, y: 0 };
  const axisB = { x: 240, y: 0 };
  const pitchPoint = { x: (3 / 5) * 240, y: 0 };

  //drawSheetMetal(context, metalSheetImage, axisA, rotationA, "#00000000");

  /*drawPointCloud(
    context,
    axisA,
    rotationA,
    metalWidth,
    metalHeight,
    18,
    18,
    `#ffffffff`, //${alpha}`,
  );*/

  drawSheetMetal(context, metalAxleImage, axisA, rotationA, "#66330099");

  /*drawSheetMetal(
      context,
      metalSheetImage,
      axisB,
      rotationB,
      `#ffff00${yellowAlpha}`,
      metalSheetOpacity,
    );*/

  drawPointCloud(
    context,
    axisB,
    rotationB,
    metalWidth,
    metalHeight,
    30,
    30,
    `#ffff00ff`, //${alpha}`,
    pitchPoint,
    0.01, //Math.max(timeSeconds / 4, 0.05),
  );

  drawFinger(context, axisB, rotationB, pitchPoint);

  drawSheetMetal(context, metalAxleImage, axisB, rotationB, "#66330099");

  drawPoint(context, pitchPoint, { radius: 5, color: "lime" });

  // camera stuff
  const boxWidth = metalWidth + 50;
  const boxHeight = metalHeight + 50;
  const cameraBoundingRect: CornerRect = {
    bottomLeft: { x: -300, y: -300 },
    width: 600,
    height: 600,
  };
  drawCameraBox(
    context,
    axisA,
    boxWidth,
    boxHeight,
    cameraBoundingRect,
    rotationA,
  );
};

const drawSheetMetal = (
  context: CanvasRenderingContext2D,
  sheetMetalImage: RenderedImage,
  center: Vector2d,
  rotation: number,
  colour: string | CanvasGradient | CanvasPattern,
  transparency?: number,
) => {
  sheetMetalImage.style.getOrientation = () => {
    return { mirrored: false, center, rotation };
  };
  if (transparency) {
    sheetMetalImage.style.getTransparency = () => {
      return transparency;
    };
  }

  sheetMetalImage.render();
  if (colour) {
    // colour it
    const { x: width, y: height } = sheetMetalImage.style.getDimensions!();
    context.fillStyle = colour; //"#ffff0066";
    const corners: Vector2d[] = [
      { x: -width / 2, y: -height / 2 },
      { x: +width / 2, y: -height / 2 },
      { x: +width / 2, y: +height / 2 },
      { x: -width / 2, y: +height / 2 },
    ];
    context.strokeStyle = "black";
    context.lineWidth = 1;
    drawPolygonalChain(
      context,
      corners,
      { center, rotation, mirrored: false },
      { fill: true, connectToStart: true, stroke: false },
    );
  }
  drawPoint(context, center, { radius: 5, color: "red" });
};

export const drawPointCloud = (
  context: CanvasRenderingContext2D,
  center: Vector2d,
  rotation: number,
  width: number,
  height: number,
  n: number,
  m: number,
  colour: string = "red",
  pitchPoint?: Vector2d,
  focusAlpha?: number,
) => {
  for (let row = 0; row < n; row++) {
    for (let column = 0; column < m; column++) {
      const x = m === 1 ? 0.5 : column / (m - 1);
      const y = n === 1 ? 0.5 : row / (n - 1);
      const point: Vector2d = {
        x: (x - 0.5) * width,
        y: (y - 0.5) * height,
      };
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const transformedPoint: Vector2d = {
        x: center.x + point.x * cos - point.y * sin,
        y: center.y + point.x * sin + point.y * cos,
      };
      if (pitchPoint) {
        focusAlpha = focusAlpha || 1;
        const opacity = Math.min(
          1,
          (width * focusAlpha) / distance(transformedPoint, pitchPoint),
        );
        const alpha = Math.round(opacity * 255)
          .toString(16)
          .padStart(2, "0");
        drawPoint(context, transformedPoint, {
          radius: 1,
          color: `#ffff00${alpha}`,
        });
      } else {
        drawPoint(context, transformedPoint, {
          radius: 1,
          color: colour,
        });
      }
    }
  }
};

const drawFinger = (
  context: CanvasRenderingContext2D,
  center: Vector2d,
  rotation: number,
  pitchPoint: Vector2d,
) => {
  const orientation: Orientation = { rotation, center, mirrored: false };
  const polyFinger: Vector2d[] = [
    { x: -5, y: 70 },
    { x: -5, y: 0 },
    { x: 5, y: 0 },
    { x: 5, y: 70 },
  ];
  context.fillStyle = "yellow";
  drawPolygonalChain(context, polyFinger, orientation, {
    fill: true,
    connectToStart: true,
  });
  const transformPoint = (p: Vector2d) => add(rotate(p, rotation), center);
  const fingerPoint = transformPoint({ x: 0, y: 70 });
  drawPoint(context, fingerPoint, {
    radius: 15,
    color: "yellow",
  });
  const toPitchPoint = sub(pitchPoint, fingerPoint);
  const contactPoint = add(fingerPoint, setMagnitude(toPitchPoint, 15));
  context.beginPath();
  context.strokeStyle = "blue";
  context.arc(
    pitchPoint.x,
    pitchPoint.y,
    magnitude(toPitchPoint) - 15,
    0,
    Math.PI * 2,
  );
  context.stroke();
  context.closePath();
  const normalLine: Line = { v0: pitchPoint, v1: fingerPoint };
  drawLine(context, normalLine, { color: "orange", lineWidth: 2 });
  const normalNormal = setMagnitude(
    perp(sub(normalLine.v1, normalLine.v0)),
    20,
  );
  const tangent0 = add(contactPoint, normalNormal);
  const tangent1 = sub(contactPoint, normalNormal);
  const tangentLine: Line = { v0: tangent0, v1: tangent1 };
  drawLine(context, tangentLine, { color: "cyan", lineWidth: 2 });
  drawPoint(context, contactPoint, {
    radius: 5,
    color: "magenta",
  });
};
