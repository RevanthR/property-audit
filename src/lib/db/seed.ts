import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ─── Properties ──────────────────────────────────────────────────────────────

const PROPERTIES = [
  // Hostels
  { name: "Tulip @nest", type: "hostel" as const, location: "Kokapet" },
  { name: "Blossoms 1 @nest", type: "hostel" as const, location: "Raidurgam" },
  { name: "Blossoms 2 @nest", type: "hostel" as const, location: "Raidurgam" },
  { name: "Orchids @nest", type: "hostel" as const, location: "Raidurgam" },
  { name: "Olive @nest", type: "hostel" as const, location: "Madhapur" },
  { name: "Olive 2 @nest", type: "hostel" as const, location: "Madhapur" },
  { name: "Iris @nest", type: "hostel" as const, location: "Madhapur" },
  { name: "NHFM", type: "hostel" as const, location: "Madhapur" },
  { name: "NHFW", type: "hostel" as const, location: "Madhapur" },
  // Hotels
  { name: "Iris Hotel @nest", type: "hotel" as const, location: "Madhapur" },
  { name: "Marigold @nest", type: "hotel" as const, location: "Gachibowli" },
  { name: "Marigold 2 @nest", type: "hotel" as const, location: "Kokapet" },
  { name: "Voila @nest", type: "hotel" as const, location: "Kokapet" },
  { name: "Orchid Suites @nest", type: "hotel" as const, location: "Kokapet" },
  {
    name: "Viola Suites @nest",
    type: "hotel" as const,
    location: "Madhapur",
  },
];

// ─── Hostel Room Checklist ────────────────────────────────────────────────────

const HOSTEL_ROOM_ITEMS = [
  "Door",
  "Door handle",
  "Door Lock (in & out)",
  "Clothes Hanger",
  "Walls and floor",
  "Windows",
  "Switchboard",
  "Lights",
  "Fans",
  "AC",
  "Beds",
  "Mattresses",
  "Bedsheets",
  "Pillows",
  "Mirror",
  "Bedside table",
  "Study table",
  "Study chair",
  "Cupboards",
  "Cupboard locks",
  "Washroom door",
  "Washroom Door handle",
  "Washroom Switchboard",
  "Washroom lock (in & out)",
  "Washroom lights",
  "Washroom Clothes Hanger",
  "Taps",
  "Faucet",
  "Geyser",
  "Exhaust fans",
  "Commode",
  "Washbasin",
  "Soap stands",
  "Corner stands",
];

// ─── Hotel Room Checklist ─────────────────────────────────────────────────────

const HOTEL_ROOM_ITEMS: { category: string; items: string[] }[] = [
  {
    category: "Room Entrance & Safety",
    items: [
      "Main Door",
      "Door Frame",
      "Door Handle",
      "Door Lock & Key Card System",
      "Dead Bolt / Latch",
      "Door Closer",
      "Peephole",
      "Safety Instructions Display",
      "Fire Evacuation Plan",
      "Smoke Detector",
      "Sprinkler Head",
      "Emergency Light",
    ],
  },
  {
    category: "General Room Condition",
    items: [
      "Walls",
      "Ceiling",
      "Flooring / Tiles",
      "Carpet (if applicable)",
      "Windows",
      "Curtains / Blinds",
      "Curtain Tracks",
      "Room Odour",
      "Overall Cleanliness",
    ],
  },
  {
    category: "Electricals",
    items: [
      "Main Power Supply",
      "Switchboards",
      "Power Sockets",
      "Bedside Switches",
      "Reading Lights",
      "Ceiling Lights",
      "Night Lamp",
      "Television",
      "TV Remote",
      "Wi-Fi Connectivity",
      "Telephone / Intercom",
    ],
  },
  {
    category: "HVAC",
    items: [
      "Air Conditioner",
      "AC Remote",
      "AC Cooling Performance",
      "Ventilation",
      "Exhaust System",
    ],
  },
  {
    category: "Furniture",
    items: [
      "Bed Frame",
      "Mattress",
      "Mattress Protector",
      "Bed Sheets",
      "Pillows",
      "Pillow Covers",
      "Blanket / Duvet",
      "Bed Runner",
      "Bedside Table",
      "Writing Desk",
      "Desk Chair",
      "Lounge Chair",
      "Wardrobe",
      "Wardrobe Locks",
      "Luggage Rack",
      "Mirror",
    ],
  },
  {
    category: "Guest Amenities",
    items: [
      "Hangers",
      "Laundry Bag",
      "Stationery Kit",
      "Drinking Water Bottles",
      "Tea/Coffee Maker",
      "Tea/Coffee Sachets",
      "Minibar / Refrigerator",
      "Minibar Inventory",
      "Safe Locker",
      "Safe Locker Functionality",
    ],
  },
  {
    category: "Washroom / Bathroom",
    items: [
      "Bathroom Door",
      "Door Handle",
      "Lock (In & Out)",
      "Bathroom Lighting",
      "Exhaust Fan",
      "Wash Basin",
      "Basin Faucet",
      "Shower Mixer",
      "Shower Head",
      "Hot Water Availability",
      "Geyser / Water Heater",
      "Toilet Seat / Commode",
      "Flush System",
      "Toilet Roll Holder",
      "Soap Dish / Dispenser",
      "Towel Rack",
      "Clothes Hanger",
      "Bathroom Mirror",
      "Drainage",
      "Water Leakage",
    ],
  },
  {
    category: "Bathroom Amenities",
    items: [
      "Hand Towel",
      "Bath Towel",
      "Floor Mat",
      "Soap",
      "Shampoo",
      "Conditioner",
      "Body Wash",
      "Dental Kit",
      "Shaving Kit",
      "Comb",
      "Tissue Box",
    ],
  },
  {
    category: "Housekeeping Standards",
    items: [
      "Dust-Free Surfaces",
      "Linen Quality",
      "Stains on Linen",
      "Furniture Condition",
      "Pest Control Signs",
      "Overall Room Presentation",
    ],
  },
];

