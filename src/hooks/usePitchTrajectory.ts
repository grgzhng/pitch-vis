import { useMemo } from 'react';

// Constants
const GRAVITY = 9.81; // m/s^2
const FEET_TO_METERS = 0.3048;
const MILES_TO_METERS = 1609.344;
const MPH_TO_MPS = MILES_TO_METERS / 3600;
const INCHES_TO_METERS = 0.0254;

// Standard distances and heights (scene coordinates: Y=up, Z=towards camera/catcher)
const PITCHER_PLATE_DISTANCE_FT = 60.5;
const PITCHER_EXTENSION_FT = 5.5; // Assumed average extension
const RELEASE_HEIGHT_FT = 6.0; // Assumed average release height
const STRIKE_ZONE_BOTTOM_FT = 1.5;
const STRIKE_ZONE_TOP_FT = 3.5;

const RELEASE_DISTANCE_M = (PITCHER_PLATE_DISTANCE_FT - PITCHER_EXTENSION_FT) * FEET_TO_METERS; // Initial Z distance from plate
const RELEASE_HEIGHT_M = RELEASE_HEIGHT_FT * FEET_TO_METERS; // Initial Y
const STRIKE_ZONE_BOTTOM_M = STRIKE_ZONE_BOTTOM_FT * FEET_TO_METERS;
const STRIKE_ZONE_TOP_M = STRIKE_ZONE_TOP_FT * FEET_TO_METERS;
const STRIKE_ZONE_CENTER_Y_M = (STRIKE_ZONE_BOTTOM_M + STRIKE_ZONE_TOP_M) / 2;

// Define the return type of the hook
interface PitchTrajectory {
  getPositionAtTime: (t: number) => { x: number; y: number; z: number };
  flightTime: number;
  releasePoint: { x: number; y: number; z: number };
  initialVelocity: { x: number; y: number; z: number }; // Added for debugging/info
}

/**
 * Custom hook to calculate the trajectory of a baseball pitch, ensuring it
 * passes through the specified target point (x, y, z).
 * Uses scene coordinates: Y=up, Z=towards camera/catcher (+Z towards catcher).
 *
 * @param velocityMPH Initial velocity magnitude in MPH.
 * @param ivbInches Induced Vertical Break in inches (spin-induced upward deviation).
 * @param hbInches Horizontal Break in inches (positive is right from catcher's view).
 * @param targetX_m Target X coordinate (meters) at the target plane.
 * @param targetY_m Target Y coordinate (meters) at the target plane.
 * @param targetZ_m Target Z coordinate (meters) of the target plane.
 * @returns An object containing the release point, flight time, initial velocity, and a function to get position at time t.
 */
