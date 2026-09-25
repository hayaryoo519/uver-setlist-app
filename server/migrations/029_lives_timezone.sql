ALTER TABLE lives
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tokyo';

UPDATE lives
SET timezone = 'Asia/Taipei'
WHERE timezone = 'Asia/Tokyo'
  AND (venue ILIKE '%Taipei%' OR venue ILIKE '%台北%' OR tour_name ILIKE '%Taipei%' OR tour_name ILIKE '%台北%');

UPDATE lives
SET timezone = 'Asia/Seoul'
WHERE timezone = 'Asia/Tokyo'
  AND (venue ILIKE '%韓国%' OR venue ILIKE '%仁川%' OR venue ILIKE '%Korea%' OR tour_name ILIKE '%韓国%' OR tour_name ILIKE '%仁川%');
