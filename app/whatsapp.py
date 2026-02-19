from .database import SessionLocal
from .models import User
from .auth import hash_text, verify_text
from .ai import ask_ai
import requests
import os

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_ID = os.getenv("PHONE_NUMBER_ID")

user_states = {}

def send_message(phone, text):
    url = f"https://graph.facebook.com/v19.0/{PHONE_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}"}
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": text}
    }
    requests.post(url, headers=headers, json=payload)

def handle_user_message(phone, text):

    db = SessionLocal()
    user = db.query(User).filter(User.phone == phone).first()

    if phone not in user_states:
        user_states[phone] = {"step": None, "authenticated": False, "ai_mode": False}

    state = user_states[phone]

    # MAIN MENU
    if text.lower() == "menu":
        send_message(phone,
        "📱 Welcome to Arafat Telecom\n\n"
        "1️⃣ Register\n"
        "2️⃣ Login\n"
        "3️⃣ Talk to AI\n"
        )
        return

    # REGISTER FLOW
    if text == "1":
        state["step"] = "register_email"
        send_message(phone, "📧 Enter your email:")
        return

    if state["step"] == "register_email":
        state["email"] = text
        state["step"] = "register_password"
        send_message(phone, "🔐 Create password:")
        return

    if state["step"] == "register_password":
        state["password"] = hash_text(text)
        state["step"] = "register_pin"
        send_message(phone, "🔢 Create 4-digit transaction PIN:")
        return

    if state["step"] == "register_pin":
        hashed_pin = hash_text(text)

        new_user = User(
            phone=phone,
            email=state["email"],
            password=state["password"],
            pin=hashed_pin
        )
        db.add(new_user)
        db.commit()

        state["step"] = None
        send_message(phone, "✅ Registration successful!\nType 'menu'")
        return

    # LOGIN FLOW
    if text == "2":
        state["step"] = "login_email"
        send_message(phone, "📧 Enter your registered email:")
        return

    if state["step"] == "login_email":
        state["login_email"] = text
        state["step"] = "login_password"
        send_message(phone, "🔐 Enter password:")
        return

    if state["step"] == "login_password":
        user = db.query(User).filter(User.email == state["login_email"]).first()

        if user and verify_text(text, user.password):
            state["authenticated"] = True
            state["step"] = None
            send_message(phone, "✅ Login successful!\n\nType 'menu'")
        else:
            send_message(phone, "❌ Invalid credentials")
        return

    # AI MODE
    if text == "3":
        state["ai_mode"] = True
        send_message(phone, "🤖 Arafat AI activated.\nType 'exit' to leave.")
        return

    if text.lower() == "exit":
        state["ai_mode"] = False
        send_message(phone, "Exited AI mode.\nType 'menu'")
        return

    if state["ai_mode"]:
        ai_reply = ask_ai(text)
        send_message(phone, ai_reply)
        return

    send_message(phone, "Type 'menu' to begin.")
