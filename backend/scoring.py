"""
Sustainability scoring engine.
Scores 0-100.  Grade: A=80+, B=60+, C=40+, D=20+, E=0+
"""

FOOD_WEIGHTS = {
    "carbon":          0.30,
    "packaging":       0.25,
    "recyclability":   0.15,
    "certifications":  0.20,
    "origin":          0.10,
}

GOODS_WEIGHTS = {
    "carbon":          0.25,
    "packaging":       0.20,
    "recyclability":   0.25,
    "certifications":  0.15,
    "origin":          0.15,
}

NOVA_CARBON    = {1: 90, 2: 75, 3: 50, 4: 25}
NUTRISCORE_MAP = {"a": 90, "b": 75, "c": 55, "d": 35, "e": 15}

ECO_LABELS = {
    "en:organic", "en:rainforest-alliance", "en:fairtrade",
    "en:eu-organic", "en:utz-certified", "en:marine-stewardship-council",
    "en:fsc", "en:cruelty-free", "en:vegan",
}

RECYCLABLE_MATERIALS = {
    "en:cardboard", "en:paper", "en:glass", "en:aluminium",
    "en:steel", "en:hdpe", "en:pet",
}

PROBLEMATIC_MATERIALS = {
    "en:plastic", "en:expanded-polystyrene", "en:pvc",
    "en:multi-layer", "en:non-recyclable",
}


def _carbon_score(product, is_food):
    if is_food:
        nova = product.get("nova_group")
        if nova:
            try:
                score = NOVA_CARBON.get(int(nova), 50)
                return score, "NOVA {}".format(nova)
            except (ValueError, TypeError):
                pass
        nutriscore = (product.get("nutriscore_grade") or "").lower()
        if nutriscore in NUTRISCORE_MAP:
            return NUTRISCORE_MAP[nutriscore], "Nutri-Score {}".format(nutriscore.upper())
        return 50.0, "estimated"

    ecoscore = (product.get("ecoscore_grade") or "").lower()
    if ecoscore in NUTRISCORE_MAP:
        return NUTRISCORE_MAP[ecoscore], "Eco-Score {}".format(ecoscore.upper())
    return 45.0, "estimated"


def _packaging_score(product):
    tags = product.get("packaging_tags") or []
    if not tags:
        return 50.0, "unknown packaging"
    bad  = sum(1 for t in tags if t in PROBLEMATIC_MATERIALS)
    good = sum(1 for t in tags if t in RECYCLABLE_MATERIALS)
    if bad > 0 and good == 0:
        return 20.0, "non-recyclable materials"
    if bad == 0 and good > 0:
        return 85.0, "recyclable materials"
    if bad > 0 and good > 0:
        return 50.0, "mixed packaging"
    return 55.0, "packaging present"


def _recyclability_score(product):
    tags = product.get("packaging_tags") or []
    recycle_count = sum(1 for t in tags if t in RECYCLABLE_MATERIALS)
    total = len(tags)
    if total == 0:
        return 50.0, "unknown"
    ratio = recycle_count / total
    return round(ratio * 100, 1), "{}/{} recyclable".format(recycle_count, total)


def _certification_score(product):
    label_tags = set(product.get("labels_tags") or [])
    matched = label_tags & ECO_LABELS
    count = len(matched)
    if count == 0:
        return 30.0, "no eco labels"
    if count == 1:
        return 70.0, "1 eco label"
    return min(95.0, 70 + count * 8), "{} eco labels".format(count)


def _origin_score(product):
    countries = product.get("countries_tags") or []
    if not countries:
        return 50.0, "unknown origin"
    if len(countries) == 1:
        return 70.0, "single country"
    return 55.0, "{} countries".format(len(countries))


def calculate_score(product, is_food=True):
    weights = FOOD_WEIGHTS if is_food else GOODS_WEIGHTS

    carbon_val,   carbon_note   = _carbon_score(product, is_food)
    pkg_val,      pkg_note      = _packaging_score(product)
    recycle_val,  recycle_note  = _recyclability_score(product)
    cert_val,     cert_note     = _certification_score(product)
    origin_val,   origin_note   = _origin_score(product)

    factors = {
        "carbon":         {"score": carbon_val,  "note": carbon_note,  "weight": weights["carbon"]},
        "packaging":      {"score": pkg_val,      "note": pkg_note,      "weight": weights["packaging"]},
        "recyclability":  {"score": recycle_val,  "note": recycle_note,  "weight": weights["recyclability"]},
        "certifications": {"score": cert_val,     "note": cert_note,     "weight": weights["certifications"]},
        "origin":         {"score": origin_val,   "note": origin_note,   "weight": weights["origin"]},
    }

    total = sum(f["score"] * f["weight"] for f in factors.values())
    total = round(total, 1)

    if total >= 80:   grade = "A"
    elif total >= 60: grade = "B"
    elif total >= 40: grade = "C"
    elif total >= 20: grade = "D"
    else:             grade = "E"

    return {"score": total, "grade": grade, "factors": factors, "is_food": is_food}
