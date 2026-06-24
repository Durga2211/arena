require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const users = await User.find({});
  for (const user of users) {
    // If winningsBalance is 0 but they have totalEarnings, seed it
    if (user.winningsBalance === 0 && user.totalEarnings > 0) {
      // Set winningsBalance to totalEarnings
      let newWinnings = user.totalEarnings;
      
      // If totalEarnings is somehow more than their wallet balance, cap it
      if (newWinnings > user.walletBalance) {
        newWinnings = user.walletBalance;
      }
      
      const newDeposit = user.walletBalance - newWinnings;
      
      user.winningsBalance = newWinnings;
      user.depositBalance = newDeposit;
      
      await user.save();
      console.log(`Migrated user ${user.username}: Winnings=${newWinnings}, Deposit=${newDeposit}`);
    }
  }

  console.log('Done');
  process.exit(0);
}

migrate();
