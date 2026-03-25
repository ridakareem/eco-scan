# 🌿 EcoScan — Sustainability Scanner

Search or scan any product barcode to instantly see a sustainability score, grade (A–E), factor breakdown, and greener alternatives. Built with plain HTML/CSS/JS, Python Flask, and MongoDB.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| MongoDB | 6+ (local or Atlas) |
| A modern browser | Chrome / Edge / Firefox |

> MongoDB must be running before you start the backend.  
> To start a local MongoDB instance: open a separate terminal and run `mongod`

---

## Setup (Windows PowerShell)

### 1 — Clone / extract the project

```powershell
cd C:\Projects
```

*(Place the extracted `sustainability-scanner` folder here so you have `C:\Projects\sustainability-scanner`)*

---

### 2 — Set up the Python backend

```powershell
cd C:\Projects\sustainability-scanner\backend
```

Create and activate a virtual environment:

```powershell
python -m venv .venv
```

```powershell
.venv\Scripts\Activate.ps1
```

> If you get an execution-policy error, first run:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

Install dependencies:

```powershell
pip install -r requirements.txt
```

---

### 3 — Configure environment variables

```powershell
Copy-Item .env.example .env
```

Open `.env` in any text editor and adjust if needed:

```
MONGO_URI=mongodb://localhost:27017/sustainability_scanner
MONGO_DB_NAME=sustainability_scanner
JWT_SECRET=change-me-to-a-long-random-string
FLASK_ENV=development
FLASK_PORT=5000
```

---

### 4 — Start the Flask backend

```powershell
python main.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
```

Keep this terminal open.

---

### 5 — Serve the frontend

Open a **second** PowerShell terminal:

```powershell
cd C:\Projects\sustainability-scanner\frontend
```

```powershell
python -m http.server 8080
```

---

### 6 — Open the app

Open your browser and navigate to:

```
http://localhost:8080
```

> **Important:** The frontend must be served over HTTP (not opened as a `file://` URL) because ES modules require a server origin.

---

## Usage

### Search by name
Type any product name (e.g. `Nutella`, `Coca Cola`, `Dove soap`) and press **Search** or hit Enter.

### Search by barcode number
Type the barcode digits directly (e.g. `3017620422003` for Nutella) and press **Search**.

### Scan with camera
Click **📷 Scan Barcode**, allow camera access, and point at any product barcode. The result loads automatically.

### Sign in / Register
Click **Sign in** in the top-right corner. Once logged in, every barcode lookup is saved to your history.

### History
Visit the **History** tab to see and delete past scans (requires sign-in).

---

## Scoring methodology

| Factor | Food weight | General goods weight |
|--------|------------|---------------------|
| Carbon impact | 30 % | 25 % |
| Packaging | 25 % | 20 % |
| Recyclability | 15 % | 25 % |
| Certifications | 20 % | 15 % |
| Origin | 10 % | 15 % |

Scores are derived from NOVA group, Nutri-Score, Eco-Score, packaging tags, and eco-certification labels provided by Open Food Facts / Open Products Facts.

---

## Project structure

```
sustainability-scanner/
├── backend/
│   ├── main.py               # Flask app factory + blueprint registration
│   ├── db.py                 # MongoDB connection
│   ├── scoring.py            # Sustainability scoring engine
│   ├── routes/
│   │   ├── products.py       # /api/products/*
│   │   ├── auth.py           # /api/auth/*
│   │   └── history.py        # /api/history/
│   ├── services/
│   │   ├── fetcher.py        # Open Food Facts + Open Products Facts client
│   │   └── auth_service.py   # JWT helpers + decorators
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html            # Main scanner page
    ├── history.html          # Scan history page
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js            # All fetch calls to backend
        ├── auth.js           # localStorage session helpers
        ├── ui.js             # Score ring, breakdown bars, toasts, spinner
        ├── scanner.js        # html5-qrcode wrapper
        ├── product.js        # Product card + search results renderer
        ├── app.js            # Home page logic
        └── history.js        # History page logic
```

---

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/products/barcode/<barcode>` | optional | Fetch product by barcode |
| GET | `/api/products/search?q=<query>` | — | Search by name |
| GET | `/api/products/<barcode>/alternatives` | — | Greener alternatives |
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/profile` | required | Current user profile |
| GET | `/api/history/` | required | User scan history |
| DELETE | `/api/history/<id>` | required | Delete history item |

---

## Troubleshooting

**`mongod` not found** — Make sure MongoDB is installed and its `bin` folder is in your PATH. Download from https://www.mongodb.com/try/download/community

**Camera not working** — Browsers require HTTPS or `localhost` for camera access. `http://localhost:8080` is fine; `http://192.168.x.x:8080` is not.

**CORS errors** — Make sure the Flask backend is running on port 5000 and CORS is enabled (it is by default in this project).

**`ModuleNotFoundError`** — Make sure your virtual environment is activated (`.venv\Scripts\Activate.ps1`) before running `python main.py`.
