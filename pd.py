import json
import time
import requests

API_KEY = "fc_0d5677b205b34f11c4b81ea7"

BASE_URL = "https://api.fzr.cards/api/v2"

HEADERS = {
    "X-API-Key": API_KEY
}

all_categories = []
all_offers = []

print("📥 Downloading categories...")

cursor = None

while True:
    params = {
        "limit": 100
    }

    if cursor:
        params["cursor"] = cursor

    response = requests.get(
        f"{BASE_URL}/topups",
        headers=HEADERS,
        params=params,
        timeout=30
    )

    print("Categories Status:", response.status_code)

    if response.status_code != 200:
        print(response.text)
        exit()

    data = response.json()

    items = data.get("items", [])
    meta = data.get("meta", {})

    all_categories.extend(items)

    if not meta.get("has_more"):
        break

    cursor = meta.get("next_cursor")

print(f"✅ Categories found: {len(all_categories)}")

print()

for index, category in enumerate(all_categories, start=1):

    category_id = category["category_id"]
    category_name = category.get("name", "")

    print(f"[{index}/{len(all_categories)}] {category_name}")

    response = requests.get(
        f"{BASE_URL}/topups/offers",
        headers=HEADERS,
        params={
            "category_id": category_id
        },
        timeout=30
    )

    if response.status_code == 200:

        offers = response.json()

        all_offers.append({
            "category_id": category_id,
            "category_name": category_name,
            "data": offers
        })

    else:

        print(f"❌ Failed ({response.status_code})")
        print(response.text)

    time.sleep(0.2)

with open(
    "all_topup_offers.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        all_offers,
        f,
        indent=4,
        ensure_ascii=False
    )

print()
print("=" * 40)
print("✅ Finished")
print(f"Categories: {len(all_categories)}")
print(f"Saved: all_topup_offers.json")