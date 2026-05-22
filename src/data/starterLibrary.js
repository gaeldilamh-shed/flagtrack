// FlagTrack — Starter Flag Library
// These are generic default flag times for common Firestone/Bridgestone services.
// Users can override per-vehicle in the app. Numbers based on typical Mitchell labor times.

export const STARTER_FLAG_LIBRARY = [
  // --- OIL CHANGES ---
  { category: 'Oil Change', name: 'Conventional Oil Change', flag_hours: 0.3 },
  { category: 'Oil Change', name: 'Synthetic Blend Oil Change', flag_hours: 0.4 },
  { category: 'Oil Change', name: 'Full Synthetic Oil Change', flag_hours: 0.5 },
  { category: 'Oil Change', name: 'DEXOS Full Synthetic Oil Change', flag_hours: 0.5 },
  { category: 'Oil Change', name: 'High Mileage Oil Change', flag_hours: 0.4 },
  { category: 'Oil Change', name: 'Diesel Oil Change', flag_hours: 0.7 },

  // --- TIRES ---
  { category: 'Tires', name: 'Tire Rotation', flag_hours: 0.3 },
  { category: 'Tires', name: 'Tire Mount & Balance (per tire)', flag_hours: 0.3 },
  { category: 'Tires', name: 'TPMS Reset', flag_hours: 0.2 },
  { category: 'Tires', name: 'TPMS Sensor Replacement (each)', flag_hours: 0.4 },
  { category: 'Tires', name: 'Flat Repair', flag_hours: 0.4 },
  { category: 'Tires', name: 'Wheel Balance (per wheel)', flag_hours: 0.2 },

  // --- ALIGNMENT ---
  { category: 'Alignment', name: 'Alignment Check', flag_hours: 0.6 },
  { category: 'Alignment', name: 'Standard Alignment', flag_hours: 1.2 },
  { category: 'Alignment', name: 'Steering Angle Sensor Recalibration', flag_hours: 0.2 },
  { category: 'Alignment', name: 'Alignment Recheck (Warranty)', flag_hours: 0.8 },

  // --- BRAKES ---
  { category: 'Brakes', name: 'Front Brake Pads', flag_hours: 1.0 },
  { category: 'Brakes', name: 'Rear Brake Pads', flag_hours: 1.0 },
  { category: 'Brakes', name: 'Front Pads + Rotors', flag_hours: 1.5 },
  { category: 'Brakes', name: 'Rear Pads + Rotors', flag_hours: 1.5 },
  { category: 'Brakes', name: 'Brake Inspection', flag_hours: 0.3 },
  { category: 'Brakes', name: 'Brake Fluid Flush', flag_hours: 0.8 },
  { category: 'Brakes', name: 'Caliper Replacement (each)', flag_hours: 0.8 },

  // --- BATTERY ---
  { category: 'Battery', name: 'Battery Test', flag_hours: 0.2 },
  { category: 'Battery', name: 'Battery Install', flag_hours: 0.4 },
  { category: 'Battery', name: 'Battery Terminal Service', flag_hours: 0.3 },

  // --- FILTERS ---
  { category: 'Filters', name: 'Engine Air Filter', flag_hours: 0.2 },
  { category: 'Filters', name: 'Cabin Air Filter', flag_hours: 0.3 },
  { category: 'Filters', name: 'Fuel Filter Replacement', flag_hours: 0.6 },

  // --- FLUIDS ---
  { category: 'Fluids', name: 'Coolant Flush', flag_hours: 0.8 },
  { category: 'Fluids', name: 'Transmission Fluid Service', flag_hours: 0.9 },
  { category: 'Fluids', name: 'Power Steering Flush', flag_hours: 0.6 },
  { category: 'Fluids', name: 'Differential Fluid Service', flag_hours: 0.5 },
  { category: 'Fluids', name: 'Transfer Case Service', flag_hours: 0.5 },

  // --- WIPERS & BULBS ---
  { category: 'Visibility', name: 'Front Wiper Blades', flag_hours: 0.1 },
  { category: 'Visibility', name: 'Rear Wiper Blade', flag_hours: 0.1 },
  { category: 'Visibility', name: 'Headlight Bulb Replacement (each)', flag_hours: 0.3 },
  { category: 'Visibility', name: 'Tail/Brake Bulb Replacement (each)', flag_hours: 0.2 },
  { category: 'Visibility', name: 'Headlight Restoration', flag_hours: 0.6 },

  // --- BELTS & HOSES ---
  { category: 'Belts', name: 'Serpentine Belt Replacement', flag_hours: 0.7 },
  { category: 'Belts', name: 'Timing Belt Replacement', flag_hours: 4.0 },

  // --- INSPECTIONS & DIAGNOSTICS ---
  { category: 'Diagnostic', name: 'Courtesy Check', flag_hours: 0.1 },
  { category: 'Diagnostic', name: 'Basic Diagnostic', flag_hours: 1.0 },
  { category: 'Diagnostic', name: 'Check Engine Light Diagnostic', flag_hours: 1.0 },
  { category: 'Diagnostic', name: 'AC System Diagnostic', flag_hours: 1.0 },
  { category: 'Diagnostic', name: 'Electrical Diagnostic', flag_hours: 1.5 },

  // --- AC / HEATING ---
  { category: 'AC', name: 'AC Recharge (R-134a)', flag_hours: 0.7 },
  { category: 'AC', name: 'AC Recharge (R-1234yf)', flag_hours: 0.9 },

  // --- MISC ---
  { category: 'Misc', name: 'Spark Plug Replacement (4-cyl)', flag_hours: 0.8 },
  { category: 'Misc', name: 'Spark Plug Replacement (6-cyl)', flag_hours: 1.2 },
  { category: 'Misc', name: 'Spark Plug Replacement (8-cyl)', flag_hours: 1.5 },
]

