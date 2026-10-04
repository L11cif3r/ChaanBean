"use client";

import React, { useState } from "react";
import {
  MessageSquarePlus,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  X,
  Send,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import clsx from "clsx";
import { logAuditEvent } from "@/lib/events/audit-events";

const FEEDBACK_TAGS = [
  "Too expensive",
  "Too much information",
  "Data unclear",
  "Could not find what I needed",
  "Navigation difficult",
  "Report not useful",
  "Other",
];

export function FeedbackDrawer({
  isOpen,
  onClose,
  currentScreen = "Global Portal",
}: {
  isOpen: boolean;
  onClose: () => void;
  currentScreen?: string;
}) {
  const [rating, setRating] = useState<"useful" | "not_really" | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [featureSuggestion, setFeatureSuggestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await logAuditEvent("FEEDBACK_SUBMITTED", {
        metadata: {
          screen: currentScreen,
          rating: rating || "neutral",
          selectedTags,
          comment,
          featureSuggestion,
        },
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setRating(null);
        setSelectedTags([]);
        setComment("");
        setFeatureSuggestion("");
        onClose();
      }, 1800);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FC8019]/15 border border-[#FC8019]/30 text-[#FC8019] flex items-center justify-center shadow-xs">
              <MessageSquarePlus size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Feedback & Product Intelligence
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800">
                  Section 21
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Help ChaanBean improve your underwriting and collection experience
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={30} />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Thank You for Your Feedback!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Our AI Feedback Agent logs patterns to refine report clarity, pricing, and workflow speed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Was this useful? */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Was this useful?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRating("useful")}
                  className={clsx(
                    "p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition",
                    rating === "useful"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                  )}
                >
                  <ThumbsUp size={16} />
                  <span>Yes, very helpful</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRating("not_really")}
                  className={clsx(
                    "p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition",
                    rating === "not_really"
                      ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-400 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                  )}
                >
                  <ThumbsDown size={16} />
                  <span>Not really</span>
                </button>
              </div>
            </div>

            {/* Tags when not really or for feedback */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                What can we improve? (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={clsx(
                        "text-xs px-3 py-1.5 rounded-xl border transition font-medium",
                        isSelected
                          ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Comments */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Details or Feedback
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Share any specifics about the data, speed, or accuracy..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FC8019]"
              />
            </div>

            {/* Suggest a Feature */}
            <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/50 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <Lightbulb size={14} />
                <span>Suggest a Feature</span>
              </div>
              <input
                type="text"
                value={featureSuggestion}
                onChange={(e) => setFeatureSuggestion(e.target.value)}
                placeholder="What new statutory integration or automation would help your business?"
                className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FC8019]"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#FC8019] hover:bg-[#e06900] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center gap-1.5"
              >
                <Send size={14} />
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
