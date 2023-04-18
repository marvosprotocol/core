// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./ITrocaInterface.sol";

/// @custom:security-contact ahmad@inferus.xyz
abstract contract ITrocaBase is
    Initializable,
    ContextUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ITrocaInterface
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using ECDSAUpgradeable for bytes32;

    uint16 public constant FEE_SCALE = 100_00;
    uint32 public constant MAXIMUM_ORDER_PROCESSING_TIME = 86400; // 1 day
    address public constant TREASURY_ADDRESS = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF; // treasury address
    address public constant COIN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // coin address

    mapping(uint256 => bool) public usedIds;
    mapping(uint256 => Offer) public offers;
    mapping(uint256 => Bid) public bids;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => bool) public blacklistedTokens;
    mapping(address => mapping(address => uint256)) public tokenBalances;
    uint16 public protocolFeePercentage; // expressed as (x% * 100). 100% is 10000. 0.01% is 1.
    uint16 public disputeHandlerFeePercentageCommission;
    uint16 public maxDisputeHandlerFeePercentage;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        uint16 protocolFees,
        uint16 escrowFeeCommission,
        uint16 maxEscrowFeePercentage
    ) public initializer {
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();

        protocolFeePercentage = protocolFees;
        disputeHandlerFeePercentageCommission = escrowFeeCommission;
        maxDisputeHandlerFeePercentage = maxEscrowFeePercentage;
    }

    function setProtocolFeePercentage(uint16 value) external onlyOwner {
        protocolFeePercentage = value;
        emit ProtocolFeePercentageUpdated(value);
    }

    function setDisputeHandlerFeePercentageCommission(uint16 value) external onlyOwner {
        disputeHandlerFeePercentageCommission = value;
        emit DisputeHandlerFeePercentageCommissionUpdated(value);
    }

    function setMaxDisputeHandlerFeePercentage(uint16 value) external onlyOwner {
        maxDisputeHandlerFeePercentage = value;
        emit MaxDisputeHandlerFeePercentageUpdated(value);
    }

    function setTokenBlacklisted(address token, bool blacklisted) external onlyOwner {
        blacklistedTokens[token] = blacklisted;
        emit TokenBlacklistStatusUpdated(token, msg.sender, blacklisted);
    }

    function withdrawTokens(address from, address tokenAddress, uint256 amount) external payable {
        if (from == TREASURY_ADDRESS) {
            _checkOwner();
        } else {
            ensureSenderAddress(from);
        }

        ensure(tokenBalances[from][tokenAddress] >= amount, ErrorReason.InsufficientBalance);
        tokenBalances[from][tokenAddress] -= amount;
        emit BalanceWithdrawn(from, tokenAddress, amount, tokenBalances[from][tokenAddress]);

        if (tokenAddress == COIN_ADDRESS) {
            (bool sent, ) = _msgSender().call{ value: amount }("");
            ensure(sent, ErrorReason.CoinWithdrawalFailed);
        } else {
            // token is ERC-20
            IERC20Upgradeable token = IERC20Upgradeable(tokenAddress);
            token.safeTransfer(_msgSender(), amount);
        }
    }

    function generateHashForOffer(ITrocaInterface.Offer calldata offer) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    offer.id,
                    offer.status,
                    offer.creator,
                    offer.token,
                    offer.minAmount,
                    offer.maxAmount,
                    offer.totalAmount,
                    offer.availableAmount,
                    offer.orderProcessingTime,
                    generateHashForItem(offer.item)
                )
            );
    }

    function generateHashForBid(ITrocaInterface.Bid calldata bid) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    bid.id,
                    bid.offerId,
                    bid.status,
                    bid.creator,
                    bid.offerTokenAmount,
                    bid.token,
                    bid.tokenAmount,
                    bid.processingTime,
                    generateHashForItem(bid.item)
                )
            );
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function checkOfferValidForCreation(Offer calldata offer) internal view {
        ensure(_msgSender() == offer.creator, ErrorReason.Unauthorized);
        ensure(offer.id > 0 && !usedIds[offer.id], ErrorReason.IdTaken);
        ensure(!blacklistedTokens[offer.token], ErrorReason.TokenBlacklisted);
        ensure(offer.status == OfferStatus.Active, ErrorReason.OfferStatusInvalid);
        if (offer.token != address(0)) {
            ensure(offer.totalAmount > 0, ErrorReason.AmountInvalid);
            ensure(offer.minAmount > 0, ErrorReason.AmountInvalid);
        } else {
            ensure(offer.totalAmount == 0, ErrorReason.AmountInvalid);
        }
        ensure(offer.availableAmount == offer.totalAmount, ErrorReason.AmountInvalid);
        ensure(offer.minAmount <= offer.maxAmount, ErrorReason.AmountInvalid);
        ensure(offer.maxAmount <= offer.totalAmount, ErrorReason.AmountInvalid);
        ensure(offer.orderProcessingTime < MAXIMUM_ORDER_PROCESSING_TIME, ErrorReason.OrderProcessingTimeInvalid);
        ensureItemValid(offer.item, generateHashForOffer(offer));
    }

    function checkBidValidForCreation(Bid calldata bid) internal view {
        ensure(_msgSender() == bid.creator, ErrorReason.Unauthorized);
        ensure(bid.id > 0 && !usedIds[bid.id], ErrorReason.IdTaken);
        ensure(!blacklistedTokens[bid.token], ErrorReason.TokenBlacklisted);
        ensure(bid.status == BidStatus.Active, ErrorReason.BidStatusInvalid);
        if (bid.token != address(0)) {
            ensure(bid.tokenAmount > 0, ErrorReason.AmountInvalid);
        } else {
            ensure(bid.tokenAmount == 0 && bid.item.hasExternalItem, ErrorReason.TokenOrItemRequired);
        }
        ensure(offers[bid.offerId].id == bid.offerId, ErrorReason.OfferNotFound);
        ensure(
            bid.offerTokenAmount >= offers[bid.offerId].minAmount &&
                bid.offerTokenAmount <= offers[bid.offerId].maxAmount,
            ErrorReason.AmountInvalid
        );
        ensure(bid.item.disputeHandler == offers[bid.offerId].item.disputeHandler, ErrorReason.DisputeHandlerMismatch);
        ensure(bid.processingTime < MAXIMUM_ORDER_PROCESSING_TIME, ErrorReason.OrderProcessingTimeInvalid);
        ensureItemValid(bid.item, generateHashForBid(bid));
    }

    function ensureItemValid(Item calldata item, bytes32 hash) private view {
        ensure(item.disputeHandler != address(0), ErrorReason.DisputeHandlerRequired);
        ensure(item.disputeHandlerFeeReceiver != address(0), ErrorReason.DisputeHandlerFeeReceiverRequired);
        ensure(item.itemData.length > 0, ErrorReason.ItemDataInvalid);
        ensure(item.disputeHandlerFeePercentage <= maxDisputeHandlerFeePercentage, ErrorReason.FeeTooHigh);
        ensure(recoverSigner(hash, item.disputeHandlerProof) == item.disputeHandler, ErrorReason.SignatureInvalid);
    }

    function creditTokenBalance(address owner, address token, uint256 amount, BalanceCreditReason reason) internal {
        ensure(token != address(0), ErrorReason.TokenBlacklisted);
        ensure(owner != address(0), ErrorReason.AccountRequired);
        tokenBalances[owner][token] += amount;
        emit BalanceCredited(owner, token, reason, amount, tokenBalances[owner][token]);
    }

    function transferTokensToContract(address from, address tokenAddress, uint256 amount, bool useBalance) internal {
        if (useBalance) {
            uint256 balance = tokenBalances[from][tokenAddress];
            if (amount > balance) {
                tokenBalances[from][tokenAddress] = 0;
                amount -= balance;
            } else {
                tokenBalances[from][tokenAddress] -= amount;
                return;
            }
        }

        if (tokenAddress == COIN_ADDRESS) {
            ensure(msg.value == amount && _msgSender() == from, ErrorReason.CoinDepositRejected);
            return;
        }

        // token is ERC-20
        IERC20Upgradeable token = IERC20Upgradeable(tokenAddress);
        token.safeTransferFrom(from, address(this), amount);
    }

    function tryCompleteOrder(Order storage order) internal {
        if (
            !order.creatorOrderData.paid ||
            !order.bidderOrderData.paid ||
            !order.creatorOrderData.receivedOffChainItem ||
            !order.bidderOrderData.receivedOffChainItem
        ) {
            return;
        }

        if (order.creatorOrderData.token != address(0)) {
            payRecipientAndChargeFees(order.bidder, order.status == OrderStatus.Disputed, order.creatorOrderData);
        }
        if (order.bidderOrderData.token != address(0)) {
            payRecipientAndChargeFees(order.creator, order.status == OrderStatus.Disputed, order.bidderOrderData);
        }
        order.status = OrderStatus.Completed;
        emit OrderStatusChanged(order.id, OrderStatus.Completed);
    }

    function executeFundReturn(Order memory order) internal {
        // return applicable funds
        if (order.creatorOrderData.token != address(0)) {
            creditTokenBalance(
                order.creator,
                order.creatorOrderData.token,
                order.creatorOrderData.tokenAmount,
                BalanceCreditReason.OrderCancellation
            );
        }

        if (order.bidderOrderData.token != address(0)) {
            creditTokenBalance(
                order.bidder,
                order.bidderOrderData.token,
                order.bidderOrderData.tokenAmount,
                BalanceCreditReason.OrderCancellation
            );
        }
    }

    function payRecipientAndChargeFees(address recipient, bool disputed, OrderData memory data) private {
        uint256 disputeHandlerFees = !disputed && !data.item.chargeNonDispute
            ? 0
            : (data.tokenAmount * data.item.disputeHandlerFeePercentage) / FEE_SCALE;
        uint256 protocolFees = (data.tokenAmount * protocolFeePercentage) +
            (disputeHandlerFeePercentageCommission * disputeHandlerFees) /
            FEE_SCALE;

        creditTokenBalance(TREASURY_ADDRESS, data.token, protocolFees, BalanceCreditReason.ProtocolFees);
        creditTokenBalance(
            data.item.disputeHandlerFeeReceiver,
            data.token,
            disputeHandlerFees,
            BalanceCreditReason.DisputeHandlerFees
        );
        creditTokenBalance(
            recipient,
            data.token,
            data.tokenAmount - disputeHandlerFees - protocolFees,
            BalanceCreditReason.OrderCompletion
        );
    }

    function ensureSenderAddress(address permittedSender) internal view {
        ensure(_msgSender() == permittedSender, ErrorReason.Unauthorized);
    }

    function generateHashForItem(ITrocaInterface.Item calldata item) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    item.chargeNonDispute,
                    item.hasExternalItem,
                    item.disputeHandlerFeePercentage,
                    item.disputeHandler,
                    item.disputeHandlerFeeReceiver,
                    item.itemData
                )
            );
    }

    function recoverSigner(bytes32 hash, bytes calldata message) internal pure returns (address) {
        return hash.toEthSignedMessageHash().recover(message);
    }

    function ensure(bool requirement, ErrorReason errorReason) internal pure {
        if (!requirement) {
            revert StandardError(errorReason);
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
