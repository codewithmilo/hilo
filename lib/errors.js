const errorMap = {
  4001: "It looks like you rejected the transaction. Try again?",
  "execution reverted: ERC20: transfer amount exceeds allowance":
    "It looks like you need to approve sending HILO some USDC. Approve that, and then try again?",
  "execution reverted: ERC20: transfer amount exceeds balance":
    "It looks like we are short some USDC. Top up and try again?",
  "execution reverted: HILO: cannot sell when the sale is locked":
    "sales locked",
  "execution reverted: Insufficient USDC balance.":
    "It appears you don't have enough USDC. Get some and come back!",
  "execution reverted: Pausable: paused": "The game is over, someone won!",
  "execution reverted: Game is paused.": "The game is over, someone won!",
};

const walletErrorMap = {
  bad_chain: "Please switch to the Mumbai network to play.",
  "User Rejected": "Request to connect rejected. Please try again.",
};

const GetErrorMsg = (error) => {
  let errorMessage = null;

  // We have a metamask error: catch it
  if (typeof error.code === "number") {
    const errorCode = error.code;
    errorMessage = errorMap[errorCode];
  } else {
    // We have a contract error: look deeper
    const errorMsg = error.reason;
    errorMessage = errorMap[errorMsg];
  }
  if (!errorMessage) return "Something went wrong. Try again?";

  return errorMessage;
};

const getWalletError = (error, setError) => {
  const errDisplay = walletErrorMap[error.message];
  if (!errDisplay) errDisplay = "Something went wrong. Please try again.";
  return errDisplay;
};

const handleTxnError = (err) => {
  console.log(err);
  const errCode = err.code;
  console.log(errCode);
  console.log(err.replacement);

  // if we changed the txn, send through the new one
  if (errCode === "TRANSACTION_REPLACED") {
    return err.replacement;
  } else {
    throw err;
  }
};

export { GetErrorMsg, getWalletError, handleTxnError };
