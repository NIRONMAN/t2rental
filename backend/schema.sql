DROP TABLE IF EXISTS location_reviews;
DROP TABLE IF EXISTS location_verifications;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;
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

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT,
  display_name TEXT,
  anonymous_alias TEXT NOT NULL,
  picture_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);

CREATE TABLE IF NOT EXISTS location_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES rental_locations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(location_id, user_id)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_location_verifications_location_id
ON location_verifications (location_id);

CREATE TABLE IF NOT EXISTS location_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('recommend', 'avoid')),
  comment TEXT NOT NULL,
  tenant_experience TEXT,
  is_anonymous INTEGER NOT NULL DEFAULT 1 CHECK (is_anonymous IN (0, 1)),
  proof_of_work_method TEXT NOT NULL DEFAULT 'ad-farming' CHECK (proof_of_work_method IN ('ad-farming')),
  proof_of_work_status TEXT NOT NULL DEFAULT 'verified' CHECK (proof_of_work_status IN ('verified')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES rental_locations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(location_id, user_id)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_location_reviews_location_id
ON location_reviews (location_id);

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
