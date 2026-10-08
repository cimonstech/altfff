// Small inline icons - no icon system exists elsewhere on the site (the
// footer's "Follow" list is plain text links, no icons), so these are
// purpose-built here: minimal, single-color, sized to sit inline with text.
function MailIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="16" height="12" rx="1.5" stroke="var(--gold)" strokeWidth="1.4" />
      <path d="M3 5.5 10 11 17 5.5" stroke="var(--gold)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M5 3h2.3l1 3.3-1.6 1.4a9 9 0 0 0 4.6 4.6l1.4-1.6 3.3 1v2.3c0 1-.8 1.8-1.8 1.7C8.6 15.2 4.8 11.4 4.3 5.8 4.2 4.8 4 3 5 3z"
        stroke="var(--gold)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="15" height="15" rx="4" stroke="var(--gold)" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="3.5" stroke="var(--gold)" strokeWidth="1.4" />
      <circle cx="14.3" cy="5.7" r="1" fill="var(--gold)" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M11.5 10.5h2.5l.5-3H11.5V6.2c0-.9.3-1.5 1.6-1.5H14.5V2.1C14.2 2 13.2 2 12.2 2 9.9 2 8.3 3.4 8.3 5.8V7.5H6v3h2.3V18h3.2v-7.5Z"
        stroke="var(--gold)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="15" height="15" rx="2" stroke="var(--gold)" strokeWidth="1.4" />
      <path d="M6.5 9v6M6.5 6.5v.01M10 15v-3.5c0-1.2.8-2 2-2s2 .8 2 2V15" stroke="var(--gold)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function Row({ icon: Icon, label, href }: { icon: () => React.ReactElement; label: string; href: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <Icon />
      <a href={href} className="hover:opacity-70">
        {label}
      </a>
    </li>
  );
}

export default function SponsorshipSidebar() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-hairline bg-surface p-6 md:p-7">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">
          Direct Enquiries
        </h3>
        <ul className="mt-3 text-sm text-ink">
          <Row icon={MailIcon} label="enquiries@altfff.com" href="mailto:enquiries@altfff.com" />
        </ul>
      </div>

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">
          Customer Support Line
        </h3>
        <ul className="mt-3 text-sm text-ink">
          <Row icon={PhoneIcon} label="+233 54 117 7573" href="tel:+233541177573" />
        </ul>
      </div>

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">
          Socials
        </h3>
        <ul className="mt-3 flex flex-col gap-2.5 text-sm text-ink">
          <Row icon={InstagramIcon} label="@fashionforumafrica" href="https://www.instagram.com/fashionforumafrica" />
          <Row icon={FacebookIcon} label="Alt.FFF on Facebook" href="https://www.facebook.com/share/1D3VYeEFrR/" />
          <Row icon={LinkedInIcon} label="Fashion Forum Africa" href="https://www.linkedin.com/company/fashionforumafrica" />
        </ul>
      </div>
    </div>
  );
}


