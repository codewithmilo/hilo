import { providers } from "ethers";
import { GameState, Modals, Tokens } from "../../lib/types";
import ApproveModal from "./ApproveModal";
import BuyModal from "./BuyModal";
import HowToModal from "./HowToModal";
import SellModal from "./SellModal";

type HiloModalProps = {
  show: boolean;
  closeFn: () => void;
  provider?: providers.Web3Provider;
  token?: Tokens;
  gameState?: GameState;
};

interface HiloModalInterface extends HiloModalProps {
  modalType: Modals | null;
}

export default function HiloModal(props: HiloModalInterface) {
  if (!props.show) return null;

  switch (props.modalType) {
    case Modals.HOW_TO_PLAY:
      return <HowToModal closeFn={props.closeFn} />;
    case Modals.APPROVE:
      return <ApproveModal closeFn={props.closeFn} provider={props.provider} />;
    case Modals.BUY:
      return (
        <BuyModal
          closeFn={props.closeFn}
          provider={props.provider}
          token={props.token}
          gameState={props.gameState}
        />
      );
    case Modals.SELL:
      return (
        <SellModal
          closeFn={props.closeFn}
          provider={props.provider}
          token={props.token}
          gameState={props.gameState}
        />
      );
    default:
      return null;
  }
}
