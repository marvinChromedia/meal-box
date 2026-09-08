import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export interface GenerateConfirmationModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * TEST-153 AC5: told what will happen before it happens. Worded as a merge,
 * not a wipe, per TEST-76's binding regeneration decision — this is not the
 * destructive-confirm pattern used for delete/clear.
 */
export function GenerateConfirmationModal({ open, onConfirm, onCancel }: GenerateConfirmationModalProps) {
  return (
    <Modal open={open} title="Generate a new shopping list?" onClose={onCancel}>
      <p>
        You already have a shopping list. Generating again refreshes amounts from your recipes — any amount
        you&apos;ve corrected by hand stays as you left it, ticked-off items stay ticked, and anything you added
        yourself is untouched.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Generate
        </Button>
      </div>
    </Modal>
  );
}
