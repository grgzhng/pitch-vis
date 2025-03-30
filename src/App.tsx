import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import './App.css';
import PitchControls from './components/PitchControls';
import Baseball from './components/Baseball';
import usePitchTrajectory from './hooks/usePitchTrajectory';
import TargetPad from './components/TargetPad';

// Conversion Constants
const INCHES_TO_METERS = 0.0254;
const FEET_TO_METERS = 0.3048;

// Constants for dimensions (in meters)
const STRIKE_ZONE_WIDTH = 17 * INCHES_TO_METERS; // 17 inches
const STRIKE_ZONE_BOTTOM = 1.5 * FEET_TO_METERS; // 1.5 feet
const STRIKE_ZONE_TOP = 3.5 * FEET_TO_METERS; // 3.5 feet
const PLATE_WIDTH = 17 * INCHES_TO_METERS;
const PLATE_POINT_LENGTH = 8.5 * INCHES_TO_METERS;
const PLATE_SIDE_LENGTH = 8.5 * INCHES_TO_METERS;
// Calculate total plate depth
const PLATE_TOTAL_DEPTH = PLATE_SIDE_LENGTH + PLATE_POINT_LENGTH;

// Helper component to log camera changes
const CameraInfoLogger: React.FC<{
  onCameraChange: (info: string) => void;
  initialTarget?: [number, number, number]; // Add optional initial target prop
}> = ({ onCameraChange, initialTarget }) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const updateCameraInfo = useCallback(() => {
    if (!controlsRef.current) return;
    const pos = camera.position;
    const target = controlsRef.current.target;
    const info = `Cam Pos: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}) Target: (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`;
    onCameraChange(info);
  }, [camera, onCameraChange]);

  // Update info on mount and when controls change
  useEffect(() => {
    // Need a slight delay on mount for controlsRef to be populated reliably
    const timer = setTimeout(updateCameraInfo, 10);
    return () => clearTimeout(timer); // Cleanup timer
  }, [updateCameraInfo]); // Re-run if updateCameraInfo changes (though it shouldn't often)


  return <OrbitControls ref={controlsRef} onChange={updateCameraInfo} target={initialTarget} />; // Pass initialTarget to target prop
};

