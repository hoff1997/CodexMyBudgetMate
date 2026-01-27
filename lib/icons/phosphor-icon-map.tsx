/**
 * Phosphor Icons Mapping for Envelope Categories
 *
 * Uses the @phosphor-icons/react package (MIT license, free for commercial use)
 * Phosphor Icons by Tobias Fried & Helena Zhang @ https://phosphoricons.com
 *
 * Features:
 * - 9,000+ icons available
 * - 6 weights: thin, light, regular, bold, fill, duotone
 * - Clean, geometric, professional style
 *
 * Usage:
 *   import { getPhosphorIcon, PhosphorIcon } from "@/lib/icons/phosphor-icon-map";
 *
 *   // Get icon component by key
 *   const Icon = getPhosphorIcon("groceries");
 *   <Icon size={24} weight="regular" color="#7A9E9A" />
 *
 *   // Or use the wrapper component
 *   <PhosphorIcon name="groceries" size={24} color="#7A9E9A" />
 */

import * as Icons from "@phosphor-icons/react";
import type { IconProps, IconWeight } from "@phosphor-icons/react";
import { ComponentType } from "react";

// Brand colors from style guide
export const ICON_COLORS = {
  sage: "#7A9E9A",
  sageDark: "#5A7E7A",
  sageLight: "#B8D4D0",
  blue: "#6B9ECE",
  gold: "#D4A853",
  textDark: "#3D3D3D",
  textMedium: "#6B6B6B",
  silver: "#9CA3AF",
} as const;

// Type for Phosphor icon components
type PhosphorIconComponent = ComponentType<IconProps>;

/**
 * ALL available icons organized by category for the icon picker
 */
