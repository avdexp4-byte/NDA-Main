import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
// import styles from "./CategoryPanel.module.css";

// Component that manages the AI conversation (uses FastAPI endpoints)
function AIAgentInteraction() {
  const [sessionId, setSessionId] = useState(null);
  const [agentMessage, setAgentMessage] = useState("");
  const [messages, setMessages] = useState([]); // {role:'agent'|'user', text, qnum}
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [lastQnum, setLastQnum] = useState(null); // track last primary question number
  const historyRef = useRef(null);

  // Auto-scroll chat history to bottom when messages change
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages]);

  const API_BASE = (typeof window !== 'undefined' && window.location.hostname === 'localhost') ? 'http://localhost:8000' : 'http://localhost:8000';

  async function startConversation() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/start`, { method: 'POST' });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setSessionId(data.session_id);
      setAgentMessage(data.agent_message || '');
      setDone(Boolean(data.done));
      // record last question number if present
      const p = parseAgentMessage(data.agent_message || '');
      if (p.qnum) setLastQnum(p.qnum);
  // initialize chat history with agent first message
  setMessages([{ role: 'agent', text: data.agent_message || '', qnum: p.qnum ?? null }]);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  // Parse agent message tags like "[ASK Q1]" and return a friendly display
  function parseAgentMessage(msg) {
    if (!msg) return { display: "", qnum: null };
    const m = msg.match(/^\s*\[ASK Q(\d+)\]\s*(.*)$/i);
    if (m) {
      const qn = parseInt(m[1], 10);
      const rest = m[2] || "";
      return { display: `Question ${qn}: ${rest}`, qnum: qn };
    }
    return { display: msg, qnum: null };
  }

  async function sendAnswer(e) {
    e && e.preventDefault();
    if (!sessionId) return setError('No session. Click "Interact with AI Agent" first.');
    if (!inputValue.trim()) return setError('Please provide an answer.');
    setLoading(true);
    setError("");
    try {
      // append user message to current question history immediately
      setMessages((prev) => [...prev, { role: 'user', text: inputValue, qnum: lastQnum ?? null }]);
      const res = await fetch(`${API_BASE}/chat/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputValue }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server error (${res.status}): ${txt}`);
      }
      const data = await res.json();
      setAgentMessage(data.agent_message || '');
      setDone(Boolean(data.done));
      // update last question number when backend returns a new primary question
      const p = parseAgentMessage(data.agent_message || '');
      if (p.qnum) {
        // It's a new primary question: replace the current persistent chat with the new question
        setLastQnum(p.qnum);
        setMessages([{ role: 'agent', text: data.agent_message || '', qnum: p.qnum }]);
      } else {
        // Clarification or regular agent reply: append to current question history
        setMessages((prev) => [...prev, { role: 'agent', text: data.agent_message || '', qnum: null }]);
      }
      setInputValue('');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSessionId(null);
    setAgentMessage('');
    setInputValue('');
    setDone(false);
    setError('');
    setMessages([]);
    setLastQnum(null);
  }

  // Helper to render final markdown when done
  if (done) {
    // agentMessage may start with 'Done' per backend contract; strip it
    const trimmed = (agentMessage || '').replace(/^Done\s*[:\-]?/i, '').trim();
    return (
      <div>
        <div style={{ marginBottom: 12 }}>
          <strong>Result</strong>
        </div>
        <div className="agent-markdown">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{trimmed || agentMessage || ''}</ReactMarkdown>
        </div>
        <div className="panel-actions" style={{ marginTop: 12 }}>
          <button className="btn-back" onClick={reset}>Start New</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!sessionId ? (
        <div>
          <p>Start an interactive session with the AI agent to collect building & coverage requirements.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" type="button" onClick={startConversation} disabled={loading}>
              {loading ? 'Starting…' : 'Interact with AI Agent'}
            </button>
          </div>
          {error && <div className="form-error" style={{ marginTop: 8 }}>{error}</div>}
        </div>
      ) : (
        <form onSubmit={sendAnswer}>
          {/* Chat history */}
          <div ref={historyRef} className="chat-history" style={{ marginBottom: 12, width: '100%' }}>
            {messages.map((m, i) => {
              const parsed = parseAgentMessage(m.text || '');
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  {m.role === 'agent' ? (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <img src="icons/robot.svg" alt="AI" style={{ width: '28px', height: '28px', marginTop: '4px', filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.2))' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--muted-1)', marginBottom: 6 }}>{m.qnum ? `Question ${m.qnum}` : 'Agent'}</div>
                        <div className="agent-question" style={{ maxWidth: '100%', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{parsed.display || m.text}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px', alignItems: 'flex-start' }}>
                      <img src="icons/user.svg" alt="User" style={{ width: '28px', height: '28px', marginTop: '4px', filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.2))' }} />
                      <div style={{ background: 'linear-gradient(90deg,#f3f4ff,#e6fffa)', color: '#07133b', padding: '8px 12px', borderRadius: 8, maxWidth: '100%', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{m.text}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {(() => {
            const parsed = parseAgentMessage(agentMessage || "");
            // Determine header: primary question or clarification for last seen question
            let header = null;
            if (parsed.qnum) {
              header = `Question ${parsed.qnum} of 5`;
            } else if (lastQnum) {
              header = `Clarification for Question ${lastQnum}`;
            }

            return (
              <>
                {/* header removed per request: remove 'Question N of 5' above input */}

                <div className="form-group">
                  <label htmlFor="agent-response" style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)', marginBottom: 8, display: 'block' }}>Your answer</label>
                  <input
                    id="agent-response"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your answer here"
                    autoComplete="off"
                    autoFocus
                  />
                  {error && <div className="form-error">{error}</div>}
                </div>
              </>
            );
          })()}

          <div className="panel-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn-back" onClick={reset} disabled={loading}>Cancel</button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Sending…' : 'Send Answer'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function CategoryPanel({ category, onClose }) {
  const [answers, setAnswers] = useState(
    category && Array.isArray(category.subcategories)
      ? category.subcategories.reduce((acc, curr) => {
          acc[curr.id] = ""; // Initialize answers with empty strings
          return acc;
        }, {})
      : {}
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    // reset local state whenever the selected category changes
    setAnswers(
      category && Array.isArray(category.subcategories)
        ? category.subcategories.reduce((acc, curr) => {
            acc[curr.id] = "";
            return acc;
          }, {})
        : {}
    );
    setCurrentIndex(0);
    setError("");
    setFinished(false);
  }, [category]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  // Called when the user submits a single-question form.
  const handleQuestionSubmit = (e) => {
    e.preventDefault();
    if (!category || !Array.isArray(category.subcategories)) return;

    const sub = category.subcategories[currentIndex];
    const val = (answers[sub.id] || "").trim();
    if (!val) {
      setError("Please answer this question before continuing.");
      return;
    }
    setError("");

    if (currentIndex < category.subcategories.length - 1) {
      setCurrentIndex((ci) => ci + 1);
    } else {
      // final submit
      setFinished(true);
      console.log("Final submission with answers:", answers);
    }
  };

  // If no category is selected, render an empty panel to keep DOM present
  if (!category) {
    return <div className="category-panel" aria-hidden="true" />;
  }

  return (
    <div className="category-panel" aria-live="polite" aria-atomic="true">
      <div className="panel-top">
        <div className="panel-head">
          <div>
            <div className="panel-badge">{category.title}</div>
            {category.description && (
              <div className="panel-desc" style={{ marginTop: 8 }}>
                {category.description}
              </div>
            )}
          </div>

          <div>
            <button
              className="btn-close"
              onClick={onClose}
              aria-label="Close subcategory panel"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Render subcategories */}
      <div className="panel-subcategories" role="list" aria-label="Subcategories">
        {(category.id === "site-details" || category.id === "network") ? (
          // Render questions (form) for "Site Details" and "Network" one at a time
          (finished ? (
            <div className="panel-form panel-form--finished">
              <h3>All done — thank you!</h3>
              <p>Here's a summary of your answers:</p>

              {/* Render a Markdown-style summary using the category's subcategory titles */}
              <div className="answers-summary">
                <ul>
                  {category.subcategories.map((sub, idx) => (
                    <li key={sub.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <strong>{sub.title}:</strong> {String(answers[sub.id] ?? "") || <em>—</em>}
                      </div>
                      <div>
                        <button
                          type="button"
                          className="btn-edit-mini"
                          onClick={() => {
                            // allow editing this specific question
                            setFinished(false);
                            setCurrentIndex(idx);
                            setError("");
                          }}
                          aria-label={`Edit ${sub.title}`}
                        >
                          {/* pencil icon (SVG) — icon-only button */}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor" />
                            <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel-actions" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className="btn-back"
                  onClick={() => {
                    // clear answers and restart the form
                    const empty = category.subcategories.reduce((acc, cur) => {
                      acc[cur.id] = "";
                      return acc;
                    }, {});
                    setAnswers(empty);
                    setFinished(false);
                    setCurrentIndex(0);
                    setError("");
                  }}
                >
                  Start Again
                </button>
              </div>

              {/* Removed raw Markdown source per request; only the rendered summary is shown */}
            </div>
          ) : (
            <form className="panel-form" onSubmit={handleQuestionSubmit}>
              {
                // render only the current question
              }
              {category.subcategories && category.subcategories.length > 0 && (
                (() => {
                  const sub = category.subcategories[currentIndex];
                  const isNetwork = category.id === 'network';
                  return (
                    <div key={sub.id} className="form-group">
                      <div className="question-progress" style={{ marginBottom: 8, fontSize: 13, color: 'var(--muted-1)'}}>
                        Question {currentIndex + 1} of {category.subcategories.length}
                      </div>
                      <label htmlFor={sub.id}>{sub.title}</label>
                      {isNetwork ? (
                        <div className="choice-row" role="radiogroup" aria-labelledby={sub.id}>
                          <button
                            type="button"
                            className={`choice-btn ${answers[sub.id] === 'Yes' ? 'choice-btn--selected' : ''}`}
                            onClick={() => { setAnswers((p) => ({ ...p, [sub.id]: 'Yes' })); setError(''); }}
                            aria-pressed={answers[sub.id] === 'Yes'}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            className={`choice-btn ${answers[sub.id] === 'No' ? 'choice-btn--selected' : ''}`}
                            onClick={() => { setAnswers((p) => ({ ...p, [sub.id]: 'No' })); setError(''); }}
                            aria-pressed={answers[sub.id] === 'No'}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            id={sub.id}
                            name={sub.id}
                            value={answers[sub.id] || ""}
                            onChange={handleInputChange}
                            placeholder={sub.description}
                            autoComplete="off"
                            autoFocus
                          />
                        </>
                      )}
                      {error && <div className="form-error">{error}</div>}
                    </div>
                  );
                })()
              )}

              <div className="panel-actions" style={{ justifyContent: currentIndex > 0 ? 'center' : 'flex-start' }}>
                {currentIndex > 0 && (
                  <button
                    type="button"
                    className="btn-back"
                    onClick={() => { setCurrentIndex((ci) => Math.max(0, ci - 1)); setError(""); }}
                  >
                    Back
                  </button>
                )}

                <button type="submit" className="submit-button">
                  {currentIndex < (category.subcategories?.length || 0) - 1 ? 'Next' : 'Finish'}
                </button>
              </div>
            </form>
          ))
        ) : (
          // For other categories, render either a single AI action (security)
          // or the regular subcategory cards for anything else.
          (category.id === 'building-coverage' ? (
            <div className="panel-form panel-form--security">
                {/* Security / Building and Coverage -> AI-driven multi-question flow */}
                <AIAgentInteraction />
            </div>
          ) : (
            // Render regular subcategory cards for other non-question categories
            category.subcategories.map((s) => (
              <article
                key={s.id ?? `${category.id}-sub`}
                className="subcat-card"
                role="listitem"
                tabIndex={0}
                aria-label={s.title}
              >
                <div className="subcat-card__meta">
                  <div className="subcat-card__title">{s.title}</div>
                  {s.desc && <div className="subcat-card__desc">{s.desc}</div>}
                </div>

                <div className="subcat-card__actions">
                  <button
                    className="subcat-secondary"
                    onClick={() => alert(`More info: ${s.title}`)}
                    aria-label={`More info about ${s.title}`}
                    type="button"
                  >
                    Info
                  </button>
                  <button
                    className="subcat-open"
                    onClick={() => alert(`Open agent for: ${s.title}`)}
                    aria-label={`Open agent for ${s.title}`}
                    type="button"
                  >
                    Open
                  </button>
                </div>
              </article>
            ))
          ))
        )}
      </div>

      <div className="panel-footer">
        {(category.id === "site-details" || category.id === 'network') && !finished ? (
          <p className="panel-note panel-note--required">Fill in the details for your project site. Each question is required.</p>
  ) : category.id === 'building-coverage' ? null : (
          !finished && <p className="panel-note">Pick a subcategory to get started.</p>
        )}
      </div>
    </div>
  );
}
