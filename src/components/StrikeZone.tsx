import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface StrikeZoneProps {
  strikeZoneWidth: number;
  strikeZoneBottom: number;
  strikeZoneTop: number;
  plateTotalDepth: number;
}

const STRIKE_ZONE_LINE_WIDTH = 5; // Define line width as a constant

const StrikeZone: React.FC<StrikeZoneProps> = ({
  strikeZoneWidth,
  strikeZoneBottom,
  strikeZoneTop,
  plateTotalDepth,
}) => {
  // --- Calculate Strike Zone Dimensions ---
  const strikeZoneCenterY = (strikeZoneTop + strikeZoneBottom) / 2;
  const strikeZoneHeight = strikeZoneTop - strikeZoneBottom;
  // Calculate strike zone center Z to align with plate center Z
  // Plate extends from Z=0 (back point) to Z=plateTotalDepth (front edge)
  const strikeZoneCenterZ = plateTotalDepth / 2;

  // Helper function moved outside useMemo and wrapped in useCallback
  const generateLineData = useCallback(
    (
      indexSequence: number[],
      vertices: Float32Array,
      colorsWithAlpha: number[]
    ) => {
      const points: number[] = [];
      const colors: [number, number, number, number][] = [];
      for (const index of indexSequence) {
        if (index === undefined) continue; // Safety check

        // Add vertex position
        points.push(
          vertices[index * 3],
          vertices[index * 3 + 1],
          vertices[index * 3 + 2]
        );
        // Add vertex color
        colors.push([
          colorsWithAlpha[index * 4],
          colorsWithAlpha[index * 4 + 1],
          colorsWithAlpha[index * 4 + 2],
          colorsWithAlpha[index * 4 + 3],
        ]);
      }
      return { points, colors };
    },
    []
  ); // Empty dependency array for useCallback as it has no external dependencies

  // --- Create Strike Zone Edges Geometry with Vertex Colors for Depth Gradient ---
  const strikeZoneLineData = useMemo(() => {
    const halfW = strikeZoneWidth / 2;
    const halfH = strikeZoneHeight / 2;
    const halfD = plateTotalDepth / 2;

    // 8 corners of the strike zone box (relative to its center)
    const vertices = new Float32Array([
      // Front face (Z = +halfD)
      -halfW,
      -halfH,
      halfD, // 0: Front-Bottom-Left
      halfW,
      -halfH,
      halfD, // 1: Front-Bottom-Right
      halfW,
      halfH,
      halfD, // 2: Front-Top-Right
      -halfW,
      halfH,
      halfD, // 3: Front-Top-Left
      // Back face (Z = -halfD)
      -halfW,
      -halfH,
      -halfD, // 4: Back-Bottom-Left
      halfW,
      -halfH,
      -halfD, // 5: Back-Bottom-Right
      halfW,
      halfH,
      -halfD, // 6: Back-Top-Right
      -halfW,
      halfH,
      -halfD, // 7: Back-Top-Left
    ]);

    // Calculate vertex colors (including alpha) based on Z position
    const colorsWithAlpha: number[] = [];
    // Make front extremely bright for bloom to pick up
    const frontColor = new THREE.Color(0x40c0ff).multiplyScalar(5.0); // Ultra bright blue for front (very emissive)
    const backColor = new THREE.Color(0x0a2040); // Even darker blue for back to increase contrast
    const frontAlpha = 0.95; // Almost opaque at front for strong glow
    const backAlpha = 0.3; // More transparent at back

    for (let i = 0; i < vertices.length / 3; i++) {
      const z = vertices[i * 3 + 2]; // Get the Z coordinate
      // Normalize z: 0 for back (-halfD), 1 for front (+halfD)
      const normalizedZ = (z + halfD) / plateTotalDepth;
      // Interpolate color and alpha
      const color = new THREE.Color().lerpColors(backColor, frontColor, normalizedZ);
      const alpha = backAlpha + (frontAlpha - backAlpha) * normalizedZ;
      // Push RGB and Alpha values
      colorsWithAlpha.push(color.r, color.g, color.b, alpha);
    }

    // Define the sequence of vertices for the front and back faces
    const frontIndices = [0, 1, 2, 3, 0]; // Sequence for front face
    const backIndices = [4, 5, 6, 7, 4]; // Sequence for back face

    // Generate data for front and back lines separately using the helper
    const frontLineData = generateLineData(
      frontIndices,
      vertices,
      colorsWithAlpha
    );
    const backLineData = generateLineData(
      backIndices,
      vertices,
      colorsWithAlpha
    );

    // Define pairs of indices for connecting lines
    const connectingIndicesPairs = [
      [0, 4], // Bottom-Left: Front(0) -> Back(4)
      [1, 5], // Bottom-Right: Front(1) -> Back(5)
      [2, 6], // Top-Right: Front(2) -> Back(6)
      [3, 7], // Top-Left: Front(3) -> Back(7)
    ];

    // Generate data for connecting lines
    const connectingLineData = connectingIndicesPairs.map((pair) =>
      generateLineData(pair, vertices, colorsWithAlpha)
    );

    return { frontLineData, backLineData, connectingLineData };
  }, [strikeZoneWidth, strikeZoneHeight, plateTotalDepth, generateLineData]); // Keep generateLineData in deps

  // Effect to modulate front line width for visual interest
  const [frontLineWidth, setFrontLineWidth] = useState(STRIKE_ZONE_LINE_WIDTH * 1.4);
  
  // Pulse the front line width slightly to give depth cues
  useEffect(() => {
    const interval = setInterval(() => {
      setFrontLineWidth(
        STRIKE_ZONE_LINE_WIDTH * (1.3 + 0.3 * Math.sin(Date.now() / 1000))
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Render Front Lines - Brightest with most glow */}
      <Line
        points={strikeZoneLineData.frontLineData.points}
        vertexColors={strikeZoneLineData.frontLineData.colors}
        lineWidth={frontLineWidth} // Dynamic width
        transparent={true}
        position={[0, strikeZoneCenterY, strikeZoneCenterZ]}
        color={0x40c0ff} // Match frontColor
        toneMapped={false} // Important for emissive materials
        dashed={false}
      />
      {/* Render Back Lines - Dimmer with less glow */}
      <Line
        points={strikeZoneLineData.backLineData.points}
        vertexColors={strikeZoneLineData.backLineData.colors}
        lineWidth={STRIKE_ZONE_LINE_WIDTH * 0.7} // Thinner for back
        transparent={true}
        position={[0, strikeZoneCenterY, strikeZoneCenterZ]}
        color={0x104080} // Match backColor
        toneMapped={false}
        dashed={false}
      />
      {/* Render Connecting Lines - Gradient glow */}
      {strikeZoneLineData.connectingLineData.map((lineData, index) => (
        <Line
          key={`connecting-line-${index}`}
          points={lineData.points}
          vertexColors={lineData.colors}
          lineWidth={STRIKE_ZONE_LINE_WIDTH}
          transparent={true}
          position={[0, strikeZoneCenterY, strikeZoneCenterZ]}
          toneMapped={false}
          dashed={false}
        />
      ))}
    </>
  );
};

export default StrikeZone;
