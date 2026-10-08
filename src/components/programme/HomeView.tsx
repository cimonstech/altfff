'use client';

import styles from '@/styles/programme.module.css';
import { GlassCard } from './ui';
import {
  heroStats,
  featuredQuote,
  scheduleSessions,
  programmePeople,
} from '@/data/programme.data';

export function HomeView() {
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

      <div className={styles.sectionTitle}>Today&apos;s Programme</div>
      <div className={styles.sectionSub}>Full day at a glance — open Schedule for session breakdowns.</div>
      {scheduleSessions.map((session) => (
        <GlassCard className={styles.card} key={session.id}>
          <div className={styles.cardRow} style={{ cursor: 'default' }}>
            <div>
              <div className={styles.cardMeta}>{session.meta}</div>
              <h3>{session.title}</h3>
              <div className={styles.cardDesc}>{session.subtitle}</div>
              {session.detailNote && (
                <div className={styles.cardDesc} style={{ marginTop: 6 }}>
                  {session.detailNote}
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      ))}

      <div className={styles.sectionTitle}>Speakers &amp; Hosts</div>
      <div className={styles.sectionSub}>Everyone appearing across main stage, workshops and rooms.</div>
      {programmePeople.map((person) => (
        <GlassCard className={styles.personCard} key={person.id}>
          <h3>{person.name}</h3>
          <div className={styles.speakerRole}>{person.role}</div>
          {person.bio && <div className={styles.speakerBio}>{person.bio}</div>}
          <ul className={styles.appearanceList}>
            {person.appearances.map((appearance) => (
              <li key={appearance}>{appearance}</li>
            ))}
          </ul>
        </GlassCard>
      ))}

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
