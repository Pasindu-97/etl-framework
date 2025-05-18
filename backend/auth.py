# auth.py
users = {
    "admin": "test",
    "user1": "123"
}

def authenticate(username, password):
    return users.get(username) == password
