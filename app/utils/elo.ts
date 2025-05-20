export const BASE_ELO = 1200; // Starting Elo for new names
const K_FACTOR = 32; // How quickly ratings change (higher = faster adjustments)

const calculateExpectedScore = (ratingA: number, ratingB: number): number => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

export const updateEloRatings = (
  winner: number,
  loser: number,
): [number, number] => {
  const expectedWinnerScore = calculateExpectedScore(winner, loser);
  const expectedLoserScore = calculateExpectedScore(loser, winner);

  const newWinnerElo = winner + K_FACTOR * (1 - expectedWinnerScore);
  const newLoserElo = loser + K_FACTOR * (0 - expectedLoserScore);

  return [Math.round(newWinnerElo), Math.round(newLoserElo)];
};
