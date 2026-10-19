import {
  createContext,
  useContext,
  useState,
} from "react";

const CheckoutContext = createContext(null);

export function CheckoutProvider({ children }) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [checkoutStep, setCheckoutStep] = useState("phone");

  const [clientId, setClientId] = useState(null);

  const [clientFound, setClientFound] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState([]);

  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
  });

  const [address, setAddress] = useState({
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "MS",
    reference: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("");

  const [changeFor, setChangeFor] = useState("");

  const [observation, setObservation] = useState("");

  function openCheckout() {
    setCheckoutOpen(true);
  }

  function closeCheckout() {
    setCheckoutOpen(false);
  }

  function clearCheckout() {
    setCheckoutStep("phone");

    setClientId(null);

    setClientFound(false);

    setSavedAddresses([]);

    setSelectedAddressId(null);

    setCustomer({
      name: "",
      phone: "",
    });

    setAddress({
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "MS",
      reference: "",
    });

    setPaymentMethod("");

    setChangeFor("");

    setObservation("");
  }

  return (
    <CheckoutContext.Provider
      value={{
        checkoutOpen,
        openCheckout,
        closeCheckout,

        checkoutStep,
        setCheckoutStep,

        clientId,
        setClientId,

        clientFound,
        setClientFound,

        savedAddresses,
        setSavedAddresses,

        selectedAddressId,
        setSelectedAddressId,

        customer,
        setCustomer,

        address,
        setAddress,

        paymentMethod,
        setPaymentMethod,

        changeFor,
        setChangeFor,

        observation,
        setObservation,

        clearCheckout,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);

  if (!context) {
    throw new Error(
      "useCheckout deve ser usado dentro de um CheckoutProvider"
    );
  }

  return context;
}

export default CheckoutContext;