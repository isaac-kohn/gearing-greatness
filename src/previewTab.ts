import { drawPolygonalLoop } from "./canvasStuff/drawGeometry";
import {
  discretizePolarParamaterization,
  type PolarParamaterization,
} from "./generate/calc";
import {
  createPolygonalLoop,
  type PolygonalLoop,
} from "./generate/polygonalLoop";
import type { Vector2d } from "./generate/vector";

export interface PreviewContainer {
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  element: HTMLDivElement;
  tabs: PreviewTab[];
  rerender: () => void;
  resize: (width: number, height: number) => void;
  checkMouseIntersection: (mousePosition: Vector2d) => void;
  selectCurrent: () => void;
}

export const createPreviewContainer = (
  previewTabs: PreviewTab[],
): PreviewContainer => {
  const root = document.createElement("div");
  const canvas = document.createElement("canvas");
  const title = document.createElement("p");
  title.textContent = "Pitch Curve Gallery";
  title.style.fontSize = "30px";
  title.style.textAlign = "center";
  root.appendChild(title);
  root.appendChild(canvas);
  root.style.background = "lightgrey";
  root.style.border = "black";
  root.style.borderStyle = "solid";
  canvas.style.border = "solid lightgrey";
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get 2D context");
  return {
    element: root,
    canvas,
    context,
    tabs: previewTabs,
    rerender: () => renderPreviewContainer(context, canvas, previewTabs),
    resize: (w: number, h: number) => {
      resizePreviewContainer(w, h, context, canvas);
    },
    checkMouseIntersection: (mousePosition) =>
      checkMouseIntersection(context, canvas, previewTabs, mousePosition),
    selectCurrent: () => {
      previewTabs.forEach((tab) => {
        if (tab.isHovered) {
          previewTabs.forEach((t) => {
            t.isSelected = false;
          });
          tab.isSelected = true;
        }
      });
    },
  };
};

const renderPreviewContainer = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  previewTabs: PreviewTab[],
): void => {
  const [WIDTH, HEIGHT] = [canvas.width, canvas.height];
  // clear canvas by drawing a big rect over everything
  context.fillStyle = "lightgray";
  context.fillRect(-canvas?.width / 2, -HEIGHT / 2, WIDTH, HEIGHT);

  context.strokeStyle = "#000";
  context.lineWidth = 2;

  previewTabs.forEach((tab, index) => {
    drawPreviewTab(context, canvas, tab, index);
  });
};

const resizePreviewContainer = (
  w: number,
  h: number,
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
) => {
  canvas.width = w;
  canvas.height = h;
  const pixelRatio = Math.min(window.devicePixelRatio, 2); // unblurring - higher pixelRatio means sharper images
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(pixelRatio, pixelRatio);
  context.translate(w / 2, h / 2);
  context.scale(1, -1);
};

export interface PreviewTab {
  title: string;
  renderedLoop: PolygonalLoop;
  polarParamaterization: PolarParamaterization;
  maxRadius: number;
  isHovered: boolean;
  isSelected: boolean;
}

export const CreatePreviewTab = (
  title: string,
  polarParamaterization: PolarParamaterization,
): PreviewTab => {
  const renderedLoop = createPolygonalLoop(
    discretizePolarParamaterization(polarParamaterization, 100),
  );
  let maxRadius = 0;
  renderedLoop.polarVectors.forEach((polar) => {
    if (polar.mag > maxRadius) maxRadius = polar.mag;
  });
  return {
    title,
    renderedLoop,
    maxRadius,
    polarParamaterization,
    isHovered: false,
    isSelected: false,
  };
};

const drawPreviewTab = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  previewTab: PreviewTab,
  index: number,
) => {
  context.save();
  const i = index % 2;
  const j = Math.floor(index / 2);
  const [WIDTH, HEIGHT] = [canvas.width, canvas.height];
  // just gonna assume there will always be 2x4 tabs
  const tabWidth = WIDTH / 2;
  const tabHeight = HEIGHT / 4;
  const desiredHeight = previewTab.maxRadius * 1.5;
  const zoomFactor = tabHeight / desiredHeight;
  context.scale(zoomFactor / 4, zoomFactor / 4);
  context.translate(-desiredHeight, desiredHeight * 3);
  context.translate(desiredHeight * i * 2, -desiredHeight * j * 2);
  context.fillStyle = "#eee";
  if (previewTab.isSelected) {
    context.fillStyle = "blue";
    context.strokeStyle = "white";
  } else if (previewTab.isHovered) context.fillStyle = "lightblue";
  const rectWidth = desiredHeight * 1.9;
  context.fillRect(-rectWidth / 2, -rectWidth / 2, rectWidth, rectWidth);
  drawPolygonalLoop(context, previewTab.renderedLoop);
  context.strokeStyle = "black";
  context.restore();
};

const clientPositionToCanvasPosition = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  clientPosition: Vector2d,
): Vector2d => {
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

const checkMouseIntersection = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  previewTabs: PreviewTab[],
  mousePosition: Vector2d,
) => {
  mousePosition = clientPositionToCanvasPosition(
    context,
    canvas,
    mousePosition,
  );
  const [width, height] = [canvas.width, canvas.height];
  // LMAO, i have no idea why these numbers work, but fuck it
  const i = Math.floor((4 * mousePosition.x + width) / width);
  const j = Math.floor((-8 * mousePosition.y + 2 * height) / height);
  console.log(mousePosition.x, mousePosition.y);
  previewTabs.forEach((tab) => {
    tab.isHovered = false;
  });
  if (i >= 0 && i <= 1 && j >= 0 && j <= 3) {
    const index = 2 * j + i;
    previewTabs[index].isHovered = true;
  }
};
