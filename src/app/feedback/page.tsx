"use client";

import React, { useState } from "react";
import { MessageSquarePlus, ThumbsUp, ThumbsDown, CheckCircle2, Send, Lightbulb, Sparkles, HelpCircle } from "lucide-react";
import { logAuditEvent } from "@/lib/events/audit-events";
import clsx from "clsx";

const FEEDBACK_TAGS = [
  "Too expensive",
  "Too much information",
  "Data unclear",
  "Could not find what I needed",
  "Navigation difficult",
  "Report not useful",
  "Other",
];

export default function FeedbackPage() {
  const [rating, setRating] = useState<"useful" | "not_really" | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [featureSuggestion, setFeatureSuggestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
          screen: "Dedicated Feedback Hub",
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
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800">
              Section 21
            </span>
            <span className="text-xs text-slate-400 font-mono">Loop: Action → Feedback → Product Improvement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2.5">
            <MessageSquarePlus className="text-[#FC8019]" size={28} />
            <span>Feedback & Product Intelligence</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Every submission is analyzed by our Feedback Agent to refine statutory report precision, pricing fairness, and automated recovery cadences.
          </p>
        </div>
      </div>

      {submitted ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Feedback Successfully Logged!
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            Your input has been added to our Developer & Product Intelligence log. Thank you for shaping ChaanBean.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-900 dark:text-white mb-3">
                Overall, was the ChaanBean portal useful for your business today?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRating("useful")}
                  className={clsx(
                    "p-4 rounded-2xl border flex items-center justify-center gap-3 text-sm font-bold transition",
                    rating === "useful"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-md"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  )}
                >
                  <ThumbsUp size={20} />
                  <span>Yes, very helpful</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRating("not_really")}
                  className={clsx(
                    "p-4 rounded-2xl border flex items-center justify-center gap-3 text-sm font-bold transition",
                    rating === "not_really"
                      ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-400 shadow-md"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  )}
                >
                  <ThumbsDown size={20} />
                  <span>Not really</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                What can we improve? (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {FEEDBACK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={clsx(
                        "text-xs px-3.5 py-2 rounded-xl border transition font-medium",
                        isSelected
                          ? "bg-[#FC8019] text-white border-[#FC8019] shadow-xs"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                Share your experience or critique
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Tell us what worked well or what felt confusing, slow, or overpriced..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FC8019]"
              />
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-400">
                <Lightbulb size={18} />
                <span>Suggest a Feature</span>
              </div>
              <input
                type="text"
                value={featureSuggestion}
                onChange={(e) => setFeatureSuggestion(e.target.value)}
                placeholder="What new statutory integration, ERP connector, or recovery feature would you like?"
                className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FC8019]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-[#FC8019] hover:bg-[#e06900] text-white font-bold text-sm shadow-md shadow-orange-500/20 transition flex items-center gap-2"
              >
                <Send size={16} />
                <span>{isSubmitting ? "Submitting..." : "Send Feedback"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
