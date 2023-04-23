# Solidity API

## Marvos

### createOffer

```solidity
function createOffer(struct MarvosInterface.Offer offer, bool useBalance) external payable
```

Create an offer saying what you want and what you're paying.
Your tokens will be held by the contract so that orders can be processed smoothly.
You can cancel your offer to get your tokens back anytime you wish.
Any tokens that have been locked for orders will not be returned unless the order gets canceled.

_The offer ID can be any randomly generated 32-bytes integer that has not been used.
The offer must be signed by the dispute manager (escrow) in charge of handling disputes
should any arise._

### placeBid

```solidity
function placeBid(struct MarvosInterface.Bid bid, bool useBalance) external payable
```

Place a bid on an existing offer. Your tokens will be held by the contract in case your bid is accepted.
You can cancel your bid to get your tokens back if it doesn't get accepted. Your bid must be vetted by the same
escrow that vet the offer.

_Place a compatible bid on an offer. To be compatible, a bid must be signed by the same
dispute manager as the offer.
The bid ID can be any randomly generated 32-bytes integer that has not been used.
The bid must be signed by the dispute manager (escrow) in charge of handling disputes
should any arise._

### acceptBid

```solidity
function acceptBid(uint256 bidId) external
```

Accept a bid to proceed to process the transaction.

_An order is created when a bid is accepted. At this point, the available token amount on the offer
gets depleted to ensure the amount stays locked for the order - enabling safe and easy cancellations for
partially-filled orders. If there are no external items, the exchange is automatically completed here._

### updateOfferStatus

```solidity
function updateOfferStatus(uint256 offerId, enum MarvosInterface.OfferStatus status) external
```

Pause or cancel an offer. Cancellations is non-reversible.
Pausing an offer prevents bids from being placed on it until it is unpaused.
Canceling an offer refunds locked available tokens in the offer and prevents bids from being placed

### cancelBid

```solidity
function cancelBid(uint256 bidId) external
```

Cancel a bid if it has not been accepted.
This allows you to get back any token that has been locked for the bid.

### declareOffChainItemPaid

```solidity
function declareOffChainItemPaid(uint256 orderId) external
```

Let the protocol know that you've started the off-chain process.
This is important to enable the transaction to complete naturally and prevent a scammer from canceling
after you have already paid.

### declareOffChainItemReceived

```solidity
function declareOffChainItemReceived(uint256 orderId) external
```

Let the protocol know that you've received the item off-chain.
This is important to enable the transaction to complete naturally.

### cancelOrder

```solidity
function cancelOrder(uint256 orderId) external
```

Cancel an order if the other user fails to process it within the time limit.
This allows you to get back any token that has been locked for the order. You cannot
cancel an order if you or the other user has started the process off-chain. You should initiate
a dispute instead.

### initiateDispute

```solidity
function initiateDispute(uint256 orderId, bytes initData) external
```

If the processing time has elapsed and you've started the process but
the other user fails to confirm that they have received the items, then it is
time to initiate a dispute. This would enable the dispute handler to come in and
finalize the transaction based on evidence collected. You would need to provide
some proof to initiate a dispute.

### resolveDispute

```solidity
function resolveDispute(uint256 orderId, enum MarvosInterface.DisputeResolution resolution) external
```

This can only be called by the dispute handler. After all evidence has been reviewed,
determine what action to take: cancellation or completion.

## MarvosBase

### FEE_SCALE

```solidity
uint16 FEE_SCALE
```

_The fee scale. A single unit of a fee percentage specification represents a (1 / FEE_SCALE) multiplier._

### MAXIMUM_ORDER_PROCESSING_TIME

```solidity
uint32 MAXIMUM_ORDER_PROCESSING_TIME
```

_The maximum order processing time that can be specified. Some items may take longer to process, therefore
the item should be declared paid at the time of payment and not at the time of final settlement. The item should
be declared received at the time of irreversible confirmation of receipt - whether into an escrow account or a
personal account._

### TREASURY_ADDRESS

```solidity
address TREASURY_ADDRESS
```

_Placeholder for the address of the treasury. Used to hold protocol fees_

### COIN_ADDRESS

```solidity
address COIN_ADDRESS
```

_Placeholder for the address of the native cryptocurrency of the blockchain the contract is running on._

