import { storage } from './server/storage';

async function checkUsers() {
  try {
    console.log('Checking for existing users...');
    const users = await storage.getAllUsers();
    console.log('Users found:', users.length);
    
    if (users.length === 0) {
      console.log('No users found. Creating demo users...');
      
      // Create admin user
      const admin = await storage.createUser({
        username: 'admin',
        email: 'admin@gymgenie.com',
        password: 'admin123',
        role: 'admin',
        isActive: true,
        permissions: ['all']
      });
      
      // Create manager user
      const manager = await storage.createUser({
        username: 'manager',
        email: 'manager@gymgenie.com',
        password: 'manager123',
        role: 'manager',
        isActive: true,
        permissions: ['read', 'write']
      });
      
      console.log('Demo users created successfully!');
      console.log('Admin:', admin.username, admin.email);
      console.log('Manager:', manager.username, manager.email);
    } else {
      console.log('Existing users:');
      users.forEach(user => {
        console.log(`- ${user.username} (${user.role}) - ${user.email}`);
      });
    }
    
    // Test login with demo credentials
    console.log('\nTesting login with demo credentials...');
    const adminLogin = await storage.validatePassword('admin', 'admin123');
    if (adminLogin) {
      console.log('✅ Admin login successful!');
    } else {
      console.log('❌ Admin login failed');
    }
    
    const managerLogin = await storage.validatePassword('manager', 'manager123');
    if (managerLogin) {
      console.log('✅ Manager login successful!');
    } else {
      console.log('❌ Manager login failed');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUsers();