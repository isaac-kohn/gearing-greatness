import "./style.css";

import {
  drawClosedPolygonWithHoles,
  drawGear,
  drawPoint,
  drawPolygonalChain,
  drawSelectGear,
} from "./canvasStuff/drawGeometry";
import {
  createConjugateGear,
  createGearFromPolarParam,
  type Gear,
} from "./generate/gear";
import { createThreeWindow, type ThreeWindow } from "./threeStuff/threeWindow";
import {
  compileGearToPolygon,
  polygonToExtrudedMesh,
  type PolygonWithHoles,
} from "./threeStuff/compileGear";
import { STUDWIDTH } from "./generate/crossHoleShape";
import { drawCameraBox } from "./canvasScenes/stickFigure";
import {
  add,
  copyVertexArray,
  distance,
  dot,
  magnitude,
  perp,
  polarToVertex,
  scale,
  setMagnitude,
  sub,
  toWorld,
  vertexToPolar,
  type CornerRect,
  type Line,
  type Orientation,
  type PolarVector,
  type Vector2d,
} from "./generate/vector";
import { drawPointCloud } from "./canvasScenes/rotatingBlanks";
import {
  createConjugatePitchCurve,
  findConjCenterDistByPolarArray,
  findConjPitchCurveByPolarArray,
  findConjugateCenterDistance,
  type PitchCurve,
} from "./generate/pitchCurve";
import {
  discretePolarArrayToPolarParameterization,
  discretizePolarParamaterization,
  tangentAtIndexOfVertexArray,
  type PolarParamaterization,
} from "./generate/calc";
import type { PolygonalLoop } from "./generate/polygonalLoop";

interface AppUI {
  editModeButton: HTMLButtonElement;
  simulateModeButton: HTMLButtonElement;
}

export interface AppState {
  gearMode: "edit" | "simulate";
  isDragging: boolean;
  gearsNeedRegen: boolean;
  isCanvasLooping: boolean;
  mouseClientPosition: Vector2d;
  canvas?: HTMLCanvasElement;
  threeCanvas?: ThreeWindow;
  context?: CanvasRenderingContext2D;
  gearA?: Gear;
  gearB?: Gear;
  selectedGear?: Gear;
  selectedGearConjugate?: Gear;
  selectedIndex?: number;
  selectedNormalLine?: Line;
  selectedOriginalDiscreteLoopVertices?: Vector2d[];
  selectedConjugateOriginalDiscreteLoopVertices?: Vector2d[];
  originalConjugateDistance?: number;
  polygonGearA?: PolygonWithHoles;
  polygonGearB?: PolygonWithHoles;
  UI: AppUI;
}

export let APPSTATE: AppState = {
  gearMode: "edit",
  isDragging: false,
  gearsNeedRegen: false,
  isCanvasLooping: false,
  mouseClientPosition: { x: 0, y: 0 },
  UI: {
    editModeButton: document.createElement("button"),
    simulateModeButton: document.createElement("button"),
  },
};

const pitchEditFalloff = (t: number, radius: number, strength: number) => {
  if (Math.abs(t) < Math.abs(radius))
    return strength * 0.5 * (Math.cos((Math.PI * Math.abs(t)) / radius) + 1);
  return 0;
};

const toggleGearMode = (switchFromMode?: "edit" | "simulate") => {
  if (switchFromMode !== undefined) {
    console.log("booby");
    APPSTATE.gearMode = switchFromMode; // this is kind of evil, but idc lol i'm not using react rn
  }
  const updateButtonUI = (
    activeBtn: HTMLButtonElement,
    inactiveBtn: HTMLButtonElement,
  ) => {
    activeBtn.style.color = "white";
    activeBtn.style.background = "blue";
    inactiveBtn.style.color = "black";
    inactiveBtn.style.background = "white";
  };
  if (APPSTATE.gearMode === "edit") {
    APPSTATE.gearMode = "simulate";
    updateButtonUI(APPSTATE.UI.simulateModeButton, APPSTATE.UI.editModeButton);
  } else {
    APPSTATE.gearMode = "edit";
    updateButtonUI(APPSTATE.UI.editModeButton, APPSTATE.UI.simulateModeButton);
  }
};

