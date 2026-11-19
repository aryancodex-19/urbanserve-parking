import React from 'react';
import type { ParkingSlot } from '../types';

interface ParkingFloorPlanProps {
  slots: ParkingSlot[];
  onSlotClick: (slot: ParkingSlot) => void;
}

/* ── tiny inline SVG icons ───────────────────────────── */

const CarIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="10" width="18" height="8" rx="2" fill={color} opacity="0.85" />
    <path d="M5 10 L7 5 H17 L19 10" stroke={color} strokeWidth="1.5" fill={color} opacity="0.6" />
    <circle cx="7.5" cy="18" r="1.5" fill="#1e293b" />
    <circle cx="16.5" cy="18" r="1.5" fill="#1e293b" />
    <rect x="9" y="7" width="6" height="3" rx="0.5" fill="rgba(255,255,255,0.4)" />
  </svg>
);

const EntryArrow: React.FC = () => (
  <svg viewBox="0 0 60 30" width="60" height="30" className="fp-entry-arrow">
    <defs>
      <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill="#10b981" />
      </marker>
    </defs>
    <line x1="4" y1="15" x2="48" y2="15" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrowGreen)" />
    <text x="30" y="10" textAnchor="middle" fill="#10b981" fontSize="7" fontWeight="600">ENTRY</text>
  </svg>
);

const ExitArrow: React.FC = () => (
  <svg viewBox="0 0 60 30" width="60" height="30" className="fp-exit-arrow">
    <defs>
      <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill="#ef4444" />
      </marker>
    </defs>
    <line x1="4" y1="15" x2="48" y2="15" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrowRed)" />
    <text x="30" y="10" textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="600">EXIT</text>
  </svg>
);

/* ── colour helpers ──────────────────────────────────── */

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; carFill: string }> = {
  available:   { bg: '#d1fae5', border: '#10b981', text: '#065f46', carFill: '#10b981' },
  occupied:    { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', carFill: '#ef4444' },
  reserved:    { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', carFill: '#8b5cf6' },
  maintenance: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', carFill: '#f59e0b' },
};

/* ── main component ──────────────────────────────────── */

export const ParkingFloorPlan: React.FC<ParkingFloorPlanProps> = ({ slots, onSlotClick }) => {
  /* split slots by zone prefix (A…, B…, etc.) */
  const zones = new Map<string, ParkingSlot[]>();
  slots.forEach((s) => {
    const prefix = s.id.charAt(0);
    if (!zones.has(prefix)) zones.set(prefix, []);
    zones.get(prefix)!.push(s);
  });

  const zoneKeys = Array.from(zones.keys()).sort();
  const leftZone = zoneKeys[0] ?? null;   // Zone A — left side
  const rightZone = zoneKeys[1] ?? null;  // Zone B — right side

  const renderBay = (slot: ParkingSlot, side: 'left' | 'right') => {
    const c = STATUS_COLORS[slot.status] ?? STATUS_COLORS.available;
    const isOccupied = slot.status === 'occupied';
    const isMaintenance = slot.status === 'maintenance';

    return (
      <div
        key={slot.id}
        className={`fp-bay fp-bay-${side} fp-bay-${slot.status}`}
        style={{
          backgroundColor: c.bg,
          borderColor: c.border,
        }}
        onClick={() => onSlotClick(slot)}
        title={`${slot.id} — ${slot.status}`}
      >
        <span className="fp-bay-id" style={{ color: c.text }}>{slot.id}</span>
        {isOccupied && (
          <span className="fp-bay-car"><CarIcon color={c.carFill} /></span>
        )}
        {isMaintenance && (
          <span className="fp-bay-icon">🚧</span>
        )}
        {slot.status === 'available' && (
          <span className="fp-bay-icon fp-bay-open">●</span>
        )}
        {slot.status === 'reserved' && (
          <span className="fp-bay-icon">🔒</span>
        )}
      </div>
    );
  };

  return (
    <div className="fp-container">
      {/* header label */}
      <div className="fp-title-row">
        <span className="fp-title">🅿️ Parking Floor Plan</span>
        <span className="fp-subtitle">
          Click any bay to view details or book
        </span>
      </div>

      {/* arrows row */}
      <div className="fp-arrows-row">
        <EntryArrow />
        <ExitArrow />
      </div>

      {/* main floor area */}
      <div className="fp-floor">
        {/* Left zone bays */}
        {leftZone && (
          <div className="fp-zone fp-zone-left">
            <div className="fp-zone-label">Zone {leftZone}</div>
            <div className="fp-bays">
              {zones.get(leftZone)!.map((s) => renderBay(s, 'left'))}
            </div>
          </div>
        )}

        {/* Central driveway */}
        <div className="fp-driveway">
          <div className="fp-driveway-line" />
          <span className="fp-driveway-text">D R I V E W A Y</span>
          <div className="fp-driveway-arrows">
            <span>▼</span>
            <span>▼</span>
            <span>▼</span>
          </div>
          <div className="fp-driveway-line" />
        </div>

        {/* Right zone bays */}
        {rightZone && (
          <div className="fp-zone fp-zone-right">
            <div className="fp-zone-label">Zone {rightZone}</div>
            <div className="fp-bays">
              {zones.get(rightZone)!.map((s) => renderBay(s, 'right'))}
            </div>
          </div>
        )}
      </div>

      {/* Stats summary */}
      <div className="fp-stats-row">
        <span className="fp-stat">
          <span className="fp-stat-dot" style={{ background: '#10b981' }} />
          {slots.filter(s => s.status === 'available').length} Available
        </span>
        <span className="fp-stat">
          <span className="fp-stat-dot" style={{ background: '#ef4444' }} />
          {slots.filter(s => s.status === 'occupied').length} Occupied
        </span>
        <span className="fp-stat">
          <span className="fp-stat-dot" style={{ background: '#8b5cf6' }} />
          {slots.filter(s => s.status === 'reserved').length} Reserved
        </span>
        <span className="fp-stat">
          <span className="fp-stat-dot" style={{ background: '#f59e0b' }} />
          {slots.filter(s => s.status === 'maintenance').length} Maintenance
        </span>
      </div>
    </div>
  );
};
