import { Card, Text } from "@nextui-org/react";
import { CONSTANTS } from "../lib/constants";
import { Tokens } from "../lib/types";

type PriceUpdateProps = {
  token: Tokens;
  closeFn: () => void;
};

export default function PriceUpdate(props: PriceUpdateProps) {
  if (props.token === null) return null;
  const { token, closeFn } = props;

  const tokenStr = token === CONSTANTS.HI_TOKEN_ID ? "Hi" : "Lo";
  const changeStr = token === CONSTANTS.HI_TOKEN_ID ? "decreased" : "increased";

  return (
    <Card variant="bordered" isPressable onPress={closeFn}>
      <Card.Body>
        <Text b color="white" size="1.2rem" css={{ textAlign: "center" }}>
          The {tokenStr} token price has {changeStr}!
        </Text>
      </Card.Body>
    </Card>
  );
}
