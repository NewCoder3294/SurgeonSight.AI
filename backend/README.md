# SurgeonSight Backend

FastAPI backend for SurgeonSight hackathon project.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Run the server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── health.py
│   │       ├── baseline.py
│   │       └── session.py
│   ├── core/
│   │   ├── config.py
│   │   └── logging.py
│   ├── models/
│   │   ├── baseline.py
│   │   └── session.py
│   ├── services/
│   │   ├── baseline_service.py
│   │   └── session_service.py
│   ├── store/
│   │   └── memory.py
│   └── main.py
├── tests/
├── requirements.txt
├── .env.example
└── README.md
```

## API Endpoints

### Health
- `GET /api/health` - Health check
- `GET /api/health/ready` - Readiness check

### Baseline
- `POST /api/baseline` - Upload baseline
- `GET /api/baseline/{user_id}` - Get baseline for user
- `GET /api/baselines` - List all baselines

### Session Reports
- `POST /api/session/report` - Create session report
- `GET /api/session/report/{report_id}` - Get session report
- `GET /api/session/reports` - List all session reports
- `GET /api/session/reports/user/{user_id}` - Get reports for user
