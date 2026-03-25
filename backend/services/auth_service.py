import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app


def create_token(user_id):
    secret = current_app.config["JWT_SECRET"]
    payload = {
        "sub": str(user_id),
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token):
    try:
        secret = current_app.config["JWT_SECRET"]
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if payload is None:
            return jsonify({"error": "Token expired or invalid"}), 401
        request.user_id = payload["sub"]
        return f(*args, **kwargs)
    return decorated


def optional_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        request.user_id = None
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)
            if payload:
                request.user_id = payload["sub"]
        return f(*args, **kwargs)
    return decorated
