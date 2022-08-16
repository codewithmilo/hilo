import { Button } from "@nextui-org/react";
import { GameState } from "../../lib/types";

type ApproveButtonProps = {
  gameState: GameState;
  clickFn: () => void;
};

export default function ApproveButton(props: ApproveButtonProps) {
  const { gameState, clickFn } = props;
  const { currentHi, approvedSpend } = gameState;

  if (approvedSpend > currentHi) return null;

  return (
    <Button
      color="gradient"
      size="lg"
      css={{ maxWidth: "200px", margin: "0 auto" }}
      onPress={clickFn}
    >
      Pre-approve payments
    </Button>
  );
}
