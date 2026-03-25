import datetime
from flask import Blueprint, jsonify, request
from db import get_db
from scoring import calculate_score
from services.fetcher import fetch_by_barcode, search_by_name
from services.auth_service import optional_token

products_bp = Blueprint("products", __name__)


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if "cached_at" in doc and hasattr(doc.get("cached_at"), "isoformat"):
        doc["cached_at"] = doc["cached_at"].isoformat()
    return doc


def _score_and_cache(product: dict) -> dict:
    """Score a product and upsert it into the cache. Returns serialized doc."""
    is_food = product.get("is_food", True)
    product["sustainability"] = calculate_score(product, is_food)
    product["cached_at"]      = datetime.datetime.utcnow()
    db = get_db()
    if product.get("barcode"):
        try:
            db.products.update_one(
                {"barcode": product["barcode"]},
                {"$set": product},
                upsert=True,
            )
        except Exception:
            pass
    return _serialize(product)


def _get_or_fetch(barcode: str):
    db     = get_db()
    cached = db.products.find_one({"barcode": barcode})
    if cached:
        return _serialize(cached)
    product = fetch_by_barcode(barcode)
    if not product:
        return None
    return _score_and_cache(product)


# ── helpers for extracting a usable search term from a product ────────────────
def _alt_query(product: dict) -> str | None:
    """
    Build the best possible free-text query for finding similar products.
    Priority: category tags → brand + first meaningful name word.
    """
    cats = product.get("categories_tags") or []
    # Filter out generic/useless tags
    skip = {"en:foods", "en:plant-based-foods", "en:products", "en:groceries"}
    useful = [
        c.split(":")[-1].replace("-", " ")
        for c in cats
        if c not in skip and ":" in c
    ]
    if useful:
        return useful[0]          # most specific category

    name = (product.get("name") or "").strip()
    if name:
        # first two words of product name is usually enough
        return " ".join(name.split()[:2])

    return None


# ─────────────────────────────────────────────────────────────────────────────
@products_bp.route("/barcode/<barcode>", methods=["GET"])
@optional_token
def get_by_barcode(barcode):
    product = _get_or_fetch(barcode)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    if request.user_id and product.get("name"):
        db = get_db()
        db.history.insert_one({
            "user_id":    request.user_id,
            "barcode":    barcode,
            "name":       product.get("name", ""),
            "image_url":  product.get("image_url", ""),
            "score":      (product.get("sustainability") or {}).get("score"),
            "grade":      (product.get("sustainability") or {}).get("grade"),
            "scanned_at": datetime.datetime.utcnow(),
        })

    return jsonify(product)


@products_bp.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Missing query parameter 'q'"}), 400

    db = get_db()
    cached = list(db.products.find(
        {"name": {"$regex": query, "$options": "i"}},
        limit=10,
    ))
    if cached:
        return jsonify([_serialize(p) for p in cached])

    products = search_by_name(query)
    saved    = []
    for p in products:
        if not p.get("name"):
            continue
        saved.append(_score_and_cache(p))

    if not saved:
        return jsonify({"error": "No products found"}), 404

    return jsonify(saved)


@products_bp.route("/<barcode>/alternatives", methods=["GET"])
def alternatives(barcode):
    db      = get_db()
    product = db.products.find_one({"barcode": barcode})
    if not product:
        return jsonify({"error": "Product not found", "alternatives": []}), 404

    current_score = (product.get("sustainability") or {}).get("score", 0)
    cats          = product.get("categories_tags") or []

    # ── 1. Check cache for better-scored products in same category ────────────
    cached_alts = list(db.products.find(
        {
            "barcode":              {"$ne": barcode},
            "categories_tags":      {"$in": cats} if cats else {"$exists": True},
            "sustainability.score": {"$gt": current_score},
        },
        sort=[("sustainability.score", -1)],
        limit=8,
    ))

    # ── 2. If fewer than 3 cached alts, actively fetch from API ──────────────
    if len(cached_alts) < 3:
        query = _alt_query(product)
        if query:
            try:
                fresh = search_by_name(query, page_size=15)
                newly_cached = []
                for p in fresh:
                    if not p.get("name") or p.get("barcode") == barcode:
                        continue
                    scored = _score_and_cache(p)
                    if (scored.get("sustainability") or {}).get("score", 0) > current_score:
                        newly_cached.append(scored)

                # Merge with cached, deduplicate by barcode
                seen     = {a["barcode"] for a in cached_alts if a.get("barcode")}
                combined = [_serialize(a) for a in cached_alts]
                for p in newly_cached:
                    if p.get("barcode") and p["barcode"] not in seen:
                        combined.append(p)
                        seen.add(p["barcode"])

                combined.sort(
                    key=lambda x: (x.get("sustainability") or {}).get("score", 0),
                    reverse=True,
                )
                return jsonify(combined[:6])
            except Exception:
                pass

    result = [_serialize(a) for a in cached_alts[:6]]
    result.sort(
        key=lambda x: (x.get("sustainability") or {}).get("score", 0),
        reverse=True,
    )
    return jsonify(result)
