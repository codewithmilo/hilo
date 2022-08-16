import { Button } from "@nextui-org/react";

type ConnectButtonProps = { connectFn: () => void };

export default function ConnectButton(props: ConnectButtonProps) {
  return (
    <Button
      color="gradient"
      size="xl"
      css={{
        maxWidth: "200px",
        margin: "0 auto",
        "& span": {
          zIndex: "auto !important",
        },
      }}
      onPress={props.connectFn}
    >
      Connect wallet to play
    </Button>
  );
}
