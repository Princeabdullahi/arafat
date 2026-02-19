import smtplib
import os
from email.mime.text import MIMEText

def send_verification_email(to_email, verification_link):
    msg = MIMEText(f"Click to verify your MEMBO VTU account:\n\n{verification_link}")
    msg["Subject"] = "Verify Your MEMBO Account"
    msg["From"] = os.getenv("SMTP_EMAIL")
    msg["To"] = to_email

    server = smtplib.SMTP(os.getenv("SMTP_SERVER"), int(os.getenv("SMTP_PORT")))
    server.starttls()
    server.login(os.getenv("SMTP_EMAIL"), os.getenv("SMTP_PASSWORD"))
    server.send_message(msg)
    server.quit()
