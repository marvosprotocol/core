/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/restrict-plus-operands */
import { expect } from 'chai'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import { arrayify, parseEther } from 'ethers/lib/utils'
import {
  loadOfferWithoutTokenFixture,
  loadOfferWithTokenFixture,
  regenerateOffer,
} from '../utils'
import { randomAddressString } from 'hardhat/internal/hardhat-network/provider/utils/random'
import { loadBaseTestFixture, loadTestWithTokenFixture, StandardError } from '../utils'

describe('Marvos', () => {
  describe('Offer Management', () => {
    describe('createOffer', () => {
      describe('validations', () => {
        it('should revert if offer id is not set', async () => {
          const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
          const offer = prefills.offerPrefill()

          offer.id = 0
          offer.creator = alice.address
          offer.status = 1
          offer.item.itemData = '0xabcd'
          offer.item.hasExternalItem = true
          offer.item.disputeHandler = escrow.address
          offer.item.disputeHandlerFeeReceiver = escrow.address
          offer.item.disputeHandlerProof = await escrow.signMessage(
            arrayify(await marvos.generateHashForOffer(offer)),
          )
          await expect(marvos.connect(alice).createOffer(offer, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.IdTaken)
        })

        it('should revert if offer id has already been used', async () => {
          const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
          const offer = prefills.offerPrefill()

          offer.id = 0
          offer.creator = alice.address
          offer.status = 1
          offer.item.itemData = '0xabcd'
          offer.item.hasExternalItem = true
          offer.item.disputeHandler = escrow.address
          offer.item.disputeHandlerFeeReceiver = escrow.address
          offer.item.disputeHandlerProof = await escrow.signMessage(
            arrayify(await marvos.generateHashForOffer(offer)),
          )
          // await expect(marvos.connect(alice).createOffer(offer, true))
          await expect(marvos.connect(alice).createOffer(offer, true))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.IdTaken)
        })

        it('should revert if offer creation call is coming from an address other than offer.creator', async () => {
          const { marvos, alice, bob, escrow, prefills } = await loadBaseTestFixture()
          const offer = prefills.offerPrefill()

          offer.id = 1
          offer.creator = bob.address
          offer.status = 1
          offer.item.itemData = '0xabcd'
          offer.item.hasExternalItem = true
          offer.item.disputeHandler = escrow.address
          offer.item.disputeHandlerFeeReceiver = escrow.address
          offer.item.disputeHandlerProof = await escrow.signMessage(
            arrayify(await marvos.generateHashForOffer(offer)),
          )
          await expect(marvos.connect(alice).createOffer(offer, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.Unauthorized)
        })

        it('should revert if offer includes a blacklisted token', async () => {
          const token = randomAddressString()
          const { marvos, alice, admin, escrow, prefills } = await loadBaseTestFixture()
          const offer = prefills.offerPrefill()

          offer.id = 1
          offer.creator = alice.address
          offer.status = 1
          offer.token = token
          offer.availableAmount = offer.totalAmount = 10
          offer.item.itemData = '0xabcd'
          offer.item.hasExternalItem = true
          offer.item.disputeHandler = escrow.address
          offer.item.disputeHandlerFeeReceiver = escrow.address
          offer.item.disputeHandlerProof = await escrow.signMessage(
            arrayify(await marvos.generateHashForOffer(offer)),
          )
          await marvos.connect(admin).setTokenBlacklisted(token, true)
          await expect(marvos.connect(alice).createOffer(offer, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.TokenBlacklisted)
        })

        it('should revert if offer status is not active', async () => {
          const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
          const offer = prefills.offerPrefill()

          offer.id = 1
          offer.creator = alice.address
          offer.status = 0
          offer.item.itemData = '0xabcd'
          offer.item.hasExternalItem = true
          offer.item.disputeHandler = escrow.address
          offer.item.disputeHandlerFeeReceiver = escrow.address
          offer.item.disputeHandlerProof = await escrow.signMessage(
            arrayify(await marvos.generateHashForOffer(offer)),
          )
          await expect(marvos.connect(alice).createOffer(offer, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.OfferStatusInvalid)
        })

        it('should revert if processing time is greater than hard limit', async () => {
          const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
          const offer = prefills.offerPrefill()

          offer.id = 1
          offer.creator = alice.address
          offer.status = 1
          offer.orderProcessingTime = (await marvos.MAXIMUM_ORDER_PROCESSING_TIME()) + 1
          offer.item.itemData = '0xabcd'
          offer.item.hasExternalItem = true
          offer.item.disputeHandler = escrow.address
          offer.item.disputeHandlerFeeReceiver = escrow.address
          offer.item.disputeHandlerProof = await escrow.signMessage(
            arrayify(await marvos.generateHashForOffer(offer)),
          )
          await expect(marvos.connect(alice).createOffer(offer, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.OrderProcessingTimeInvalid)
        })

        describe('amount validations', () => {
          describe('when token is not set', () => {
            it('should revert if total amount is not zero', async () => {
              const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.totalAmount = 10
              offer.item.itemData = '0xabcd'
              offer.item.hasExternalItem = true
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if there is no associated external item', async () => {
              const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.item.itemData = '0xabcd'
              offer.item.hasExternalItem = false
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.TokenOrItemRequired)
            })

            it('should revert if available amount is not total amount', async () => {
              const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.totalAmount = 0
              offer.availableAmount = 10
              offer.item.itemData = '0xabcd'
              offer.item.hasExternalItem = true
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if max amount is not zero', async () => {
              const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.maxAmount = 10
              offer.item.itemData = '0xabcd'
              offer.item.hasExternalItem = true
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if min amount is not zero', async () => {
              const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.minAmount = 10
              offer.item.itemData = '0xabcd'
              offer.item.hasExternalItem = true
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })
          })

          describe('when token is set', () => {
            it('should revert if total amount is zero', async () => {
              const { marvos, alice, escrow, prefills, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.token = sampleToken.address
              offer.totalAmount = 0
              offer.item.itemData = '0xabcd'
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if min amount is zero', async () => {
              const { marvos, alice, escrow, prefills, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.token = sampleToken.address
              offer.totalAmount = 10
              offer.minAmount = 0
              offer.maxAmount = 10
              offer.item.itemData = '0xabcd'
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if available amount is not total amount', async () => {
              const { marvos, alice, escrow, prefills, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.token = sampleToken.address
              offer.totalAmount = 5
              offer.availableAmount = 10
              offer.item.itemData = '0xabcd'
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if max amount less than min amount', async () => {
              const { marvos, alice, escrow, prefills, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.token = sampleToken.address
              offer.totalAmount = 10
              offer.availableAmount = 10
              offer.minAmount = 2
              offer.maxAmount = 1
              offer.item.itemData = '0xabcd'
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if max amount is greater than total amount', async () => {
              const { marvos, alice, escrow, prefills, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.token = sampleToken.address
              offer.totalAmount = 10
              offer.availableAmount = 10
              offer.minAmount = 1
              offer.maxAmount = 20
              offer.item.itemData = '0xabcd'
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if token is eth and exact value is not transferred', async () => {
              const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
              const offer = prefills.offerPrefill()
              const token = await marvos.COIN_ADDRESS()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.token = token
              offer.totalAmount = 10
              offer.availableAmount = 10
              offer.minAmount = 1
              offer.maxAmount = 5
              offer.item.itemData = '0xabcd'
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.CoinDepositRejected)
            })

            it('should revert if token is not a contract', async () => {
              const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.token = randomAddressString()
              offer.totalAmount = 10
              offer.availableAmount = 10
              offer.minAmount = 1
              offer.maxAmount = 5
              offer.item.itemData = '0xabcd'
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(
                marvos.connect(alice).createOffer(offer, false),
              ).to.be.revertedWith('Address: call to non-contract')
            })

            it('should revert if token is erc20 but token not approved', async () => {
              const { marvos, alice, escrow, prefills, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = prefills.offerPrefill()

              offer.id = 1
              offer.creator = alice.address
              offer.status = 1
              offer.token = sampleToken.address
              offer.totalAmount = 10
              offer.availableAmount = 10
              offer.minAmount = 1
              offer.maxAmount = 5
              offer.item.itemData = '0xabcd'
              offer.item.disputeHandler = escrow.address
              offer.item.disputeHandlerFeeReceiver = escrow.address
              offer.item.disputeHandlerProof = await escrow.signMessage(
                arrayify(await marvos.generateHashForOffer(offer)),
              )
              await expect(
                marvos.connect(alice).createOffer(offer, false),
              ).to.be.revertedWith('ERC20: insufficient allowance')
            })
          })
        })

        describe('item validations', () => {
          it('should revert if item data is not set', async () => {
            const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
            const offer = prefills.offerPrefill()

            offer.id = 1
            offer.creator = alice.address
            offer.status = 1
            offer.item.itemData = '0x'
            offer.item.hasExternalItem = true
            offer.item.disputeHandler = escrow.address
            offer.item.disputeHandlerFeeReceiver = escrow.address
            offer.item.disputeHandlerProof = await escrow.signMessage(
              arrayify(await marvos.generateHashForOffer(offer)),
            )
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.ItemDataInvalid)
          })

          it('should revert if dispute handler address is not set', async () => {
            const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
            const offer = prefills.offerPrefill()

            offer.id = 1
            offer.creator = alice.address
            offer.status = 1
            offer.item.itemData = '0xabcd'
            offer.item.hasExternalItem = true
            offer.item.disputeHandlerFeeReceiver = escrow.address
            offer.item.disputeHandlerProof = await escrow.signMessage(
              arrayify(await marvos.generateHashForOffer(offer)),
            )
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.DisputeHandlerRequired)
          })

          it('should revert if dispute handler fee receiver address is not set', async () => {
            const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
            const offer = prefills.offerPrefill()

            offer.id = 1
            offer.creator = alice.address
            offer.status = 1
            offer.item.itemData = '0xabcd'
            offer.item.hasExternalItem = true
            offer.item.disputeHandler = escrow.address
            offer.item.disputeHandlerProof = await escrow.signMessage(
              arrayify(await marvos.generateHashForOffer(offer)),
            )
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.DisputeHandlerFeeReceiverRequired)
          })

          it('should revert if dispute handler fee is too high', async () => {
            const { marvos, alice, escrow, maxEscrowFeePercentage, prefills } =
              await loadBaseTestFixture()
            const offer = prefills.offerPrefill()

            offer.id = 1
            offer.creator = alice.address
            offer.status = 1
            offer.item.itemData = '0xabcd'
            offer.item.hasExternalItem = true
            offer.item.disputeHandler = escrow.address
            offer.item.disputeHandlerFeeReceiver = escrow.address
            offer.item.disputeHandlerFeePercentage = maxEscrowFeePercentage + 1
            offer.item.disputeHandlerProof = await escrow.signMessage(
              arrayify(await marvos.generateHashForOffer(offer)),
            )
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.FeeTooHigh)
          })

          it('should revert if a fake signature is appended to offer', async () => {
            const { marvos, alice, escrow, prefills } = await loadBaseTestFixture()
            const offer = prefills.offerPrefill()

            offer.id = 1
            offer.creator = alice.address
            offer.status = 1
            offer.item.itemData = '0xabcd'
            offer.item.hasExternalItem = true
            offer.item.disputeHandler = escrow.address
            offer.item.disputeHandlerFeeReceiver = escrow.address
            offer.item.disputeHandlerProof = await alice.signMessage(
              arrayify(await marvos.generateHashForOffer(offer)),
            )
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.SignatureInvalid)
          })
        })
      })

      describe('effects', () => {
        describe('when the offer does not include a token', () => {
          it('should create an offer without a token', async () => {
            const { marvos, alice, offer } = await loadOfferWithoutTokenFixture()
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.emit(marvos, 'OfferCreated')
              .withArgs(offer.id, offer.token, alice.address)
          })
        })

        describe('when the offer includes a token', () => {
          it('should create an offer with the token and transfer token to the contract', async () => {
            const { marvos, admin, alice, offer, sampleToken } =
              await loadOfferWithTokenFixture()
            const amount = parseEther('10')
            await sampleToken.connect(admin).transfer(alice.address, amount)
            await sampleToken.connect(alice).approve(marvos.address, amount)
            await expect(marvos.connect(alice).createOffer(offer, false))
              .changeTokenBalances(
                sampleToken.address,
                [marvos.address, alice.address],
                [amount, 0],
              )
              .to.emit(marvos, 'OfferCreated')
              .withArgs(offer.id, offer.token, alice.address)
          })

          it('should create an offer if the correct amount of ETH is transferred to the contract', async () => {
            const {
              marvos,
              alice,
              escrow,
              offer: tokenOffer,
            } = await loadOfferWithTokenFixture()

            const offer = await regenerateOffer(marvos, escrow, tokenOffer, {
              token: await marvos.COIN_ADDRESS(),
            })

            const amount = parseEther('10')
            await expect(
              marvos.connect(alice).createOffer(offer, false, {
                value: amount,
              }),
            )
              .changeEtherBalances([marvos.address, alice.address], [amount, 0])
              .to.emit(marvos, 'OfferCreated')
              .withArgs(offer.id, offer.token, alice.address)
          })
        })
      })
    })

    describe('updateOfferStatus', () => {})
  })
})
