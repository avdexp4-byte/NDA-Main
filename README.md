# Network Demand Agent

A full-stack AI-powered application that collects network infrastructure requirements through an interactive conversational interface. The backend uses LangGraph and Azure OpenAI to orchestrate multi-turn conversations, while the frontend provides a responsive React UI for user interaction.

## Project Overview

The **Network Demand Agent** guides users through a structured questionnaire to gather data for network infrastructure planning. It consists of two main components:

- **Backend (FastAPI):** Manages conversation state, orchestrates LLM interactions, and persists session data.
- **Frontend (React/Vite):** Provides a modern UI for category selection and real-time chat with the AI agent.

### Key Features

- **Multi-turn conversations** with state management via LangGraph.
- **Azure OpenAI integration** for intelligent Q&A orchestration.
- **Session-based chat** with in-memory storage (or Redis for production).
- **CORS-enabled REST API** for frontend-backend communication.
- **Responsive design** with dark mode support.
- **Real-time message streaming** with auto-scroll chat history.
- **Structured data extraction** into a Bill of Quantities (BoQ) format.

---

## Project Structure

```
Network Demand Agent/
├── lg-fastapi-exp/                 # Backend (FastAPI + LangGraph)
│   ├── fastapi_app.py              # FastAPI endpoints and session management
│   ├── main.py                      # LangGraph state machine and LLM orchestration
│   ├── prompts.py                   # Question list and system prompt templates
│   ├── pyproject.toml               # Python dependencies and project metadata
│   └── .env                         # Environment variables (Azure OpenAI credentials)
│
└── NDA-frontend/                   # Frontend (React + Vite)
    ├── src/
    │   ├── App.jsx                  # Root component with theme management
    │   ├── main.jsx                 # React entry point
    │   ├── components/
    │   │   ├── CategoryGrid.jsx      # Grid of service categories
    │   │   ├── CategoryPanel.jsx     # Panel with subcategories and AI chat
    │   │   └── CategoryCard.jsx      # Individual category card
    │   ├── data/
    │   │   └── categories.jsx        # Category and subcategory data
    │   └── styles/                   # CSS modules (animations, theme, layout)
    ├── public/
    │   ├── icons/                    # SVG icons (robot, user, etc.)
    │   └── images/                   # Images (logo, branding)
    ├── index.html                    # HTML entry point
    ├── vite.config.js                # Vite configuration
    └── package.json                  # Node dependencies

```

---

## Architecture

### Backend Architecture (LangGraph State Machine)

