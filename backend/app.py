# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from auth import authenticate
from etl_handler import handle_etl_request

app = Flask(__name__)
CORS(app)

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if authenticate(username, password):
        return jsonify({"message": "Login successful", "user": username}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route('/etl-process', methods=['POST'])
def etl_process():
    try:
        data = request.json
        output_columns = data.get("output_columns")
        sources = data.get("sources")

        if not output_columns or not sources:
            return jsonify({"error": "Missing input data"}), 400

        return handle_etl_request(output_columns, sources)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5050)
