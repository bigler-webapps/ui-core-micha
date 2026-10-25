// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => values?.count !== undefined ? `${key}:${values.count}` : key }) }));
vi.mock('@mui/icons-material', () => ({ MoreVert: () => null }));
import ChatWorkspace from '../src/chat/ChatWorkspace';
import * as chatThreadModule from '../src/chat/ChatThread';
import { CHAT_KIT_SX_REGISTRY } from '../src/chat/kitSxRegistry';

class FakeSocket {
  static OPEN=1; static instances=[];
  constructor(url) { this.url=url; this.readyState=0; this.sent=[]; FakeSocket.instances.push(this); }
  open() { this.readyState=1; this.onopen?.(); }
  push(frame) { this.onmessage?.({ data: JSON.stringify(frame) }); }
  send(data) { this.sent.push(JSON.parse(data)); }
  close(code=1000) { this.readyState=3; this.onclose?.({code}); }
}
const catalog={ entries:[{id:'m',driver:'d',model:'model',label:'Model',efforts:['low']}], default:{entry:'m',effort:'low'} };
const chat={id:7,title:'Project chat',selection:{entry:'m',effort:'low'}};
const makeApi=(extra={})=>({getStatus:vi.fn().mockResolvedValue({status:'available'}),getCatalogue:vi.fn().mockResolvedValue(catalog),listChats:vi.fn().mockResolvedValue({results:[chat],next:null}),createChat:vi.fn().mockResolvedValue({...chat,id:8}),updateChat:vi.fn().mockResolvedValue(chat),deleteChat:vi.fn(),listTurns:vi.fn().mockResolvedValue({results:[],next:null}),...extra});
async function launch(api, props={}) { render(<ChatWorkspace api={api} wsUrl={(id)=>`ws://test/${id}`} {...props}/>); if (props.layout==='compact') { fireEvent.click(await screen.findByRole('button',{name:'Chat.chats'})); } fireEvent.click(await screen.findByText('Project chat')); if (props.layout==='compact') await waitFor(()=>expect(screen.getByRole('button',{name:'Chat.sidePanel'})).toBeTruthy()); await waitFor(()=>expect(FakeSocket.instances.length).toBeGreaterThan(0)); const s=FakeSocket.instances.at(-1); act(()=>s.open()); return s; }
function send(socket, text='question') { fireEvent.change(screen.getByRole('textbox',{name:'Chat.message'}),{target:{value:text}}); fireEvent.click(screen.getByRole('button',{name:'Chat.send'})); }
function complete(socket,id=21) { act(()=>socket.push({type:'turn',turn:{id,seq:id,user_text:'question',assistant_text:'answer',state:'completed',sources:[],model:'Model'}})); }
beforeEach(()=>{globalThis.WebSocket=FakeSocket;}); afterEach(()=>{cleanup();delete globalThis.WebSocket;FakeSocket.instances=[];delete globalThis.ResizeObserver;});

