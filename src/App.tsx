import React, { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import './App.css';
import PitchControls from './components/PitchControls'; // Import the component
import Baseball from './components/Baseball'; // Import the Baseball component
import usePitchTrajectory from './hooks/usePitchTrajectory'; // Import the hook

function App() {
  // Camera Settings - Adjusted position (further back, slightly higher)
  const cameraPosition: [number, number, number] = [0, 1.2, 2]; // X=0 (center), Y=1.2m (eye level), Z=2m (behind plate)
  const fov = 60; // Field of view

  // Pitch Control State
  const [velocity, setVelocity] = useState<number>(95); // Default velocity
  const [ivb, setIvb] = useState<number>(15);      // Default IVB (Fastball)
  const [hb, setHb] = useState<number>(8);         // Default HB (Fastball)

  // Animation State
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animationTime, setAnimationTime] = useState<number>(0);

  // Calculate Trajectory using the hook
  const { getPositionAtTime, flightTime, releasePoint } = usePitchTrajectory(velocity, ivb, hb);

  // Log trajectory data when inputs change
  useEffect(() => {
    console.log('[App] Trajectory Calculated:', {
      releasePoint,
      flightTime,
      endPoint: getPositionAtTime(flightTime) // Calculate expected end point
    });
  }, [releasePoint, flightTime, getPositionAtTime]); // Re-log if trajectory changes

  // Handler to start the pitch animation
  const handleThrowPitch = useCallback(() => {
    console.log('Throwing pitch with:', { velocity, ivb, hb });
    setAnimationTime(0); // Reset timer
    setIsAnimating(true); // Start animation
  }, [velocity, ivb, hb]);

  // Handler for when animation completes
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
    console.log('Pitch finished');
  }, []);

  return (
    <div id="scene-container">
      {/* Pitch Controls Component */}
      <PitchControls
        velocity={velocity}
        setVelocity={setVelocity}
        ivb={ivb}
        setIvb={setIvb}
        hb={hb}
        setHb={setHb}
        onThrowPitch={handleThrowPitch} // Pass the handler
      />

      <Canvas
        style={{ background: '#f0f0f0' }}
        camera={{ position: cameraPosition, fov: fov, near: 0.1, far: 100 }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, -10]} intensity={1} /> {/* Adjusted light position slightly */}

        {/* Animated Baseball Component */}
        <Baseball
          getPositionAtTime={getPositionAtTime}
          flightTime={flightTime}
          releasePoint={releasePoint}
          isAnimating={isAnimating}
          onAnimationComplete={handleAnimationComplete}
          animationTime={animationTime}
          setAnimationTime={setAnimationTime} // Pass setter down
        />

        {/* Floor Placeholder - Adjusted size */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -10]}>
          <planeGeometry args={[5, 20]} /> {/* Made smaller */}
          <meshStandardMaterial color="lightgreen" />
        </mesh>
      </Canvas>
    </div>
  );
}

export default App;
