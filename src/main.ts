import "./style.css";

import {
  drawCircleOfBestFitAtLoopIndex,
  drawGear,
  drawPitchCurve,
} from "./drawGeometry";
import {
  createConjugatePitchCurve,
  createPitchCurveFromPolarParam,
} from "./pitchCurve";
import { createConjugateGear, createGearFromPolarParam } from "./gear";

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

const pitchCurveA = createPitchCurveFromPolarParam(
  {
    fn: (u) => {
      return { mag: 100 - 10 * Math.cos(3 * u), angle: u };
    },
    domainMax: 2 * Math.PI,
    domainMin: 0,
  },
  3000,
  30,
);

const gearA = createGearFromPolarParam(
  {
    fn: (u) => {
      //return { mag: 150 - 50 * Math.cos(3 * u), angle: u };
      // fix the tooth normal so that it exists for vertical lines
      return {
        mag:
          150 -
          15 * Math.cos(7 * u) -
          20 * Math.sin(5 * u) +
          10 * Math.sin(4 * u),
        angle: u,
      };
      return {
        mag: 150 - 30 * Math.cos(4 * u) - 50 * Math.sin(1 * u),
        angle: u,
      };
    },
    domainMax: 2 * Math.PI,
    domainMin: 0,
  },
  30,
  50,
  15,
  17,
  1000,
  100,
);

const gearB = createConjugateGear(gearA);
// center the pair around the origin using the conjugate center distance
{
  const centerA = gearA.getCenter();
  const centerB = gearB.getCenter();
  const midX = (centerA.x + centerB.x) / 2;
  gearA.setCenter({ x: centerA.x - midX, y: centerA.y });
  gearB.setCenter({ x: centerB.x - midX, y: centerB.y });
  //gearA.setCenter({ x: centerB.x - midX, y: centerB.y });
  //gearB.setCenter({ x: centerA.x - midX, y: centerA.y });
}

function draw(timeMs: number) {
  const timeSeconds = timeMs / 1000;

  // clear canvas by drawing a big rect over everything
  context.fillStyle = "#eee";
  context.fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);

  context.strokeStyle = "#000";
  context.lineWidth = 2;

  context.fillStyle = "#ff0";
  //drawPitchCurve(context, pitchCurveA, true);
  context.fillStyle = "#ff0";
  context.fillStyle = "#0ff";
  //drawPitchCurve(context, pitchCurveB, true);
  //gearA.setDirection(timeSeconds * 0.2);
  const i = Math.floor(timeMs / 20) % gearA.fidelity;
  const j = i - (1 % gearA.fidelity);
  gearA.setDirectionIndividually(gearA.pitchCurve.angleSyncMap[i]);
  gearB.setDirectionIndividually(gearB.pitchCurve.angleSyncMap[i]);
  const prevGearAngle = gearB.pitchCurve.angleSyncMap[j];
  const gearAngle = gearB.pitchCurve.angleSyncMap[i];
  //console.log(gearAngle - prevGearAngle);
  drawGear(context, gearA, Math.floor(timeSeconds * 60 * 0.2));
  drawGear(context, gearB, 1);
  /*drawCircleOfBestFitAtLoopIndex(
    context,
    gearA.pitchCurve.fidelicDiscreteLoop,
    timeSeconds * 60 * 0.2,
    -(30 * Math.PI) / 180,
  );*/
}
draw(0);
console.log(gearB.pitchCurve.angleSyncMap);
// runs ~60fps

function animate(timeMs: number) {
  draw(timeMs);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
