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

    function createOffer(Offer calldata offer, bool useBalance) external payable;

    function updateOfferStatus(uint256 offerId, OfferStatus status) external;

    function placeBid(Bid calldata bid, bool useBalance) external payable;

    function acceptBid(uint256 bidId) external;

    function cancelBid(uint256 bidId) external;

    function cancelOrder(uint256 orderId) external;

    function declareOffChainItemPaid(uint256 orderId) external;

    function declareOffChainItemReceived(uint256 orderId) external;

    function initiateDispute(uint256 orderId, bytes calldata initData) external;

    function resolveDispute(uint256 orderId, DisputeResolution resolution) external;

    function withdrawTokens(address from, address tokenAddress, uint256 amount) external payable;
}
