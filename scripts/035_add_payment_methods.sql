-- Complete rewrite without ENUM - payment_method is TEXT field
-- Add documentation for payment method mapping between DB and HelloCash API
-- DB values: cash, card, bank_transfer, sumup, paypal, coupon
-- HelloCash API values: Bar, EC-Karte, Kreditkarte, Rechnung, SumUp, PayPal, Gutschein

-- Update documentation comment on orders table
COMMENT ON COLUMN orders.payment_method IS 'Payment method: cash, card, bank_transfer, sumup, paypal, coupon';
COMMENT ON COLUMN checkouts.payment_method IS 'Payment method: cash, card, bank_transfer, sumup, paypal, coupon';

-- Create a mapping function to convert DB payment methods to HelloCash format
CREATE OR REPLACE FUNCTION map_payment_method_to_hellocash(db_payment_method TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE db_payment_method
    WHEN 'cash' THEN 'Bar'
    WHEN 'sumup' THEN 'SumUp'
    WHEN 'card' THEN 'EC-Karte'
    WHEN 'bank_transfer' THEN 'Rechnung'
    WHEN 'paypal' THEN 'PayPal'
    WHEN 'coupon' THEN 'Gutschein'
    ELSE 'Bar' -- Default fallback
  END;
END;
$$;

COMMENT ON FUNCTION map_payment_method_to_hellocash IS 'Maps database payment method values to HelloCash API format';
