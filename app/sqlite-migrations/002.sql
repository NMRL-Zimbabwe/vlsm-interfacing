
ALTER TABLE orders ADD COLUMN mysql_inserted INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN instrument_id INTEGER;
