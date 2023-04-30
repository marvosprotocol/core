// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

import "./MarvosBase.sol";

/// @custom:security-contact security@marvos.org
contract Marvos is MarvosBase {
    function createOffer(Offer calldata offer, bool useBalance) external payable whenNotPaused {
        checkOfferValidForCreation(offer);
        usedIds[offer.id] = true;
        offers[offer.id] = offer;
        emit OfferCreated(offer.id, offer.token, offer.creator);

        if (offer.token != address(0)) {
            transferTokensToContract(offer.creator, offer.token, offer.totalAmount, useBalance);
        }
    }

    function placeBid(Bid calldata bid, bool useBalance) external payable whenNotPaused {
        checkBidValidForCreation(bid);
        usedIds[bid.id] = true;
        bids[bid.id] = bid;
        emit BidPlaced(bid.id, bid.offerId, bid.creator);

        if (bid.token != address(0)) {
            transferTokensToContract(bid.creator, bid.token, bid.tokenAmount, useBalance);
        }
    }

    function acceptBid(uint256 bidId) external whenNotPaused {
        Bid storage bid = bids[bidId];
        ensure(bid.status == BidStatus.Active, ErrorReason.BidCanceled);

        Offer storage offer = offers[bid.offerId];
        ensureSenderAddress(offer.creator);
        ensure(offer.status == OfferStatus.Active, ErrorReason.OfferInactive);

        // lock the amount for the order
        ensure(offer.availableAmount >= bid.offerTokenAmount, ErrorReason.AmountInvalid);
        offer.availableAmount -= bid.offerTokenAmount;
        bid.status = BidStatus.Accepted;
        emit BidStatusChanged(bidId, BidStatus.Accepted);

        uint32 processingTime = bid.processingTime > offer.orderProcessingTime
            ? bid.processingTime
            : offer.orderProcessingTime;

        // if there's no external item defined in the offer, then the offer is only paying the specified token
        orders[bid.id] = Order(
            bid.id,
            OrderStatus.Active,
            processingTime,
            offer.creator,
            bid.creator,
            OrderData(
                !offer.item.hasExternalItem,
                !bid.item.hasExternalItem,
                offer.token,
                bid.offerTokenAmount,
                offer.item
            ),
            OrderData(!bid.item.hasExternalItem, !offer.item.hasExternalItem, bid.token, bid.tokenAmount, bid.item),
            block.timestamp
        );
        emit OrderCreated(offer.id, bid.id, offer.item.disputeHandler);

        // if there are no external items, the order will be completed here
        tryCompleteOrder(orders[bid.id]);
    }

    function updateOfferStatus(uint256 offerId, OfferStatus status) external whenNotPaused {
        ensure(status != OfferStatus.Unset, ErrorReason.OfferStatusInvalid);

        Offer storage offer = offers[offerId];
        ensureSenderAddress(offer.creator);

        // if an offer is already canceled, the status cannot be changed
        ensure(offer.status != OfferStatus.Canceled, ErrorReason.OfferInactive);

        offer.status = status;
        emit OfferStatusChanged(offerId, status);

        if (status != OfferStatus.Canceled) {
            return;
        }

        uint256 availableAmount = offer.availableAmount;
        offer.availableAmount = 0;
        if (offer.token != address(0)) {
            creditTokenBalance(offer.creator, offer.token, availableAmount, BalanceCreditReason.OfferCancellation);
        }
    }

    function cancelBid(uint256 bidId) external whenNotPaused {
        Bid storage bid = bids[bidId];
        ensureSenderAddress(bid.creator);

        ensure(bid.status == BidStatus.Active, ErrorReason.BidStatusInvalid);

        bid.status = BidStatus.Canceled;
        emit BidStatusChanged(bidId, BidStatus.Canceled);

        if (bid.token != address(0)) {
            creditTokenBalance(bid.creator, bid.token, bid.tokenAmount, BalanceCreditReason.BidCancellation);
        }
    }

    function declareOffChainItemPaid(uint256 orderId) external whenNotPaused {
        Order storage order = orders[orderId];
        ensure(order.status == OrderStatus.Active || order.status == OrderStatus.Disputed, ErrorReason.OrderInactive);
        ensure(_msgSender() == order.creator || _msgSender() == order.bidder, ErrorReason.Unauthorized);

        bool isCreator = _msgSender() == order.creator;
        OrderData storage orderData = isCreator ? order.creatorOrderData : order.bidderOrderData;
        orderData.paid = true;

        emit OrderStatusChanged(order.id, order.status);
    }

    function declareOffChainItemReceived(uint256 orderId) external whenNotPaused {
        Order storage order = orders[orderId];
        ensure(order.status == OrderStatus.Active || order.status == OrderStatus.Disputed, ErrorReason.OrderInactive);
        ensure(_msgSender() == order.creator || _msgSender() == order.bidder, ErrorReason.Unauthorized);

        bool isCreator = _msgSender() == order.creator;
        OrderData storage orderData = isCreator ? order.creatorOrderData : order.bidderOrderData;

        ensure(isCreator ? order.bidderOrderData.paid : order.creatorOrderData.paid, ErrorReason.ExternalItemNotPaid);
        orderData.receivedOffChainItem = true;

        emit OrderStatusChanged(order.id, order.status);

        // if there are no more pending items, the order will be completed here
        tryCompleteOrder(order);
    }

    function cancelOrder(uint256 orderId) external whenNotPaused {
        Order storage order = orders[orderId];
        ensure(order.status == OrderStatus.Active, ErrorReason.OrderInactive);
        ensure(_msgSender() == order.creator || _msgSender() == order.bidder, ErrorReason.Unauthorized);
        ensure(block.timestamp > order.processingTime + order.creationTime, ErrorReason.ProcessingTimeNotElapsed);
        if (order.creatorOrderData.item.hasExternalItem) {
            ensure(!order.creatorOrderData.paid, ErrorReason.OrderAlreadyProcessing);
        }
        if (order.bidderOrderData.item.hasExternalItem) {
            ensure(!order.bidderOrderData.paid, ErrorReason.OrderAlreadyProcessing);
        }

        order.status = OrderStatus.Canceled;
        emit OrderStatusChanged(order.id, OrderStatus.Canceled);
        executeFundReturn(order);
    }

    function initiateDispute(uint256 orderId, bytes calldata initData) external whenNotPaused {
        Order storage order = orders[orderId];
        ensure(order.status == OrderStatus.Active, ErrorReason.OrderInactive);
        ensure(_msgSender() == order.creator || _msgSender() == order.bidder, ErrorReason.Unauthorized);
        ensure(block.timestamp > order.processingTime + order.creationTime, ErrorReason.ProcessingTimeNotElapsed);
        ensure(
            (order.creatorOrderData.item.hasExternalItem && order.creatorOrderData.paid) ||
                (order.bidderOrderData.item.hasExternalItem && order.bidderOrderData.paid),
            ErrorReason.ExternalItemNotPaid
        );

        disputes[orderId] = Dispute(
            orderId,
            order.creatorOrderData.item.disputeHandler,
            DisputeResolution.Unresolved,
            initData
        );
        order.status = OrderStatus.Disputed;
        emit OrderStatusChanged(order.id, OrderStatus.Disputed);
        emit DisputeInitiated(orderId, _msgSender());
    }

    function resolveDispute(uint256 orderId, DisputeResolution resolution) external whenNotPaused {
        Order storage order = orders[orderId];
        ensure(order.status == OrderStatus.Disputed, ErrorReason.OrderInactive);
        ensureSenderAddress(disputes[orderId].handler);

        disputes[orderId].resolution = resolution;
        if (resolution == DisputeResolution.Cancel) {
            order.status = OrderStatus.Canceled;
            emit OrderStatusChanged(order.id, OrderStatus.Canceled);
            executeFundReturn(order);
        } else if (resolution == DisputeResolution.Complete) {
            order.creatorOrderData.paid = true;
            order.creatorOrderData.receivedOffChainItem = true;
            order.bidderOrderData.paid = true;
            order.bidderOrderData.receivedOffChainItem = true;
            tryCompleteOrder(order);
        }
    }
}
