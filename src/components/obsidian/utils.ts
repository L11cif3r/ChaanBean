import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Class name helper used by the ObsidianUI components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
