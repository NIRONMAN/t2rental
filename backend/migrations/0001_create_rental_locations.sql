DROP TABLE IF EXISTS rental_locations;

CREATE TABLE IF NOT EXISTS rental_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  rent_inr INTEGER NOT NULL CHECK (rent_inr > 0),
  bhk INTEGER NOT NULL CHECK (bhk > 0),
  area_sqft INTEGER,
  furnishing_status TEXT NOT NULL DEFAULT 'unfurnished' CHECK (furnishing_status IN ('unfurnished', 'semi-furnished', 'furnished')),
  available_from TEXT NOT NULL,
  description TEXT,
  contact_name TEXT,
  contact_phone_hash TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS idx_rental_locations_city_locality
ON rental_locations (city, locality);

CREATE INDEX IF NOT EXISTS idx_rental_locations_coordinates
ON rental_locations (latitude, longitude);

INSERT INTO rental_locations (
  title,
  city,
  locality,
  address,
  latitude,
  longitude,
  rent_inr,
  bhk,
  area_sqft,
  furnishing_status,
  available_from,
  description,
  contact_name,
  contact_phone_hash,
  is_verified
) VALUES
  (
    '2BHK near Sitabuldi Market',
    'Nagpur',
    'Sitabuldi',
    'Near Variety Square, Sitabuldi, Nagpur, Maharashtra',
    21.1458,
    79.0882,
    14000,
    2,
    850,
    'semi-furnished',
    '2026-05-01',
    'Walkable to metro station. Regular water supply and decent parking.',
    'A. Verma',
    'f4e43c90b2c8df862f95bb7f2f1b2bb5e2c8f5f1',
    1
  ),
  (
    '1RK for students',
    'Indore',
    'Bhawarkuan',
    'Near Bholaram Ustad Marg, Bhawarkuan, Indore, Madhya Pradesh',
    22.6870,
    75.8637,
    6500,
    1,
    350,
    'unfurnished',
    '2026-05-15',
    'Budget option suitable for students. Shared rooftop access.',
    'M. Khan',
    'bda9e978a972fe6f3baf71fd89fdf4d2a7448a80',
    0
  ),
  (
    '3BHK family apartment with lift',
    'Mysuru',
    'Vijayanagar',
    'Vijayanagar 2nd Stage, Mysuru, Karnataka',
    12.2958,
    76.6304,
    22000,
    3,
    1450,
    'furnished',
    '2026-06-01',
    'Calm residential block, school and grocery stores within 500m.',
    'R. Rao',
    '9f3f8d7ea3c2c6da227ec13c7bdddf633afe9d42',
    1
  );
