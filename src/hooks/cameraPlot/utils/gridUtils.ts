
export const snapToGrid = (x: number, y: number, gridSize = 20) => {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
};
