import React, { useMemo } from "react";
import * as THREE from "three";
import {
  PLATE_WIDTH,
  PLATE_POINT_LENGTH,
  PLATE_SIDE_LENGTH,
} from "../constants"; // Import constants

const HomePlate: React.FC = () => {
  // --- Define Home Plate Shape ---
  const homePlateShape = useMemo(() => {
    const shape = new THREE.Shape();
    const halfWidth = PLATE_WIDTH / 2;
    // Start at the back point, move counter-clockwise (when viewed from above)
    shape.moveTo(0, -PLATE_POINT_LENGTH); // Back point (towards catcher)
    shape.lineTo(-halfWidth, 0); // Left corner
    shape.lineTo(-halfWidth, PLATE_SIDE_LENGTH); // Front left corner (towards pitcher)
    shape.lineTo(halfWidth, PLATE_SIDE_LENGTH); // Front right corner
    shape.lineTo(halfWidth, 0); // Right corner
    shape.closePath(); // Close path back to back point
    return shape;
  }, []);

  // Settings for extruding the home plate
  const homePlateExtrudeSettings = useMemo(
    () => ({
      steps: 1,
      depth: 0.02, // 2cm thick plate
      bevelEnabled: false,
    }),
    []
  );

  // Calculate the Z offset to place the back point at Z=0 in world space
  const positionZ = PLATE_POINT_LENGTH; // The shape's back point is at -PLATE_POINT_LENGTH

  return (
    <mesh position={[0, 0.01, positionZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <extrudeGeometry args={[homePlateShape, homePlateExtrudeSettings]} />
      <meshStandardMaterial color="white" side={THREE.DoubleSide} />
    </mesh>
  );
};

export default HomePlate;
