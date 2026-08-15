import "./style.css";

import {
  drawClosedPolygonWithHoles,
  drawGear,
  drawPoint,
  drawPolygonalChain,
} from "./canvasStuff/drawGeometry";
import { createConjugateGear, createGearFromPolarParam } from "./generate/gear";
import { createThreeWindow } from "./threeStuff/threeWindow";
import {
  compileGearToPolygon,
  polygonToExtrudedMesh,
} from "./threeStuff/compileGear";
import { STUDWIDTH } from "./generate/crossHoleShape";
import { drawCameraBox } from "./canvasScenes/stickFigure";
import type { CornerRect } from "./generate/vector";
import { drawPointCloud } from "./canvasScenes/rotatingBlanks";

export const mainImport = () => {
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
  proboscisImg.src = "CaptainTowerHighFidelity.webp"; //"/ProboscisFaceForStickFigure.png";

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
        /*const term1 = ((Math.sin(3 * u) + 3) / 4) * Math.cos(u);
      const term2 = ((Math.sin(3 * u) + 4) / 4) * Math.sin(u);

      const rho = Math.sqrt(Math.pow(term1, 2) + Math.pow(term2, 2));
      const theta = Math.atan2(term2, term1); // Using atan2 handling division-by-zero safely

      return {
        mag: rho,
        angle: theta,
      };*/
        return { mag: 150 - 0 * Math.cos(2 * u), angle: u };

        return {
          mag:
            150 -
            5 * Math.cos(4 * u) -
            5 * Math.sin(5 * u) +
            5 * Math.sin(8 * u),
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
    (40 * Math.PI) / 180,
    10,
    STUDWIDTH * 4,
    4000,
    100,
  );

  const gearB = createConjugateGear(gearA);
  {
    const centerA = gearA.getCenter();
    const centerB = gearB.getCenter();
    const midX = (centerA.x + centerB.x) / 2;
    //gearA.setCenter({ x: centerA.x - midX, y: centerA.y });
    //gearB.setCenter({ x: centerB.x - midX, y: centerB.y });
  }

  /*
  const polygonGearA = compileGearToPolygon(gearA);
  //threeCanvas.addPolygon(polygonGearA, [gearA.centerBore], 10);
  const polygonGearB = compileGearToPolygon(gearB);
  threeCanvas.addPolygon(polygonGearB, 10);*/

  function draw(timeMs: number) {
    const timeSeconds = timeMs / 1000;

    if (!context) {
      throw new Error("Could not get 2D context");
    }

    // clear canvas by drawing a big rect over everything
    context.fillStyle = "black"; //"#eee";
    context.fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);

    // proboscis
    /*if (imageLoaded) {
      context.save();
      // invert the y axis transformation so the image doesn't render upside down
      // a negative y offset now moves the image up, not down.
      context.scale(0.3, -0.3);
      context.drawImage(
        proboscisImg,
        -proboscisImg.width / 2,
        -proboscisImg.height / 2,
      );

      context.restore();
    }*/

    context.strokeStyle = "#000";
    context.lineWidth = 2;
    context.fillStyle = "#0ff";

    const loopedSeconds = 1 + Math.sin(timeSeconds);

    gearA.setDirection(loopedSeconds * 0.2 - 0.2); // + Math.cos(timeSeconds));

    drawGear(context, gearA, 24 * loopedSeconds - 24);
    //drawGear(context, gearA, Math.floor(timeSeconds * 60 * 0.2));
    drawGear(context, gearB, 24 * loopedSeconds - 24);

    /*drawCircleOfBestFitAtLoopIndex(
    context,
    gearA.pitchCurve.fidelicDiscreteLoop,
    timeSeconds * 60 * 0.2,
    -(30 * Math.PI) / 180,
  );*/
    context.fillStyle = "pink";
    //drawClosedPolygonWithHoles(context, polygonGearA, gearA.orientation);
    //drawClosedPolygonWithHoles(context, polygonGearB, gearB.orientation);
    const boundRect: CornerRect = {
      bottomLeft: { x: -250, y: -250 },
      width: 700,
      height: 500,
    };
    drawPointCloud(
      context,
      gearB.getCenter(),
      gearB.orientation.rotation,
      500,
      500,
      80,
      80,
      "ffffff",
      { x: gearB.axleDistance / 2, y: 0 },
      0.01,
    );
    drawCameraBox(
      context,
      gearA.getCenter(),
      300,
      300,
      boundRect,
      gearA.orientation.rotation,
    );
    drawPoint(context, gearB.getCenter(), { color: "red" });
  }
  draw(0);

  // runs ~60fps

  function animate(timeMs: number) {
    if (!context) throw Error;
    context.fillStyle = "black"; //"#eee";
    context.fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);
    context.save();
    context.translate(150, 0);
    context.rotate(-gearA.orientation.rotation);
    context.scale(0.5, 0.5);
    draw(timeMs);
    context.restore();
    context.save();
    context.translate(-250, 0);
    context.scale(0.5, 0.5);
    draw(timeMs);
    context.restore();
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
};
