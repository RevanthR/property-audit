// Static configuration for audit workflows — mirrors the seed data structure.
// These are used to initialise drafts client-side without an extra API call.

export const HOSTEL_COMMON_AREAS = [
  { key: "ground_floor", label: "Ground Floor", type: "remarks" },
  { key: "kitchen", label: "Kitchen", type: "checklist" },
  { key: "corridors", label: "Corridors", type: "remarks" },
  { key: "lift", label: "Lift", type: "remarks" },
  { key: "terrace", label: "Terrace and Equipment", type: "remarks" },
  { key: "clothes_drying", label: "Clothes Drying Area", type: "remarks" },
  { key: "parking", label: "Parking Area", type: "remarks" },
  { key: "dining", label: "Dining Area", type: "remarks" },
  { key: "landscaping", label: "Landscaping", type: "remarks" },
  { key: "surroundings", label: "Surroundings of the Property", type: "remarks" },
  { key: "ambiance", label: "Ambiance of Property", type: "remarks" },
] as const;

export const HOSTEL_MANPOWER = [
  { key: "housekeeping", label: "House Keeping" },
  { key: "kitchen", label: "Kitchen Staff" },
  { key: "manager", label: "Property Manager & Supervisors" },
  { key: "additional", label: "Any Additional Manpower" },
] as const;

export const HOSTEL_EQUIPMENT = [
  { key: "motors", label: "Motors in Tank", type: "status" },
  { key: "vehicles", label: "Vehicles", type: "count" },
  { key: "washing_machines", label: "Washing Machines", type: "count" },
] as const;

