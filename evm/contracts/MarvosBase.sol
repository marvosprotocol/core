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
import "./MarvosInterface.sol";

/// @custom:security-contact security@marvos.org
abstract contract MarvosBase is
    Initializable,
    ContextUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    MarvosInterface
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using ECDSAUpgradeable for bytes32;

    /**
     * @dev The fee scale. A single unit of a fee percentage specification represents a (1 / FEE_SCALE) multiplier.
     */
    uint16 public constant FEE_SCALE = 100_00;

    /**
     * @dev The maximum order processing time that can be specified. Some items may take longer to process, therefore
     * the item should be declared paid at the time of payment and not at the time of final settlement. The item should
     * be declared received at the time of irreversible confirmation of receipt - whether into an escrow account or a
     * personal account.
     */
    uint32 public constant MAXIMUM_ORDER_PROCESSING_TIME = 86400; // 1 day

    /**
     * @dev Placeholder for the address of the treasury. Used to hold protocol fees
     */
    address public constant TREASURY_ADDRESS = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF; // treasury address

    /**
     * @dev Placeholder for the address of the native cryptocurrency of the blockchain the contract is running on.
     */
    address public constant COIN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // coin address

    /**
     * @dev The IDs that are no longer available for use in offers and bids.
     */
    mapping(uint256 => bool) public usedIds;

    /**
     * @dev A mapping of an offerId to the offer data.
     */
    mapping(uint256 => Offer) public offers;

    /**
     * @dev A mapping of a bidId to the bid data.
     */
    mapping(uint256 => Bid) public bids;

    /**
     * @dev A mapping of a orderId to the order data.
     */
    mapping(uint256 => Order) public orders;

    /**
     * @dev A mapping of a disputeId to the dispute data.
     */
    mapping(uint256 => Dispute) public disputes;

    /**
     * @dev A mapping of token to blacklist status.
     */
    mapping(address => bool) public blacklistedTokens;

    /**
     * @dev A mapping of (user, token) to the user's balance for token.
     */
    mapping(address => mapping(address => uint256)) public tokenBalances;

    /**
     * @dev The percentage of tokens charged by the protocol as processing fees.
     */
    uint16 public protocolFeePercentage; // 100% is 10000. 0.01% is 1.

    /**
     * @dev The percentage of the dispute handler fee charged by the protocol as commission.
     */
    uint16 public disputeHandlerFeePercentageCommission;

    /**
     * @dev The maximum fee that can be charged by the dispute handler.
     */
    uint16 public maxDisputeHandlerFeePercentage;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev initialize the contract. This call is made once by the proxy admin to
     * initialize the proxy. It is called at the point of proxy contract creation
     * and is encoded as the `_data` argument to the ERC1967Proxy-constructor.
     */
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
        usedIds[0] = true;
    }

    /**
     * @dev set the protocol fee percentage. This can only be called by the `owner`.
     */
    function setProtocolFeePercentage(uint16 value) external onlyOwner {
        protocolFeePercentage = value;
        emit ProtocolFeePercentageUpdated(value);
    }

    /**
     * @dev set the dispute handler fee commission. This can only be called by the `owner`.
     */
    function setDisputeHandlerFeePercentageCommission(uint16 value) external onlyOwner {
        disputeHandlerFeePercentageCommission = value;
        emit DisputeHandlerFeePercentageCommissionUpdated(value);
    }

    /**
     * @dev set the max dispute handler fee. This can only be called by the `owner`.
     */
    function setMaxDisputeHandlerFeePercentage(uint16 value) external onlyOwner {
        maxDisputeHandlerFeePercentage = value;
        emit MaxDisputeHandlerFeePercentageUpdated(value);
    }

    /**
     * @dev Blacklist a token or remove it from the blacklist. This can only be called by the `owner`.
     */
    function setTokenBlacklisted(address token, bool blacklisted) external onlyOwner {
        blacklistedTokens[token] = blacklisted;
        emit TokenBlacklistStatusUpdated(token, msg.sender, blacklisted);
    }

    /**
     * @dev Withdraw amount tokens from the balance of the user. Only the `owner` can withdraw from the treasury.
     * All other withdrawals must be made by the owner of the tokens.
     */
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

    /**
     * @dev Utility function to generate the hash for an offer to be signed by the dispute handler.
     */
    function generateHashForOffer(MarvosInterface.Offer calldata offer) public pure returns (bytes32) {
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

    /**
     * @dev Utility function to generate the hash for a bid to be signed by the dispute handler.
     */
    function generateHashForBid(MarvosInterface.Bid calldata bid) public pure returns (bytes32) {
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

    /**
     * @dev Pause the contract. This can only be called by `owner`.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract. This can only be called by `owner`.
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Validate the properties of an offer for creation. All offer properties must be provided at creation
     * and must be valid according to these rules:
     *
     * The caller to createOffer must be offer.creator
     * The offer id must be available.
     * The token must not be blacklisted.
     * The status must be active on creation.
     * The order must include an off-chain item or specify a token.
     * When a token is specified, the total amount and minimum amount must be non-zero.
     * When no token is specified, the total amount must be zero.
     * On creation, the available amount must be the same as the total amount.
     * The min amount must never be more than the max amount.
     * The max amount must never be more than the total amount.
     * The order processing time must be less than the maximum order processing time in the contract.
     * The offer item must be valid. See the documentation for ensureItemValid.
     */
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
            ensure(offer.item.hasExternalItem, ErrorReason.TokenOrItemRequired);
        }
        ensure(offer.availableAmount == offer.totalAmount, ErrorReason.AmountInvalid);
        ensure(offer.minAmount <= offer.maxAmount, ErrorReason.AmountInvalid);
        ensure(offer.maxAmount <= offer.totalAmount, ErrorReason.AmountInvalid);
        ensure(offer.orderProcessingTime <= MAXIMUM_ORDER_PROCESSING_TIME, ErrorReason.OrderProcessingTimeInvalid);
        ensureItemValid(offer.item, generateHashForOffer(offer));
    }

    /**
     * @dev Validate the properties of a bid for creation. All bid properties must be provided at creation
     * and must be valid according to these rules:
     *
     * The caller to placeBid must be bid.creator
     * The bid id must be available.
     * The offer must be active.
     * The token must not be blacklisted.
     * The status must be active on creation.
     * The bid must include an off-chain item or specify a token.
     * When a token is specified, the amount must be non-zero.
     * When no token is specified, the amount must be zero.
     * If the offer specifies a token, the bid must specify a token amount between the min and max amounts of the offer.
     * The dispute handler for the bid must match the dispute handler for the offer.
     * The order processing time must be less than the maximum order processing time in the contract.
     * The bid item must be valid. See the documentation for ensureItemValid.
     */
    function checkBidValidForCreation(Bid calldata bid) internal view {
        ensure(_msgSender() == bid.creator, ErrorReason.Unauthorized);
        ensure(bid.id > 0 && !usedIds[bid.id], ErrorReason.IdTaken);
        ensure(!blacklistedTokens[bid.token], ErrorReason.TokenBlacklisted);
        ensure(bid.status == BidStatus.Active, ErrorReason.BidStatusInvalid);
        if (bid.token != address(0)) {
            ensure(bid.tokenAmount > 0, ErrorReason.AmountInvalid);
        } else {
            ensure(bid.tokenAmount == 0, ErrorReason.AmountInvalid);
            ensure(bid.item.hasExternalItem, ErrorReason.TokenOrItemRequired);
        }
        ensure(offers[bid.offerId].status == OfferStatus.Active, ErrorReason.OfferInactive);
        ensure(
            bid.offerTokenAmount >= offers[bid.offerId].minAmount &&
                bid.offerTokenAmount <= offers[bid.offerId].maxAmount &&
                bid.offerTokenAmount <= offers[bid.offerId].availableAmount,
            ErrorReason.AmountInvalid
        );
        ensure(bid.item.disputeHandler == offers[bid.offerId].item.disputeHandler, ErrorReason.DisputeHandlerMismatch);
        ensure(bid.processingTime <= MAXIMUM_ORDER_PROCESSING_TIME, ErrorReason.OrderProcessingTimeInvalid);
        ensureItemValid(bid.item, generateHashForBid(bid));
    }

    /**
     * @dev Validate the properties of an item.
     *
     * The dispute handler must be a non-zero address.
     * The dispute handler fee receiver must be a non-zero address.
     * The itemData must not be empty - it should be the UTF-8 encoded URI of the external item data.
     * The percentage of the token to be charged as dispute handler fee must be less than the maximum.
     * The signature of the signer must match the hash of the order or bid.
     */
    function ensureItemValid(Item calldata item, bytes32 hash) private view {
        ensure(item.disputeHandler != address(0), ErrorReason.DisputeHandlerRequired);
        ensure(item.disputeHandlerFeeReceiver != address(0), ErrorReason.DisputeHandlerFeeReceiverRequired);
        ensure(item.itemData.length > 0, ErrorReason.ItemDataInvalid);
        ensure(item.disputeHandlerFeePercentage <= maxDisputeHandlerFeePercentage, ErrorReason.FeeTooHigh);
        ensure(recoverSigner(hash, item.disputeHandlerProof) == item.disputeHandler, ErrorReason.SignatureInvalid);
    }

    /**
     * @dev Credit a user's balance for the given token and log the reason.
     * The user must be a valid address and the token must not be blacklisted.
     */
    function creditTokenBalance(address owner, address token, uint256 amount, BalanceCreditReason reason) internal {
        ensure(token != address(0) && !blacklistedTokens[token], ErrorReason.TokenBlacklisted);
        ensure(owner != address(0), ErrorReason.AccountRequired);
        tokenBalances[owner][token] += amount;
        emit BalanceCredited(owner, token, reason, amount, tokenBalances[owner][token]);
    }

    /**
     * @dev Transfer `amount` units of the token at `tokenAddress` from the `from` address to the contract
     * for a transaction. The transferred amount is not tracked in balance. Instead, it is locked into the offer
     * or bid that triggered the transfer. This method MUST not be called in any other transaction except calls to
     * createOffer and placeBid.
     *
     * When the useBalance parameter is true, the contract tries to use the user's balance first and only transfers
     * the difference if the balance is less than the amount.
     * If the tokenAddress is the coin address placeholder, the transaction must have `value` equal to `amount` and
     * the caller must be the same as the `from` address.
     */
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

    /**
     * @dev Checks if an order is declared satisfied by both parties and release any locked funds to the counterparties.
     */
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

    /**
     * @dev Return locked funds to the balances as part of an order cancellation.
     * This must only be called when an order is being canceled - whether directly or as a result of a cancellation
     * resolution after a dispute.
     */
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

    /**
     * @dev Pay the recipient address the amount specified in the OrderData and charge applicable fees.
     * Total fees = protocol fees + dispute handler fees.
     * Protocol fees = base fee + dispute handler commission.
     */
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

    /**
     * @dev Ensure the sender address is the specified address.
     */
    function ensureSenderAddress(address permittedSender) internal view {
        ensure(_msgSender() == permittedSender, ErrorReason.Unauthorized);
    }

    /**
     * @dev Generate the hash for the item.
     */
    function generateHashForItem(MarvosInterface.Item calldata item) internal pure returns (bytes32) {
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

    /**
     * @dev Recover the signer address from an eth_signMessage call
     */
    function recoverSigner(bytes32 hash, bytes calldata message) internal pure returns (address) {
        return hash.toEthSignedMessageHash().recover(message);
    }

    /**
     * @dev Verifies the requirement and reverts if the requirement is not satisfied.
     */
    function ensure(bool requirement, ErrorReason errorReason) internal pure {
        if (!requirement) {
            revert StandardError(errorReason);
        }
    }

    /**
     * @dev Ensure only the `owner` can authorize upgrades
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
