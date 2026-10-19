import "./Recommended.css";

import {
  Plus,
  Flame,
  Snowflake,
  BadgePercent,
  Star,
  Sparkles,
  Trophy,
  Megaphone,
} from "lucide-react";

import { products } from "../../data/data";

import { useCart } from "../../contexts/CartContext";


function formatPrice(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}


const badgeConfig = {
  oferta: {
    label: "Oferta",
    icon: BadgePercent,
    className: "offer",
  },

  imperdivel: {
    label: "Imperdível",
    icon: Flame,
    className: "mustHave",
  },

  promocao: {
    label: "Promoção",
    icon: Megaphone,
    className: "promotion",
  },

  destaque: {
    label: "Destaque",
    icon: Star,
    className: "featured",
  },

  novidade: {
    label: "Novidade",
    icon: Sparkles,
    className: "new",
  },

  "mais-vendido": {
    label: "Mais vendido",
    icon: Trophy,
    className: "bestSeller",
  },
};


export default function Recommended() {

  const { addToCart } = useCart();


  const recommendedProducts = products.filter(
    (product) => product.active
  );


  return (
    <section className="recommended">

      <div className="recommendedHeader">

        <div className="recommendedTitleArea">

          <div className="recommendedIcon">
            <Flame size={18} />
          </div>

          <div>
            <h2>Recomendados para você</h2>

            <p>
              Os queridinhos que sempre salvam a resenha.
            </p>
          </div>

        </div>


        <button
          className="seeAllButton"
          type="button"
        >
          Ver todos
          <span>→</span>
        </button>

      </div>


      <div className="recommendedGrid">

        {recommendedProducts.map((product) => {

          const hasPromotion =
            product.promotional_price !== null &&
            product.promotional_price !== undefined &&
            Number(product.promotional_price) <
              Number(product.price);


          const currentPrice = hasPromotion
            ? Number(product.promotional_price)
            : Number(product.price);


          let badgeName = null;


          if (
            product.badge &&
            badgeConfig[product.badge]
          ) {
            badgeName = product.badge;
          }


          if (!badgeName && hasPromotion) {
            badgeName = "oferta";
          }


          if (!badgeName && product.featured) {
            badgeName = "imperdivel";
          }


          const badge = badgeName
            ? badgeConfig[badgeName]
            : null;


          const BadgeIcon = badge?.icon;


          return (
            <article
              className="productCard"
              key={product.id}
            >

              <div className="productImageArea">

                <div className="coldIndicator">
                  <Snowflake
                    size={11}
                    strokeWidth={2.7}
                  />

                  <span>
                    Gelada
                  </span>
                </div>


                {badge && (
                  <div
                    className={`productBadge ${badge.className}`}
                  >
                    <BadgeIcon
                      size={10}
                      strokeWidth={2.5}
                    />

                    <span>
                      {badge.label}
                    </span>
                  </div>
                )}


                <img
                  src={product.image_url}
                  alt={product.name}
                  loading="lazy"
                />

              </div>


              <div className="productContent">

                <h3>
                  {product.name}
                </h3>


                {product.description && (
                  <span className="productDescription">
                    {product.description}
                  </span>
                )}


                <div className="productBottom">

                  <div className="productPriceArea">

                    {hasPromotion && (
                      <span className="oldPrice">
                        {formatPrice(product.price)}
                      </span>
                    )}


                    <strong className="currentPrice">
                      {formatPrice(currentPrice)}
                    </strong>

                  </div>


                  <button
                    className="addProductButton"
                    type="button"
                    aria-label={`Adicionar ${product.name}`}
                    onClick={() =>
                      addToCart(product)
                    }
                  >
                    <Plus
                      size={20}
                      strokeWidth={2.5}
                    />
                  </button>

                </div>

              </div>

            </article>
          );

        })}

      </div>

    </section>
  );

}