```
┌─────────────────────────────────────────────────────────────┐
│                       FastAPI Endpoints                      │
├─────────────────────────────────────────────────────────────┤
│  POST /start          → Initialize session, get first Q     │
│  POST /chat/{sid}     → Send user answer, get next Q        │
│  GET /session/{sid}   → Fetch session metadata              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            Session Storage (In-Memory Dict)                 │
│  sessions: Dict[str, GraphState]                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│             LangGraph State Machine (main.py)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         START                                              │
│           ↓                                                │
│        [LLM Node]  ← Generate next question/validation  │
│           ↓                                                │
│        done? ──YES→ END                                   │
│           ↓ NO                                             │
│      [Human Node]  ← Wait for user input                 │
│           ↓                                                │
│      has_answer? ──NO→ END (pause for API response)      │
│           ↓ YES                                            │
│        ┌──────┘ (loop back to LLM)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│        Azure OpenAI (GPT-4o-mini)                           │
│  • System prompt: Question list + extracted answers JSON  │
│  • Message history: All prior turns                        │
│  • Response: Next question or final BoQ                   │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

```
┌─────────────────┐
│    App.jsx      │ (Theme & category selection)
├─────────────────┤
│ CategoryGrid    │ (Display all categories)
│  └─ CategoryCard│ (Individual category tile)
│
│ CategoryPanel   │ (Subcategory view)
│  └─ AIAgent     │ (Chat interface for selected category)
│     Interaction │
│                 │
│    REST Calls   │
│    ↓ ↑          │
│  /start         │
│  /chat/{sid}    │
│  /session/{sid} │
└─────────────────┘
```

---

## Data Flow

### Request/Response Example (AI Chat Flow)

1. **User clicks "Interact with AI Agent":**
   ```
   Frontend:  POST /start (empty body)
   Backend:   → Create session, init GraphState, invoke LLM node
   Response:  { session_id: "...", agent_message: "[ASK Q1] How many buildings...", done: false }
   Frontend:  Display agent_message, parse [ASK Q1] tag, show "Question 1 of 5"
   ```

2. **User enters answer (e.g., "3 buildings"):**
   ```
   Frontend:  POST /chat/{session_id} with body { message: "3 buildings" }
   Backend:   → Append HumanMessage to history
              → If previous Q was primary [ASK Qn], record answer to extracted_info[QUESTIONS[n]]
              → Invoke LLM node: pass history + system prompt to Azure OpenAI
              → LLM returns next Q or "Done" keyword
   Response:  { agent_message: "[ASK Q2] For each building...", done: false }
   Frontend:  Append user & agent messages to chat history, parse new Q, continue
   ```

3. **Conversation ends when LLM outputs "Done":**
   ```
   Backend:   llm_node detects "done" in response, sets done=True
   Response:  { agent_message: "Done\n# Network Infrastructure Summary\n...", done: true }
   Frontend:  Switch to "Done" view, render Markdown report, show "Start New" button
   ```

### Question Tagging & Extraction

The system uses a tagging convention to coordinate question flow:
- **Primary questions** are prefixed in the LLM response: `[ASK Q1]`, `[ASK Q2]`, etc.
- **Clarifications** have no tag (just the text).
- When frontend sees `[ASK Qn]` after sending an answer, it records the prior answer as the answer to QUESTIONS[n].
- This ensures the backend's `extracted_info` dict maps exact question text → user answer.

---

## API Contract

### Endpoints

#### `POST /start`
**Start a new conversation session.**
- **Request Body:** (empty)
- **Response:**
  ```json
  {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "agent_message": "[ASK Q1] How many buildings need to be covered by the network infrastructure?",
    "done": false
  }
  ```
- **Status Codes:** 200 (OK), 500 (server error)

#### `POST /chat/{session_id}`
**Send user message and get next agent response.**
- **Path Params:** `session_id` (UUID string)
- **Request Body:**
  ```json
  {
    "message": "We have 3 buildings."
  }
  ```
- **Response:**
  ```json
  {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "agent_message": "[ASK Q2] For each building, how many rooms...",
    "done": false
  }
  ```
- **Status Codes:** 200 (OK), 404 (session not found), 400 (conversation done), 500 (error)

#### `GET /session/{session_id}`
**Retrieve current session metadata (for debugging/monitoring).**
- **Path Params:** `session_id` (UUID string)
- **Response:**
  ```json
  {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "done": false,
    "question_index": 2,
    "extracted_info": {
      "How many buildings need to be covered by the network infrastructure?": "3 buildings",
      "For each building, how many rooms need WiFi coverage? ...": "Building A: 20 rooms, Building B: 15..."
    }
  }
  ```
- **Status Codes:** 200 (OK), 404 (session not found)

---

## Setup & Installation

### Prerequisites

- **Python 3.9+** (backend)
- **Node.js 18+** (frontend)
- **Azure OpenAI account** with deployed GPT-4o-mini model
- **Git** (optional, for cloning)

### Backend Setup

1. **Navigate to the backend directory:**
   ```powershell
   cd "Network Demand Agent\lg-fastapi-exp"
   ```

2. **Create a Python virtual environment (optional but recommended):**
   ```powershell
   python -m venv venv
   venv\Scripts\Activate.ps1
   ```

3. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   # or if using pyproject.toml:
   pip install -e .
   ```
   
   **Required packages:**
   - `fastapi`
   - `uvicorn`
   - `langgraph`
   - `langchain-core`
   - `langchain-openai`
   - `python-dotenv`
   - `pydantic`

