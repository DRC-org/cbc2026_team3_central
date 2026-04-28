import { Chip } from "@heroui/react";

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <Chip
      color={connected ? "success" : "danger"}
      variant="soft"
      size="lg"
      className="text-base font-semibold"
    >
      {connected ? "● 接続中" : "● 未接続"}
    </Chip>
  );
}
