# EduGlow

EduGlow is a student-support dashboard that combines student, attendance, assessment, and fee records to highlight students who may need follow-up. It includes a React interface and a FastAPI service that processes CSV files.

## Features

- Upload four CSV files and generate a student summary.
- Search students by name and filter by department or risk status.
- View attendance, average assessment marks, and risk indicators.
- Open a student profile and inspect assessment trends.
- Download the currently filtered dashboard as a CSV file.

## Tech Stack

- Frontend: React, Create React App, and Material UI.
- Backend: FastAPI and Pandas.
- Data: CSV files in `data/`.

## Requirements

- Python 3.10 or later.
- Node.js and npm.
- Git, if cloning the repository.

## Run Locally

Open two terminals from the repository root.

### 1. Start the backend

In the first terminal, create and activate a virtual environment, install the backend packages, and start the API:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install fastapi "uvicorn[standard]" pandas python-multipart
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If PowerShell blocks activation, allow scripts for the current terminal with `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then activate the environment again.

Check that the API is running at <http://127.0.0.1:8000/health>. Interactive API documentation is available at <http://127.0.0.1:8000/docs>.

### 2. Start the frontend

In the second terminal:

```powershell
cd frontend
npm install
npm start
```

The frontend opens at <http://localhost:3000>. Keep both terminals running while using the app. The frontend currently sends API requests to `http://127.0.0.1:8000`.

## CSV Upload Format

Upload all four files from the upload screen. Column names are case-sensitive; the required columns are:

| File | Required columns |
| --- | --- |
| Students | `StudentID`, `Name`, `Department` |
| Attendance | `StudentID`, `Status` |
| Assessments | `StudentID`, `MarksObtained` |
| Fees | `StudentID`, `Status` |

The bundled files in `data/` include additional columns used by the student profile. Attendance status should use `Present` for attendance credit. A fee status of `Pending` is treated as unpaid. `data/master_data.csv` is a combined reference dataset; the backend loads the four separate `cleaned_*.csv` files by default.

## Risk Indicator

A student is marked **High Risk** if any of these conditions is true:

- Attendance is below 75%.
- Average assessment marks are below 50.
- Fee status is `Pending`.

Otherwise, the student is marked **Not At Risk**. This is a simple rule-based indicator for review, not a diagnosis or a substitute for staff judgment.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check API availability. |
| `POST` | `/api/process-files/` | Process the four uploaded CSVs, or use bundled data when called without files. |
| `GET` | `/api/student-details/{student_id}` | Return a student's details, assessment trend, and risk explanation. |

## Tests and Production Build

Run the frontend tests:

```powershell
cd frontend
npm test
```

Create a production frontend build:

```powershell
cd frontend
npm run build
```

## Current Limitations

- The uploaded CSVs are processed in memory and are not saved by the backend.
- Student profile requests load the bundled CSV files in `data/`, rather than the files uploaded in the current session. Profile values may therefore differ from a dashboard generated from custom uploads.
- The frontend API URL and backend CORS origins are configured for local development. Deployment requires configuring the frontend API URL, CORS origins, and hosting for both services.
- The service has no authentication or authorization and is intended as a local demo, not for handling real student records in production.
