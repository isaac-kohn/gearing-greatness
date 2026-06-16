import type { PolygonalLoop } from "./newGeometry";
import { rotate, type Vector2d } from "./vector";

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
  const vertices = loop.vertices.map((vertex) => rotate(vertex, loop.rotation));
  context.beginPath();
  context.moveTo(vertices[0].x + loop.center.x, vertices[0].y + loop.center.y);
  for (let i = 1; i < loop.vertices.length; i++) {
    context.lineTo(
      vertices[i].x + loop.center.x,
      vertices[i].y + loop.center.y,
    );
  }
  context.closePath();
  fill && context.fill();
  stroke && context.stroke();
  if (displayCenter) {
    drawPoint(context, loop.center, 3, "red");
  }
};
