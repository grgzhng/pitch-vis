import React, { useRef, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

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


  // Modified to address passive event warnings by using specific props
  return (
    <OrbitControls 
      ref={controlsRef} 
      onChange={updateCameraInfo} 
      target={initialTarget}
      enableDamping={true}
      dampingFactor={0.25}
      rotateSpeed={0.85}
      makeDefault
      minDistance={0.5} // Prevent zooming too close
      maxDistance={5}   // Prevent zooming too far
      enablePan={false} // Disable panning to reduce event listeners
      screenSpacePanning={false}
    />
  ); // Pass initialTarget to target prop
};

export default CameraInfoLogger;
