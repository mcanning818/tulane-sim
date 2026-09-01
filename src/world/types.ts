export type Vec2 = [number, number]; // [x = east, z = south] in meters from world origin

export type Building = {
  id: number;
  name: string | null;
  kind: string;
  levels: number | null;
  height: number;
  area: number;
  centroid: Vec2;
  footprint: Vec2[];
};

export type Path = {
  id: number;
  kind: 'walk' | 'road';
  width: number;
  points: Vec2[];
};

export type Green = {
  id: number;
  name: string | null;
  polygon: Vec2[];
};

export type CampusData = {
  generatedAt: string;
  attribution: string;
  origin: {lat: number; lon: number};
  bbox: number[];
  extent: {minX: number; maxX: number; minZ: number; maxZ: number};
  buildings: Building[];
  paths: Path[];
  greens: Green[];
  trees: {x: number; z: number}[];
};