// Keyword -> library service name. Maps short tech terms & ticket phrases
// to the canonical library entry. First matching rule wins.
const SYNONYMS = [
  { keywords: ['tire install', 'tire installation', 'mount', 'new tire'], target: 'Tire Mount & Balance (per tire)' },
  { keywords: ['wheel balance', 'balance labor', 'tire balance'], target: 'Wheel Balance (per wheel)' },
  { keywords: ['tire rotation', 'rotate'], target: 'Tire Rotation' },
  { keywords: ['tpms', 'valve service kit', 'tire pressure sensor'], target: 'TPMS Sensor Replacement (each)' },
  { keywords: ['flat repair', 'patch', 'plug tire'], target: 'Flat Repair' },
  // Alignment: most specific indicators first. "recheck/warranty/lifetime" -> recheck,
  // "free/check" -> check, otherwise standard. Steering angle is its own line.
  { keywords: ['steering angle', 'sas recal', 'angle sensor'], target: 'Steering Angle Sensor Recalibration' },
  { keywords: ['alignment recheck', 'align recheck', 'lifetime align', 'warranty align', '12 month align', 'recheck'], target: 'Alignment Recheck (Warranty)' },
  { keywords: ['free alignment', 'free wheel alignment', 'alignment check', 'align check'], target: 'Alignment Check' },
  { keywords: ['standard alignment', 'wheel alignment', 'four wheel align', '4 wheel align', 'alignment'], target: 'Standard Alignment' },
  { keywords: ['courtesy check', 'multi point', 'multipoint'], target: 'Courtesy Check' },
  { keywords: ['front brake', 'front pad'], target: 'Front Brake Pads' },
  { keywords: ['rear brake', 'rear pad'], target: 'Rear Brake Pads' },
  { keywords: ['brake fluid', 'brake flush'], target: 'Brake Fluid Flush' },
  { keywords: ['brake inspect'], target: 'Brake Inspection' },
  { keywords: ['full synthetic oil', 'synthetic oil', 'dexos'], target: 'Full Synthetic Oil Change' },
  { keywords: ['synthetic blend', 'blend oil'], target: 'Synthetic Blend Oil Change' },
  { keywords: ['high mileage oil'], target: 'High Mileage Oil Change' },
  { keywords: ['diesel oil'], target: 'Diesel Oil Change' },
  { keywords: ['oil change', 'lof', 'lube oil', 'oil & filter', 'oil and filter'], target: 'Conventional Oil Change' },
  { keywords: ['cabin air', 'cabin filter'], target: 'Cabin Air Filter' },
  { keywords: ['engine air', 'air filter'], target: 'Engine Air Filter' },
  { keywords: ['fuel filter'], target: 'Fuel Filter Replacement' },
  { keywords: ['battery install', 'battery replace', 'install battery'], target: 'Battery Install' },
  { keywords: ['battery test', 'battery check'], target: 'Battery Test' },
  { keywords: ['coolant', 'antifreeze', 'radiator flush'], target: 'Coolant Flush' },
  { keywords: ['transmission', 'trans fluid', 'atf'], target: 'Transmission Fluid Service' },
  { keywords: ['power steering'], target: 'Power Steering Flush' },
  { keywords: ['differential', 'diff fluid'], target: 'Differential Fluid Service' },
  { keywords: ['transfer case'], target: 'Transfer Case Service' },
  { keywords: ['front wiper', 'wiper blade', 'wipers'], target: 'Front Wiper Blades' },
  { keywords: ['headlight bulb', 'headlamp'], target: 'Headlight Bulb Replacement (each)' },
  { keywords: ['headlight restor'], target: 'Headlight Restoration' },
  { keywords: ['serpentine', 'belt replace'], target: 'Serpentine Belt Replacement' },
  { keywords: ['timing belt'], target: 'Timing Belt Replacement' },
  { keywords: ['check engine', 'cel diag'], target: 'Check Engine Light Diagnostic' },
  { keywords: ['ac diag', 'a/c diag'], target: 'AC System Diagnostic' },
  { keywords: ['electrical diag'], target: 'Electrical Diagnostic' },
  { keywords: ['diagnostic', 'diag'], target: 'Basic Diagnostic' },
  { keywords: ['ac recharge', 'a/c recharge', '1234yf'], target: 'AC Recharge (R-1234yf)' },
  { keywords: ['spark plug'], target: 'Spark Plug Replacement (4-cyl)' },
]

