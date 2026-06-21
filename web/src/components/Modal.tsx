import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal({
  isOpen,
  title,
  footer,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="tui-modal-container active" aria-label={title}>
      <div className="tui-modal" role="alertdialog">
        <div className="tui-window red-168 left-align">
          <fieldset className="tui-fieldset">
            {title && <legend>{title}</legend>}
            {children}
            {footer && (
              <>
                <div className="tui-divider" />
                {footer}
              </>
            )}
          </fieldset>
        </div>
      </div>
    </div>
  );
}
