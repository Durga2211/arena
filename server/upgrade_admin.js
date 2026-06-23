const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const upgradeUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Connected to MongoDB');
    
    // We will just upgrade the most recently created user for the demo
    const user = await User.findOne().sort({ createdAt: -1 });
    
    if (user) {
      user.isAdmin = true;
      await user.save();
      console.log(`Successfully upgraded user ${user.username} (${user.email}) to Admin!`);
    } else {
      console.log('No users found in the database.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error upgrading user:', error);
    process.exit(1);
  }
};

upgradeUser();