export const ICON_CATEGORIES: Record<string, Record<string, PhosphorIconComponent>> = {
  "Finance": {
    "wallet": Icons.Wallet,
    "bank": Icons.Bank,
    "money": Icons.Money,
    "currency-dollar": Icons.CurrencyDollar,
    "currency-circle-dollar": Icons.CurrencyCircleDollar,
    "coins": Icons.Coins,
    "piggy-bank": Icons.PiggyBank,
    "chart-line-up": Icons.ChartLineUp,
    "chart-line-down": Icons.ChartLineDown,
    "trend-up": Icons.TrendUp,
    "trend-down": Icons.TrendDown,
    "receipt": Icons.Receipt,
    "credit-card": Icons.CreditCard,
    "hand-coins": Icons.HandCoins,
    "hand-deposit": Icons.HandDeposit,
    "vault": Icons.Vault,
    "scales": Icons.Scales,
    "percent": Icons.Percent,
    "tip-jar": Icons.TipJar,
    "swap": Icons.Swap,
    "envelope-simple": Icons.EnvelopeSimple,
  },
  "Shopping": {
    "shopping-cart": Icons.ShoppingCart,
    "shopping-bag": Icons.ShoppingBag,
    "basket": Icons.Basket,
    "handbag": Icons.Handbag,
    "tote": Icons.Tote,
    "bag": Icons.Bag,
    "storefront": Icons.Storefront,
    "tag": Icons.Tag,
    "barcode": Icons.Barcode,
    "package": Icons.Package,
    "gift": Icons.Gift,
    "ticket": Icons.Ticket,
    "coat-hanger": Icons.CoatHanger,
    "t-shirt": Icons.TShirt,
    "shirt-folded": Icons.ShirtFolded,
  },
  "Home": {
    "house": Icons.House,
    "house-simple": Icons.HouseSimple,
    "house-line": Icons.HouseLine,
    "buildings": Icons.Buildings,
    "door": Icons.Door,
    "key": Icons.Key,
    "lock": Icons.Lock,
    "couch": Icons.Couch,
    "lamp": Icons.Lamp,
    "bathtub": Icons.Bathtub,
    "shower": Icons.Shower,
    "toilet": Icons.Toilet,
    "bed": Icons.Bed,
    "armchair": Icons.Armchair,
    "desk": Icons.Desk,
    "television": Icons.Television,
    "paint-roller": Icons.PaintRoller,
    "paint-brush": Icons.PaintBrush,
    "paint-brush-household": Icons.PaintBrushHousehold,
    "wrench": Icons.Wrench,
    "hammer": Icons.Hammer,
    "toolbox": Icons.Toolbox,
    "broom": Icons.Broom,
    "washing-machine": Icons.WashingMachine,
  },
  "Utilities": {
    "lightning": Icons.Lightning,
    "lightbulb": Icons.Lightbulb,
    "drop": Icons.Drop,
    "fire": Icons.Fire,
    "thermometer": Icons.Thermometer,
    "flame": Icons.Flame,
    "plug": Icons.Plug,
    "battery-charging": Icons.BatteryCharging,
    "wifi-high": Icons.WifiHigh,
    "globe": Icons.Globe,
    "phone": Icons.Phone,
    "device-mobile": Icons.DeviceMobile,
    "device-mobile-speaker": Icons.DeviceMobileSpeaker,
    "cell-tower": Icons.CellTower,
  },
  "Health": {
    "first-aid": Icons.FirstAid,
    "first-aid-kit": Icons.FirstAidKit,
    "heart": Icons.Heart,
    "heartbeat": Icons.Heartbeat,
    "stethoscope": Icons.Stethoscope,
    "pill": Icons.Pill,
    "prescription": Icons.Prescription,
    "tooth": Icons.Tooth,
    "eye": Icons.Eye,
    "eye-closed": Icons.EyeClosed,
    "eyeglasses": Icons.Eyeglasses,
    "bandaids": Icons.Bandaids,
    "syringe": Icons.Syringe,
    "barbell": Icons.Barbell,
    "pulse": Icons.Pulse,
    "person-simple-run": Icons.PersonSimpleRun,
    "person-simple": Icons.PersonSimple,
    "person-simple-circle": Icons.PersonSimpleCircle,
    "bicycle": Icons.Bicycle,
    "brain": Icons.Brain,
  },
  "Food & Drink": {
    "fork-knife": Icons.ForkKnife,
    "hamburger": Icons.Hamburger,
    "pizza": Icons.Pizza,
    "cookie": Icons.Cookie,
    "cake": Icons.Cake,
    "ice-cream": Icons.IceCream,
    "coffee": Icons.Coffee,
    "beer-bottle": Icons.BeerBottle,
    "wine": Icons.Wine,
    "martini": Icons.Martini,
    "egg": Icons.Egg,
    "carrot": Icons.Carrot,
    "apple-logo": Icons.AppleLogo,
    "orange-slice": Icons.OrangeSlice,
    "bowl-food": Icons.BowlFood,
    "cooking-pot": Icons.CookingPot,
  },
  "Transport": {
    "car": Icons.Car,
    "car-simple": Icons.CarSimple,
    "car-profile": Icons.CarProfile,
    "car-battery": Icons.CarBattery,
    "taxi": Icons.Taxi,
    "bus": Icons.Bus,
    "train": Icons.Train,
    "airplane": Icons.Airplane,
    "boat": Icons.Boat,
    "bicycle": Icons.Bicycle,
    "motorcycle": Icons.Motorcycle,
    "scooter": Icons.Scooter,
    "gas-pump": Icons.GasPump,
    "engine": Icons.Engine,
    "steering-wheel": Icons.SteeringWheel,
    "traffic-cone": Icons.TrafficCone,
    "truck": Icons.Truck,
    "jeep": Icons.Jeep,
    "road-horizon": Icons.RoadHorizon,
    "sticker": Icons.Sticker,
    "tire": Icons.Tire,
  },
  "Tech & Entertainment": {
    "monitor": Icons.Monitor,
    "monitor-play": Icons.MonitorPlay,
    "laptop": Icons.Laptop,
    "desktop": Icons.Desktop,
    "device-tablet": Icons.DeviceTablet,
    "game-controller": Icons.GameController,
    "headphones": Icons.Headphones,
    "speaker-high": Icons.SpeakerHigh,
    "music-note": Icons.MusicNote,
    "music-notes": Icons.MusicNotes,
    "microphone": Icons.Microphone,
    "camera": Icons.Camera,
    "video-camera": Icons.VideoCamera,
    "film-strip": Icons.FilmStrip,
    "popcorn": Icons.Popcorn,
    "confetti": Icons.Confetti,
    "balloon": Icons.Balloon,
    "party-hat": Icons.CrownSimple,
    "spotify-logo": Icons.SpotifyLogo,
    "apple-logo": Icons.AppleLogo,
    "castle-turret": Icons.CastleTurret,
    "airplay": Icons.Airplay,
    "sketch-logo": Icons.SketchLogo,
  },
  "People & Life": {
    "user": Icons.User,
    "users": Icons.Users,
    "user-circle": Icons.UserCircle,
    "user-circle-check": Icons.UserCircleCheck,
    "user-rectangle": Icons.UserRectangle,
    "baby": Icons.Baby,
    "person": Icons.Person,
    "hand-heart": Icons.HandHeart,
    "hands-clapping": Icons.HandsClapping,
    "heart": Icons.Heart,
    "smiley": Icons.Smiley,
    "gift": Icons.Gift,
    "flower": Icons.Flower,
    "flower-lotus": Icons.FlowerLotus,
    "tent": Icons.Tent,
  },
  "Celebrations": {
    "gift": Icons.Gift,
    "cake": Icons.Cake,
    "balloon": Icons.Balloon,
    "confetti": Icons.Confetti,
    "party-hat": Icons.CrownSimple,
    "champagne": Icons.Champagne,
    "sparkle": Icons.Sparkle,
    "star": Icons.Star,
    "tree": Icons.Tree,
    "tree-evergreen": Icons.TreeEvergreen,
    "cross": Icons.Cross,
    "flower-tulip": Icons.FlowerTulip,
    "snowflake": Icons.Snowflake,
    "sun": Icons.Sun,
    "cookie": Icons.Cookie,
    "candy": Icons.Cookie, // Using Cookie as Phosphor doesn't have candy
    "egg": Icons.Egg,
    "flower": Icons.Flower,
  },
  "Pets": {
    "dog": Icons.Dog,
    "cat": Icons.Cat,
    "bird": Icons.Bird,
    "fish": Icons.Fish,
    "paw-print": Icons.PawPrint,
    "horse": Icons.Horse,
    "bug": Icons.Bug,
    "butterfly": Icons.Butterfly,
  },
  "Education": {
    "graduation-cap": Icons.GraduationCap,
    "book": Icons.Book,
    "book-open": Icons.BookOpen,
    "books": Icons.Books,
    "notebook": Icons.Notebook,
    "pencil": Icons.Pencil,
    "pen": Icons.Pen,
    "highlighter": Icons.Highlighter,
    "backpack": Icons.Backpack,
    "student": Icons.Student,
    "chalkboard-teacher": Icons.ChalkboardTeacher,
    "ruler": Icons.Ruler,
    "calculator": Icons.Calculator,
  },
  "Insurance & Protection": {
    "shield": Icons.Shield,
    "shield-check": Icons.ShieldCheck,
    "shield-star": Icons.ShieldStar,
    "umbrella": Icons.Umbrella,
    "lifebuoy": Icons.Lifebuoy,
    "lock": Icons.Lock,
    "first-aid": Icons.FirstAid,
    "warning": Icons.Warning,
  },
  "Nature": {
    "tree": Icons.Tree,
    "tree-evergreen": Icons.TreeEvergreen,
    "plant": Icons.Plant,
    "potted-plant": Icons.PottedPlant,
    "flower": Icons.Flower,
    "flower-tulip": Icons.FlowerTulip,
    "leaf": Icons.Leaf,
    "park": Icons.Park,
    "sun": Icons.Sun,
    "moon": Icons.Moon,
    "cloud": Icons.Cloud,
    "cloud-rain": Icons.CloudRain,
    "cloud-snow": Icons.CloudSnow,
    "snowflake": Icons.Snowflake,
    "rainbow": Icons.Rainbow,
    "mountains": Icons.Mountains,
    "wave": Icons.Waves,
  },
  "Interface": {
    "star": Icons.Star,
    "flag": Icons.Flag,
    "bell": Icons.Bell,
    "calendar": Icons.Calendar,
    "clock": Icons.Clock,
    "alarm": Icons.Alarm,
    "timer": Icons.Timer,
    "hourglass": Icons.Hourglass,
    "gear": Icons.Gear,
    "sliders": Icons.Sliders,
    "funnel": Icons.Funnel,
    "magnifying-glass": Icons.MagnifyingGlass,
    "check": Icons.Check,
    "x": Icons.X,
    "plus": Icons.Plus,
    "minus": Icons.Minus,
    "info": Icons.Info,
    "question": Icons.Question,
    "warning": Icons.Warning,
    "map-pin": Icons.MapPin,
    "letter-circle-p": Icons.LetterCircleP,
    "envelope": Icons.Envelope,
    "paper-plane": Icons.PaperPlaneTilt,
    "archive": Icons.Archive,
    "folder": Icons.Folder,
    "file": Icons.File,
    "clipboard": Icons.Clipboard,
    "note": Icons.Note,
    "article": Icons.Article,
    "newspaper": Icons.Newspaper,
  },
};

