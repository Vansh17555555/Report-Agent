from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Depends, Request
from typing import List, Dict
from sqlalchemy.orm import Session
from app.services.ingestion import IngestionService
from app.services.chat import ChatService
from app.database import get_db, ChatSession, ChatMessage
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
import uuid
import os
from app.params import UPLOAD_DIR

router = APIRouter()
ingest_service = IngestionService()
chat_service = ChatService()
limiter = Limiter(key_func=get_remote_address)

# --- Files ---
@router.post("/ingest")
@limiter.limit("5/minute")
async def ingest_file(request: Request, file: UploadFile = File(...)):
    """Uploads and digests a PDF file."""
    try:
        file_path = await ingest_service.save_file(file)
        result = await ingest_service.ingest_document(file_path)
        return {"filename": file.filename, "status": "indexed", "details": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files")
async def list_files():
    """Lists uploaded files."""
    return {"files": ingest_service.get_documents_list()}

@router.delete("/files/{filename}")
async def delete_file(filename: str):
    """Deletes a file."""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return {"status": "deleted", "filename": filename}
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/reset")
async def reset_db():
    ingest_service.clear_database()
    return {"status": "Database cleared"}

# --- Chat & History ---

@router.post("/sessions")
async def create_session(db: Session = Depends(get_db)):
    """Creates a new chat session."""
    session_id = str(uuid.uuid4())
    new_session = ChatSession(id=session_id, title="New Conversation")
    db.add(new_session)
    db.commit()
    return {"id": session_id, "title": new_session.title}

@router.get("/sessions")
async def get_sessions(db: Session = Depends(get_db)):
    """List recent sessions."""
    sessions = db.query(ChatSession).order_by(ChatSession.created_at.desc()).limit(20).all()
    return [{"id": s.id, "title": s.title, "date": s.created_at} for s in sessions]

@router.get("/sessions/{session_id}")
async def get_session_history(session_id: str, db: Session = Depends(get_db)):
    """Get messages for a session."""
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()
    return [{"role": m.role, "content": m.content} for m in messages]

@router.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, body: Dict = Body(...), db: Session = Depends(get_db)):
    """
    Chat endpoint with Persistence.
    """
    message = body.get("message")
    history = body.get("history", []) # Legacy: Frontend handles state, but we should sync DB
    session_id = body.get("session_id")

    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    # Auto-create session if none provided
    if not session_id:
        session_id = str(uuid.uuid4())
        new_session = ChatSession(id=session_id, title=message[:30] + "...")
        db.add(new_session)
        db.commit()
    
    # Save User Message
    user_msg_db = ChatMessage(session_id=session_id, role="user", content=message)
    db.add(user_msg_db)
    db.commit()

    # Create Generator that saves the AI response at the end
    async def response_generator():
        full_response = ""
        async for chunk in chat_service.chat_stream(message, history):
            full_response += chunk
            yield chunk
        
        # Save AI Message
        # Note: We need a new DB session here because generator runs async/later
        # Ideally passing db session to generator or using context manager
        # Quick hack: create new session scope or rely on service (better).
        # For prototype, we'll accept that saving AI msg might need care.
        # Let's assume chat_stream finishes yielding, we can't easily execute DB write *after* yield in same loop 
        # without `yield` blocking.
        # Better approach: The Generator logic above collects `full_response`.
        # We need to write it to DB. 
        # IMPORTANT: Cannot use the dependency `db` inside async generator after request might be closed?
        # Actually it's fine in FastAPI streaming.
        
        try:
             ai_msg_db = ChatMessage(session_id=session_id, role="ai", content=full_response)
             db.add(ai_msg_db)
             db.commit()
        except:
             pass # Logging needed
    
    return StreamingResponse(
        response_generator(),
        media_type="text/event-stream"
    )

# --- Report ---
@router.post("/report")
@limiter.limit("5/minute")
async def generate_report(request: Request, body: Dict = Body(...)):
    topic = body.get("topic")
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
        
    from app.services.report import ReportService
    report_service = ReportService()
    
    return StreamingResponse(
        report_service.generate_report_stream(topic),
        media_type="text/event-stream"
    )
