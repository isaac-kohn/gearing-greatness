import "./style.css";

import { drawGear, drawPolygonalChain } from "./canvasStuff/drawGeometry";
import { createConjugateGear, createGearFromPolarParam } from "./generate/gear";
import { createThreeWindow } from "./threeStuff/threeWindow";
import {
  compileGearToPolygon,
  polygonToExtrudedMesh,
} from "./threeStuff/compileGear";

const canvas = document.createElement("canvas");
canvas.style.border = "solid lightgrey";
document.body.append(canvas);
//canvas.style.display = "none";

const threeCanvas = createThreeWindow();
document.body.append(threeCanvas.element);
//threeCanvas.style.display = "none";

const downloadButton = document.createElement("button");
downloadButton.textContent = "Download STL";

downloadButton.addEventListener("click", () => {
  threeCanvas.downloadSTL();
});

document.body.append(downloadButton);

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Could not get 2D context");
}

let imageLoaded = false;
const proboscisImg = new Image();
proboscisImg.onload = () => {
  imageLoaded = true; // Signals the draw loop that the asset is ready
};
proboscisImg.src = "/ProboscisFaceForStickFigure.png";

// actual canvas width/height in "css pixels"
const WIDTH = 800;
const HEIGHT = 600;

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio, 2); // unblurring - higher pixelRatio means sharper images

  canvas.width = WIDTH * pixelRatio;
  canvas.height = HEIGHT * pixelRatio;

  canvas.style.width = `${WIDTH}px`;
  canvas.style.height = `${HEIGHT}px`;

  if (!context) {
    throw new Error("Could not get 2D context");
  }

  context.setTransform(1, 0, 0, 1, 0, 0);

  context.scale(pixelRatio, pixelRatio);

  // center coordinates and flip y axis
  context.translate(WIDTH / 2, HEIGHT / 2);
  context.scale(1, -1);
}

resizeCanvas();

const gearA = createGearFromPolarParam(
  {
    fn: (u) => {
      return { mag: 150 - 7.5 * Math.cos(5 * u), angle: u };
      // fix the tooth normal so that it exists for vertical lines
      return {
        mag:
          150 - 5 * Math.cos(4 * u) - 5 * Math.sin(5 * u) + 5 * Math.sin(8 * u),
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
  (25 * Math.PI) / 180,
  35,
  4000,
  100,
);

const gearB = createConjugateGear(gearA);
{
  const centerA = gearA.getCenter();
  const centerB = gearB.getCenter();
  const midX = (centerA.x + centerB.x) / 2;
  gearA.setCenter({ x: centerA.x - midX, y: centerA.y });
  gearB.setCenter({ x: centerB.x - midX, y: centerB.y });
}

const polygonGearA = compileGearToPolygon(gearA);
//threeCanvas.addPolygon(polygonGearA, [gearA.centerBore], 50);
const polygonGearB = compileGearToPolygon(gearB);
threeCanvas.addPolygon(polygonGearB, [gearA.centerBore], 50);

function draw(timeMs: number) {
  const timeSeconds = timeMs / 1000;

  if (!context) {
    throw new Error("Could not get 2D context");
  }

  // clear canvas by drawing a big rect over everything
  context.fillStyle = "#eee";
  context.fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);

  // proboscis
  if (imageLoaded) {
    context.save();
    // invert the y axis transformation so the image doesn't render upside down
    // a negative y offset now moves the image up, not down.
    context.scale(1, -1);
    context.drawImage(
      proboscisImg,
      -proboscisImg.width / 2,
      -proboscisImg.height / 2,
    );

    context.restore();
  }

  context.strokeStyle = "#000";
  context.lineWidth = 2;
  context.fillStyle = "#0ff";
  gearA.setDirection(timeSeconds * 0.2); // + Math.cos(timeSeconds));
  drawGear(context, gearA, 1);
  //drawGear(context, gearA, Math.floor(timeSeconds * 60 * 0.2));
  drawGear(context, gearB, 1);
  /*drawCircleOfBestFitAtLoopIndex(
    context,
    gearA.pitchCurve.fidelicDiscreteLoop,
    timeSeconds * 60 * 0.2,
    -(30 * Math.PI) / 180,
  );*/
  drawPolygonalChain(context, polygonGearA, gearA.orientation);
  drawPolygonalChain(context, polygonGearB, gearB.orientation);
}
draw(0);

// runs ~60fps

function animate(timeMs: number) {
  draw(timeMs);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
