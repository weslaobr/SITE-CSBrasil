import os
import requests
import sys

API_KEY = "ptlc_x18tO5bKZCcBMBLBZL3pAxLUB5bSyjpyrtLeidHUXpc"
SERVER_ID = "09821a19-3411-4b35-9af5-2aca06a0490a"
BASE_URL = "https://painel3.firegamesnetwork.com"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

def list_files(directory="%2F"):
    url = f"{BASE_URL}/api/client/servers/{SERVER_ID}/files/list?directory={directory}"
    resp = requests.get(url, headers=headers)
    if resp.ok:
        data = resp.json().get('data', [])
        for item in data:
            attrs = item.get('attributes', {})
            print(f"[{'DIR' if attrs.get('is_file') is False else 'FILE'}] {attrs.get('name')}")
    else:
        print(f"Error {resp.status_code}: {resp.text}")

def read_file(filepath):
    url = f"{BASE_URL}/api/client/servers/{SERVER_ID}/files/contents?file={filepath}"
    resp = requests.get(url, headers=headers)
    if resp.ok:
        print(resp.text)
    else:
        print(f"Error {resp.status_code}: {resp.text}")

if len(sys.argv) > 1:
    cmd = sys.argv[1]
    if cmd == "list" and len(sys.argv) > 2:
        list_files(sys.argv[2])
    elif cmd == "read" and len(sys.argv) > 2:
        read_file(sys.argv[2])
    else:
        list_files()
else:
    list_files()