const usePitchTrajectory = (
  velocityMPH: number,
  ivbInches: number,
  hbInches: number,
  targetX_m: number,
  targetY_m: number,
  targetZ_m: number // Added target Z
): PitchTrajectory => {

  const trajectoryData = useMemo((): PitchTrajectory => {
    console.log(`[usePitchTrajectory] Recalculating trajectory to hit target (${targetX_m.toFixed(2)}, ${targetY_m.toFixed(2)}, ${targetZ_m.toFixed(2)})...`); // Updated log

    // 1. Unit Conversions & Target Definition
    const v0_mps_sq = (velocityMPH * MPH_TO_MPS) * (velocityMPH * MPH_TO_MPS); // Use speed squared for constraint
    const ivb_m = ivbInches * INCHES_TO_METERS; // Total vertical displacement by spin
    const hb_m = hbInches * INCHES_TO_METERS; // Total horizontal displacement by spin

    // Release Point: Z is negative (away from camera/catcher)
    const P0 = { x: 0, y: RELEASE_HEIGHT_M, z: -RELEASE_DISTANCE_M };
    // Target Point uses the passed-in coordinates, including Z
    const P_target = { x: targetX_m, y: targetY_m, z: targetZ_m }; // Use targetZ_m

    // 2. Calculate Displacement Vector
    const DeltaP = {
      x: P_target.x - P0.x, // Should be targetX_m
      y: P_target.y - P0.y,
      z: P_target.z - P0.z, // Will be targetZ_m - (-RELEASE_DISTANCE_M)
    };
    const DeltaP_sq = DeltaP.x * DeltaP.x + DeltaP.y * DeltaP.y + DeltaP.z * DeltaP.z;

    // 3. Estimate Flight Time & Accelerations
    const v_avg_est = velocityMPH * MPH_TO_MPS; // Use average speed for estimation
    // Estimate based on the positive Z displacement required
    const T_est = (DeltaP.z > 0) ? DeltaP.z / v_avg_est : 0.1; // Avoid division by zero if DeltaP.z is somehow zero
    console.log(`[usePitchTrajectory] Estimated T: ${T_est.toFixed(4)}s`); // Log T_est

    // Accelerations based on *total* break over estimated time
    // If T_est is zero or negative, avoid division by zero for accelerations
    const a_magnus_x = (T_est > 0) ? (2 * hb_m) / (T_est * T_est) : 0;
    const a_magnus_y_spin = (T_est > 0) ? (2 * ivb_m) / (T_est * T_est) : 0;
    const a_total_y = a_magnus_y_spin - GRAVITY;
    const a = { x: a_magnus_x, y: a_total_y, z: 0 }; // Assuming no drag/magnus in Z direction
    const a_sq = a.x * a.x + a.y * a.y + a.z * a.z;
    const DeltaP_dot_a = DeltaP.x * a.x + DeltaP.y * a.y + DeltaP.z * a.z; // Now includes DeltaP.x * a.x

    // 4. Solve for Flight Time (T) using kinematic constraints
    // Quadratic equation for u = T^2: A*u^2 + B*u + C = 0
    const quad_A = 0.25 * a_sq;
    const quad_B = -(v0_mps_sq + DeltaP_dot_a);
    const quad_C = DeltaP_sq;

    const discriminant = quad_B * quad_B - 4 * quad_A * quad_C;

    let T = T_est; // Default to estimation if no valid solution
    if (discriminant >= 0 && quad_A !== 0) {
        // Calculate potential T^2 values
        const u1 = (-quad_B + Math.sqrt(discriminant)) / (2 * quad_A);
        const u2 = (-quad_B - Math.sqrt(discriminant)) / (2 * quad_A);

        // Choose the physically plausible positive solution for T = sqrt(u)
        const T1 = (u1 > 0) ? Math.sqrt(u1) : -1;
        const T2 = (u2 > 0) ? Math.sqrt(u2) : -1;

        // Prefer the solution closer to the initial estimate, if both valid
        if (T1 > 0 && T2 > 0) {
            T = Math.abs(T1 - T_est) < Math.abs(T2 - T_est) ? T1 : T2;
        } else if (T1 > 0) {
            T = T1;
        } else if (T2 > 0) {
            T = T2;
        } else {
             console.warn("No valid positive flight time solution found. Using estimation.", { quad_A, quad_B, quad_C, discriminant });
        }
    } else if (discriminant < 0) {
        console.warn("Unreachable target: Negative discriminant in flight time calculation.", { quad_A, quad_B, quad_C, discriminant });
    } else if (quad_A === 0) {
        // Linear case (no acceleration): T^2 = -C / B => T = sqrt(-C/B)
        if (quad_B !== 0 && -quad_C / quad_B > 0) {
            T = Math.sqrt(-quad_C / quad_B);
        } else {
             console.warn("No valid flight time solution (linear case). Using estimation.", { quad_B, quad_C });
        }
    }

    const flightTime = T;

    // 5. Calculate Required Initial Velocity (v0)
    let v0 = { x: 0, y: 0, z: 0 };
    if (flightTime > 0) {
        v0 = {
            x: (DeltaP.x / flightTime) - 0.5 * a.x * flightTime,
            y: (DeltaP.y / flightTime) - 0.5 * a.y * flightTime,
            z: (DeltaP.z / flightTime) - 0.5 * a.z * flightTime, // a.z is 0
        };
    } else {
        console.error("Calculated flight time is zero or negative. Cannot determine initial velocity.");
        // Provide a default velocity (e.g., straight towards target) as fallback?
        const direction = {x: DeltaP.x, y: DeltaP.y, z: DeltaP.z};
        const mag = Math.sqrt(direction.x**2 + direction.y**2 + direction.z**2);
        if (mag > 0) {
            const scale = Math.sqrt(v0_mps_sq) / mag;
            v0 = {x: direction.x * scale, y: direction.y*scale, z: direction.z*scale};
        } else {
            v0 = {x: 0, y: 0, z: -Math.sqrt(v0_mps_sq)}; // Default straight if DeltaP is zero
        }
    }


    // 6. Parametric Trajectory Function using calculated v0 and a
    const getPositionAtTime = (t: number): { x: number; y: number; z: number } => {
      if (t < 0) t = 0;
      // Clamp time to the calculated flight time
      if (t > flightTime && flightTime > 0) t = flightTime;
      else if (flightTime <= 0) t = 0; // Stay at start if flight time invalid

      const pos_x = P0.x + v0.x * t + 0.5 * a.x * t * t;
      const pos_y = P0.y + v0.y * t + 0.5 * a.y * t * t;
      const pos_z = P0.z + v0.z * t + 0.5 * a.z * t * t; // a.z is 0

      return { x: pos_x, y: pos_y, z: pos_z };
    };

    // Log final calculated values for verification
    console.log('[usePitchTrajectory] Results:', { // Update log
        releasePoint: P0,
        targetPoint: P_target, // P_target now includes targetZ_m
        flightTime,
        initialVelocity: v0,
        acceleration: a,
        calculatedEndPoint: getPositionAtTime(flightTime)
    });

    return {
      getPositionAtTime,
      flightTime,
      releasePoint: P0,
      initialVelocity: v0,
    };

  }, [velocityMPH, ivbInches, hbInches, targetX_m, targetY_m, targetZ_m]); // Added targetZ_m to dependencies

  return trajectoryData;
};

export default usePitchTrajectory;
