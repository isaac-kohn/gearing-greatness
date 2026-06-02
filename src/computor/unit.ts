import { createToggleButton } from "./toggleButton";

const createBitDiv = ({
  address,
  numBits,
  type,
}: {
  address: number;
  numBits: number;
  type: "OP" | "AD1" | "AD2" | "VAL";
}) => {
  const bitDiv = document.createElement("div");
  bitDiv.style.padding = "10px";
  bitDiv.style.display = "inline-block";
  const bits = Array.from({ length: numBits }, (_, i) => {
    return createToggleButton({
      id: "@" + address.toString(2) + "-" + type + i.toString(),
    });
  });
  bitDiv.append(...bits.map((bit) => bit.element));
  return {
    element: bitDiv,
    getBits: () =>
      bits
        .map((bit) => {
          const isOn = bit.getState();
          return isOn ? "1" : "0";
        })
        .join(""),
    setBits: (binStr: string) => {
      binStr.length !== bits.length
        ? console.error("setBits failed: invalid input")
        : bits.forEach((bit, i) => {
            const digit = binStr.charAt(i);
            if (digit !== "0" && digit !== "1")
              console.error("setBits failed: invalid input");
            else {
              bit.setState(digit === "1");
            }
          });
    },
  };
};

export const createUnit = ({ address }: { address: number }) => {
  const numOpBits = 2;
  const numAdBits = 2;
  const numValBits = 6;

  const {
    element: opBitDiv,
    getBits: getOpBits,
    setBits: setOpBits,
  } = createBitDiv({
    address: address,
    numBits: numOpBits,
    type: "OP",
  });
  opBitDiv.style.background = "lightblue";

  const {
    element: ad1BitDiv,
    getBits: getAd1Bits,
    setBits: setAd1Bits,
  } = createBitDiv({
    address: address,
    numBits: numAdBits,
    type: "AD1",
  });
  ad1BitDiv.style.background = "lightyellow";

  const {
    element: ad2BitDiv,
    getBits: getAd2Bits,
    setBits: setAd2Bits,
  } = createBitDiv({
    address: address,
    numBits: numAdBits,
    type: "AD2",
  });
  ad2BitDiv.style.background = "lightyellow";

  const {
    element: valBitDiv,
    getBits: getValBits,
    setBits: setValBits,
  } = createBitDiv({
    address: address,
    numBits: numValBits,
    type: "VAL",
  });
  valBitDiv.style.background = "lightgrey";

  let pointerHere: boolean = false;

  const pointerDisplay = document.createElement("p");
  pointerDisplay.textContent = "<=";
  pointerDisplay.style.fontSize = "40px";
  pointerDisplay.style.color = "blue";
  pointerDisplay.style.margin = "0px";
  const updateUI = () => {
    pointerDisplay.style.display = pointerHere ? "inline-block" : "none";
  };
  updateUI();

  const bitDivsDiv = document.createElement("div");
  bitDivsDiv.append(opBitDiv);
  bitDivsDiv.append(ad1BitDiv);
  bitDivsDiv.append(ad2BitDiv);
  bitDivsDiv.append(valBitDiv);

  bitDivsDiv.style.border = "solid";
  bitDivsDiv.style.borderWidth = "2px";
  bitDivsDiv.style.display = "inline-block";

  const unitDiv = document.createElement("div");
  unitDiv.append(bitDivsDiv);
  unitDiv.append(pointerDisplay);

  return {
    element: unitDiv,
    getOpBits,
    getAd1Bits,
    getAd2Bits,
    getValBits,
    setOpBits,
    setAd1Bits,
    setAd2Bits,
    setValBits,
    getPointerState: () => {
      return pointerHere;
    },
    setPointerState: (newState: boolean) => {
      pointerHere = newState;
      updateUI();
    },
  };
};
