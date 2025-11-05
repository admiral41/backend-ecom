const mongoose = require('mongoose');
const User = require('../models/userModel');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@techstore.com' });
    
    if (!existingAdmin) {
      const admin = await User.create({
        name: 'System Administrator',
        email: 'admin@techstore.com',
        password: 'admin123',
        role: 'admin',
        phone: '+1234567890',
        address: {
          street: '123 Tech Street',
          city: 'Tech City',
          state: 'TS',
          zipCode: '12345',
          country: 'Techland'
        },
        salary: 0,
        workingHours: 8,
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        isActive: true
      });

      console.log('✅ Admin user created successfully');
      console.log('📧 Email: admin@techstore.com');
      console.log('🔑 Password: admin123');
      console.log('👤 Role: Administrator');
      console.log('💡 Please change the password after first login!');
      
      return admin;
    } else {
      console.log('✅ Admin user already exists');
      console.log('📧 Email: admin@techstore.com');
      return existingAdmin;
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('🎉 Admin seeder completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Admin seeder failed:', error);
      process.exit(1);
    });
}

module.exports = createAdminUser;