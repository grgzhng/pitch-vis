import React from 'react';

// Define the props the component will accept
interface PitchControlsProps {
  velocity: number;
  setVelocity: (value: number) => void;
  ivb: number;
  setIvb: (value: number) => void;
  hb: number;
  setHb: (value: number) => void;
  onThrowPitch: () => void; // Function to call when the button is clicked
}

const PitchControls: React.FC<PitchControlsProps> = ({
  velocity, setVelocity,
  ivb, setIvb,
  hb, setHb,
  onThrowPitch
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 1,
        background: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <h4>Pitch Controls</h4>
      <div>
        <label>Velocity (MPH): {velocity}</label>
        <input
          type="range"
          min="60"
          max="105"
          step="0.5"
          value={velocity}
          onChange={(e) => setVelocity(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Induced Vertical Break (IVB, inches): {ivb}</label>
        <input
          type="range"
          min="-25" // Allow negative for curveballs etc.
          max="25"
          step="0.1"
          value={ivb}
          onChange={(e) => setIvb(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Horizontal Break (inches): {hb}</label>
        <input
          type="range"
          min="-25"
          max="25"
          step="0.1"
          value={hb}
          onChange={(e) => setHb(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      <button onClick={onThrowPitch} style={{marginTop: '10px'}}>
        Throw Pitch
      </button>
    </div>
  );
};

export default PitchControls;