// Fuzzy match a parsed ticket service name to a library entry.
// Tries synonym keywords first (best for short tech names), then fuzzy text match.
export function matchLibraryItem(description, library) {
  if (!description) return null
  const desc = description.toLowerCase().trim()

  // 1) Synonym keyword match (handles short tech names + verbose ticket text)
  for (const syn of SYNONYMS) {
    if (syn.keywords.some(k => desc.includes(k))) {
      const target = library.find(i => i.name === syn.target)
      if (target) return { ...target, confidence: 'high' }
    }
  }

  // 2) Fuzzy text match against library names
  let bestMatch = null
  let bestScore = 0
  for (const item of library) {
    const name = item.name.toLowerCase()
    let score = 0
    if (desc === name) score = 100
    else if (desc.includes(name)) score = 80
    else if (name.includes(desc) && desc.length > 5) score = 70
    else {
      const descWords = new Set(desc.split(/\s+/).filter(w => w.length > 2))
      const nameWords = name.split(/\s+/).filter(w => w.length > 2)
      const overlap = nameWords.filter(w => descWords.has(w)).length
      if (overlap > 0) score = (overlap / nameWords.length) * 60
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = item
    }
  }

  return bestScore >= 40 ? { ...bestMatch, confidence: bestScore >= 80 ? 'high' : bestScore >= 60 ? 'medium' : 'low' } : null
}
