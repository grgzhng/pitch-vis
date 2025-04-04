import React, { useState, useRef, useCallback, useEffect } from "react";

// Constants for conversion
const INCHES_TO_METERS = 0.0254;
const METERS_TO_FEET = 1 / 0.3048;
const MARGIN_INCHES = 4;
const MARGIN_M = MARGIN_INCHES * INCHES_TO_METERS;

interface TargetPadProps {
  targetX: number; // Still in METERS internally
  setTargetX: (value: number) => void;
  targetY: number; // Still in METERS internally
  setTargetY: (value: number) => void;
  // Strike zone dimensions needed for bounds (in meters)
  strikeZoneWidth_m: number;
  strikeZoneBottom_m: number;
  strikeZoneTop_m: number;
  padWidth?: number; // pixels
  padHeight?: number; // pixels
  setIsDraggingTarget?: (isDragging: boolean) => void; // To update drag state in parent
}

const TargetPad: React.FC<TargetPadProps> = ({
  targetX,
  setTargetX,
  targetY,
  setTargetY,
  strikeZoneWidth_m,
  strikeZoneBottom_m,
  strikeZoneTop_m,
  padWidth = 150,
  padHeight = 150,
  setIsDraggingTarget,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const padRef = useRef<HTMLDivElement>(null);

  // Calculate the mapping range based on strike zone + margin (in meters)
  const minX = -(strikeZoneWidth_m / 2) - MARGIN_M;
  const maxX = strikeZoneWidth_m / 2 + MARGIN_M;
  const minY = strikeZoneBottom_m - MARGIN_M;
  const maxY = strikeZoneTop_m + MARGIN_M;

  // Function to update target based on mouse/touch coordinates
  const updateTarget = useCallback(
    (clientX: number, clientY: number) => {
      if (!padRef.current) return;

      const rect = padRef.current.getBoundingClientRect();
      // Calculate mouse position relative to the pad's top-left corner
      let x = clientX - rect.left;
      let y = clientY - rect.top;

      // Clamp coordinates within the pad boundaries
      x = Math.max(0, Math.min(padWidth, x));
      y = Math.max(0, Math.min(padHeight, y));

      // Map clamped pixel coordinates to target values
      const newTargetX = minX + (x / padWidth) * (maxX - minX);
      // Map Y: screen Y increases downwards, target Y increases upwards
      const newTargetY = minY + ((padHeight - y) / padHeight) * (maxY - minY);

      setTargetX(newTargetX);
      setTargetY(newTargetY);
    },
    [
      padRef,
      padWidth,
      padHeight,
      minX,
      maxX,
      minY,
      maxY,
      setTargetX,
      setTargetY,
    ]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setIsDraggingTarget?.(true);
    updateTarget(e.clientX, e.clientY);
    // Prevent text selection during drag
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        updateTarget(e.clientX, e.clientY);
      }
    },
    [isDragging, updateTarget]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setIsDraggingTarget?.(false);
    }
  }, [isDragging, setIsDraggingTarget]);

  // Add/remove global listeners for mouse move/up
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      // Consider adding mouseleave on the pad itself or body as well
      window.addEventListener("mouseleave", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleMouseUp);
    }

    // Cleanup listeners on component unmount or when dragging stops
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Basic styles (can be moved to CSS)
  const padStyle: React.CSSProperties = {
    position: "absolute",
    top: "10px",
    right: "10px",
    width: `${padWidth}px`,
    height: `${padHeight}px`,
    border: "1px solid #ccc",
    backgroundColor: "rgba(200, 200, 200, 0.7)",
    borderRadius: "4px",
    cursor: "crosshair",
    zIndex: 1, // Ensure it's above the canvas
    userSelect: "none", // Prevent text selection
  };

  // Calculate handle position directly for the style
  const handleX = ((targetX - minX) / (maxX - minX)) * padWidth;
  const handleY = padHeight - ((targetY - minY) / (maxY - minY)) * padHeight;
  const clampedHandleX = Math.max(0, Math.min(padWidth, handleX));
  const clampedHandleY = Math.max(0, Math.min(padHeight, handleY));

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    width: "16px",
    height: "16px",
    backgroundColor: "#ff0000",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)", // Center the handle on the coords
    left: `${clampedHandleX}px`, // Use calculated value
    top: `${clampedHandleY}px`, // Use calculated value
    pointerEvents: "none", // Don't let the handle interfere with pad events
    boxShadow: "0 0 10px 2px rgba(255, 0, 0, 0.7)", // Red glow effect
    border: "2px solid rgba(255, 255, 255, 0.9)",
  };

  return (
    <div
      ref={padRef}
      style={padStyle}
      onMouseDown={handleMouseDown}
      // Add touch events for mobile
      onTouchStart={(e) => {
        setIsDragging(true);
        setIsDraggingTarget?.(true);
        updateTarget(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }}
      onTouchMove={(e) => {
        if (isDragging) {
          updateTarget(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={() => {
        if (isDragging) {
          setIsDragging(false);
          setIsDraggingTarget?.(false);
        }
      }}
      onTouchCancel={() => {
        if (isDragging) {
          setIsDragging(false);
          setIsDraggingTarget?.(false);
        }
      }}
    >
      <div style={handleStyle}></div>
      {/* Display coordinates converted to FEET */}
      <div
        style={{
          position: "absolute",
          bottom: "2px",
          left: "2px",
          fontSize: "10px",
          color: "#333",
          pointerEvents: "none",
        }}
      >
        X: {(targetX * METERS_TO_FEET).toFixed(2)} ft
        <br />
        Y: {(targetY * METERS_TO_FEET).toFixed(2)} ft
      </div>
    </div>
  );
};

export default TargetPad;