export const HOTEL_SECTIONS = {
  frontOffice: [
    { subAreaKey: "reservations", subAreaLabel: "Reservations – Booking Process", moduleType: "remarks" as const },
    { subAreaKey: "checkin", subAreaLabel: "Check-in – Registration, ID Verification", moduleType: "remarks" as const },
    { subAreaKey: "checkout", subAreaLabel: "Check-out – Billing Accuracy, Guest Feedback", moduleType: "remarks" as const },
    { subAreaKey: "cash_pos", subAreaLabel: "Cash & POS Management", moduleType: "remarks" as const },
    { subAreaKey: "complaints", subAreaLabel: "Guest Complaint Management", moduleType: "remarks" as const },
  ],
  housekeeping: [
    { subAreaKey: "floor_inspection", subAreaLabel: "Floor-wise Inspection – Guest Floors", moduleType: "remarks" as const },
    { subAreaKey: "public_cleaning", subAreaLabel: "Public Area Cleaning – Lobby, Corridors", moduleType: "checklist" as const },
    { subAreaKey: "laundry", subAreaLabel: "Laundry Operations – Linen Inventory & Quality", moduleType: "remarks" as const },
    { subAreaKey: "store_room", subAreaLabel: "Store Room – Inventory & Organization", moduleType: "remarks" as const },
  ],
  engineering: [
    { subAreaKey: "preventive_maint", subAreaLabel: "Guest Rooms – Preventive Maintenance", moduleType: "remarks" as const },
    { subAreaKey: "electrical", subAreaLabel: "Electrical Systems – DG, Panels, Lighting", moduleType: "checklist" as const },
    { subAreaKey: "plumbing", subAreaLabel: "Plumbing Systems – Water Supply, Leakages", moduleType: "checklist" as const },
    { subAreaKey: "hvac", subAreaLabel: "HVAC Systems – AC Plants, Ventilation", moduleType: "checklist" as const },
    { subAreaKey: "elevators", subAreaLabel: "Elevators – Functionality & AMC Compliance", moduleType: "checklist" as const },
    { subAreaKey: "fire_safety", subAreaLabel: "Fire & Safety Systems – Fire Alarms, Sprinklers", moduleType: "checklist" as const },
  ],
  foodBeverage: [
    { subAreaKey: "restaurant", subAreaLabel: "Restaurant – Ambiance & Service", moduleType: "remarks" as const },
    { subAreaKey: "kitchen", subAreaLabel: "Kitchen – Kitchen Audit Checklist", moduleType: "checklist" as const },
    { subAreaKey: "buffet", subAreaLabel: "Buffet Area – Food Display & Hygiene", moduleType: "remarks" as const },
    { subAreaKey: "stores", subAreaLabel: "Stores – Dry Store & Cold Storage", moduleType: "checklist" as const },
    { subAreaKey: "stewarding", subAreaLabel: "Stewarding – Cleaning & Waste Disposal", moduleType: "remarks" as const },
  ],
  propertyManagement: [
    { subAreaKey: "main_entrance", subAreaLabel: "Main Entrance – Signage & Cleanliness", moduleType: "remarks" as const },
    { subAreaKey: "lobby", subAreaLabel: "Lobby & Reception – Ambiance, Seating, Décor", moduleType: "remarks" as const },
    { subAreaKey: "corridors", subAreaLabel: "Corridors – Cleanliness & Lighting", moduleType: "remarks" as const },
    { subAreaKey: "elevators", subAreaLabel: "Elevators – Cleanliness & Functionality", moduleType: "remarks" as const },
    { subAreaKey: "staircases", subAreaLabel: "Staircases – Safety & Cleanliness", moduleType: "remarks" as const },
    { subAreaKey: "public_washrooms", subAreaLabel: "Public Washrooms – Hygiene & Maintenance", moduleType: "checklist" as const },
    { subAreaKey: "banquet", subAreaLabel: "Banquet / Meeting Rooms – Condition & Equipment", moduleType: "remarks" as const },
    { subAreaKey: "business_centre", subAreaLabel: "Business Centre – Equipment & Connectivity", moduleType: "remarks" as const },
    { subAreaKey: "spa_gym", subAreaLabel: "Spa / Gym – Equipment Condition", moduleType: "checklist" as const },
    { subAreaKey: "swimming_pool", subAreaLabel: "Swimming Pool – Water Quality & Safety", moduleType: "checklist" as const },
    { subAreaKey: "parking", subAreaLabel: "Parking Area – Lighting, Security, Cleanliness", moduleType: "remarks" as const },
    { subAreaKey: "landscaping", subAreaLabel: "Landscaping – Maintenance & Appearance", moduleType: "remarks" as const },
    { subAreaKey: "exterior", subAreaLabel: "Exterior Building Condition – Paint, Façade, Signage", moduleType: "remarks" as const },
    { subAreaKey: "ambiance", subAreaLabel: "Overall Hotel Ambiance – Guest Experience Assessment", moduleType: "remarks" as const },
  ],
  security: [
    { subAreaKey: "cctv", subAreaLabel: "CCTV – Coverage & Recording", moduleType: "checklist" as const },
    { subAreaKey: "access_control", subAreaLabel: "Access Control – Staff & Guest Access", moduleType: "remarks" as const },
    { subAreaKey: "fire_safety", subAreaLabel: "Fire Safety – Extinguishers, Hydrants, Alarms", moduleType: "checklist" as const },
    { subAreaKey: "emergency", subAreaLabel: "Emergency Preparedness – SOP Display & Drills", moduleType: "remarks" as const },
  ],
  finance: [
    { subAreaKey: "billing", subAreaLabel: "Billing – Invoice Accuracy", moduleType: "remarks" as const },
    { subAreaKey: "licenses", subAreaLabel: "Statutory Licenses – FSSAI, Fire NOC, Trade License", moduleType: "checklist" as const },
    { subAreaKey: "vendor_contracts", subAreaLabel: "Vendor Contracts – Validity & Compliance", moduleType: "remarks" as const },
  ],
  humanResources: [
    { subAreaKey: "grooming", subAreaLabel: "Staff Grooming – Uniform & Hygiene", moduleType: "checklist" as const },
    { subAreaKey: "attendance", subAreaLabel: "Attendance & Rosters – Compliance", moduleType: "remarks" as const },
    { subAreaKey: "training", subAreaLabel: "Training Records – Service & Safety Training", moduleType: "remarks" as const },
  ],
  guestExperience: [
    { subAreaKey: "online_reviews", subAreaLabel: "Online Reviews – Review Scores", moduleType: "remarks" as const },
    { subAreaKey: "guest_feedback", subAreaLabel: "Guest Feedback – Complaint Trends", moduleType: "remarks" as const },
    { subAreaKey: "brand_standards", subAreaLabel: "Brand Standards – SOP Compliance", moduleType: "remarks" as const },
  ],
};

// Hostel workflow steps in order
export const HOSTEL_STEPS = [
  { key: "process", label: "Process", href: "process" },
  { key: "rooms", label: "Rooms", href: "maintenance/rooms" },
  { key: "property", label: "Common Areas", href: "maintenance/property" },
  { key: "manpower", label: "Manpower", href: "manpower" },
  { key: "equipment", label: "Equipment", href: "equipment" },
  { key: "assets", label: "Assets", href: "assets" },
  { key: "review", label: "Review", href: "review" },
];

// Hotel workflow steps
export const HOTEL_STEPS = [
  { key: "front_office", label: "Front Office", href: "hotel/front-office" },
  { key: "guest_rooms", label: "Rooms", href: "maintenance/rooms" },
  { key: "housekeeping", label: "Housekeeping", href: "hotel/housekeeping" },
  { key: "engineering", label: "Engineering", href: "hotel/engineering" },
  { key: "food_beverage", label: "F&B", href: "hotel/food-beverage" },
  { key: "property_mgmt", label: "Property", href: "hotel/property-management" },
  { key: "security", label: "Security", href: "hotel/security" },
  { key: "finance", label: "Finance", href: "hotel/finance" },
  { key: "hr", label: "HR", href: "hotel/hr" },
  { key: "guest_exp", label: "Experience", href: "hotel/guest-experience" },
  { key: "assets", label: "Assets", href: "assets" },
  { key: "review", label: "Review", href: "review" },
];
