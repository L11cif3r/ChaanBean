"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import s from "./site.module.css";
import { ALL_PRODUCTS, ENQUIRY, whatsappLink } from "./content";
import { contactMessage } from "./Sections";
import { Modal } from "./Modal";

interface Submitted {
  name: string;
  phone: string;
  email: string;
  message: string;
}

/**
 * Product enquiry dialog. There is still no public lead endpoint, so after
 * submitting the visitor can also pass the details on via WhatsApp.
 */
export function EnquiryModal({ product, onClose }: { product: string | null; onClose: () => void }) {
  const [selected, setSelected] = useState(product ?? ALL_PRODUCTS[0]);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);

  useEffect(() => {
    if (product) {
      setSelected(product);
      setSubmitted(null);
    }
  }, [product]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSubmitted({
      name: String(f.get("name") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      email: String(f.get("email") ?? "").trim(),
      message: String(f.get("message") ?? "").trim(),
    });
  };

  return (
    <Modal open={!!product} onClose={onClose} labelledBy="enquiry-title">
      <span className={s.eyebrow}>
        <Sparkles size={13} /> Enquiry
      </span>
      <h3 id="enquiry-title" className={s.modalTitle}>
        {selected}
      </h3>

      {submitted ? (
        <div className={s.success} role="status">
          <span className={s.successIcon}>
            <CheckCircle2 size={32} />
          </span>
          <h4>{ENQUIRY.successTitle}</h4>
          <p>{ENQUIRY.successText}</p>
          <div className={s.successActions}>
            <a
              href={whatsappLink(contactMessage(submitted, selected))}
              target="_blank"
              rel="noopener noreferrer"
              className={`${s.btn} ${s.whatsBtn}`}
            >
              <MessageCircle size={18} /> Also send on WhatsApp
            </a>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={s.modalLead}>{ENQUIRY.lead}</p>
          <form className={s.form} style={{ marginTop: 20 }} onSubmit={onSubmit}>
            <div>
              <label className={s.label} htmlFor="enq-name">
                Your name / business <span className={s.req}>*</span>
              </label>
              <input id="enq-name" name="name" className={s.field} required placeholder="e.g. Ramesh Kumar (Agro Traders)" />
            </div>
            <div className={s.formRow}>
              <div>
                <label className={s.label} htmlFor="enq-phone">
                  Phone <span className={s.req}>*</span>
                </label>
                <input id="enq-phone" name="phone" type="tel" inputMode="tel" className={s.field} required placeholder="+91 98XXX XXXXX" />
              </div>
              <div>
                <label className={s.label} htmlFor="enq-email">
                  Email <span className={s.optional}>(optional)</span>
                </label>
                <input id="enq-email" name="email" type="email" className={s.field} placeholder="you@company.in" />
              </div>
            </div>
            <div>
              <label className={s.label} htmlFor="enq-module">
                Interested in
              </label>
              <select id="enq-module" className={s.field} value={selected} onChange={(e) => setSelected(e.target.value)}>
                {ALL_PRODUCTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={s.label} htmlFor="enq-message">
                Your requirement <span className={s.optional}>(optional)</span>
              </label>
              <textarea
                id="enq-message"
                name="message"
                className={s.field}
                placeholder="e.g. We bill on Tally and want automatic WhatsApp reminders"
              />
            </div>
            <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnBlock}`}>
              {ENQUIRY.submit}
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
