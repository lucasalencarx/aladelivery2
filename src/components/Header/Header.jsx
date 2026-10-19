
import "./Header.css";
import SearchBox from "../../storefront/SearchBox";

import logo from "../../assets/images/logomarca.png";

import {
  Search,
  Info,
  CircleCheck,
  CircleX,
  MapPin,
  X,
} from "lucide-react";

import { FaWhatsapp } from "react-icons/fa";
import { useState } from "react";

export default function Header({query = "", onSearch = () => {}, store = null, settings = null, products = [], onSelect}) {
  // Depois podemos ligar isso ao horário real da loja
  const lojaAberta = store?.is_open === true;
  const statusKnown = typeof store?.is_open === "boolean";

  // Controla o popup de localização
  const [mostrarLocalizacao, setMostrarLocalizacao] = useState(false);

  // =====================================================
  // WHATSAPP
  // =====================================================

  const abrirWhatsApp = () => {
    let numero = String(settings?.whatsapp||"5521967631210").replace(/\D/g,'');if(numero.length<=11)numero='55'+numero;

    const mensagem = encodeURIComponent(
      "Olá! Gostaria de fazer um pedido."
    );

    window.open(
      `https://wa.me/${numero}?text=${mensagem}`,
      "_blank"
    );
  };

  return (
    <header className="header">
      <div className="headerContent">

        {/* =================================================
            LOGO
        ================================================= */}

        <div className="logoArea">
          <img
            src={settings?.logo_url||logo} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=logo;}}
            alt="Logo"
          />
        </div>

        {/* =================================================
            BUSCA
        ================================================= */}

        <SearchBox query={query} onSearch={onSearch} products={products} onSelect={onSelect}/>

        {/* =================================================
            LADO DIREITO
        ================================================= */}

        <div className="storeInfo">

          {/* =================================================
              STATUS
          ================================================= */}

          <div
            className={`storeStatus ${
              lojaAberta ? "opened" : "closed"
            }`}
          >
            {lojaAberta ? (
              <CircleCheck
                size={17}
                strokeWidth={2.5}
              />
            ) : (
              <CircleX
                size={17}
                strokeWidth={2.5}
              />
            )}

            <div className="storeStatusText">
              <strong>
                {lojaAberta
                  ? "Loja aberta"
                  : statusKnown ? "Loja fechada" : "Consulte o horário"}
              </strong>

              <span>
                {lojaAberta
                  ? "Entregando agora"
                  : statusKnown ? (store?.closed_message||"Voltamos em breve") : "Horário não informado"}
              </span>
            </div>
          </div>

          {/* =================================================
              LOCALIZAÇÃO
          ================================================= */}

          <div className="infoWrapper">
            <button
              type="button"
              className="iconButton"
              aria-label="Informações da loja"
              onClick={() =>
                setMostrarLocalizacao((valor) => !valor)
              }
            >
              <Info size={18} />
            </button>

            {mostrarLocalizacao && (
              <div className="locationPopup">

                <div className="locationHeader">
                  <div className="locationIcon">
                    <MapPin
                      size={18}
                      strokeWidth={2.4}
                    />
                  </div>

                  <div className="locationTitle">
                    <strong>
                      Localização da loja
                    </strong>

                    <span>
                      Estamos aqui
                    </span>
                  </div>

                  <button
                    type="button"
                    className="locationClose"
                    onClick={() =>
                      setMostrarLocalizacao(false)
                    }
                    aria-label="Fechar"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="locationAddress">
                  <MapPin size={16} />

                  <span>
                    {settings?.address||'Rua Tiradentes, 1081 · Centro, Corumbá-MS'}
                  </span>
                </div>

                <a
                  className="mapButton"
                  href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(settings?.address||'Rua Tiradentes, 1081, Corumbá-MS')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin size={15} />
                  Ver no mapa
                </a>
              </div>
            )}
          </div>

          {/* =================================================
              WHATSAPP
          ================================================= */}

          <button
            type="button"
            className="social whatsapp"
            aria-label="WhatsApp"
            onClick={abrirWhatsApp}
          >
            <FaWhatsapp size={19} />
          </button>

        </div>
      </div>
    </header>
  );
}
