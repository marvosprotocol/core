// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

interface ITrocaInterface {
    enum OfferStatus {
        Unset,
        Active,
        Paused,
        Canceled
    }

    enum BidStatus {
        Unset,
        Active,
        Accepted,
        Canceled
    }

    enum OrderStatus {
        Unset,
        Active,
        Completed,
        Disputed,
        Canceled
    }

    enum DisputeResolution {
        Unresolved,
        Complete,
        Cancel
    }

    enum BalanceCreditReason {
        OrderCompletion,
        OrderCancellation,
        OfferCancellation,
        BidCancellation,
        ProtocolFees,
        DisputeHandlerFees
    }

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

    struct Item {
        bool chargeNonDispute;
        bool hasExternalItem;
        uint16 disputeHandlerFeePercentage;
        address disputeHandler;
        address disputeHandlerFeeReceiver;
        bytes itemData;
        bytes disputeHandlerProof;
    }

    struct Offer {
        uint256 id;
        OfferStatus status;
        address creator;
        address token;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 totalAmount;
        uint256 availableAmount;
        uint32 orderProcessingTime;
        Item item;
    }

    struct Bid {
        uint256 id;
        uint256 offerId;
        BidStatus status;
        address creator;
        uint256 offerTokenAmount;
        address token;
        uint256 tokenAmount;
        uint32 processingTime;
        Item item;
    }

    struct OrderData {
        bool paid;
        bool receivedOffChainItem;
        address token;
        uint256 tokenAmount;
        Item item;
    }

    struct Order {
        uint256 id;
        OrderStatus status;
        uint32 processingTime;
        address creator;
        address bidder;
        OrderData creatorOrderData;
        OrderData bidderOrderData;
        uint256 creationTime;
    }

    struct Dispute {
        uint256 orderId;
        address handler;
        DisputeResolution resolution;
        bytes initData;
    }

    /**
     * @dev Standard error type in the contract. Every error type not originating from libraries is encoded as an error reason.
     */
    error StandardError(ErrorReason reason);

    event OfferCreated(uint256 indexed id, address indexed token, address indexed creator);
    event OfferStatusChanged(uint256 indexed id, OfferStatus indexed status);
    event BidPlaced(uint256 indexed id, uint256 indexed offerId, address indexed creator);
    event BidStatusChanged(uint256 indexed id, BidStatus indexed status);
    event OrderCreated(uint256 indexed offerId, uint256 indexed bidId, address indexed disputeHandler);
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus indexed status);
    event DisputeInitiated(uint256 indexed orderId, address indexed initiator);
    event DisputeResolved(uint256 indexed orderId, address indexed resolver, DisputeResolution indexed resolution);
    event BalanceCredited(
        address indexed owner,
        address indexed token,
        BalanceCreditReason indexed reason,
        uint256 amount,
        uint256 balance
    );
    event BalanceWithdrawn(address indexed owner, address indexed token, uint256 amount, uint256 balance);
    event ProtocolFeePercentageUpdated(uint16 value);
    event DisputeHandlerFeePercentageCommissionUpdated(uint16 value);
    event MaxDisputeHandlerFeePercentageUpdated(uint16 value);
    event TokenBlacklistStatusUpdated(address indexed token, address indexed updatedBy, bool blacklisted);

    /**
     * @notice Create an offer saying what you want and what you're paying.
     * Your tokens will be held by the contract so that orders can be processed smoothly.
     * You can cancel your offer to get your tokens back anytime you wish.
     * Any tokens that have been locked for orders will not be returned unless the order gets canceled.
     *
     * @dev The offer ID can be any randomly generated 32-bytes integer that has not been used.
     * The offer must be signed by the dispute manager (escrow) in charge of handling disputes
     * should any arise.
     */
    function createOffer(Offer calldata offer, bool useBalance) external payable;

    /**
     * @notice Pause or cancel an offer. Cancellations is non-reversible.
     * Pausing an offer prevents bids from being placed on it until it is unpaused.
     * Canceling an offer refunds locked available tokens in the offer and prevents bids from being placed
     */
    function updateOfferStatus(uint256 offerId, OfferStatus status) external;

    /**
     * @notice Place a bid on an existing offer. Your tokens will be held by the contract in case your bid is accepted.
     * You can cancel your bid to get your tokens back if it doesn't get accepted. Your bid must be vetted by the same
     * escrow that vet the offer.
     *
     * @dev Place a compatible bid on an offer. To be compatible, a bid must be signed by the same
     * dispute manager as the offer.
     * The bid ID can be any randomly generated 32-bytes integer that has not been used.
     * The bid must be signed by the dispute manager (escrow) in charge of handling disputes
     * should any arise.
     */
    function placeBid(Bid calldata bid, bool useBalance) external payable;

    /**
     * @notice Accept a bid to proceed to process the transaction.
     *
     * @dev An order is created when a bid is accepted. At this point, the available token amount on the offer
     * gets depleted to ensure the amount stays locked for the order - enabling safe and easy cancellations for
     * partially-filled orders. If there are no external items, the exchange is automatically completed here.
     */
    function acceptBid(uint256 bidId) external;

    /**
     * @notice Cancel a bid if it has not been accepted.
     * This allows you to get back any token that has been locked for the bid.
     */
    function cancelBid(uint256 bidId) external;

    /**
     * @notice Cancel an order if the other user fails to process it within the time limit.
     * This allows you to get back any token that has been locked for the order. You cannot
     * cancel an order if you or the other user has started the process off-chain. You should initiate
     * a dispute instead.
     */
    function cancelOrder(uint256 orderId) external;

    /**
     * @notice Let the protocol know that you've started the off-chain process.
     * This is important to enable the transaction to complete naturally and prevent a scammer from canceling
     * after you have already paid.
     */
    function declareOffChainItemPaid(uint256 orderId) external;

    /**
     * @notice Let the protocol know that you've received the item off-chain.
     * This is important to enable the transaction to complete naturally.
     */
    function declareOffChainItemReceived(uint256 orderId) external;

    /**
     * @notice If the processing time has elapsed and you've started the process but
     * the other user fails to confirm that they have received the items, then it is
     * time to initiate a dispute. This would enable the dispute handler to come in and
     * finalize the transaction based on evidence collected. You would need to provide
     * some proof to initiate a dispute.
     */
    function initiateDispute(uint256 orderId, bytes calldata initData) external;

    /**
     * @notice This can only be called by the dispute handler. After all evidence has been reviewed,
     * determine what action to take: cancellation or completion.
     */
    function resolveDispute(uint256 orderId, DisputeResolution resolution) external;

    /**
     * @notice Withdraw any tokens from your itroca balance. Your balance gets funded when you cancel orders or bids.
     * You can re-use your balance when creating an offer or bidding on an offer. If your balance is insufficient,
     * your balance will be used up and the remaining amount will be charged to your token balance.
     */
    function withdrawTokens(address from, address tokenAddress, uint256 amount) external payable;
}
