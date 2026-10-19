export default function CheckoutFrame({embedded,visible,success,onClose,children}){
 if(embedded)return <div className={`sf-checkout ${success?'sf-checkout-success':''}`}>{children}</div>;
 return <div className={`checkoutOverlay ${visible?'isOpen':'isClosing'} ${success?'checkoutSuccessMode':''}`}><button className="checkoutBackdrop" onClick={onClose} aria-label="Fechar checkout"/><aside className={`checkoutDrawer ${success?'checkoutDrawerSuccess':''}`}>{children}</aside></div>;
}
