import type {
  CanvasSceneBooter,
  CanvasSceneBooterGetter,
} from "./canvasScenes/helpers/SceneTypesAndHelp";
import "./style.css";

export const runCanvasScene = (sceneBooter: CanvasSceneBooter) => {
  const canvas = document.createElement("canvas");
  canvas.style.border = "solid lightgrey";
  document.body.append(canvas);

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not get 2D context");
  }

  // actual canvas width/height in "css pixels"
  const WIDTH = screen.width;
  const HEIGHT = screen.height;

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

  //const sceneBooter = getSceneBooter();
  const scene = sceneBooter(context, canvas);
  scene.init();

  function draw(timeMs: number) {
    if (!context) {
      throw new Error("Could not get 2D context");
    }
    scene.draw(timeMs);
  }
  draw(0);

  // runs ~60fps

  function animate(timeMs: number) {
    draw(timeMs);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
};
