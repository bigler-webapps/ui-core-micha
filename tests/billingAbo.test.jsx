// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => Object.entries(values || {}).reduce((text,[name,value])=>text.replaceAll(`{{${name}}}`,String(value)),key), i18n:{language:'en'} }) }));
import { SubscriptionSection } from '../src/billing/SubscriptionSection';
afterEach(cleanup);
const makeMe = (extra={}) => ({access:{status:'active',source:'subscription',ends_at:'2027-04-01T00:00:00Z'},tokens:{balance:20},plans:[],...extra});
const apiFor = (me, extra={}) => ({getMe:vi.fn().mockResolvedValue(me),listSeats:vi.fn().mockResolvedValue({seats:[]}),...extra});

describe('expanded Abo section',()=>{
  it('shows personal plan term and valid token grants only when supplied',async()=>{
    render(<SubscriptionSection api={apiFor(makeMe({subscription:{plan_key:'pro',plan_name:'Professional',current_period_end:'2026-12-15T00:00:00Z',renews:true},tokens:{balance:20,grants:[{source:'plan',amount:100,remaining:40,expires_at:'2026-11-01T00:00:00Z'},{source:'package',amount:50,remaining:10,expires_at:null}]}}))} withdrawal={false}/>);
    expect(await screen.findByText('Billing.OP_PLAN')).toBeTruthy(); expect(screen.getByText('Billing.OP_RENEWS')).toBeTruthy();
    expect(screen.getByText(/Billing.OP_GRANT_PLAN/)).toBeTruthy(); expect(screen.getByText(/Billing.OP_GRANT_PACKAGE/)).toBeTruthy(); expect(screen.getByText(/Billing.OP_VALID_UNTIL/)).toBeTruthy();
  });
  it('shows team capacity and server names in the seat assignment list',async()=>{
    const me=makeMe({access:{status:'active',source:'team',ends_at:'2027-04-01T00:00:00Z'},team:{seats_total:4,seats_used:2,seat_holders:[{user_id:12,name:'Ada',email:'ada@example.test'},{user_id:13,name:'',email:'lin@example.test'}]}});
    render(<SubscriptionSection api={apiFor(me,{listSeats:vi.fn().mockResolvedValue({seats:[{user_id:12},{user_id:99}]})})} withdrawal={false}/>);
    expect(await screen.findByText('Billing.OP_SEATS_USED')).toBeTruthy(); expect(screen.getAllByText('Ada').length).toBeGreaterThan(0); expect(screen.getByText('lin@example.test')).toBeTruthy(); expect(await screen.findByText('99')).toBeTruthy();
  });
  it('shows seat-holder and free-access lines without extra team data',async()=>{
    const seatMe=makeMe({access:{status:'active',source:'team',ends_at:null},seat:{plan_key:'team',plan_name:'',ends_at:'2026-11-01T00:00:00Z'}});
    const {unmount}=render(<SubscriptionSection api={apiFor(seatMe)} withdrawal={false}/>);
    expect(await screen.findByText('Billing.OP_SEAT_UNTIL')).toBeTruthy(); expect(screen.queryByText('Billing.OP_SEATS_USED')).toBeNull(); unmount();
    const free=makeMe({access:{status:'active',source:'free',ends_at:null}});
    render(<SubscriptionSection api={apiFor(free)} withdrawal={false}/>); expect(await screen.findByText('Billing.SOURCE_FREE')).toBeTruthy();
  });
});
