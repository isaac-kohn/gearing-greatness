import { fill } from "three/src/extras/TextureUtils.js";
import "./style.css";
import {
  createCircleLoop,
  createConjugateLoop,
  createLoopFromPolarFunction,
  dendumize,
} from "./geometry";
import { drawPolygonalLoop } from "./drawGeometry";
import { PI } from "three/tsl";

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

function draw() {
  // clear canvas by drawing a big rect over everything
  context.fillStyle = "#eee";
  context.fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);

  context.strokeStyle = "#000";
  context.lineWidth = 2;

  /*
  context.beginPath();
  context.moveTo(100, 100);
  context.lineTo(200, 120);
  context.lineTo(250, 200);
  context.lineTo(150, 260);
  context.closePath();
  context.fillStyle = "#999";
  context.fill();
  context.stroke();*/

  /*const circleLoop = createCircleLoop({ x: -100, y: 0 }, 200, 24);
  const addendum = 50;
  const dedendum = 1.25 * addendum;
  const addendumLoop = dendumize(circleLoop, addendum);
  const dedendumLoop = dendumize(circleLoop, -dedendum);
  drawPolygonalLoop(context, circleLoop);
  context.strokeStyle = "#5AA";
  drawPolygonalLoop(context, addendumLoop);
  drawPolygonalLoop(context, dedendumLoop);*/

  const peanutLoop = createLoopFromPolarFunction(
    { x: -100, y: 0 },
    (theta) => 120 - 40 * Math.cos(2 * theta),
    24,
  );
  drawPolygonalLoop(context, peanutLoop);
  const addendum = 20;
  const dedendum = 1.25 * addendum;
  const addendumLoop = dendumize(peanutLoop, addendum);
  const dedendumLoop = dendumize(peanutLoop, -dedendum);
  context.strokeStyle = "#5AA";
  drawPolygonalLoop(context, addendumLoop);
  drawPolygonalLoop(context, dedendumLoop);

  const peanutConjugateLoop = createConjugateLoop(peanutLoop, { x: 150, y: 0 });
  context.strokeStyle = "#000";
  drawPolygonalLoop(context, peanutConjugateLoop);
  const conjAddendumLoop = dendumize(peanutConjugateLoop, addendum);
  const conjDedendumLoop = dendumize(peanutConjugateLoop, -dedendum);
  context.strokeStyle = "#5AA";
  drawPolygonalLoop(context, conjAddendumLoop);
  drawPolygonalLoop(context, conjDedendumLoop);
}

// runs ~60fps
function animate() {
  draw();
  requestAnimationFrame(animate);
}

animate();