describe('ChatWorkspace extensions',()=>{
 it('preserves default API call shapes and surface landmarks without extension props',async()=>{const api=makeApi(); await launch(api); expect(api.getStatus).toHaveBeenCalledWith(); expect(api.listChats).toHaveBeenNthCalledWith(1); expect(api.listChats).toHaveBeenNthCalledWith(2,{archived:true}); expect(screen.getByRole('log',{name:'Chat.thread'})).toBeTruthy(); expect(screen.getByRole('textbox',{name:'Chat.message'})).toBeTruthy();});
 it('passes scope to status, both lists, create, and load-more',async()=>{const api=makeApi({listChats:vi.fn().mockResolvedValue({results:[chat],next:'next'})}); render(<ChatWorkspace api={api} scope="project-7"/>); await screen.findByText('Project chat'); expect(api.getStatus).toHaveBeenCalledWith({scope:'project-7'}); expect(api.listChats).toHaveBeenNthCalledWith(1,{scope:'project-7'}); expect(api.listChats).toHaveBeenNthCalledWith(2,{scope:'project-7',archived:true}); fireEvent.click(screen.getByRole('button',{name:'Chat.loadMore'})); await waitFor(()=>expect(api.listChats).toHaveBeenNthCalledWith(3,{scope:'project-7',cursor:'next'})); fireEvent.click(screen.getAllByRole('button',{name:'Chat.newChat'})[0]); await waitFor(()=>expect(api.createChat).toHaveBeenCalledWith({scope:'project-7'}));});
 it('uses reason text and generic unavailable fallback',async()=>{const api=makeApi({getStatus:vi.fn().mockResolvedValue({status:'unavailable',reason:'policy'})}); const {rerender}=render(<ChatWorkspace api={api} unavailableReasonText={{policy:'App reason'}}/>); expect(await screen.findByText('App reason')).toBeTruthy(); cleanup(); render(<ChatWorkspace api={api}/>); expect(await screen.findByText('Chat.notAvailableHere')).toBeTruthy();});
 it('renders side/composer slots; compact layout presents side content in a sheet',async()=>{const api=makeApi(); await launch(api,{layout:'compact',sidePanel:()=> <div>Side details</div>,renderComposerExtra:()=> <div>Scope summary</div>}); expect(screen.getByText('Scope summary')).toBeTruthy(); fireEvent.click(screen.getByRole('button',{name:'Chat.sidePanel'})); expect(await screen.findByText('Side details')).toBeTruthy(); expect(screen.getByText('Side details').closest('.MuiDrawer-paper')).toBeTruthy();});
 it('renders wide side panel beside the thread',async()=>{await launch(makeApi(),{layout:'viewport',sidePanel:()=> <div>Inline side</div>}); expect(screen.getByText('Inline side')).toBeTruthy(); expect(document.querySelector('.MuiDrawer-paper')).toBeNull();});
 it('routes app frames to callback once and only to their answer turn slot',async()=>{const cb=vi.fn(), seen=[]; const socket=await launch(makeApi(),{onAppFrame:cb,renderAnswerExtra:({turn,appFrames})=><div data-testid={`extra-${turn.id}`}>{appFrames.map(f=>f.name).join(',')}</div>}); send(socket); act(()=>{socket.push({type:'app',name:'a',payload:{}});socket.push({type:'app',name:'b',payload:{}});}); complete(socket,21); await screen.findByTestId('extra-21'); send(socket,'second'); act(()=>socket.push({type:'app',name:'c',payload:{}})); complete(socket,22); await waitFor(()=>expect(screen.getByTestId('extra-22').textContent).toBe('c')); expect(screen.getByTestId('extra-21').textContent).toBe('a,b'); expect(cb.mock.calls.map(([x])=>x.name)).toEqual(['a','b','c']); expect(cb).toHaveBeenCalledTimes(3);});
 it('ignores history trimmed frames without affecting the thread',async()=>{const socket=await launch(makeApi()); const thread=screen.getByRole('log',{name:'Chat.thread'}); const initialChildren=thread.childElementCount; act(()=>{socket.push({type:'notice',code:'history_trimmed',left_out:3});socket.push({type:'notice',code:'history_trimmed',left_out:1});socket.push({type:'notice',code:'history_trimmed',left_out:0});socket.push({type:'notice',code:'history_trimmed'});}); expect(thread.childElementCount).toBe(initialChildren); expect(thread.textContent).not.toContain('historyTrimmed'); expect(thread.textContent).not.toMatch(/\d+ earlier messages? left out/); send(socket); act(()=>socket.push({type:'delta',text:'answer'})); complete(socket,21); expect(await screen.findByText('answer')).toBeTruthy();});
 it('ignores a legacy trimmedCount prop and removes the trimmed sx registry entry and export',()=>{const view=render(React.createElement(chatThreadModule.ChatThread,{trimmedCount:5})); const thread=screen.getByRole('log',{name:'Chat.thread'}); expect(thread.textContent).not.toContain('historyTrimmed'); expect(thread.textContent).not.toContain('5'); expect(view.container.querySelector('.MuiChip-root')).toBeNull(); expect(CHAT_KIT_SX_REGISTRY.some((entry)=>entry.component==='ChatThread.trimmed')).toBe(false); expect('CHAT_THREAD_TRIMMED_SX' in chatThreadModule).toBe(false);});
 it('uses the container width to choose the compact drawer layout',async()=>{const observers=[]; globalThis.ResizeObserver=class{constructor(cb){this.cb=cb;observers.push(this);} observe(){} disconnect(){}}; await launch(makeApi(),{layout:'container',sidePanel:()=> <div>Container side</div>}); act(()=>observers.forEach((observer)=>observer.cb([{contentRect:{width:500}}]))); expect(screen.getByRole('button',{name:'Chat.chats'})).toBeTruthy(); fireEvent.click(screen.getByRole('button',{name:'Chat.sidePanel'})); expect(await screen.findByText('Container side')).toBeTruthy(); expect(screen.getByText('Container side').closest('.MuiDrawer-paper')).toBeTruthy();});
 it('remounts stateful slot content when chats change',async()=>{const api=makeApi({listChats:vi.fn().mockResolvedValue({results:[chat,{...chat,id:9,title:'Other'}],next:null})}); await launch(api,{renderComposerExtra:()=> <Slot/>}); expect(screen.getByText('Slot 0')).toBeTruthy(); fireEvent.click(screen.getByText('Slot 0')); expect(screen.getByText('Slot 1')).toBeTruthy(); fireEvent.click(screen.getByText('Other')); await waitFor(()=>expect(screen.getByText('Slot 0')).toBeTruthy());});
});
describe('ChatWorkspace extension arguments and placement', () => {
  it('hands the chat to the side panel and composer slots and the chat, turn and frames to the answer slot', async () => {
    const sidePanel = vi.fn(() => <div>Side</div>);
    const composerExtra = vi.fn(() => <div>Above input</div>);
    const answerExtra = vi.fn(() => <div>Answer extra</div>);
    const socket = await launch(makeApi(), { layout: 'viewport', sidePanel, renderComposerExtra: composerExtra, renderAnswerExtra: answerExtra });
    expect(sidePanel).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
    expect(composerExtra).toHaveBeenCalledWith({ chat: expect.objectContaining({ id: 7 }) });
    send(socket);
    act(() => socket.push({ type: 'app', name: 'plan', payload: { step: 1 } }));
    complete(socket, 21);
    await screen.findByText('Answer extra');
    expect(answerExtra).toHaveBeenLastCalledWith({
      turn: expect.objectContaining({ id: 21 }),
      chat: expect.objectContaining({ id: 7 }),
      appFrames: [{ name: 'plan', payload: { step: 1 } }],
      send: expect.any(Function),
      canSend: expect.any(Boolean),
    });
  });

  it('calls onAppFrame with payload, chat id and the running turn id', async () => {
    const onAppFrame = vi.fn();
    const socket = await launch(makeApi(), { onAppFrame });
    send(socket);
    act(() => socket.push({ type: 'app', name: 'proposal', payload: { id: 'p1' } }));
    expect(onAppFrame).toHaveBeenCalledTimes(1);
    expect(onAppFrame).toHaveBeenCalledWith({ name: 'proposal', payload: { id: 'p1' }, chatId: 7, turnId: 'pending' });
  });

  it('places the composer slot above the input and the wide side panel after the thread', async () => {
    await launch(makeApi(), { layout: 'viewport', sidePanel: () => <div>Beside</div>, renderComposerExtra: () => <div>Above input</div> });
    const input = screen.getByRole('textbox', { name: 'Chat.message' });
    const extra = screen.getByText('Above input');
    // DOCUMENT_POSITION_FOLLOWING: the input comes after the extra.
    expect(extra.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const thread = screen.getByRole('log', { name: 'Chat.thread' });
    expect(thread.compareDocumentPosition(screen.getByText('Beside')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(thread.contains(screen.getByText('Beside'))).toBe(false);
  });

  it('opens the model picker as a popover in the compact layout on a wide viewport (UCM-CHAT-12)', async () => {
    await launch(makeApi(), { layout: 'compact', sidePanel: () => <div>Side</div> });
    fireEvent.click(screen.getByRole('button', { name: /Model/ }));
    expect(document.querySelector('.MuiDrawer-paperAnchorBottom')).toBeNull();
    expect(document.querySelector('.MuiPopover-paper')).toBeTruthy();
  });

  it('names the side-panel sheet and drops the open chat when the scope changes', async () => {
    const api = makeApi();
    const view = render(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} scope="a" layout="compact" sidePanel={() => <div>Side</div>} sidePanelLabel="Permissions" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Chat.chats' }));
    fireEvent.click(await screen.findByText('Project chat'));
    fireEvent.click(await screen.findByRole('button', { name: 'Permissions' }));
    expect(await screen.findByLabelText('Permissions', { selector: '.MuiDrawer-paper' })).toBeTruthy();
    view.rerender(<ChatWorkspace api={api} wsUrl={(id) => `ws://test/${id}`} scope="b" layout="compact" sidePanel={() => <div>Side</div>} sidePanelLabel="Permissions" />);
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Chat.message' })).toBeNull());
  });
});

function Slot(){const [n,setN]=React.useState(0);return <button onClick={()=>setN(n+1)}>Slot {n}</button>;}
