import React from 'react';

export function GlobeIndiaAccent() {
  return (
    <div style={{
      width: 200, height: 200,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), rgba(0,0,0,0.4))',
      boxShadow: 'inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 30px rgba(224,70,50,0.1)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      {/* Latitude/Longitude lines */}
      <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: 'absolute', opacity: 0.15 }}>
        <ellipse cx="100" cy="100" rx="100" ry="40" fill="none" stroke="white" strokeWidth="1" />
        <ellipse cx="100" cy="100" rx="100" ry="70" fill="none" stroke="white" strokeWidth="1" />
        <ellipse cx="100" cy="100" rx="40" ry="100" fill="none" stroke="white" strokeWidth="1" />
        <ellipse cx="100" cy="100" rx="70" ry="100" fill="none" stroke="white" strokeWidth="1" />
        <line x1="0" y1="100" x2="200" y2="100" stroke="white" strokeWidth="1" />
        <line x1="100" y1="0" x2="100" y2="200" stroke="white" strokeWidth="1" />
      </svg>
      
      {/* India Map Shape (simplified path) */}
      <svg width="100" height="120" viewBox="0 0 100 120" style={{ position: 'absolute', top: '15%', left: '20%', filter: 'drop-shadow(0 0 4px #E04632)' }}>
        <path d="M 40 0 C 45 5, 50 10, 55 10 C 60 15, 65 20, 70 20 C 75 25, 80 30, 85 40 C 90 50, 85 60, 80 65 C 75 70, 70 80, 65 90 C 60 100, 55 110, 50 120 C 45 110, 40 100, 35 90 C 30 80, 25 70, 20 60 C 15 50, 10 40, 5 30 C 0 20, 5 15, 15 10 C 25 5, 30 0, 40 0 Z" 
              fill="#E04632" opacity="0.8" />
        <circle cx="50" cy="70" r="4" fill="white" />
      </svg>
    </div>
  );
}
