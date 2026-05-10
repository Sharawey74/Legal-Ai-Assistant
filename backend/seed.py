import requests
import os
import time

BASE_URL = 'http://localhost:8000/api/v1'
EMAIL = 'day1@legal.ai'
PASSWORD = 'test123@'
DOCS_DIR = r'C:\Users\DELL\Legal-Ai-Assistant\Legal_Documents'

def main():
    print("Seeding documents...")
    
    # 1. Register or login
    try:
        requests.post(f"{BASE_URL}/auth/register", json={"email": EMAIL, "password": PASSWORD})
    except:
        pass
    
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    token = res.json().get("access_token")
    if not token:
        print("Login failed:", res.text)
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Delete existing documents
    docs = requests.get(f"{BASE_URL}/documents", headers=headers).json()
    for d in docs:
        requests.delete(f"{BASE_URL}/documents/{d['id']}", headers=headers)
        
    # 3. Upload all markdown files
    for f in os.listdir(DOCS_DIR):
        p = os.path.join(DOCS_DIR, f)
        if os.path.isfile(p):
            print(f"Uploading {f}...")
            with open(p, 'rb') as fp:
                requests.post(f"{BASE_URL}/documents", headers=headers, files={"file": (f, fp)})
                
    # 4. Wait for processing
    print("Waiting for all documents to be ready...")
    while True:
        docs = requests.get(f"{BASE_URL}/documents", headers=headers).json()
        ready = [d for d in docs if d["status"] == "ready"]
        error = [d for d in docs if d["status"] == "error"]
        print(f"Status: {len(ready)} ready, {len(error)} error, {len(docs)} total")
        if len(ready) + len(error) == len(docs) and len(docs) > 0:
            print("Finished processing!")
            break
        time.sleep(2)

if __name__ == "__main__":
    main()
