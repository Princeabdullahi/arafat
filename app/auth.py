import bcrypt

def hash_text(text: str):
    return bcrypt.hashpw(text.encode(), bcrypt.gensalt()).decode()

def verify_text(text: str, hashed: str):
    return bcrypt.checkpw(text.encode(), hashed.encode())
