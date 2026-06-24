const User = require('../models/User');

/**
 * Safely deducts an entry fee from a user's wallet.
 * Exhausts depositBalance first, then falls back to winningsBalance.
 * 
 * @param {string} userId - The ID of the user.
 * @param {number} amount - The amount to deduct.
 * @returns {Promise<boolean>} True if successful, false if insufficient balance.
 */
exports.deductEntryFee = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user || user.walletBalance < amount) {
    return false;
  }

  let amountToDeduct = amount;
  let newDepositBalance = user.depositBalance;
  let newWinningsBalance = user.winningsBalance;

  // Since older accounts might have walletBalance > deposit + winnings, 
  // ensure we don't drop below 0 improperly. But we trust deposit/winnings balances.
  if (newDepositBalance >= amountToDeduct) {
    newDepositBalance -= amountToDeduct;
  } else {
    const remainder = amountToDeduct - newDepositBalance;
    newDepositBalance = 0;
    newWinningsBalance -= remainder;
  }

  // Fallback for negative winnings if legacy wallet logic wasn't fully synced
  if (newWinningsBalance < 0) {
    newWinningsBalance = 0;
  }

  user.depositBalance = newDepositBalance;
  user.winningsBalance = newWinningsBalance;
  user.walletBalance -= amount;

  // Safely ensure walletBalance matches the sum (to correct legacy users)
  if (user.walletBalance < user.depositBalance + user.winningsBalance) {
    user.depositBalance = 0;
    user.winningsBalance = user.walletBalance;
  } else if (user.walletBalance > user.depositBalance + user.winningsBalance) {
     // Legacy account has unstructured balance, map remainder to deposit
     const unmapped = user.walletBalance - (user.depositBalance + user.winningsBalance);
     user.depositBalance += unmapped;
  }

  await user.save();
  return true;
};
