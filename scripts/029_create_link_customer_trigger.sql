-- Trigger: Automatische Verknüpfung von auth.users mit customers Tabelle
-- Wenn ein neuer User erstellt wird, suche nach bestehendem Customer mit gleicher Email
-- und verknüpfe die user_id, oder erstelle einen neuen Customer-Eintrag

-- Funktion die beim Erstellen eines Users ausgeführt wird
CREATE OR REPLACE FUNCTION public.link_customer_to_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  existing_customer_id UUID;
BEGIN
  -- Suche nach bestehendem Customer mit der gleichen E-Mail
  SELECT id INTO existing_customer_id
  FROM public.customers
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_customer_id IS NOT NULL THEN
    -- Customer existiert bereits (z.B. durch Gastbestellung)
    -- Update: Verknüpfe mit user_id und setze account_status
    UPDATE public.customers
    SET 
      user_id = NEW.id,
      account_status = 'has_account',
      updated_at = NOW()
    WHERE id = existing_customer_id;
    
    RAISE LOG 'Linked existing customer % to user %', existing_customer_id, NEW.id;
  ELSE
    -- Kein Customer vorhanden, erstelle einen neuen
    INSERT INTO public.customers (
      user_id,
      email,
      account_status,
      newsletter_subscribed,
      reminder_notifications,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      'has_account',
      false,
      false,
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Created new customer for user %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger erstellen: Feuert nach jedem INSERT in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_customer_to_user();

-- Kommentar für Dokumentation
COMMENT ON FUNCTION public.link_customer_to_user() IS 
'Automatische Verknüpfung von auth.users mit customers. Sucht nach bestehendem Customer mit gleicher Email und verknüpft user_id, oder erstellt neuen Customer-Eintrag.';
