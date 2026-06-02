export function createApp() {
  const canvas = document.createElement("canvas");

  canvas.id = "c";

  const ui = document.createElement("div");

  ui.id = "ui";

  const sineButton = document.createElement("button");
  sineButton.textContent = "Sine";

  const squareButton = document.createElement("button");
  squareButton.textContent = "Square";

  const spiralButton = document.createElement("button");
  spiralButton.textContent = "Spiral";

  ui.append(sineButton, squareButton, spiralButton);

  document.body.append(canvas, ui);
}
