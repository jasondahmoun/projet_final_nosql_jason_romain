"""db.py - client MongoDB partagé par toute l'API (un seul MongoClient pour
tout le processus, qui gère son propre pool de connexions)."""
import os

from pymongo import MongoClient

MONGO_URI = os.environ["MONGO_URI"]  # jamais en dur, toujours depuis .env
MONGO_DB = os.environ.get("MONGO_DB", "immo")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
