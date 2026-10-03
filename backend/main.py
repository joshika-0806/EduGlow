from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

app = FastAPI(title="EduGlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_default_data() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    students = pd.read_csv(DATA_DIR / "cleaned_students.csv")
    attendance = pd.read_csv(DATA_DIR / "cleaned_attendance.csv")
    assessments = pd.read_csv(DATA_DIR / "cleaned_assessments.csv")
    fees = pd.read_csv(DATA_DIR / "cleaned_fees.csv")
    return students, attendance, assessments, fees


def score_risk(attendance: float, average_marks: float, fee_status: str) -> int:
    fee_pending = str(fee_status).strip().lower() == "pending"
    if attendance < 75 or average_marks < 50 or fee_pending:
        return 1
    return 0


def build_student_dashboard(students: pd.DataFrame, attendance: pd.DataFrame, assessments: pd.DataFrame, fees: pd.DataFrame) -> list[dict[str, Any]]:
    attendance_summary = attendance.groupby("StudentID").agg(
        AttendancePercentage=("Status", lambda s: (s.eq("Present").mean() * 100).round(2))
    ).reset_index()

    assessment_summary = assessments.groupby("StudentID").agg(
        AverageMarks=("MarksObtained", "mean")
    ).reset_index()
    assessment_summary["AverageMarks"] = assessment_summary["AverageMarks"].round(2)

    fee_summary = fees.groupby("StudentID").agg(
        FeeStatus=("Status", lambda s: s.mode().iloc[0] if not s.empty else "Pending")
    ).reset_index()

    merged = students.merge(attendance_summary, on="StudentID", how="left")
    merged = merged.merge(assessment_summary, on="StudentID", how="left")
    merged = merged.merge(fee_summary, on="StudentID", how="left")

    merged["AttendancePercentage"] = merged["AttendancePercentage"].fillna(0)
    merged["AverageMarks"] = merged["AverageMarks"].fillna(0)
    merged["FeeStatus"] = merged["FeeStatus"].fillna("Pending")

    merged["RiskPrediction"] = merged.apply(
        lambda row: score_risk(float(row["AttendancePercentage"]), float(row["AverageMarks"]), str(row["FeeStatus"])),
        axis=1,
    )

    result = []
    for _, row in merged.iterrows():
        result.append(
            {
                "StudentID": row["StudentID"],
                "Name": row["Name"],
                "Department": row["Department"],
                "AttendancePercentage": float(row["AttendancePercentage"]),
                "AverageMarks": float(row["AverageMarks"]),
                "RiskPrediction": int(row["RiskPrediction"]),
            }
        )
    return result


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/process-files/")
async def process_files(
    students_file: UploadFile | None = File(default=None),
    attendance_file: UploadFile | None = File(default=None),
    assessments_file: UploadFile | None = File(default=None),
    fees_file: UploadFile | None = File(default=None),
) -> dict[str, Any]:
    if any(file is not None for file in [students_file, attendance_file, assessments_file, fees_file]):
        async def read_csv_upload(file: UploadFile | None) -> pd.DataFrame:
            if file is None:
                raise HTTPException(status_code=400, detail="Missing required upload.")
            contents = await file.read()
            if not contents:
                raise HTTPException(status_code=400, detail=f"File {file.filename} is empty.")
            return pd.read_csv(io.BytesIO(contents))

        students = await read_csv_upload(students_file) if students_file is not None else None
        attendance = await read_csv_upload(attendance_file) if attendance_file is not None else None
        assessments = await read_csv_upload(assessments_file) if assessments_file is not None else None
        fees = await read_csv_upload(fees_file) if fees_file is not None else None

        if any(df is None for df in [students, attendance, assessments, fees]):
            raise HTTPException(status_code=400, detail="Please upload all 4 CSV files.")
    else:
        students, attendance, assessments, fees = load_default_data()

    data = build_student_dashboard(students, attendance, assessments, fees)
    return {"data": data}


@app.get("/api/student-details/{student_id}")
def get_student_details(student_id: str) -> dict[str, Any]:
    students, attendance, assessments, fees = load_default_data()
    student = students[students["StudentID"] == student_id]
    if student.empty:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found.")

    student_row = student.iloc[0]
    attendance_records = attendance[attendance["StudentID"] == student_id].copy()
    attendance_records["Status"] = attendance_records["Status"].str.lower()

    student_attendance = float((attendance_records["Status"] == "present").mean() * 100) if not attendance_records.empty else 0.0
    student_avg_marks = float(assessments[assessments["StudentID"] == student_id]["MarksObtained"].mean()) if not assessments.empty else 0.0
    student_fee_status = fees[fees["StudentID"] == student_id]
    fee_value = "Pending" if student_fee_status.empty or student_fee_status["Status"].iloc[0].strip().lower() == "pending" else "Paid"
    risk = score_risk(student_attendance, student_avg_marks, fee_value)

    trend = (
        assessments[assessments["StudentID"] == student_id]
        .sort_values("TestName")
        .rename(columns={"TestName": "TestName", "MarksObtained": "MarksObtained"})
        [["TestName", "MarksObtained"]]
        .to_dict(orient="records")
    )

    shap_values = [
        max(0.15, (75 - student_attendance) / 100 * 1.2),
        max(0.10, (50 - student_avg_marks) / 100 * 1.5),
        0.25 if fee_value == "Pending" else -0.15,
    ]
    feature_names = ["attendance_percentage", "average_marks", "fee_status_pending"]
    feature_values = [student_attendance, student_avg_marks, 1 if fee_value == "Pending" else 0]

    return {
        "main_data": {
            "StudentID": student_row["StudentID"],
            "Name": student_row["Name"],
            "Department": student_row["Department"],
            "AttendancePercentage": round(student_attendance, 2),
            "AverageMarks": round(student_avg_marks, 2),
            "RiskPrediction": risk,
            "MentorID": student_row.get("MentorID", ""),
            "GuardianContact": student_row.get("GuardianContact", ""),
            "FeeStatus": fee_value,
        },
        "assessment_trend": trend,
        "shap_explanation": {
            "base_value": 0.5,
            "shap_values": shap_values,
            "feature_names": feature_names,
            "feature_values": feature_values,
        },
    }
