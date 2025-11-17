# fastapi_app.py
import uuid
from typing import Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from main import app as langgraph_app, GraphState

app = FastAPI(title="Network Infrastructure Summary API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory session storage
sessions: Dict[str, GraphState] = {}

# Request/Response Models
class UserMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    session_id: str
    agent_message: str
    done: bool

# Endpoints
@app.post("/start", response_model=ChatResponse)
def start_conversation():
    """Start a new conversation and get the first question"""
    session_id = str(uuid.uuid4())
    
    # Initialize state
    state = GraphState(
        history=[],
        extracted_info={},
        done=False,
        question_index=0
    )
    
    # Get first question
    result = langgraph_app.invoke(state, {"recursion_limit": 200})
    sessions[session_id] = result
    
    # Clean the message to ensure it's JSON serializable
    agent_message = str(result.get("next_question", "")).strip()
    
    return ChatResponse(
        session_id=session_id,
        agent_message=agent_message,
        done=result.get("done", False)
    )

@app.post("/chat/{session_id}", response_model=ChatResponse)
def send_message(session_id: str, user_msg: UserMessage):
    """Send user response and get next question"""
    
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found. Please start a new conversation.")
    
    state = sessions[session_id]
    
    if state.get("done"):
        raise HTTPException(status_code=400, detail="Conversation already completed.")
    
    # Add user message to history
    from langchain_core.messages import HumanMessage
    state["history"].append(HumanMessage(content=user_msg.message))
    
    # Store answer if it was a primary question
    nxt = state.get("next_question", "")
    if nxt.strip().startswith("[ASK Q"):
        from prompts import QUESTIONS
        qi = state["question_index"]
        if qi < len(QUESTIONS):
            state["extracted_info"][QUESTIONS[qi]] = user_msg.message
            state["question_index"] += 1
    
    # Get next question from agent
    result = langgraph_app.invoke(state, {"recursion_limit": 200})
    sessions[session_id] = result
    
    # Clean the message to ensure it's JSON serializable
    agent_message = str(result.get("next_question", "")).strip()
    
    return ChatResponse(
        session_id=session_id,
        agent_message=agent_message,
        done=result.get("done", False)
    )

@app.get("/session/{session_id}")
def get_session_info(session_id: str):
    """Get current session information"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    state = sessions[session_id]
    return {
        "session_id": session_id,
        "done": state.get("done", False),
        "question_index": state.get("question_index", 0),
        "extracted_info": state.get("extracted_info", {})
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)