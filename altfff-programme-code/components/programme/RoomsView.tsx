// components/programme/RoomsView.tsx
'use client';

import styles from '@/styles/programme.module.css';
import { GlassCard } from './ui';
import { rooms, floorPlanZones } from '@/data/programme.data';

export function RoomsView() {
  return (
    <div className={styles.view}>
      <div className={styles.sectionTitle}>The Rooms</div>
      <div className={styles.sectionSub}>
        Alt.FFF operates as a multi-layered experience across connected zones.
      </div>

      {rooms.map((room) => (
        <GlassCard className={styles.roomCard} key={room.id}>
          <div className={styles.roomTag}>{room.tag}</div>
          <h3>{room.title}</h3>
          <p>{room.description}</p>

          {room.pills && (
            <div className={styles.pillList} style={{ marginBottom: 8 }}>
              {room.pills.map((p) => (
                <div className={styles.pill} key={p}>
                  {p}
                </div>
              ))}
            </div>
          )}

          {room.subSessions?.map((s, i) => (
            <div className={styles.subSession} key={i}>
              <div className={styles.subSessionRow}>
                <h4>{s.title}</h4>
                {s.time && <div className={styles.subSessionTime}>{s.time}</div>}
              </div>
              {s.facilitator && (
                <div className={styles.subSessionFacilitator}>{s.facilitator}</div>
              )}
            </div>
          ))}
        </GlassCard>
      ))}

      <div className={styles.sectionTitle}>Floor Plan</div>
      <GlassCard className={styles.card} style={{ padding: 18 }}>
        <div className={styles.zoneGrid}>
          {floorPlanZones.map((zone) => (
            <GlassCard className={styles.zoneChip} key={zone}>
              {zone}
            </GlassCard>
          ))}
        </div>
        <div className={styles.cardDesc} style={{ marginTop: 12 }}>
          Full venue map available at the Information Desk on arrival.
        </div>
      </GlassCard>
    </div>
  );
}