// ─── Kitchen Checklist ────────────────────────────────────────────────────────

const KITCHEN_ITEMS: { category: string; items: string[] }[] = [
  {
    category: "Kitchen Infrastructure & Maintenance",
    items: [
      "Kitchen flooring clean and damage-free",
      "Walls and ceiling free from cracks, seepage, mold",
      "Adequate lighting available",
      "Proper ventilation/exhaust system functioning",
      "No water leakage from pipes or fixtures",
      "Drainage system functioning properly",
      "Doors and windows in good condition",
      "Pest control measures in place",
      "Fire exits accessible and unobstructed",
      "Electrical wiring safe and properly enclosed",
    ],
  },
  {
    category: "Cooking Equipment Condition",
    items: [
      "Gas Range / Cooking Burners",
      "LPG Pipeline / Cylinders",
      "Ovens",
      "Steamers",
      "Rice Cookers",
      "Griddles / Tawas",
      "Deep Fryers",
      "Exhaust Hood System",
      "Exhaust Filters Clean",
      "Food Warmers / Bain Marie",
      "No gas leakage observed",
      "Burner flames are blue and uniform",
      "Preventive maintenance records available",
      "Equipment cleaned after every shift",
    ],
  },
  {
    category: "Refrigeration & Cold Storage",
    items: [
      "Refrigerator functioning properly",
      "Deep Freezer functioning properly",
      "Temperature monitoring maintained",
      "Door seals/gaskets intact",
      "No excessive ice accumulation",
      "Food properly labeled and dated",
      "Raw and cooked food stored separately",
      "Refrigeration units clean internally",
    ],
  },
  {
    category: "Food Storage Area",
    items: [
      "Dry storage area clean and organized",
      "FIFO (First In First Out) followed",
      "Stock properly labeled",
      "No expired food items found",
      "Storage racks in good condition",
      "Food stored above floor level",
      "Adequate pest prevention measures",
      "Chemical products stored separately from food",
    ],
  },
  {
    category: "Hygiene & Sanitation",
    items: [
      "Kitchen clean during inspection",
      "Hand wash stations operational",
      "Soap and sanitizer available",
      "Staff using hairnets/caps",
      "Staff wearing gloves where required",
      "Aprons/uniforms clean",
      "Waste bins available with lids",
      "Waste segregation followed",
      "Cleaning schedule displayed",
      "Cleaning records maintained",
    ],
  },
  {
    category: "Water & Utility Systems",
    items: [
      "Water supply adequate",
      "Drinking water quality records available",
      "Water purifier functioning properly",
      "Water tanks cleaned periodically",
      "Plumbing fixtures in good condition",
    ],
  },
  {
    category: "Fire & Safety Compliance",
    items: [
      "Fire extinguisher available",
      "Fire extinguisher within validity date",
      "Fire blanket available",
      "Gas leak detector available",
      "Emergency contact numbers displayed",
      "Staff trained in fire safety",
      "First aid kit available and stocked",
      "Emergency exits clearly marked",
    ],
  },
  {
    category: "Kitchen Inventory & Asset Condition",
    items: [
      "Inventory register maintained",
      "Equipment asset list available",
      "Preventive maintenance schedule available",
      "Critical spares available",
      "Equipment downtime records maintained",
      "AMC/Service contracts available",
    ],
  },
  {
    category: "Dining & Service Area",
    items: [
      "Dining area clean",
      "Tables and chairs in good condition",
      "Serving counters clean",
      "Food serving temperature maintained",
      "Drinking water stations clean",
    ],
  },
];

