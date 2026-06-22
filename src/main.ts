import "./style.css";
/*import {
  createCircleLoop,
  createConjugateLoop,
  createLoopFromPolarFunction,
  dendumize,
  indexOfCumulativeLength,
  loopDistanceAtAngle,
  positionAtLoopDistance,
  setRotationByLoopDistance,
} from "./geometry";*/
import { drawPoint, drawPolygonalLoop } from "./drawGeometry";
import { add, direction, lerp, rotate } from "./vector";
import {
  createConjugateLoop,
  createPolygonalLoop,
  interpolatePolygonalLoop,
} from "./newGeometry";

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

function draw(timeMs: number) {
  const timeSeconds = timeMs / 1000;

  // clear canvas by drawing a big rect over everything
  context.fillStyle = "#eee";
  context.fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);

  context.strokeStyle = "#000";
  context.lineWidth = 2;

  const loopA = createPolygonalLoop({ x: -150, y: 0 }, [
    { mag: 100, angle: 0 },
    { mag: 150, angle: Math.PI / 2 },
    { mag: 100, angle: Math.PI },
    { mag: 150, angle: (3 * Math.PI) / 2 },
  ]);
  const splinedLoopA = interpolatePolygonalLoop(loopA, 5);

  const loopCircle = createPolygonalLoop(
    { x: -150, y: 0 },
    Array.from({ length: 10 }, (_, i) => {
      const theta = (i / 10) * 2 * Math.PI;
      return { mag: 100, angle: theta };
    }),
  );
  //drawPolygonalLoop(context, loopCircle);

  //drawPolygonalLoop(context, loopA);
  drawPolygonalLoop(context, splinedLoopA);
  const loopB = createConjugateLoop(splinedLoopA);
  drawPolygonalLoop(context, loopB);
  /*
  //const circleLoop = createCircleLoop({ x: -100, y: 0 }, 200, 24);
  //drawPolygonalLoop(context, circleLoop);

  const peanutLoop = createLoopFromPolarFunction(
    { x: -100, y: 0 },
    (theta) => 120 - 40 * Math.cos(2 * theta),
    96,
  );
  const loopTravelledRatio = timeSeconds * 0.3;
  const loopDistance = loopDistanceAtAngle(
    peanutLoop,
    loopTravelledRatio * 2 * Math.PI,
  ); // loopTravelledRatio * peanutLoop.totalLength;
  setRotationByLoopDistance(peanutLoop, loopDistance);
  drawPolygonalLoop(context, peanutLoop);
  const addendum = 20;
  const dedendum = 1.25 * addendum;
  const addendumLoop = dendumize(peanutLoop, addendum);
  const dedendumLoop = dendumize(peanutLoop, -dedendum);
  context.strokeStyle = "#5AA";
  drawPolygonalLoop(context, addendumLoop);
  drawPolygonalLoop(context, dedendumLoop);

  const loopDistTestPoint = add(
    rotate(
      positionAtLoopDistance(peanutLoop, -loopDistance),
      peanutLoop.rotation,
    ),
    peanutLoop.center,
  );
  drawPoint(context, loopDistTestPoint, 5, "blue");

  const peanutConjugateLoop = createConjugateLoop(peanutLoop, { x: 90, y: 0 }); // { x: 140, y: 0 });
  const conjugateLoopDistance =
    loopTravelledRatio * peanutConjugateLoop.totalLength;
  setRotationByLoopDistance(peanutConjugateLoop, conjugateLoopDistance);

  const { baseIndex, nextIndex, lerpRatio } = indexOfCumulativeLength(
    peanutLoop,
    loopDistance,
  );
  const conjugateRotation = direction(
    lerp(
      peanutConjugateLoop.vertices[baseIndex],
      peanutConjugateLoop.vertices[nextIndex],
      lerpRatio,
    ),
  );
  peanutConjugateLoop.rotation = conjugateRotation;

  context.strokeStyle = "#000";
  drawPolygonalLoop(context, peanutConjugateLoop);
  const conjAddendumLoop = dendumize(peanutConjugateLoop, addendum);
  const conjDedendumLoop = dendumize(peanutConjugateLoop, -dedendum);
  context.strokeStyle = "#5AA";
  drawPolygonalLoop(context, conjAddendumLoop);
  drawPolygonalLoop(context, conjDedendumLoop);
  */
}
draw(0);
// runs ~60fps
/*
function animate(timeMs: number) {
  draw(timeMs);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
*/
