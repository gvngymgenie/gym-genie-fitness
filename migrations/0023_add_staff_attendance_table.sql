-- Staff Attendance Table
-- Tracks attendance for trainers and staff members separately from member attendance
-- Supports salary calculation based on attendance records

CREATE TABLE IF NOT EXISTS staff_attendance (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  person_type TEXT NOT NULL,
  person_id VARCHAR NOT NULL,
  person_name TEXT NOT NULL,
  date TEXT NOT NULL,
  check_in_time TEXT NOT NULL,
  check_out_time TEXT,
  method TEXT NOT NULL DEFAULT 'Manual',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(date);

-- Index for person-based queries (salary calculation)
CREATE INDEX IF NOT EXISTS idx_staff_attendance_person ON staff_attendance(person_id);

-- Composite index for date + person type filtering
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date_type ON staff_attendance(date, person_type);
