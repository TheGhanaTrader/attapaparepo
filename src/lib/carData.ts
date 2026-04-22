export interface CarModel {
  name: string;
  years: string[];
}

export interface CarMake {
  name: string;
  models: CarModel[];
}

const yearRange = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => String(start + i)).reverse();

export const CAR_MAKES: CarMake[] = [
  {
    name: 'Toyota',
    models: [
      { name: 'Corolla', years: yearRange(2000, 2024) },
      { name: 'Camry', years: yearRange(2000, 2024) },
      { name: 'Hilux', years: yearRange(2000, 2024) },
      { name: 'Land Cruiser', years: yearRange(1990, 2024) },
      { name: 'Prado', years: yearRange(1996, 2024) },
      { name: 'RAV4', years: yearRange(2000, 2024) },
      { name: 'Yaris', years: yearRange(2005, 2024) },
      { name: 'Vitz', years: yearRange(2000, 2020) },
      { name: 'Aqua', years: yearRange(2012, 2024) },
      { name: 'Fortuner', years: yearRange(2005, 2024) },
      { name: 'Avensis', years: yearRange(2000, 2018) },
      { name: 'Wish', years: yearRange(2003, 2017) },
      { name: 'Allion', years: yearRange(2001, 2021) },
      { name: 'Premio', years: yearRange(2001, 2021) },
      { name: 'Harrier', years: yearRange(1997, 2024) },
      { name: 'Highlander', years: yearRange(2001, 2024) },
      { name: 'Sienna', years: yearRange(1998, 2024) },
      { name: 'Alphard', years: yearRange(2002, 2024) },
      { name: 'Vellfire', years: yearRange(2008, 2024) },
      { name: '4Runner', years: yearRange(2000, 2024) },
      { name: 'Tacoma', years: yearRange(2000, 2024) },
      { name: 'Tundra', years: yearRange(2000, 2024) },
      { name: 'Sequoia', years: yearRange(2001, 2024) },
      { name: 'Rush', years: yearRange(2006, 2024) },
      { name: 'Hiace', years: yearRange(1995, 2024) },
    ],
  },
  {
    name: 'Honda',
    models: [
      { name: 'Accord', years: yearRange(2000, 2024) },
      { name: 'Civic', years: yearRange(2000, 2024) },
      { name: 'CR-V', years: yearRange(2000, 2024) },
      { name: 'HR-V', years: yearRange(2015, 2024) },
      { name: 'Fit', years: yearRange(2001, 2024) },
      { name: 'City', years: yearRange(2000, 2024) },
      { name: 'Pilot', years: yearRange(2003, 2024) },
      { name: 'Passport', years: yearRange(2019, 2024) },
      { name: 'Odyssey', years: yearRange(2000, 2024) },
      { name: 'Ridgeline', years: yearRange(2005, 2024) },
      { name: 'Vezel', years: yearRange(2013, 2024) },
      { name: 'Freed', years: yearRange(2008, 2024) },
      { name: 'Stream', years: yearRange(2001, 2014) },
      { name: 'Stepwgn', years: yearRange(2001, 2024) },
    ],
  },
  {
    name: 'Nissan',
    models: [
      { name: 'Altima', years: yearRange(2000, 2024) },
      { name: 'Sentra', years: yearRange(2000, 2024) },
      { name: 'X-Trail', years: yearRange(2001, 2024) },
      { name: 'Pathfinder', years: yearRange(2000, 2024) },
      { name: 'Patrol', years: yearRange(1995, 2024) },
      { name: 'Micra', years: yearRange(2002, 2024) },
      { name: 'Note', years: yearRange(2005, 2024) },
      { name: 'Tiida', years: yearRange(2004, 2018) },
      { name: 'Murano', years: yearRange(2003, 2024) },
      { name: 'Frontier', years: yearRange(2000, 2024) },
      { name: 'Armada', years: yearRange(2004, 2024) },
      { name: 'Maxima', years: yearRange(2000, 2023) },
      { name: 'Juke', years: yearRange(2010, 2024) },
      { name: 'Qashqai', years: yearRange(2006, 2024) },
    ],
  },
  {
    name: 'Mercedes-Benz',
    models: [
      { name: 'C-Class', years: yearRange(2000, 2024) },
      { name: 'E-Class', years: yearRange(2000, 2024) },
      { name: 'S-Class', years: yearRange(2000, 2024) },
      { name: 'GLA', years: yearRange(2014, 2024) },
      { name: 'GLC', years: yearRange(2015, 2024) },
      { name: 'GLE', years: yearRange(2015, 2024) },
      { name: 'GLS', years: yearRange(2016, 2024) },
      { name: 'A-Class', years: yearRange(2004, 2024) },
      { name: 'B-Class', years: yearRange(2005, 2024) },
      { name: 'CLA', years: yearRange(2013, 2024) },
      { name: 'ML-Class', years: yearRange(1998, 2015) },
      { name: 'GL-Class', years: yearRange(2007, 2016) },
    ],
  },
  {
    name: 'BMW',
    models: [
      { name: '3 Series', years: yearRange(2000, 2024) },
      { name: '5 Series', years: yearRange(2000, 2024) },
      { name: '7 Series', years: yearRange(2001, 2024) },
      { name: 'X1', years: yearRange(2009, 2024) },
      { name: 'X3', years: yearRange(2003, 2024) },
      { name: 'X5', years: yearRange(2000, 2024) },
      { name: 'X6', years: yearRange(2008, 2024) },
      { name: '1 Series', years: yearRange(2004, 2024) },
      { name: '2 Series', years: yearRange(2014, 2024) },
      { name: 'X7', years: yearRange(2019, 2024) },
    ],
  },
  {
    name: 'Hyundai',
    models: [
      { name: 'Elantra', years: yearRange(2000, 2024) },
      { name: 'Sonata', years: yearRange(2000, 2024) },
      { name: 'Tucson', years: yearRange(2004, 2024) },
      { name: 'Santa Fe', years: yearRange(2001, 2024) },
      { name: 'Accent', years: yearRange(2000, 2024) },
      { name: 'i10', years: yearRange(2007, 2024) },
      { name: 'i20', years: yearRange(2008, 2024) },
      { name: 'i30', years: yearRange(2007, 2024) },
      { name: 'Creta', years: yearRange(2015, 2024) },
      { name: 'Kona', years: yearRange(2017, 2024) },
    ],
  },
  {
    name: 'Kia',
    models: [
      { name: 'Sportage', years: yearRange(2000, 2024) },
      { name: 'Sorento', years: yearRange(2002, 2024) },
      { name: 'Picanto', years: yearRange(2004, 2024) },
      { name: 'Rio', years: yearRange(2000, 2024) },
      { name: 'Cerato', years: yearRange(2004, 2024) },
      { name: 'Optima', years: yearRange(2001, 2020) },
      { name: 'Stinger', years: yearRange(2017, 2024) },
      { name: 'Telluride', years: yearRange(2020, 2024) },
      { name: 'Carnival', years: yearRange(2000, 2024) },
    ],
  },
  {
    name: 'Ford',
    models: [
      { name: 'F-150', years: yearRange(2000, 2024) },
      { name: 'Explorer', years: yearRange(2000, 2024) },
      { name: 'Ranger', years: yearRange(2000, 2024) },
      { name: 'Focus', years: yearRange(2000, 2018) },
      { name: 'Fusion', years: yearRange(2006, 2020) },
      { name: 'Edge', years: yearRange(2007, 2024) },
      { name: 'Expedition', years: yearRange(2000, 2024) },
      { name: 'Escape', years: yearRange(2001, 2024) },
      { name: 'Everest', years: yearRange(2015, 2024) },
    ],
  },
  {
    name: 'Chevrolet',
    models: [
      { name: 'Silverado', years: yearRange(2000, 2024) },
      { name: 'Tahoe', years: yearRange(2000, 2024) },
      { name: 'Suburban', years: yearRange(2000, 2024) },
      { name: 'Malibu', years: yearRange(2000, 2024) },
      { name: 'Equinox', years: yearRange(2005, 2024) },
      { name: 'Traverse', years: yearRange(2009, 2024) },
      { name: 'Cruze', years: yearRange(2008, 2019) },
      { name: 'Trailblazer', years: yearRange(2002, 2024) },
    ],
  },
  {
    name: 'Mazda',
    models: [
      { name: 'CX-5', years: yearRange(2012, 2024) },
      { name: 'Mazda3', years: yearRange(2003, 2024) },
      { name: 'Mazda6', years: yearRange(2002, 2024) },
      { name: 'CX-3', years: yearRange(2015, 2024) },
      { name: 'CX-9', years: yearRange(2007, 2024) },
      { name: 'BT-50', years: yearRange(2006, 2024) },
      { name: 'Demio', years: yearRange(1996, 2019) },
      { name: 'Atenza', years: yearRange(2002, 2020) },
    ],
  },
  {
    name: 'Mitsubishi',
    models: [
      { name: 'Pajero', years: yearRange(2000, 2024) },
      { name: 'Outlander', years: yearRange(2001, 2024) },
      { name: 'Lancer', years: yearRange(2000, 2017) },
      { name: 'L200', years: yearRange(1996, 2024) },
      { name: 'Eclipse Cross', years: yearRange(2017, 2024) },
      { name: 'ASX', years: yearRange(2010, 2024) },
      { name: 'Galant', years: yearRange(1996, 2012) },
      { name: 'Colt', years: yearRange(2004, 2013) },
    ],
  },
  {
    name: 'Volkswagen',
    models: [
      { name: 'Golf', years: yearRange(2000, 2024) },
      { name: 'Passat', years: yearRange(2000, 2024) },
      { name: 'Tiguan', years: yearRange(2007, 2024) },
      { name: 'Touareg', years: yearRange(2002, 2024) },
      { name: 'Polo', years: yearRange(2000, 2024) },
      { name: 'Jetta', years: yearRange(2000, 2024) },
      { name: 'Touran', years: yearRange(2003, 2024) },
    ],
  },
  {
    name: 'Lexus',
    models: [
      { name: 'RX', years: yearRange(2000, 2024) },
      { name: 'NX', years: yearRange(2014, 2024) },
      { name: 'LX', years: yearRange(1998, 2024) },
      { name: 'GX', years: yearRange(2002, 2024) },
      { name: 'ES', years: yearRange(2000, 2024) },
      { name: 'IS', years: yearRange(2001, 2024) },
      { name: 'LS', years: yearRange(2000, 2024) },
      { name: 'GS', years: yearRange(2000, 2020) },
    ],
  },
  {
    name: 'Land Rover',
    models: [
      { name: 'Range Rover', years: yearRange(2000, 2024) },
      { name: 'Defender', years: yearRange(2000, 2024) },
      { name: 'Discovery', years: yearRange(2000, 2024) },
      { name: 'Freelander', years: yearRange(1998, 2014) },
      { name: 'Range Rover Sport', years: yearRange(2005, 2024) },
      { name: 'Range Rover Evoque', years: yearRange(2011, 2024) },
    ],
  },
  {
    name: 'Subaru',
    models: [
      { name: 'Forester', years: yearRange(2000, 2024) },
      { name: 'Outback', years: yearRange(2000, 2024) },
      { name: 'Impreza', years: yearRange(2000, 2024) },
      { name: 'Legacy', years: yearRange(2000, 2024) },
      { name: 'XV', years: yearRange(2012, 2024) },
    ],
  },
  {
    name: 'Isuzu',
    models: [
      { name: 'D-Max', years: yearRange(2002, 2024) },
      { name: 'MU-X', years: yearRange(2013, 2024) },
      { name: 'Trooper', years: yearRange(1995, 2002) },
      { name: 'Rodeo', years: yearRange(1999, 2004) },
    ],
  },
  {
    name: 'Suzuki',
    models: [
      { name: 'Swift', years: yearRange(2004, 2024) },
      { name: 'Vitara', years: yearRange(2015, 2024) },
      { name: 'Jimny', years: yearRange(1998, 2024) },
      { name: 'Grand Vitara', years: yearRange(2005, 2020) },
      { name: 'Baleno', years: yearRange(2015, 2024) },
    ],
  },
  {
    name: 'Peugeot',
    models: [
      { name: '206', years: yearRange(1998, 2012) },
      { name: '207', years: yearRange(2006, 2014) },
      { name: '208', years: yearRange(2012, 2024) },
      { name: '306', years: yearRange(1993, 2002) },
      { name: '307', years: yearRange(2001, 2008) },
      { name: '308', years: yearRange(2007, 2024) },
      { name: '3008', years: yearRange(2009, 2024) },
    ],
  },
  {
    name: 'Volkswagen',
    models: [
      { name: 'Golf', years: yearRange(2000, 2024) },
      { name: 'Passat', years: yearRange(2000, 2024) },
      { name: 'Tiguan', years: yearRange(2007, 2024) },
    ],
  },
];

export const LIGHT_TYPES = ['Headlight', 'Taillight', 'Fog Light', 'Boot Light'] as const;

export const VARIANTS = [
  'Normal/Halogen',
  'LED',
  'Xenon/HID',
  'Sports',
  'DRL',
  'Sequential',
  'LG Type',
  'Custom',
] as const;

export const SIDES = ['Left', 'Right', 'Center', 'Pair', 'Set'] as const;

export const CONDITIONS = ['Foreign Used', 'Brand New'] as const;
