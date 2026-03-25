"""
Fetches product data from Open Food Facts first, falls back to Open Products Facts.
"""

import requests

OFF_BARCODE_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
OFF_SEARCH_URL  = "https://world.openfoodfacts.org/cgi/search.pl"
OPF_BARCODE_URL = "https://world.openproductsfacts.org/api/v2/product/{barcode}.json"
OPF_SEARCH_URL  = "https://world.openproductsfacts.org/cgi/search.pl"

TIMEOUT = 8

HEADERS = {
    "User-Agent": "EcoScan/1.0 (sustainability scanner app; contact@ecoscan.app)"
}

SEARCH_FIELDS = (
    "code,product_name,brands,categories_tags,packaging_tags,"
    "labels_tags,countries_tags,nova_group,nutriscore_grade,"
    "ecoscore_grade,image_url,quantity"
)


def _normalize(raw, source):
    product = raw.get("product") or raw
    if not product:
        return None
    return {
        "barcode":          product.get("code") or product.get("id"),
        "name":             product.get("product_name") or product.get("abbreviated_product_name") or "",
        "brands":           product.get("brands") or "",
        "categories_tags":  product.get("categories_tags") or [],
        "packaging_tags":   product.get("packaging_tags") or [],
        "labels_tags":      product.get("labels_tags") or [],
        "countries_tags":   product.get("countries_tags") or [],
        "nova_group":       product.get("nova_group"),
        "nutriscore_grade": product.get("nutriscore_grade"),
        "ecoscore_grade":   product.get("ecoscore_grade"),
        "image_url":        product.get("image_url") or product.get("image_front_url") or "",
        "quantity":         product.get("quantity") or "",
        "source":           source,
    }


def fetch_by_barcode(barcode):
    for url_tpl, source, is_food in [
        (OFF_BARCODE_URL, "openfoodfacts",    True),
        (OPF_BARCODE_URL, "openproductsfacts", False),
    ]:
        try:
            url = url_tpl.format(barcode=barcode)
            print(f"🔍 Fetching: {url}")
            resp = requests.get(url, timeout=TIMEOUT, headers=HEADERS)
            print(f"📡 Status: {resp.status_code}")
            data = resp.json()
            print(f"📦 Product status: {data.get('status')}")
            if resp.status_code == 200 and data.get("status") == 1:
                p = _normalize(data, source)
                if p:
                    p["is_food"] = is_food
                    return p
        except requests.RequestException as e:
            print(f"❌ Request failed: {e}")
            continue
    return None


def search_by_name(query, page_size=10):
    results = {}

    params = {
        "search_terms":  query,
        "search_simple": 1,
        "action":        "process",
        "json":          1,
        "page_size":     page_size,
        "fields":        SEARCH_FIELDS,
    }

    for url, source, is_food in [
        (OFF_SEARCH_URL, "openfoodfacts",    True),
        (OPF_SEARCH_URL, "openproductsfacts", False),
    ]:
        try:
            print(f"🔍 Searching: {url} for '{query}'")
            resp = requests.get(url, params=params, timeout=TIMEOUT, headers=HEADERS)
            print(f"📡 Search status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                for raw in data.get("products") or []:
                    p = _normalize({"product": raw}, source)
                    if p and p.get("name"):
                        p["is_food"] = is_food
                        key = p.get("barcode") or p["name"]
                        if key not in results:
                            results[key] = p
        except requests.RequestException as e:
            print(f"❌ Search failed: {e}")
            continue

    return list(results.values())[:page_size]