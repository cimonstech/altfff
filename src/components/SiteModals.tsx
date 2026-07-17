"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import Modal from "@/components/Modal";
import ExhibitApplicationForm from "@/components/ExhibitApplicationForm";
import VisitorRegisterForm from "@/components/VisitorRegisterForm";

type OpenModal = "exhibit" | "visitor" | null;

const SiteModalsContext = createContext<{
  openExhibitModal: () => void;
  openVisitorModal: () => void;
} | null>(null);

/**
 * Mounts the "Apply to exhibit" and "Register to visit" forms as shared
 * Modal instances ONCE, at the app root — any CTA anywhere on the site
 * (Nav, homepage, About, Exhibiting, Visit) can open either one via
 * useSiteModals(), regardless of which page it's rendered on.
 */
export function SiteModalsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<OpenModal>(null);

  const openExhibitModal = useCallback(() => setOpen("exhibit"), []);
  const openVisitorModal = useCallback(() => setOpen("visitor"), []);
  const close = useCallback(() => setOpen(null), []);

  return (
    <SiteModalsContext.Provider value={{ openExhibitModal, openVisitorModal }}>
      {children}
      <Modal isOpen={open === "exhibit"} onClose={close} titleId="exhibit-modal-heading" panelClassName="max-w-lg">
        <ExhibitApplicationForm headingId="exhibit-modal-heading" />
      </Modal>
      <Modal isOpen={open === "visitor"} onClose={close} titleId="visitor-modal-heading" panelClassName="max-w-md">
        <VisitorRegisterForm headingId="visitor-modal-heading" />
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
