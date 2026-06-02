import type { PolygonalLoop } from "./geometry";
import type { Vector2d } from "./vector";

export const drawPoint = (
  context: CanvasRenderingContext2D,
  point: Vector2d,
  radius = 3,
  color = "red",
) => {
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, 2 * Math.PI);
  context.fillStyle = color;
  context.fill();
};

export const drawPolygonalLoop = (
  context: CanvasRenderingContext2D,
  loop: PolygonalLoop,
  fill = false,
  stroke = true,
  displayCenter = true,
) => {
  context.beginPath();
  context.moveTo(
    loop.vertices[0].x + loop.center.x,
    loop.vertices[0].y + loop.center.y,
  );
  for (let i = 1; i < loop.vertices.length; i++) {
    context.lineTo(
      loop.vertices[i].x + loop.center.x,
      loop.vertices[i].y + loop.center.y,
    );
  }
  context.closePath();
  fill && context.fill();
  stroke && context.stroke();
  if (displayCenter) {
    drawPoint(context, loop.center, 3, "red");
  }
};
