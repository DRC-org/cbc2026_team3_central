// tuicss のセマンティック text クラス(success-text 等)に対応する色キー
export type TuiColor = "success" | "warning" | "danger" | "info" | "secondary";

// TuiProgressBar は { Green, Yellow, Red, Cyan, Blue, ... } を持つオブジェクト export。
// セマンティック色 → 実在するサブコンポーネント名へ写像する。
export const PROGRESS_BAR_VARIANT: Record<TuiColor, "Green" | "Yellow" | "Red" | "Cyan" | "Blue"> =
  {
    success: "Green",
    warning: "Yellow",
    danger: "Red",
    info: "Cyan",
    secondary: "Blue",
  };