/**
 * Flat map of icon key to Phosphor component name for quick lookup
 * Keys are lowercase, normalized versions of envelope/icon names
 */
const ICON_KEY_MAP: Record<string, string> = {
  // === THE MY BUDGET WAY (Core Envelopes) ===
  "credit-card-holding": "CreditCard",
  "starter-stash": "Plant",
  "debt-destroyer": "ChartLineDown",
  "safety-net": "PottedPlant",
  "future-fund": "Tree",
  "investing": "ChartLineUp",
  "my-budget-mate": "EnvelopeSimple",
  "surplus": "TipJar",
  "spending-money": "Money",
  "spending": "Money",
  "giving": "HandHeart",

  // === HOUSEHOLD ===
  "rent": "House",
  "rent-board": "House",
  "mortgage": "HouseLine",
  "mortgage-1": "HouseLine",
  "mortgage-2": "HouseLine",
  "rates": "Park",
  "power": "Lightning",
  "electricity": "Lightbulb",
  "gas": "Flame",
  "firewood": "Fire",
  "water": "Drop",
  "internet": "WifiHigh",
  "phone": "Phone",
  "cellphone": "DeviceMobileSpeaker",
  "mobile": "DeviceMobile",
  "groceries": "ShoppingCart",
  "food": "ForkKnife",
  "cleaning": "Broom",
  "household": "House",
  "home-maintenance": "PaintBrushHousehold",
  "garden-lawn": "Leaf",
  "technology-electronics": "Laptop",
  "parking": "LetterCircleP",
  "drycleaning": "WashingMachine",

  // === TRANSPORT ===
  "car": "Car",
  "petrol": "GasPump",
  "fuel": "GasPump",
  "rego": "RoadHorizon",
  "registration": "RoadHorizon",
  "wof": "Sticker",
  "car-insurance": "CarProfile",
  "public-transport": "Bus",
  "bus": "Bus",
  "train": "Train",
  "transport": "Bus",
  "vehicle-maintenance": "CarBattery",
  "car-replacement-fund": "Jeep",

  // === INSURANCE ===
  "insurance": "ShieldCheck",
  "health-insurance": "Pulse",
  "life-insurance": "Heartbeat",
  "life-mortgage-protection": "UserCircleCheck",
  "contents-insurance": "SketchLogo",
  "house-insurance": "HouseSimple",
  "pet-insurance": "ShieldStar",

  // === HEALTH & WELLBEING ===
  "health": "FirstAid",
  "medical": "Stethoscope",
  "doctor": "Stethoscope",
  "medication": "Pill",
  "dentist": "Tooth",
  "prescriptions": "Prescription",
  "medicine": "Pill",
  "gym": "Barbell",
  "gym-membership": "Barbell",
  "fitness": "PersonSimpleRun",
  "self-care": "FlowerLotus",
  "glasses-optometrist": "Eyeglasses",
  "physio-massage": "PersonSimpleCircle",

  // === SUBSCRIPTIONS ===
  "subscriptions": "Television",
  "streaming": "Television",
  "netflix": "MonitorPlay",
  "spotify": "SpotifyLogo",
  "music": "MusicNote",
  "software": "Desktop",
  "apple-storage": "AppleLogo",
  "sky-tv": "Television",
  "disney": "CastleTurret",
  "neon": "MonitorPlay",
  "gaming": "GameController",

  // === LIFESTYLE ===
  "clothing": "CoatHanger",
  "clothes": "CoatHanger",
  "kids-clothing": "TShirt",
  "shopping": "ShoppingBag",
  "entertainment": "FilmStrip",
  "movies": "FilmStrip",
  "dining": "ForkKnife",
  "eating-out": "ForkKnife",
  "takeaways-restaurants": "ForkKnife",
  "restaurants": "ForkKnife",
  "coffee": "Coffee",
  "hobbies": "PaintBrush",
  "sports": "Trophy",
  "sport-dance": "PersonSimpleCircle",

  // === CELEBRATIONS ===
  "gifts": "Gift",
  "gifts-general": "Gift",
  "christmas": "TreeEvergreen",
  "birthdays": "Cake",
  "birthday": "Cake",
  "easter": "Cross",
  "mother-fathers-days": "FlowerTulip",
  "religious-festivals": "Flame",
  "celebrations": "Confetti",
  "party": "Confetti",
  "candy": "Cookie",

  // === SAVINGS & GOALS ===
  "savings": "PiggyBank",
  "holiday": "Airplane",
  "holidays": "Airplane",
  "vacation": "Airplane",
  "travel": "Airplane",
  "education": "GraduationCap",
  "learning": "BookOpen",
  "books-learning": "Books",

  // === PERSONAL ===
  "hair": "Scissors",
  "kids-hair": "Scissors",
  "beauty-treatments": "EyeClosed",
  "makeup": "Sparkle",
  "fun-money": "Wallet",

  // === PETS ===
  "pets": "PawPrint",
  "pet-care": "PawPrint",
  "pet-food": "BowlFood",
  "vet": "Stethoscope",

  // === KIDS ===
  "kids": "Baby",
  "kids-pocket-money": "HandCoins",
  "childcare": "Baby",
  "school": "GraduationCap",
  "school-fees": "Backpack",
  "school-uniform": "ShirtFolded",
  "school-stationery": "Pencil",
  "school-activities": "Tent",
  "school-photos": "UserRectangle",
  "school-donations": "HandDeposit",
  "activities": "Trophy",

  // === DEBT ===
  "debt": "CreditCard",
  "credit-card": "CreditCard",
  "credit-card-fees": "CreditCard",
  "loan": "Bank",

  // === BANK & FINANCE ===
  "bank": "Bank",
  "fees": "Receipt",
  "tax": "Receipt",
  "acc": "Receipt",
  "work-bonus": "Briefcase",
  "ird-refunds": "Swap",
  "reimbursements": "Receipt",

  // === GIVING ===
  "donations": "HandHeart",

  // === CATEGORIES ===
  "my-budget-way": "Envelope",
  "bills-utilities": "Lightning",
  "lifestyle": "ShoppingBag",
  "personal": "UserRectangle",
  "kids-family": "Users",
  "pets-animals": "PawPrint",
  "bank-fees": "PiggyBank",
  "debt-repayment": "CreditCard",

  // === DEFAULT ===
  "default": "Wallet",
  "envelope": "Envelope",
  "envelope-simple": "EnvelopeSimple",
  "wallet": "Wallet",
  "home": "House",
  "house": "House",
  "house-line": "HouseLine",
  "house-simple": "HouseSimple",
  "star": "Star",
  "shield": "Shield",
  "shield-check": "ShieldCheck",
  "shield-star": "ShieldStar",
  "heart": "Heart",
  "gift": "Gift",
  "cake": "Cake",
  "basket": "Basket",
  "dollar": "CurrencyDollar",
  "currency-circle-dollar": "CurrencyCircleDollar",
  "coin": "Coins",
  "piggy-bank": "PiggyBank",
  "first-aid": "FirstAid",
  "pill": "Pill",
  "pills": "Pill",
  "tooth": "Tooth",
  "barbell": "Barbell",
  "bag": "Bag",
  "scissors": "Scissors",
  "dog": "Dog",
  "baby": "Baby",
  "bookmark": "BookmarkSimple",
  "plane": "Airplane",
  "bed": "Bed",
  "tv": "Television",
  "tree": "Tree",
  "tree-evergreen": "TreeEvergreen",
  "flower": "Flower",
  "flower-tulip": "FlowerTulip",
  "sun": "Sun",
  "snowflake": "Snowflake",
  "umbrella": "Umbrella",
  "trophy": "Trophy",
  "target": "Target",
  "calculator": "Calculator",
  "calendar": "Calendar",
  "clock": "Clock",
  "bell": "Bell",
  "setting": "Gear",
  "gear": "Gear",
  "wrench": "Wrench",
  "hammer": "Hammer",
  "paint-brush": "PaintBrush",
  "paint-brush-household": "PaintBrushHousehold",
  "camera": "Camera",
  "mail": "Envelope",
  "pin": "MapPin",
  "globe": "Globe",
  "truck": "Truck",
  "ship": "Boat",
  "rocket": "Rocket",
  "fire": "Fire",
  "flame": "Flame",
  "bulb": "Lightbulb",
  "lightbulb": "Lightbulb",
  "cutlery": "ForkKnife",
  "fork-knife": "ForkKnife",
  "tip-jar": "TipJar",
  "swap": "Swap",
  "hand-deposit": "HandDeposit",
  "hand-coins": "HandCoins",
  "chart-line-down": "ChartLineDown",
  "potted-plant": "PottedPlant",
  "eye-closed": "EyeClosed",
  "coat-hanger": "CoatHanger",
  "t-shirt": "TShirt",
  "washing-machine": "WashingMachine",
  "letter-circle-p": "LetterCircleP",
  "car-profile": "CarProfile",
  "car-battery": "CarBattery",
  "sketch-logo": "SketchLogo",
  "pulse": "Pulse",
  "user-circle-check": "UserCircleCheck",
  "user-rectangle": "UserRectangle",
  "device-mobile-speaker": "DeviceMobileSpeaker",
  "wifi-high": "WifiHigh",
  "shirt-folded": "ShirtFolded",
  "tent": "Tent",
  "monitor-play": "MonitorPlay",
  "spotify-logo": "SpotifyLogo",
  "apple-logo": "AppleLogo",
  "castle-turret": "CastleTurret",
  "road-horizon": "RoadHorizon",
  "sticker": "Sticker",
  "jeep": "Jeep",
  "cell-tower": "CellTower",
  "airplay": "Airplay",
  "tire": "Tire",
  "person-simple": "PersonSimple",
  "person-simple-circle": "PersonSimpleCircle",
  "park": "Park",
  "cross": "Cross",
  "backpack": "Backpack",
  "bandaids": "Bandaids",
  "confetti": "Confetti",
  "briefcase": "Briefcase",
  "receipt": "Receipt",
  "leaf": "Leaf",
  "laptop": "Laptop",
  "book": "Book",
};

