import { Droplet, Droplets, GlassWater, Zap } from "lucide-react";
import type { VesselOption } from "../types";

export const VESSELS: VesselOption[] = [
  {
    amount: 250,
    label: "Standard Glass",
    sub: "Hydration sip",
    icon: GlassWater,
  },
  {
    amount: 500,
    label: "Athlete Flask",
    sub: "Hydration bottle",
    icon: Droplet,
  },
  {
    amount: 750,
    label: "Training Shaker",
    sub: "Workout bottle",
    icon: Zap,
  },
  {
    amount: 1000,
    label: "Hydration Jug",
    sub: "Major volume",
    icon: Droplets,
  },
];