### usedIds

```solidity
mapping(uint256 => bool) usedIds
```

_The IDs that are no longer available for use in offers and bids._

### offers

```solidity
mapping(uint256 => struct MarvosInterface.Offer) offers
```

_A mapping of an offerId to the offer data._

### bids

```solidity
mapping(uint256 => struct MarvosInterface.Bid) bids
```

_A mapping of a bidId to the bid data._

### orders

```solidity
mapping(uint256 => struct MarvosInterface.Order) orders
```

_A mapping of a orderId to the order data._

### disputes

```solidity
mapping(uint256 => struct MarvosInterface.Dispute) disputes
```

_A mapping of a disputeId to the dispute data._

### blacklistedTokens

```solidity
mapping(address => bool) blacklistedTokens
```

_A mapping of token to blacklist status._

### tokenBalances

```solidity
mapping(address => mapping(address => uint256)) tokenBalances
```

_A mapping of (user, token) to the user's balance for token._

### protocolFeePercentage

```solidity
uint16 protocolFeePercentage
```

_The percentage of tokens charged by the protocol as processing fees._

### disputeHandlerFeePercentageCommission

```solidity
uint16 disputeHandlerFeePercentageCommission
```

_The percentage of the dispute handler fee charged by the protocol as commission._

### maxDisputeHandlerFeePercentage

```solidity
uint16 maxDisputeHandlerFeePercentage
```

_The maximum fee that can be charged by the dispute handler._

### constructor

```solidity
constructor() internal
```

### initialize

```solidity
function initialize(uint16 protocolFees, uint16 escrowFeeCommission, uint16 maxEscrowFeePercentage) public
```

_initialize the contract. This call is made once by the proxy admin to
initialize the proxy. It is called at the point of proxy contract creation
and is encoded as the `_data` argument to the ERC1967Proxy-constructor._

### setProtocolFeePercentage

```solidity
function setProtocolFeePercentage(uint16 value) external
```

_set the protocol fee percentage. This can only be called by the `owner`._

### setDisputeHandlerFeePercentageCommission

```solidity
function setDisputeHandlerFeePercentageCommission(uint16 value) external
```

_set the dispute handler fee commission. This can only be called by the `owner`._

### setMaxDisputeHandlerFeePercentage

```solidity
function setMaxDisputeHandlerFeePercentage(uint16 value) external
```

_set the max dispute handler fee. This can only be called by the `owner`._

### setTokenBlacklisted

```solidity
function setTokenBlacklisted(address token, bool blacklisted) external
```

_Blacklist a token or remove it from the blacklist. This can only be called by the `owner`._

### withdrawTokens

```solidity
function withdrawTokens(address from, address tokenAddress, uint256 amount) external payable
```

_Withdraw amount tokens from the balance of the user. Only the `owner` can withdraw from the treasury.
All other withdrawals must be made by the owner of the tokens._

### generateHashForOffer

```solidity
function generateHashForOffer(struct MarvosInterface.Offer offer) public pure returns (bytes32)
```

_Utility function to generate the hash for an offer to be signed by the dispute handler._

### generateHashForBid

```solidity
function generateHashForBid(struct MarvosInterface.Bid bid) public pure returns (bytes32)
```

_Utility function to generate the hash for a bid to be signed by the dispute handler._

### pause

```solidity
function pause() public
```

_Pause the contract. This can only be called by `owner`._

### unpause

```solidity
function unpause() public
```

_Unpause the contract. This can only be called by `owner`._

### checkOfferValidForCreation

```solidity
function checkOfferValidForCreation(struct MarvosInterface.Offer offer) internal view
```

_Validate the properties of an offer for creation. All offer properties must be provided at creation
and must be valid according to these rules:

The caller to createOffer must be offer.creator
The offer id must be available.
The token must not be blacklisted.
The status must be active on creation.
The order must include an off-chain item or specify a token.
When a token is specified, the total amount and minimum amount must be non-zero.
When no token is specified, the total amount must be zero.
On creation, the available amount must be the same as the total amount.
The min amount must never be more than the max amount.
The max amount must never be more than the total amount.
The order processing time must be less than the maximum order processing time in the contract.
The offer item must be valid. See the documentation for ensureItemValid._

