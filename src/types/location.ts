/**
 * @fileoverview Location related type definitions
 */

/**
 * Represents a location in the world
 */
export interface WorldLocation {
  id: string;
  name: string;
  type: LocationType;
  x: number;
  y: number;
  size: number;
  color: string;
  faction?: string;
  description: string;
  population?: string;
  specialFeatures?: string[];
}

/**
 * Represents the type of a location
 */
export type LocationType = 
  | 'city' 
  | 'sect' 
  | 'secret_realm' 
  | 'village' 
  | 'market' 
  | 'major_city' 
  | 'sect_headquarters' 
  | 'trade_center';
