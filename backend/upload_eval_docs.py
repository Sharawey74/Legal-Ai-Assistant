import os
import subprocess
import time
import urllib.request
import json

BASE_URL = "http://localhost:8000/api/v1"
EMAIL    = "day1@legal.ai"
PASSWORD = "test123"

def get_token():
    try:
        req = urllib.request.Request(f"{BASE_URL}/auth/login", data=json.dumps({"email": EMAIL, "password": PASSWORD}).encode(), headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())["access_token"]
    except Exception as e:
        print(f"Failed to get token, is the backend running? {e}")
        return None

def upload_docs():
    token = get_token()
    if not token:
        return
    docs_dir = "../Legal_Documents"
    for filename in os.listdir(docs_dir):
        if filename.endswith(".md"):
            filepath = os.path.join(docs_dir, filename)
            filepath = filepath.replace("\\", "/")
            cmd = f'curl -s -X POST -H "Authorization: Bearer {token}" -F "file=@{filepath}" {BASE_URL}/documents'
            print(f"Uploading {filename}...")
            subprocess.run(cmd, shell=True)

if __name__ == "__main__":
    upload_docs()
