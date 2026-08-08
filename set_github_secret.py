import base64
import json
import os
import urllib.request

GITHUB_TOKEN = os.environ['GITHUB_TOKEN']
REPO = os.environ['GITHUB_REPO']
SECRET_NAME = os.environ['GITHUB_SECRET_NAME']
SECRET_VALUE = os.environ['GITHUB_SECRET_VALUE']

# Get public key
req = urllib.request.Request(
    f'https://api.github.com/repos/{REPO}/actions/secrets/public-key',
    headers={
        'Authorization': f'Bearer {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Python'
    }
)
with urllib.request.urlopen(req) as resp:
    public_key = json.load(resp)

key_id = public_key['key_id']
key = public_key['key']

# Encrypt secret
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

public_key_obj = serialization.load_pem_public_key(
    b"-----BEGIN PUBLIC KEY-----\n" + base64.b64decode(key) + b"\n-----END PUBLIC KEY-----\n",
    backend=default_backend()
)

encrypted = public_key_obj.encrypt(
    SECRET_VALUE.encode('utf-8'),
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
)

encrypted_value = base64.b64encode(encrypted).decode('utf-8')

# Put secret
req = urllib.request.Request(
    f'https://api.github.com/repos/{REPO}/actions/secrets/{SECRET_NAME}',
    data=json.dumps({'encrypted_value': encrypted_value, 'key_id': key_id}).encode('utf-8'),
    headers={
        'Authorization': f'Bearer {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Python',
        'Content-Type': 'application/json'
    },
    method='PUT'
)
with urllib.request.urlopen(req) as resp:
    print(resp.status, resp.reason)
