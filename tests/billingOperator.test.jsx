// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => {
  const names = { 'Billing.OP_OVERVIEW_TITLE':'Overview', 'Billing.OP_MONTH':'Month','Billing.OP_ACTIVE_ACCOUNTS':'Active accounts','Billing.OP_PLAN':'Subscription {{plan}}','Billing.OP_TEAM_SEAT':'Team seat','Billing.OP_FREE_ACCESS':'Free access','Billing.OP_NEW_SUBSCRIPTIONS':'New subscriptions','Billing.OP_ENDED_SUBSCRIPTIONS':'Ended subscriptions','Billing.OP_PACKAGES_SOLD':'Packages sold','Billing.OP_TOKENS_GRANTED':'Tokens granted','Billing.OP_TOKENS_USED':'Tokens used','Billing.OP_TOKENS_EXPIRED':'Tokens expired','Billing.OP_AI_COST':'AI costs','Billing.OP_COST_PER_TOKEN':'Cost per token','Billing.OP_PROVIDER':'Provider','Billing.OP_MODEL':'Model','Billing.OP_CALLS':'Calls','Billing.OP_COST_USD':'Cost (USD)','Billing.OP_NO_AI_COST':'No AI calls this month.','Billing.OP_LOAD_ERROR':'Overview error','Billing.RETRY':'Retry','Billing.OP_REASON':'Reason','Billing.OP_CANCEL':'Cancel','Billing.OP_GRANT':'Grant','Billing.OP_REVOKE':'Revoke','Billing.OP_REVOKE_TITLE':'Revoke access?','Billing.OP_REVOKE_BODY':'Data stays; access becomes read-only.','Billing.OP_SAVE_ERROR':'Save error','Billing.OP_FORBIDDEN':'Forbidden','Billing.OP_ACCESS':'Access','Billing.OP_READ_ONLY':'Read-only','Billing.OP_UNTIL':'until {{date}}'};
  return Object.entries(values || {}).reduce((out, [name, value]) => out.replaceAll(`{{${name}}}`, String(value)), names[key] || key);
}, i18n:{language:'en'} }) }));
import { OperatorOverview } from '../src/billing/OperatorOverview';
import { FreeAccessSwitch } from '../src/billing/FreeAccessSwitch';
import { BillingAccessCell, accountAccessText } from '../src/billing/BillingAccessCell';
import { useOperatorAccounts } from '../src/billing/useOperatorAccounts';
import { useBillingUsersColumn } from '../src/billing/useBillingUsersColumn';
import { renderHook } from '@testing-library/react';
afterEach(cleanup);
const account = (extra={}) => ({ user_id: 5, access:{status:'active',source:'free',ends_at:null}, free_access:null, ...extra });
describe('operator billing surfaces', () => {
  it('renders aggregate overview cards and model rows in server order, then hides on forbidden', async () => {
    const result={accounts:{active:8,by_source:{subscription:{pro:3},team_seat:2,free_access:1}},subscriptions:{new:4,ended:2},team:{packages_sold:2},token_packages:{sold:3,tokens:900},tokens:{granted:5000,used:3000,expired:100},ai_cost:{usd_micros:1250000,usd_micros_per_used_token:1,by_model:[{provider:'z',model:'second',calls:2,usd_micros:700000},{provider:'a',model:'first',calls:1,usd_micros:550000}]}};
    const api={getOperatorOverview:vi.fn().mockResolvedValueOnce(result).mockRejectedValue({response:{status:403}})};
    const view=render(<OperatorOverview api={api}/>);
    expect(await screen.findByText('Overview')).toBeTruthy();
    expect(screen.getByText('Subscription pro: 3')).toBeTruthy(); expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy(); expect(screen.getAllByText('2').length).toBeGreaterThan(1); expect(screen.getByText('900 Tokens granted')).toBeTruthy(); expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('5,000')).toBeTruthy(); expect(screen.getByText('3,000')).toBeTruthy(); expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('$1.25')).toBeTruthy(); expect(screen.getByText('$0.000001')).toBeTruthy();
    expect(screen.getByText('second').compareDocumentPosition(screen.getByText('first')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Month'),{target:{value:'2026-09'}});
    await waitFor(()=>expect(api.getOperatorOverview).toHaveBeenCalledTimes(2));
    await waitFor(()=>expect(view.container.firstChild).toBeNull());
  });
  it('shows quiet empty-month data and retries non-permission errors', async () => {
    const api={getOperatorOverview:vi.fn().mockResolvedValue({accounts:{active:0,by_source:{subscription:{},team_seat:0,free_access:0}},subscriptions:{new:0,ended:0},tokens:{granted:0,used:0,expired:0},ai_cost:{usd_micros:0,usd_micros_per_used_token:null,by_model:[]}})};
    render(<OperatorOverview api={api}/>); expect(await screen.findByText('No AI calls this month.')).toBeTruthy(); expect(screen.getByText('–')).toBeTruthy();
    const bad={getOperatorOverview:vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({accounts:{active:0,by_source:{}},subscriptions:{},tokens:{},ai_cost:{by_model:[]}})};
    render(<OperatorOverview api={bad}/>); fireEvent.click(await screen.findByRole('button',{name:'Retry'})); await waitFor(()=>expect(bad.getOperatorOverview).toHaveBeenCalledTimes(2));
  });
  it('ignores stale overview results and renders nothing for 401, 403, or 404', async () => {
    let resolveOld;
    const overview=(value)=>({accounts:{active:value,by_source:{subscription:{},team_seat:0,free_access:0}},subscriptions:{new:0,ended:0},tokens:{granted:0,used:0,expired:0},ai_cost:{usd_micros:0,usd_micros_per_used_token:null,by_model:[]}});
    const api={getOperatorOverview:vi.fn().mockImplementationOnce(()=>new Promise((resolve)=>{resolveOld=resolve;})).mockResolvedValue(overview(22))};
    const view=render(<OperatorOverview api={api}/>); fireEvent.change(await screen.findByLabelText('Month'),{target:{value:'2026-09'}});
    expect(await screen.findByText('22')).toBeTruthy(); resolveOld(overview(11)); await waitFor(()=>expect(screen.getByText('22')).toBeTruthy()); expect(screen.queryByText('11')).toBeNull(); view.unmount();
    for (const status of [401,403,404]) {
      const denied={getOperatorOverview:vi.fn().mockRejectedValue({response:{status}})}; const deniedView=render(<OperatorOverview api={denied}/>);
      await waitFor(()=>expect(denied.getOperatorOverview).toHaveBeenCalledOnce()); await waitFor(()=>expect(deniedView.container.firstChild).toBeNull()); deniedView.unmount();
    }
  });
  it('requires a grant reason and never flips state until a confirmed response', async () => {
    const onChanged=vi.fn(); const api={grantFreeAccess:vi.fn().mockResolvedValue({free_access:{reason:'ok'},access:{status:'active',source:'free'}})};
    render(<FreeAccessSwitch account={account()} api={api} onChanged={onChanged}/>);
    fireEvent.click(screen.getByRole('switch',{name:/Free access/}));
    const confirm=screen.getByRole('button',{name:'Grant'}); expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox',{name:'Reason'}),{target:{value:'  '} }); expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox',{name:'Reason'}),{target:{value:'x'.repeat(1001)} }); expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox',{name:'Reason'}),{target:{value:'  approved  '} }); expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm); fireEvent.click(confirm); await waitFor(()=>expect(api.grantFreeAccess).toHaveBeenCalledOnce());
    expect(api.grantFreeAccess).toHaveBeenCalledWith(5,'approved'); expect(onChanged).toHaveBeenCalledOnce();
  });
  it('confirms revocation and keeps errors in the dialog with a forbidden message', async () => {
    const current=account({free_access:{reason:'first'}}); const api={revokeFreeAccess:vi.fn().mockRejectedValue({response:{status:403}})};
    render(<FreeAccessSwitch account={current} api={api}/>);
    fireEvent.click(screen.getByRole('switch',{name:/Free access/})); expect(screen.getByText('Data stays; access becomes read-only.')).toBeTruthy();
    expect(api.revokeFreeAccess).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button',{name:'Revoke'}));
    expect(await screen.findByText('Forbidden')).toBeTruthy(); expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it('allows cancellation of a revocation without calling the API', async () => {
    const api={revokeFreeAccess:vi.fn()}; render(<FreeAccessSwitch account={account({free_access:{reason:'old'}})} api={api}/>);
    fireEvent.click(screen.getByRole('switch',{name:/Free access/})); fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
    expect(api.revokeFreeAccess).not.toHaveBeenCalled(); expect(document.body.querySelector('[role="switch"]').checked).toBe(true);
  });
  it('shows the save error and leaves a failed grant open', async () => {
    const api={grantFreeAccess:vi.fn().mockRejectedValue(new Error('offline'))};
    render(<FreeAccessSwitch account={account()} api={api}/>);
    fireEvent.click(screen.getByRole('switch',{name:/Free access/}));
    fireEvent.change(screen.getByRole('textbox',{name:'Reason'}),{target:{value:'reason'}});
    fireEvent.click(screen.getByRole('button',{name:'Grant'}));
    expect(await screen.findByText('Save error')).toBeTruthy(); expect(screen.getByRole('dialog')).toBeTruthy();
    expect(document.body.querySelector('[role="switch"]').checked).toBe(false);
  });
  it('loads every account page, hides permission failures, and derives access from server rows', async () => {
    const api={listOperatorAccounts:vi.fn().mockResolvedValueOnce({count:101,results:Array.from({length:100},(_,i)=>({user_id:i}))}).mockResolvedValueOnce({count:101,results:[{user_id:100}]})};
    const hook=renderHook(()=>useOperatorAccounts(api)); await waitFor(()=>expect(hook.result.current.status).toBe('ready')); expect(api.listOperatorAccounts).toHaveBeenCalledTimes(2); expect(hook.result.current.accounts.size).toBe(101);
    const t=(key,v={})=>Object.entries(v).reduce((s,[k,x])=>s.replace(`{{${k}}}`,x),key);
    expect(accountAccessText(account({access:{source:'subscription',status:'active',ends_at:null},plan_key:'pro'}),t,'en')).toBe('Billing.OP_PLAN');
    expect(accountAccessText(null,t,'en')).toBe('–');
    render(<BillingAccessCell account={account({access:{source:'team',status:'active',ends_at:null}})}/>);
    expect(screen.getByText('Team seat')).toBeTruthy();
    const hiddenApi={listOperatorAccounts:vi.fn().mockRejectedValue({response:{status:404}})};
    const hidden=renderHook(()=>useOperatorAccounts(hiddenApi)); await waitFor(()=>expect(hidden.result.current.status).toBe('hidden')); expect(hidden.result.current.accounts.size).toBe(0);
    const readyApi={listOperatorAccounts:vi.fn().mockResolvedValue({count:1,results:[{user_id:7,access:{status:'active',source:'free',ends_at:null},free_access:null}]})};
    const column=renderHook(()=>useBillingUsersColumn({api:readyApi})); await waitFor(()=>expect(column.result.current.status).toBe('ready'));
    expect(column.result.current.extraColumns).toHaveLength(1);
    expect(column.result.current.extraColumns[0].getSortValue({user:{id:7}})).toBe('Free access');
    const disabledApi={listOperatorAccounts:vi.fn()}; const disabled=renderHook(()=>useOperatorAccounts(disabledApi,{enabled:false}));
    expect(disabled.result.current.status).toBe('idle'); expect(disabledApi.listOperatorAccounts).not.toHaveBeenCalled();
  });
  it('stops account paging at fifty pages and ignores an old API response', async () => {
    const many={listOperatorAccounts:vi.fn(({page})=>Promise.resolve({count:6000,results:Array.from({length:100},(_,index)=>({user_id:(page-1)*100+index}))}))};
    const hook=renderHook(({api})=>useOperatorAccounts(api),{initialProps:{api:many}});
    await waitFor(()=>expect(hook.result.current.status).toBe('ready')); expect(many.listOperatorAccounts).toHaveBeenCalledTimes(50);
    let resolveOld;
    const oldApi={listOperatorAccounts:vi.fn(()=>new Promise((resolve)=>{resolveOld=resolve;}))};
    const newApi={listOperatorAccounts:vi.fn().mockResolvedValue({count:1,results:[{user_id:2}]})};
    const changing=renderHook(({api})=>useOperatorAccounts(api),{initialProps:{api:oldApi}});
    changing.rerender({api:newApi}); await waitFor(()=>expect(changing.result.current.status).toBe('ready'));
    resolveOld?.({count:1,results:[{user_id:1}]}); await waitFor(()=>expect(changing.result.current.accounts.has(2)).toBe(true));
  });
});
