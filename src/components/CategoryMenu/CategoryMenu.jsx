import "./CategoryMenu.css";

import {
  House,
  Beer,
  Wine,
  Martini,
  Zap,
  CupSoda,
  Tag,
} from "lucide-react";

const categories = [
  {
    name: "Início",
    icon: House,
  },
  {
    name: "Cervejas",
    icon: Beer,
  },
  {
    name: "Destilados",
    icon: Martini,
  },
  {
    name: "Vinhos",
    icon: Wine,
  },
  {
    name: "Energéticos",
    icon: Zap,
  },
  {
    name: "Descartáveis",
    icon: CupSoda,
  },
  {
    name: "Ofertas",
    icon: Tag,
  },
];

export default function CategoryMenu() {
  return (
    <nav className="category-menu">
      {categories.map((category, index) => {
        const Icon = category.icon;

        return (
          <button
            key={category.name}
            type="button"
            className={`category-item ${
              index === 0 ? "active" : ""
            }`}
          >
            <span className="category-icon">
              <Icon size={17} strokeWidth={2.2} />
            </span>

            <span className="category-label">
              {category.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}