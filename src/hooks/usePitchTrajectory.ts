import { useMemo } from 'react';

// Constants
const GRAVITY = 9.81; // m/s^2
const FEET_TO_METERS = 0.3048;
const MILES_TO_METERS = 1609.34;
const MPH_TO_MPS = MILES_TO_METERS / 3600;
const INCHES_TO_METERS = 0.0254;

// Standard distances and heights (can be adjusted or made configurable later)
const PITCHER_PLATE_DISTANCE_FT = 60.5;
const PITCHER_EXTENSION_FT = 5.5; // Assumed average extension
const RELEASE_HEIGHT_FT = 6.0; // Assumed average release height

const RELEASE_DISTANCE_M = (PITCHER_PLATE_DISTANCE_FT - PITCHER_EXTENSION_FT) * FEET_TO_METERS;
const RELEASE_HEIGHT_M = RELEASE_HEIGHT_FT * FEET_TO_METERS;

// Define the return type of the hook
interface PitchTrajectory {
  getPositionAtTime: (t: number) => { x: number; y: number; z: number };
  flightTime: number;
  releasePoint: { x: number; y: number; z: number };
}

/**
 * Custom hook to calculate the trajectory of a baseball pitch.
 *
 * @param velocityMPH Initial velocity in MPH.
 * @param ivbInches Induced Vertical Break in inches (spin-induced upward deviation).
 * @param hbInches Horizontal Break in inches (positive is right from catcher's view).
 * @returns An object containing the release point, flight time, and a function to get position at time t.
 */
const usePitchTrajectory = (velocityMPH: number, ivbInches: number, hbInches: number): PitchTrajectory => {

  // Use useMemo to memoize the entire result object
  const trajectoryData = useMemo((): PitchTrajectory => {
    console.log('[usePitchTrajectory] Recalculating trajectory...'); // Log when recalculation happens
    // 1. Unit Conversions
    const v0_mps = velocityMPH * MPH_TO_MPS;
    const ivb_m = ivbInches * INCHES_TO_METERS;
    const hb_m = hbInches * INCHES_TO_METERS;

    // 2. Initial Velocity Vector & Release Point (Simplified)
    const releasePoint = { x: 0, y: RELEASE_HEIGHT_M, z: -RELEASE_DISTANCE_M };
    const v0x = 0;
    const v0y = v0_mps;
    const v0z = 0;

    // 3. Flight Time (Simplified)
    const flightTime = RELEASE_DISTANCE_M / v0_mps;

    // 4. Infer Average Magnus/Drag Accelerations
    const avg_a_magnus_x = (flightTime > 0) ? (2 * hb_m) / (flightTime * flightTime) : 0; // Avoid division by zero
    const avg_a_magnus_z = (flightTime > 0) ? (2 * ivb_m) / (flightTime * flightTime) : 0; // Avoid division by zero

    // 5. Parametric Trajectory Function
    const getPositionAtTime = (t: number): { x: number; y: number; z: number } => {
      if (t < 0) t = 0;
      if (t > flightTime && flightTime > 0) t = flightTime; // Clamp to flightTime if valid
      else if (flightTime <= 0) t = 0; // If flight time is invalid, stay at start

      const x = v0x * t + 0.5 * avg_a_magnus_x * t * t;
      const y = v0y * t;
      const z = v0z * t + 0.5 * (avg_a_magnus_z - GRAVITY) * t * t;

      return {
        x: releasePoint.x + x,
        y: releasePoint.y + z,
        z: releasePoint.z + y
      };
    };

    return {
      getPositionAtTime,
      flightTime,
      releasePoint
    };

  }, [velocityMPH, ivbInches, hbInches]); // Dependencies for useMemo

  return trajectoryData;
};

export default usePitchTrajectory;
