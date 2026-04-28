import { Chip } from "@heroui/react";

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  if (connected) {
    return (
      <Chip color="success" variant="soft" size="lg" className="text-base font-semibold">
        ● 接続中
      </Chip>
    );
  }

  return (
    <Chip color="danger" variant="soft" size="lg" className="animate-pulse text-base font-semibold">
      ● 再接続中...
    </Chip>
  );
}
