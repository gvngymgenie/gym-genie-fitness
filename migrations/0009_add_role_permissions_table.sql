-- Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL UNIQUE,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert default permissions for each role
INSERT INTO role_permissions (role, permissions) VALUES
('admin', ARRAY['dashboard', 'leads', 'members', 'workouts', 'attendance', 'payments', 'admin', 'reports', 'trainers', 'notifications']),
('manager', ARRAY['dashboard', 'leads', 'members', 'workouts', 'attendance', 'payments', 'reports', 'trainers', 'notifications']),
('trainer', ARRAY['dashboard', 'members', 'workouts', 'attendance']),
('staff', ARRAY['dashboard', 'leads', 'members', 'attendance']),
('member', ARRAY['dashboard'])
ON CONFLICT (role) DO NOTHING;
