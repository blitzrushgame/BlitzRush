-- Remove the unique constraint on ip_address
-- Multiple users can share the same IP (NAT/router)
-- Users should be able to log in from any IP address

DROP INDEX IF EXISTS users_ip_address_idx;
