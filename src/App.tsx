import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import './App.css';
import PitchControls from './components/PitchControls';
import Baseball from './components/Baseball';
import usePitchTrajectory from './hooks/usePitchTrajectory';

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

  // State to hold camera info string
  const [cameraInfo, setCameraInfo] = useState<string>('Loading camera info...');

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
    // Start at back center, move clockwise
    shape.moveTo(-halfWidth, -PLATE_SIDE_LENGTH); // Back left (relative to shape's origin)
    shape.lineTo(halfWidth, -PLATE_SIDE_LENGTH);  // Back right
    shape.lineTo(halfWidth, 0);                   // Right corner
    shape.lineTo(0, PLATE_POINT_LENGTH);          // Front point
    shape.lineTo(-halfWidth, 0);                  // Left corner
    shape.closePath();                            // Close path back to back left
    return shape;
  }, []);

  // Settings for extruding the home plate
  const homePlateExtrudeSettings = useMemo(() => ({
    steps: 1,
    depth: 0.02, // 2cm thick plate
    bevelEnabled: false,
  }), []);

  // --- Calculate Strike Zone Dimensions ---
  const strikeZoneCenterY = useMemo(() => (STRIKE_ZONE_TOP + STRIKE_ZONE_BOTTOM) / 2, []);
  const strikeZoneHeight = useMemo(() => STRIKE_ZONE_TOP - STRIKE_ZONE_BOTTOM, []);
  // Calculate strike zone center Z to align with plate center Z
  const strikeZoneCenterZ = useMemo(() => -PLATE_POINT_LENGTH / 2, []);

  // --- Create Strike Zone Geometry with Vertex Colors for Depth Gradient ---
  const strikeZoneGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(STRIKE_ZONE_WIDTH, strikeZoneHeight, PLATE_TOTAL_DEPTH);
    const positionAttribute = geometry.attributes.position;
    const colors: number[] = [];
    const color = new THREE.Color();

    const frontZ = PLATE_TOTAL_DEPTH / 2; // Relative Z for front face
    const backZ = -PLATE_TOTAL_DEPTH / 2; // Relative Z for back face

    for (let i = 0; i < positionAttribute.count; i++) {
      const z = positionAttribute.getZ(i);
      // Normalize z to 0 (back) - 1 (front) range
      const normalizedZ = (z - backZ) / (frontZ - backZ);
      // Simple gradient: white at front (z=max), black at back (z=min)
      color.setScalar(normalizedZ);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }, [strikeZoneHeight]); // Recalculate if height changes (width/depth are constants)

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

        {/* Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, -10]} intensity={1} />

        {/* --- Re-enabled Animated Baseball Component --- */}
        <Baseball
          getPositionAtTime={getPositionAtTime}
          flightTime={flightTime}
          releasePoint={releasePoint}
          isAnimating={isAnimating}
          onAnimationComplete={handleAnimationComplete}
          animationTime={animationTime}
          setAnimationTime={setAnimationTime}
        />

        {/* --- Re-enabled Floor Placeholder --- */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -50]} receiveShadow>
          <planeGeometry args={[50, 100]} /> {/* Made much larger */}
          <meshStandardMaterial color="lightgreen" />
        </mesh>

        {/* Home Plate - Extruded */}
        {/* Rotated flat on XZ plane, positioned slightly above floor */}
        <mesh position={[0, 0.01, -PLATE_SIDE_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          {/* Use extrudeGeometry for thickness */}
          <extrudeGeometry args={[homePlateShape, homePlateExtrudeSettings]} />
          <meshStandardMaterial color="white" side={THREE.DoubleSide} />
        </mesh>

        {/* Strike Zone Box - Aligned with Plate Depth & Vertex Colors */}
        <mesh position={[0, strikeZoneCenterY, strikeZoneCenterZ]}> {/* Updated Z position */}
            {/* Use the pre-calculated geometry with vertex colors */}
            <primitive object={strikeZoneGeometry} />
            {/* Material needs vertexColors enabled - reduced opacity slightly */}
            <meshStandardMaterial transparent={true} opacity={0.3} side={THREE.DoubleSide} vertexColors />
            {/* Re-add Edges for sharp outlines */}
            <Edges
                scale={1} // Match the scale of the box
                threshold={15} // Angle threshold for edges
                color="black"
            />
        </mesh>

        {/* Axes Helper */}
        <axesHelper args={[1]} /> {/* Args specifies the size of the lines */}
      </Canvas>
    </div>
  );
}

export default App;
