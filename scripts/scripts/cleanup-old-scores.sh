#!/bin/bash
# Keep only latest trust score per product + last 90 days of history
DB_PASS="cccec19776a0a1262067a8fc7058aa18"
PGPASSWORD=$DB_PASS psql -h localhost -U trustchecker -d trustchecker -c "
  DELETE FROM trust_scores WHERE id NOT IN (
    SELECT DISTINCT ON (product_id) id FROM trust_scores 
    ORDER BY product_id, calculated_at DESC
  ) AND calculated_at < NOW() - INTERVAL 90 days;
"
echo "[$(date)] Trust score cleanup complete"
