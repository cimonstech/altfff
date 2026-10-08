// components/programme/ScheduleView.tsx
'use client';

import { useState } from 'react';
import styles from '@/styles/programme.module.css';
import { GlassCard, ChevronIcon } from './ui';
import { scheduleSessions } from '@/data/programme.data';

export function ScheduleView() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={styles.view}>
      <div className={styles.sectionTitle}>The Day at a Glance</div>
      <div className={styles.sectionSub}>Tap a session for the full breakdown.</div>

      {scheduleSessions.map((session) => {
        const isOpen = openId === session.id;
        return (
          <GlassCard className={styles.card} key={session.id}>
            <div
              className={styles.cardRow}
              onClick={() => setOpenId(isOpen ? null : session.id)}
            >
              <div>
                <div className={styles.cardMeta}>{session.meta}</div>
                <h3>{session.title}</h3>
                <div className={styles.cardDesc}>{session.subtitle}</div>
              </div>
              <ChevronIcon open={isOpen} />
            </div>

            <div className={`${styles.cardDetail} ${isOpen ? styles.cardDetailOpen : ''}`}>
              {session.detailNote && (
                <div className={styles.cardDesc} style={{ marginBottom: 8 }}>
                  {session.detailNote}
                </div>
              )}
              {session.detail?.map((row, i) => (
                <div className={styles.miniRow} key={i}>
                  <div className={styles.miniRowLabel}>{row.time}</div>
                  <div className={styles.miniRowMid}>{row.label}</div>
                  <div className={styles.miniRowName}>{row.name}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        );
      })}

      <div className={styles.sectionSub} style={{ marginTop: 14, textAlign: 'center' }}>
        All day: Experience Hall · The Moving Loom · Green Artist Area · Trade Fair
      </div>
    </div>
  );
}
