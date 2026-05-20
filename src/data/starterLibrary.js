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
  { category: 'Alignment', name: 'Two-Wheel Alignment', flag_hours: 0.7 },
  { category: 'Alignment', name: 'Four-Wheel Alignment', flag_hours: 1.0 },
  { category: 'Alignment', name: 'Alignment Check', flag_hours: 0.3 },

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
  { category: 'Diagnostic', name: 'Courtesy Check', flag_hours: 0.2 },
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

// Fuzzy match a parsed ticket line description to a library entry
export function matchLibraryItem(description, library) {
  if (!description) return null
  const desc = description.toLowerCase().trim()
  let bestMatch = null
  let bestScore = 0

  for (const item of library) {
    const name = item.name.toLowerCase()
    let score = 0

    // Exact match
    if (desc === name) score = 100
    // Contains full name
    else if (desc.includes(name)) score = 80
    // Name contains desc
    else if (name.includes(desc) && desc.length > 5) score = 70
    // Word overlap
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
