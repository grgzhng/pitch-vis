// Conversion Constants
export const INCHES_TO_METERS = 0.0254;
export const FEET_TO_METERS = 0.3048;

// Strike Zone Dimensions (in meters)
export const STRIKE_ZONE_WIDTH = 17 * INCHES_TO_METERS; // 17 inches
export const STRIKE_ZONE_BOTTOM = 1.5 * FEET_TO_METERS; // 1.5 feet
export const STRIKE_ZONE_TOP = 3.5 * FEET_TO_METERS; // 3.5 feet

// Home Plate Dimensions (in meters)
export const PLATE_WIDTH = 17 * INCHES_TO_METERS; // 17 inches wide
export const PLATE_POINT_LENGTH = 8.5 * INCHES_TO_METERS; // Length of the triangular point
export const PLATE_SIDE_LENGTH = 8.5 * INCHES_TO_METERS; // Length of the square sides
export const PLATE_TOTAL_DEPTH = PLATE_SIDE_LENGTH + PLATE_POINT_LENGTH; // Total depth from back point to front edge
