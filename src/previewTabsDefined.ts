import { CreatePreviewTab } from "./previewTab";

const tab6 = CreatePreviewTab("Star", {
  fn: (u) => {
    return { angle: u, mag: 100 - 20 * Math.sin(5 * u) };
  },
  domainMax: 2 * Math.PI,
  domainMin: 0,
});
const tab2 = CreatePreviewTab("Hexagon", {
  fn: (u) => {
    return { angle: u, mag: 100 - 5 * Math.sin(6 * u) };
  },
  domainMax: 2 * Math.PI,
  domainMin: 0,
});
const tab3 = CreatePreviewTab("Square", {
  fn: (u) => {
    return { angle: u, mag: 100 - 10 * Math.sin(4 * u) };
  },
  domainMax: 2 * Math.PI,
  domainMin: 0,
});
const tab4 = CreatePreviewTab("Triangle", {
  fn: (u) => {
    return { angle: u, mag: 100 - 20 * Math.sin(3 * u) };
  },
  domainMax: 2 * Math.PI,
  domainMin: 0,
});
const tab5 = CreatePreviewTab("Teardrop", {
  fn: (u) => {
    return { angle: u, mag: 100 - 65 * Math.sin(1 * u) };
  },
  domainMax: 2 * Math.PI,
  domainMin: 0,
});
const tab1 = CreatePreviewTab("Circle", {
  fn: (u) => {
    return { angle: u, mag: 100 };
  },
  domainMax: 2 * Math.PI,
  domainMin: 0,
});
const tab7 = CreatePreviewTab("Peanut", {
  fn: (u) => {
    return { angle: u, mag: 100 - 50 * Math.sin(2 * u) };
  },
  domainMax: 2 * Math.PI,
  domainMin: 0,
});
const tab8 = CreatePreviewTab("Ninja", {
  fn: (u) => {
    return { angle: u, mag: 100 - 30 * Math.cos(4 * u) };
  },
  domainMax: 2 * Math.PI,
  domainMin: 0,
});

tab3.isSelected = true;

export const previewTabs = [tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8];