4. **Set up environment variables:**
   
   Create or update `.env` file in `lg-fastapi-exp/` with:
   ```
   AZURE_OPENAI_API_KEY=your_azure_openai_api_key
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
   AZURE_OPENAI_API_VERSION=2024-08-01-preview
   ```
   
   > **Note:** Obtain these from your Azure OpenAI resource in the Azure Portal (Keys & Endpoints).

5. **Run the backend server:**
   ```powershell
   uvicorn fastapi_app:app --reload --host 0.0.0.0 --port 8000
   ```
   
   Expected output:
   ```
   INFO:     Uvicorn running on http://0.0.0.0:8000
   INFO:     Application startup complete
   ```

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```powershell
   cd "Network Demand Agent\NDA-frontend"
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Run the development server:**
   ```powershell
   npm run dev
   ```
   
   Expected output:
   ```
   VITE v7.2.2  ready in 123 ms

   ➜  Local:   http://localhost:5173/
   ➜  press h to show help
   ```

4. **Open in browser:**
   
   Navigate to `http://localhost:5173/` (or the URL shown in terminal).

### Running Both Together

**In one PowerShell window (Backend):**
```powershell
cd "Network Demand Agent\lg-fastapi-exp"
# venv\Scripts\Activate.ps1  # if using venv
uvicorn fastapi_app:app --reload --port 8000
```

**In another PowerShell window (Frontend):**
```powershell
cd "Network Demand Agent\NDA-frontend"
npm run dev
```

---

## Usage

### Frontend User Flow

1. **Landing page:** Select a service category from the grid (e.g., "Building Coverage").
2. **Category panel opens:** Depending on the category:
   - **Site Details / Network:** Fill out a questionnaire one question at a time (stored locally, no backend call).
   - **Building Coverage:** Click "Interact with AI Agent" to start a chat session with the LLM.
3. **Chat interface:** 
   - Read the agent's question.
   - Type your answer in the input field.
   - Click "Send Answer" or press Enter.
   - Agent validates and asks the next question.
4. **Completion:** When all 5 questions are answered, the agent outputs "Done" and displays a Markdown-formatted Network Infrastructure Requirements Summary (BoQ).
5. **Start New:** Click "Start New" to reset and begin another session.

### Example Questions

The backend asks 5 primary questions in sequence:

1. How many buildings need to be covered by the network infrastructure?
2. For each building, how many rooms need WiFi coverage? (include room size and occupant count)
3. How many rooms in each building require wired internet access? (include dimensions and occupants)
4. Will you need access to ABC's corporate IT applications like SAP, SmartGate, or community portals?
5. How many printers are required per building and per room? (include specialized equipment)

---

## Backend Components

### File: `fastapi_app.py`

**Purpose:** REST API endpoints and session lifecycle.

**Key Functions:**
- `start_conversation()` — Initialize session, invoke graph, return first question.
- `send_message(session_id, user_msg)` — Record user answer, reinvoke graph, return next question or done state.
- `get_session_info(session_id)` — Retrieve current session metadata.

**Session Storage:**
```python
sessions: Dict[str, GraphState] = {}  # In-memory storage; replace with Redis for production
```

### File: `main.py`

**Purpose:** LangGraph state machine and LLM orchestration.

**Key Components:**

- **GraphState (TypedDict):**
  - `history`: List of LangChain message objects (HumanMessage, AIMessage, SystemMessage).
  - `next_question`: The agent's last-generated message (string).
  - `done`: Boolean flag indicating conversation completion.
  - `extracted_info`: Dict mapping question text → user answer.
  - `question_index`: Tracks which question we're on (0–4).
  - `answer`: Transient field used by human_node to inject user input.
  - `awaiting_answer`: Flag indicating whether the graph should pause and wait for user input.

- **llm_node(state):**
  - Retrieves Azure OpenAI LLM.
  - Builds system prompt via `generate_system_prompt(extracted_info)`.
  - Sends message history to LLM.
  - Detects "done" keyword in response to set `done=True`.
  - Appends LLM response to message history.

