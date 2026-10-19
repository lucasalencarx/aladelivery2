import { Plus } from "lucide-react";

import { products as allProducts } from "../../data/data";
import { useCart } from "../../contexts/CartContext";
import "./NoAlcool.css";


export default function NoAlcool() {

  /* =========================================================
     FILTRA PRODUTOS SEM ÁLCOOL
  ========================================================= */

  const products = allProducts.filter((product) => {

    if (!product.active) {
      return false;
    }

    const name =
      product.name?.toLowerCase() || "";

    const description =
      product.description?.toLowerCase() || "";

    return (
      name.includes("água") ||
      name.includes("agua") ||
      name.includes("refrigerante") ||
      name.includes("energético") ||
      name.includes("energetico") ||
      name.includes("suco") ||
      name.includes("red bull") ||
      name.includes("monster") ||
      description.includes("sem álcool") ||
      description.includes("sem alcool")
    );

  });


  /* =========================================================
     PREÇO FINAL
  ========================================================= */

  function getPrice(product) {

    const price =
      Number(product.price || 0);

    const promotionalPrice =
      Number(
        product.promotional_price || 0
      );


    if (
      promotionalPrice > 0 &&
      promotionalPrice < price
    ) {
      return promotionalPrice;
    }


    return price;

  }


  /* =========================================================
     FORMATAR PREÇO
  ========================================================= */

  function formatPrice(value) {

    return Number(value || 0).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );

  }


  /* =========================================================
     ADICIONAR AO CARRINHO
     TEMPORÁRIO
  ========================================================= */

  function handleAddProduct(product) {

    console.log(
      "Adicionar produto:",
      product
    );

  }


  /* =========================================================
     SE NÃO TIVER PRODUTOS
  ========================================================= */

  if (!products.length) {
    return null;
  }


  return (
    <section
      className="no-alcool"
      id="sem-alcool"
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="no-alcool-header">

        <div>

          <span className="no-alcool-kicker">
            Geladinhas para você
          </span>

          <h2>
            Sem álcool
          </h2>

        </div>


        <button
          type="button"
          className="no-alcool-see-all"
        >
          Ver tudo
        </button>

      </div>


      {/* =====================================================
          LISTA
      ===================================================== */}

      <div className="no-alcool-list">

        {products.map((product) => {

          const finalPrice =
            getPrice(product);


          const hasPromotion =
            product.promotional_price !== null &&
            product.promotional_price !== undefined &&
            Number(
              product.promotional_price
            ) > 0 &&
            Number(
              product.promotional_price
            ) <
              Number(product.price);


          return (
            <article
              key={product.id}
              className="no-alcool-card"
            >

              {/* =========================================
                  IMAGEM
              ========================================= */}

              <div className="no-alcool-image-wrapper">

                {hasPromotion && (
                  <span className="no-alcool-promo">
                    OFERTA
                  </span>
                )}


                <img
                  src={product.image_url}
                  alt={product.name}
                  className="no-alcool-image"
                  loading="lazy"
                />


                <button
                  type="button"
                  className="no-alcool-add"
                  onClick={() =>
                    handleAddProduct(product)
                  }
                  aria-label={
                    `Adicionar ${product.name} ao carrinho`
                  }
                >
                  <Plus
                    size={20}
                    strokeWidth={2.5}
                  />
                </button>

              </div>


              {/* =========================================
                  CONTEÚDO
              ========================================= */}

              <div className="no-alcool-content">

                <h3>
                  {product.name}
                </h3>


                {product.unit && (
                  <span className="no-alcool-unit">
                    {product.unit}
                  </span>
                )}


                <div className="no-alcool-price-area">

                  {hasPromotion && (
                    <span className="no-alcool-old-price">

                      {formatPrice(
                        product.price
                      )}

                    </span>
                  )}


                  <strong className="no-alcool-price">

                    {formatPrice(
                      finalPrice
                    )}

                  </strong>

                </div>

              </div>

            </article>
          );

        })}

      </div>

    </section>
  );

}