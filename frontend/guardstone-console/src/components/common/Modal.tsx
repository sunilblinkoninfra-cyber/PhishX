'use client';

import React, { ReactNode } from 'react';
import { Dialog } from './Dialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
}: ModalProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className={`${maxWidth} mx-auto`}>
        {children}
      </div>
    </Dialog>
  );
}
