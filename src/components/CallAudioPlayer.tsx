"use client";

import React, { useState, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

export function CallAudioPlayer({
  audioRef,
  callId,
}: {
  audioRef: string | null;
  callId: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRefElement = useRef<HTMLAudioElement | null>(null);

  if (!audioRef) {
    return <span className="text-[10px] text-slate-600 font-mono">No audio</span>;
  }

  // Extract hash or use audioRef
  const hash = audioRef.includes("/") ? audioRef.split("/").pop()?.replace(".mp3", "").replace(".wav", "") : audioRef;
  const audioStreamUrl = audioRef.startsWith("/api/audio")
    ? audioRef
    : `/api/audio/${hash}`;

  const togglePlay = () => {
    if (!audioRefElement.current) {
      audioRefElement.current = new Audio(audioStreamUrl);
      audioRefElement.current.onended = () => setIsPlaying(false);
      audioRefElement.current.onerror = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRefElement.current.pause();
      setIsPlaying(false);
    } else {
      audioRefElement.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={togglePlay}
        className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-medium transition ${
          isPlaying
            ? "bg-amber-500 text-slate-950 font-bold"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
        }`}
        title={`Play audio: ${audioStreamUrl}`}
      >
        {isPlaying ? <Pause size={10} /> : <Play size={10} />}
        <span>{isPlaying ? "Playing..." : "Play Audio"}</span>
      </button>

      <span className="font-mono text-[9px] text-slate-500 truncate max-w-[75px]" title={hash}>
        {hash?.slice(0, 8)}...
      </span>
    </div>
  );
}