- **human_node(state):**
  - If `state["answer"]` is empty, sets `awaiting_answer=True` and pauses execution (so API can return question to client).
  - If answer present, appends it to history and updates `extracted_info` if it was a primary question.

- **Conditional Edges:**
  - After `llm_node`: If `done` → END; else → `human_node`.
  - After `human_node`: If `awaiting_answer` → END (pause); else → `llm_node`.

### File: `prompts.py`

**Purpose:** Question definitions and system prompt generation.

**Key Functions:**

- `QUESTIONS` — List of 5 primary questions (strings).
- `generate_system_prompt(extracted_info)` — Generates the system prompt that:
  - Lists all 5 questions.
  - Embeds current extracted answers as JSON.
  - Instructs the model to:
    - Ask primary questions with `[ASK Qn]` prefix.
    - Never skip questions; ask in order.
    - Validate completeness and clarity.
    - Output "Done" when all answers are sufficiently answered.
    - Return a Markdown BoQ upon completion.

---

## Frontend Components

### File: `App.jsx`

**Purpose:** Root component with theme management and category selection.

**Key Features:**
- Dark mode toggle with localStorage persistence.
- Header with branding and actions.
- Category grid and panel wrapper.
- Footer with links.

**State:**
- `selectedCategoryId`: Currently selected category.
- `panelOpen`: Whether the panel is open.
- `darkMode`: Theme preference.

### File: `CategoryPanel.jsx`

**Purpose:** Renders category details and handles user interaction.

**Sub-components:**

1. **AIAgentInteraction():**
   - Manages AI chat for categories like "building-coverage".
   - Key functions:
     - `startConversation()` — Call `POST /start`.
     - `sendAnswer(e)` — Call `POST /chat/{sessionId}`.
     - `parseAgentMessage(msg)` — Parse `[ASK Qn]` tags to extract question number and friendly text.
   - Displays chat history with agent and user messages.
   - Shows input field for user answers.
   - On completion, renders final Markdown report.

2. **Standard Form Handler:**
   - For categories like "site-details" and "network".
   - Displays one question at a time locally.
   - Submits to a summary screen (no backend call).

### File: `CategoryGrid.jsx`

**Purpose:** Grid layout for all categories.

**Props:**
- `categories`: Array of category objects.
- `selectedCategoryId`: Currently selected category ID.
- `onSelect`: Callback when a category is clicked.

### File: `categories.jsx`

**Purpose:** Static data defining categories and subcategories.

**Structure:**
```javascript
[
  {
    id: 'building-coverage',
    title: 'Building & Coverage Requirements',
    description: '...',
    accent: '#FF6B6B',  // Accent color
    subcategories: [...]
  },
  // ... more categories
]
```

---

## Environment Variables

### Backend (.env file)

```
# Azure OpenAI Credentials
AZURE_OPENAI_API_KEY=your_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

### Frontend (Optional, in future)

Currently hardcoded in `CategoryPanel.jsx`:
```javascript
const API_BASE = 'http://localhost:8000';
```

**Recommended:** Move to `.env.local` and reference via `import.meta.env.VITE_API_BASE`.

---

## Common Issues & Troubleshooting

### Backend Issues

**Issue:** `ModuleNotFoundError: No module named 'fastapi'`
- **Solution:** Install dependencies: `pip install -r requirements.txt`

**Issue:** `CORS error when frontend calls backend`
- **Solution:** Backend has CORS enabled for all origins. Ensure backend is running on `http://localhost:8000` and frontend calls that address. Check browser console for exact error.

**Issue:** `AZURE_OPENAI_API_KEY not found`
- **Solution:** Create `.env` file in `lg-fastapi-exp/` with the required credentials. Use `dotenv.load_dotenv()` to load.

**Issue:** LLM not generating questions with `[ASK Qn]` tags
- **Solution:** The system prompt in `generate_system_prompt()` instructs the model to use these tags. If LLM ignores, it may be due to:
  - Model not understanding instructions (temperature too high; try 0.3).
  - System prompt not being sent correctly. Check `llm_node` in `main.py` — use `SystemMessage` instead of `HumanMessage` for clarity.

