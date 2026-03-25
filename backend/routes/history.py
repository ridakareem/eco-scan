from flask import Blueprint, jsonify, request
from db import get_db
from services.auth_service import token_required

history_bp = Blueprint("history", __name__)


@history_bp.route("/", methods=["GET"])
@token_required
def get_history():
    db   = get_db()
    docs = list(db.history.find(
        {"user_id": request.user_id},
        sort=[("scanned_at", -1)],
        limit=50,
    ))
    result = []
    for doc in docs:
        doc["_id"] = str(doc["_id"])
        if doc.get("scanned_at") and hasattr(doc["scanned_at"], "isoformat"):
            doc["scanned_at"] = doc["scanned_at"].isoformat()
        result.append(doc)
    return jsonify(result)


@history_bp.route("/<item_id>", methods=["DELETE"])
@token_required
def delete_history_item(item_id):
    from bson import ObjectId
    db = get_db()
    try:
        res = db.history.delete_one({"_id": ObjectId(item_id), "user_id": request.user_id})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if res.deleted_count == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"ok": True})
