// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

interface MarvosInterface {
    /**
     * @dev The status of an offer. An offer must never be in the unset state.
     * An offer can only receive or accept bids when it's active. The state of an offer has no
     * effect on existing orders - only on new orders. A paused offer can be made active again.
     * A canceled offer cannot be made active as all available funds locked for the offer must have
     * been refunded at the time of cancellation.
     */
    enum OfferStatus {
        Unset,
        Active,
        Paused,
        Canceled
    }

    /**
     * @dev The status of a bid. Anyone can place a bid on an offer - it is up to the offer creator to determine
     * which bid to accept. The status of a bid must never be unset. A bid is active upon creation and becomes accepted
     * when the offer creator accepts the bid and the order is created. A bid can be canceled at any time as long
     * as it has not been accepted. Accepted bids cannot be canceled. But the associated order can be canceled if the
     * order does not get processed within the time limit.
     */
    enum BidStatus {
        Unset,
        Active,
        Accepted,
        Canceled
    }

    /**
     * @dev The status of an order. An order is active upon creation. An order becomes completed when the terms of the
     * order are fulfilled - off-chain items are exchanged successfully. All tokens become released to the counterparty
     * when the order is fulfilled. An order can only be completed by the parties involved except when it is disputed.
     * In that case, the dispute handler has the right to cancel the order or complete it - based on reviewed evidence
     * collected off-chain.
     */
    enum OrderStatus {
        Unset,
        Active,
        Completed,
        Disputed,
        Canceled
    }

    /**
     * @dev The resolution for a dispute. A dispute is unresolved upon creation. The resolution determines whether the
     * order gets completed or canceled. No one except the dispute handler has the right to declare a dispute resolved.
     * However, disputed orders can still be completed normally if the off-chain items are declared received. Disputed
     * orders may trigger an additional charge on tokens depending on the dispute handler item specification for the
     * offer or bid.
     */
    enum DisputeResolution {
        Unresolved,
        Complete,
        Cancel
    }

    /**
     * @dev All refunds/order completions and fees are paid using a balance mechanism held in the contract. The balance
     * can be withdrawn on demand or re-used for orders. This enum specifies the reason behind any balance credit and is
     * only used in events.
     */
    enum BalanceCreditReason {
        OrderCompletion,
        OrderCancellation,
        OfferCancellation,
        BidCancellation,
        ProtocolFees,
        DisputeHandlerFees
    }

    /**
     * @dev All errors generated from the contract - except for errors generated from contract libraries or extended
     * parent contracts - are specified using the ErrorReason enum. The names of the enum fields are indicative of the
     * error reason.
     */
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

    /**
     * @dev The item struct is used to hold information about the dispute handler, the demands for an offer, and details
     * of any off-chain items supplied.
     */
    struct Item {
        /**
         * @dev Used to specify whether the order should be charged the disputeHandlerFeePercentage even when the order
         * is not disputed.
         */
        bool chargeNonDispute;
        /**
         * @dev Used to specify whether the offer or bid includes an external item being supplied. An offer/bid without
         * tokens must have external item(s).
         */
        bool hasExternalItem;
        /**
         * @dev The amount of associated tokens the dispute handler is charging for their services as dispute handler.
         * A value of 1 represents 0.01%. A value of 10000 represents 100%. The value must be less than the defined
         * maxDisputeHandlerFeePercentage at the time of the order creation / bid creation.
         */
        uint16 disputeHandlerFeePercentage;
        /**
         * @dev The address of the dispute handler. The dispute handler for a bid must match the dispute handler for the
         * associated offer. The dispute handler is a very important entity for securing the network. A dispute handler
         * is responsible for resolving disputes between offers and must sign on any offer or bid before it can be
         * accepted by the protocol. Anyone can be a dispute handler, and there's no pre-registration necessary.
         * However, the credibility of the dispute handler based on on-chain data on order processing should be
         * important in determining whether users trust a dispute handler with their orders.
         */
        address disputeHandler;
        /**
         * @dev The address of the receiver for dispute handler fees.
         */
        address disputeHandlerFeeReceiver;
        /**
         * @dev The URI to the item data. This should be an IPFS URI to the associated item data specifying any external
         * items being supplied according to the External Data Spec.
         */
        bytes itemData;
        /**
         * @dev The signature of the dispute handler on the offer or bid validating that the dispute handler guarantees
         * they can provide the necessary support to get the order to completion.
         */
        bytes disputeHandlerProof;
    }

