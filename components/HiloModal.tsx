import { providers } from "ethers";
import { Modals } from "../lib/types";
import ApproveModal from "./modals/ApproveModal";
import HowToModal from "./modals/HowToModal";

type HiloModalProps = {
  show: boolean;
  closeFn: () => void;
  provider?: providers.Web3Provider;
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
      return <ApproveModal closeFn={props.closeFn} />;
    default:
      return null;
  }
}
