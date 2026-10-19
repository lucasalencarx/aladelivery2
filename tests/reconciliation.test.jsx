// @vitest-environment node
import {afterEach,it,expect,vi} from 'vitest';
import {startReconciliation} from '../backend/reconciliation';
afterEach(()=>vi.useRealTimers());
it('consulta pendências a cada 15 segundos sem navegador e continua após falha',async()=>{
 vi.useFakeTimers();const orders=[{id:1},{id:2}],loadBatch=vi.fn(async()=>orders),check=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined),onError=vi.fn();
 const stop=startReconciliation({loadBatch,check,onError});await vi.advanceTimersByTimeAsync(0);expect(check).toHaveBeenCalledTimes(2);expect(onError).toHaveBeenCalledTimes(1);
 await vi.advanceTimersByTimeAsync(15000);expect(loadBatch).toHaveBeenCalledTimes(2);stop();await vi.advanceTimersByTimeAsync(30000);expect(loadBatch).toHaveBeenCalledTimes(2);
});
it('não sobrepõe ciclos quando o gateway demora',async()=>{
 vi.useFakeTimers();let release;const loadBatch=vi.fn(()=>new Promise(resolve=>{release=resolve;}));const stop=startReconciliation({loadBatch,check:vi.fn()});await vi.advanceTimersByTimeAsync(60000);expect(loadBatch).toHaveBeenCalledTimes(1);release([]);await vi.advanceTimersByTimeAsync(0);stop();
});
