-- Function to update Elo ratings
CREATE OR REPLACE FUNCTION update_elo_ratings(
  winner_rating INT,
  loser_rating INT,
  OUT new_winner_rating INT,
  OUT new_loser_rating INT
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  k_factor INT := 32; -- How quickly ratings change
  expected_winner_score FLOAT;
  expected_loser_score FLOAT;
  new_winner_elo FLOAT;
  new_loser_elo FLOAT;
BEGIN
  expected_winner_score := 1.0 / (1.0 + power(10, (loser_rating - winner_rating) / 400.0));
  expected_loser_score := 1.0 / (1.0 + power(10, (winner_rating - loser_rating) / 400.0));

  new_winner_elo := winner_rating + k_factor * (1 - expected_winner_score);
  new_loser_elo := loser_rating + k_factor * (0 - expected_loser_score);

  new_winner_rating := round(new_winner_elo);
  new_loser_rating := round(new_loser_elo);
END;
$$;

