import "./OfferBar.css";

import {
  Truck,
  BadgePercent,
  Clock3
} from "lucide-react";

import { useEffect, useState } from "react";

export default function OfferBar() {

  const offers = [
    {
      icon: <Truck size={14} />,
      text: "Entrega rápida em Corumbá e Ladário"
    },

    {
      icon: <BadgePercent size={14} />,
      text: "Ofertas especiais todos os dias"
    },

    {
      icon: <Clock3 size={14} />,
      text: "Peça agora e receba gelado"
    }
  ];


  const [currentOffer, setCurrentOffer] = useState(0);


  useEffect(() => {

    const interval = setInterval(() => {

      setCurrentOffer((current) =>
        (current + 1) % offers.length
      );

    }, 4500);


    return () => clearInterval(interval);

  }, []);


  return (

    <div className="topOffer">

      <div
        key={currentOffer}
        className="offerContent"
      >

        <span className="offerIcon">
          {offers[currentOffer].icon}
        </span>


        <span className="offerText">
          {offers[currentOffer].text}
        </span>

      </div>

    </div>

  );
}