// ─── Hotel Sections ───────────────────────────────────────────────────────────

const HOTEL_SECTIONS = [
  {
    context: "hotel_front_office",
    name: "Front Office Operations",
    subAreas: [
      { key: "reservations", label: "Reservations – Booking Process", type: "remarks" as const },
      { key: "checkin", label: "Check-in – Registration, ID Verification", type: "remarks" as const },
      { key: "checkout", label: "Check-out – Billing Accuracy, Guest Feedback", type: "remarks" as const },
      { key: "cash_pos", label: "Cash & POS Management", type: "remarks" as const },
      { key: "complaints", label: "Guest Complaint Management", type: "remarks" as const },
    ],
  },
  {
    context: "hotel_housekeeping",
    name: "Housekeeping",
    subAreas: [
      { key: "floor_inspection", label: "Floor-wise Inspection – Guest Floors", type: "remarks" as const },
      { key: "public_cleaning", label: "Public Area Cleaning – Lobby, Corridors", type: "checklist" as const },
      { key: "laundry", label: "Laundry Operations – Linen Inventory & Quality", type: "remarks" as const },
      { key: "store_room", label: "Store Room – Inventory & Organization", type: "remarks" as const },
    ],
  },
  {
    context: "hotel_engineering",
    name: "Engineering & Maintenance",
    subAreas: [
      { key: "preventive_maint", label: "Guest Rooms – Preventive Maintenance", type: "remarks" as const },
      { key: "electrical", label: "Electrical Systems – DG, Panels, Lighting", type: "checklist" as const },
      { key: "plumbing", label: "Plumbing Systems – Water Supply, Leakages", type: "checklist" as const },
      { key: "hvac", label: "HVAC Systems – AC Plants, Ventilation", type: "checklist" as const },
      { key: "elevators", label: "Elevators – Functionality & AMC Compliance", type: "checklist" as const },
      { key: "fire_safety", label: "Fire & Safety Systems – Fire Alarms, Sprinklers", type: "checklist" as const },
    ],
  },
  {
    context: "hotel_food_beverage",
    name: "Food & Beverage",
    subAreas: [
      { key: "restaurant", label: "Restaurant – Ambiance & Service", type: "remarks" as const },
      { key: "kitchen", label: "Kitchen – Kitchen Audit Checklist", type: "checklist" as const },
      { key: "buffet", label: "Buffet Area – Food Display & Hygiene", type: "remarks" as const },
      { key: "stores", label: "Stores – Dry Store & Cold Storage", type: "checklist" as const },
      { key: "stewarding", label: "Stewarding – Cleaning & Waste Disposal", type: "remarks" as const },
    ],
  },
  {
    context: "hotel_property_mgmt",
    name: "Property Management",
    subAreas: [
      { key: "main_entrance", label: "Main Entrance – Signage & Cleanliness", type: "remarks" as const },
      { key: "lobby", label: "Lobby & Reception – Ambiance, Seating, Décor", type: "remarks" as const },
      { key: "corridors", label: "Corridors – Cleanliness & Lighting", type: "remarks" as const },
      { key: "elevators", label: "Elevators – Cleanliness & Functionality", type: "remarks" as const },
      { key: "staircases", label: "Staircases – Safety & Cleanliness", type: "remarks" as const },
      { key: "public_washrooms", label: "Public Washrooms – Hygiene & Maintenance", type: "checklist" as const },
      { key: "banquet", label: "Banquet / Meeting Rooms – Condition & Equipment", type: "remarks" as const },
      { key: "business_centre", label: "Business Centre – Equipment & Connectivity", type: "remarks" as const },
      { key: "spa_gym", label: "Spa / Gym – Equipment Condition", type: "checklist" as const },
      { key: "swimming_pool", label: "Swimming Pool – Water Quality & Safety", type: "checklist" as const },
      { key: "parking", label: "Parking Area – Lighting, Security, Cleanliness", type: "remarks" as const },
      { key: "landscaping", label: "Landscaping – Maintenance & Appearance", type: "remarks" as const },
      { key: "exterior", label: "Exterior Building Condition – Paint, Façade, Signage", type: "remarks" as const },
      { key: "ambiance", label: "Overall Hotel Ambiance – Guest Experience Assessment", type: "remarks" as const },
    ],
  },
  {
    context: "hotel_security",
    name: "Security & Safety",
    subAreas: [
      { key: "cctv", label: "CCTV – Coverage & Recording", type: "checklist" as const },
      { key: "access_control", label: "Access Control – Staff & Guest Access", type: "remarks" as const },
      { key: "fire_safety", label: "Fire Safety – Extinguishers, Hydrants, Alarms", type: "checklist" as const },
      { key: "emergency", label: "Emergency Preparedness – SOP Display & Drills", type: "remarks" as const },
    ],
  },
  {
    context: "hotel_finance",
    name: "Finance & Compliance",
    subAreas: [
      { key: "billing", label: "Billing – Invoice Accuracy", type: "remarks" as const },
      { key: "licenses", label: "Statutory Licenses – FSSAI, Fire NOC, Trade License", type: "checklist" as const },
      { key: "vendor_contracts", label: "Vendor Contracts – Validity & Compliance", type: "remarks" as const },
    ],
  },
  {
    context: "hotel_hr",
    name: "Human Resources",
    subAreas: [
      { key: "grooming", label: "Staff Grooming – Uniform & Hygiene", type: "checklist" as const },
      { key: "attendance", label: "Attendance & Rosters – Compliance", type: "remarks" as const },
      { key: "training", label: "Training Records – Service & Safety Training", type: "remarks" as const },
    ],
  },
  {
    context: "hotel_guest_experience",
    name: "Guest Experience",
    subAreas: [
      { key: "online_reviews", label: "Online Reviews – Review Scores", type: "remarks" as const },
      { key: "guest_feedback", label: "Guest Feedback – Complaint Trends", type: "remarks" as const },
      { key: "brand_standards", label: "Brand Standards – SOP Compliance", type: "remarks" as const },
    ],
  },
];