### Frontend Issues

**Issue:** `npm install fails`
- **Solution:** Ensure Node.js 18+ is installed. Try `npm cache clean --force` and retry.

**Issue:** Frontend shows blank screen or 404 errors
- **Solution:** Ensure Vite dev server is running (`npm run dev`) and you're visiting `http://localhost:5173/`.

**Issue:** "Failed to connect to backend" or 404 on `/start`
- **Solution:** 
  1. Verify backend server is running: `http://localhost:8000` should respond.
  2. Check that the `API_BASE` URL in `CategoryPanel.jsx` matches your backend URL.
  3. Ensure CORS is enabled (it is, by default).

---

## Production Deployment

### Backend

1. **Replace in-memory session storage with Redis or a database:**
   ```python
   # Instead of sessions: Dict[str, GraphState] = {}
   import redis
   redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
   ```

2. **Use `SystemMessage` for system prompts:**
   ```python
   messages_for_llm = [SystemMessage(content=system_prompt)] + messages
   ```

3. **Add structured response detection instead of substring matching:**
   - Have the LLM return JSON: `{ "status": "done", "report": "..." }`

4. **Run with a production ASGI server:**
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker fastapi_app:app --bind 0.0.0.0:8000
   ```

5. **Set secure CORS origins:**
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://yourdomain.com"],  # Specific domain
       allow_credentials=True,
       allow_methods=["GET", "POST"],
       allow_headers=["*"],
   )
   ```

6. **Add authentication (e.g., API keys or JWT tokens).**

### Frontend

1. **Build for production:**
   ```powershell
   npm run build
   ```
   Output: `dist/` folder with optimized assets.

2. **Deploy to a static host (Vercel, Netlify, etc.) or your own server.**

3. **Use environment variables for API endpoint:**
   - Create `.env.production` with `VITE_API_BASE=https://api.yourdomain.com`
   - Update `CategoryPanel.jsx` to use `import.meta.env.VITE_API_BASE`.

---

## Development Tips

### Hot Reload

- **Backend:** `uvicorn --reload` automatically restarts on file changes.
- **Frontend:** Vite dev server automatically hot-swaps changes.

### Debugging

- **Backend:** Add `print()` statements in `main.py` or use a debugger (e.g., `pdb`).
- **Frontend:** Use browser DevTools (F12) → Console for JavaScript errors, Network tab for API calls.

### Logging

- **Backend:** Add logging to `fastapi_app.py` for request/response tracking:
  ```python
  import logging
  logger = logging.getLogger(__name__)
  logger.info(f"Starting conversation: {session_id}")
  ```

- **Frontend:** Browser console logs are your friend. The code includes debug statements like `console.log('[CategoryGrid] ...')`.

---

## Dependencies

### Backend

See `lg-fastapi-exp/pyproject.toml`:
```toml
[project]
dependencies = [
    "fastapi",
    "uvicorn",
    "langgraph",
    "langchain-core",
    "langchain-openai",
    "python-dotenv",
    "pydantic",
]
```

### Frontend

See `NDA-frontend/package.json`:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^8.0.7",
    "rehype-sanitize": "^5.0.1"
  }
}
```

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally.
3. Commit and push: `git commit -m "Add your feature"` and `git push origin feature/your-feature`
4. Open a pull request.

---

## License

© 2025 TATA Consultancy Services. All rights reserved.

---

## Support & Contact

For issues, questions, or suggestions:
- **Backend:** Check `lg-fastapi-exp/` logs and `.env` setup.
- **Frontend:** Review browser console and ensure API endpoint is correct.
- **General:** Refer to this README or contact the development team.

---

## Changelog

### v0.1.0 (November 2025)
- Initial release with multi-turn AI conversations.
- Category-based UI with responsive design.
- Azure OpenAI integration for question generation.
- Dark mode support and session management.
