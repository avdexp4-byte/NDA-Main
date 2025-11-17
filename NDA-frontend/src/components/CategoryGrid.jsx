// src/components/CategoryGrid.jsx
import React from "react";

export default function CategoryGrid({ categories = [], selectedCategoryId, onSelect = () => {} }) {
  return (
    <section className="category-grid" role="list" aria-label="Categories">
      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
  const dbgCount = cat.subcategories?.length ?? 0;

  console.log('[CategoryGrid] id=', cat.id, 'count=', dbgCount, 'type=', typeof cat.subcategories, 'preview=', (typeof cat.subcategories === 'string' ? cat.subcategories.slice(0,64) : JSON.stringify(cat.subcategories).slice(0,128)));

        return (
          <article
            key={cat.id}
            role="listitem"
            className={`category-card ${isSelected ? "category-card--selected" : ""}`}
            data-accent={cat.id}
            onClick={() => onSelect(cat.id)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(cat.id);
            }}
            aria-pressed={isSelected}
          >
            {/* ICON WRAPPER */}
            <div
              className="category-card__icon-wrap"
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: 14,
                flexShrink: 0,
                overflow: "hidden",
                // ✅ Light background tint matching accent color
                backgroundColor: `${cat.accent}15`, // translucent background
              }}
            >
              {cat.iconUrl ? (
                <img
                  src={cat.iconUrl}
                  alt={cat.title}
                  style={{ width: 38, height: 38, display: "block", objectFit: "contain" }}
                  draggable={false}
                />
              ) : cat.icon ? (
                <div
                  style={{
                    width: 38,
                    height: 38,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {cat.icon}
                </div>
              ) : (
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="5" width="18" height="6" rx="1.5" fill={cat.accent} />
                </svg>
              )}
            </div>

            {/* CARD BODY */}
            <div className="category-card__body">
              <div className="category-card__title">{cat.title}</div>
              <div className="category-card__desc">{cat.description}</div>
              <div className="category-card__meta">
                {(() => {
                  const count = cat.subcategories?.length ?? 0;
                  return (
                    <span className="pill">{count} {count === 1 ? 'subcategory' : 'subcategories'}</span>
                  );
                })()}
              </div>
            </div>

            {/* CHEVRON ICON */}
            <div className="category-card__chev" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </article>
        );
      })}
    </section>
  );
}