### checkBidValidForCreation

```solidity
function checkBidValidForCreation(struct MarvosInterface.Bid bid) internal view
```

_Validate the properties of a bid for creation. All bid properties must be provided at creation
and must be valid according to these rules:

The caller to placeBid must be bid.creator
The bid id must be available.
The offer must be active.
The token must not be blacklisted.
The status must be active on creation.
The bid must include an off-chain item or specify a token.
When a token is specified, the amount must be non-zero.
When no token is specified, the amount must be zero.
If the offer specifies a token, the bid must specify a token amount between the min and max amounts of the offer.
The dispute handler for the bid must match the dispute handler for the offer.
The order processing time must be less than the maximum order processing time in the contract.
The bid item must be valid. See the documentation for ensureItemValid._

### creditTokenBalance

```solidity
function creditTokenBalance(address owner, address token, uint256 amount, enum MarvosInterface.BalanceCreditReason reason) internal
```

_Credit a user's balance for the given token and log the reason.
The user must be a valid address and the token must not be blacklisted._

### transferTokensToContract

```solidity
function transferTokensToContract(address from, address tokenAddress, uint256 amount, bool useBalance) internal
```

_Transfer `amount` units of the token at `tokenAddress` from the `from` address to the contract
for a transaction. The transferred amount is not tracked in balance. Instead, it is locked into the offer
or bid that triggered the transfer. This method MUST not be called in any other transaction except calls to
createOffer and placeBid.

When the useBalance parameter is true, the contract tries to use the user's balance first and only transfers
the difference if the balance is less than the amount.
If the tokenAddress is the coin address placeholder, the transaction must have `value` equal to `amount` and
the caller must be the same as the `from` address._

### tryCompleteOrder

```solidity
function tryCompleteOrder(struct MarvosInterface.Order order) internal
```

_Checks if an order is declared satisfied by both parties and release any locked funds to the counterparties._

### executeFundReturn

```solidity
function executeFundReturn(struct MarvosInterface.Order order) internal
```

_Return locked funds to the balances as part of an order cancellation.
This must only be called when an order is being canceled - whether directly or as a result of a cancellation
resolution after a dispute._

### ensureSenderAddress

```solidity
function ensureSenderAddress(address permittedSender) internal view
```

_Ensure the sender address is the specified address._

### generateHashForItem

```solidity
function generateHashForItem(struct MarvosInterface.Item item) internal pure returns (bytes32)
```

_Generate the hash for the item._

### recoverSigner

```solidity
function recoverSigner(bytes32 hash, bytes message) internal pure returns (address)
```

_Recover the signer address from an eth_signMessage call_

### ensure

```solidity
function ensure(bool requirement, enum MarvosInterface.ErrorReason errorReason) internal pure
```

