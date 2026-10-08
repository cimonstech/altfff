// components/programme/BottomNav.tsx
'use client';

import styles from '@/styles/programme.module.css';

export type TabId = 'home' | 'schedule' | 'rooms' | 'directory';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4 11L12 4L20 11V19C20 19.55 19.55 20 19 20H15V14H9V20H5C4.45 20 4 19.55 4 19V11Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M4 9.5H20" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 3.5V6.5M16 3.5V6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'rooms',
    label: 'Rooms',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 20V10L12 4L20 10V20" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M9 20V14H15V20" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    id: 'directory',
    label: 'Directory',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 8V12L15 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div className={styles.bottomNav} style={{ background: 'var(--glass-fill-strong)', backdropFilter: 'blur(28px) saturate(150%)' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={active === tab.id ? styles.navBtnActive : styles.navBtn}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
