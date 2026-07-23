import "./style.css";

import {
  drawCircleOfBestFitAtLoopIndex,
  drawGear,
  drawPitchCurve,
} from "./drawGeometry";
import {
  createConjugatePitchCurve,
  createPitchCurve,
  setCurveAngle,
} from "./pitchCurve";
import { createConjugateGear, createGear } from "./gear";

const canvas = document.createElement("canvas");
canvas.style.border = "solid lightgrey";
document.body.append(canvas);

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Could not get 2D context");
}

// actual canvas width/height in "css pixels"
const WIDTH = 800;
const HEIGHT = 600;

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio, 2); // unblurring - higher pixelRatio means sharper images

  canvas.width = WIDTH * pixelRatio;
  canvas.height = HEIGHT * pixelRatio;

  canvas.style.width = `${WIDTH}px`;
  canvas.style.height = `${HEIGHT}px`;

  context.setTransform(1, 0, 0, 1, 0, 0);

  context.scale(pixelRatio, pixelRatio);

  // center coordinates and flip y axis
  context.translate(WIDTH / 2, HEIGHT / 2);
  context.scale(1, -1);
}

resizeCanvas();

const pitchCurveA = createPitchCurve(
  {
    fn: (u) => {
      return { mag: 100 - 10 * Math.cos(3 * u), angle: u };
    },
    domainMax: 2 * Math.PI,
    domainMin: 0,
  },
  { x: -100, y: 0 },
  1000,
  30,
);
const pitchCurveB = createConjugatePitchCurve(pitchCurveA);

const gearA = createGear(
  {
    fn: (u) => {
      return { mag: 100 - 20 * Math.cos(3 * u), angle: u };
    },
    domainMax: 2 * Math.PI,
    domainMin: 0,
  },
  30,
  70,
  15,
  17,
);

//const gearB = createConjugateGear(gearA);

function draw(timeMs: number) {
  const timeSeconds = timeMs / 1000;

  // clear canvas by drawing a big rect over everything
  context.fillStyle = "#eee";
  context.fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);

  context.strokeStyle = "#000";
  context.lineWidth = 2;

  setCurveAngle(pitchCurveB, timeSeconds);

  context.fillStyle = "#ff0";
  //drawPitchCurve(context, pitchCurveA, true);
  context.fillStyle = "#ff0";
  context.fillStyle = "#0ff";
  //drawPitchCurve(context, pitchCurveB, true);

  drawGear(context, gearA, Math.floor(timeSeconds * 60 * 0.2));
  //drawGear(context, gearB);
  //setCurveAngle(gearB.pitchCurve, timeSeconds);
  drawCircleOfBestFitAtLoopIndex(
    context,
    gearA.pitchCurve.fidelicDiscreteLoop,
    timeSeconds * 60 * 0.2,
    -(30 * Math.PI) / 180,
  );
}
draw(0);
// runs ~60fps

function animate(timeMs: number) {
  draw(timeMs);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
