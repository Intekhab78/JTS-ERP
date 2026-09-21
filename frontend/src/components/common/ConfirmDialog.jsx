import React from 'react';
import { Modal } from './Modal';
import { Button } from '../ui/Button';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you absolutely sure?", 
  description = "This action cannot be undone. This will permanently delete the data from our servers.",
  confirmText = "Continue",
  cancelText = "Cancel",
  isDanger = true,
  isLoading = false
}) => {
  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isLoading} className="mt-2 sm:mt-0">
        {cancelText}
      </Button>
      <Button variant={isDanger ? "danger" : "primary"} onClick={onConfirm} isLoading={isLoading}>
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size="md"
    >
      <p className="text-sm text-muted-foreground">{description}</p>
    </Modal>
  );
};

export { ConfirmDialog };
export default ConfirmDialog;
