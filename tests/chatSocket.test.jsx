// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useChatSocket } from '../src/chat/useChatSocket';
class FakeSocket {
  static OPEN = 1; static instances = [];
  constructor(url) { this.url=url; this.readyState=0; this.sent=[]; FakeSocket.instances.push(this); }
  open() { this.readyState=1; this.onopen?.(); }
  message(data) { this.onmessage?.({data:JSON.stringify(data)}); }
  send(data) { this.sent.push(data); }
  close(code=1000) { this.readyState=3; this.onclose?.({code}); }
}
function Harness({ onFrame }) { const socket = useChatSocket('a', { wsUrl: () => 'ws://test', onFrame }); return <output>{socket.status}</output>; }
describe('chat socket', () => {
  afterEach(() => { vi.useRealTimers(); delete globalThis.WebSocket; FakeSocket.instances=[]; });
  it('delivers delta and final turn frames with chat id and reconnects without resending', () => {
    vi.useFakeTimers(); globalThis.WebSocket=FakeSocket; const onFrame=vi.fn(); render(<Harness onFrame={onFrame}/>); const first=FakeSocket.instances[0];
    act(()=>{ first.open(); first.message({type:'delta',text:'hi'}); first.message({type:'turn',turn:{assistant_text:'done',sources:[]}}); first.close(1006); });
    expect(onFrame).toHaveBeenCalledWith({type:'delta',text:'hi'},'a'); expect(onFrame).toHaveBeenCalledWith({type:'turn',turn:{assistant_text:'done',sources:[]}},'a');
    act(()=>vi.advanceTimersByTime(1000)); expect(FakeSocket.instances).toHaveLength(2); expect(first.sent).toEqual([]);
  });
  it.each([4401,4403,4429])('does not reconnect for close code %s', (code) => {
    vi.useFakeTimers(); globalThis.WebSocket=FakeSocket; render(<Harness onFrame={vi.fn()}/>); act(()=>FakeSocket.instances[0].close(code)); act(()=>vi.advanceTimersByTime(10000)); expect(FakeSocket.instances).toHaveLength(1);
  });
});
