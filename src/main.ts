import { mainImport } from "./mainImport";

import { runCanvasScene } from "./mainAnimations";
import {
  bootStickFigureScene,
  getStickFigureScene,
} from "./canvasScenes/stickFigure";
import { bootRotatingBlanksScene } from "./canvasScenes/rotatingBlanks";
import { bootInvoluteScene } from "./canvasScenes/involuteScene";

//mainImport();

//runCanvasScene(bootStickFigureScene);

//runCanvasScene(bootRotatingBlanksScene);

runCanvasScene(bootInvoluteScene);
