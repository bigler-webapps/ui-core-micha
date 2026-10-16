// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next',()=>({useTranslation:()=>({t:(key)=>key,i18n:{language:'en'}})}));
vi.mock('../src/components/UserListComponent',()=>({UserListComponent:({extraColumns=[]})=><div>{extraColumns.map((column)=><span key={column.key}>{typeof column.label==='function'?column.label({}):column.label}</span>)}</div>}));
import { AuthContext } from '../src/auth/AuthContext';
import { AccountPage } from '../src/pages/AccountPage';
afterEach(cleanup);
const wrapper=(api,children)=><MemoryRouter initialEntries={['/?tab=users']}><AuthContext.Provider value={{user:{id:4,available_roles:[],ui_permissions:{can_view_users:true}},login:vi.fn(),loading:false}}>{children}</AuthContext.Provider></MemoryRouter>;

describe('AccountPage billing Users integration',()=>{
  it('does not request operator billing data unless billingUsers is enabled',()=>{
    const api={listOperatorAccounts:vi.fn()};
    render(wrapper(api,<AccountPage billingUsers={false}/>));
    expect(api.listOperatorAccounts).not.toHaveBeenCalled(); expect(screen.queryByText('Billing.OP_ACCESS')).toBeNull();
  });
  it('adds the server-backed billing column when given an API',async()=>{
    const api={listOperatorAccounts:vi.fn().mockResolvedValue({count:0,results:[]})};
    render(wrapper(api,<AccountPage billingUsers={api}/>));
    expect(await screen.findByText('Billing.OP_ACCESS')).toBeTruthy();
    await waitFor(()=>expect(api.listOperatorAccounts).toHaveBeenCalledWith({page:1,pageSize:100}));
  });
});
