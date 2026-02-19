from fastapi import FastAPI, Request
from app.whatsapp import handle_user_message
from app.database import Base, engine

app = FastAPI()

Base.metadata.create_all(bind=engine)

@app.post("/webhook")
async def webhook(request: Request):
    data = await request.json()
    msg = data["entry"][0]["changes"][0]["value"]["messages"][0]
    phone = msg["from"]
    text = msg["text"]["body"]

    handle_user_message(phone, text)

    return {"status": "ok"}
