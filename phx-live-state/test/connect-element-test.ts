import { html, LitElement } from "lit";
import { property, customElement, state } from 'lit/decorators.js';
import sinon from "sinon";
import LiveState from "../src/live-state";
import { expect } from "@esm-bundle/chai";
import {Channel} from 'phoenix';
import { fixture } from '@open-wc/testing';
import { connectElement } from "../src";

@customElement('test-element')
class TestElement extends LitElement {
  @property() foo: string;
  @state() bar: string;

  render() {
    return html`<div>${this.foo} ${this.bar}</div>`
  }
}

describe('connectElement', () => {
  let socketMock, liveState, stubChannel;
  beforeEach(() => {
    liveState = new LiveState({url: "wss://foo.com", topic: "stuff"});
    socketMock = sinon.mock(liveState.socket);
    stubChannel = sinon.createStubInstance(Channel, {
      join: sinon.stub().returns({
        receive: sinon.stub()
      }),
      on: sinon.spy(),
      push: sinon.spy()
    });
  });
  
  beforeEach(() => {
    socketMock.expects('connect').exactly(1);
    socketMock.expects('channel').exactly(1).withArgs('stuff').returns(stubChannel);
  });

  it('updates on state changes', async () => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo']
    });
    const stateChange = liveState.channel.on.getCall(0).args[1];
    stateChange({state: { foo: 'wuzzle', bar: 'wizzle' }, version: 1});
    await el.updateComplete;
    expect(el.bar).to.equal('wizzle');
    expect(el.shadowRoot.innerHTML).to.contain('wizzle');
    expect(el.getAttribute('foo')).to.equal('wuzzle');
    expect(el.shadowRoot.innerHTML).to.contain('wuzzle');
  });

  it('sends events', async () => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo'],
      events: {
        send: ['sayHi']
      }
    });
    el.dispatchEvent(new CustomEvent('sayHi', { detail: { greeting: 'wazzaap' } }));
    expect(liveState.channel.push.callCount).to.equal(1);
    const pushCall = liveState.channel.push.getCall(0);
    expect(pushCall.args[0]).to.equal('lvs_evt:sayHi');
    expect(pushCall.args[1]).to.deep.equal({ greeting: 'wazzaap' });
  });

  it('connects idempotently', async () => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo'],
      events: {
        send: ['sayHi']
      }
    });
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo'],
      events: {
        send: ['sayHi']
      }
    });
    el.dispatchEvent(new CustomEvent('sayHi', { detail: { greeting: 'wazzaap' } }));
    expect(liveState.channel.push.callCount).to.equal(1);
  });

  it('receives events', async () => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo'],
      events: {
        send: ['sayHi'],
        receive: ['sayHiBack']
      }
    });
    const onArgs = liveState.channel.on.getCall(2).args;
    expect(onArgs[0]).to.equal("sayHiBack")
    const onHandler = onArgs[1];
    let eventDetail;
    el.addEventListener('sayHiBack', ({ detail }: CustomEvent) => { eventDetail = detail });
    onHandler({ foo: 'bar' })
    expect(eventDetail).to.deep.equal({ foo: 'bar' });
  });
});
