// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.9;

interface ITrocaInterface {
    enum OfferStatus {
        Unset,
        Available,
        Paused,
        Canceled
    }

    enum BidStatus {
        Unset,
        Active,
        Canceled
    }

    enum OrderStatus {
        Unset,
        Created,
        Progress,
        Completed,
        Disputed
    }

    enum DisputeResolution {
        Unspecified,
        Complete,
        Return
    }

    struct Item {
        bool chargeNonDispute;
        bool hasExternalItem;
        address disputeHandler;
        address disputeHandlerToken;
        address disputeHandlerFeeReceiver;
        address disputeHandlerFeeAmount;
        bytes itemData;
        bytes disputeHandlerProof;
    }

    struct Offer {
        uint256 id;
        uint8 status;
        address creator;
        address token;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 totalAmount;
        uint256 availableAmount;
        uint256 orderProcessingTime;
        Item item;
    }

    struct Bid {
        uint256 id;
        uint256 offerId;
        uint8 status;
        address creator;
        uint256 offerTokenAmount;
        address token;
        uint256 tokenAmount;
        uint256 processingTime;
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
        uint8 status;
        address creator;
        address bidder;
        OrderData creatorOrderData;
        OrderData bidderOrderData;
    }

    struct Dispute {
        uint256 orderId;
        address handler;
        uint8 resolution;
        bytes initData;
    }

    function createOffer() external;

    function cancelOffer() external;

    function placeBid() external;

    function acceptBid() external;

    function cancelBid() external;

    function declarePaid() external;

    function declareReceived() external;

    function initiateDispute() external;

    function resolveDispute(DisputeResolution resolution) external;
}
