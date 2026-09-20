import {
  Radar, Swords, Gauge, Coins, Flame, Target, LayoutGrid, ShieldPlus, Wrench, Gem, Snowflake, CircleDot,
  ClipboardList, Sparkles, Play, Bomb, HeartPulse, Crosshair, Zap, HelpCircle,
} from "lucide-react";

const MAP = {
  Radar, Swords, Gauge, Coins, Flame, Target, LayoutGrid, ShieldPlus, Wrench, Gem, Snowflake, CircleDot,
  ClipboardList, Sparkles, Play, Bomb, HeartPulse, Crosshair, Zap,
};

export default function LucideIcon({ name, ...props }) {
  const Cmp = MAP[name] || HelpCircle;
  return <Cmp {...props} />;
}
