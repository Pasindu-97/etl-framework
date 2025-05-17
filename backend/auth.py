# auth.py
users = {
    "admin": "password123",
    "user1": "mypassword"
}

def authenticate(username, password):
    return users.get(username) == password
