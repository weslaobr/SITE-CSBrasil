import urllib.request
import json
import ssl

steam_id = "76561198024691636"
url = f"https://api.leetify.com/api/profile/{steam_id}"

req = urllib.request.Request(
    url, 
    data=None, 
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
    }
)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode())
        print("Success! Keys:")
        print(data.keys())
        if 'games' in data and 'cs2' in data['games']:
            print("CS2 Data:", data['games']['cs2'])
except Exception as e:
    print(f"Error: {e}")
