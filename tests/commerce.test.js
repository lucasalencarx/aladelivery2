import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getProductPrice,normalizeCart,stockLimit} from '../src/utils/commerce.js';
test('only valid discounts change the price',()=>{for(const promo of [null,undefined,0,-1,15,'invalid'])assert.equal(getProductPrice({price:10,promotional_price:promo}),10);assert.equal(getProductPrice({price:10,promotional_price:8}),8);});
test('cart hydration rejects corrupt data and clamps to stock',()=>{assert.deepEqual(normalizeCart({}),[]);const cart=normalizeCart([{id:'a',name:'Beer',price:4,stock:2,quantity:90},{id:'a',name:'Beer',price:4,quantity:1},{id:'b',name:'Beer',price:4,stock:0,quantity:1},{id:'c',name:'Beer',price:'bad',quantity:1}]);assert.equal(cart.length,1);assert.equal(cart[0].quantity,2);});
test('stock cannot be negative or non-finite',()=>{assert.equal(stockLimit({stock:-10}),0);assert.equal(stockLimit({stock:'bad'}),0);assert.equal(stockLimit({stock:2.9}),2);});
