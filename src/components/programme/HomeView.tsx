// components/programme/HomeView.tsx
'use client';

import styles from '@/styles/programme.module.css';
import { GlassCard } from './ui';
import { heroStats, keynoteSpeaker, featuredQuote, scheduleSessions } from '@/data/programme.data';

export function HomeView() {
  const nextTwo = scheduleSessions.slice(0, 2);

  return (
    <div className={styles.view}>
      <div className={styles.hero}>
        <div className={styles.eyebrow}>LAUNCH EDITION 2026</div>
        <h1>Turning Culture Into Circular Economy</h1>
        <p className={styles.heroSub}>
          9:00am–8:00pm · The Palms Convention Centre, La Palm Royal Beach Hotel, Accra
        </p>

        <GlassCard className={styles.heroStats}>
          {heroStats.map((s) => (
            <div className={styles.stat} key={s.label}>
              <div className={styles.statNum}>{s.num}</div>
              <div className={styles.statLbl}>{s.label}</div>
            </div>
          ))}
        </GlassCard>
      </div>

      <div className={styles.sectionTitle}>Happening Now &amp; Next</div>
      {nextTwo.map((session) => (
        <GlassCard className={styles.card} key={session.id}>
          <div className={styles.cardRow} style={{ cursor: 'default' }}>
            <div>
              <div className={styles.cardMeta}>{session.meta}</div>
              <h3>{session.title}</h3>
              <div className={styles.cardDesc}>{session.subtitle}</div>
            </div>
          </div>
        </GlassCard>
      ))}

      <div className={styles.sectionTitle}>Keynote Speaker</div>
      <GlassCard className={styles.speakerCard}>
        <div className={styles.avatar}>{keynoteSpeaker.initials}</div>
        <div>
          <h3>{keynoteSpeaker.name}</h3>
          <div className={styles.speakerRole}>{keynoteSpeaker.role}</div>
          <div className={styles.speakerBio}>{keynoteSpeaker.bio}</div>
        </div>
      </GlassCard>

      <div className={styles.sectionTitle}>Featured Voice</div>
      <GlassCard className={styles.card} style={{ padding: 20 }}>
        <div className={styles.quoteText}>&ldquo;{featuredQuote.text}&rdquo;</div>
        <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--orange-soft)', fontWeight: 600 }}>
          {featuredQuote.attribution}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{featuredQuote.role}</div>
      </GlassCard>
    </div>
  );
}
