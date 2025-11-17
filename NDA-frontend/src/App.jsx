import React, { useState, useEffect, useRef } from "react";
import CategoryGrid from "./components/CategoryGrid";
import CategoryPanel from "./components/CategoryPanel";
import categories from "./data/categories"; // Import the updated categories data

export default function App() {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize theme synchronously from localStorage or system preference
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
    } catch (e) {
      // ignore (e.g., during SSR or unusual env)
    }
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });
  const closeTimerRef = useRef(null);

  const PANEL_CLOSE_DURATION = 320; // Match CSS timing

  // No separate mount loader — darkMode is initialized synchronously so
  // the effect below will run once with the correct value.

  const applyThemeWithTransition = (toDark) => {
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const body = document.body;

    if (prefersReduced) {
      body.classList.toggle("dark", toDark);
      localStorage.setItem("theme", toDark ? "dark" : "light");
      return;
    }

    body.classList.add("theme-transition");
    if (toDark) {
      body.classList.add("dark");
    } else {
      setTimeout(() => body.classList.remove("dark"), 50);
    }

    localStorage.setItem("theme", toDark ? "dark" : "light");
    setTimeout(() => body.classList.remove("theme-transition"), 260);
  };

  useEffect(() => {
    applyThemeWithTransition(darkMode);
  }, [darkMode]);

  // Get selected category
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  );

  function handleSelectCategory(id) {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (selectedCategoryId === id) {
      // Close panel
      setPanelOpen(false);
      closeTimerRef.current = setTimeout(() => {
        setSelectedCategoryId(null);
        closeTimerRef.current = null;
      }, PANEL_CLOSE_DURATION);
    } else {
      setSelectedCategoryId(id);
      setPanelOpen(true);
    }
  }

  function handleClosePanel() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPanelOpen(false);
    closeTimerRef.current = setTimeout(() => {
      setSelectedCategoryId(null);
      closeTimerRef.current = null;
    }, PANEL_CLOSE_DURATION);
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="app-wrapper">
      {/* ---------- Header ---------- */}
      <header className="site-header">
        <div className="container header-inner">
          <div className="brand" role="banner">
            <div className="brand__logo" aria-hidden="true">
              <img
                src="/images/logo-neom.webp"
                alt="NEOM Logo"
                width="36"
                height="36"
                style={{ objectFit: "contain" }}
              />
            </div>
            <div className="brand__text">
              <div className="brand__title">Network Demand Agent</div>
              <div className="brand__subtitle">Powered by AI</div>
            </div>
          </div>

          <nav className="header-actions" aria-label="Top actions">
            <button
              className="theme-toggle"
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? "Change to Light Mode" : "Change to Dark Mode"}
              aria-pressed={darkMode}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button className="cta" type="button">
              Sign in
            </button>
          </nav>
        </div>
      </header>

      <main className="container main-content">
        <div className="hero">
          <div>
            <h1 className="page-title">Select a Service Request — choose a category</h1>
            <p className="lead">
              Select a category to reveal relevant subcategories below. Click a
              subcategory to launch the agent.
            </p>
          </div>
        </div>

        <CategoryGrid
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelect={handleSelectCategory}
        />

        <div
          className={`panel-wrapper ${panelOpen ? "open" : ""}`}
          onClick={(e) => {
            // click on overlay (outside panel)
            if (e.target === e.currentTarget) {
              handleClosePanel();
            }
          }}
        >
          <CategoryPanel category={selectedCategory} onClose={handleClosePanel} />
        </div>
      </main>

      <footer className="site-footer">
        <div className="footer-inner container">
          <div className="copyright">
            © {new Date().getFullYear()} TATA Consultancy Services
          </div>
          <div className="footer-links">
            <a href="#help">Help</a>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
