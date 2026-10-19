import {checkoutProblem,forgetPendingCheckout} from '../../utils/checkoutSession';
import {recoverCheckoutSuggestions,readCheckoutProfiles,readCheckoutProfile,saveCheckoutProfile,findCheckoutProfile,hasCheckoutAddress,emptyCheckoutAddress,savedPixProfile} from '../../services/checkoutProfile';
import {copyPix} from '../../utils/copyPix';
import LoyaltyBenefit from '../LoyaltyBenefit';
import {loadDeliveryZones,lookupCEP,supportedCities} from '../../services/addressApi';
import {secureUUID} from '../../utils/uuid';
import { commerce, rememberOrder, orderCredentials, trackingURL } from '../../services/commerceApi';
import CheckoutFrame from '../../storefront/CheckoutFrame';
import { getProductPrice } from "../../utils/commerce";
import "./CheckoutDrawer.css";
import "./CheckoutPix.css";

import {
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";

import {
  X,
  ArrowLeft,
  MapPin,
  User,
  Phone,
  CreditCard,
  Banknote,
  QrCode,
  MessageSquare,
  CheckCircle2,
  House,
  BriefcaseBusiness,
  Tag,
  ShoppingBag,
  Pencil,
  ReceiptText,
  TicketPercent,
  ChevronRight,
  ChevronDown,
  LoaderCircle,
  Copy,
  Clock3,
  CircleCheckBig,
  Navigation,
} from "lucide-react";

import {
  useCheckout,
} from "../../contexts/CheckoutContext";

import {
  useCart,
} from "../../contexts/CartContext";





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
   NORMALIZAR TELEFONE
========================================================= */

function normalizePhone(phone) {
  let normalized = String(
    phone || ""
  ).replace(/\D/g, "");

  if (
    normalized.startsWith("55") &&
    normalized.length > 11
  ) {
    normalized =
      normalized.substring(2);
  }

  return normalized;
}

/* =========================================================
   PREÇO DO PRODUTO
========================================================= */

/* =========================================================
   CUPONS TEMPORÁRIOS

   Depois substituímos pela tabela do Supabase.
========================================================= */

const ALA_ACTIVE_ORDER_KEY =
  "ala_delivery_active_order_v1";

/* =========================================================
   COMPONENTE
========================================================= */

export default function CheckoutDrawer({embedded = false, onBackToCart, onRequestClose}) {

  /* =======================================================
     CHECKOUT CONTEXT
  ======================================================= */

  const {
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
  } = useCheckout();

  /* =======================================================
     CARRINHO
  ======================================================= */

  const {
    cart,
    totalItems,
    totalPrice,
    clearCart,
    clearCartIfMatches,
  } = useCart();

  /* =======================================================
     ESTADOS LOCAIS
  ======================================================= */

  const flowActive=useRef(checkoutOpen),submittedItems=useRef(null),submittedOrder=useRef(null);
  useEffect(()=>{flowActive.current=checkoutOpen;return()=>{flowActive.current=false;};},[checkoutOpen]);
  const [profileNotice,setProfileNotice]=useState('');
  const profileRequest=useRef(0),customerLive=useRef(customer),checkoutVisible=useRef(checkoutOpen);customerLive.current=customer;checkoutVisible.current=checkoutOpen;
  const [phoneSuggestions,setPhoneSuggestions]=useState(readCheckoutProfiles);
  useEffect(()=>{if(!checkoutOpen||checkoutStep!=='phone')return;let live=true;setPhoneSuggestions(readCheckoutProfiles());recoverCheckoutSuggestions().then(profiles=>{if(live)setPhoneSuggestions(profiles);});return()=>{live=false;};},[checkoutOpen,checkoutStep]);
  const returningProfile=useMemo(()=>readCheckoutProfile(customer.phone),[customer.phone]);
  useEffect(()=>{profileRequest.current++;setProfileNotice('');setLoadingClient(false);},[normalizePhone(customer.phone),checkoutOpen]);
  const [deliveryZones,setDeliveryZones]=useState([]);
  const [zonesError,setZonesError]=useState('');
  const pixCodeRef=useRef(null);
  const pixGeneration=useRef(false);
  const [pixIntent,setPixIntent]=useState(false);
  useEffect(()=>{if(!checkoutOpen)setPixIntent(false);},[checkoutOpen]);
  const requestKey=useRef(null);
  if(!requestKey.current){try{requestKey.current=JSON.parse(sessionStorage.getItem('ala_pending_checkout')||'null');}catch{}if(!/^[0-9a-f-]{36}$/i.test(requestKey.current?.key||'')||!/^[0-9a-f-]{36}$/i.test(requestKey.current?.token||''))requestKey.current={key:secureUUID(),token:secureUUID()};}
  useEffect(()=>{if(!checkoutOpen)return;let live=true;loadDeliveryZones().then(z=>{if(live){setDeliveryZones(z);setZonesError('');}}).catch(e=>{if(live)setZonesError(e.message);});return()=>{live=false;};},[checkoutOpen]);
  const foldZone=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const deliveryZone=deliveryZones.find(z=>foldZone(z.city)===foldZone(address.city)&&foldZone(z.neighborhood)===foldZone(address.neighborhood));
  const deliveryFee=Number(deliveryZone?.fee||0);
  useEffect(()=>{
    if(!checkoutOpen||!['review','payment'].includes(checkoutStep))return;
    const problem=checkoutProblem(customer,address,cart);
    if(problem){setPixIntent(false);setPaymentMethod('');setCheckoutStep(problem.step);setProfileNotice(problem.message);}
  },[checkoutOpen,checkoutStep,customer.name,customer.phone,address.street,address.number,address.neighborhood,address.city,cart.length]);
  const [cepBusy,setCepBusy]=useState(false),[cepNotice,setCepNotice]=useState('');
  const addressLive=useRef(address);addressLive.current=address;
  const zonesLive=useRef(deliveryZones);zonesLive.current=deliveryZones;
  const pendingSuggestion=useRef(null);
  // O serviço de CEP só sugere. O bairro selecionável sempre vem do admin.
  useEffect(()=>{const suggestion=pendingSuggestion.current;if(!suggestion)return;const match=deliveryZones.find(z=>foldZone(z.city)===foldZone(suggestion.city)&&foldZone(z.neighborhood)===foldZone(suggestion.neighborhood));if(match){setAddress(a=>foldZone(a.city)===foldZone(match.city)&&!a.neighborhood?{...a,neighborhood:match.neighborhood,state:'MS'}:a);pendingSuggestion.current=null;}},[deliveryZones,setAddress]);
  useEffect(()=>{
    const digits=String(address.cep||'').replace(/\D/g,'');
    if(!checkoutOpen||checkoutStep!=='address-form'||digits.length!==8){setCepBusy(false);setCepNotice('');pendingSuggestion.current=null;return;}
    const controller=new AbortController();const baseline={...addressLive.current};let live=true;
    setCepBusy(true);setCepNotice('Consultando CEP…');
    const timeout=setTimeout(()=>controller.abort(),8500);
    const timer=setTimeout(async()=>{try{
      const suggested=await lookupCEP(digits,controller.signal);if(!live)return;
      const matches=zonesLive.current.find(z=>foldZone(z.city)===foldZone(suggested.city)&&foldZone(z.neighborhood)===foldZone(suggested.neighborhood));
      const current=addressLive.current;
      if(current.city!==baseline.city||current.street!==baseline.street||current.neighborhood!==baseline.neighborhood){setCepNotice('CEP consultado. Mantivemos as alterações que você fez no endereço.');return;}
      pendingSuggestion.current=suggested;
      setAddress(a=>({...a,city:suggested.city,state:'MS',street:suggested.street||a.street,neighborhood:matches?.neighborhood||''}));
      setCepNotice(matches?'Endereço sugerido pelo CEP. Confira a rua e informe o número.':suggested.neighborhood?`Rua sugerida pelo CEP. Selecione um bairro atendido; “${suggested.neighborhood}” não corresponde a um bairro disponível no cadastro.`:'CEP geral da cidade: informe a rua e selecione seu bairro.');
    }catch(e){if(live)setCepNotice(e.name==='AbortError'?'Consulta de CEP demorou. Você pode preencher manualmente.':e.message);}finally{if(live)setCepBusy(false);clearTimeout(timeout);}},350);
    return()=>{live=false;controller.abort();clearTimeout(timer);clearTimeout(timeout);};
  },[address.cep,checkoutOpen,checkoutStep,setAddress]);

  async function persistOrder(method,document){
    const problem=checkoutProblem(customer,address,cart);
    if(problem){if(flowActive.current){setCheckoutStep(problem.step);setProfileNotice(problem.message);}throw Error(problem.message);}
    submittedItems.current=cart.map(p=>({...p}));
    if(!deliveryZone)throw Error(zonesError||'Selecione uma cidade e bairro atendidos para calcular a entrega.');
    const payload={request_key:requestKey.current.key,access_token:requestKey.current.token,customer_name:customer.name,customer_phone:normalizePhone(customer.phone),customer_document:document||null,pix_reference:customer.pixReference||null,payment_method:method,items:(cart||[]).map(p=>({id:String(p.id),quantity:Number(p.quantity||1)})),address:{...address,state:'MS'},observation,coupon_code:appliedCoupon?.code||null,expected_total:Math.round(finalTotal*100)/100,card_type:cardType,change_for:needsChange?String(changeFor):null};
    // A mesma tentativa sobrevive a perda de conexão/recarregamento. Novo carrinho gera outra chave.
    const fingerprint=JSON.stringify({...payload,request_key:null,access_token:null,customer_document:null,pix_reference:null});
    if(requestKey.current.fingerprint&&requestKey.current.fingerprint!==fingerprint)requestKey.current={key:secureUUID(),token:secureUUID()};
    requestKey.current.fingerprint=fingerprint;payload.request_key=requestKey.current.key;payload.access_token=requestKey.current.token;
    try{sessionStorage.setItem('ala_pending_checkout',JSON.stringify(requestKey.current));}catch{}
    let o;try{o=await commerce('/orders',{customer:true,method:'POST',body:JSON.stringify(payload)});}catch(e){if(e.code==='ORDER_CLOSED'){sessionStorage.removeItem('ala_pending_checkout');requestKey.current={key:secureUUID(),token:secureUUID()};}throw e;}const hasDocument=o.has_saved_document||String(document||'').replace(/\D/g,'').length===11;saveCheckoutProfile({phone:payload.customer_phone,name:payload.customer_name,address:payload.address,...(hasDocument?{document_order_id:o.id}:readCheckoutProfile(payload.customer_phone)?.document_order_id?{document_order_id:readCheckoutProfile(payload.customer_phone).document_order_id}:{})});rememberOrder(o);submittedOrder.current=o;
    if(method==='pix')saveActiveOrder({status:'waiting_payment',protocol:o.protocol,local_order_id:o.id,pix:o.pix_data||null,order_snapshot:{...o,items:cart.map(p=>({id:p.id,quantity:p.quantity,name:p.name})),address:{...address}}});
    if(flowActive.current){setLocalOrderId(o.id);setLocalOrderProtocol(o.protocol);}return o;
  }
  const [
    loadingClient,
    setLoadingClient,
  ] = useState(false);

  const [
    couponCode,
    setCouponCode,
  ] = useState("");

  const [
    appliedCoupon,
    setAppliedCoupon,
  ] = useState(null);

  const [
    couponMessage,
    setCouponMessage,
  ] = useState("");

  const [
    couponOpen,
    setCouponOpen,
  ] = useState(false);

  const [
    observationOpen,
    setObservationOpen,
  ] = useState(false);

  const [
    needsChange,
    setNeedsChange,
  ] = useState(null);

  const [
    cardType,
    setCardType,
  ] = useState("");

  /* =======================================================
     PIX / PAGAR.ME
  ======================================================= */

  const [pixDocument, setPixDocument] = useState("");
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState("");
  const [pixData, setPixData] = useState(null);
  const [pixSecondsLeft, setPixSecondsLeft] = useState(0);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixPaid, setPixPaid] = useState(false);
  const [pixConfirming, setPixConfirming] = useState(false);
  const [localOrderId, setLocalOrderId] = useState(null);
  const [localOrderProtocol, setLocalOrderProtocol] = useState("");
  const [completedOrder, setCompletedOrder] = useState(null);

  const [
    successTransition,
    setSuccessTransition,
  ] = useState(false);

  const [
    renderDrawer,
    setRenderDrawer,
  ] = useState(
    checkoutOpen === true
  );

  const [
    drawerVisible,
    setDrawerVisible,
  ] = useState(false);

  useEffect(() => {

    let timer = null;

    if (
      checkoutOpen === true
    ) {

      setRenderDrawer(
        true
      );

      timer =
        window.setTimeout(
          () => {
            setDrawerVisible(
              true
            );
          },
          20
        );

      return () => {

        if (timer) {
          window.clearTimeout(
            timer
          );
        }

      };

    }

    if (
      renderDrawer
    ) {

      setDrawerVisible(
        false
      );

      timer =
        window.setTimeout(
          () => {
            setRenderDrawer(
              false
            );
          },
          380
        );

    }

    return () => {

      if (timer) {
        window.clearTimeout(
          timer
        );
      }

    };

  }, [
    checkoutOpen,
    renderDrawer,
  ]);

  /* =======================================================
     TRANSIÇÃO PARA SUCESSO
  ======================================================= */

  async function showSuccessWithTransition() {
    clearCartIfMatches(submittedItems.current||cart);
    if(submittedOrder.current?.id)forgetPendingCheckout(submittedOrder.current.id);
    try{const saved=JSON.parse(sessionStorage.getItem('ala_pending_checkout')||'null');if(saved?.key===requestKey.current.key)sessionStorage.removeItem('ala_pending_checkout');}catch{}
    requestKey.current={key:secureUUID(),token:secureUUID()};
    if(!flowActive.current)return;
    setCheckoutStep("success");
    setSuccessTransition(false);
  }

  /* =======================================================
     PERSISTÊNCIA DO PEDIDO NO CELULAR

     O navegador mobile pode descarregar a página quando
     o usuário troca para o aplicativo do banco.
  ======================================================= */

  function saveActiveOrder(data) {
    try{
      const existing=JSON.parse(localStorage.getItem(ALA_ACTIVE_ORDER_KEY)||'null');
      const created_at=submittedOrder.current?.created_at||new Date().toISOString();
      if(existing?.local_order_id!==data.local_order_id&&Date.parse(existing?.created_at)>Date.parse(created_at))return;
      localStorage.setItem(ALA_ACTIVE_ORDER_KEY,JSON.stringify({...data,created_at}));
      window.dispatchEvent(new Event('checkout-pending-updated'));
    }catch{/* A saved private order link is also available in Meus pedidos. */}
  }

  function readActiveOrder() {

    try {

      const raw =
        window.localStorage.getItem(
          ALA_ACTIVE_ORDER_KEY
        );

      if (!raw) {
        return null;
      }

      return JSON.parse(
        raw
      );

    } catch (error) {

      console.error(
        "Erro ao recuperar pedido local:",
        error
      );

      return null;

    }

  }

  function removeActiveOrder() {

    try {

      window.localStorage.removeItem(
        ALA_ACTIVE_ORDER_KEY
      );

    } catch (error) {

      console.error(
        "Erro ao remover pedido local:",
        error
      );

    }

  }

  /* =======================================================
     RESTAURAR PEDIDO APÓS RELOAD MOBILE

     IMPORTANTE:
     Este effect só interfere se existir uma cobrança PIX
     persistida de uma compra anterior.

     Checkout novo continua seguindo normalmente:
     phone -> customer/endereço -> review -> payment.
  ======================================================= */

  // Pending Pix belongs to its saved order; reopening the cart never restores
  // a payment step without its customer/address context.

  /* =======================================================
     SUBTOTAL
  ======================================================= */

  const subtotal = useMemo(() => {

    if (
      Number.isFinite(
        Number(totalPrice)
      )
    ) {
      return Number(
        totalPrice || 0
      );
    }

    return (cart || []).reduce(
      (total, product) => {

        const price =
          getProductPrice(
            product
          );

        const quantity =
          Number(
            product.quantity || 1
          );

        return (
          total +
          price * quantity
        );

      },
      0
    );

  }, [
    cart,
    totalPrice,
  ]);

  /* =======================================================
     DESCONTO
  ======================================================= */

  const discountAmount =
    useMemo(() => {

      if (!appliedCoupon) {
        return 0;
      }

      if (
        appliedCoupon.type ===
        "percentage"
      ) {

        return (
          Math.min(subtotal * appliedCoupon.value / 100,appliedCoupon.max_discount??subtotal)
        );

      }

      if (
        appliedCoupon.type ===
        "fixed"
      ) {

        return Math.min(
          subtotal,
          Number(
            appliedCoupon.value || 0
          ),appliedCoupon.max_discount??subtotal
        );

      }

      return 0;

    }, [
      appliedCoupon,
      subtotal,
    ]);

  /* =======================================================
     TOTAL FINAL
  ======================================================= */

  const finalTotal =
    Math.max(
      subtotal -
      discountAmount + deliveryFee,
      0
    );

  /* =======================================================
     ENDEREÇO SALVO SELECIONADO
  ======================================================= */

  const selectedSavedAddress =
    savedAddresses.find(
      (item) =>
        item.id ===
        selectedAddressId
    );

  /* =======================================================
     ALTERAR CLIENTE
  ======================================================= */

  function handleCustomerChange(event) {

    const {
      name,
      value,
    } = event.target;

    if(name==='phone'&&normalizePhone(value)!==normalizePhone(customer.phone)){
      profileRequest.current++;setCustomer({phone:value,name:''});setAddress(emptyCheckoutAddress());setClientFound(false);setClientId(null);setSavedAddresses([]);setSelectedAddressId(null);setProfileNotice('');setPixDocument('');return;
    }
    setCustomer(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  /* =======================================================
     ALTERAR ENDEREÇO
  ======================================================= */

  function handleAddressChange(event){const {name,value}=event.target;pendingSuggestion.current=null;setAddress(a=>({...a,[name]:name==='cep'?value.replace(/\D/g,'').slice(0,8).replace(/^(\d{5})(\d)/,'$1-$2'):value,state:'MS'}));}

  /* =======================================================
     BUSCAR CLIENTE
  ======================================================= */

  async function handleSearchClient({automatic=false,phoneValue}={}){
    const phone=normalizePhone(phoneValue||customerLive.current.phone);if(phone.length<10||phone.length>11){setProfileNotice('Informe um telefone com DDD válido.');return;}
    const seq=++profileRequest.current;setLoadingClient(true);setProfileNotice('');
    let profile=null;
    try{profile=await findCheckoutProfile(phone);}catch{if(seq===profileRequest.current)setProfileNotice('Não foi possível recuperar os dados agora. Você pode preenchê-los para continuar.');}
    if(seq!==profileRequest.current||!flowActive.current||!checkoutVisible.current||(!phoneValue&&normalizePhone(customerLive.current.phone)!==phone))return;
    setLoadingClient(false);setClientId(null);setSavedAddresses([]);setSelectedAddressId(null);
    if(profile){
      const zone=zonesLive.current.find(z=>foldZone(z.city)===foldZone(profile.address.city)&&foldZone(z.neighborhood)===foldZone(profile.address.neighborhood));
      setClientFound(true);setCustomer({phone,name:profile.name,pixReady:false});setAddress({...profile.address,...(zone?{city:zone.city,neighborhood:zone.neighborhood}:{})});
      setProfileNotice(`Bem-vindo de volta, ${profile.name.split(' ')[0]}! Confira seus dados e o endereço de entrega.`);
      setCheckoutStep(hasCheckoutAddress(profile)&&zone?'review':'address-form');
    }else{
      if(automatic)return;
      setClientFound(false);setCustomer({phone,name:'',pixReady:false});setAddress(emptyCheckoutAddress());setCheckoutStep('customer');
    }
    // CPF recovery must never delay identifying the customer or showing the address.
    savedPixProfile(phone,profile).then(pix=>{if(flowActive.current&&normalizePhone(customerLive.current.phone)===phone)setCustomer(current=>({...current,pixReady:pix.available,pixReference:pix.reference}));}).catch(()=>{});
  }

  // Recognize a complete phone automatically, without any verification invitation.
  useEffect(()=>{
    const phone=normalizePhone(customer.phone);
    if(!checkoutOpen||checkoutStep!=='phone'||!(phone.length===11||(phone.length===10&&phone[2]!=='9')))return;
    const baseline=profileRequest.current;
    const timer=setTimeout(()=>{if(profileRequest.current===baseline)handleSearchClient({automatic:true});},500);
    return()=>{clearTimeout(timer);profileRequest.current++;};
  },[checkoutOpen,checkoutStep,normalizePhone(customer.phone)]);


  /* =======================================================
     SELECIONAR ENDEREÇO
  ======================================================= */

  function handleSelectAddress(
    savedAddress
  ) {

    setSelectedAddressId(
      savedAddress.id
    );

    setAddress({

      cep:
        savedAddress.zip_code ||
        "",

      street:
        savedAddress.street ||
        "",

      number:
        savedAddress.number ||
        "",

      complement:
        savedAddress.complement ||
        "",

      neighborhood:
        savedAddress.neighborhood ||
        "",

      city:
        savedAddress.city ||
        "",

      state:
        savedAddress.state ||
        "",

      reference:
        savedAddress.reference ||
        "",

    });
  }

  /* =======================================================
     LIMPAR ENDEREÇO
  ======================================================= */

  function clearAddress() {

    setSelectedAddressId(
      null
    );

    setAddress({

      cep: "",

      street: "",

      number: "",

      complement: "",

      neighborhood: "",

      city: "",

      state: "",

      reference: "",

    });
  }

  /* =======================================================
     NOVO ENDEREÇO
  ======================================================= */

  function handleNewAddress() {

    clearAddress();

    setCheckoutStep(
      "address-form"
    );
  }

  /* =======================================================
     CONTINUAR CLIENTE
  ======================================================= */

  function handleContinueCustomer() {

    if (
      !customer.name.trim()
    ) {

      alert(
        "Informe seu nome."
      );

      return;
    }

    setCheckoutStep(
      "address-form"
    );
  }

  /* =======================================================
     CONTINUAR ENDEREÇO NOVO
  ======================================================= */

  function handleContinueAddress() {

    if (
      !address.street.trim()
    ) {

      alert(
        "Informe o endereço de entrega."
      );

      return;
    }

    if (
      !address.number.trim()
    ) {

      alert(
        "Informe o número."
      );

      return;
    }

    if (
      !address.neighborhood.trim()
    ) {

      alert(
        "Informe o bairro."
      );

      return;
    }

    if (
      !address.city.trim()
    ) {

      alert(
        "Informe a cidade."
      );

      return;
    }

    if(!deliveryZone){alert(zonesError||'Selecione um bairro atendido pela loja.');return;}
    setAddress(a=>({...a,state:'MS'}));
    saveCheckoutProfile({phone:customer.phone,name:customer.name,address});
    setCheckoutStep(
      "review"
    );
  }

  /* =======================================================
     ENDEREÇO SALVO -> RESUMO
  ======================================================= */

  function handleContinueSavedAddress() {

    if (
      !selectedAddressId
    ) {

      alert(
        "Escolha um endereço."
      );

      return;
    }

    setCheckoutStep(
      "review"
    );
  }

  /* =======================================================
     CUPOM
  ======================================================= */

  const [couponBusy,setCouponBusy]=useState(false);
  async function handleApplyCoupon(){
    if(couponBusy)return;
    const code=couponCode.trim().toUpperCase();if(!code){setCouponMessage('Digite um cupom.');return;}
    setCouponBusy(true);try{const c=await commerce('/coupon',{customer:true,method:'POST',body:JSON.stringify({code,subtotal})});setAppliedCoupon(c);setCouponMessage(`Cupom aplicado: ${c.label}.`);}catch(e){setAppliedCoupon(null);setCouponMessage(e.message);}finally{setCouponBusy(false);}
  }

  /* =======================================================
     REMOVER CUPOM
  ======================================================= */

  function handleRemoveCoupon() {

    setAppliedCoupon(
      null
    );

    setCouponCode("");

    setCouponMessage("");
  }

  /* =======================================================
     PAGAMENTO
  ======================================================= */

  function handleSelectPayment(
    method
  ) {
    if(pixGeneration.current)return;
    setPixIntent(method==='pix');

    setPaymentMethod(
      method
    );

    if (
      method !==
      "dinheiro"
    ) {

      setNeedsChange(
        null
      );

      setChangeFor("");

    }

    if (
      method !==
      "cartao"
    ) {

      setCardType("");

    }
  }

  /* =======================================================
     TROCO
  ======================================================= */

  function handleChangeChoice(
    value
  ) {

    setNeedsChange(
      value
    );

    if (
      value === false
    ) {

      setChangeFor("");

    }
  }

  /* =======================================================
     HELPERS PIX
  ======================================================= */

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function formatPixTime(totalSeconds) {

    const safeSeconds =
      Math.max(0, Number(totalSeconds || 0));

    const minutes =
      Math.floor(safeSeconds / 60);

    const seconds =
      safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  /* =======================================================
     PROTOCOLO DO PEDIDO
  ======================================================= */

  function getOrderProtocol() {

    if (
      localOrderProtocol
    ) {

      return localOrderProtocol;

    }

    const source =
      String(
        pixData?.order_code ||
        pixData?.order_id ||
        ""
      );

    if (!source) {

      return "ALA------";

    }

    let hash = 0;

    for (
      let index = 0;
      index < source.length;
      index++
    ) {

      hash =
        (
          hash * 31 +
          source.charCodeAt(index)
        ) %
        1000000;

    }

    return `ALA-${String(hash).padStart(6, "0")}`;

  }

  /* =======================================================
     LINK DE RASTREIO
  ======================================================= */

  function getTrackingUrl(){return window.location.origin+trackingURL(localOrderId);}

  async function handleCopyPix() {
    if (pixSecondsLeft <= 0) return;
    setPixCopied(false);
    setPixError('');
    const copied = await copyPix(pixData?.qr_code, pixCodeRef.current);
    setPixCopied(copied);
    if (copied) window.setTimeout(() => setPixCopied(false), 2200);
    else setPixError('Toque e segure o código selecionado e escolha Copiar.');
  }

  /* =======================================================
     SNAPSHOT FINAL DO PEDIDO

     A tela de sucesso usa este objeto e NÃO depende mais
     do carrinho/contexto depois que o pagamento foi feito.
  ======================================================= */

  function buildCompletedOrderSnapshot() {

    return {

      protocol:
        getOrderProtocol(),

      local_order_id:
        localOrderId,

      pagarme_order_id:
        pixData?.order_id ||
        null,

      pagarme_charge_id:
        pixData?.charge_id ||
        null,

      pagarme_transaction_id:
        pixData?.transaction_id ||
        null,

      customer: {

        name:
          customer.name,

        phone:
          customer.phone,

      },

      address: {

        street:
          address.street,

        number:
          address.number,

        complement:
          address.complement,

        neighborhood:
          address.neighborhood,

        city:
          address.city,

        state:
          address.state,

        cep:
          address.cep,

        reference:
          address.reference,

      },

      items:
        (cart || []).map(
          (product) => {

            const quantity =
              Number(
                product.quantity ||
                1
              );

            const unitPrice =
              getProductPrice(
                product
              );

            return {

              id:
                product.id ||
                product.code ||
                `${product.name}-${quantity}`,

              name:
                product.name ||
                product.title ||
                "Produto",

              quantity,

              unit_price:
                unitPrice,

              total_price:
                unitPrice *
                quantity,

            };

          }
        ),

      delivery_fee: deliveryFee,
      subtotal:
        Number(
          subtotal || 0
        ),

      discount:
        Number(
          discountAmount || 0
        ),

      total:
        Number(
          finalTotal || 0
        ),

      coupon:
        appliedCoupon?.code ||
        null,

      observation:
        observation || "",

      payment_method:
        "pix",

      payment_status:
        "paid",

      order_status:
        "confirmed",

      paid_at:
        new Date()
          .toISOString(),

    };

  }

  /* =======================================================
     PROTOCOLO LOCAL
  ======================================================= */

  /* =======================================================
     CRIAR PEDIDO LOCAL ANTES DO PAGAMENTO
  ======================================================= */

  async function createLocalOrderBeforePayment(
    document
  ) {

    return persistOrder('pix',document);
  }

  /* =======================================================
     VINCULAR PAGAR.ME AO PEDIDO LOCAL
  ======================================================= */

  async function linkPagarmeToLocalOrder(){ /* O servidor já vinculou a cobrança. */ }
  async function markLocalOrderAsPaid(){ /* Confirmação exclusiva do servidor. */ }

  async function createPixPayment() {
    if(pixGeneration.current||!flowActive.current)return;
    const problem=checkoutProblem(customer,address,cart);
    if(problem){setPixIntent(false);setCheckoutStep(problem.step);setProfileNotice(problem.message);return;}

    const pixAmountInCents =
      Math.round(
        Number(
          finalTotal || 0
        ) * 100
      );

    if (
      !Number.isFinite(
        pixAmountInCents
      ) ||
      pixAmountInCents <= 0
    ) {

      setPixError(
        "Não é possível gerar um PIX para um pedido com valor zero."
      );

      return;
    }

    const phone =
      normalizePhone(
        customer.phone
      );

    const savedDocument =
      onlyDigits(
        customer.document
      );

    const typedDocument =
      onlyDigits(
        pixDocument
      );

    const document =
      savedDocument ||
      typedDocument;

    if (
      document.length !== 11 && !customer.pixReady
    ) {

      setPixError(
        "Informe o CPF do pagador para gerar o Pix deste pedido."
      );

      return;
    }

    pixGeneration.current=true;
    let needsCpf=false;
    try {

      setPixLoading(true);
      setPixError("");
      setPixCopied(false);
      setPixPaid(false);
      setPixConfirming(false);

      /* ===============================================
         SALVAR CPF NO CLIENTE SE AINDA NÃO EXISTIR
      =============================================== */

      /* ===============================================
         CRIAR PEDIDO LOCAL
      =============================================== */

      const createdLocalOrder =
        await createLocalOrderBeforePayment(
          document
        );

      /* ===============================================
         GERAR PIX
      =============================================== */

      const result=await commerce(`/orders/${createdLocalOrder.id}/pix`,{method:'POST',token:orderCredentials(createdLocalOrder.id)?.token,body:JSON.stringify({document})});

      if (
        !result?.qr_code
      ) {

        throw new Error(
          "O Pagar.me não retornou o código PIX."
        );
      }

      await linkPagarmeToLocalOrder(
        createdLocalOrder?.id,
        result
      );

      if(flowActive.current){setPixDocument('');setCustomer(c=>({...c,pixReady:true}));}
      setPixData(
        result
      );

      /*
       * Salva TUDO necessário para sobreviver a reload
       * no celular enquanto o usuário abre o banco.
       */
      const pendingOrderSnapshot = {

        protocol:
          createdLocalOrder?.protocol ||
          localOrderProtocol ||
          result?.order_code ||
          "",

        local_order_id:
          createdLocalOrder?.id ||
          null,

        pagarme_order_id:
          result?.order_id ||
          null,

        pagarme_charge_id:
          result?.charge_id ||
          null,

        pagarme_transaction_id:
          result?.transaction_id ||
          null,

        customer: {

          name:
            customer.name,

          phone:
            customer.phone,

        },

        address: {

          street:
            address.street,

          number:
            address.number,

          complement:
            address.complement,

          neighborhood:
            address.neighborhood,

          city:
            address.city,

          state:
            address.state,

          cep:
            address.cep,

          reference:
            address.reference,

        },

        items:
          (cart || []).map(
            (product) => {

              const quantity =
                Number(
                  product.quantity ||
                  1
                );

              const unitPrice =
                getProductPrice(
                  product
                );

              return {

                id:
                  product.id ||
                  product.code ||
                  `${product.name}-${quantity}`,

                name:
                  product.name ||
                  product.title ||
                  "Produto",

                quantity,

                unit_price:
                  unitPrice,

                total_price:
                  unitPrice *
                  quantity,

              };

            }
          ),

        delivery_fee: deliveryFee,
      subtotal:
          Number(
            subtotal || 0
          ),

        discount:
          Number(
            discountAmount || 0
          ),

        total:
          Number(
            finalTotal || 0
          ),

        coupon:
          appliedCoupon?.code ||
          null,

        observation:
          observation || "",

        payment_method:
          "pix",

        payment_status:
          "pending",

        order_status:
          "pending",

      };

      saveActiveOrder({

        status:
          "waiting_payment",

        protocol:
          pendingOrderSnapshot.protocol,

        local_order_id:
          pendingOrderSnapshot.local_order_id,

        pix:
          result,

        order_snapshot:
          pendingOrderSnapshot,

      });

      const expiresAt =
        new Date(
          result.expires_at
        ).getTime();

      setPixSecondsLeft(
        Math.max(
          0,
          Math.floor(
            (
              expiresAt -
              Date.now()
            ) / 1000
          )
        )
      );

      if(flowActive.current)setCheckoutStep(
        "pix-payment"
      );

    } catch (error) {
      if(error.code==='CPF_REQUIRED'&&flowActive.current){needsCpf=true;setCustomer(c=>({...c,pixReady:false,document:''}));setPixDocument('');}

      console.error(
        "Erro ao gerar PIX:",
        error
      );

      setPixError(
        error?.message ||
        "Não foi possível gerar o PIX."
      );

    } finally {
      pixGeneration.current=false;setPixIntent(needsCpf);

      setPixLoading(
        false
      );

    }

  }

  useEffect(()=>{
    if(!checkoutOpen||checkoutStep!=='payment'||paymentMethod!=='pix'||!pixIntent)return;
    if(!customer.pixReady&&onlyDigits(customer.document).length!==11&&onlyDigits(pixDocument).length!==11){
      const focus=setTimeout(()=>document.querySelector('#checkout-pix-cpf')?.focus({preventScroll:true}),50);return()=>clearTimeout(focus);
    }
    const timer=setTimeout(()=>createPixPayment(),250);return()=>clearTimeout(timer);
  },[checkoutOpen,checkoutStep,paymentMethod,pixIntent,pixDocument,customer.pixReady,customer.document]);

  /* =======================================================
     LIMPAR COBRANÇA PIX ATUAL
  ======================================================= */

  function clearCurrentPixSession() {

    removeActiveOrder();

    setPixData(null);
    setPixError("");
    setPixCopied(false);
    setPixPaid(false);
    setPixConfirming(false);
    setPixSecondsLeft(0);

    setLocalOrderId(null);
    setLocalOrderProtocol("");
    setCompletedOrder(null);

  }

  /* =======================================================
     GERAR NOVO PIX APÓS EXPIRAÇÃO

     Volta para PAGAMENTO sem limpar:
     - carrinho
     - cliente
     - endereço
     - cupom
     - observação
  ======================================================= */

  function handleRestartPix() {

    clearCurrentPixSession();

    setCheckoutStep(
      "payment"
    );

  }

  /* =======================================================
     CONTAGEM REGRESSIVA DO PIX
  ======================================================= */

  useEffect(() => {

    if (
      checkoutStep !==
        "pix-payment" ||
      !pixData?.expires_at ||
      pixPaid
    ) {
      return;
    }

    const updateTimer = () => {

      const expiresAt =
        new Date(
          pixData.expires_at
        ).getTime();

      const seconds =
        Math.max(
          0,
          Math.floor(
            (expiresAt - Date.now()) /
            1000
          )
        );

      setPixSecondsLeft(
        seconds
      );

      if (seconds <= 0) {

        /*
         * Impede que um reload ressuscite um PIX vencido.
         * A tela atual continua aberta para mostrar o botão
         * "Gerar novo PIX".
         */
        removeActiveOrder();

      }

    };

    updateTimer();

    const timer =
      window.setInterval(
        updateTimer,
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );

  }, [
    checkoutStep,
    pixData,
    pixPaid,
  ]);

  /* =======================================================
     CONSULTAR PAGAMENTO PIX

     IMPORTANTE:
     Este effect NÃO depende de pixSecondsLeft.
     O contador muda a cada segundo e antes cancelava
     a transição para a tela final.
  ======================================================= */

  useEffect(() => {

    if (
      checkoutStep !==
        "pix-payment" ||
      !pixData?.order_id ||
      pixPaid
    ) {
      return;
    }

    let cancelled = false;
    let polling = null;
    let paymentHandled = false;

    const checkStatus =
      async () => {

        /*
         * Evita consultar depois que já detectamos pagamento.
         */
        if (
          cancelled ||
          paymentHandled
        ) {
          return;
        }

        /*
         * Verifica expiração diretamente pela data do PIX.
         * Não usamos pixSecondsLeft aqui.
         */
        if (
          pixData?.expires_at
        ) {

          const expired =
            new Date(
              pixData.expires_at
            ).getTime() <=
            Date.now();

          if (expired) {

            if (polling) {

              window.clearInterval(
                polling
              );

            }

            return;

          }

        }

        try {

          const result =
            await commerce(`/orders/${localOrderId}/pix-status`,{token:orderCredentials(localOrderId)?.token});

          if (
            cancelled
          ) {
            return;
          }

          const isPaid =
            result?.paid === true ||
            result?.status ===
              "paid";

          if (!isPaid) {
            return;
          }

          /*
           * Trava para executar UMA ÚNICA VEZ.
           */
          paymentHandled =
            true;

          if (polling) {

            window.clearInterval(
              polling
            );

          }

          console.log(
            "PIX PAGO DETECTADO:",
            pixData.order_id
          );

          /*
           * Pagamento detectado.
           * Mantemos a tela estável enquanto sincronizamos
           * o pedido e em seguida abrimos o sucesso.
           */

          /*
           * Atualiza o pedido no banco.
           *
           * Mesmo se houver algum problema nessa atualização,
           * não vamos impedir a tela de sucesso do cliente.
           */
          try {

            await markLocalOrderAsPaid();

          } catch (localOrderError) {

            console.error(
              "Erro ao atualizar pedido local após pagamento:",
              localOrderError
            );

          }

          if (
            cancelled
          ) {
            return;
          }

          const persistedOrder =
            readActiveOrder();

          const baseSnapshot =
            persistedOrder
              ?.order_snapshot ||
            buildCompletedOrderSnapshot();

          const finalSnapshot = {

            ...baseSnapshot,

            protocol:
              baseSnapshot?.protocol ||
              localOrderProtocol ||
              getOrderProtocol(),

            pagarme_order_id:
              pixData?.order_id ||
              baseSnapshot?.pagarme_order_id ||
              null,

            payment_method:
              "pix",

            payment_status:
              "paid",

            order_status:
              "confirmed",

            paid_at:
              new Date()
                .toISOString(),

          };

          /*
           * Atualiza localStorage ANTES de trocar a tela.
           * Se o mobile recarregar agora, volta no sucesso.
           */
          saveActiveOrder({

            status:
              "paid",

            protocol:
              finalSnapshot.protocol,

            local_order_id:
              localOrderId ||
              persistedOrder?.local_order_id ||
              null,

            pix:
              pixData,

            order_snapshot:
              finalSnapshot,

          });

          console.log(
            "ABRINDO TELA FINAL DO PEDIDO:",
            finalSnapshot.protocol
          );

          /*
           * A tela final agora possui uma etapa própria.
           * Não fica mais presa dentro de pix-payment.
           */
          setCompletedOrder(
            finalSnapshot
          );

          setPixPaid(
            true
          );

          setPixConfirming(
            false
          );

          await showSuccessWithTransition();

          console.log(
            "MANTENDO CHECKOUT ABERTO NA TELA DE SUCESSO"
          );

      } catch (error) {

        console.error(
          "Erro ao consultar PIX:",
          error
        );

      }

    };

    /*
     * Primeira consulta imediatamente.
     */
    checkStatus();

    /*
     * Depois consulta a cada 5 segundos.
     */
    polling =
      window.setInterval(
        checkStatus,
        5000
      );

    return () => {

      cancelled =
        true;

      if (polling) {

        window.clearInterval(
          polling
        );

      }

    };

  }, [
    checkoutStep,
    pixData?.order_id,
    pixData?.expires_at,
    pixPaid,
  ]);

  function handleFinishPaidPix() {

    console.log(
      "USUÁRIO FINALIZOU A TELA DE SUCESSO"
    );

    /*
     * Só agora apagamos o pedido persistido.
     */
    removeActiveOrder();

    clearCart();

    clearCheckout();

    setPixData(null);

    setPixPaid(false);

    setPixConfirming(false);

    setPixSecondsLeft(0);

    setLocalOrderId(null);

    setLocalOrderProtocol("");

    setCompletedOrder(null);

    closeCheckout();

  }

  /* =======================================================
     VOLTAR
  ======================================================= */

  useEffect(() => {
    if (!embedded || !checkoutOpen) return;
    const frame = requestAnimationFrame(() => document.querySelector('.sf-checkout .checkoutBackButton')?.focus({preventScroll:true}));
    return () => cancelAnimationFrame(frame);
  }, [embedded, checkoutOpen, checkoutStep]);

  function handleBackStep() {

    if (
      pixConfirming ||
      pixPaid ||
      checkoutStep ===
        "success"
    ) {
      return;
    }

    if (
      checkoutStep ===
      "phone"
    ) {

      if (embedded && onBackToCart) onBackToCart();
      else closeCheckout();

      return;
    }

    if (
      checkoutStep ===
      "customer"
    ) {

      setCheckoutStep(
        "phone"
      );

      return;
    }

    if (
      checkoutStep ===
      "address-selection"
    ) {

      setCheckoutStep(
        "phone"
      );

      return;
    }

    if (
      checkoutStep ===
      "address-form"
    ) {

      if (
        clientFound &&
        savedAddresses.length >
        0
      ) {

        setCheckoutStep(
          "address-selection"
        );

      } else if (
        clientFound
      ) {

        setCheckoutStep(
          "phone"
        );

      } else {

        setCheckoutStep(
          "customer"
        );

      }

      return;
    }

    if (
      checkoutStep ===
      "review"
    ) {

      if (
        clientFound &&
        savedAddresses.length >
        0 &&
        selectedAddressId
      ) {

        setCheckoutStep(
          "address-selection"
        );

      } else {

        setCheckoutStep(
          "address-form"
        );

      }

      return;
    }

    if (
      checkoutStep ===
      "pix-payment"
    ) {

      if (
        pixSecondsLeft <= 0
      ) {
        clearCurrentPixSession();
      }

      setCheckoutStep(
        "payment"
      );

      return;
    }

    if (
      checkoutStep ===
      "payment"
    ) {

      setCheckoutStep(
        "review"
      );

    }
  }

  /* =======================================================
     EDITAR CLIENTE
  ======================================================= */

  function handleEditCustomer() {

    setCheckoutStep(
      "phone"
    );
  }

  /* =======================================================
     EDITAR ENDEREÇO
  ======================================================= */

  function handleEditAddress() {

    if (
      clientFound &&
      savedAddresses.length > 0
    ) {

      setCheckoutStep(
        "address-selection"
      );

    } else {

      setCheckoutStep(
        "address-form"
      );

    }
  }

  /* =======================================================
     PEDIDO COM PAGAMENTO NA ENTREGA
  ======================================================= */

  async function createPayOnDeliveryOrder() {

    const createdOrder=await persistOrder(paymentMethod,onlyDigits(customer.document));
    const snapshot = {

      protocol:
        createdOrder.protocol,

      local_order_id:
        createdOrder.id,

      pagarme_order_id:
        null,

      pagarme_charge_id:
        null,

      pagarme_transaction_id:
        null,

      customer: {

        name:
          customer.name,

        phone:
          customer.phone,

      },

      address: {

        street:
          address.street,

        number:
          address.number,

        complement:
          address.complement,

        neighborhood:
          address.neighborhood,

        city:
          address.city,

        state:
          address.state,

        cep:
          address.cep,

        reference:
          address.reference,

      },

      items:
        (cart || []).map(
          (product) => {

            const quantity =
              Number(
                product.quantity ||
                1
              );

            const unitPrice =
              getProductPrice(
                product
              );

            return {

              id:
                product.id ||
                product.code ||
                `${product.name}-${quantity}`,

              name:
                product.name ||
                product.title ||
                "Produto",

              quantity,

              unit_price:
                unitPrice,

              total_price:
                unitPrice *
                quantity,

            };

          }
        ),

      delivery_fee: deliveryFee,
      subtotal:
        Number(
          subtotal || 0
        ),

      discount:
        Number(
          discountAmount || 0
        ),

      total:
        Number(
          finalTotal || 0
        ),

      coupon:
        appliedCoupon?.code ||
        null,

      observation:
        observation || "",

      payment_method:
        paymentMethod,

      payment_status:
        "pending",

      order_status:
        "confirmed",

      card_type:
        paymentMethod === "cartao"
          ? cardType
          : null,

      needs_change:
        paymentMethod === "dinheiro"
          ? needsChange
          : null,

      change_for:
        paymentMethod === "dinheiro" &&
        needsChange === true
          ? changeFor
          : null,

      paid_at:
        null,

    };

    setLocalOrderId(
      createdOrder.id
    );

    setLocalOrderProtocol(
      createdOrder.protocol
    );

    setCompletedOrder(
      snapshot
    );

    setPixPaid(
      false
    );

    setPixConfirming(
      false
    );

    await showSuccessWithTransition();

  }

  /* =======================================================
     VALIDAR PAGAMENTO
  ======================================================= */

  function validatePayment() {

    if (!paymentMethod) {

      alert(
        "Escolha uma forma de pagamento."
      );

      return false;
    }

    if (
      paymentMethod ===
      "cartao" &&
      !cardType
    ) {

      alert(
        "Escolha crédito ou débito."
      );

      return false;
    }

    if (
      paymentMethod ===
      "dinheiro" &&
      needsChange === null
    ) {

      alert(
        "Informe se precisa de troco."
      );

      return false;
    }

    if (
      paymentMethod ===
      "dinheiro" &&
      needsChange === true &&
      !changeFor.trim()
    ) {

      alert(
        "Informe o valor para o troco."
      );

      return false;
    }

    return true;
  }

  /* =======================================================
     FINALIZAR
  ======================================================= */

  const [orderSubmitting,setOrderSubmitting]=useState(false),orderSubmittingRef=useRef(false);
  async function handleFinishOrder(
    event
  ) {

    event.preventDefault();
    if(orderSubmittingRef.current)return;
    const problem=checkoutProblem(customer,address,cart);
    if(problem){setCheckoutStep(problem.step);setProfileNotice(problem.message);return;}

    if (
      checkoutStep !==
      "payment"
    ) {
      return;
    }

    if (
      !customer.name.trim()
    ) {

      alert(
        "Informe seu nome."
      );

      return;
    }

    if (
      !customer.phone.trim()
    ) {

      alert(
        "Informe seu telefone."
      );

      return;
    }

    if (
      !address.street.trim()
    ) {

      alert(
        "Informe o endereço de entrega."
      );

      return;
    }

    if (
      !validatePayment()
    ) {
      return;
    }

    /* ===============================================
       PIX -> GERAR COBRANÇA NO PAGAR.ME
    =============================================== */

    if (
      paymentMethod ===
      "pix"
    ) {

      await createPixPayment();

      return;
    }

    orderSubmittingRef.current=true;setOrderSubmitting(true);
    try {

      await createPayOnDeliveryOrder();

    } catch (error) {

      console.error(
        "Erro ao finalizar pedido com pagamento na entrega:",
        error
      );

      alert(
        error?.message ||
        "Não foi possível registrar o pedido."
      );

    } finally {orderSubmittingRef.current=false;setOrderSubmitting(false);}

  }

  /* =======================================================
     FECHADO
  ======================================================= */

  if (!renderDrawer && !embedded) {
    return null;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <CheckoutFrame embedded={embedded} visible={drawerVisible} success={checkoutStep === "success"} onClose={checkoutStep === "success" ? handleFinishPaidPix : (onRequestClose || closeCheckout)}>
        {/* =================================================
            HEADER
        ================================================= */}

        <header className="checkoutHeader">

          <div className="checkoutHeaderTitle">

            <button
              type="button"
              className="checkoutBackButton"
              onClick={
                handleBackStep
              }
              aria-label="Voltar"
            >

              <ArrowLeft
                size={20}
              />

            </button>

            <div>

              {embedded && <span className="sf-eyebrow">{checkoutStep === 'phone' || checkoutStep === 'customer' ? '01 · CONTATO' : checkoutStep.startsWith('address') ? '02 · ENTREGA' : checkoutStep === 'success' ? 'PEDIDO REGISTRADO' : '03 · PAGAMENTO'}</span>}
              <h2>
                Finalizar pedido
              </h2>

              <span>

                {totalItems}{" "}

                {totalItems === 1
                  ? "item"
                  : "itens"}

              </span>

            </div>

          </div>

          <button
            type="button"
            className="checkoutCloseButton"
            onClick={
              () => {
                if(checkoutStep === "success") handleFinishPaidPix();
                else (onRequestClose || closeCheckout)();
              }
            }
            aria-label="Fechar checkout"
          >

            <X
              size={21}
            />

          </button>

        </header>

        {/* =================================================
            CONTEÚDO
        ================================================= */}

        <form
          className="checkoutContent"
          action=""
          onSubmit={
            (event) => {

              event.preventDefault();

              event.stopPropagation();

              if (
                checkoutStep ===
                "payment"
              ) {

                handleFinishOrder(
                  event
                );

              }

            }
          }
        >

          <div
            key={
              checkoutStep
            }
            className="checkoutStepAnimation"
          >

            {/* ===============================================
                TELEFONE
            =============================================== */}

            {checkoutStep ===
            "phone" && (

              <section className="checkoutSection checkoutPhoneStep">

                <div className="checkoutSectionTitle">

                  <div className="checkoutSectionIcon">

                    <Phone
                      size={17}
                    />

                  </div>

                  <div>

                    <h3>
                      Qual é seu WhatsApp?
                    </h3>

                    <p>
                      Se já comprou neste aparelho, vamos preencher seus dados.
                    </p>

                  </div>

                </div>

                <div className="checkoutField">

                  <label htmlFor="checkout-phone">
                    WhatsApp / Telefone
                  </label>

                  <div className="checkoutInputWrapper">

                    <Phone
                      size={17}
                    />

                    <input
                      id="checkout-phone"
                      type="tel"
                      name="phone"
                      value={
                        customer.phone
                      }
                      onChange={
                        handleCustomerChange
                      }
                      placeholder="(21) 99999-9999"
                      autoComplete="tel"
                      inputMode="tel"
                    />

                  </div>

                </div>

                {phoneSuggestions.filter(p=>!normalizePhone(customer.phone)||p.phone.startsWith(normalizePhone(customer.phone))).slice(0,3).map(profile=><button key={profile.phone} type="button" className="checkoutPhoneSuggestion" onClick={()=>handleSearchClient({phoneValue:profile.phone})} disabled={loadingClient}><Phone size={15}/><span><strong>{profile.name.split(' ')[0]}</strong><small>{profile.phone.replace(/^(\d{2})(\d{4,5})(\d{4})$/,'($1) $2-$3')}</small></span><ChevronRight size={16}/></button>)}
                {returningProfile&&<div className="checkoutReturning" role="status"><User size={19}/><div><strong>Olá, {returningProfile.name.split(' ')[0]}!</strong><p>Seus dados estão salvos. Continue para conferir a entrega.</p></div></div>}
                <button
                  type="button"
                  className="checkoutContinueButton"
                  onClick={
                    handleSearchClient
                  }
                  disabled={
                    loadingClient
                  }
                >

                  {loadingClient
                    ? "Localizando cadastro..."
                    : "Continuar"}

                </button>

              </section>

            )}

            {profileNotice&&<p className="checkoutProfileNotice" role="status">{profileNotice}</p>}

            {/* ===============================================
                CLIENTE NOVO
            =============================================== */}

            {checkoutStep ===
            "customer" && (

              <section className="checkoutSection">

                <div className="checkoutSectionTitle">

                  <div className="checkoutSectionIcon">

                    <User
                      size={17}
                    />

                  </div>

                  <div>

                    <h3>
                      Prazer! 😊
                    </h3>

                    <p>
                      Parece que esta é sua primeira compra.
                    </p>

                  </div>

                </div>

                <div className="checkoutField">

                  <label htmlFor="checkout-name">

                    Como podemos te chamar?

                  </label>

                  <div className="checkoutInputWrapper">

                    <User
                      size={17}
                    />

                    <input
                      id="checkout-name"
                      type="text"
                      name="name"
                      value={
                        customer.name
                      }
                      onChange={
                        handleCustomerChange
                      }
                      placeholder="Seu nome"
                      autoComplete="name"
                      autoFocus
                    />

                  </div>

                </div>

                <div className="checkoutCustomerPhone">

                  <Phone
                    size={15}
                  />

                  <span>
                    {customer.phone}
                  </span>

                </div>

                <button
                  type="button"
                  className="checkoutContinueButton"
                  onClick={
                    handleContinueCustomer
                  }
                >

                  Continuar

                </button>

              </section>

            )}

            {/* ===============================================
                ENDEREÇOS SALVOS
            =============================================== */}

            {checkoutStep ===
            "address-selection" && (

              <section className="checkoutSection">

                <div className="checkoutWelcome">

                  <strong>

                    Olá,{" "}

                    {customer.name
                      ? customer.name.split(" ")[0]
                      : "cliente"}

                    ! 👋

                  </strong>

                  <span>
                    Escolha onde vamos entregar.
                  </span>

                </div>

                <div className="checkoutSectionTitle">

                  <div className="checkoutSectionIcon">

                    <MapPin
                      size={17}
                    />

                  </div>

                  <div>

                    <h3>
                      Endereço de entrega
                    </h3>

                    <p>
                      Selecione um dos endereços cadastrados.
                    </p>

                  </div>

                </div>

                <div className="checkoutSavedAddresses">

                  {savedAddresses.map(
                    (item) => {

                      const label =
                        String(
                          item.label || ""
                        )
                          .trim()
                          .toLowerCase();

                      const isWork =

                        label.includes(
                          "trabalho"
                        ) ||

                        label.includes(
                          "empresa"
                        ) ||

                        label.includes(
                          "escritório"
                        ) ||

                        label.includes(
                          "escritorio"
                        );

                      const AddressIcon =
                        isWork
                          ? BriefcaseBusiness
                          : House;

                      const isSelected =
                        selectedAddressId ===
                        item.id;

                      return (

                        <button
                          key={
                            item.id
                          }
                          type="button"
                          className={
                            isSelected
                              ? "checkoutSavedAddress active"
                              : "checkoutSavedAddress"
                          }
                          onClick={() =>
                            handleSelectAddress(
                              item
                            )
                          }
                        >

                          <div className="checkoutSavedAddressIcon">

                            <AddressIcon
                              size={18}
                            />

                          </div>

                          <div className="checkoutSavedAddressContent">

                            <div className="checkoutSavedAddressTop">

                              <strong>

                                {item.label ||
                                  (
                                    isWork
                                      ? "Trabalho"
                                      : "Casa"
                                  )}

                              </strong>

                              {item.is_default && (

                                <span className="checkoutDefaultLabel">

                                  Padrão

                                </span>

                              )}

                            </div>

                            <span className="checkoutSavedAddressMain">

                              {item.street}

                              {item.number
                                ? `, ${item.number}`
                                : ""}

                            </span>

                            <span className="checkoutSavedAddressSecondary">

                              {item.neighborhood}

                              {item.city
                                ? ` • ${item.city}`
                                : ""}

                              {item.state
                                ? ` - ${item.state}`
                                : ""}

                            </span>

                            {item.complement && (

                              <span className="checkoutSavedAddressExtra">

                                {item.complement}

                              </span>

                            )}

                          </div>

                          <div className="checkoutSavedAddressCheck">

                            {isSelected && (

                              <CheckCircle2
                                size={18}
                              />

                            )}

                          </div>

                        </button>

                      );

                    }
                  )}

                </div>

                <button
                  type="button"
                  className="checkoutNewAddressButton"
                  onClick={
                    handleNewAddress
                  }
                >

                  <MapPin
                    size={16}
                  />

                  <span>
                    Usar outro endereço
                  </span>

                </button>

                <button
                  type="button"
                  className="checkoutContinueButton"
                  disabled={
                    !selectedAddressId
                  }
                  onClick={
                    handleContinueSavedAddress
                  }
                >

                  Continuar

                </button>

              </section>

            )}

            {/* ===============================================
                NOVO ENDEREÇO
            =============================================== */}

            {checkoutStep ===
            "address-form" && (

              <section className="checkoutSection">

                <div className="checkoutSectionTitle">

                  <div className="checkoutSectionIcon">

                    <MapPin
                      size={17}
                    />

                  </div>

                  <div>

                    <h3>
                      Endereço de entrega
                    </h3>

                    <p>
                      Informe onde devemos entregar seu pedido.
                    </p>

                  </div>

                </div>

                <div className="checkoutRow">

                  <div className="checkoutField checkoutCity">

                    <label htmlFor="checkout-city">
                      Cidade
                    </label>

                    <select id="checkout-city" name="city" value={address.city} onChange={e=>{pendingSuggestion.current=null;setAddress(a=>({...a,city:e.target.value,neighborhood:'',state:'MS'}));}}><option value="">Selecione a cidade</option>{supportedCities.map(c=><option key={c} value={c}>{c}-MS</option>)}</select>

                  </div>


                </div>

                <div className="checkoutRow">

                  <div className="checkoutField checkoutCep">

                    <label htmlFor="checkout-cep">
                      CEP
                    </label>

                    <input
                      id="checkout-cep"
                      type="text"
                      name="cep"
                      maxLength={9}
                      autoComplete="postal-code"
                      aria-describedby="checkout-cep-feedback"
                      aria-busy={cepBusy}
                      value={
                        address.cep
                      }
                      onChange={
                        handleAddressChange
                      }
                      placeholder="00000-000"
                      inputMode="numeric"
                    /><small id="checkout-cep-feedback" role="status">{cepNotice||'Digite o CEP para sugerir cidade, rua e bairro.'}</small>

                  </div>

                  <div className="checkoutField checkoutStreet">

                    <label htmlFor="checkout-street">
                      Rua
                    </label>

                    <input
                      id="checkout-street"
                      type="text"
                      name="street"
                      autoComplete="address-line1"
                      value={
                        address.street
                      }
                      onChange={
                        handleAddressChange
                      }
                      placeholder="Nome da rua"
                    />

                  </div>

                </div>

                <div className="checkoutRow">

                  <div className="checkoutField checkoutNumber">

                    <label htmlFor="checkout-number">
                      Número
                    </label>

                    <input
                      id="checkout-number"
                      type="text"
                      name="number"
                      autoComplete="off"
                      value={
                        address.number
                      }
                      onChange={
                        handleAddressChange
                      }
                      placeholder="123"
                      inputMode="numeric"
                    />

                  </div>

                  <div className="checkoutField checkoutComplement">

                    <label htmlFor="checkout-complement">
                      Complemento
                    </label>

                    <input
                      id="checkout-complement"
                      type="text"
                      name="complement"
                      value={
                        address.complement
                      }
                      onChange={
                        handleAddressChange
                      }
                      placeholder="Apto, bloco..."
                    />

                  </div>

                </div>

                <div className="checkoutField">

                  <label htmlFor="checkout-neighborhood">
                    Bairro
                  </label>

                  <select id="checkout-neighborhood" name="neighborhood" value={address.neighborhood} onChange={handleAddressChange}><option value="">Selecione seu bairro</option>{deliveryZones.filter(z=>foldZone(z.city)===foldZone(address.city)).map(z=><option key={z.id} value={z.neighborhood}>{z.neighborhood} · {formatPrice(z.fee)}</option>)}</select>
                  <p role="status">{zonesError|| (deliveryZone?`Entrega: ${formatPrice(deliveryFee)} · estimativa ${deliveryZone.eta_minutes} min`:'Selecione cidade e bairro para consultar a entrega.')}</p>

                </div>

                <div className="checkoutField">

                  <label htmlFor="checkout-reference">
                    Ponto de referência
                  </label>

                  <input
                    id="checkout-reference"
                    type="text"
                    name="reference"
                    value={
                      address.reference || ""
                    }
                    onChange={
                      handleAddressChange
                    }
                    placeholder="Ex: próximo à praça"
                  />

                </div>

                <button
                  type="button"
                  className="checkoutContinueButton"
                  onClick={
                    handleContinueAddress
                  }
                >

                  Continuar

                </button>

              </section>

            )}

            {/* ===============================================
                RESUMO
            =============================================== */}

            {checkoutStep ===
            "review" && (

              <div className="checkoutReviewPage">

                {/* ===========================================
                    CABEÇALHO
                =========================================== */}

                <div className="checkoutReviewHero">

                  <div className="checkoutReviewHeroIcon">

                    <ReceiptText
                      size={19}
                    />

                  </div>

                  <div>

                    <h3>
                      Confira seu pedido
                    </h3>

                    <p>
                      Revise os dados antes do pagamento.
                    </p>

                  </div>

                </div>

                {/* ===========================================
                    CLIENTE + ENTREGA
                =========================================== */}

                <div className="checkoutInfoCard">

                  {/* CLIENTE */}

                  <div className="checkoutInfoRow">

                    <div className="checkoutInfoIcon">

                      <User
                        size={17}
                      />

                    </div>

                    <div className="checkoutInfoContent">

                      <div className="checkoutInfoTop">

                        <span className="checkoutInfoLabel">
                          Cliente
                        </span>

                        <button
                          type="button"
                          className="checkoutMiniEdit"
                          onClick={
                            handleEditCustomer
                          }
                        >

                          <Pencil
                            size={11}
                          />

                          Alterar

                        </button>

                      </div>

                      <strong>
                        {customer.name}
                      </strong>

                      <span className="checkoutInfoSecondary">

                        <Phone
                          size={12}
                        />

                        {customer.phone}

                      </span>

                    </div>

                  </div>

                  <div className="checkoutInfoDivider" />

                  {/* ENTREGA */}

                  <div className="checkoutInfoRow">

                    <div className="checkoutInfoIcon">

                      {String(
                        selectedSavedAddress?.label ||
                        ""
                      )
                        .toLowerCase()
                        .includes(
                          "trabalho"
                        )
                        ? (
                          <BriefcaseBusiness
                            size={17}
                          />
                        )
                        : (
                          <House
                            size={17}
                          />
                        )}

                    </div>

                    <div className="checkoutInfoContent">

                      <div className="checkoutInfoTop">

                        <span className="checkoutInfoLabel">
                          Entrega
                        </span>

                        <button
                          type="button"
                          className="checkoutMiniEdit"
                          onClick={
                            handleEditAddress
                          }
                        >

                          <Pencil
                            size={11}
                          />

                          Alterar

                        </button>

                      </div>

                      <strong>

                        {selectedSavedAddress?.label ||
                          "Endereço de entrega"}

                      </strong>

                      <span className="checkoutInfoAddress">

                        {address.street}

                        {address.number
                          ? `, ${address.number}`
                          : ""}

                      </span>

                      <span className="checkoutInfoSecondary">

                        {address.neighborhood}

                        {address.city
                          ? ` • ${address.city}`
                          : ""}

                        {address.state
                          ? ` - ${address.state}`
                          : ""}

                      </span>

                      {address.complement && (

                        <span className="checkoutInfoExtra">
                          {address.complement}
                        </span>

                      )}

                      {address.reference && (

                        <span className="checkoutInfoExtra">

                          Ref.:{" "}

                          {address.reference}

                        </span>

                      )}

                    </div>

                  </div>

                </div>

                {/* ===========================================
                    PRODUTOS
                =========================================== */}

                <div className="checkoutCompactSection">

                  <div className="checkoutCompactTitle">

                    <strong>
                      Seu pedido
                    </strong>

                    <span>

                      {totalItems}{" "}

                      {totalItems === 1
                        ? "item"
                        : "itens"}

                    </span>

                  </div>

                  <div className="checkoutReviewProducts">

                    {(cart || []).map(
                      (product) => {

                        const price =
                          getProductPrice(
                            product
                          );

                        const quantity =
                          Number(
                            product.quantity ||
                            1
                          );

                        const itemTotal =
                          price *
                          quantity;

                        const imageUrl =
                          product.image_url ||
                          product.image ||
                          "";

                        return (

                          <div
                            key={
                              product.id
                            }
                            className="checkoutReviewProduct"
                          >

                            <div className="checkoutReviewProductImage">

                              {imageUrl ? (

                                <img
                                  src={
                                    imageUrl
                                  }
                                  alt={
                                    product.name
                                  }
                                />

                              ) : (

                                <ShoppingBag
                                  size={18}
                                />

                              )}

                            </div>

                            <div className="checkoutReviewProductInfo">

                              <strong>
                                {product.name}
                              </strong>

                              <span>

                                {quantity} ×{" "}

                                {formatPrice(
                                  price
                                )}

                              </span>

                            </div>

                            <strong className="checkoutReviewProductPrice">

                              {formatPrice(
                                itemTotal
                              )}

                            </strong>

                          </div>

                        );

                      }
                    )}

                  </div>

                </div>

                {/* ===========================================
                    CUPOM
                =========================================== */}

                <div className="checkoutCompactOption">

                  <button
                    type="button"
                    className="checkoutCompactOptionButton"
                    onClick={() =>
                      setCouponOpen(
                        (current) =>
                          !current
                      )
                    }
                  >

                    <div className="checkoutCompactOptionIcon">

                      <TicketPercent
                        size={17}
                      />

                    </div>

                    <div className="checkoutCompactOptionText">

                      <strong>

                        {appliedCoupon
                          ? appliedCoupon.code
                          : "Adicionar cupom"}

                      </strong>

                      <span>

                        {appliedCoupon
                          ? `${appliedCoupon.label} aplicado`
                          : "Tem um código de desconto?"}

                      </span>

                    </div>

                    {appliedCoupon && (

                      <span className="checkoutDiscountBadge">

                        -{" "}

                        {formatPrice(
                          discountAmount
                        )}

                      </span>

                    )}

                    {couponOpen ? (

                      <ChevronDown
                        size={18}
                      />

                    ) : (

                      <ChevronRight
                        size={18}
                      />

                    )}

                  </button>

                  {couponOpen && (

                    <div className="checkoutCompactOptionBody">

                      <div className="checkoutCouponInput">

                        <TicketPercent
                          size={17}
                        />

                        <input
                          type="text"
                          value={
                            couponCode
                          }
                          onChange={
                            (event) =>
                              setCouponCode(
                                event.target.value
                              )
                          }
                          placeholder="Digite seu cupom"
                          aria-label="Código do cupom"
                          onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();handleApplyCoupon();}}}
                          autoCapitalize="characters"
                        />

                        <button
                          type="button"
                          onClick={
                            handleApplyCoupon
                          }
                          disabled={couponBusy}
                          aria-busy={couponBusy}
                        >

                          {couponBusy?'Aplicando…':'Aplicar'}

                        </button>

                      </div>

                      {couponMessage && (

                        <span
                          className={
                            appliedCoupon
                              ? "checkoutCouponMessage success"
                              : "checkoutCouponMessage error"
                          }
                        >

                          {couponMessage}

                        </span>

                      )}

                      {appliedCoupon && (

                        <button
                          type="button"
                          className="checkoutRemoveCoupon"
                          onClick={
                            handleRemoveCoupon
                          }
                        >

                          <Tag
                            size={13}
                          />

                          Remover cupom

                        </button>

                      )}

                    </div>

                  )}

                </div>

                {/* ===========================================
                    OBSERVAÇÃO
                =========================================== */}

                <div className="checkoutCompactOption">

                  <button
                    type="button"
                    className="checkoutCompactOptionButton"
                    onClick={() =>
                      setObservationOpen(
                        (current) =>
                          !current
                      )
                    }
                  >

                    <div className="checkoutCompactOptionIcon">

                      <MessageSquare
                        size={17}
                      />

                    </div>

                    <div className="checkoutCompactOptionText">

                      <strong>
                        Observação
                      </strong>

                      <span>

                        {observation
                          ? observation
                          : "Alguma informação para a entrega?"}

                      </span>

                    </div>

                    {observationOpen ? (

                      <ChevronDown
                        size={18}
                      />

                    ) : (

                      <ChevronRight
                        size={18}
                      />

                    )}

                  </button>

                  {observationOpen && (

                    <div className="checkoutCompactOptionBody">

                      <textarea
                        className="checkoutObservation"
                        value={
                          observation
                        }
                        onChange={
                          (event) =>
                            setObservation(
                              event.target.value
                            )
                        }
                        placeholder="Ex: tocar o interfone, deixar na portaria..."
                        rows={3}
                      />

                    </div>

                  )}

                </div>

                {/* ===========================================
                    VALORES
                =========================================== */}

                <div className="checkoutCompactTotals">

                  <div className="checkoutCompactTotalRow">

                    <span>
                      Subtotal
                    </span>

                    <strong>
                      {formatPrice(
                        subtotal
                      )}
                    </strong>

                  </div>

                  {discountAmount > 0 && (

                    <div className="checkoutCompactTotalRow discount">

                      <span>
                        Desconto
                      </span>

                      <strong>

                        -{" "}

                        {formatPrice(
                          discountAmount
                        )}

                      </strong>

                    </div>

                  )}

                  <div className="checkoutCompactTotalRow checkoutDeliveryFee" data-testid="delivery-fee-row"><span>Taxa de entrega</span><strong>{deliveryZone?(deliveryFee===0?'Grátis':formatPrice(deliveryFee)):'A calcular'}</strong></div>
                  <div className="checkoutCompactGrandTotal">

                    <div>

                      <span>
                        Total
                      </span>

                      <small>
                        Valor do pedido
                      </small>

                    </div>

                    <strong>
                      {formatPrice(
                        finalTotal
                      )}
                    </strong>

                  </div>

                </div>

                {/* ===========================================
                    BOTÃO
                =========================================== */}

                <div className="checkoutReviewFooter">

                  <div className="checkoutReviewFooterValue">

                    <span>
                      Total
                    </span>

                    <strong>
                      {formatPrice(
                        finalTotal
                      )}
                    </strong>

                  </div>

                  <button
                    type="button"
                    className="checkoutContinueButton"
                    onClick={() =>
                      setCheckoutStep(
                        "payment"
                      )
                    }
                  >

                    Ir para pagamento

                  </button>

                </div>

              </div>

            )}

            {/* ===============================================
                PIX GERADO
            =============================================== */}

            {checkoutStep ===
            "pix-payment" && (

              <section className="checkoutPixScreen">

                {pixConfirming ? (

                  <div className="checkoutPixConfirming">

                    <div className="checkoutPixConfirmingSpinner">
                      <LoaderCircle
                        size={42}
                      />
                    </div>

                    <span className="checkoutPixConfirmingBadge">
                      PAGAMENTO IDENTIFICADO
                    </span>

                    <h3>
                      Confirmando seu pagamento
                    </h3>

                    <p>
                      Recebemos a confirmação do Pix. Estamos preparando os dados finais do seu pedido.
                    </p>

                    <div className="checkoutPixConfirmingDots">
                      <span />
                      <span />
                      <span />
                    </div>

                  </div>

                ) : (

                  <>

                    <div className="checkoutPixHeader">

                      <div className="checkoutPixHeaderIcon">
                        <QrCode
                          size={22}
                        />
                      </div>

                      <div>

                        <h3>
                          Pague com Pix
                        </h3>

                        <p>
                          Escaneie o QR Code ou copie o código abaixo.
                        </p>

                      </div>

                    </div>

                    <div className="checkoutPixQrCard">

                      <img
                        src={
                          pixData?.qr_code_url
                        }
                        alt="QR Code Pix"
                        className="checkoutPixQrImage"
                      />

                      <strong className="checkoutPixValue">
                        {formatPrice(
                          finalTotal
                        )}
                      </strong>

                      <div className={
                        pixSecondsLeft > 0
                          ? "checkoutPixTimer"
                          : "checkoutPixTimer expired"
                      }>

                        <Clock3
                          size={16}
                        />

                        {pixSecondsLeft > 0
                          ? (
                            <>
                              Expira em{" "}
                              <strong>
                                {formatPixTime(
                                  pixSecondsLeft
                                )}
                              </strong>
                            </>
                          )
                          : (
                            <strong>
                              PIX expirado
                            </strong>
                          )}

                      </div>

                    </div>

                    <div className="checkoutPixCopyArea">

                      <div className="checkoutPixCopyHeader">

                        <label>
                          Pix copia e cola
                        </label>

                        <button
                          type="button"
                          className={
                            pixCopied
                              ? "checkoutPixCopyButton copied"
                              : "checkoutPixCopyButton"
                          }
                          onClick={
                            handleCopyPix
                          }
                          disabled={
                            pixSecondsLeft <= 0
                          }
                        >

                          {pixCopied ? (
                            <CircleCheckBig
                              size={15}
                            />
                          ) : (
                            <Copy
                              size={15}
                            />
                          )}

                          <span>
                            {pixCopied
                              ? "Copiado"
                              : "Copiar"}
                          </span>

                        </button>

                      </div>

                      <textarea ref={pixCodeRef} className="checkoutPixCode" aria-label="Código Pix copia e cola" readOnly value={String(pixData?.qr_code || "").trim()} />

                    </div>

                    {pixSecondsLeft > 0 ? (

                      <div className="checkoutPixWaiting">

                        <LoaderCircle
                          size={15}
                          className="checkoutPixSpinner"
                        />

                        <span>
                          Aguardando confirmação do pagamento
                        </span>

                      </div>

                    ) : (

                      <div className="checkoutPixExpired">

                        <div className="checkoutPixExpiredText">

                          <strong>
                            Este PIX expirou
                          </strong>

                          <span>
                            Gere uma nova cobrança para continuar. Seus dados e produtos continuam salvos.
                          </span>

                        </div>

                        <button
                          type="button"
                          className="checkoutPixRestartButton"
                          onClick={
                            handleRestartPix
                          }
                        >
                          Gerar novo PIX
                        </button>

                      </div>

                    )}

                  </>

                )}

              </section>

            )}

            {/* ===============================================
                TRANSIÇÃO PARA SUCESSO
            =============================================== */}

            {successTransition && (

              <section className="checkoutSuccessTransition">

                <div className="checkoutSuccessTransitionSpinner">

                  <LoaderCircle
                    size={34}
                  />

                </div>

                <strong>
                  Confirmando seu pedido
                </strong>

                <span>

                  {paymentMethod === "pix"
                    ? "Pagamento confirmado. Preparando os dados do pedido..."
                    : "Pedido registrado. Preparando sua confirmação..."}

                </span>

              </section>

            )}

            {/* ===============================================
                SUCESSO FINAL
            =============================================== */}

            {!successTransition &&
            checkoutStep ===
            "success" &&
            completedOrder && (

              <section className="checkoutPixScreen">

                <div className="checkoutOrderSuccess">

                  <div className="checkoutOrderSuccessHero">

                    <span className="checkoutOrderSuccessBadge">

                      {completedOrder.payment_method === "pix"
                        ? "PAGAMENTO APROVADO!"
                        : "PEDIDO CONFIRMADO!"}

                    </span>

                  </div>

                  <div className="checkoutOrderPaidStrip">

                    <div className="checkoutOrderPaidStripIcon">

                      <CheckCircle2
                        size={17}
                      />

                    </div>

                    <div>

                      <strong>

                        {completedOrder.payment_method === "pix"
                          ? "Pix confirmado"
                          : "Pagamento na entrega"}

                      </strong>

                      <span>

                        {completedOrder.payment_method === "pix"
                          ? "Pagamento aprovado e pedido registrado com sucesso."
                          : (
                              completedOrder.payment_method === "cartao"
                                ? (
                                    completedOrder.card_type === "credito"
                                      ? "Pedido confirmado. O pagamento será realizado no cartão de crédito no momento da entrega."
                                      : "Pedido confirmado. O pagamento será realizado no cartão de débito no momento da entrega."
                                  )
                                : (
                                    completedOrder.needs_change === true
                                      ? `Pedido confirmado. Pagamento em dinheiro na entrega${
                                          completedOrder.change_for
                                            ? `, com troco para ${completedOrder.change_for}`
                                            : ""
                                        }.`
                                      : "Pedido confirmado. Pagamento em dinheiro no momento da entrega."
                                  )
                            )}

                      </span>

                    </div>

                  </div>

                  <div className="checkoutOrderProtocol">

                    <span>
                      Protocolo do pedido
                    </span>

                    <strong>
                      {completedOrder.protocol}
                    </strong>

                    <small>
                      Guarde este código para identificar sua compra.
                    </small>

                  </div>

<button
                    type="button"
                    className="checkoutTrackOrderButton"
                    onClick={
                      () => {

                        window.location.href =
                          trackingURL(completedOrder.local_order_id);

                      }
                    }
                  >

                    <Navigation
                      size={17}
                    />

                    <span>
                      Rastrear entrega
                    </span>

                    <ChevronRight
                      size={17}
                    />

                  </button>
                  <div className="checkoutOrderDetails">

                    <div className="checkoutOrderBlockTitle">
                      Detalhes da compra
                    </div>

                    <div className="checkoutOrderInfoRow">

                      <span>
                        Cliente
                      </span>

                      <strong>
                        {completedOrder.customer.name}
                      </strong>

                    </div>

                    <div className="checkoutOrderInfoRow">

                      <span>
                        Telefone
                      </span>

                      <strong>
                        {completedOrder.customer.phone}
                      </strong>

                    </div>

                    <div className="checkoutOrderInfoRow">

                      <span>
                        Forma de pagamento
                      </span>

                      <strong>

                        {completedOrder.payment_method === "pix"
                          ? "Pix"
                          : (
                              completedOrder.payment_method === "cartao"
                                ? (
                                    completedOrder.card_type === "credito"
                                      ? "Cartão de crédito na entrega"
                                      : "Cartão de débito na entrega"
                                  )
                                : "Dinheiro na entrega"
                            )}

                      </strong>

                    </div>

                    <div
                      className={
                        completedOrder.payment_method === "pix"
                          ? "checkoutOrderInfoRow success"
                          : "checkoutOrderInfoRow"
                      }
                    >

                      <span>
                        Pagamento
                      </span>

                      <strong>

                        {completedOrder.payment_method === "pix"
                          ? "Pago"
                          : "Na entrega"}

                      </strong>

                    </div>

                    <div className="checkoutOrderInfoRow">

                      <span>
                        Status do pedido
                      </span>

                      <strong>
                        Confirmado
                      </strong>

                    </div>

                    <div className="checkoutOrderInfoRow">

                      <span>
                        Protocolo
                      </span>

                      <strong>
                        {completedOrder.protocol}
                      </strong>

                    </div>

                    {completedOrder.payment_method === "pix" && (

                      <div className="checkoutOrderInfoRow">

                        <span>
                          ID do pagamento
                        </span>

                        <strong>
                          {completedOrder.pagarme_order_id || "-"}
                        </strong>

                      </div>

                    )}

                    <div className="checkoutOrderInfoRow">

                      <span>
                        Subtotal
                      </span>

                      <strong>
                        {formatPrice(
                          completedOrder.subtotal
                        )}
                      </strong>

                    </div><div className="checkoutOrderInfoRow"><span>Taxa de entrega</span><strong>{formatPrice(completedOrder.delivery_fee||0)}</strong></div>

                    {completedOrder.discount > 0 && (

                      <div className="checkoutOrderInfoRow">

                        <span>
                          Desconto
                        </span>

                        <strong>
                          - {formatPrice(
                            completedOrder.discount
                          )}
                        </strong>

                      </div>

                    )}

                    {completedOrder.coupon && (

                      <div className="checkoutOrderInfoRow">

                        <span>
                          Cupom
                        </span>

                        <strong>
                          {completedOrder.coupon}
                        </strong>

                      </div>

                    )}

                    <div className="checkoutOrderInfoRow total">

                      <span>

                        {completedOrder.payment_method === "pix"
                          ? "Total pago"
                          : "Total do pedido"}

                      </span>

                      <strong>
                        {formatPrice(
                          completedOrder.total
                        )}
                      </strong>

                    </div>

                  </div>

                  <div className="checkoutOrderProducts">

                    <div className="checkoutOrderBlockTitle">
                      Itens do pedido
                    </div>

                    {completedOrder.items.map(
                      (product) => (

                        <div
                          key={
                            product.id
                          }
                          className="checkoutOrderProduct"
                        >

                          <div>

                            <strong>
                              {product.name}
                            </strong>

                            <span>
                              {product.quantity} ×{" "}
                              {formatPrice(
                                product.unit_price
                              )}
                            </span>

                          </div>

                          <strong>
                            {formatPrice(
                              product.total_price
                            )}
                          </strong>

                        </div>

                      )
                    )}

                  </div>

                  <div className="checkoutOrderDelivery">

                    <div className="checkoutOrderBlockTitle">
                      Endereço de entrega
                    </div>

                    <div className="checkoutOrderDeliveryContent">

                      <MapPin
                        size={18}
                      />

                      <div>

                        <strong>

                          {completedOrder.address.street}

                          {completedOrder.address.number
                            ? `, ${completedOrder.address.number}`
                            : ""}

                        </strong>

                        <span>

                          {completedOrder.address.neighborhood}

                          {completedOrder.address.city
                            ? ` • ${completedOrder.address.city}`
                            : ""}

                          {completedOrder.address.state
                            ? ` - ${completedOrder.address.state}`
                            : ""}

                        </span>

                        {completedOrder.address.complement && (

                          <small>
                            {completedOrder.address.complement}
                          </small>

                        )}

                        {completedOrder.address.reference && (

                          <small>
                            Referência: {completedOrder.address.reference}
                          </small>

                        )}

                      </div>

                    </div>

                  </div>

                  {completedOrder.observation && (

                    <div className="checkoutOrderObservation">

                      <MessageSquare
                        size={17}
                      />

                      <div>

                        <strong>
                          Observação
                        </strong>

                        <span>
                          {completedOrder.observation}
                        </span>

                      </div>

                    </div>

                  )}

                  <button
                    type="button"
                    className="checkoutContinueButton"
                    onClick={
                      handleFinishPaidPix
                    }
                  >
                    Concluir e voltar para a loja
                  </button>

                </div>

              </section>

            )}

            {/* ===============================================
                PAGAMENTO
            =============================================== */}

            {checkoutStep ===
            "payment" && (

              <>

                <section className="checkoutSection">

                  <div className="checkoutPaymentHeader">

                    <div className="checkoutSectionIcon">

                      <CreditCard
                        size={17}
                      />

                    </div>

                    <div>

                      <h3>
                        Forma de pagamento
                      </h3>

                      <p>
                        Escolha como você deseja pagar.
                      </p>

                    </div>

                  </div>

                  <div className="paymentOptions">

                    {/* PIX */}

                    <button
                      type="button"
                      className={
                        paymentMethod ===
                        "pix"
                          ? "paymentOption active"
                          : "paymentOption"
                      }
                      onClick={() =>
                        handleSelectPayment(
                          "pix"
                        )
                      }
                    >

                      <div className="paymentOptionIcon">

                        <QrCode
                          size={21}
                        />

                      </div>

                      <div className="paymentOptionText">

                        <strong>
                          Pix
                        </strong>

                        <span>
                          Pagamento rápido
                        </span>

                      </div>

                      {paymentMethod ===
                      "pix" && (

                        <CheckCircle2
                          size={19}
                          className="paymentOptionCheck"
                        />

                      )}

                    </button>

                    {/* CARTÃO */}

                    <button
                      type="button"
                      className={
                        paymentMethod ===
                        "cartao"
                          ? "paymentOption active"
                          : "paymentOption"
                      }
                      onClick={() =>
                        handleSelectPayment(
                          "cartao"
                        )
                      }
                    >

                      <div className="paymentOptionIcon">

                        <CreditCard
                          size={21}
                        />

                      </div>

                      <div className="paymentOptionText">

                        <strong>
                          Cartão
                        </strong>

                        <span>
                          Crédito ou débito
                        </span>

                      </div>

                      {paymentMethod ===
                      "cartao" && (

                        <CheckCircle2
                          size={19}
                          className="paymentOptionCheck"
                        />

                      )}

                    </button>

                    {/* DINHEIRO */}

                    <button
                      type="button"
                      className={
                        paymentMethod ===
                        "dinheiro"
                          ? "paymentOption active"
                          : "paymentOption"
                      }
                      onClick={() =>
                        handleSelectPayment(
                          "dinheiro"
                        )
                      }
                    >

                      <div className="paymentOptionIcon">

                        <Banknote
                          size={21}
                        />

                      </div>

                      <div className="paymentOptionText">

                        <strong>
                          Dinheiro
                        </strong>

                        <span>
                          Pague na entrega
                        </span>

                      </div>

                      {paymentMethod ===
                      "dinheiro" && (

                        <CheckCircle2
                          size={19}
                          className="paymentOptionCheck"
                        />

                      )}

                    </button>

                  </div>

                </section>

                {/* PIX */}

                {paymentMethod ===
                "pix" && (

                  <section className="checkoutPixPayer">

                    <div className="checkoutPaymentDetail">

                      <QrCode
                        size={20}
                      />

                      <div>

                        <strong>
                          Pagamento via Pix
                        </strong>

                        <span>

                          {customer.pixReady || onlyDigits(
                            customer.document
                          ).length === 11
                            ? "Seu cadastro já possui os dados necessários. Ao finalizar, o QR Code será gerado."
                            : "Informe o CPF uma vez para gerar o Pix. Nas próximas compras neste aparelho, ele será utilizado automaticamente."}

                        </span>

                      </div>

                    </div>

                    {!customer.pixReady && onlyDigits(
                      customer.document
                    ).length !== 11 && (

                      <div className="checkoutField">

                        <label htmlFor="checkout-pix-cpf">
                          CPF
                        </label>

                        <input
                          id="checkout-pix-cpf"
                          type="text"
                          value={
                            pixDocument
                          }
                          onChange={
                            (event) =>
                              setPixDocument(
                                event.target.value
                              )
                          }
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                          maxLength={14}
                          autoComplete="off"
                        />

                        <small className="checkoutPixDocumentHint">
                          Documento do pagador solicitado pelo Pagar.me.
                        </small>

                      </div>

                    )}

                    {pixError && (

                      <div className="checkoutPixError">
                        {pixError}
                      </div>

                    )}

                  </section>

                )}

                {/* CARTÃO */}

                {paymentMethod ===
                "cartao" && (

                  <section className="checkoutSection">

                    <div className="checkoutPaymentQuestion">

                      <strong>
                        Qual tipo de cartão?
                      </strong>

                    </div>

                    <div className="checkoutChoiceButtons">

                      <button
                        type="button"
                        className={
                          cardType ===
                          "credito"
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setCardType(
                            "credito"
                          )
                        }
                      >

                        Crédito

                      </button>

                      <button
                        type="button"
                        className={
                          cardType ===
                          "debito"
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setCardType(
                            "debito"
                          )
                        }
                      >

                        Débito

                      </button>

                    </div>

                  </section>

                )}

                {/* DINHEIRO */}

                {paymentMethod ===
                "dinheiro" && (

                  <section className="checkoutSection">

                    <div className="checkoutPaymentQuestion">

                      <strong>
                        Precisa de troco?
                      </strong>

                      <span>
                        Informe para ajudarmos o entregador.
                      </span>

                    </div>

                    <div className="checkoutChoiceButtons">

                      <button
                        type="button"
                        className={
                          needsChange ===
                          false
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          handleChangeChoice(
                            false
                          )
                        }
                      >

                        Não preciso

                      </button>

                      <button
                        type="button"
                        className={
                          needsChange ===
                          true
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          handleChangeChoice(
                            true
                          )
                        }
                      >

                        Sim, preciso

                      </button>

                    </div>

                    {needsChange ===
                    true && (

                      <div className="checkoutField checkoutChange">

                        <label htmlFor="checkout-change">

                          Troco para quanto?

                        </label>

                        <div className="checkoutInputWrapper">

                          <Banknote
                            size={17}
                          />

                          <input
                            id="checkout-change"
                            type="text"
                            value={
                              changeFor
                            }
                            onChange={
                              (event) =>
                                setChangeFor(
                                  event.target.value
                                )
                            }
                            placeholder="Ex: R$ 100,00"
                            inputMode="decimal"
                          />

                        </div>

                      </div>

                    )}

                  </section>

                )}

                <LoyaltyBenefit phone={customer.phone} subtotal={subtotal} onOffer={offer=>{if(offer)setAppliedCoupon(c=>c&&c.code!==offer.code?c:{...offer,is_loyalty:true});else setAppliedCoupon(c=>c?.is_loyalty?null:c);}}/>
                {appliedCoupon?.is_loyalty&&<p role="status" className="loyalty-applied">Seu desconto de fidelidade foi aplicado: {appliedCoupon.label}. {appliedCoupon.reason}</p>}
                {/* RESUMO PAGAMENTO */}

                <section className="checkoutSection">

                  <div className="checkoutPaymentSummary">

                    <div>

                      <span>
                        Subtotal
                      </span>

                      <strong>
                        {formatPrice(
                          subtotal
                        )}
                      </strong>

                    </div>

                    {discountAmount > 0 && (

                      <div className="checkoutDiscountRow">

                        <span>
                          Cupom
                        </span>

                        <strong>

                          -{" "}

                          {formatPrice(
                            discountAmount
                          )}

                        </strong>

                      </div>

                    )}

                    <div className="checkoutPaymentSummaryRow checkoutDeliveryFee" data-testid="delivery-fee-row"><span>Taxa de entrega</span><strong>{deliveryZone?(deliveryFee===0?'Grátis':formatPrice(deliveryFee)):'A calcular'}</strong></div>
                    <div className="checkoutPaymentSummaryTotal">

                      <span>
                        Total
                      </span>

                      <strong>
                        {formatPrice(
                          finalTotal
                        )}
                      </strong>

                    </div>

                  </div>

                </section>

                {/* FOOTER */}

                <div className="checkoutFooter">

                  <div className="checkoutFooterTotal">

                    <span>
                      Total
                    </span>

                    <strong>
                      {formatPrice(
                        finalTotal
                      )}
                    </strong>

                  </div>

                  {paymentMethod==='pix'?<div className="checkoutPixAuto" role="status">{pixLoading?'Gerando seu Pix…':pixError?<button type="button" className="checkoutContinueButton" onClick={()=>setPixIntent(true)}>Tentar gerar Pix novamente</button>:customer.pixReady?'Seu Pix será gerado automaticamente.':'Preencha o CPF para gerar seu Pix automaticamente.'}</div>:                  <button
                    type="submit"
                    className="checkoutFinishButton"
                    disabled={pixLoading||orderSubmitting}
                  >

                    {pixLoading ? (

                      <>
                        <LoaderCircle
                          size={18}
                          className="checkoutPixSpinner"
                        />
                        Gerando PIX...
                      </>

                    ) : (

                      orderSubmitting?"Registrando pedido…":"Finalizar pedido"

                    )}

                  </button>}

                </div>

              </>

            )}

          </div>

        </form>

    </CheckoutFrame>

  );
} 