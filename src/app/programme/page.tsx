"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "@/styles/programme.module.css";
import { BottomNav, type TabId } from "@/components/programme/BottomNav";
import { HomeView } from "@/components/programme/HomeView";
import { ScheduleView } from "@/components/programme/ScheduleView";
import { RoomsView } from "@/components/programme/RoomsView";
import { DirectoryView } from "@/components/programme/DirectoryView";

export default function ProgrammePage() {
  const [tab, setTab] = useState<TabId>("home");

  return (
    <div className={styles.root}>
      <div className={styles.bgMark} />
      <div className={styles.bgMarkSecondary} />

      <div className={styles.app}>
        <div className={`${styles.topbar} ${styles.glass}`}>
          <div className={styles.brand}>
            <Image src="/brand/mark-cream.png" alt="Alt.FFF" width={30} height={30} />
            <div className={styles.brandText}>
              Alt<span>.</span>FFF
            </div>
          </div>
          <div className={`${styles.dayPill} ${styles.glass}`}>SAT 19 SEP</div>
        </div>

        {tab === "home" && <HomeView />}
        {tab === "schedule" && <ScheduleView />}
        {tab === "rooms" && <RoomsView />}
        {tab === "directory" && <DirectoryView />}
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
