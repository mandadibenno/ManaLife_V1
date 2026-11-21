import {
  Baby, BookOpen, Briefcase, Building2, Camera, Coffee, Dog, Dumbbell, Gamepad2, GraduationCap,
  Heart, House, Leaf, Music, Palette, PartyPopper, Plane, Rocket, ShoppingBag, Sparkles, Star,
  Tent, UserRound, UsersRound,
} from 'lucide-react'

// Icons a space can use. Keys are stored in households.icon (validated in SQL: ^[a-z0-9-]{1,40}$).
export const SPACE_ICONS = {
  'user-round': UserRound,
  heart: Heart,
  house: House,
  users: UsersRound,
  'party-popper': PartyPopper,
  briefcase: Briefcase,
  sparkles: Sparkles,
  plane: Plane,
  dumbbell: Dumbbell,
  'graduation-cap': GraduationCap,
  baby: Baby,
  dog: Dog,
  'book-open': BookOpen,
  music: Music,
  'gamepad-2': Gamepad2,
  'shopping-bag': ShoppingBag,
  'building-2': Building2,
  tent: Tent,
  coffee: Coffee,
  leaf: Leaf,
  star: Star,
  rocket: Rocket,
  camera: Camera,
  palette: Palette,
}

export const SPACE_ICON_KEYS = Object.keys(SPACE_ICONS).filter((k) => k !== 'user-round')