const clientPositionToCanvasPosition = (clientPosition: Vector2d): Vector2d => {
  const { canvas, context } = APPSTATE;
  if (!canvas || !context) throw Error;
  // 1. Map to raw canvas backing store pixels (DPI scaling)
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (clientPosition.x - rect.left) * scaleX;
  const canvasY = (clientPosition.y - rect.top) * scaleY;
  // 2. Reverse the context transforms (center offset & flipped Y-axis)
  const inv = context.getTransform().invertSelf();
  const x = canvasX * inv.a + canvasY * inv.c + inv.e;
  const y = canvasX * inv.b + canvasY * inv.d + inv.f;
  return { x, y };
};

const listenForLoopIntersection = (mousePosition: Vector2d) => {
  mousePosition = clientPositionToCanvasPosition(mousePosition);
  if (!APPSTATE.gearA || !APPSTATE.gearB) return;
  const MINACTIVEDIST = 20;
  // brute force method
  const verticesA = APPSTATE.gearA.pitchCurve.renderedDiscreteLoop.vertices;
  const verticesB = APPSTATE.gearB.pitchCurve.renderedDiscreteLoop.vertices;
  const orientationA = APPSTATE.gearA.orientation;
  const orientationB = APPSTATE.gearB.orientation;
  const findClosestVertexIndex = (vertices: Vector2d[]): [number, number] => {
    let smallestDist = Infinity;
    let smallestIndex = -1;
    for (let i = 0; i < vertices.length; i++) {
      const thisDist = distance(vertices[i], mousePosition);
      if (thisDist < smallestDist) {
        smallestDist = thisDist;
        smallestIndex = i;
      }
    }
    return [smallestIndex, smallestDist];
  };
  const [closestIndexA, closestDistA] = findClosestVertexIndex(
    verticesA.map((v) => toWorld(v, orientationA)),
  );
  const [closestIndexB, closestDistB] = findClosestVertexIndex(
    verticesB.map((v) => toWorld(v, orientationB)),
  );
  if (Math.min(closestDistA, closestDistB) > MINACTIVEDIST) {
    APPSTATE.selectedGear = undefined;
    APPSTATE.selectedIndex = undefined;
    APPSTATE.selectedNormalLine = undefined;
    APPSTATE.selectedGearConjugate = undefined;
  } else if (closestDistA < closestDistB) {
    APPSTATE.selectedGear = APPSTATE.gearA;
    APPSTATE.selectedGearConjugate = APPSTATE.gearB;
    APPSTATE.selectedIndex = closestIndexA;
    const v0 =
      APPSTATE.gearA.pitchCurve.renderedDiscreteLoop.vertices[closestIndexA];
    const normalVector = perp(
      APPSTATE.gearA.pitchCurve.renderedDiscreteLoop.tangentAtIndex(
        closestIndexA,
      ),
    );
    APPSTATE.selectedNormalLine = { v0, v1: add(normalVector, v0) };
    APPSTATE.selectedOriginalDiscreteLoopVertices = copyVertexArray(
      APPSTATE.gearA.pitchCurve.renderedDiscreteLoop.vertices,
    );
    APPSTATE.selectedConjugateOriginalDiscreteLoopVertices = copyVertexArray(
      APPSTATE.gearB.pitchCurve.renderedDiscreteLoop.vertices,
    );
    APPSTATE.originalConjugateDistance = distance(
      APPSTATE.gearA.getCenter(),
      APPSTATE.gearB.getCenter(),
    );
  } else {
    APPSTATE.selectedGear = APPSTATE.gearB;
    APPSTATE.selectedGearConjugate = APPSTATE.gearA;
    APPSTATE.selectedIndex = closestIndexB;
    const v0 =
      APPSTATE.gearB.pitchCurve.renderedDiscreteLoop.vertices[closestIndexB];
    const normalVector = perp(
      APPSTATE.gearB.pitchCurve.renderedDiscreteLoop.tangentAtIndex(
        closestIndexB,
      ),
    );
    APPSTATE.selectedNormalLine = { v0, v1: add(normalVector, v0) };
    APPSTATE.selectedOriginalDiscreteLoopVertices = copyVertexArray(
      APPSTATE.gearB.pitchCurve.renderedDiscreteLoop.vertices,
    );
    APPSTATE.selectedConjugateOriginalDiscreteLoopVertices = copyVertexArray(
      APPSTATE.gearA.pitchCurve.renderedDiscreteLoop.vertices,
    );
    APPSTATE.originalConjugateDistance = distance(
      APPSTATE.gearA.getCenter(),
      APPSTATE.gearB.getCenter(),
    );
  }
};

