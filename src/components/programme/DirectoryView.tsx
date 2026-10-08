'use client';

import styles from '@/styles/programme.module.css';
import { LogoImage } from './ui';
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
          <div className={styles.listingItem} key={listing.id}>
            <LogoImage
              src={listing.logoSrc}
              alt={listing.name}
              fallbackText={initialsFor(listing.name)}
              wrapClassName={`${styles.logoWrap} ${styles.logoWrapListing}`}
            />
            <h4>{listing.name}</h4>
          </div>
        ))}
      </div>

      <div className={styles.sectionTitle}>Partners &amp; Sponsor</div>

      <div className={styles.partnerSection}>
        <div className={styles.partnerTierLabel}>Sponsor</div>
        <div className={styles.partnerGrid}>
          {sponsor.map((p) => (
            <div className={styles.sponsorItem} key={p.id}>
              <div className={styles.sponsorLbl}>SPONSOR</div>
              <LogoImage
                src={p.logoSrc}
                alt={p.name}
                fallbackText={initialsFor(p.name)}
                wrapClassName={`${styles.logoWrap} ${styles.logoWrapSponsor}`}
              />
              <div className={styles.sponsorName}>{p.name}</div>
            </div>
          ))}
        </div>

        <div className={styles.partnerTierLabel}>Partners</div>
        <div className={styles.partnerGrid}>
          {partnerTier.map((p) => (
            <div className={styles.partnerItem} key={p.id}>
              <LogoImage
                src={p.logoSrc}
                alt={p.name}
                fallbackText={initialsFor(p.name)}
                wrapClassName={`${styles.logoWrap} ${styles.logoWrapPartner}`}
              />
              <div className={styles.partnerName}>{p.name}</div>
            </div>
          ))}
        </div>

        <div className={styles.partnerTierLabel}>Supporters</div>
        <div className={styles.partnerGrid}>
          {supporterTier.map((p) => (
            <div className={styles.partnerItem} key={p.id}>
              <LogoImage
                src={p.logoSrc}
                alt={p.name}
                fallbackText={initialsFor(p.name)}
                wrapClassName={`${styles.logoWrap} ${styles.logoWrapPartner}`}
              />
              <div className={styles.partnerName}>{p.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
