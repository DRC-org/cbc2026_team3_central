import { Chip, Spinner } from "@heroui/react";

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  if (connected) {
    return (
      <Chip color="success" variant="soft" size="md">
        <Chip.Label>接続中</Chip.Label>
      </Chip>
    );
  }
  return (
    <Chip color="danger" variant="soft" size="md">
      <Spinner size="sm" color="danger" />
      <Chip.Label>再接続中...</Chip.Label>
    </Chip>
  );
}
