
export interface CameraPosition {
  x: number;
  y: number;
  rotation: number;
  zoom: number;
}

export interface CameraElement {
  id: string;
  type: 'camera' | 'talent' | 'prop' | 'wall';
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  rotation: number;
  label: string;
  color?: string;
  sceneId: string;
}

export interface CameraScene {
  id: string;
  name: string;
  elements: CameraElement[];
  isActive: boolean;
}

export interface CameraPlotData {
  scenes: CameraScene[];
  activeSceneId: string;
  canvasSize: {
    width: number;
    height: number;
  };
  gridSettings: {
    size: number;
    visible: boolean;
  };
}

export interface WallElement extends CameraElement {
  type: 'wall';
  points: Array<{ x: number; y: number }>;
}
