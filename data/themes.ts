// ─────────────────────────────────────────────────────────────────────────────
// themes.ts  –  Spy Game Location Database
// 8 categories × 17+ unique locations each
// ─────────────────────────────────────────────────────────────────────────────

export type CategoryId =
  | 'anime'
  | 'scifi'
  | 'nature'
  | 'music'
  | 'history'
  | 'local'
  | 'horror'
  | 'movies';

export interface Category {
  id: CategoryId;
  name: string;
  emoji: string;
  gradient: string; // Tailwind gradient classes
  locations: string[];
}

export const CATEGORIES: Category[] = [
  // ── 1. ANIME & FANDOMS ───────────────────────────────────────────────────
  {
    id: 'anime',
    name: 'Anime & Fandoms',
    emoji: '⛩️',
    gradient: 'from-orange-500 to-rose-600',
    locations: [
      'Hidden Leaf Village (Naruto)',
      'Hogwarts Great Hall',
      'Avengers Tower',
      'Soul Society – Seireitei (Bleach)',
      'Wall Maria – Scout HQ (AoT)',
      'Akatsuki Hideout',
      'Dragon Ball World Tournament Arena',
      'Thousand Sunny Deck (One Piece)',
      'Death Note Task Force Office',
      'Demon Slayer Corps Butterfly Estate',
      'UA High School Campus',
      'Jujutsu High Dormitory',
      'Ghibli Forest Spirit Temple',
      'Tokyo Ghoul – CCG Headquarters',
      'Sword Art Online – Floor 1 Town of Beginnings',
      'Fullmetal Alchemist – Central City Lab',
      'Konoha Hospital Emergency Ward',
      'My Hero Academia Sports Festival Stadium',
    ],
  },

  // ── 2. SCI-FI & HIGH-TECH ────────────────────────────────────────────────
  {
    id: 'scifi',
    name: 'Sci-Fi & High-Tech',
    emoji: '🚀',
    gradient: 'from-cyan-400 to-blue-600',
    locations: [
      'Moon Base Alpha',
      'Government Server Room',
      'International Space Station',
      'Quantum Computing Research Lab',
      'Mars Colony Habitat Dome',
      'Illegal Time Machine Lab',
      'AGI Training Facility',
      'VR Immersion Testing Chamber',
      'Deep Space Radio Observatory',
      'Cyberpunk Megacity Neon Market',
      'Asteroid Mining Platform',
      'Military Starship Bridge',
      'Android Assembly Plant',
      'Neural Interface Testing Lab',
      'Underground Doomsday Command Bunker',
      'Orbital Weapons Platform Control Room',
      'Bio-Hazard Containment Research Station',
      'Dark Web Operations Warehouse',
    ],
  },

  // ── 3. NATURE & ANIMALS ──────────────────────────────────────────────────
  {
    id: 'nature',
    name: 'Nature & Animals',
    emoji: '🌿',
    gradient: 'from-green-400 to-emerald-600',
    locations: [
      'Deep Sea Hydrothermal Vent',
      'Amazon Jungle Canopy Research Station',
      'African Savanna Watering Hole',
      'Arctic Research Base',
      'Tropical Coral Reef',
      'Active Volcanic Island',
      'Giant Cave System',
      'Mangrove Forest',
      'Mountain Glacier Camp',
      'Sahara Desert Oasis',
      'Ancient Redwood Forest',
      'Underground River Cave',
      'Pacific Kelp Forest',
      'Wetlands Bird Sanctuary',
      'Himalayan Mountain Base Camp',
      'Ocean Trench Submarine',
      'Great Barrier Reef Dive Site',
      'Permafrost Mammoth Excavation Site',
    ],
  },

  // ── 4. MUSIC & ARTS ──────────────────────────────────────────────────────
  {
    id: 'music',
    name: 'Music & Arts',
    emoji: '🎵',
    gradient: 'from-purple-500 to-fuchsia-600',
    locations: [
      'Rock Concert Backstage',
      'Contemporary Art Gallery Opening',
      'Vinyl Recording Studio',
      'Underground Jazz Club',
      'Grand Opera House',
      'Outdoor Street Music Festival',
      'Ballet Theater Rehearsal Hall',
      'Illegal Graffiti Tunnel',
      'Philharmonic Concert Hall',
      'Film Score Scoring Stage',
      'High-Fashion Photography Studio',
      'Hip-Hop Dance Cipher',
      'Comic-Con Exhibition Floor',
      'Music Video Set',
      'Rare Vinyl Record Shop',
      'Fashion Week Runway Backstage',
      'Tattoo Convention Booth',
      'NFT Art Auction House',
    ],
  },

  // ── 5. HISTORY ───────────────────────────────────────────────────────────
  {
    id: 'history',
    name: 'History',
    emoji: '⚔️',
    gradient: 'from-amber-500 to-yellow-600',
    locations: [
      'Ancient Egyptian Pyramid Interior',
      'Pirate Ship Deck',
      'Medieval Castle Dungeon',
      'Roman Colosseum Arena Floor',
      'Viking Longship',
      'Mayan Pyramid Summit',
      'Byzantine Imperial Palace',
      'Wild West Saloon',
      'Renaissance Alchemist Workshop',
      'Samurai Dojo',
      'Ottoman Grand Bazaar',
      'Aztec Sacrificial Temple',
      'Ancient Greek Agora',
      'American Civil War Battlefield Camp',
      'WWI Trench System',
      'Silk Road Caravan Rest Stop',
      "Mongol Khan's Yurt Camp",
      'Napoleonic Battle Command Tent',
    ],
  },

  // ── 6. LOCAL / CENTRAL ASIAN ─────────────────────────────────────────────
  {
    id: 'local',
    name: 'Central Asian / Local',
    emoji: '🏔️',
    gradient: 'from-sky-400 to-indigo-600',
    locations: [
      'Central Asian Bazaar',
      'University Lecture Hall',
      'Traditional Wedding Banquet',
      'Bishkek – Ala-Too Square',
      'Osh Bazaar Spice Section',
      'Mountain Yurt (Boz Üy)',
      'Soviet-Era Apartment Courtyard',
      'Chaikhana (Tea House)',
      'Nauruz Festival Grounds',
      'Kumis Tasting Ceremony',
      'Village Toi (Community Feast)',
      'Mountain Shepherd Summer Camp',
      'Manas Epic Oral Performance Hall',
      'Bishkek Night Bazaar',
      'Alai Mountains High-Altitude Camp',
      'Issyk-Kul Lakeside Sanatorium',
      'Traditional Kyrgyz Banya',
      'Ala-Archa National Park Gorge Trail',
    ],
  },

  // ── 7. HORROR & THRILLER ─────────────────────────────────────────────────
  {
    id: 'horror',
    name: 'Horror & Thriller',
    emoji: '👻',
    gradient: 'from-red-800 to-rose-500',
    locations: [
      'Abandoned Mental Hospital',
      'Haunted Victorian Mansion',
      'Graveyard at Midnight',
      'Cursed Forest Clearing',
      'Locked Escape Room',
      'Illegal Underground Laboratory',
      'Post-Apocalypse Survivor Bunker',
      'Derelict Psychiatric Asylum',
      'Broken-Down Carnival at Night',
      "Vampire's Gothic Castle",
      "Serial Killer's Trophy Room",
      'Witches Coven Ritual Site',
      'Zombie Outbreak Quarantine Zone',
      'Ghost Ship Below the Waterline',
      'Possessed Child Bedroom',
      'Cult Leader Compound',
      'Demon Summoning Basement',
      'Slaughterhouse Cold Storage',
    ],
  },

  // ── 8. MOVIES & TV ───────────────────────────────────────────────────────
  {
    id: 'movies',
    name: 'Movies & TV',
    emoji: '🎬',
    gradient: 'from-violet-500 to-purple-700',
    locations: [
      'The Shire – Hobbit Hole (LOTR)',
      "King's Landing Throne Room (GoT)",
      'Hogwarts Express Compartment',
      'Gotham City Police Precinct',
      'Wakanda Vibranium Mines',
      'Death Star Detention Block',
      'Jurassic Park Visitor Center',
      'The Matrix Construct Loading Program',
      "White Witch's Castle (Narnia)",
      'Pandora – Hometree (Avatar)',
      "Breaking Bad RV Cook Site",
      'The Upside Down (Stranger Things)',
      'Garrison Pub (Peaky Blinders)',
      'Thunderdome Arena (Mad Max)',
      'Squid Game VIP Observation Lounge',
      'Interstellar Tesseract',
      'Waystar Royco Boardroom (Succession)',
      'The Continental Hotel (John Wick)',
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export const getCategoryById = (id: CategoryId): Category | undefined =>
  CATEGORIES.find((c) => c.id === id);

export const getAllLocations = (categoryIds: CategoryId[]): string[] =>
  CATEGORIES.filter((c) => categoryIds.includes(c.id)).flatMap(
    (c) => c.locations
  );

export const DEFAULT_CATEGORY_IDS: CategoryId[] = [
  'anime',
  'scifi',
  'nature',
  'music',
  'history',
  'local',
  'horror',
  'movies',
];
