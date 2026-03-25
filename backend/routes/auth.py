from flask import Blueprint, jsonify, request, current_app
from extensions import bcrypt
from db import get_db
from services.auth_service import create_token, token_required
import datetime

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name     = (data.get("name") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    db = get_db()
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    rounds  = current_app.config.get("BCRYPT_LOG_ROUNDS", 4)
    pw_hash = bcrypt.generate_password_hash(password, rounds=rounds).decode("utf-8")

    result = db.users.insert_one({
        "email":      email,
        "password":   pw_hash,
        "name":       name,
        "created_at": datetime.datetime.utcnow(),
    })

    token = create_token(result.inserted_id)
    return jsonify({"token": token, "user": {"email": email, "name": name}}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    db   = get_db()
    user = db.users.find_one({"email": email})
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_token(user["_id"])
    return jsonify({"token": token, "user": {"email": email, "name": user.get("name", "")}})


@auth_bp.route("/profile", methods=["GET"])
@token_required
def profile():
    from bson import ObjectId
    db = get_db()
    try:
        user = db.users.find_one({"_id": ObjectId(request.user_id)})
    except Exception:
        return jsonify({"error": "User not found"}), 404

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "email":      user["email"],
        "name":       user.get("name", ""),
        "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
    })
