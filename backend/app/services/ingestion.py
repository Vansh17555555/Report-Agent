import os
import shutil
from typing import List
from fastapi import UploadFile, File, HTTPException
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from app.params import UPLOAD_DIR, CHROMA_DB_DIR, EMBEDDING_MODEL, COLLECTION_NAME

class IngestionService:
    def __init__(self):
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        os.makedirs(CHROMA_DB_DIR, exist_ok=True)
        self.embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
        self.vector_store = Chroma(
            persist_directory=CHROMA_DB_DIR,
            embedding_function=self.embeddings,
            collection_name=COLLECTION_NAME
        )

    async def save_file(self, file: UploadFile) -> str:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return file_path

    async def ingest_document(self, file_path: str):
        try:
            # 1. Load
            loader = PyPDFLoader(file_path)
            docs = loader.load()
            
            # 2. Split
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                add_start_index=True
            )
            splits = text_splitter.split_documents(docs)

            # 3. Index
            # Add metadata for source tracking
            for split in splits:
                split.metadata["source"] = os.path.basename(file_path)

            self.vector_store.add_documents(documents=splits)
            
            return {"status": "success", "chunks": len(splits)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_documents_list(self):
        # A simple way to list processed docs is to list the upload dir
        # In a real app, query the vector DB for unique sources
        if not os.path.exists(UPLOAD_DIR):
            return []
        return os.listdir(UPLOAD_DIR)

    def clear_database(self):
        self.vector_store.delete_collection()
        self.vector_store = Chroma(
             persist_directory=CHROMA_DB_DIR,
             embedding_function=self.embeddings,
             collection_name=COLLECTION_NAME
        )
        if os.path.exists(UPLOAD_DIR):
            shutil.rmtree(UPLOAD_DIR)
            os.makedirs(UPLOAD_DIR)