/**
 * Get a Phosphor icon component by key
 * Falls back to default Wallet icon if not found
 */
export function getPhosphorIcon(name: string): PhosphorIconComponent {
  const normalizedName = name.toLowerCase().replace(/\s+/g, "-");

  // First check the key map
  const phosphorName = ICON_KEY_MAP[normalizedName];
  if (phosphorName && (Icons as Record<string, unknown>)[phosphorName]) {
    return (Icons as Record<string, unknown>)[phosphorName] as PhosphorIconComponent;
  }

  // Then search ICON_CATEGORIES
  for (const category of Object.values(ICON_CATEGORIES)) {
    if (category[normalizedName]) {
      return category[normalizedName];
    }
  }

  // Fallback to Wallet
  return Icons.Wallet;
}

/**
 * Check if a Phosphor icon exists for the given name
 */
export function hasPhosphorIcon(name: string): boolean {
  const normalizedName = name.toLowerCase().replace(/\s+/g, "-");
  return normalizedName in ICON_KEY_MAP;
}

interface PhosphorIconProps {
  name: string;
  size?: number;
  weight?: IconWeight;
  color?: string;
  className?: string;
}

/**
 * Wrapper component for Phosphor icons with sensible defaults
 */
export function PhosphorIcon({
  name,
  size = 24,
  weight = "regular",
  color = ICON_COLORS.sage,
  className = "",
}: PhosphorIconProps) {
  const IconComponent = getPhosphorIcon(name);
  return (
    <IconComponent
      size={size}
      weight={weight}
      color={color}
      className={className}
    />
  );
}

/**
 * Get all available icon keys (for icon picker)
 */
export function getAvailableIconKeys(): string[] {
  return Object.keys(ICON_KEY_MAP).filter(key => key !== "default");
}

/**
 * Get all icons organized by category (for icon picker UI)
 */
export function getIconCategories(): Record<string, Record<string, PhosphorIconComponent>> {
  return ICON_CATEGORIES;
}

// Re-export for backwards compatibility
export { ICON_COLORS as DOODLE_COLORS };