function App() {
  // Camera Settings - Realistic Catcher POV
  const cameraPosition: [number, number, number] = [0, 0.75, 1.35]; // Updated Y and Z for better perspective
  const fov = 75; // Keep FOV as is for now, adjust if needed
  // Initial target point for OrbitControls (center of strike zone vertically)
  const initialCameraTarget: [number, number, number] = [
    0,
    0.6,
    0
  ];

  // Pitch Control State
  const [velocity, setVelocity] = useState<number>(95); // Default velocity
  const [ivb, setIvb] = useState<number>(15);      // Default IVB (Fastball)
  const [hb, setHb] = useState<number>(8);         // Default HB (Fastball)

  // Animation State
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animationTime, setAnimationTime] = useState<number>(0);

  // Target State (in meters)
  const [targetX, setTargetX] = useState<number>(0); // Horizontal center
  const [targetY, setTargetY] = useState<number>((STRIKE_ZONE_TOP + STRIKE_ZONE_BOTTOM) / 2); // Vertical center of strike zone

  // State to hold camera info string
  const [cameraInfo, setCameraInfo] = useState<string>('Loading camera info...');

  // Calculate the Z coordinate of the BACK point of the home plate
  const targetPlateBackZ = 2 * PLATE_POINT_LENGTH;

  // Calculate Trajectory using the hook - Now includes target coordinates AND target Z (back of plate)
  const { getPositionAtTime, flightTime, releasePoint, initialVelocity } = usePitchTrajectory(
    velocity,
    ivb,
    hb,
    targetX, // Pass target X
    targetY, // Pass target Y
    targetPlateBackZ // Pass target Z (back of plate)
    // NOTE: usePitchTrajectory hook needs modification to accept and use targetZ
  );

  // Log trajectory data when inputs change
  useEffect(() => {
    console.log('[App] Trajectory Calculated:', {
      releasePoint,
      flightTime,
      initialVelocity, // Log initial velocity too
      targetPoint: { x: targetX, y: targetY, z: targetPlateBackZ }, // Log target Z
      endPoint: getPositionAtTime(flightTime) // Calculate expected end point
    });
  }, [releasePoint, flightTime, getPositionAtTime, initialVelocity, targetX, targetY, targetPlateBackZ]); // Add dependencies

  // Handler to start the pitch animation
  const handleThrowPitch = useCallback(() => {
    console.log('Throwing pitch with:', { velocity, ivb, hb });
    // Re-enable animation triggering
    setAnimationTime(0);
    setIsAnimating(true);
  }, [velocity, ivb, hb]);

  // Handler for when animation completes
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
    console.log('Pitch finished');
  }, []);

  // --- Define Home Plate Shape ---
  const homePlateShape = useMemo(() => {
    const shape = new THREE.Shape();
    const halfWidth = PLATE_WIDTH / 2;
    // Start at the back point, move counter-clockwise (when viewed from above)
    shape.moveTo(0, -PLATE_POINT_LENGTH);       // Back point (towards catcher)
    shape.lineTo(-halfWidth, 0);                // Left corner
    shape.lineTo(-halfWidth, PLATE_SIDE_LENGTH); // Front left corner (towards pitcher)
    shape.lineTo(halfWidth, PLATE_SIDE_LENGTH);  // Front right corner
    shape.lineTo(halfWidth, 0);                  // Right corner
    shape.closePath();                           // Close path back to back point
    return shape;
  }, []);

  // Settings for extruding the home plate
  const homePlateExtrudeSettings = useMemo(() => ({
    steps: 1,
    depth: 0.02, // 2cm thick plate
    bevelEnabled: false,
  }), []);

  // --- Calculate Strike Zone Dimensions ---
  const strikeZoneCenterY = (STRIKE_ZONE_TOP + STRIKE_ZONE_BOTTOM) / 2;
  const strikeZoneHeight = STRIKE_ZONE_TOP - STRIKE_ZONE_BOTTOM;
  // Calculate strike zone center Z to align with plate center Z
  // Plate extends from Z=0 (back point) to Z=PLATE_TOTAL_DEPTH (front edge)
  const strikeZoneCenterZ = PLATE_TOTAL_DEPTH / 2;

  // --- Create Strike Zone Edges Geometry with Vertex Colors for Depth Gradient ---
  const strikeZoneLineData = useMemo(() => {
    const halfW = STRIKE_ZONE_WIDTH / 2;
    const halfH = strikeZoneHeight / 2;
    const halfD = PLATE_TOTAL_DEPTH / 2;

    // 8 corners of the strike zone box (relative to its center)
    const vertices = new Float32Array([
      // Front face (Z = +halfD)
      -halfW, -halfH, halfD,  // 0: Front-Bottom-Left
       halfW, -halfH, halfD,  // 1: Front-Bottom-Right
       halfW,  halfH, halfD,  // 2: Front-Top-Right
      -halfW,  halfH, halfD,  // 3: Front-Top-Left
      // Back face (Z = -halfD)
      -halfW, -halfH, -halfD, // 4: Back-Bottom-Left
       halfW, -halfH, -halfD, // 5: Back-Bottom-Right
       halfW,  halfH, -halfD, // 6: Back-Top-Right
      -halfW,  halfH, -halfD  // 7: Back-Top-Left
    ]);

    // Calculate vertex colors (including alpha) based on Z position
    const colorsWithAlpha: number[] = [];
    const lightBlue = new THREE.Color(0x87cefa); // Lighter blue for back
    const frontAlpha = 1; // Opacity at the front
    const backAlpha = 0.3;  // Opacity at the back

    for (let i = 0; i < vertices.length / 3; i++) {
      const z = vertices[i * 3 + 2]; // Get the Z coordinate
      // Normalize z: 0 for back (-halfD), 1 for front (+halfD)
      const normalizedZ = (z + halfD) / PLATE_TOTAL_DEPTH;
      // Interpolate color: lightBlue at normalizedZ=0, deepBlue at normalizedZ=1
      const alpha = backAlpha + (frontAlpha - backAlpha) * normalizedZ;
      // Push RGB and Alpha values
      colorsWithAlpha.push(lightBlue.r, lightBlue.g, lightBlue.b, alpha);
    }

    // Define the sequence of vertices for the front and back faces
    // We need two separate sequences because Line draws a single continuous strip
    const frontIndices = [0, 1, 2, 3, 0]; // Sequence for front face
    const backIndices = [4, 5, 6, 7, 4];   // Sequence for back face

    const generateLineData = (indexSequence: number[]) => {
      const points: number[] = [];
      const colors: [number, number, number, number][] = [];
      for (const index of indexSequence) {
        if (index === undefined) continue; // Safety check

        // Add vertex position
        points.push(vertices[index * 3], vertices[index * 3 + 1], vertices[index * 3 + 2]);
        // Add vertex color
        colors.push([colorsWithAlpha[index * 4], colorsWithAlpha[index * 4 + 1], colorsWithAlpha[index * 4 + 2], colorsWithAlpha[index * 4 + 3]]);
      }
      // Log number of points (segments = points - 1)
      console.log("Generated points:", points.length / 3, "points ->", points.length / 3 -1 , "segments");
      return { points, colors };
    };

    // Generate data for front and back lines separately
    const frontLineData = generateLineData(frontIndices);
    const backLineData = generateLineData(backIndices);

    // If you want the connecting lines, we need a different structure (e.g., LineSegments)
    // For now, we'll just return data for front and back

    // NOTE: This return value changes shape. The rendering part needs adjustment.
    return { frontLineData, backLineData };
  }, [strikeZoneHeight]); // Dependency array

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
        onThrowPitch={handleThrowPitch}
      />

      {/* Target Pad Component - Pass strike zone dims */}
      <TargetPad
        targetX={targetX}
        setTargetX={setTargetX}
        targetY={targetY}
        setTargetY={setTargetY}
        strikeZoneWidth_m={STRIKE_ZONE_WIDTH}
        strikeZoneBottom_m={STRIKE_ZONE_BOTTOM}
        strikeZoneTop_m={STRIKE_ZONE_TOP}
      />

      {/* Display Camera Info */}
      <p style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(255, 255, 255, 0.7)', padding: '5px', borderRadius: '3px', margin: 0, zIndex: 10 }}>
        {cameraInfo}
      </p>

      <Canvas
        style={{ background: '#f0f0f0' }}
        camera={{ position: cameraPosition, fov: fov, near: 0.1, far: 1000, up: [0, 1, 0] }}
      >
        {/* Controls use the initialCameraTarget */}
        <CameraInfoLogger onCameraChange={setCameraInfo} initialTarget={initialCameraTarget} />

        {/* Wrap scene content in EffectComposer */}
        <EffectComposer>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, -10]} intensity={1} />
          <Baseball
            getPositionAtTime={getPositionAtTime}
            flightTime={flightTime}
            releasePoint={releasePoint}
            isAnimating={isAnimating}
            onAnimationComplete={handleAnimationComplete}
            animationTime={animationTime}
            setAnimationTime={setAnimationTime}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -50]} receiveShadow>
            <planeGeometry args={[50, 100]} />
            <meshStandardMaterial color="lightgreen" />
          </mesh>
          <mesh position={[0, 0.01, PLATE_POINT_LENGTH]} rotation={[-Math.PI / 2, 0, 0]}>
            <extrudeGeometry args={[homePlateShape, homePlateExtrudeSettings]} />
            <meshStandardMaterial color="white" side={THREE.DoubleSide} />
          </mesh>
          {/* Render Front Lines */}
          <Line
            points={strikeZoneLineData.frontLineData.points}
            vertexColors={strikeZoneLineData.frontLineData.colors}
            lineWidth={5}
            transparent={true}
            position={[0, strikeZoneCenterY, strikeZoneCenterZ]}
          />
          {/* Render Back Lines */}
          <Line
            points={strikeZoneLineData.backLineData.points}
            vertexColors={strikeZoneLineData.backLineData.colors}
            lineWidth={5}
            transparent={true}
            position={[0, strikeZoneCenterY, strikeZoneCenterZ]}
          />
          <axesHelper args={[1]} />
          <Sphere args={[0.03, 16, 16]} position={[targetX, targetY, targetPlateBackZ]}>
            <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
          </Sphere>
          <Bloom
            intensity={1.5} // Adjust intensity of the glow
            luminanceThreshold={0.6} // How bright a pixel needs to be to bloom
            luminanceSmoothing={0.8} // Smoothness of the threshold
            height={300} // Lower resolution for performance & softer bloom
          />
        </EffectComposer>

      </Canvas>
    </div>
  );
}

export default App;
