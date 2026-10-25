ALTER TABLE tenants ADD COLUMN paypal_env TEXT;
-- Everything synced or subscribed so far came from the PayPal sandbox.
UPDATE tenants SET paypal_env = 'https://api-m.sandbox.paypal.com' WHERE paypal_subscription_id IS NOT NULL;
