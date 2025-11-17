import React from 'react';

export default function CategoryCard({ category, selected, onSelect }) {
  const { id, title, description, accent, iconUrl } = category;

  const count = category && category.subcategories ? category.subcategories.length : 0;

  return (
    <button
      className={`category-card ${selected ? 'category-card--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${title} category`}
    >
      <div className="category-card__left">
        <div className="category-card__icon-wrap" style={{ background: `${accent}17` }}>
          <img src={iconUrl} alt="" />
        </div>
      </div>

      <div className="category-card__body">
        <div className="category-card__title">{title}</div>
        <div className="category-card__desc">{description}</div>
        <div className="category-card__meta">
          <span className="pill">{count} {count === 1 ? 'subcategory' : 'subcategories'}</span>
          {/* <span className="pill muted">AI assist</span> */}
        </div>
      </div>

      <div className="category-card__chev" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}
