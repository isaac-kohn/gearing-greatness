import type { Line, Orientation, Vector2d } from "../../generate/vector";

export interface CanvasScene {
  init: () => void;
  draw: (timeMs: number) => void;
}

export type CanvasSceneBooter = (
  context: CanvasRenderingContext2D,
  canvasElement: HTMLCanvasElement,
) => CanvasScene;

export type CanvasSceneBooterGetter = () => CanvasSceneBooter;

export interface RenderedImageStyle {
  getDimensions?: () => Vector2d;
  getOrientation?: () => Orientation;
  getTransparency?: () => number;
}

export interface RenderedImage {
  element: HTMLImageElement;
  isLoaded: Boolean;
  render: () => void;
  style: RenderedImageStyle;
}

export const createRenderedImage = (
  context: CanvasRenderingContext2D,
  src: string,
  style?: RenderedImageStyle,
): RenderedImage => {
  let isLoaded = false;
  const image = new Image();
  image.onload = () => {
    isLoaded = true;
  };
  image.src = src;
  let getDimensions =
    style?.getDimensions ||
    (() => {
      if (!isLoaded) return { x: 0, y: 0 };
      return { x: image.width, y: image.height };
    });
  let getOrientation =
    style?.getOrientation ||
    (() => {
      return { mirrored: false, center: { x: 0, y: 0 }, rotation: 0 };
    });
  const getTransparency =
    style?.getTransparency ||
    (() => {
      return 1;
    });
  style = { getDimensions, getOrientation, getTransparency };
  const render = () => {
    if (isLoaded) {
      const dimensions = style.getDimensions!();
      const orientation = style.getOrientation!();
      const transparency = style!.getTransparency!();
      context.save();
      context.globalAlpha = transparency;
      context.translate(orientation.center.x, orientation.center.y);
      context.rotate(orientation.rotation);
      if (orientation.mirrored) context.scale(-1, 1);
      context.scale(dimensions.x / image.width, -dimensions.y / image.height);
      context.drawImage(image, -image.width / 2, -image.height / 2);
      context.restore();
    }
  };
  const element = image;
  return { element, isLoaded, render, style };
};

export const fillCanvasBackground = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  style?: { color?: string | CanvasGradient | CanvasPattern },
) => {
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const fillColor = style?.color || "#eee";
  context.fillStyle = fillColor;
  context.fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);
};
