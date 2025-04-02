import { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import "./App.css";
import PitchControls from "./components/PitchControls";
import Baseball from "./components/Baseball";
import usePitchTrajectory from "./hooks/usePitchTrajectory";
import TargetPad from "./components/TargetPad";
import CameraInfoLogger from "./components/CameraInfoLogger";
import HomePlate from "./components/HomePlate";
import StrikeZone from "./components/StrikeZone";
import {
  STRIKE_ZONE_WIDTH,
  STRIKE_ZONE_BOTTOM,
  STRIKE_ZONE_TOP,
  PLATE_TOTAL_DEPTH,
} from "./constants";

// Camera Settings - Realistic Catcher POV
const cameraPosition: [number, number, number] = [0, 0.75, 1.35]; // Updated Y and Z for better perspective
const fov = 75; // Keep FOV as is for now, adjust if needed
// Initial target point for OrbitControls (center of strike zone vertically)
const initialCameraTarget: [number, number, number] = [0, 0.6, 0];

function App() {
  // Pitch Control State
  const [velocity, setVelocity] = useState<number>(95); // Default velocity
  const [ivb, setIvb] = useState<number>(15); // Default IVB (Fastball)
  const [hb, setHb] = useState<number>(8); // Default HB (Fastball)

  // Animation State
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animationTime, setAnimationTime] = useState<number>(0);

  // Target State (in meters)
  const [targetX, setTargetX] = useState<number>(0); // Horizontal center
  const [targetY, setTargetY] = useState<number>(
    (STRIKE_ZONE_TOP + STRIKE_ZONE_BOTTOM) / 2
  ); // Vertical center of strike zone
  
  // State to track if target is being dragged
  const [isDraggingTarget, setIsDraggingTarget] = useState<boolean>(false);

  // State to hold camera info string
  const [cameraInfo, setCameraInfo] = useState<string>(
    "Loading camera info..."
  );

  // No refs needed for regular Bloom

  // Calculate the Z coordinate of the FRONT point of the home plate (used as target Z)
  const targetPlateBackZ = PLATE_TOTAL_DEPTH; // Correct calculation for front of plate

  // Calculate Trajectory using the hook - Now includes target coordinates AND target Z (front of plate)
  const { getPositionAtTime, flightTime, releasePoint } = usePitchTrajectory(
    velocity,
    ivb,
    hb,
    targetX, // Pass target X
    targetY, // Pass target Y
    targetPlateBackZ // Pass target Z (front of plate)
    // NOTE: usePitchTrajectory hook needs modification to accept and use targetZ
  );

  // Handler to start the pitch animation
  const handleThrowPitch = useCallback(() => {
    console.log("Throwing pitch with:", { velocity, ivb, hb });
    // Re-enable animation triggering
    setAnimationTime(0);
    setIsAnimating(true);
  }, [velocity, ivb, hb]);

  // Handler for when animation completes
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
    console.log("Pitch finished");
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
        setIsDraggingTarget={setIsDraggingTarget}
      />

      {/* Display Camera Info */}
      <p
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          background: "rgba(255, 255, 255, 0.7)",
          padding: "5px",
          borderRadius: "3px",
          margin: 0,
          zIndex: 10,
        }}
      >
        {cameraInfo}
      </p>

      <Canvas
        style={{ background: "#f0f0f0" }}
        camera={{
          position: cameraPosition,
          fov: fov,
          near: 0.1,
          far: 1000,
          up: [0, 1, 0],
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={window.devicePixelRatio}
        id="strike-zone-canvas"
      >
        {/* Controls use the initialCameraTarget */}
        <CameraInfoLogger
          onCameraChange={setCameraInfo}
          initialTarget={initialCameraTarget}
        />

        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, -10]} intensity={1} />

        {/* Wrap scene content with EffectComposer */}
        <EffectComposer autoClear={false}>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur={true}
          />
        </EffectComposer>

        <Baseball
          getPositionAtTime={getPositionAtTime}
          flightTime={flightTime}
          releasePoint={releasePoint}
          isAnimating={isAnimating}
          onAnimationComplete={handleAnimationComplete}
          animationTime={animationTime}
          setAnimationTime={setAnimationTime}
        />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, -50]}
          receiveShadow
        >
          <planeGeometry args={[50, 100]} />
          <meshStandardMaterial color="lightgreen" />
        </mesh>
        <HomePlate />
        <StrikeZone
          strikeZoneWidth={STRIKE_ZONE_WIDTH}
          strikeZoneBottom={STRIKE_ZONE_BOTTOM}
          strikeZoneTop={STRIKE_ZONE_TOP}
          plateTotalDepth={PLATE_TOTAL_DEPTH}
        />
        <axesHelper args={[1]} />
        {/* Target Sphere */}
        <group position={[targetX, targetY, targetPlateBackZ]}>
          {/* Main luminous red target sphere */}
          <Sphere args={[0.035, 32, 32]}>
            <meshStandardMaterial
              color="#ff0000"
              emissive="#ff3333"
              emissiveIntensity={2.0}
              roughness={0.2}
              metalness={0.8}
            />
          </Sphere>
          
          {/* Outer glow sphere */}
          <Sphere args={[0.045, 16, 16]}>
            <meshStandardMaterial
              color="#ff0000"
              transparent={true}
              opacity={0.15}
              emissive="#ff0000"
              emissiveIntensity={1.5}
            />
          </Sphere>
          
          {/* Horizontal white lines on left and right - only visible when dragging */}
          {isDraggingTarget && (
            <>
              <mesh position={[-0.09, 0, 0]} rotation={[0, 0, 0]}>
                <boxGeometry args={[0.02, 0.002, 0.002]} />
                <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2.0} />
              </mesh>
              
              <mesh position={[0.09, 0, 0]} rotation={[0, 0, 0]}>
                <boxGeometry args={[0.02, 0.002, 0.002]} />
                <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2.0} />
              </mesh>
            </>
          )}
        </group>
      </Canvas>
    </div>
  );
}

export default App;
