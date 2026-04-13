-- Create module_control table for superadmin module management
CREATE TABLE IF NOT EXISTS module_control (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name TEXT NOT NULL UNIQUE,
    module_label TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Seed default modules
INSERT INTO module_control (module_name, module_label, description) VALUES
    ('dashboard', 'Dashboard', 'Main dashboard view'),
    ('leads', 'Leads', 'Lead management'),
    ('members', 'Members', 'Member management'),
    ('attendance', 'Attendance', 'Attendance tracking'),
    ('workouts', 'Workouts & Diet', 'Workout and diet management'),
    ('payments', 'Payments', 'Payment management'),
    ('trainers', 'Personal Trainers', 'Trainer management'),
    ('salary', 'Trainer Salary', 'Trainer salary management'),
    ('reports', 'Reports', 'Reports and analytics'),
    ('notifications', 'Notifications', 'Notification management'),
    ('admin', 'Admin Settings', 'Admin settings and configuration'),
    ('options', 'Options', 'System options and preferences')
ON CONFLICT (module_name) DO NOTHING;
