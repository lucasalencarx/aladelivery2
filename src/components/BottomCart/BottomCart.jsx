import {trackingURL} from '../../services/commerceApi';
import {

  House,

  ShoppingCart,

  ReceiptText,

} from "lucide-react";


import {

  useEffect,

  useState,

} from "react";


import {

  useCart,

} from "../../contexts/CartContext";


import "./BottomCart.css";


/* =========================================================
   CACHE PEDIDO ATIVO
========================================================= */

const ACTIVE_ORDER_KEY =
  "ala_delivery_active_order_v1";


/* =========================================================
   COMPONENTE
========================================================= */

export default function BottomCart() {


  /* =======================================================
     CARRINHO
  ======================================================= */

  const {

    totalItems = 0,

    totalPrice = 0,

    openCart,

  } = useCart();


  /* =======================================================
     PEDIDO ATIVO
  ======================================================= */

  const [

    activeOrder,

    setActiveOrder,

  ] = useState(null);


  /* =======================================================
     PREÇO
  ======================================================= */

  const formattedPrice =
    Number(

      totalPrice || 0

    ).toLocaleString(

      "pt-BR",

      {

        style:
          "currency",

        currency:
          "BRL",

      }

    );


  /* =======================================================
     LER PEDIDO DO CACHE
  ======================================================= */

  function loadActiveOrder() {

    try {

      const raw =
        window.localStorage.getItem(

          ACTIVE_ORDER_KEY

        );


      if (!raw) {

        setActiveOrder(
          null
        );

        return;

      }


      const data =
        JSON.parse(
          raw
        );


      /* ===================================================
         STATUS DO PEDIDO
      =================================================== */

      const paymentStatus =
        String(

          data?.status ||

          data?.order_snapshot
            ?.payment_status ||

          ""

        ).toLowerCase();


      const orderStatus =
        String(

          data?.order_snapshot
            ?.order_status ||

          ""

        ).toLowerCase();


      /* ===================================================
         PEDIDO FINALIZADO

         Se já foi entregue/cancelado,
         ele não conta como "pedido em aberto".
      =================================================== */

      const finished =

        orderStatus ===
          "delivered" ||

        orderStatus ===
          "cancelled" ||

        paymentStatus ===
          "expired" ||

        paymentStatus ===
          "failed";


      if (finished) {

        setActiveOrder(
          null
        );

        return;

      }


      setActiveOrder(
        data
      );


    } catch (error) {

      console.error(

        "Erro ao carregar pedido ativo:",

        error

      );


      setActiveOrder(
        null
      );

    }

  }


  /* =======================================================
     CARREGAR AO INICIAR
  ======================================================= */

  useEffect(() => {

    loadActiveOrder();


    /* =====================================================
       ATUALIZAÇÃO ENTRE ABAS
    ===================================================== */

    function handleStorage(
      event
    ) {

      if (

        event.key ===
        ACTIVE_ORDER_KEY

      ) {

        loadActiveOrder();

      }

    }


    window.addEventListener(

      "storage",

      handleStorage

    );


    /* =====================================================
       ATUALIZAÇÃO NA MESMA ABA

       Como localStorage não dispara "storage"
       na própria página que escreveu,
       verificamos de tempos em tempos.
    ===================================================== */

    const interval =
      window.setInterval(

        loadActiveOrder,

        1500

      );


    return () => {

      window.removeEventListener(

        "storage",

        handleStorage

      );


      window.clearInterval(
        interval
      );

    };

  }, []);


  /* =======================================================
     QUANTIDADE DE PEDIDOS ABERTOS

     Neste momento temos 1 pedido ativo por cliente.
  ======================================================= */

  const openOrdersCount =
    activeOrder
      ? 1
      : 0;


  /* =======================================================
     INÍCIO
  ======================================================= */

  function handleHome() {

    window.scrollTo({

      top:
        0,

      behavior:
        "smooth",

    });

  }


  /* =======================================================
     CARRINHO
  ======================================================= */

  function handleCart() {

    openCart();

  }


  /* =======================================================
     PEDIDOS
  ======================================================= */

  function handleOrders(){window.location.href='/pedidos';}



  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <nav

      className="bottom-nav"

      aria-label="Navegação principal"

    >


      <div className="bottom-nav-container">


        {/* ===================================================
            INÍCIO
        =================================================== */}

        <button

          type="button"

          className="bottom-nav-item active"

          onClick={
            handleHome
          }

        >


          <span className="bottom-nav-icon">

            <House

              size={19}

              strokeWidth={2.3}

            />

          </span>


          <span className="bottom-nav-label">

            Início

          </span>


        </button>


        {/* ===================================================
            CARRINHO
        =================================================== */}

        <div className="bottom-nav-cart-wrapper">


          <button

            type="button"

            className="bottom-nav-cart"

            onClick={
              handleCart
            }

            aria-label="Abrir carrinho"

          >


            <ShoppingCart

              size={23}

              strokeWidth={2.3}

            />


            {totalItems > 0 && (

              <span className="bottom-nav-cart-badge">

                {totalItems > 99

                  ? "99+"

                  : totalItems}

              </span>

            )}


          </button>


          <button

            type="button"

            className="bottom-nav-total"

            onClick={
              handleCart
            }

          >

            {formattedPrice}

          </button>


        </div>


        {/* ===================================================
            PEDIDOS
        =================================================== */}

        <button

          type="button"

          className={

            openOrdersCount > 0

              ? "bottom-nav-item bottom-nav-orders has-order"

              : "bottom-nav-item bottom-nav-orders"

          }

          onClick={
            handleOrders
          }

        >


          <span className="bottom-nav-icon bottom-nav-orders-icon">


            <ReceiptText

              size={19}

              strokeWidth={2.3}

            />


            {/* ===============================================
                BADGE PEDIDOS
            =============================================== */}

            {openOrdersCount > 0 && (

              <span className="bottom-nav-orders-badge">

                {openOrdersCount}

              </span>

            )}


          </span>


          <span className="bottom-nav-label">

            Pedidos

          </span>


        </button>


      </div>


    </nav>

  );

}