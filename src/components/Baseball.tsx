import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
  setAnimationTime
}) => {
  // Ref to access the mesh object
  const meshRef = useRef<THREE.Mesh>(null!);

  useEffect(() => {
    console.log('[Baseball] useEffect setting initial position:', releasePoint);
    if (meshRef.current) {
      // Set position directly in useEffect too, as a baseline
      meshRef.current.position.set(releasePoint.x, releasePoint.y, releasePoint.z);
    }
    // Don't reset animationTime here, let App handle it on throw
    // setAnimationTime(0);
  }, [releasePoint]); // Removed setAnimationTime from dependency

  useFrame((state, delta) => {
    if (!meshRef.current) return; // Guard clause

    // If not animating, ensure ball is at the final position if animation completed previously
    if (!isAnimating) {
        // Check if animationTime indicates completion
        if (animationTime >= flightTime && flightTime > 0) {
             const endPosition = getPositionAtTime(flightTime);
             meshRef.current.position.set(endPosition.x, endPosition.y, endPosition.z);
        } else {
            // Otherwise, ensure it's at the release point if animation hasn't run
             meshRef.current.position.set(releasePoint.x, releasePoint.y, releasePoint.z);
        }
        return;
    }

    // --- Animation is active ---

    // On the very first frame of animation, ensure position is exactly at release point
    if (animationTime === 0) {
        console.log('[Baseball] useFrame setting initial position at t=0');
        meshRef.current.position.set(releasePoint.x, releasePoint.y, releasePoint.z);
    }

    // Increment animation time
    const newTime = animationTime + delta;
    setAnimationTime(newTime);

    if (newTime >= flightTime) {
      // Animation finished
      const endPosition = getPositionAtTime(flightTime);
      console.log('[Baseball] Animation ended. Final Position:', endPosition);
      meshRef.current.position.set(endPosition.x, endPosition.y, endPosition.z);
      onAnimationComplete();
    } else {
      // Update position based on trajectory
      const currentPosition = getPositionAtTime(newTime);
      if (Math.random() < 0.05) {
         console.log(`[Baseball] Animating. Time: ${newTime.toFixed(2)}s, Position:`, currentPosition);
      }
      meshRef.current.position.set(currentPosition.x, currentPosition.y, currentPosition.z);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
};

export default Baseball;