_Verifies the requirement and reverts if the requirement is not satisfied._

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address newImplementation) internal
```

_Ensure only the `owner` can authorize upgrades_

## MarvosInterface

### OfferStatus

```solidity
enum OfferStatus {
  Unset,
  Active,
  Paused,
  Canceled
}
```

### BidStatus

```solidity
enum BidStatus {
  Unset,
  Active,
  Accepted,
  Canceled
}
```

### OrderStatus

```solidity
enum OrderStatus {
  Unset,
  Active,
  Completed,
  Disputed,
  Canceled
}
```

### DisputeResolution

```solidity
enum DisputeResolution {
  Unresolved,
  Complete,
  Cancel
}
```

### BalanceCreditReason

```solidity
enum BalanceCreditReason {
  OrderCompletion,
  OrderCancellation,
  OfferCancellation,
  BidCancellation,
  ProtocolFees,
  DisputeHandlerFees
}
```

### ErrorReason

```solidity
enum ErrorReason {
  Generic,
  Unauthorized,
  IdTaken,
  TokenBlacklisted,
  OfferStatusInvalid,
  BidStatusInvalid,
  OrderStatusInvalid,
  AmountInvalid,
  TokenOrItemRequired,
  OfferNotFound,
  DisputeHandlerMismatch,
  OrderProcessingTimeInvalid,
  FeeTooHigh,
  ItemDataInvalid,
  AccountRequired,
  DisputeHandlerRequired,
  DisputeHandlerFeeReceiverRequired,
  SignatureInvalid,
  CoinDepositRejected,
  CoinWithdrawalFailed,
  InsufficientBalance,
  OrderInactive,
  OfferInactive,
  BidCanceled,
  BidAccepted,
  OrderAlreadyProcessing,
  ProcessingTimeNotElapsed,
  ExternalItemNotPaid
}
```

### Item

```solidity
struct Item {
  bool chargeNonDispute;
  bool hasExternalItem;
  uint16 disputeHandlerFeePercentage;
  address disputeHandler;
  address disputeHandlerFeeReceiver;
  bytes itemData;
  bytes disputeHandlerProof;
}
```

### Offer

```solidity
struct Offer {
  uint256 id;
  enum MarvosInterface.OfferStatus status;
  address creator;
  address token;
  uint256 minAmount;
  uint256 maxAmount;
  uint256 totalAmount;
  uint256 availableAmount;
  uint32 orderProcessingTime;
  struct MarvosInterface.Item item;
}
```

### Bid

```solidity
struct Bid {
  uint256 id;
  uint256 offerId;
  enum MarvosInterface.BidStatus status;
  address creator;
  uint256 offerTokenAmount;
  address token;
  uint256 tokenAmount;
  uint32 processingTime;
  struct MarvosInterface.Item item;
}
```

### OrderData

```solidity
struct OrderData {
  bool paid;
  bool receivedOffChainItem;
  address token;
  uint256 tokenAmount;
  struct MarvosInterface.Item item;
}
```

### Order

```solidity
struct Order {
  uint256 id;
  enum MarvosInterface.OrderStatus status;
  uint32 processingTime;
  address creator;
  address bidder;
  struct MarvosInterface.OrderData creatorOrderData;
  struct MarvosInterface.OrderData bidderOrderData;
  uint256 creationTime;
}
```

### Dispute

```solidity
struct Dispute {
  uint256 orderId;
  address handler;
  enum MarvosInterface.DisputeResolution resolution;
  bytes initData;
}
```

### StandardError

```solidity
error StandardError(enum MarvosInterface.ErrorReason reason)
```

_Standard error type in the contract. Every error type not originating from libraries is encoded as an error reason._

### OfferCreated

```solidity
event OfferCreated(uint256 id, address token, address creator)
```

_Emitted when an offer is created._

### OfferStatusChanged

```solidity
event OfferStatusChanged(uint256 id, enum MarvosInterface.OfferStatus status)
```

_Emitted when the status of an offer is modified._

### BidPlaced

```solidity
event BidPlaced(uint256 id, uint256 offerId, address creator)
```

_Emitted when a bid is placed on an offer._

### BidStatusChanged

```solidity
event BidStatusChanged(uint256 id, enum MarvosInterface.BidStatus status)
```

_Emitted when the status of a bid changes._

### OrderCreated

```solidity
event OrderCreated(uint256 offerId, uint256 bidId, address disputeHandler)
```

_Emitted when an order is created._

### OrderStatusChanged

```solidity
event OrderStatusChanged(uint256 orderId, enum MarvosInterface.OrderStatus status)
```

_Emitted when the status of an order changes. The OrderStatus combined with the paid and received fields
of both OrderData provide the full information of the order status._

### DisputeInitiated

```solidity
event DisputeInitiated(uint256 orderId, address initiator)
```

_Emitted when an order is disputed._

### DisputeResolved

```solidity
event DisputeResolved(uint256 orderId, address resolver, enum MarvosInterface.DisputeResolution resolution)
```

_Emitted when a dispute is resolved._

### BalanceCredited

```solidity
event BalanceCredited(address owner, address token, enum MarvosInterface.BalanceCreditReason reason, uint256 amount, uint256 balance)
```

_Emitted whenever a user's token balance is credited._

### BalanceWithdrawn

```solidity
event BalanceWithdrawn(address owner, address token, uint256 amount, uint256 balance)
```

_Emitted when a user withdraws their token balance outside the contract._

### ProtocolFeePercentageUpdated

```solidity
event ProtocolFeePercentageUpdated(uint16 value)
```

_Emitted when the protocol fee percentage is updated._

### DisputeHandlerFeePercentageCommissionUpdated

```solidity
event DisputeHandlerFeePercentageCommissionUpdated(uint16 value)
```

_Emitted when the protocol commission on the dispute handler's fee is updated._

### MaxDisputeHandlerFeePercentageUpdated

```solidity
event MaxDisputeHandlerFeePercentageUpdated(uint16 value)
```

_Emitted when the maximum dispute handler fee is updated._

### TokenBlacklistStatusUpdated

```solidity
event TokenBlacklistStatusUpdated(address token, address updatedBy, bool blacklisted)
```

_Emitted when a token is blacklisted or removed from the blacklist._

### createOffer

```solidity
function createOffer(struct MarvosInterface.Offer offer, bool useBalance) external payable
```

Create an offer saying what you want and what you're paying.
Your tokens will be held by the contract so that orders can be processed smoothly.
You can cancel your offer to get your tokens back anytime you wish.
Any tokens that have been locked for orders will not be returned unless the order gets canceled.

_The offer ID can be any randomly generated 32-bytes integer that has not been used.
The offer must be signed by the dispute manager (escrow) in charge of handling disputes
should any arise._

### updateOfferStatus

```solidity
function updateOfferStatus(uint256 offerId, enum MarvosInterface.OfferStatus status) external
```

Pause or cancel an offer. Cancellations is non-reversible.
Pausing an offer prevents bids from being placed on it until it is unpaused.
Canceling an offer refunds locked available tokens in the offer and prevents bids from being placed

### placeBid

```solidity
function placeBid(struct MarvosInterface.Bid bid, bool useBalance) external payable
```

Place a bid on an existing offer. Your tokens will be held by the contract in case your bid is accepted.
You can cancel your bid to get your tokens back if it doesn't get accepted. Your bid must be vetted by the same
escrow that vet the offer.

_Place a compatible bid on an offer. To be compatible, a bid must be signed by the same
dispute manager as the offer.
The bid ID can be any randomly generated 32-bytes integer that has not been used.
The bid must be signed by the dispute manager (escrow) in charge of handling disputes
should any arise._

### acceptBid

```solidity
function acceptBid(uint256 bidId) external
```

Accept a bid to proceed to process the transaction.

_An order is created when a bid is accepted. At this point, the available token amount on the offer
gets depleted to ensure the amount stays locked for the order - enabling safe and easy cancellations for
partially-filled orders. If there are no external items, the exchange is automatically completed here._

### cancelBid

```solidity
function cancelBid(uint256 bidId) external
```

Cancel a bid if it has not been accepted.
This allows you to get back any token that has been locked for the bid.

### cancelOrder

```solidity
function cancelOrder(uint256 orderId) external
```

Cancel an order if the other user fails to process it within the time limit.
This allows you to get back any token that has been locked for the order. You cannot
cancel an order if you or the other user has started the process off-chain. You should initiate
a dispute instead.

### declareOffChainItemPaid

```solidity
function declareOffChainItemPaid(uint256 orderId) external
```

Let the protocol know that you've started the off-chain process.
This is important to enable the transaction to complete naturally and prevent a scammer from canceling
after you have already paid.

### declareOffChainItemReceived

```solidity
function declareOffChainItemReceived(uint256 orderId) external
```

Let the protocol know that you've received the item off-chain.
This is important to enable the transaction to complete naturally.

### initiateDispute

```solidity
function initiateDispute(uint256 orderId, bytes initData) external
```

If the processing time has elapsed and you've started the process but
the other user fails to confirm that they have received the items, then it is
time to initiate a dispute. This would enable the dispute handler to come in and
finalize the transaction based on evidence collected. You would need to provide
some proof to initiate a dispute.

### resolveDispute

```solidity
function resolveDispute(uint256 orderId, enum MarvosInterface.DisputeResolution resolution) external
```

This can only be called by the dispute handler. After all evidence has been reviewed,
determine what action to take: cancellation or completion.

### withdrawTokens

```solidity
function withdrawTokens(address from, address tokenAddress, uint256 amount) external payable
```

Withdraw any tokens from your marvos balance. Your balance gets funded when you cancel orders or bids.
You can re-use your balance when creating an offer or bidding on an offer. If your balance is insufficient,
your balance will be used up and the remaining amount will be charged to your token balance.
