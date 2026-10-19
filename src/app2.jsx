// src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ======================================================
// LOJA
// ======================================================

import Header from "./components/Header/Header";
import OfferBar from "./components/OfferBar/OfferBar";
import CategoryMenu from "./components/CategoryMenu/CategoryMenu";
import BannerSlider from "./components/BannerSlider/BannerSlider";
import Recommended from "./components/Recommended/Recommended";
import NoAlcool from "./components/NoAlcool/NoAlcool";

import BottomCart from "./components/BottomCart/BottomCart";
import CartDrawer from "./components/CartDrawer/CartDrawer";
import CheckoutDrawer from "./components/CheckoutDrawer/CheckoutDrawer";

// ======================================================
// ADMIN
// ======================================================


// ======================================================
// CSS
// ======================================================

import "./App.css";


// ======================================================
// LOJA PRINCIPAL
// ======================================================

function Store() {
    return (
        <div className="app">

            {/* ============================= */}
            {/* CABEÇALHO */}
            {/* ============================= */}

            <OfferBar />

            <Header />

            <CategoryMenu />


            {/* ============================= */}
            {/* CONTEÚDO */}
            {/* ============================= */}

            <main className="store-main">

                <BannerSlider />

                <Recommended />

                <NoAlcool />

            </main>


            {/* ============================= */}
            {/* CARRINHO */}
            {/* ============================= */}

            <BottomCart />

            <CartDrawer />

            <CheckoutDrawer />

        </div>
    );
}


// ======================================================
// APP / ROTAS
// ======================================================

function App() {

    return (

        <BrowserRouter>

            <Routes>

                {/* ===================================== */}
                {/* LOJA */}
                {/* ===================================== */}

                <Route
                    path="/"
                    element={<Store />}
                />


                {/* ===================================== */}
                {/* ADMIN */}
                {/* ===================================== */}

                <Route
                    path="/admin"
                    element={<AdminLayout />}
                >

                    {/* REDIRECIONA /admin PARA DASHBOARD */}

                    <Route
                        index
                        element={
                            <Navigate
                                to="dashboard"
                                replace
                            />
                        }
                    />


                    {/* DASHBOARD */}

                    <Route
                        path="dashboard"
                        element={<Dashboard />}
                    />


                    {/* PRODUTOS */}

                    <Route
                        path="produtos"
                        element={<Products />}
                    />


                    {/* VITRINES */}

                    <Route
                        path="vitrines"
                        element={<Vitrines />}
                    />


                    {/* EDITOR DE VITRINE */}

                    <Route
                        path="vitrines/:slug"
                        element={<SectionEditor />}
                    />


                    {/* CLIENTES */}

                    <Route
                        path="clientes"
                        element={<Clients />}
                    />


                    {/* RELATÓRIOS */}

                    <Route
                        path="relatorios"
                        element={<Reports />}
                    />


                    {/* CONFIGURAÇÕES */}

                    <Route
                        path="configuracoes"
                        element={<Settings />}
                    />

                </Route>


                {/* ===================================== */}
                {/* ROTA NÃO ENCONTRADA */}
                {/* ===================================== */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

            </Routes>

        </BrowserRouter>

    );

}

export default App;