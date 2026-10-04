"use client";

import React, { useCallback, useState } from "react";
import { FooterModals, type ModalType } from "@/components/FooterModals";
import { SiteShell } from "./SiteShell";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { PillarsSection } from "./Pillars";
import { ContactSection, LoansSection, PricingSection, SecondarySection, StartSection } from "./Sections";
import { Footer } from "./Footer";
import { EnquiryModal } from "./EnquiryModal";
import { useInPageLinks } from "./useInPageLinks";

export function LandingPage() {
  const [enquiry, setEnquiry] = useState<string | null>(null);
  const [footerModal, setFooterModal] = useState<ModalType>(null);
  useInPageLinks();

  const openEnquiry = useCallback((product: string) => setEnquiry(product), []);
  const closeEnquiry = useCallback(() => setEnquiry(null), []);

  return (
    <SiteShell>
      <Navbar onEnquire={openEnquiry} />
      <main>
        <Hero />
        <PillarsSection />
        <SecondarySection onEnquire={openEnquiry} />
        <LoansSection />
        <PricingSection />
        <StartSection />
        <ContactSection />
      </main>
      <Footer onEnquire={openEnquiry} onOpenModal={setFooterModal} />
      <EnquiryModal product={enquiry} onClose={closeEnquiry} />
      <FooterModals activeModal={footerModal} onClose={() => setFooterModal(null)} />
    </SiteShell>
  );
}
