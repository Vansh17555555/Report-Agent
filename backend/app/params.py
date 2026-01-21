import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DB_DIR = os.path.join(BASE_DIR, "../chroma_db")
UPLOAD_DIR = os.path.join(BASE_DIR, "../uploads")

# Models
# Switching to user's installed models to ensure immediate function
LLM_MODEL = os.getenv("LLM_MODEL", "gemma3:1b")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "embeddinggemma")

# Vector Store
COLLECTION_NAME = "executive_insights"
