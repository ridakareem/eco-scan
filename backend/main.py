import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config["JWT_SECRET"]        = os.getenv("JWT_SECRET", "dev-secret-change-me")
    app.config["BCRYPT_LOG_ROUNDS"] = 4

    CORS(app, resources={r"/api/*": {"origins": ["http://127.0.0.1:5500", "http://localhost:5500"]}})

    from extensions import bcrypt
    bcrypt.init_app(app)

    from routes.products import products_bp
    from routes.auth     import auth_bp
    from routes.history  import history_bp

    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(auth_bp,     url_prefix="/api/auth")
    app.register_blueprint(history_bp,  url_prefix="/api/history")

    return app

app = create_app()

@app.route("/")
def home():
    return "Sustainability Scanner API is running"

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    app = create_app()
    app.run(host='0.0.0.0',debug=os.getenv("FLASK_ENV") == "development", port=port)
