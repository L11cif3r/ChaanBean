import { prisma } from "@/lib/db";

export interface CallingWindowCheck {
  allowed: boolean;
  reason?: string;
  currentIstHour: number;
  callsTodayCount: number;
}

export async function checkCallingWindowAndLimits(
  buyerId: string,
  callingWindow = "09:00-18:00",
  maxCallsPerDay = 2
): Promise<CallingWindowCheck> {
  // Current time in IST (UTC + 5:30)
  const now = new Date();
  const utcOffset = now.getTime() + now.getTimezoneOffset() * 60000;
  const istTime = new Date(utcOffset + 3600000 * 5.5);
  const currentIstHour = istTime.getHours() + istTime.getMinutes() / 60;

  // Parse window, e.g. "09:00-18:00"
  const [startStr, endStr] = callingWindow.split("-");
  const [startHour, startMin] = (startStr || "09:00").split(":").map(Number);
  const [endHour, endMin] = (endStr || "18:00").split(":").map(Number);
  const windowStart = startHour + (startMin || 0) / 60;
  const windowEnd = endHour + (endMin || 0) / 60;

  // 1. Calling Hours Check (TRAI regulations: 09:00 - 18:00)
  if (currentIstHour < windowStart || currentIstHour > windowEnd) {
    return {
      allowed: false,
      reason: `Outside permitted TRAI calling hours (${callingWindow} IST). Current IST time: ${istTime.toLocaleTimeString("en-IN")}.`,
      currentIstHour,
      callsTodayCount: 0,
    };
  }

  // 2. Frequency Caps Check: calls today for this buyer
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const callsToday = await prisma.call.findMany({
    where: {
      buyerId,
      createdAt: { gte: startOfDay },
      status: { in: ["answered", "busy", "no_answer", "in_progress"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (callsToday.length >= maxCallsPerDay) {
    return {
      allowed: false,
      reason: `Daily frequency cap reached (${callsToday.length}/${maxCallsPerDay} calls today).`,
      currentIstHour,
      callsTodayCount: callsToday.length,
    };
  }

  // 3. Grace Period Check: minimum 3 hours between calls
  if (callsToday.length > 0) {
    const lastCall = callsToday[0];
    const diffHours = (now.getTime() - lastCall.createdAt.getTime()) / 3600000;
    if (diffHours < 3) {
      return {
        allowed: false,
        reason: `Cool-off grace period active (${diffHours.toFixed(1)}h elapsed; 3.0h required between attempts).`,
        currentIstHour,
        callsTodayCount: callsToday.length,
      };
    }
  }

  return {
    allowed: true,
    currentIstHour,
    callsTodayCount: callsToday.length,
  };
}
