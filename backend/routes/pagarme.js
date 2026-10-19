import {Router} from 'express';
const router=Router();
router.use((req,res)=>res.status(410).json({message:'Use /api/commerce/orders com pedido persistido e token privado.'}));
export default router;
