# main.py
import os
from typing import TypedDict, Optional, List, Dict
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_openai import AzureChatOpenAI
from prompts import generate_system_prompt, QUESTIONS

load_dotenv()
# Load environment variables
load_dotenv()
api_key = os.environ["AZURE_OPENAI_API_KEY"]
endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")

class GraphState(TypedDict, total=False):
    history: List[BaseMessage]
    next_question: Optional[str]
    done: bool
    extracted_info: Dict[str, str]
    question_index: int
    # NEW:
    answer: Optional[str]
    awaiting_answer: bool

def llm_node(state: GraphState) -> GraphState:
    llm = AzureChatOpenAI(
        azure_deployment="gpt-4o-mini",  # or your deployment
        api_version=api_version,  # or your api version
        temperature=0.3,
        max_tokens=None,
        timeout=None,
        #max_retries=2,
        # other params...
    )


    messages = state.get("history", [])
    extracted_info = state.get("extracted_info", {})
    system_prompt = generate_system_prompt(extracted_info)

    # Send system prompt correctly:
    messages_for_llm = [HumanMessage(content=system_prompt)] + messages

    response = llm.invoke(messages_for_llm)
    content = response.content or ""

    if "done" in content.lower():
        state["done"] = True
        state["next_question"] = f"✅ All information collection {content}"
    else:
        state["done"] = False
        state["next_question"] = content

    state["history"] = state.get("history", []) + [AIMessage(content=content)]
    return state

def human_node(state: GraphState) -> GraphState:
    """
    Stop the graph here if no answer is provided yet.
    When answer is provided (via state['answer']), record it and continue.
    """
    ans = (state.get("answer") or "").strip()

    if not ans:
        # We are waiting for the user to reply to next_question
        state["awaiting_answer"] = True
        return state

    # We have an answer; record it and clear the waiting flag
    state["awaiting_answer"] = False
    state["history"] = state.get("history", []) + [HumanMessage(content=ans)]

    nxt = state.get("next_question", "") or ""
    asked_primary = nxt.strip().startswith("[ASK Q")
    if asked_primary:
        qi = state.get("question_index", 0)
        if qi < len(QUESTIONS):
            state.setdefault("extracted_info", {})[QUESTIONS[qi]] = ans
            state["question_index"] = qi + 1

    # consume the answer so we don't loop
    state["answer"] = None
    return state

graph = StateGraph(GraphState)
graph.add_node("llm", llm_node)
graph.add_node("human", human_node)

graph.add_edge(START, "llm")

def route_after_llm(state: GraphState):
    # If LLM says done, end. Otherwise we need user input next.
    return "__end__" if state.get("done") else "human"

graph.add_conditional_edges(
    "llm",
    route_after_llm,
    {"human": "human", "__end__": END},
)

def route_after_human(state: GraphState):
    # If we're waiting for an answer, stop run so API can return the question.
    # If we got an answer, proceed to LLM to validate/ask next.
    return "__end__" if state.get("awaiting_answer") else "llm"

graph.add_conditional_edges(
    "human",
    route_after_human,
    {"llm": "llm", "__end__": END},
)

app = graph.compile()
# def get_graph():
#     return graph
