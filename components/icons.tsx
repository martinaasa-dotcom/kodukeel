import {
  Award, Bike, Blocks, BookCheck, BookmarkCheck, BookOpen, Brain, BrainCircuit, Briefcase, Broom, Building2,
  Bus, Calculator, CalendarCheck, CalendarDays, CalendarRange, Camera, ChartLine, ChartNoAxesColumn,
  CheckCheck, ChefHat, CircleDot, CircleHelp, ClipboardCheck, Clock, CloudSun, Combine, Compass, Cpu,
  Crosshair, Drama, Ear, Eye, Flame, FlaskConical, Focus, Footprints, Gauge, Gavel, GitBranch, Globe,
  GraduationCap, Grid2x2, Grid3x3, Hand, Handshake, Hash, Headphones, Heart, HeartHandshake, HeartPulse,
  History, Hourglass, House, KeyRound, Landmark, Languages, Layers, Leaf, Library, LifeBuoy, Lightbulb, Link,
  Map, Megaphone, MessageCircle, MessageCircleQuestion, MessageSquareWarning, MessagesSquare, Mic, Microscope,
  Minimize2, Moon, Mountain, Network, Newspaper, Paintbrush, Palette, PenLine, Plane, Plus, Puzzle, Quote,
  Repeat, Rocket, Scale, School, ScissorsLineDashed, ScrollText, Settings, Shirt, ShoppingBag, Shuffle,
  SlidersHorizontal, Smile, Sparkles, Stamp, Stethoscope, Sun, Sunrise, Swords, Target, Trees, TrendingUp,
  TriangleAlert, Trophy, Users, UserX, Utensils, Vote, WifiOff, Zap, type LucideIcon, type LucideProps,
} from "lucide-react";
import { createElement } from "react";

/**
 * One place where an icon *name* — stored in framework-free data like
 * lib/collections/syllabus/ and lib/ux/nav.ts — becomes a React component.
 *
 * Those modules deliberately hold no JSX (they are unit-tested without a DOM),
 * so they carry a string. This is the only file that has to know what the
 * string means, and the fallback keeps a typo from crashing a page.
 */
export const ICONS: Record<string, LucideIcon> = {
  Award, Bike, Blocks, BookCheck, BookmarkCheck, BookOpen, Brain, BrainCircuit, Briefcase, Broom, Building2,
  Bus, Calculator, CalendarCheck, CalendarDays, CalendarRange, Camera, ChartLine, ChartNoAxesColumn,
  CheckCheck, ChefHat, CircleDot, CircleHelp, ClipboardCheck, Clock, CloudSun, Combine, Compass, Cpu,
  Crosshair, Drama, Ear, Eye, Flame, FlaskConical, Focus, Footprints, Gauge, Gavel, GitBranch, Globe,
  GraduationCap, Grid2x2, Grid3x3, Hand, Handshake, Hash, Headphones, Heart, HeartHandshake, HeartPulse,
  History, Hourglass, House, KeyRound, Landmark, Languages, Layers, Leaf, Library, LifeBuoy, Lightbulb, Link,
  Map, Megaphone, MessageCircle, MessageCircleQuestion, MessageSquareWarning, MessagesSquare, Mic, Microscope,
  Minimize2, Moon, Mountain, Network, Newspaper, Paintbrush, Palette, PenLine, Plane, Plus, Puzzle, Quote,
  Repeat, Rocket, Scale, School, ScissorsLineDashed, ScrollText, Settings, Shirt, ShoppingBag, Shuffle,
  SlidersHorizontal, Smile, Sparkles, Stamp, Stethoscope, Sun, Sunrise, Swords, Target, Trees, TrendingUp,
  TriangleAlert, Trophy, Users, UserX, Utensils, Vote, WifiOff, Zap,
};

export function icon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}

/**
 * The icon a name stands for, drawn.
 *
 * Every caller used to write `const Icon = icon(name)` and then `<Icon />`,
 * which is a component chosen during render as far as any static reader can
 * tell: `react-hooks/static-components` cannot see that `ICONS` is a constant
 * table and every entry in it is a module-level lucide component, so it
 * reported eight of them as components created on every render. The lookup is
 * the same lookup; `createElement` hands React the stable component itself,
 * and the names stay the only thing a data module ever carries.
 */
export function NamedIcon({ name, ...props }: { name: string } & LucideProps) {
  return createElement(icon(name), props);
}

