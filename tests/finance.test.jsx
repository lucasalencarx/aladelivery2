import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
const f=vi.hoisted(()=>({commerce:vi.fn()}));vi.mock('../src/services/commerceApi',()=>({commerce:f.commerce}));
import AdminBilling,{financialRange} from '../src/admin/pages/AdminBilling';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('calcula início da semana, mês e ano sem usar fuso do navegador',()=>{expect(financialRange('week','2026-10-18')).toEqual({start:'2026-10-12',end:'2026-10-18'});expect(financialRange('month','2026-10-16').start).toBe('2026-10-01');expect(financialRange('year','2026-10-16').start).toBe('2026-01-01');});
it('exibe gráfico, separa cobranças e altera agrupamento no relatório autenticado',async()=>{
 f.commerce.mockResolvedValue({summary:{revenue:120,paid_orders:3,delivery_fees:15,to_collect:40,discounts:5,cancelled_paid:10},series:[{period:'2026-10-16',orders:3,revenue:120}],payments:[{payment_method:'pix',orders:3,revenue:120}],recent:[]});render(<AdminBilling/>);await screen.findByRole('img',{name:/Gráfico de receita/});expect(screen.getByText('A cobrar na entrega')).toBeTruthy();expect(screen.getByText('Pagos e cancelados · revisar estorno')).toBeTruthy();expect(screen.getAllByText(/40,00/).length).toBeGreaterThan(0);fireEvent.change(screen.getByLabelText('Agrupar por'),{target:{value:'week'}});await waitFor(()=>expect(f.commerce).toHaveBeenLastCalledWith(expect.stringContaining('grain=week'),{admin:true}));
});