// ─── Main Seed Function ───────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database...");

  // Admin user
  await db.insert(schema.users).values({
    name: "Admin",
    pin: "1234",
    role: "admin",
  }).onConflictDoNothing();

  // Properties
  console.log("  → Properties...");
  await db.insert(schema.properties).values(PROPERTIES).onConflictDoNothing();

  // ── Hostel Room Checklist Template
  console.log("  → Hostel room checklist template...");
  const [hostelRoomTemplate] = await db
    .insert(schema.checklistTemplates)
    .values({
      propertyType: "hostel",
      context: "room_hostel",
      name: "Hostel Room Checklist",
      moduleType: "checklist",
      orderIndex: 0,
    })
    .returning();

  for (let i = 0; i < HOSTEL_ROOM_ITEMS.length; i++) {
    await db.insert(schema.checklistItems).values({
      templateId: hostelRoomTemplate.id,
      itemLabel: HOSTEL_ROOM_ITEMS[i],
      moduleType: "checklist",
      orderIndex: i,
    });
  }

  // ── Hotel Room Checklist Template
  console.log("  → Hotel room checklist template...");
  let hotelRoomOrder = 0;
  for (const category of HOTEL_ROOM_ITEMS) {
    const [tmpl] = await db
      .insert(schema.checklistTemplates)
      .values({
        propertyType: "hotel",
        context: "room_hotel",
        name: category.category,
        moduleType: "checklist",
        orderIndex: hotelRoomOrder++,
      })
      .returning();

    for (let i = 0; i < category.items.length; i++) {
      await db.insert(schema.checklistItems).values({
        templateId: tmpl.id,
        itemLabel: category.items[i],
        moduleType: "checklist",
        orderIndex: i,
      });
    }
  }

  // ── Kitchen Checklist Template (shared hostel + hotel)
  console.log("  → Kitchen checklist template...");
  let kitchenOrder = 0;
  for (const category of KITCHEN_ITEMS) {
    const [tmpl] = await db
      .insert(schema.checklistTemplates)
      .values({
        propertyType: "both",
        context: "kitchen",
        name: category.category,
        moduleType: "checklist",
        orderIndex: kitchenOrder++,
      })
      .returning();

    for (let i = 0; i < category.items.length; i++) {
      await db.insert(schema.checklistItems).values({
        templateId: tmpl.id,
        itemLabel: category.items[i],
        moduleType: "checklist",
        orderIndex: i,
      });
    }
  }

  // ── Hotel Section Templates (for checklist sub-areas)
  console.log("  → Hotel section templates...");
  for (const section of HOTEL_SECTIONS) {
    for (let i = 0; i < section.subAreas.length; i++) {
      const sub = section.subAreas[i];
      if (sub.type === "checklist") {
        await db.insert(schema.checklistTemplates).values({
          propertyType: "hotel",
          context: section.context + "_" + sub.key,
          name: sub.label,
          moduleType: "checklist",
          orderIndex: i,
        });
      }
    }
  }

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