    /**
     * @dev The Offer struct specifies properties of an offer in the marketplace.
     */
    struct Offer {
        /**
         * @dev The offer id must be specified on creation. It can be any random 32-bytes integer.
         */
        uint256 id;
        /**
         * @dev The offer status must be Active on creation. See the documentation on OfferStatus.
         */
        OfferStatus status;
        /**
         * @dev The creator of the offer. Must match the user calling createOffer.
         */
        address creator;
        /**
         * @dev The token being supplied in this offer. Must be the zero address if no token is being supplied.
         * The supplied token must not be blacklisted at the time of creation.
         */
        address token;
        /**
         * @dev The minimum amount of token that a bid can buy. Must be zero if no token is being supplied.
         */
        uint256 minAmount;
        /**
         * @dev The maximum amount of token that a bid can buy. Must be zero if no token is being supplied.
         */
        uint256 maxAmount;
        /**
         * @dev The total amount of token being supplied in the offer. Must be zero if no token is being supplied.
         */
        uint256 totalAmount;
        /**
         * @dev The amount of token that is available for orders. Must be equal to totalAmount on creation.
         */
        uint256 availableAmount;
        /**
         * @dev The amount of time required for an order to be processed. After orders are accepted, they must be
         * processed within the orderProcessingTime. When the time elapses, the order can be canceled.
         */
        uint32 orderProcessingTime;
        /**
         * @dev The associated item for the offer.
         */
        Item item;
    }

    /**
     * @dev The bid struct specifies the properties of a bid on an offer in the marketplace.
     */
    struct Bid {
        /**
         * @dev The bid id must be specified on creation. It can be any random 32-bytes integer.
         */
        uint256 id;
        /**
         * @dev The id of the offer being bid on. The offer must exist and must be Active to be bid on.
         */
        uint256 offerId;
        /**
         * @dev The status of the bid. See the documentation of BidStatus.
         */
        BidStatus status;
        /**
         * @dev The address of the bid creator. Must match the user calling placeBid.
         */
        address creator;
        /**
         * @dev The amount of offer.token being bought in this bid. The value must be between the
         * minAmount and maxAmount of the offer.
         */
        uint256 offerTokenAmount;
        /**
         * @dev The token being supplied. Must be the zero address if no token is being supplied. The token must not
         * be a blacklisted token.
         */
        address token;
        /**
         * @dev The amount of token being supplied. Must be zero if no token is being supplied.
         */
        uint256 tokenAmount;
        /**
         * @dev The processing time of the order. The effective processing time is the maximum of the offer and bid.
         */
        uint32 processingTime;
        /**
         * @dev The associated item for the bid.
         */
        Item item;
    }

    /**
     * @dev OrderData holds the data for one side of the order. Specifies the token being released, processing status,
     * and off-chain item data.
     */
    struct OrderData {
        /**
         * @dev Used to specify whether the off-chain item being supplied has been paid.
         */
        bool paid;
        /**
         * @dev Used to specify whether the off-chain item being demanded has been received.
         */
        bool receivedOffChainItem;
        /**
         * @dev The token being supplied.
         */
        address token;
        /**
         * @dev The amount of the token being supplied.
         */
        uint256 tokenAmount;
        /**
         * @dev Off-chain item data for this side of the order.
         */
        Item item;
    }

