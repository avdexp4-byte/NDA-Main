// src/data/categories.jsx
const categories = [
  {
    id: "site-details",  // Changed ID to 'site-details'
    title: "Site Details", // Changed title
    description: "Project and Location Details", // Changed description
    accent: "#06b6d4",
    iconUrl: "/icons/building.svg", // Original icon
    subcategories: [
      { id: "project-name", title: "Project Name", description: "Enter the project name" },
      { id: "building-site", title: "Building Site Name", description: "Enter the building site name" },
      { id: "sector-name", title: "Proponent Sector", description: "Name of the sector who owns the Budget" },
    ],
  },
  {
    id: "network",
    title: "Network",
    description: "Connectivity requirements",
    accent: "#8b5cf6",
    iconUrl: "/icons/network.svg",
    subcategories: [
      { id: "indoor-wifi", title: "Indoor WiFI Internet access required?", description: "Select Yes or No" },
      { id: "outdoor-wifi", title: "Outdoor Wifi Internet access required?", description: "Select Yes or No" },
      { id: "wired-internet", title: "Wired Internet access required?", description: "Select Yes or No" },
    ],
  },
  {
    id: "building-coverage",
    title: "Building and Coverage",
    description: "Building Access and Network Coverage Requirements",
    accent: "#3b82f6", // Updated to a professional blue color that complements the design
    iconUrl: "/icons/building-and-tree-svgrepo-com.svg",
    subcategories: [
      { id: "coverage-details", title: "Building and Coverage", description: "AI-driven building and coverage requirements" },
    ],
  },
];

export default categories;

