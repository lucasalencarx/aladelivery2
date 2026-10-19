import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

const StoreStatusContext = createContext();

export function StoreStatusProvider({
  children,
}) {

  const [storeStatus, setStoreStatus] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  // =====================================================
  // BUSCAR STATUS
  // =====================================================

  async function fetchStoreStatus() {

    try {

      const { data, error } = await supabase
        .from("store_status")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) {
        throw error;
      }

      setStoreStatus(data);

    } catch (error) {

      console.error(
        "Erro ao consultar status da loja:",
        error
      );

    } finally {

      setLoading(false);

    }

  }


  // =====================================================
  // INICIAL
  // =====================================================

  useEffect(() => {

    fetchStoreStatus();

  }, []);


  return (

    <StoreStatusContext.Provider
      value={{
        storeStatus,
        loading,
        isOpen:
          storeStatus?.is_open ?? false,
        fetchStoreStatus,
      }}
    >
      {children}
    </StoreStatusContext.Provider>

  );

}
export function useStoreStatus() {

  return useContext(StoreStatusContext);

}