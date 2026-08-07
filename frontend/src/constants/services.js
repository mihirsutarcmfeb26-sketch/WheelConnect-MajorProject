// Predefined catalog of common automobile services, grouped by category.
// Used by:
//  - Service Centre registration (ServiceCenterApplicationModal)
//  - Service Centre "Edit Service Center" (ServiceCenterDashboard)
//  - Customer booking checkboxes (CustomerDashboard) - shown from whichever of these
//    services the selected center actually offers.
//
// Kept as a single reusable list so the "available services" concept is defined in
// exactly one place instead of being duplicated across screens.

export const PREDEFINED_SERVICE_CATEGORIES = [
  {
    category: 'Maintenance',
    services: ['General Service', 'Periodic Service', 'Oil Change', 'Coolant Replacement', 'Battery Replacement'],
  },
  {
    category: 'Repairs',
    services: [
      'Engine Repair',
      'Brake Repair',
      'Clutch Repair',
      'Suspension Repair',
      'Steering Repair',
      'Electrical Repair',
      'Transmission Service',
    ],
  },
  {
    category: 'Tyres & Wheels',
    services: ['Wheel Alignment', 'Wheel Balancing', 'Tyre Replacement'],
  },
  {
    category: 'Cleaning',
    services: ['Car Wash', 'Interior Cleaning', 'Dent & Paint'],
  },
  {
    category: 'Others',
    services: ['AC Service', 'Insurance Claim Assistance', 'Emergency Breakdown Support'],
  },
];

// Flat list of every predefined service name, handy for quickly checking whether a
// given service name is "predefined" (e.g. as opposed to a center's custom entry).
export const ALL_PREDEFINED_SERVICES = PREDEFINED_SERVICE_CATEGORIES.flatMap((c) => c.services);
