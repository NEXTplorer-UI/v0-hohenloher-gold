import os
from supabase import create_client, Client

# Supabase connection
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

print("=== BLUTORANGEN DIAGNOSE ===\n")

# 1. Find Blutorangen product
print("1. Suche nach Blutorangen in products Tabelle:")
products = supabase.table("products").select("*").ilike("name", "%blutorange%").execute()
if products.data:
    for product in products.data:
        print(f"  Produkt gefunden: {product['name']} (ID: {product['id']})")
        print(f"    - is_active: {product.get('is_active')}")
        print(f"    - stock_quantity: {product.get('stock_quantity')}")
        print(f"    - inventory_raw_id: {product.get('inventory_raw_id')}")
        print(f"    - category_id: {product.get('category_id')}")
        print(f"    - min_stock: {product.get('min_stock')}")
        
        # 2. Check inventory_raw_stock if assigned
        if product.get('inventory_raw_id'):
            print(f"\n2. Prüfe gramm-basiertes Lager (ID: {product['inventory_raw_id']}):")
            raw_stock = supabase.table("inventory_raw_stock").select("*").eq("id", product['inventory_raw_id']).execute()
            if raw_stock.data:
                stock = raw_stock.data[0]
                print(f"    - product_name: {stock.get('product_name')}")
                print(f"    - stock_grams: {stock.get('stock_grams')}")
                print(f"    - min_stock_grams: {stock.get('min_stock_grams')}")
            else:
                print("    FEHLER: Kein Lager-Eintrag gefunden!")
        else:
            print("\n2. Kein gramm-basiertes Lager zugeordnet (inventory_raw_id ist NULL)")
        
        # 3. Check product_availability view
        print(f"\n3. Prüfe product_availability View:")
        availability = supabase.table("product_availability").select("*").eq("product_id", product['id']).execute()
        if availability.data:
            avail = availability.data[0]
            print(f"    - is_available: {avail.get('is_available')}")
            print(f"    - status: {avail.get('status')}")
            print(f"    - current_stock: {avail.get('current_stock')}")
        else:
            print("    FEHLER: Produkt nicht in product_availability View!")
        
        # 4. Check category
        if product.get('category_id'):
            print(f"\n4. Prüfe Kategorie (ID: {product['category_id']}):")
            category = supabase.table("categories").select("*").eq("id", product['category_id']).execute()
            if category.data:
                print(f"    - Name: {category.data[0].get('name')}")
        
        print("\n" + "="*50 + "\n")
else:
    print("  FEHLER: Keine Blutorangen gefunden!")

print("\n=== DIAGNOSE ABGESCHLOSSEN ===")
