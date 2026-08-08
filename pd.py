import requests
import json

API_KEY = "fc_6925fdd6077c284009f0627f"

headers = {
    "X-API-Key": API_KEY
}

# جلب جميع الفئات
response = requests.get(
    "https://api.fzr.cards/api/v2/topups?limit=200",
    headers=headers
)

categories = response.json()["items"]

# البحث عن MENA فقط
category = next(
    (c for c in categories if c["category_id"] == "free_fire_mena"),
    None
)

if not category:
    print("Free Fire (MENA) not found")
    exit()

print("Found:", category)

# جلب العروض
offers = requests.get(
    "https://api.fzr.cards/api/v2/topups/offers",
    headers=headers,
    params={
        "category_id": category["category_id"]
    }
).json()

# حفظ الملف
with open("free_fire_mena_offers.json", "w", encoding="utf-8") as f:
    json.dump(offers, f, ensure_ascii=False, indent=4)

print("Saved successfully.")