const cancelDragOperation = () => {
  APPSTATE.isDragging = false;
  if (
    APPSTATE.selectedGear === undefined ||
    APPSTATE.selectedOriginalDiscreteLoopVertices === undefined
  )
    return;
  APPSTATE.selectedGear.pitchCurve.renderedDiscreteLoop.vertices =
    APPSTATE.selectedOriginalDiscreteLoopVertices;
  APPSTATE.selectedGearConjugate!.pitchCurve.renderedDiscreteLoop.vertices =
    APPSTATE.selectedConjugateOriginalDiscreteLoopVertices!;
  const isOnRight = APPSTATE.selectedGearConjugate!.isConjugate ? 1 : -1; // very very disturbing code
  APPSTATE.selectedGearConjugate!.setCenter(
    add(APPSTATE.selectedGear.getCenter(), {
      x: isOnRight * APPSTATE.originalConjugateDistance!,
      y: 0,
    }),
  );
  centerGears();
};

const bootEventListeners = () => {
  // tab to toggle gear mode
  window.addEventListener("keydown", (e) => {
    const activeTag = document?.activeElement?.tagName.toLowerCase() || "none";
    if (e.key === "Escape" && APPSTATE.isDragging) {
      cancelDragOperation();
    }
    const isTyping =
      activeTag === "input" ||
      activeTag === "textarea" ||
      activeTag === "select";
    if (isTyping) return;
    if (e.key === "Tab") {
      e.preventDefault();
      cancelDragOperation();
      toggleGearMode();
    }
  });
  window.addEventListener("mousemove", (e) => {
    APPSTATE.mouseClientPosition = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener("mousedown", (e) => {
    console.log("testing");
    if (APPSTATE.gearMode === "edit") {
      if (!APPSTATE.isDragging) {
        if (APPSTATE.selectedGear !== undefined) {
          APPSTATE.isDragging = true;
        }
      } else {
        APPSTATE.isDragging = false;
        APPSTATE.gearsNeedRegen = true;
      }
    }
  });
};

const resizeHTMLCanvas = () => {
  const { canvas, context } = APPSTATE;
  if (!canvas || !context) throw Error;
  // actual canvas width/height in "css pixels"
  const WIDTH = window.innerWidth * 0.9; // 800;
  const HEIGHT = window.innerHeight * 0.9; // 600;
  const pixelRatio = Math.min(window.devicePixelRatio, 2); // unblurring - higher pixelRatio means sharper images
  canvas.width = WIDTH * pixelRatio;
  canvas.height = HEIGHT * pixelRatio;
  canvas.style.width = `${WIDTH}px`;
  canvas.style.height = `${HEIGHT}px`;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(pixelRatio, pixelRatio);
  context.translate(WIDTH / 2, HEIGHT / 2);
  context.scale(1, -1);
};

const bootHTMLCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.style.border = "solid lightgrey";
  document.body.append(canvas);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get 2D context");
  APPSTATE.canvas = canvas;
  APPSTATE.context = context;
  resizeHTMLCanvas();
  /*const threeCanvas = createThreeWindow();
  document.body.append(threeCanvas.element);
  //threeCanvas.style.display = "none";
  APPSTATE.threeCanvas = threeCanvas;

  const downloadButton = document.createElement("button");
  downloadButton.textContent = "Download STL";

  downloadButton.addEventListener("click", () => {
    threeCanvas.downloadSTL();
  });

  document.body.append(downloadButton);*/
};

const bootUI = () => {
  const { editModeButton, simulateModeButton } = APPSTATE.UI;
  editModeButton.textContent = "edit";
  simulateModeButton.textContent = "simulate";
  toggleGearMode("simulate");
  editModeButton.onclick = () => toggleGearMode("simulate");
  simulateModeButton.onclick = () => toggleGearMode("edit");
  const modeToggleDiv = document.createElement("div");
  modeToggleDiv.style.position = "absolute";
  modeToggleDiv.style.top = "50px";
  modeToggleDiv.style.left = "50px";
  const modeToggleHint = document.createElement("p");
  modeToggleHint.textContent = "Press tab to switch modes";
  modeToggleDiv.append(editModeButton, simulateModeButton, modeToggleHint);
  document.body.append(modeToggleDiv);
};

const centerGears = () => {
  if (!APPSTATE.gearA || !APPSTATE.gearB) return;
  const centerA = APPSTATE.gearA.getCenter();
  const centerB = APPSTATE.gearB.getCenter();
  const midX = (centerA.x + centerB.x) / 2;
  APPSTATE.gearA.setCenter({ x: centerA.x - midX, y: centerA.y });
  APPSTATE.gearB.setCenter({ x: centerB.x - midX, y: centerB.y });
  APPSTATE.gearA.setDirection(0);
};

const bootGears = () => {
  APPSTATE.gearA = createGearFromPolarParam(
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
        return {
          mag: 200 + Math.sin(u) + 15 * Math.sin(u) - 10 * Math.sin(3 * u),
          angle: u,
        };

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
    (25 * Math.PI) / 180,
    40,
    STUDWIDTH * 4,
    4000,
    400,
  );
  APPSTATE.gearB = createConjugateGear(APPSTATE.gearA);
  centerGears();
  APPSTATE.polygonGearA = compileGearToPolygon(APPSTATE.gearA);
  /*APPSTATE.threeCanvas!.addPolygon(
    APPSTATE.polygonGearA,
    //[APPSTATE.gearA.centerBore],
    10,
  );*/
  APPSTATE.polygonGearB = compileGearToPolygon(APPSTATE.gearB);
  //APPSTATE.threeCanvas!.addPolygon(APPSTATE.polygonGearB, 10);
};

export const mainImport = () => {
  bootEventListeners();
  bootHTMLCanvas();
  bootUI();
  bootGears();
  const { canvas, context } = APPSTATE;
  if (!canvas || !context || !APPSTATE.gearA || !APPSTATE.gearB) throw Error;

  draw(0);
};

const drawSimulateMode = (timeMs: number) => {
  const timeSeconds = timeMs / 1000;
  const { canvas, context } = APPSTATE;
  if (
    !context ||
    !canvas ||
    !APPSTATE.gearA ||
    !APPSTATE.gearB ||
    !APPSTATE.polygonGearA ||
    !APPSTATE.polygonGearB
  )
    throw Error;
  const [WIDTH, HEIGHT] = [canvas.width, canvas.height];
  // clear canvas by drawing a big rect over everything
  context.fillStyle = "#eee";
  context.fillRect(-canvas?.width / 2, -HEIGHT / 2, WIDTH, HEIGHT);

  context.strokeStyle = "#000";
  context.lineWidth = 2;

  APPSTATE.gearA.setDirection(timeSeconds * 0.3);
  context.fillStyle = "pink";
  drawClosedPolygonWithHoles(
    context,
    APPSTATE.polygonGearA,
    APPSTATE.gearA.orientation,
  );
  drawClosedPolygonWithHoles(
    context,
    APPSTATE.polygonGearB,
    APPSTATE.gearB.orientation,
  );
};

const mutatePitchCurve = (
  isFidelic: boolean,
): undefined | { newSelectedPolars: PolarVector[] } => {
  const mousePosition = clientPositionToCanvasPosition(
    APPSTATE.mouseClientPosition,
  );
  const gearA = APPSTATE.selectedGear;
  const gearB = APPSTATE.selectedGearConjugate;
  const { selectedIndex, selectedNormalLine } = APPSTATE;
  if (!gearA || !gearB || !selectedIndex || !selectedNormalLine) return;
  const curveA = isFidelic
    ? gearA.pitchCurve.fidelicDiscreteLoop
    : gearA.pitchCurve.renderedDiscreteLoop;
  const originalVector = toWorld(selectedNormalLine.v0, gearA.orientation);
  const originalV1 = toWorld(selectedNormalLine.v1, gearA.orientation);
  const normalVector = setMagnitude(sub(originalV1, originalVector), 1);
  const tangentVector = setMagnitude(perp(normalVector), 1);
  const normalDistance = dot(normalVector, sub(mousePosition, originalVector));
  const tangentDistance = Math.abs(
    dot(tangentVector, sub(mousePosition, originalVector)),
  );
  const stretch = normalDistance;
  const numVertices = curveA.vertices.length;
  const numUnfidelicVertices =
    gearA.pitchCurve.renderedDiscreteLoop.vertices.length;
  const fidelityConversionRatio = numVertices / numUnfidelicVertices;
  const selectedFidelicIndex = Math.floor(
    selectedIndex * fidelityConversionRatio,
  );
  //const avgRadius = gearA.pitchCurve.averageRadius;
  const TAU = 2 * Math.PI;
  const minRatio = 2; // the pullyouty cannot be too pointy
  const minBwdRatio = 4;
  const magSign = gearA.isConjugate ? 1 : -1; // this is very dumb, hopefully it doesn't lead to any nightmare bugs
  const minRat = magSign * normalDistance > 0 ? minRatio : minBwdRatio;
  let falloffSpan = tangentDistance;
  falloffSpan = Math.floor(
    Math.max(Math.abs(minRat * stretch), Math.abs(falloffSpan)) / TAU,
  );
  falloffSpan =
    fidelityConversionRatio * Math.min(falloffSpan, 0.5 * numVertices);
  for (let i = -numVertices / 2; i < numVertices / 2; i++) {
    const index =
      (((i + selectedFidelicIndex) % numVertices) + numVertices) % numVertices;
    const p = curveA.polarVectors[index];
    const curveEditParam = i;
    const mag =
      p.mag + magSign * pitchEditFalloff(curveEditParam, falloffSpan, stretch);
    curveA.vertices[index] = polarToVertex({ mag, angle: p.angle });
  }
  const newPolarsA = curveA.vertices.map(vertexToPolar);
  return { newSelectedPolars: newPolarsA };
};

const dragPitchCurve = (mousePosition: Vector2d) => {
  const newPolarsA = mutatePitchCurve(false)?.newSelectedPolars;
  const gearB = APPSTATE.selectedGearConjugate;
  const gearA = APPSTATE.selectedGear;
  if (!newPolarsA || !gearB || !gearA) return;
  const L = findConjCenterDistByPolarArray(newPolarsA);
  const { polarArrayB, alphaArray, betaArray } = findConjPitchCurveByPolarArray(
    newPolarsA,
    L,
  );
  const conjSign = gearB.isConjugate ? 1 : -1;
  gearB.pitchCurve.renderedDiscreteLoop.vertices =
    polarArrayB.map(polarToVertex);
  gearB.orientation.center = add(gearA.orientation.center, {
    x: conjSign * L,
    y: 0,
  });
  gearB.orientation.rotation = betaArray[0];
};

const finishDraggingPitchCurve = (mousePosition: Vector2d) => {
  const newPolarsA = mutatePitchCurve(true)?.newSelectedPolars;
  if (!newPolarsA) return;
  const newPolarParamA: PolarParamaterization =
    discretePolarArrayToPolarParameterization(newPolarsA);
  APPSTATE.gearA = createGearFromPolarParam(
    newPolarParamA,
    (25 * Math.PI) / 180,
    30,
    STUDWIDTH * 4,
    4000,
    400,
  );
  APPSTATE.gearB = createConjugateGear(APPSTATE.gearA);
  centerGears();
  APPSTATE.polygonGearA = compileGearToPolygon(APPSTATE.gearA);
  APPSTATE.polygonGearB = compileGearToPolygon(APPSTATE.gearB);
};

const drawEditMode = (timeMs: number) => {
  const { canvas, context } = APPSTATE;
  if (!context || !canvas || !APPSTATE.gearA || !APPSTATE.gearB) throw Error;
  const [WIDTH, HEIGHT] = [canvas.width, canvas.height];
  // clear canvas by drawing a big rect over everything
  context.fillStyle = "#eee";
  context.fillRect(-canvas?.width / 2, -HEIGHT / 2, WIDTH, HEIGHT);

  context.strokeStyle = "#000";
  context.lineWidth = 2;
  if (APPSTATE.isDragging) {
    dragPitchCurve(APPSTATE.mouseClientPosition);
  } else if (APPSTATE.gearsNeedRegen) {
    finishDraggingPitchCurve(APPSTATE.mouseClientPosition);
    APPSTATE.gearsNeedRegen = false;
  } else {
    listenForLoopIntersection(APPSTATE.mouseClientPosition);
  }
  drawGear(context, APPSTATE.gearA, { drawTeeth: !APPSTATE.isDragging });
  drawGear(context, APPSTATE.gearB, { drawTeeth: !APPSTATE.isDragging });
  if (APPSTATE.selectedGear) {
    drawSelectGear(
      context,
      APPSTATE.selectedGear,
      APPSTATE.selectedIndex!,
      APPSTATE.isDragging,
    );
  }
};

function draw(timeMs: number) {
  if (APPSTATE.gearMode === "simulate") {
    drawSimulateMode(timeMs);
  } else {
    drawEditMode(timeMs);
  }
}

// runs ~60fps

function animate(timeMs: number) {
  draw(timeMs);
  requestAnimationFrame(animate);
  /*if (APPSTATE.gearMode === "simulate" || APPSTATE.isDragging) {
    requestAnimationFrame(animate);
  } else APPSTATE.isCanvasLooping = false;*/
}

requestAnimationFrame(animate);
