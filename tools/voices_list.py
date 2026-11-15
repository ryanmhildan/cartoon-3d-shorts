"""List the ElevenLabs voices in your account (name, Voice ID, accent, gender, preview link).

usage: .venv/Scripts/python.exe tools/voices_list.py
Add voices from the Voice Library on elevenlabs.io first ("Add to my voices"), then run this to get their IDs.
"""
import sys

import requests

from voice import load_env

key = load_env().get("ELEVENLABS_API_KEY", "")
if not key:
    sys.exit("ERROR: ELEVENLABS_API_KEY is empty. Put your API key in .env")
r = requests.get("https://api.elevenlabs.io/v1/voices", headers={"xi-api-key": key}, timeout=60)
if r.status_code != 200:
    sys.exit(f"ERROR: ElevenLabs error {r.status_code}: {r.text[:300]}")
for v in r.json().get("voices", []):
    lab = v.get("labels") or {}
    print(f"{v['name'][:28]:28}  {v['voice_id']}  {lab.get('accent', ''):12} {lab.get('gender', ''):7} {v.get('preview_url', '')}")
