import React from 'react';

const AudioToggle = ({ isMuted, toggleMute }) => {
  return (
    <button 
      onClick={toggleMute}
      title={isMuted ? "Unmute" : "Mute"}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.4)',
        border: 'none',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: 'white',
        transition: 'background 0.3s ease'
      }}
      onMouseOver={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.7)'}
      onMouseOut={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.4)'}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  );
};

export default AudioToggle;