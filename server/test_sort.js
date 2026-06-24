const scores = [
  { userId: 'player1', gems: 1, survivalTime: 5000, firstClickTime: 1000 },
  { userId: 'player2', gems: 7, survivalTime: 25000, firstClickTime: 2000 }
];

scores.sort((a, b) => {
  if (b.survivalTime !== a.survivalTime) return b.survivalTime - a.survivalTime;
  if (b.gems !== a.gems) return b.gems - a.gems;
  return a.firstClickTime - b.firstClickTime;
});

console.log("Rank 1:", scores[0]);
console.log("Rank 2:", scores[1]);
