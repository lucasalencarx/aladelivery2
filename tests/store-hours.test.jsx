import {it,expect} from 'vitest';
import {isStoreOpen} from '../src/utils/storeHours';
it('usa horário de MS independente do fuso do aparelho e respeita meia-noite',()=>{
 const status={manual_override:false,opening_time:'20:00',closing_time:'02:00',timezone:'America/Campo_Grande'};
 expect(isStoreOpen(status,new Date('2026-10-16T01:00:00Z'))).toBe(true); // 21h MS
 expect(isStoreOpen(status,new Date('2026-10-16T05:59:00Z'))).toBe(true);
 expect(isStoreOpen(status,new Date('2026-10-16T06:00:00Z'))).toBe(false);
 expect(isStoreOpen({...status,manual_override:true,is_open:false},new Date('2026-10-16T01:00:00Z'))).toBe(false);
});
it('horário de fechamento é exclusivo e horários iguais abrem por 24h',()=>{
 const s={manual_override:false,opening_time:'09:00',closing_time:'23:00'};
 expect(isStoreOpen(s,new Date('2026-10-16T13:00:00Z'))).toBe(true);expect(isStoreOpen(s,new Date('2026-10-17T03:00:00Z'))).toBe(false);expect(isStoreOpen({...s,closing_time:'09:00'})).toBe(true);
});
