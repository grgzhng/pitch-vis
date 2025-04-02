import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BaseballProps {
  // Function to get position at a given time
  getPositionAtTime: (t: number) => { x: number; y: number; z: number };
  // Total flight time for the pitch
  flightTime: number;
  // Starting position of the pitch
  releasePoint: { x: number; y: number; z: number };
  // Is the animation currently running?
  isAnimating: boolean;
  // Callback to signal animation completion
  onAnimationComplete: () => void;
  // Current animation time (controlled by parent)
  animationTime: number;
  // Setter for animation time (controlled by parent)
  setAnimationTime: (time: number) => void;
}

const Baseball: React.FC<BaseballProps> = ({
  getPositionAtTime,
  flightTime,
  releasePoint,
  isAnimating,
  onAnimationComplete,
  animationTime,
  setAnimationTime,
}) => {
  // Ref to access the mesh object
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (!meshRef.current) return; // Guard clause

    let targetPosition: { x: number; y: number; z: number };

    if (isAnimating) {
      // --- Animation is active ---
      const newTime = Math.min(
        animationTime + delta,
        flightTime > 0 ? flightTime : 0
      ); // Calculate new time, clamp at end, handle flightTime=0

      // Only update state if time actually changed
      if (newTime !== animationTime) {
        setAnimationTime(newTime);
      }

      targetPosition = getPositionAtTime(newTime);

      // Check for completion
      if (newTime >= flightTime && flightTime > 0) {
        console.log(
          "[Baseball] Animation ended. Final Position:",
          targetPosition
        );
        onAnimationComplete();
      }
    } else {
      // --- Animation is not active ---
      if (animationTime >= flightTime && flightTime > 0) {
        // If previously completed, stay at end point
        targetPosition = getPositionAtTime(flightTime);
      } else {
        // Otherwise, stay/reset to release point
        targetPosition = releasePoint;
        // Log if resetting to start position
        // console.log('[Baseball] Not animating, ensuring position at release point:', targetPosition);
      }
    }

    // Set position *once* per frame based on calculated target
    meshRef.current.position.set(
      targetPosition.x,
      targetPosition.y,
      targetPosition.z
    );
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.073 / 2, 32, 32]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
};

export default Baseball;
