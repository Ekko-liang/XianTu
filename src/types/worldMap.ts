/**
 * @fileoverview World map related type definitions
 */

/**
 * Represents a faction in the world
 */
export interface Faction {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  textColor: string;
  emblem: string;
  description: string;
  strength: number;
  territory: string;
  memberCount?: string;
  specialties?: string[];
}

/**
 * Represents a territory in the world
 */
export interface TerritoryData {
  id: string;
  factionId: string;
  name: string;
  boundary: string; // SVG path
  centerX: number;
  centerY: number;
  color: string;
  borderColor: string;
  textColor: string;
  emblem: string;
}

/**
 * Represents a terrain feature in the world
 */
export interface TerrainFeature {
  id: string;
  name: string;
  path: string; // SVG path
  labelX: number;
  labelY: number;
}

/**
 * Represents the terrain data of the world
 */
export interface TerrainData {
  mountains: TerrainFeature[];
  forests: TerrainFeature[];
  waters: TerrainFeature[];
}

/**
 * Represents a trade route in the world
 */
export interface TradeRoute {
  id: string;
  name: string;
  path: string; // SVG path
  from: string;
  to: string;
}