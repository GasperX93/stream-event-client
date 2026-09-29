import { useRef, useState } from 'react';

import { useAppContext } from '@/app/AppProvider';

import {
  checkOwnNodeAddress,
  describeProbeFailure,
  gatewayLabel,
  isDefaultGateway,
  OWN_NODE_DEFAULT_ADDRESS,
  probeGateway,
} from './gatewayProbe';

import './DomainSelector.scss';

const KEY_ENTER = 'Enter';
const KEY_ESCAPE = 'Escape';

type PickerStatus = { kind: 'idle' } | { kind: 'checking' } | { kind: 'error'; text: string };

const IDLE: PickerStatus = { kind: 'idle' };

/**
 * The picker a viewer uses to choose where the video loads from: the event gateway, or a Bee node on
 * their own machine.
 *
 * Nothing is saved until the own node has answered a health check, so a wrong port, or a node that
 * refuses this site's origin, is reported here in words rather than reaching the viewer later as a
 * catalog with nothing in it. The event gateway is one click, because a viewer who tried their own
 * node and gave up has no other route back.
 */
export function DomainSelector() {
  const { gatewayUrl, setGatewayUrl, defaultGatewayUrl } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(OWN_NODE_DEFAULT_ADDRESS);
  const [status, setStatus] = useState<PickerStatus>(IDLE);
  // Bumped on every confirm and on close, so a probe that comes back after the viewer cancelled or
  // retyped cannot save an address they no longer meant.
  const probeGeneration = useRef(0);

  const isOnEventGateway = isDefaultGateway(gatewayUrl, defaultGatewayUrl);

  const handleOpen = () => {
    setInputValue(isOnEventGateway ? OWN_NODE_DEFAULT_ADDRESS : gatewayUrl);
    setStatus(IDLE);
    setIsOpen(true);
  };

  const close = () => {
    probeGeneration.current += 1;
    setIsOpen(false);
  };

  // probeGateway answers every failure as an outcome, so the button calls this without awaiting.
  const handleUseOwnNode = async () => {
    if (status.kind === 'checking') {
      return;
    }

    const address = checkOwnNodeAddress(inputValue);
    if (!address.ok) {
      setStatus({ kind: 'error', text: address.text });
      return;
    }

    const generation = ++probeGeneration.current;
    setStatus({ kind: 'checking' });
    const outcome = await probeGateway(address.url);
    if (generation !== probeGeneration.current) {
      return;
    }

    if (outcome.kind === 'ok') {
      setGatewayUrl(address.url);
      close();
      return;
    }
    setStatus({ kind: 'error', text: describeProbeFailure(outcome) });
  };

  const handleUseEventGateway = () => {
    setGatewayUrl(defaultGatewayUrl);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === KEY_ENTER) {
      void handleUseOwnNode();
    }
    if (e.key === KEY_ESCAPE) {
      close();
    }
  };

  const handleTyping = (value: string) => {
    setInputValue(value);
    if (status.kind !== 'idle') {
      // A result about the previous address must not stand under a new one, and a probe still in
      // flight for it must not land on this one either.
      probeGeneration.current += 1;
      setStatus(IDLE);
    }
  };

  return (
    <>
      <button className="gateway-button" onClick={handleOpen} title="Choose where the video loads from">
        <span className="gateway-button-label">Bee node</span>
        <span className="gateway-button-current">{gatewayLabel(gatewayUrl, defaultGatewayUrl)}</span>
      </button>

      {isOpen && (
        <div className="gateway-modal-backdrop" onClick={close}>
          <div className="gateway-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="gateway-modal-title">Where the video loads from</h3>

            <section className="gateway-modal-choice">
              <h4 className="gateway-modal-choice-title">Event gateway</h4>
              <p className="gateway-modal-description">The Bee node the event runs for every viewer.</p>
              <button className="gateway-modal-default" onClick={handleUseEventGateway} disabled={isOnEventGateway}>
                {isOnEventGateway ? 'In use' : 'Use the event gateway'}
              </button>
            </section>

            <section className="gateway-modal-choice">
              <h4 className="gateway-modal-choice-title">My own Bee node</h4>
              <p className="gateway-modal-description">
                A Bee node on this computer, for example Swarm Desktop. Change the port if yours is not 1633.
              </p>
              <input
                className="gateway-modal-input"
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={OWN_NODE_DEFAULT_ADDRESS}
                aria-label="Address of your own Bee node"
              />
              <p className={`gateway-modal-status ${status.kind}`} role="status">
                {status.kind === 'checking' && 'Checking the node...'}
                {status.kind === 'error' && status.text}
              </p>
              <div className="gateway-modal-actions">
                <span className="gateway-modal-actions-spacer" />
                <button className="gateway-modal-cancel" onClick={close}>
                  Cancel
                </button>
                <button
                  className="gateway-modal-confirm"
                  onClick={() => void handleUseOwnNode()}
                  disabled={status.kind === 'checking'}
                >
                  {status.kind === 'checking' ? 'Checking...' : 'Check and use'}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
