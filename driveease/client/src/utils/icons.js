import {
  BadgeIndianRupee,
  Briefcase,
  Building2,
  Car,
  Clock,
  Headphones,
  Heart,
  Luggage,
  MapPin,
  Mountain,
  Phone,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  Train,
  Users,
  Wallet,
} from 'lucide-react';

/** Icons selectable by admins for services / "why choose us" items. */
export const ICONS = {
  BadgeIndianRupee,
  Briefcase,
  Building2,
  Car,
  Clock,
  Headphones,
  Heart,
  Luggage,
  MapPin,
  Mountain,
  Phone,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  Train,
  Users,
  Wallet,
};

export const ICON_NAMES = Object.keys(ICONS);
export const getIcon = (name) => ICONS[name] || Sparkles;
