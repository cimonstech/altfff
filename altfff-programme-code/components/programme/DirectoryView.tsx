// components/programme/DirectoryView.tsx
'use client';

import styles from '@/styles/programme.module.css';
import { GlassCard, LogoImage } from './ui';
import { directoryListings, partners } from '@/data/programme.data';

function initialsFor(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function DirectoryView() {
  const sponsor = partners.filter((p) => p.tier === 'sponsor');
  const partnerTier = partners.filter((p) => p.tier === 'partner');
  const supporterTier = partners.filter((p) => p.tier === 'supporter');

  return (
    <div className={styles.view}>
      <div className={styles.sectionTitle}>Exhibitor &amp; Vendor Listings</div>
      <div className={styles.sectionSub}>Featured makers, stylists and creatives at Alt.FFF.</div>

      {/*
        Per client request: directory cards show ONLY the logo + name.
        No contact info, phone, email, Instagram handle, or website is displayed
        here or anywhere on the /programme page.
      */}
      <div className={styles.listingGrid}>
        {directoryListings.map((listing) => (
          <GlassCard className={styles.listingCard} key={listing.id}>
            <LogoImage
              src={listing.logoSrc}
              alt={listing.name}
              fallbackText={initialsFor(listing.name)}
              boxClassName={styles.listingLogo}
            />
            <h4>{listing.name}</h4>
          </GlassCard>
        ))}
      </div>

      <div className={styles.sectionTitle}>Partners &amp; Sponsor</div>

      <GlassCard className={styles.card} style={{ padding: 16 }}>
        <div className={styles.partnerTierLabel}>Sponsor</div>
        <div className={styles.partnerGrid}>
          {sponsor.map((p) => (
            <GlassCard className={styles.sponsorChip} key={p.id}>
              <div className={styles.sponsorLbl}>SPONSOR</div>
              <LogoImage
                src={p.logoSrc}
                alt={p.name}
                fallbackText={initialsFor(p.name)}
                boxClassName={styles.sponsorLogoBox}
              />
              <div className={styles.sponsorName}>{p.name}</div>
            </GlassCard>
          ))}
        </div>

        <div className={styles.partnerTierLabel}>Partners</div>
        <div className={styles.partnerGrid}>
          {partnerTier.map((p) => (
            <GlassCard className={styles.partnerChip} key={p.id}>
              <LogoImage
                src={p.logoSrc}
                alt={p.name}
                fallbackText={initialsFor(p.name)}
                boxClassName={styles.partnerLogoBox}
              />
              <div className={styles.partnerName}>{p.name}</div>
            </GlassCard>
          ))}
        </div>

        <div className={styles.partnerTierLabel}>Supporters</div>
        <div className={styles.partnerGrid}>
          {supporterTier.map((p) => (
            <GlassCard className={styles.partnerChip} key={p.id}>
              <LogoImage
                src={p.logoSrc}
                alt={p.name}
                fallbackText={initialsFor(p.name)}
                boxClassName={styles.partnerLogoBox}
              />
              <div className={styles.partnerName}>{p.name}</div>
            </GlassCard>
          ))}
        </div>
      </GlassCard>

      <div className={styles.sectionSub} style={{ marginTop: 16, textAlign: 'center' }}>
        enquiries@altfff.com · +233 541 177 573 · altfff.com
      </div>
    </div>
  );
}
