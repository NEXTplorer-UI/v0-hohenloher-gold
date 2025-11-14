-- Seed Products with improved structure
-- This script inserts all 50 products with correct weights and category references

-- Clear existing data
DELETE FROM products;

-- Reset sequence
ALTER SEQUENCE products_id_seq RESTART WITH 1;

-- Get category IDs for reference
DO $$
DECLARE
  cat_suedfruechtе_id BIGINT;
  cat_trockenfruechtе_id BIGINT;
  cat_oel_id BIGINT;
  cat_suesse_id BIGINT;
  cat_geschenk_id BIGINT;
BEGIN
  -- Get category IDs
  SELECT id INTO cat_suedfruechtе_id FROM categories WHERE name = 'Südfrüchte';
  SELECT id INTO cat_trockenfruechtе_id FROM categories WHERE name = 'Trockenfrüchte';
  SELECT id INTO cat_oel_id FROM categories WHERE name = 'Olivenöl';
  SELECT id INTO cat_suesse_id FROM categories WHERE name = 'Süße Spezialitäten';
  SELECT id INTO cat_geschenk_id FROM categories WHERE name = 'Geschenkkisten';

  -- Insert Frische Südfrüchte (7 products)
  INSERT INTO products (id, name, category_id, price, description, image_url, unit, origin, weight_kg, is_active) VALUES
  (1, 'Orangen', cat_suedfruechtе_id, 30.00, 'Saftige, unbehandelte Orangen direkt aus Sizilien. Voller Vitamin C und natürlicher Süße.', '/sicilian-oranges-fresh-organic.png', 'Kiste (ca. 7,5 kg)', 'Sizilien', 7.5, true),
  (2, 'Saftorangen (kleinere Früchte)', cat_suedfruechtе_id, 20.00, 'Kleinere, aber sehr saftige Orangen. Perfekt für frischen Orangensaft.', '/sicilian-oranges-fresh-organic.png', 'Kiste (ca. 7,5 kg)', 'Sizilien', 7.5, true),
  (3, 'Mandarinen', cat_suedfruechtе_id, 30.00, 'Süße, kernlose Mandarinen. Ideal als gesunder Snack für die ganze Familie.', '/sicilian-mandarins-sweet-organic.png', 'Kiste (ca. 7,5 kg)', 'Sizilien', 7.5, true),
  (4, 'Zitronen', cat_suedfruechtе_id, 30.00, 'Aromatische Zitronen mit intensivem Duft. Perfekt für Küche und natürliche Heilmittel.', '/sicilian-lemons-organic-fresh.png', 'Kiste (ca. 7,5 kg)', 'Sizilien', 7.5, true),
  (5, 'Grapefruit', cat_suedfruechtе_id, 30.00, 'Erfrischende Grapefruits mit herb-süßem Geschmack. Reich an Vitaminen.', '/fresh-grapefruit-sicilian-organic.png', 'Kiste (ca. 7,5 kg)', 'Sizilien', 7.5, true),
  (22, 'Blutorangen', cat_suedfruechtе_id, 36.00, 'Aromatische Blutorangen mit charakteristischer roter Färbung. Besonders süß und saftig.', '/sicilian-oranges-fresh-organic.png', 'Kiste (ca. 7,5 kg)', 'Sizilien', 7.5, true),
  (23, 'Cedri', cat_suedfruechtе_id, 6.50, 'Seltene Zitrusfrucht mit intensivem Aroma. Traditionell in der mediterranen Küche verwendet.', '/sicilian-lemons-organic-fresh.png', '1,0 kg', 'Sizilien', 1.0, true);

  -- Insert Olivenöl (3 products) - 1:1 Umrechnung Liter zu kg wegen Verpackung
  INSERT INTO products (id, name, category_id, price, description, image_url, unit, origin, weight_kg, is_active) VALUES
  (16, 'Olivenöl Extra Vergine', cat_oel_id, 18.00, 'Hochwertiges Olivenöl aus erster Kaltpressung. Direkt von sizilianischen Produzenten.', '/olive-oil-extra-virgin-sicilian-bottle.png', '1 Liter', 'Sizilien', 1.0, true),
  (17, 'Olivenöl Extra Vergine', cat_oel_id, 54.00, 'Hochwertiges Olivenöl aus erster Kaltpressung. Direkt von sizilianischen Produzenten.', '/olive-oil-extra-virgin-sicilian-large-bottle.png', '3 Liter', 'Sizilien', 3.0, true),
  (18, 'Olivenöl Extra Vergine', cat_oel_id, 90.00, 'Hochwertiges Olivenöl aus erster Kaltpressung. Direkt von sizilianischen Produzenten.', '/olive-oil-extra-virgin-sicilian-canister.png', '5 Liter', 'Sizilien', 5.0, true);

  -- Insert Geschenkkisten (3 products)
  INSERT INTO products (id, name, category_id, price, description, image_url, unit, origin, weight_kg, is_active) VALUES
  (19, 'Probierpaket - Gemischte Kiste', cat_geschenk_id, 25.00, 'Von allem ebbes - perfekt zum Kennenlernen unserer Produktvielfalt. Nur für Neukunden und auf eine Kiste pro Person begrenzt.', '/mixed-gift-box-trial-package.png', 'Kiste (ca. 5 kg)', 'Gemischt', 5.0, true),
  (20, '50€ Geschenkkiste', cat_geschenk_id, 50.00, 'Unsere kompakte Genusskiste für Feinschmecker mit einer vielfältigen Auswahl an hochwertigen Produkten.', '/gift-box-50-euro-premium.png', 'Kiste (ca. 5 kg)', 'Gemischt', 5.0, true),
  (21, '75€ Premium-Geschenkkiste', cat_geschenk_id, 75.00, 'Unsere edle Premiumkiste mit einer vielfältigen Auswahl an hochwertigen und ausgewählten Produkten.', '/gift-box-75-euro-premium.png', 'Kiste (ca. 7 kg)', 'Gemischt', 7.0, true);

  -- Insert Trockenfrüchte (28 products)
  INSERT INTO products (id, name, category_id, price, description, image_url, unit, origin, weight_kg, is_active) VALUES
  (24, 'Macadamia', cat_trockenfruechtе_id, 39.00, 'Premium Macadamianüsse, unbehandelt oder in BIO Qualität. Besonders cremig und nussig.', '/cashew-nuts-organic-premium.png', '1 kg', 'Bio', 1.0, true),
  (25, 'Macadamia', cat_trockenfruechtе_id, 21.00, 'Premium Macadamianüsse, unbehandelt oder in BIO Qualität. Besonders cremig und nussig.', '/cashew-nuts-organic-premium.png', '500 g', 'Bio', 0.5, true),
  (26, 'Mango', cat_trockenfruechtе_id, 29.00, 'Getrocknete Mango, unbehandelt oder in BIO Qualität. Süß und aromatisch.', '/mixed-dried-fruits-sonnenzauber.png', '1 kg', 'Bio', 1.0, true),
  (27, 'Mango', cat_trockenfruechtе_id, 15.00, 'Getrocknete Mango, unbehandelt oder in BIO Qualität. Süß und aromatisch.', '/mixed-dried-fruits-sonnenzauber.png', '500 g', 'Bio', 0.5, true),
  (28, 'Ananas', cat_trockenfruechtе_id, 29.00, 'Getrocknete Ananas, unbehandelt oder in BIO Qualität. Tropisch süß.', '/mixed-dried-fruits-sonnenzauber.png', '1 kg', 'Bio', 1.0, true),
  (29, 'Ananas', cat_trockenfruechtе_id, 15.00, 'Getrocknete Ananas, unbehandelt oder in BIO Qualität. Tropisch süß.', '/mixed-dried-fruits-sonnenzauber.png', '500 g', 'Bio', 0.5, true),
  (30, 'Sauerkirschen', cat_trockenfruechtе_id, 27.00, 'Getrocknete Sauerkirschen, unbehandelt oder in BIO Qualität. Fruchtig-herb.', '/mixed-dried-fruits-sonnenzauber.png', '1 kg', 'Bio', 1.0, true),
  (31, 'Sauerkirschen', cat_trockenfruechtе_id, 14.00, 'Getrocknete Sauerkirschen, unbehandelt oder in BIO Qualität. Fruchtig-herb.', '/mixed-dried-fruits-sonnenzauber.png', '500 g', 'Bio', 0.5, true),
  (32, 'Medjul-Datteln', cat_trockenfruechtе_id, 27.00, 'Premium Medjul-Datteln, unbehandelt oder in BIO Qualität. Besonders groß und süß.', '/dates-pitted-dried-natural.png', '1 kg', 'Bio', 1.0, true),
  (33, 'Medjul-Datteln', cat_trockenfruechtе_id, 14.00, 'Premium Medjul-Datteln, unbehandelt oder in BIO Qualit��t. Besonders groß und süß.', '/dates-pitted-dried-natural.png', '500 g', 'Bio', 0.5, true),
  (34, 'Cashew', cat_trockenfruechtе_id, 25.00, 'Premium Cashewkerne, unbehandelt oder in BIO Qualität. Naturbelassen und ungesalzen.', '/cashew-nuts-organic-premium.png', '1 kg', 'Bio', 1.0, true),
  (35, 'Cashew', cat_trockenfruechtе_id, 13.00, 'Premium Cashewkerne, unbehandelt oder in BIO Qualität. Naturbelassen und ungesalzen.', '/cashew-nuts-organic-premium.png', '500 g', 'Bio', 0.5, true),
  (36, 'Cranberries', cat_trockenfruechtе_id, 27.00, 'Getrocknete Cranberries, unbehandelt oder in BIO Qualität. Herb-süß und vitaminreich.', '/mixed-dried-fruits-sonnenzauber.png', '1 kg', 'Bio', 1.0, true),
  (37, 'Cranberries', cat_trockenfruechtе_id, 14.00, 'Getrocknete Cranberries, unbehandelt oder in BIO Qualität. Herb-süß und vitaminreich.', '/mixed-dried-fruits-sonnenzauber.png', '500 g', 'Bio', 0.5, true),
  (38, 'Maulbeere hell', cat_trockenfruechtе_id, 17.00, 'Getrocknete helle Maulbeeren, unbehandelt oder in BIO Qualität. Mild süß.', '/mixed-dried-fruits-sonnenzauber.png', '1 kg', 'Bio', 1.0, true),
  (39, 'Maulbeere hell', cat_trockenfruechtе_id, 9.00, 'Getrocknete helle Maulbeeren, unbehandelt oder in BIO Qualität. Mild süß.', '/mixed-dried-fruits-sonnenzauber.png', '500 g', 'Bio', 0.5, true),
  (40, 'Aprikose', cat_trockenfruechtе_id, 17.00, 'Getrocknete Aprikosen, unbehandelt oder in BIO Qualität. Süß und aromatisch.', '/mixed-dried-fruits-sonnenzauber.png', '1 kg', 'Bio', 1.0, true),
  (41, 'Aprikose', cat_trockenfruechtе_id, 9.00, 'Getrocknete Aprikosen, unbehandelt oder in BIO Qualität. Süß und aromatisch.', '/mixed-dried-fruits-sonnenzauber.png', '500 g', 'Bio', 0.5, true),
  (42, 'Feigen', cat_trockenfruechtе_id, 17.00, 'Sonnengetrocknete Feigen, unbehandelt oder in BIO Qualität. Reich an Ballaststoffen.', '/dried-figs-organic-natural.png', '1 kg', 'Bio', 1.0, true),
  (43, 'Feigen', cat_trockenfruechtе_id, 9.00, 'Sonnengetrocknete Feigen, unbehandelt oder in BIO Qualität. Reich an Ballaststoffen.', '/dried-figs-organic-natural.png', '500 g', 'Bio', 0.5, true),
  (44, 'Weinbeeren', cat_trockenfruechtе_id, 11.00, 'Bio-Rosinen aus traditionellem Anbau. Ideal für Müsli und Backwaren.', '/organic-raisins-traditional.png', '1 kg', 'Bio', 1.0, true),
  (45, 'Weinbeeren', cat_trockenfruechtе_id, 6.00, 'Bio-Rosinen aus traditionellem Anbau. Ideal für Müsli und Backwaren.', '/organic-raisins-traditional.png', '500 g', 'Bio', 0.5, true),
  (46, 'Datteln ohne Stein', cat_trockenfruechtе_id, 13.00, 'Süße, entsteinte Datteln. Natürliche Energiequelle.', '/dates-pitted-dried-natural.png', '1 kg', 'Bio', 1.0, true),
  (47, 'Datteln ohne Stein', cat_trockenfruechtе_id, 7.00, 'Süße, entsteinte Datteln. Natürliche Energiequelle.', '/dates-pitted-dried-natural.png', '500 g', 'Bio', 0.5, true),
  (48, 'Tomaten', cat_trockenfruechtе_id, 22.00, 'Getrocknete Tomaten, unbehandelt oder in BIO Qualität. Intensiv aromatisch.', '/mixed-dried-fruits-sonnenzauber.png', '1 kg', 'Bio', 1.0, true),
  (49, 'Tomaten', cat_trockenfruechtе_id, 11.00, 'Getrocknete Tomaten, unbehandelt oder in BIO Qualität. Intensiv aromatisch.', '/mixed-dried-fruits-sonnenzauber.png', '500 g', 'Bio', 0.5, true),
  (50, 'Mandeln', cat_trockenfruechtе_id, 24.00, 'Schonend geröstete Mandeln aus sizilianischem Anbau. Perfekt als Snack.', '/roasted-almonds-sicilian-organic.png', '1 kg', 'Sizilien', 1.0, true),
  (51, 'Mandeln', cat_trockenfruechtе_id, 12.50, 'Schonend geröstete Mandeln aus sizilianischem Anbau. Perfekt als Snack.', '/roasted-almonds-sicilian-organic.png', '500 g', 'Sizilien', 0.5, true);

  -- Insert Süße Spezialitäten (9 products)
  INSERT INTO products (id, name, category_id, price, description, image_url, unit, origin, weight_kg, is_active) VALUES
  (52, 'Trüffel-Mandelkerne', cat_suesse_id, 30.00, 'Edle Mandelkerne mit Trüffel-Geschmack. Luxuriöser Genuss für besondere Momente.', '/roasted-almonds-sicilian-organic.png', '1 kg', 'Premium', 1.0, true),
  (53, 'Trüffel-Mandelkerne', cat_suesse_id, 15.00, 'Edle Mandelkerne mit Trüffel-Geschmack. Luxuriöser Genuss für besondere Momente.', '/roasted-almonds-sicilian-organic.png', '500 g', 'Premium', 0.5, true),
  (54, 'Trüffel-Mandelkerne', cat_suesse_id, 6.00, 'Edle Mandelkerne mit Trüffel-Geschmack. Luxuriöser Genuss für besondere Momente.', '/roasted-almonds-sicilian-organic.png', '200 g', 'Premium', 0.2, true),
  (55, 'Tiramisu-Mandeln', cat_suesse_id, 30.00, 'Mandeln mit Tiramisu-Geschmack. Italienische Dolce Vita zum Naschen.', '/roasted-almonds-sicilian-organic.png', '1 kg', 'Premium', 1.0, true),
  (56, 'Tiramisu-Mandeln', cat_suesse_id, 15.00, 'Mandeln mit Tiramisu-Geschmack. Italienische Dolce Vita zum Naschen.', '/roasted-almonds-sicilian-organic.png', '500 g', 'Premium', 0.5, true),
  (57, 'Tiramisu-Mandeln', cat_suesse_id, 6.00, 'Mandeln mit Tiramisu-Geschmack. Italienische Dolce Vita zum Naschen.', '/roasted-almonds-sicilian-organic.png', '200 g', 'Premium', 0.2, true),
  (58, 'Kokos-Orangen-Stäbchen', cat_suesse_id, 30.00, 'Exotische Kokos-Orangen-Stäbchen. Tropischer Geschmack in handlicher Form.', '/coconut-chips-dried-natural.png', '1 kg', 'Premium', 1.0, true),
  (59, 'Kokos-Orangen-Stäbchen', cat_suesse_id, 15.00, 'Exotische Kokos-Orangen-Stäbchen. Tropischer Geschmack in handlicher Form.', '/coconut-chips-dried-natural.png', '500 g', 'Premium', 0.5, true),
  (60, 'Kokos-Orangen-Stäbchen', cat_suesse_id, 6.00, 'Exotische Kokos-Orangen-Stäbchen. Tropischer Geschmack in handlicher Form.', '/coconut-chips-dried-natural.png', '200 g', 'Premium', 0.2, true);
END $$;

-- Verify the data
SELECT c.name as category, COUNT(*) as product_count 
FROM products p
JOIN categories c ON p.category_id = c.id
GROUP BY c.name 
ORDER BY c.name;

SELECT COUNT(*) as total_products FROM products;
