"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Modal from "@/components/Modal";
import ExhibitApplicationForm from "@/components/ExhibitApplicationForm";
import VisitorRegisterForm from "@/components/VisitorRegisterForm";
import { PublicFormsClosedModalContent } from "@/components/PublicFormsClosedNotice";
import type { FormToggleState } from "@/lib/appSettings";
import { fetchFormToggleStateClient } from "@/lib/formToggleClient";

type OpenModal = "exhibit" | "visitor" | "closed" | null;

const SiteModalsContext = createContext<{
  openExhibitModal: () => void;
  openVisitorModal: () => void;
} | null>(null);

/**
 * Mounts the "Apply to exhibit" and "Register to visit" forms as shared
 * Modal instances ONCE, at the app root - any CTA anywhere on the site
 * (Nav, homepage, About, Exhibiting, Visit) can open either one via
 * useSiteModals(), regardless of which page it's rendered on.
 */
export function SiteModalsProvider({
  children,
  exhibitorFormEnabled,
  visitFormEnabled,
}: {
  children: ReactNode;
  exhibitorFormEnabled: boolean;
  visitFormEnabled: boolean;
}) {
  const [open, setOpen] = useState<OpenModal>(null);
  const [formToggles, setFormToggles] = useState<FormToggleState>({
    sponsor: true,
    exhibitor: exhibitorFormEnabled,
    visit: visitFormEnabled,
  });

  useEffect(() => {
    setFormToggles((prev) => ({
      ...prev,
      exhibitor: exhibitorFormEnabled,
      visit: visitFormEnabled,
    }));
  }, [exhibitorFormEnabled, visitFormEnabled]);

  const refreshFormToggles = useCallback(async () => {
    const next = await fetchFormToggleStateClient();
    setFormToggles(next);
    return next;
  }, []);

  const openExhibitModal = useCallback(() => {
    void (async () => {
      const toggles = await refreshFormToggles();
      setOpen(toggles.exhibitor ? "exhibit" : "closed");
    })();
  }, [refreshFormToggles]);

  const openVisitorModal = useCallback(() => {
    void (async () => {
      const toggles = await refreshFormToggles();
      setOpen(toggles.visit ? "visitor" : "closed");
    })();
  }, [refreshFormToggles]);

  const close = useCallback(() => setOpen(null), []);

  const exhibitOpen = open === "exhibit" && formToggles.exhibitor;
  const visitorOpen = open === "visitor" && formToggles.visit;
  const closedOpen = open === "closed" || (open === "exhibit" && !formToggles.exhibitor) || (open === "visitor" && !formToggles.visit);

  return (
    <SiteModalsContext.Provider value={{ openExhibitModal, openVisitorModal }}>
      {children}
      <Modal isOpen={exhibitOpen} onClose={close} titleId="exhibit-modal-heading" panelClassName="max-w-lg">
        <ExhibitApplicationForm headingId="exhibit-modal-heading" formsEnabled={formToggles.exhibitor} />
      </Modal>
      <Modal isOpen={visitorOpen} onClose={close} titleId="visitor-modal-heading" panelClassName="max-w-md">
        <VisitorRegisterForm headingId="visitor-modal-heading" formsEnabled={formToggles.visit} />
      </Modal>
      <Modal isOpen={closedOpen} onClose={close} titleId="public-forms-closed-heading" panelClassName="max-w-md">
        <PublicFormsClosedModalContent headingId="public-forms-closed-heading" />
      </Modal>
    </SiteModalsContext.Provider>
  );
}

export function useSiteModals() {
  const ctx = useContext(SiteModalsContext);
  if (!ctx) {
    throw new Error("useSiteModals must be used within SiteModalsProvider");
  }
  return ctx;
}
