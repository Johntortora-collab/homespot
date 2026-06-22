// ── Mascot Engine ─────────────────────────────────────────────────────────────
// Maps a business category to a consistent, auto-generated mascot archetype.
// No database table needed — character state is purely derived from
// spot.category + stamp_cards.stamps at render time.

export const TOTAL_LAYERS = 8; // matches the 8-step unlock arc

// Archetype = body shape + palette + themed accessory set + name pool
const ARCHETYPES = {
  Bakery: {
    bodyShape: "bread",
    bodyColor: "#E8C078",
    accentColor: "#C99A4E",
    names: ["Crusty", "Doughy", "Yeasty", "Crumb"],
    accessories: ["flour dust", "baker hat", "rolling pin", "name tag", "tiny whisk", "oven mitt", "golden ribbon"],
  },
  Coffee: {
    bodyShape: "bean",
    bodyColor: "#6F4E37",
    accentColor: "#8B6F52",
    names: ["Bean", "Roast", "Brewster", "Mocha"],
    accessories: ["steam wisp", "barista apron", "coffee cup", "name tag", "tiny spoon", "latte art", "gold medal"],
  },
  Restaurant: {
    bodyShape: "burger",
    bodyColor: "#D4956B",
    accentColor: "#E8B074",
    names: ["Manny", "Sizzle", "Saucy", "Grillz"],
    accessories: ["chef hat", "apron", "spatula", "name tag", "tiny fries", "golden tongs", "crown"],
  },
  Salon: {
    bodyShape: "scissors",
    bodyColor: "#9B6B9B",
    accentColor: "#C99FC9",
    names: ["Snip", "Shear", "Curl", "Sleek"],
    accessories: ["bow tie", "cape", "comb", "name tag", "tiny mirror", "hair clip", "sparkle crown"],
  },
  Barbershop: {
    bodyShape: "scissors",
    bodyColor: "#3D5A80",
    accentColor: "#5C7FA3",
    names: ["Clip", "Fade", "Razor", "Buzz"],
    accessories: ["bow tie", "barber cape", "comb", "name tag", "tiny razor", "pole stripe", "gold trophy"],
  },
  Bookshop: {
    bodyShape: "bread", // book-ish rounded rectangle reuses bread silhouette nicely
    bodyColor: "#7A5C3E",
    accentColor: "#A0825C",
    names: ["Page", "Binding", "Inkwell", "Chapter"],
    accessories: ["reading glasses", "bookmark cape", "quill", "name tag", "tiny lamp", "tea cup", "golden bookmark"],
  },
  Florist: {
    bodyShape: "bean",
    bodyColor: "#7BA05B",
    accentColor: "#9CC97C",
    names: ["Petal", "Bloom", "Sprout", "Daisy"],
    accessories: ["leaf crown", "garden apron", "watering can", "name tag", "tiny shears", "ribbon", "golden bloom"],
  },
  Gym: {
    bodyShape: "burger", // round, sturdy silhouette
    bodyColor: "#E05555",
    accentColor: "#F08080",
    names: ["Flex", "Surge", "Iron", "Sweat"],
    accessories: ["headband", "tank top", "dumbbell", "name tag", "tiny towel", "wristbands", "gold belt"],
  },
  Boutique: {
    bodyShape: "bean",
    bodyColor: "#E8956D",
    accentColor: "#F0B090",
    names: ["Style", "Chic", "Thread", "Vogue"],
    accessories: ["sunglasses", "scarf", "handbag", "name tag", "tiny necklace", "bracelet", "golden brooch"],
  },
  Auto: {
    bodyShape: "scissors", // angular silhouette suits tools
    bodyColor: "#5B7BA0",
    accentColor: "#7FA0C0",
    names: ["Torque", "Piston", "Gearz", "Chrome"],
    accessories: ["cap", "coveralls", "wrench", "name tag", "tiny tire", "goggles", "gold trophy"],
  },
  "Pet care": {
    bodyShape: "bean",
    bodyColor: "#C99A4E",
    accentColor: "#E0B870",
    names: ["Whiskers", "Paws", "Buddy", "Waggy"],
    accessories: ["bandana", "vest", "leash", "name tag", "tiny bone", "bowtie collar", "golden paw badge"],
  },
  Other: {
    bodyShape: "bean",
    bodyColor: "#F5A623",
    accentColor: "#F8C168",
    names: ["Spark", "Buddy", "Pal", "Charm"],
    accessories: ["ribbon", "vest", "tool", "name tag", "tiny star", "badge pin", "golden crown"],
  },
};

// Deterministic pick from a list using a seed string (so the same spot
// always gets the same name — no randomness on every render)
function seededPick(list, seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return list[hash % list.length];
}

/**
 * Get the full mascot config for a spot.
 * @param {string} category - the spot's business category
 * @param {string} spotId - unique spot id, used to seed a consistent name
 * @param {string} [customName] - optional owner-set override name
 */
export function getMascot(category, spotId = "", customName = null) {
  const archetype = ARCHETYPES[category] || ARCHETYPES.Other;
  const name = customName || seededPick(archetype.names, spotId || category);
  return { ...archetype, name, category };
}

export function getUnlockLabel(stamps) {
  const labels = [
    "",
    "meet your buddy!",
    "got an outfit!",
    "earned an accessory!",
    "is smiling now!",
    "found a new detail!",
    "earned a badge!",
    "got a name tag!",
    "is fully evolved! 🎉",
  ];
  return labels[Math.min(stamps, TOTAL_LAYERS)] || "";
}

export function getAccessoryList(category) {
  return (ARCHETYPES[category] || ARCHETYPES.Other).accessories;
}
