const errorMap = {
  4001: "It looks like you rejected the transacation. Try again?",
  "execution reverted: ERC20: transfer amount exceeds allowance":
    "It looks like you need to approve sending HILO some USDC. Approve that, and then try again?",
  "execution reverted: ERC20: transfer amount exceeds balance":
    "It looks like we are short some USDC. Top up and try again?",
};

export default function GetErrorMsg(error) {
  let errorMessage;

  // We have a metamask error: catch it
  if (typeof error.code === "number") {
    const errorCode = error.code;
    errorMessage = errorMap[errorCode];
  } else {
    // We have a contract error: look deeper
    const errorMsg = error.reason;
    errorMessage = errorMap[errorMsg];
  }
  if (errorMessage === null) return "Something went wrong. Try again?";

  return errorMessage;
}
