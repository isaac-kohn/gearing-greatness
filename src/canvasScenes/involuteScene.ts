import { context } from "three/tsl";
import {
  drawGear,
  drawLine,
  drawPolygonalChain,
} from "../canvasStuff/drawGeometry";
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
import {
  createConjugateGear,
  createGearFromPolarParam,
} from "../generate/gear";

export const bootInvoluteScene: CanvasSceneBooter = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): CanvasScene => {
  const gearA = createGearFromPolarParam(
    {
      fn: (u) => {
        return { mag: 150 - 0 * Math.cos(2 * u), angle: u };
      },
      domainMax: 2 * Math.PI,
      domainMin: 0,
    },
    (25 * Math.PI) / 180,
    30,
    30,
    4000,
    100,
  );
  const gearB = createConjugateGear(gearA);

  const drawInvoluteScene = (
    context: CanvasRenderingContext2D,
    timeMs: number,
  ) => {
    const timeSeconds = 0.001 * timeMs;
    const T = 10;
    fillCanvasBackground(context, canvas, { color: "white" });
    const index = (timeSeconds / T) * gearA.fidelity;
    drawGear(context, gearA, index);
    drawGear(context, gearB, index);
  };
  return {
    init: () => {},
    draw: (timeMs: number) => drawInvoluteScene(context, timeMs),
  };
};

export const getInvoluteScene: CanvasSceneBooterGetter = () =>
  bootInvoluteScene;
