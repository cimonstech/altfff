# Cursor Prompt — Alt.FFF `/programme` Page

Paste this into Cursor along with the attached files.

---

I need you to add a new `/programme` route to this Next.js app: a mobile-first,
"liquid glass" (frosted glassmorphism) single-page app experience for the Alt.FFF
event, with 4 tabs switched via a floating bottom nav bar (no page reloads,
client-side state).

## Files I'm providing (already written, use as-is unless something conflicts
with our existing conventions — flag it rather than silently changing it):

- `types/programme.ts` — TypeScript interfaces for all the data shapes
- `data/programme.data.ts` — the real event data (schedule, rooms, directory
  listings, partners) already typed and filled in
- `styles/programme.module.css` — CSS module with the full "liquid glass" visual
  system (blurred translucent cards, forest green + orange brand colors)
- `components/programme/ui.tsx` — shared `GlassCard`, `ChevronIcon`, `LogoImage`
  primitives
- `components/programme/BottomNav.tsx` — the floating pill-shaped bottom tab bar
- `components/programme/HomeView.tsx` — Home tab (hero, stats, next-up, keynote,
  featured quote)
- `components/programme/ScheduleView.tsx` — Schedule tab (tap-to-expand session
  cards, full breakdown per session)
- `components/programme/RoomsView.tsx` — Rooms tab (Workshop Room, Moving Loom,
  Experience Hall, Green Artist Area, floor plan zone chips)
- `components/programme/DirectoryView.tsx` — Directory tab (exhibitor/vendor
  logos + partner/sponsor logos)
- `app/programme/page.tsx` — the page that composes everything with tab state

## Integration tasks

1. **Drop these files into the matching paths** in this repo. If we use a
   different import alias than `@/`, or a different folder convention
   (e.g. `src/`), adjust the import paths accordingly — don't just copy blindly.

2. **Fonts**: the design uses Lora (serif, for headings) and Poppins (sans, for
   body). Add them via `next/font/google` in the root layout if they aren't
   already loaded, rather than the Google Fonts `<link>` tags I used in the
   throwaway HTML prototype. Wire the CSS variables/classes so
   `font-family: 'Lora', serif` and `'Poppins', sans-serif` resolve correctly.

3. **Logo assets — read carefully, this is the part most likely to need back-and-forth:**
   - The background watermark and the top-bar logo reference
     `/public/brand/mark-cream.png` — this should be our real Alt.FFF logo mark
     (triangle + chevron), recolored so the dark-green strokes become
     cream/off-white (since it sits on a dark green background here). If we
     don't have that recolored variant yet, generate it from the master logo
     file and add it to `/public/brand/`.
   - **Exhibitor/vendor directory logos** go in `/public/tradeguide/` as:
     `wrapped-to-go.png`, `nuava-handmade.png`, `the-gele-center.png`,
     `theephotoberry.png`, `dakope.png`, `versatile-agency.png`,
     `jaywillz-studios.png`. If our actual filenames differ, update the
     `logoSrc` values in `data/programme.data.ts` to match — don't rename our
     real asset files to match my guesses.
   - **Partner/sponsor logos** go in `/public/tradeguide/partners/` as:
     `dimo.png`, `black-star-experience.png`, `fashion-forum-africa.png`,
     `mcpr-africa.png`, `agi.png`, `ghana-tourism-authority.png`,
     `ghana-culture-forum.png`, `national-commission-on-culture.png`,
     `itfp-ghana.png`, `creative-arts-agency.png`. Same deal — fix the data
     file if actual filenames differ.
   - Every logo has a graceful fallback to initials (via `LogoImage` in
     `ui.tsx`) if the image 404s, so this won't break the build if an asset is
     missing — it'll just show initials until the real file is added.

4. **CRITICAL — do not add contact info back**: the Directory tab must show
   **only the logo and name** for each exhibitor/vendor and each
   partner/supporter/sponsor. No phone numbers, no Instagram handles, no
   emails, no websites — anywhere on this page. This was an explicit client
   requirement (they were previously showing on an earlier version and were
   asked to be removed). If you see yourself reaching for contact fields from
   any data source, stop — they shouldn't be rendered here.

5. **Data source**: right now `data/programme.data.ts` is static/hardcoded from
   the event programme documents. Leave it static for now — this is launch-day
   content that won't change. If we later want the schedule or directory to be
   editable from the admin dashboard, that's a separate task (Supabase table +
   fetch), not part of this one. Don't add a data-fetching layer speculatively.

6. **Responsive behavior**: mobile-first is the default state (max-width 480px
   centered column). Tablet (768px+) and desktop (1280px+) breakpoints widen the
   container but keep the same single-column card-based layout — this is
   intentionally an "app," not a responsive marketing page that reflows into
   multi-column grids at desktop width. Don't add a desktop-specific layout
   unless asked.

7. **Test the interaction**: bottom nav must switch tabs instantly with no page
   reload (it's already built as client-side state in `page.tsx` — just verify
   it works after wiring into our actual routing/layout, since we might have a
   root layout that wraps every page and could visually conflict with the
   full-bleed dark background this page needs).

8. **Route conflicts**: check whether `/programme` already exists in the repo
   (there was a discussion of this being a "new feature" previously, and I
   recall something about it triggering a second SMS on check-in — that's
   unrelated backend logic and NOT part of this task; don't touch check-in or
   SMS code while doing this).

## What NOT to do

- Don't invent additional event content (speakers, times, sponsors) beyond
  what's in `data/programme.data.ts` — that data was transcribed directly from
  the official event programme documents.
- Don't add contact info/websites back into the Directory tab (see #4).
- Don't swap the visual design for a different aesthetic — the glass/blur
  effect is an explicit client request, not a placeholder to be "cleaned up."
- Don't restructure the 4-tab navigation into a scrolling single page — the
  tab-based app feel is intentional.

Let me know once it's wired in and I'll do a pass on real devices for the
`backdrop-filter: blur()` performance, since that can be heavy on older
Android phones.
