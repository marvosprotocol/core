const enumKeys = [
  'Generic',
  'Unauthorized',
  'IdTaken',
  'TokenBlacklisted',
  'OfferStatusInvalid',
  'BidStatusInvalid',
  'OrderStatusInvalid',
  'AmountInvalid',
  'TokenOrItemRequired',
  'OfferNotFound',
  'DisputeHandlerMismatch',
  'OrderProcessingTimeInvalid',
  'FeeTooHigh',
  'ItemDataInvalid',
  'AccountRequired',
  'DisputeHandlerRequired',
  'DisputeHandlerFeeReceiverRequired',
  'SignatureInvalid',
  'CoinDepositRejected',
  'CoinWithdrawalFailed',
  'InsufficientBalance',
  'OrderInactive',
  'OfferInactive',
  'BidCanceled',
  'BidAccepted',
  'OrderAlreadyProcessing',
  'ProcessingTimeNotElapsed',
  'ExternalItemNotPaid',
] as const

const StandardError = enumKeys.reduce((prev, cur, i) => {
  prev[cur] = i
  return prev
}, {}) as Record<(typeof enumKeys)[number], number>

export { StandardError }
