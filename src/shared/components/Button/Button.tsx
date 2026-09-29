import { ButtonHTMLAttributes } from 'react';

import './Button.scss';

export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = ButtonVariant.PRIMARY, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={['button', variant, className].filter(Boolean).join(' ')} {...props} />;
}
