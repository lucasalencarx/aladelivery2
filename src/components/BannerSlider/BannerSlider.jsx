import "./BannerSlider.css";
import { useEffect, useRef, useState } from "react";

import banner1 from "../../assets/images/banner1.jpg";
import banner2 from "../../assets/images/banner2.jpg";
import banner3 from "../../assets/images/banner3.jpg";

const defaultBanners = [
  {
    id: 1,
    image: banner1,
    alt: "Ofertas especiais",
  },
  {
    id: 2,
    image: banner2,
    alt: "Bebidas geladas",
  },
  {
    id: 3,
    image: banner3,
    alt: "Promoções do delivery",
  },
];

export default function BannerSlider({slides}) {
  const banners=(Array.isArray(slides)&&slides.length===3?slides:defaultBanners).map((b,i)=>({...b,id:i+1,image:b.image||defaultBanners[i].image}));
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setCurrent((prev) =>
        prev === banners.length - 1 ? 0 : prev + 1
      );
    }, 4500);

    return () => clearInterval(interval);
  }, [paused]);

  function goToSlide(index) {
    setCurrent(index);
  }

  function nextSlide() {
    setCurrent((prev) =>
      prev === banners.length - 1 ? 0 : prev + 1
    );
  }

  function prevSlide() {
    setCurrent((prev) =>
      prev === 0 ? banners.length - 1 : prev - 1
    );
  }

  function handlePointerDown(event) {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
    touchStartX.current = event.clientX;
    touchStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function handlePointerUp(event) {
    if (touchStartX.current === null) return;
    const distance = touchStartX.current - event.clientX;
    const vertical = Math.abs(touchStartY.current - event.clientY);
    if (Math.abs(distance) >= 50 && Math.abs(distance) > vertical) {
      distance > 0 ? nextSlide() : prevSlide();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }
  function cancelPointer() { touchStartX.current = null; touchStartY.current = null; }

  return (
    <section
      className="bannerSlider"
      aria-label="Ofertas em destaque"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelPointer}
    >
      <div
        className="bannerTrack"
        style={{
          transform: `translateX(-${current * 100}%)`,
        }}
      >
        {banners.map((banner, index) => (
          <div
            className="bannerSlide"
            key={banner.id}
          >
            <img
              src={banner.image}
              alt={banner.alt}
              draggable="false"
              onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=defaultBanners[index].image;}}
              loading={index === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="bannerArrow bannerArrowLeft"
        onClick={prevSlide}
        aria-label="Banner anterior"
      >
        ‹
      </button>

      <button
        type="button"
        className="bannerArrow bannerArrowRight"
        onClick={nextSlide}
        aria-label="Próximo banner"
      >
        ›
      </button>

      <div className="bannerDots">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            className={
              current === index
                ? "bannerDot active"
                : "bannerDot"
            }
            onClick={() => goToSlide(index)}
            aria-label={`Ir para banner ${index + 1}`}
            aria-current={
              current === index ? "true" : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}