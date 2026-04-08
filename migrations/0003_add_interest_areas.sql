-- Migration for PostgreSQL
ALTER TABLE members
ADD COLUMN interest_areas TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE trainer_profiles
ADD COLUMN interest_areas TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migration for SQLite
-- SQLite does not support arrays natively, so we use JSON
PRAGMA foreign_keys=off;

CREATE TABLE members_new (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    gender TEXT NOT NULL DEFAULT 'male',
    dob TEXT,
    height INTEGER,
    source TEXT NOT NULL,
    interest_areas JSON DEFAULT '[]',
    health_background TEXT,
    plan TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    discount INTEGER DEFAULT 0,
    total_due INTEGER DEFAULT 0,
    amount_paid INTEGER DEFAULT 0,
    payment_method TEXT,
    assigned_staff TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    avatar TEXT,
    avatar_static_url TEXT,
    branch TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO members_new SELECT * FROM members;

DROP TABLE members;

ALTER TABLE members_new RENAME TO members;

CREATE TABLE trainer_profiles_new (
    id TEXT PRIMARY KEY,
    trainer_id TEXT NOT NULL UNIQUE,
    specializations JSON NOT NULL,
    interest_areas JSON DEFAULT '[]',
    weekly_slot_capacity INTEGER NOT NULL DEFAULT 20,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO trainer_profiles_new SELECT * FROM trainer_profiles;

DROP TABLE trainer_profiles;

ALTER TABLE trainer_profiles_new RENAME TO trainer_profiles;

PRAGMA foreign_keys=on;