    /**
     * @dev The primary order struct. Bid acceptance triggers order creation.
     */
    struct Order {
        /**
         * @dev The order id is the bid id.
         */
        uint256 id;
        /**
         * @dev The status of the order. See the documentation for OrderStatus.
         */
        OrderStatus status;
        /**
         * @dev The effective processingTime for the order.
         */
        uint32 processingTime;
        /**
         * @dev The creator of the offer that triggered the order.
         */
        address creator;
        /**
         * @dev The creator of the bid that triggered the order.
         */
        address bidder;
        /**
         * @dev The OrderData holding the creator side of the order data.
         */
        OrderData creatorOrderData;
        /**
         * @dev The OrderData holding the bidder side of the order data.
         */
        OrderData bidderOrderData;
        /**
         * @dev The timestamp of the block in which the order was created.
         */
        uint256 creationTime;
    }

    /**
     * @dev Used to hold information about a dispute.
     */
    struct Dispute {
        /**
         * @dev The id of the disputed order.
         */
        uint256 orderId;
        /**
         * @dev The address of the dispute handler.
         */
        address handler;
        /**
         * @dev The dispute resolution.
         */
        DisputeResolution resolution;
        /**
         * @dev URI of the Dispute Initialization Data as specified by the External Data Spec.
         */
        bytes initData;
    }

    /**
     * @dev Standard error type in the contract. Every error type not originating from libraries is encoded as an error reason.
     */
    error StandardError(ErrorReason reason);

    /**
     * @dev Emitted when an offer is created.
     */
    event OfferCreated(uint256 indexed id, address indexed token, address indexed creator);

    /**
     * @dev Emitted when the status of an offer is modified.
     */
    event OfferStatusChanged(uint256 indexed id, OfferStatus indexed status);

    /**
     * @dev Emitted when a bid is placed on an offer.
     */
    event BidPlaced(uint256 indexed id, uint256 indexed offerId, address indexed creator);

    /**
     * @dev Emitted when the status of a bid changes.
     */
    event BidStatusChanged(uint256 indexed id, BidStatus indexed status);

    /**
     * @dev Emitted when an order is created.
     */
    event OrderCreated(uint256 indexed offerId, uint256 indexed bidId, address indexed disputeHandler);

    /**
     * @dev Emitted when the status of an order changes. The OrderStatus combined with the paid and received fields
     * of both OrderData provide the full information of the order status.
     */
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus indexed status);

    /**
     * @dev Emitted when an order is disputed.
     */
    event DisputeInitiated(uint256 indexed orderId, address indexed initiator);

    /**
     * @dev Emitted when a dispute is resolved.
     */
    event DisputeResolved(uint256 indexed orderId, address indexed resolver, DisputeResolution indexed resolution);

    /**
     * @dev Emitted whenever a user's token balance is credited.
     */
    event BalanceCredited(
        address indexed owner,
        address indexed token,
        BalanceCreditReason indexed reason,
        uint256 amount,
        uint256 balance
    );

    /**
     * @dev Emitted when a user withdraws their token balance outside the contract.
     */
    event BalanceWithdrawn(address indexed owner, address indexed token, uint256 amount, uint256 balance);

    /**
     * @dev Emitted when the protocol fee percentage is updated.
     */
    event ProtocolFeePercentageUpdated(uint16 value);

    /**
     * @dev Emitted when the protocol commission on the dispute handler's fee is updated.
     */
    event DisputeHandlerFeePercentageCommissionUpdated(uint16 value);

    /**
     * @dev Emitted when the maximum dispute handler fee is updated.
     */
    event MaxDisputeHandlerFeePercentageUpdated(uint16 value);

    /**
     * @dev Emitted when a token is blacklisted or removed from the blacklist.
     */
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
     * @notice Withdraw any tokens from your marvos balance. Your balance gets funded when you cancel orders or bids.
     * You can re-use your balance when creating an offer or bidding on an offer. If your balance is insufficient,
     * your balance will be used up and the remaining amount will be charged to your token balance.
     */
    function withdrawTokens(address from, address tokenAddress, uint256 amount) external payable;
}
