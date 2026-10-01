import React from 'react';

/** A play mark in a ring, drawn in the current colour and sized by its container. */
export const PlayIcon: React.FC = () => (
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="2.5" />
    <path d="M26 21.5v21l17-10.5-17-10.5z" fill="currentColor" />
  </svg>
);
